---
date created: 2026-06-19
last updated: 2026-06-19
last updated by: AI
relevant prior docs:
superseding docs:
---

# Post-Mortem: 2026-06-19 — Diagnostic logs invisible (logging-channel gating + console.log violation)

## What Happened
Added a one-shot `[PHASE-DIAG]` scene-graph probe to the territory dispatch in `GameCanvas.svelte` to localize the
blank Phase-mode territory. First emitted it via `log.state(...)` (gated, default OFF) without disclosing the
gating, and described the change as "intentionally uncommitted." The user corrected both points: commit intentional
work, and the logs were gated behind a toggle I never mentioned. I then "fixed" visibility with raw `console.log`
plus a `window.logFlags.state = true` instruction. Net result for the user: ZERO `[PHASE-DIAG]` lines (compounded
by HMR not recompiling the ~8k-line component on their running server).

## Root Cause
- I did not consult AGENT.md §5.2 / Common-Failure-Modes ("no raw `console.log`"; "do not tell the user to enable
  log flags via console commands") before instrumenting.
- `$lib/utils/logger` gates every channel behind `logFlags`; most default OFF (`state=false`). `log.state(...)`
  prints nothing unless the category is enabled in the UI Logging panel.
- My "fix" (`console.log`) directly violated §5.2; the `window.logFlags.state=true` instruction violated the
  console-command rule.

## Impact
Two wasted user round-trips and eroded trust ("you cannot even add a console log effectively"). No functional
damage — diagnostic-only, behind a one-shot guard.

## Corrective Actions
- Probe now logs via `log.canvas(...)` — the `canvas` channel defaults ON, so it is visible with no toggle while
  remaining telemetry-routed and UI-toggleable; the catch uses `log.error(...)` (also default ON).
- Committed the instrumentation (no longer parked uncommitted).
- AGENT.md §1 gained a "Logging panel" orientation bullet; saved memories `logging-telemetry-panel` and
  `commit-intentional-work`.

## Lessons
- Read the AGENT.md logging rules BEFORE adding any diagnostic output.
- Confirm a log channel emits by default before telling the user to "paste the log line."
- Commit intentional work immediately; never park it as "temporary, uncommitted."
- When a brand-new log does not appear AND a known-running path (e.g. `grid_gradient`, which renders) logs nothing,
  suspect BUILD STALENESS (HMR miss on a huge component) before concluding the code is wrong.
