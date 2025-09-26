import os, yaml, subprocess, sys

GOLDENS = "goldens/qa.yaml"
ROUTER = "query_chroma_router.py"
TIMEOUT_S = 45  # fail fast if anything stalls

def run_query(q):
    env = dict(os.environ)
    env["OFFLINE_CORRECTIONS_ONLY"] = "1"  # tests never call the LLM
    env.setdefault("RAG_FORCE_MOCK_EMBED", "1")
    p = subprocess.run([sys.executable, ROUTER, q],
                       capture_output=True, text=True, timeout=TIMEOUT_S, env=env)
    if p.returncode != 0:
        raise RuntimeError(f"Router errored: {p.stderr.strip()}")
    return p.stdout

def check_case(case, out):
    ok = True
    ans_start = out.find("=== ANSWER ===")
    ans = out[ans_start:] if ans_start >= 0 else out
    ci = ans.lower()

    tokens = case.get("must_include", [])
    if tokens and not any(t.lower() in ci for t in tokens):
        print(f"[FAIL include] Missing any of {tokens}"); ok = False

    src_start = out.find("=== SOURCES ===")
    src = out[src_start:] if src_start >= 0 else out
    cites = case.get("must_cite", [])
    if cites and not any(dom.lower() in src.lower() for dom in cites):
        print(f"[FAIL cite] Missing any of {cites}"); ok = False
    return ok

def main():
    if not os.path.exists(GOLDENS):
        print("Missing goldens/qa.yaml"); sys.exit(2)
    cases = yaml.safe_load(open(GOLDENS)) or []
    failures = 0
    for i, case in enumerate(cases, 1):
        q = case["q"]
        print(f"\n[{i}] {q}")
        try:
            out = run_query(q)
        except subprocess.TimeoutExpired:
            print(f"[FAIL timeout] No response in {TIMEOUT_S}s"); failures += 1; continue
        except Exception as e:
            print(f"[FAIL error] {e}"); failures += 1; continue
        if not check_case(case, out):
            print("---- OUTPUT ----"); print(out); failures += 1
    if failures:
        print(f"\n{failures} failing golden(s)."); sys.exit(1)
    print("\nAll goldens passed."); sys.exit(0)

if __name__ == "__main__":
    main()
