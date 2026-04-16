---
description: Mandatory plan/spec/status-first protocol before debugging or deficiency analysis
globs: "**/*.{ts,js,svelte,md}"
---

# Plan / Spec / Status First

Before diagnosing any bug, regression, deficiency, or "broken" behavior:

1. Identify the active plan.
2. Identify the governing spec / requirement docs.
3. State current implementation status against those docs.
4. Decide explicitly:
   - on-spec but failing, or
   - off-spec and therefore wrong by definition.
5. Only after that may debugging hypotheses begin.

Hard rules:

- Do not treat implementation drift as intended design.
- Do not reason from current code alone when a plan/spec already says it is wrong.
- Do not call an off-spec heuristic "reasonable" or evaluate it on its own merits.
- Do not enter "mysterious bug" mode before checking plan/spec/status alignment.
