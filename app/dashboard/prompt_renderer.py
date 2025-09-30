"""Helpers to render dashboard prompt payloads into Markdown summaries.

These helpers satisfy the contract sketched in the dashboard prompt specs.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional, Tuple


MAX_BULLETS = 4


def render_dashboard_home(payload: Dict) -> Dict[str, object]:
    """Render dashboard home data into the required Markdown structure.

    Returns a dict with `markdown` and `escalate` keys so callers can forward
    both the copy and routing hint to the downstream LLM router.
    """
    inbox = payload.get("inbox") or {}
    learning = payload.get("learning") or {}
    system_health = payload.get("system_health") or {}
    highlights = payload.get("highlights") or {}

    threads: List[Dict] = list(inbox.get("threads") or [])
    sla_breaches = [t for t in threads if t.get("sla_breach")]

    escalate = bool(learning.get("goldens_regressions") or [])
    if system_health.get("error_rate_pct", 0) is not None:
        try:
            escalate = escalate or float(system_health.get("error_rate_pct", 0) or 0) >= 5
        except (TypeError, ValueError):
            pass
    escalate = escalate or len(sla_breaches) > 5

    sections = []
    sections.append(_render_home_at_a_glance(inbox, system_health, highlights, escalation_note=escalate))
    sections.append(_render_home_action_queue(threads))
    sections.append(_render_home_learning_quality(learning, escalate))

    markdown = "\n\n".join(sections)
    next_action = _home_next_best_action(sla_breaches, learning, system_health)
    markdown += f"\n\nNext best action: {next_action}"

    return {"markdown": markdown, "escalate": escalate}


def render_dashboard_sales(payload: Dict) -> Dict[str, object]:
    """Render sales dashboard payload into Markdown plus escalation hint."""
    revenue = payload.get("revenue") or {}
    pipeline = payload.get("assistant_pipeline") or {}
    inventory = payload.get("inventory_watch") or []
    demand = payload.get("demand_signals") or {}

    delta = _safe_float(revenue.get("previous_period_delta_pct"))
    inventory_critical = [item for item in inventory if item.get("status") == "critical"]
    waiting_payment = [
        opp for opp in pipeline.get("open_opportunities") or []
        if opp.get("stage") == "waiting_payment" and _exceeds_hours(opp.get("last_message"), 48)
    ]

    escalate = False
    if delta is not None and delta <= -25:
        escalate = True
    if len(inventory_critical) > 2:
        escalate = True
    if waiting_payment:
        escalate = True

    sections = []
    sections.append(_render_sales_revenue(payload.get("period") or {}, revenue, payload.get("shopify_metrics") or {}))
    sections.append(_render_sales_pipeline(pipeline, waiting_payment))
    sections.append(_render_sales_inventory(inventory))
    sections.append(_render_sales_demand(demand))

    markdown = "\n\n".join(sections)
    focus_line = _sales_focus_recommendations(pipeline, inventory, demand, waiting_payment, escalate)
    markdown += f"\n\n{focus_line}"

    return {"markdown": markdown, "escalate": escalate}


# ---- Dashboard Home helpers -------------------------------------------------

def _render_home_at_a_glance(inbox: Dict, system_health: Dict, highlights: Dict, escalation_note: bool) -> str:
    bullets: List[str] = []

    awaiting = inbox.get("awaiting_review")
    sla_minutes = inbox.get("awaiting_review_sla_minutes")
    if awaiting is not None:
        target = f"target ≤{sla_minutes}" if sla_minutes else "no SLA target set"
        bullets.append(f"{awaiting} drafts awaiting review ({target}).")
    else:
        bullets.append("Inbox volume data unavailable.")

    rag_age = _safe_float(system_health.get("rag_index_age_hours"))
    last_ingest = system_health.get("last_ingest")
    latency = _safe_float(system_health.get("openai_latency_p95_ms"))
    err_rate = _safe_float(system_health.get("error_rate_pct"))

    if rag_age is not None or last_ingest or latency is not None or err_rate is not None:
        status_bits = []
        if rag_age is not None:
            status_bits.append(f"index refreshed {rag_age:.0f}h ago")
        if last_ingest:
            status_bits.append(f"last ingest {last_ingest}")
        if latency is not None:
            status_bits.append(f"p95 latency {latency:.0f} ms")
        if err_rate is not None:
            status_bits.append(f"error rate {err_rate:.1f}%")
        bullets.append("; ".join(status_bits) + ".")
    else:
        bullets.append("System health data unavailable.")

    notable = highlights.get("notable_threads") or []
    if notable:
        snippet = ", ".join(notable[:3])
        extra = f" +{len(notable) - 3} more" if len(notable) > 3 else ""
        bullets.append(f"Highlights: {snippet}{extra}.")

    products = highlights.get("product_requests") or []
    if products:
        top = products[0]
        bullets.append(
            f"Product requests: {top.get('category', 'unknown')} ({top.get('count', 'n/a')} requests, trend {top.get('trend', 'n/a')})."
        )

    if escalation_note:
        bullets.insert(0, "Flag for deep dive — escalate to gpt-5.")

    return "## At a Glance\n" + "\n".join(f"- {line}" for line in bullets[:MAX_BULLETS])


def _render_home_action_queue(threads: List[Dict]) -> str:
    bullets: List[str] = []
    if not threads:
        bullets.append("Action queue data unavailable.")
    else:
        breached = [t for t in threads if t.get("sla_breach")]
        others = [t for t in threads if not t.get("sla_breach")]

        for thread in breached[:MAX_BULLETS]:
            bullets.append(_thread_action_line(thread, urgent=True))

        remaining_slots = MAX_BULLETS - len(bullets)
        if remaining_slots > 0:
            for thread in others[:remaining_slots]:
                bullets.append(_thread_action_line(thread, urgent=False))

        total_listed = len(bullets)
        if len(threads) > total_listed:
            bullets.append(f"+{len(threads) - total_listed} more in inbox backlog.")

    return "## Action Queue\n" + "\n".join(f"- {line}" for line in bullets[:MAX_BULLETS])


def _render_home_learning_quality(learning: Dict, escalate: bool) -> str:
    bullets: List[str] = []
    edits = learning.get("edits_last_24h")
    if edits is not None:
        bullets.append(f"{edits} edits captured in the last 24h.")
    else:
        bullets.append("Edit telemetry unavailable.")

    corrections = learning.get("new_corrections") or []
    if corrections:
        newest = corrections[0]
        bullets.append(
            f"New correction `{newest.get('pattern', 'n/a')}` by {newest.get('author', 'unknown')} ({newest.get('added_at', 'n/a')})."
        )
    else:
        bullets.append("No new corrections logged.")

    goldens = learning.get("goldens_regressions") or []
    if goldens:
        bullets.append(f"{len(goldens)} failing golden tests — investigate immediately.")
    else:
        bullets.append("No failing golden tests.")

    if escalate and "failing golden" not in " ".join(bullets):
        bullets.append("Flag for deep dive — escalate to gpt-5.")

    return "## Learning & Quality\n" + "\n".join(f"- {line}" for line in bullets[:MAX_BULLETS])


def _thread_action_line(thread: Dict, urgent: bool) -> str:
    convo = thread.get("conversation_id", "unknown")
    channel = thread.get("channel", "channel")
    owner = thread.get("next_action_owner", "assistant")
    draft_status = thread.get("draft_status", "unknown")
    subject = thread.get("subject") or thread.get("summary") or "No subject"
    prefix = "Resolve" if urgent else "Review"
    extras = " (breached SLA)" if urgent else ""
    if owner:
        extras += f" — waiting on {owner}"
    return f"{prefix} {channel} thread {convo} ({draft_status}){extras}: {subject}."


def _home_next_best_action(sla_breaches: List[Dict], learning: Dict, system_health: Dict) -> str:
    if sla_breaches:
        thread = sla_breaches[0]
        return f"Clear SLA-breached thread {thread.get('conversation_id', 'unknown')} immediately."
    goldens = learning.get("goldens_regressions") or []
    if goldens:
        return f"Investigate failing golden `{goldens[0].get('id', 'n/a')}` and restore baseline."
    err_rate = _safe_float(system_health.get("error_rate_pct"))
    if err_rate is not None and err_rate >= 5:
        return "Stabilize high error rate before expanding workload."
    return "Monitor dashboards; no urgent blockers reported."


# ---- Sales helpers ----------------------------------------------------------

def _render_sales_revenue(period: Dict, revenue: Dict, shopify: Dict) -> str:
    bullets: List[str] = []
    label = period.get("label", "Current period")
    net = _safe_float(revenue.get("net"))
    gross = _safe_float(revenue.get("gross"))
    leading_value = net if net is not None else gross
    leading_label = "net" if net is not None else "gross"
    delta = _safe_float(revenue.get("previous_period_delta_pct"))

    if leading_value is not None:
        delta_text = f" ({_format_delta(delta)})" if delta is not None else ""
        bullets.append(f"{label}: {_format_currency(leading_value)} {leading_label}{delta_text}.")
    else:
        bullets.append("Revenue data unavailable.")

    top_products = revenue.get("top_products") or []
    if top_products:
        top = top_products[0]
        delta_text = _format_delta(_safe_float(top.get("delta_pct")))
        bullets.append(
            f"Top product: {top.get('name', 'unknown')} ({_format_currency(top.get('revenue'))}, {delta_text})."
        )

    if shopify:
        orders = shopify.get("orders")
        aov = _safe_float(shopify.get("avg_order_value"))
        conversion = _safe_float(shopify.get("conversion_rate_pct"))
        bits = []
        if orders is not None:
            bits.append(f"{orders} orders")
        if aov is not None:
            bits.append(f"AOV {_format_currency(aov)}")
        if conversion is not None:
            bits.append(f"conversion {conversion:.1f}%")
        abandoned = shopify.get("abandoned_checkouts")
        if abandoned is not None:
            bits.append(f"{abandoned} abandons")
        if bits:
            bullets.append("; ".join(bits) + ".")
    else:
        bullets.append("Shopify metrics unavailable.")

    return "## Revenue Snapshot\n" + "\n".join(f"- {line}" for line in bullets[:MAX_BULLETS])


def _render_sales_pipeline(pipeline: Dict, waiting_payment: List[Dict]) -> str:
    bullets: List[str] = []
    open_opps = pipeline.get("open_opportunities") or []

    if open_opps:
        stage_counts: Dict[str, int] = {}
        for opp in open_opps:
            stage = opp.get("stage", "unknown")
            stage_counts[stage] = stage_counts.get(stage, 0) + 1
        summary = ", ".join(f"{count} {stage}" for stage, count in sorted(stage_counts.items()))
        bullets.append(f"{len(open_opps)} open opps ({summary}).")

        sorted_opps = sorted(open_opps, key=lambda o: _safe_float(o.get("estimated_value")) or 0, reverse=True)
        for opp in sorted_opps[:2]:
            bullets.append(_pipeline_line(opp))
    else:
        bullets.append("Pipeline data unavailable.")

    wins_last = pipeline.get("wins_last_period")
    wins_prev = pipeline.get("wins_previous_period")
    if wins_last is not None and wins_prev is not None:
        delta = wins_last - wins_prev
        bullets.append(f"Wins: {wins_last} vs {wins_prev} prior ({_format_delta(delta, is_percent=False)}).")

    if waiting_payment:
        opp = waiting_payment[0]
        bullets.insert(1, _pipeline_waiting_payment_line(opp))

    return "## Pipeline\n" + "\n".join(f"- {line}" for line in bullets[:MAX_BULLETS])


def _render_sales_inventory(inventory: Iterable[Dict]) -> str:
    items = list(inventory)
    bullets: List[str] = []
    if not items:
        bullets.append("Inventory data unavailable.")
    else:
        critical = [item for item in items if item.get("status") == "critical"]
        warnings = [item for item in items if item.get("status") == "warning"]
        ok = len(items) - len(critical) - len(warnings)
        bullets.append(
            f"{len(critical)} critical, {len(warnings)} warning, {ok} stable SKUs being tracked."
        )
        for item in critical[: MAX_BULLETS - 1]:
            bullets.append(_inventory_line(item, urgent=True))
        remaining_slots = MAX_BULLETS - len(bullets)
        if remaining_slots > 0:
            for item in warnings[:remaining_slots]:
                bullets.append(_inventory_line(item, urgent=False))
        if len(items) > len(bullets):
            bullets.append(f"+{len(items) - len(bullets)} additional items monitored.")

    return "## Inventory\n" + "\n".join(f"- {line}" for line in bullets[:MAX_BULLETS])


def _render_sales_demand(demand: Dict) -> str:
    bullets: List[str] = []
    product_requests = demand.get("product_requests") or []
    faq_gaps = demand.get("faq_gaps") or []

    if product_requests:
        top = product_requests[0]
        bullets.append(
            f"Top product request: {top.get('category', 'unknown')} ({top.get('count', 'n/a')} requests, trend {top.get('trend', 'n/a')})."
        )
    if faq_gaps:
        top_gap = faq_gaps[0]
        bullets.append(f"FAQ gap: {top_gap.get('topic', 'unknown')} ({top_gap.get('requests', 'n/a')} tickets).")

    if not bullets:
        bullets.append("Demand signal data unavailable.")

    return "## Demand Signals\n" + "\n".join(f"- {line}" for line in bullets[:MAX_BULLETS])


def _sales_focus_recommendations(
    pipeline: Dict,
    inventory: Iterable[Dict],
    demand: Dict,
    waiting_payment: List[Dict],
    escalate: bool,
) -> str:
    recommendations: List[str] = []
    if waiting_payment:
        opp = waiting_payment[0]
        recommendations.append(
            f"Clear waiting-payment opp {opp.get('conversation_id', 'unknown')} ({_format_currency(opp.get('estimated_value'))})."
        )

    critical_items = [item for item in inventory if item.get("status") == "critical"]
    if critical_items:
        recommendations.append(f"Restock {critical_items[0].get('name', 'critical SKU')} now.")

    faq_gaps = (demand.get("faq_gaps") or [])
    if faq_gaps:
        recommendations.append(f"Draft FAQ update for {faq_gaps[0].get('topic', 'top gap')}.")

    if not recommendations:
        open_opps = pipeline.get("open_opportunities") or []
        if open_opps:
            top = max(open_opps, key=lambda o: _safe_float(o.get("estimated_value")) or 0)
            recommendations.append(
                f"Advance opp {top.get('conversation_id', 'unknown')} ({top.get('stage', 'stage')})."
            )
        else:
            recommendations.append("Monitor performance; no urgent blockers identified.")

    ordered = "; ".join(f"{idx}) {rec}" for idx, rec in enumerate(recommendations[:3], start=1))
    focus_line = f"Focus Recommendations: {ordered}"
    if escalate:
        focus_line += ". Escalate for deeper analysis."
    return focus_line


# ---- Formatting helpers -----------------------------------------------------

def _format_currency(value: Optional[float]) -> str:
    val = _safe_float(value)
    if val is None:
        return "n/a"
    if abs(val) >= 1000000:
        return f"${val/1_000_000:.1f}M"
    if abs(val) >= 1000:
        return f"${val/1000:.1f}K"
    return f"${val:,.0f}"


def _format_delta(delta: Optional[float], *, is_percent: bool = True) -> str:
    if delta is None:
        return "n/a"
    if is_percent:
        return f"{delta:+.0f}%"
    return f"{delta:+.0f}"


def _safe_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _exceeds_hours(timestamp: Optional[str], hours: float) -> bool:
    if not timestamp:
        return False
    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    delta = now - dt.astimezone(timezone.utc)
    return delta.total_seconds() >= hours * 3600


def _pipeline_line(opp: Dict) -> str:
    convo = opp.get("conversation_id", "unknown")
    value = _format_currency(opp.get("estimated_value"))
    stage = opp.get("stage", "stage")
    owner = opp.get("owner", "assistant")
    last_msg = opp.get("last_message", "n/a")
    return f"Follow up on opp {convo} ({stage}, {value}) — owner {owner}, last touch {last_msg}."


def _pipeline_waiting_payment_line(opp: Dict) -> str:
    convo = opp.get("conversation_id", "unknown")
    value = _format_currency(opp.get("estimated_value"))
    last_msg = opp.get("last_message", "n/a")
    return f"Escalate waiting-payment opp {convo} ({value}); stalled since {last_msg}."


def _inventory_line(item: Dict, urgent: bool) -> str:
    name = item.get("name", item.get("sku", "unknown"))
    cover = item.get("days_of_cover")
    cover_text = f"{cover}d cover" if cover is not None else "cover unknown"
    status = item.get("status", "status")
    prefix = "Restock" if urgent else "Monitor"
    return f"{prefix} {name} ({status}, {cover_text})."
