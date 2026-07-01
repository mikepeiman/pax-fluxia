---
date created: 2026-07-01
last updated: 2026-07-01
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-07-01/2026-07-01_TERRITORY_OVERNIGHT_INTEGRATION_REVIEW_SYNTHESIS_AND_RECOVERY_PLAN.md
superseding docs: []
---

# 2026-07-01 Takeaways

## Rules / lessons learned
- **Render-mode settings = unified; everything else = richly divided.** The user wants render-mode
  (family) controls in ONE surface with per-mode subsection chips (live mode default + marked);
  all other categories keep plentiful, sensible taxonomic division. Do not over-unify non-render
  settings, and do not per-mode-chip the render modes at the top level.
- **Frame-timing tables can lie.** The overnight review's biggest lesson: background/yielded
  scheduling made p95/p99 look better by showing STALE territory longer. Always measure
  pending-display + commit-lag (app-side signal), not just frame time. Report p50/p95/p99/worst +
  counts — never means.
- **Isolate before blaming.** No regression is attributed without a disposable single-unit
  revert/rewrite that reproduces it and keeps the deterministic replay hash unchanged.
- **`vite preview` does not rebuild.** Benchmarks after source edits must `bun run build` first.
- **Dev-server discipline:** flag when a change needs a restart (Vite config/env/deps) vs a page
  reload (module consts, e.g. `SERVER_URL`) vs HMR (components/CSS).
- **Don't hedge about "next step."** A chat turn's next action IS the next step; offering
  "now vs later" as if they differ is incoherent (user correction).

## Issues / features
- Colyseus matchmaking 404 was an IPv6-loopback gap in `SERVER_URL` dev/prod detection. Fixed.
- Frontier FX does not blend with the smooth fill because it's a per-cell field on jagged quads
  (not on the LINEAR phase-sampled frontier). Real render-integration; gated on visual verification.
- `codex/territory-overnight-integration` has proven presentation-timing regressions (stale display
  via background scheduling + input-pressure yielding). Rules unchanged. Recover from master.

## Decisions
- ONE MASTER TASK LIST (`.agent/docs/MASTER_TASK_LIST.md`), governed by new AGENT.md RULE 0.5.
- Preserve the full 28-doc review tranche in master; do NOT merge the review branch wholesale.
- Recovery design = two-stage presentation (immediate correct ownership; deadline-bounded fancy
  transition; skip if late).

## Work summary
Settings overhaul completed + verified (see MASTER_TASK_LIST). Colyseus 404 fixed. Territory review
tranche processed, preserved, and turned into an actionable recovery/merge-in plan. Org scaffolding
(master task list + rule + daily docs) established.
