---
date created: 2026-07-01
last updated: 2026-07-01
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-07-01/2026-07-01_TERRITORY_OVERNIGHT_INTEGRATION_REVIEW_SYNTHESIS_AND_RECOVERY_PLAN.md
superseding docs:
---

# Territory Recovery — L2 + L3 Design (two-stage presentation)

Working branch: `claude/territory-recovery` (worktree `.claude/worktrees/territory-recovery`).
All file:line refs are against that branch (== master at `a753bef05`).

## L2 — remove the dead delayed-display machinery (refined)

Finding: the overnight commits (`d2ac9d771a`, `4c847ca20`) are NOT on master. But master carries the
OLDER machinery they extended, force-disabled since 2026-04-28 (`d4b57a7ca` "perf: disable gameplay
presentation throttling"):

- `GameCanvas.svelte:314` — `const PRESENTATION_SMOOTHNESS_FIRST = true;` (hardcoded)
- 8 gate sites (`:929 :1141 :1277 :1347 :4886 :4931 :4979 …`); when the flag is true every site
  takes the `immediate` path. The `false` branches are dead code: `scheduler-background` postTask
  (`scheduleTerritoryPresentationQueue`, `:4883-…`), message-channel queue
  (`territoryPresentationChannel`, `:423`), timeout / delay-timeout fallbacks.

Verdict: DELETE the dead branches + the flag; keep only the immediate path. The overnight branch
proved these paths are a stale-display landmine by turning them back on (150–700 ms pending).
KEEP the instrument: `territoryPresentationLastScheduleMode` / pending-age / commit-lag counters
feed `getBenchmarkTerritorySchedulerSnapshot()` (GameCanvas.svelte:7294) — that is the acceptance
measurement. `scheduleQueuedOrderMutations` (`:758`, user-blocking) is input dispatch, NOT
presentation — leave it alone.

Gate (unchanged from plan): pending-display 0/strict-budget all primary modes; replay hash
`9f6dae73…9741910` unchanged; non-blank screenshots.

## L3 — split Phase Edges / Ember / Phase Field transition cost off the visible path

Verified cost anatomy on capture tick (all synchronous today):

| Work | Where | p50 | Needed for correct ownership? |
| --- | --- | --- | --- |
| `computeGeometry0319` | compiler stage, via `TerritoryCompiler.compile()` | 40–46ms | YES (geometry authority) — not L3's target |
| prevGeometry capture fallback | `CellGridPhaseEdgesFamily.syncCapturedTransitionSessions` `:1530-1573` — `committedGeometry ?? input.prevGeometry ?? buildPerimeterFieldRenderFamilyGeometry(...)` | 15–25ms when fallback fires | NO (decoration input; fallback only when no committed/prev snapshot) |
| `buildPlanForCapturedSession` (classification + wave plan) | `CellGridPhaseEdgesFamily.ts:1602`, invoked `:3057` inside `update()` | 35–41ms | NO (wave decoration only) |
| steady-state plan | `buildSteadyStatePlan` via `:3027-3033` | ~8–15ms | YES — and it already paints CORRECT current ownership with `progress=1` (no wave) |

Existing fast path = the design's stage 1: when a cell has no session plan, the steady-state plan
paints correct current-owner cells immediately. So the two-stage split is:

1. **Stage 1 (synchronous, capture tick):** compile + steady-state plan + paint. Never gated on
   session plans. Budget: one frame.
2. **Stage 2 (deferred, deadline-bounded):** `buildPlanForCapturedSession` per new session moved to
   a bounded pre-frame task (NOT `background` priority — `user-visible` with an explicit deadline
   check). While a session's plan is not ready, `update()` renders that region from the
   steady-state plan (current owner, no wave). When the plan lands ≤ deadline, the wave plays from
   the true capture timestamp (late-join: skip already-elapsed portion). If it misses the deadline,
   skip the wave for that capture entirely.
3. **Never** replay prevGeometry ownership while waiting — stale display is the exact regression
   this recovery removes.

Implementation seams:
- `:3050-3069` — decouple "session exists" from "session plan must be built now": try-get plan,
  else fall through to steady-state cells for that region and enqueue the build.
- `:1530-1573` — prevGeometry fallback build joins the deferred task (it is decoration input).
- Plan-build dedup: one in-flight build per session key; superseded sessions (recapture) cancel
  (matches review keep-item "exact transition identity" — session keyed by tick/star/prev/new owner).

Gates (from plan): transition p95/p99 improves vs the L1 immediate-display baseline rows;
pending-display stays 0/budget; no repeated plan-build per capture; hash unchanged.

## Order of execution

1. L1 baseline sweep completes (running) → commit rows summary.
2. L2 deletion (small, mechanical) → rerun affected rows (gameplay + transition, all modes) → gate.
3. L3 implementation per above → full sweep → gate vs baseline.
