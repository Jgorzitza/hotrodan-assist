#!/usr/bin/env python3
import os
import re
import json
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List

# Config
STALL_SECONDS = 6 * 60  # 6 minutes without updates -> stalled
WINDOW_15M = 15 * 60
STATE_DIR = ".cache/monitor_agents"
STATE_FILE = "state.json"

# Docker targets
DOCKER_TARGETS = {
    "redis": {
        "images": ["redis:7"],
        "compose_names": ["redis"],
    },
    "postgres": {
        "images": ["postgres:15"],
        "compose_names": ["db", "postgres"],
    },
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def repo_root_from_here() -> Path:
    here = Path(__file__).resolve()
    # ascend until we see a coordination directory
    for p in [here, *here.parents]:
        if (p / "coordination").exists():
            return p
    return here.parent  # fallback


ROOT = repo_root_from_here()
STATE_PATH = ROOT / STATE_DIR
STATE_PATH.mkdir(parents=True, exist_ok=True)
STATE_JSON = STATE_PATH / STATE_FILE


def read_state() -> Dict[str, Any]:
    if STATE_JSON.exists():
        try:
            return json.loads(STATE_JSON.read_text())
        except Exception:
            return {}
    return {}


def write_state(state: Dict[str, Any]) -> None:
    tmp = STATE_JSON.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2) + "\n")
    tmp.replace(STATE_JSON)


def append_note(agent_slug: str, message: str) -> None:
    inbox = ROOT / "coordination" / "inbox" / agent_slug
    inbox.mkdir(parents=True, exist_ok=True)
    note_path = inbox / f"{datetime.now(timezone.utc).date().isoformat()}-notes.md"
    line = f"[{now_iso()}] {message}\n"
    if note_path.exists():
        with note_path.open("a", encoding="utf-8") as f:
            f.write(line)
    else:
        with note_path.open("w", encoding="utf-8") as f:
            f.write(line)


def append_blocker(owner: str, component: str, unit_key: str, summary: str, attempts: int) -> None:
    log_path = ROOT / "coordination" / "blockers-log.md"
    opened = datetime.now(timezone.utc).date().isoformat()
    row = f"| {opened} | {component} | {summary} | {owner} | Open | — |\n"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(row)


def parse_status_dashboard_doing() -> List[str]:
    # returns list of agent labels marked DOING (informational only)
    path = ROOT / "coordination" / "status-dashboard.md"
    labels: List[str] = []
    if not path.exists():
        return labels
    text = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    for line in text:
        # pipe table row lines
        if "|" in line and "DOING" in line:
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 3:
                agent_label = parts[2]  # Agent column (after initial empty due to leading pipe)
                labels.append(agent_label)
    return labels


def within_window(ts_list: List[str], seconds: int) -> List[str]:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=seconds)
    out: List[str] = []
    for s in ts_list:
        try:
            t = datetime.fromisoformat(s)
        except Exception:
            continue
        if t >= cutoff:
            out.append(s)
    return out


def safe_run(cmd: List[str], cwd: Path | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=str(cwd) if cwd else None, capture_output=True, text=True)


def check_go_signal(state: Dict[str, Any]) -> None:
    path = ROOT / "coordination" / "GO-SIGNAL.md"
    present = path.exists()
    prev_present = state.get("go_signal_present")
    if prev_present is None:
        state["go_signal_present"] = present
        return
    if present != prev_present:
        # toggle
        toggles: List[str] = state.get("go_signal_toggles", [])
        toggles.append(now_iso())
        toggles = within_window(toggles, WINDOW_15M)
        state["go_signal_toggles"] = toggles
        state["go_signal_present"] = present
        if len(toggles) >= 2:
            append_note(
                "tooling",
                f"[info] GO-SIGNAL.md flapped {len(toggles)} times within 15m — treating as standby; no action taken",
            )


def agent_slug_for_path(p: Path) -> str:
    # Derive agent slug from coordination/inbox/<slug>/poll*.log
    try:
        idx = p.parts.index("inbox")
        return p.parts[idx + 1]
    except Exception:
        return "tooling"


def unit_key_for_log(p: Path) -> str:
    return f"poller:{agent_slug_for_path(p)}:{p.name}"


def check_pollers(state: Dict[str, Any], doing_labels: List[str]) -> None:
    poll_logs = list((ROOT / "coordination" / "inbox").glob("*/poll*.log"))
    for log_path in poll_logs:
        try:
            mtime = datetime.fromtimestamp(log_path.stat().st_mtime, tz=timezone.utc)
        except FileNotFoundError:
            continue
        age = (datetime.now(timezone.utc) - mtime).total_seconds()
        unit_key = unit_key_for_log(log_path)
        meta = state.get("units", {}).get(unit_key, {})
        attempts: List[str] = meta.get("attempts", [])
        attempts = within_window(attempts, WINDOW_15M)
        priority = "PRIORITY=DOING" if any(lbl.lower().startswith(agent_slug_for_path(log_path).split("-")[0]) for lbl in doing_labels) else "PRIORITY=normal"

        if age > STALL_SECONDS:
            # stalled
            attempts.append(now_iso())
            # update state
            state.setdefault("units", {}).setdefault(unit_key, {})["attempts"] = attempts
            # we do not have canonical restart commands; log + escalate when noisy
            append_note(
                agent_slug_for_path(log_path),
                f"[{priority}] unit={unit_key} event=stalled last_heartbeat={mtime.isoformat()} action=restart_skipped reason=unknown_start_command",
            )
            if len(attempts) >= 2:
                append_blocker(
                    owner="Tooling",
                    component="Poller",
                    unit_key=unit_key,
                    summary=f"Stalled {len(attempts)}x within 15m; no canonical restart command discovered for {log_path}",
                    attempts=len(attempts),
                )
        # else healthy; nothing to do


def parse_ps_for(pattern: str) -> bool:
    # check if any process cmdline matches pattern (case-insensitive)
    cp = safe_run(["bash", "-lc", f"ps -eo pid,comm,args | grep -i '{pattern}' | grep -v grep || true"])  # non-fatal
    return bool(cp.stdout.strip())


def check_mcp(state: Dict[str, Any]) -> None:
    up = parse_ps_for("shopify-dev-mcp")
    unit_key = "mcp:dev"
    meta = state.get("units", {}).get(unit_key, {})
    attempts: List[str] = within_window(meta.get("attempts", []), WINDOW_15M)
    if not up:
        attempts.append(now_iso())
        state.setdefault("units", {}).setdefault(unit_key, {})["attempts"] = attempts
        # We don't have AGENT_COMMANDS.md or a canonical start command; do not guess
        append_note("mcp", "[PRIORITY=DOING] unit=mcp:dev event=down action=restart_skipped reason=missing_AGENT_COMMANDS_or_canonical_cmd")
        if len(attempts) >= 2:
            append_blocker(
                owner="MCP",
                component="MCP Dev Agent",
                unit_key=unit_key,
                summary="MCP dev process down multiple checks; AGENT_COMMANDS.md or canonical start command missing — cannot auto-restart",
                attempts=len(attempts),
            )


def docker_compose_present() -> bool:
    return (ROOT / "docker-compose.yml").exists() or (ROOT / "compose.yaml").exists() or (ROOT / "compose.yml").exists()


def compose_restart(services: List[str]) -> subprocess.CompletedProcess:
    # prefer docker compose (plugin)
    cmd = ["bash", "-lc", f"docker compose restart {' '.join(services)}"]
    return safe_run(cmd, cwd=ROOT)


def docker_restart_container(container_id: str) -> subprocess.CompletedProcess:
    return safe_run(["bash", "-lc", f"docker restart {container_id}"])


def parse_docker_ps() -> List[Dict[str, str]]:
    fmt = "{{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}"
    cp = safe_run(["bash", "-lc", f"docker ps --format '{fmt}'"])
    rows: List[Dict[str, str]] = []
    for line in cp.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) == 4:
            rows.append({"id": parts[0], "image": parts[1], "name": parts[2], "status": parts[3]})
    return rows


def check_docker(state: Dict[str, Any]) -> None:
    ps = parse_docker_ps()
    image_to_row = {row["image"]: row for row in ps}
    for svc, cfg in DOCKER_TARGETS.items():
        unit_key = f"docker:{svc}"
        meta = state.get("units", {}).get(unit_key, {})
        attempts: List[str] = within_window(meta.get("attempts", []), WINDOW_15M)
        needs_restart = False
        target_row = None
        for img in cfg["images"]:
            row = image_to_row.get(img)
            if row:
                target_row = row
                status = row.get("status", "")
                if not status.lower().startswith("up"):
                    needs_restart = True
                break
        if not target_row:
            # container not present; nothing to do
            continue
        if needs_restart:
            # attempt limited restarts
            if len(attempts) >= 2:
                append_blocker(
                    owner="Tooling",
                    component="Docker",
                    unit_key=unit_key,
                    summary=f"{svc} not up; restart attempts exceeded in 15m window; manual investigation needed",
                    attempts=len(attempts),
                )
                continue
            attempts.append(now_iso())
            state.setdefault("units", {}).setdefault(unit_key, {})["attempts"] = attempts
            if docker_compose_present():
                cp = compose_restart(cfg["compose_names"])
                ok = cp.returncode == 0
                append_note(
                    "tooling",
                    f"unit={unit_key} event=restart_via_compose outcome={'success' if ok else 'fail'} code={cp.returncode} stdout={len(cp.stdout)}B stderr={len(cp.stderr)}B",
                )
            else:
                # fallback to direct docker restart
                cp = docker_restart_container(target_row["id"])
                ok = cp.returncode == 0
                append_note(
                    "tooling",
                    f"unit={unit_key} event=restart_via_docker outcome={'success' if ok else 'fail'} code={cp.returncode} stdout={len(cp.stdout)}B stderr={len(cp.stderr)}B",
                )


def check_proof_of_work() -> None:
    feedback_dir = ROOT / "feedback"
    if not feedback_dir.exists():
        return
    agents = [p.stem for p in feedback_dir.glob("*.md")]
    now = datetime.now(timezone.utc)
    for agent in agents:
        fp = feedback_dir / f"{agent}.md"
        try:
            text = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        # Heuristic: require activity within last 10 minutes
        # Look for ISO timestamps in file
        ts_matches = re.findall(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", text)
        recent = False
        for ts in ts_matches[::-1]:
            try:
                t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if (now - t).total_seconds() <= 600:
                    recent = True
                    break
            except Exception:
                continue
        if not recent:
            append_blocker(
                owner=agent,
                component="Proof-of-Work",
                unit_key=f"pow:{agent}",
                summary="No proof-of-work in last 10 minutes (diff/tests/artifacts)",
                attempts=1,
            )
            append_note(
                "integration",
                f"[auto] Non-compliance: {agent} has no recent proof-of-work; escalated to blockers-log",
            )


def main() -> None:
    state = read_state()
    doing_labels = parse_status_dashboard_doing()
    check_go_signal(state)
    check_pollers(state, doing_labels)
    check_mcp(state)
    check_docker(state)
    check_proof_of_work()
    write_state(state)


if __name__ == "__main__":
    main()
