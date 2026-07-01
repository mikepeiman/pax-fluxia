---
date created: 2026-07-01
last updated: 2026-07-01
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-29/2026-06-29_TERRITORY_REVIEW_LEDGER.md
  - .agent/docs/sessions/2026-06-29/2026-06-29_TERRITORY_REVIEW_PHASE0_UPDATE_18_REMEDIATION_PLAN.md
  - .agent/docs/sessions/2026-06-29/2026-06-29_TERRITORY_REVIEW_PHASE0_UPDATE_24_RECOVERY_KEEP_SET_PLAN.md
  - .agent/docs/sessions/2026-06-29/2026-06-29_TERRITORY_REVIEW_PHASE0_UPDATE_27_IMMEDIATE_VS_USER_VISIBLE.md
superseding docs:
---

# Territory Overnight-Integration Review — Synthesis & Recovery / Merge-In Plan

## Purpose (user's words)

"Process this massive tranche of findings from an epic attempt at rendering, geometry and
performance work. This is so we don't lose any valuable work, and to prep for the merge-in."

This doc is the single actionable synthesis of the 28-doc territory review produced on the
`codex/territory-overnight-integration` branch (overnight 2026-06-29). The full raw review
(LEDGER + UPDATE_01..27) is preserved verbatim in
`.agent/docs/sessions/2026-06-29/` (copied into master from the review worktree so it survives
regardless of the branch's fate). Read this synthesis first; drill into the dated updates for
evidence tables and artifact paths.

## Provenance / reference points

- Merge base (safe "before" comparison): `3ddd95386f09933094038d213f16c3b99591f0e6`
- Review branch under review: `codex/territory-overnight-integration`
- Current-master comparison at review time: `c2e9afb7a7eb44f9cb0cfa343003e7f6b16a0ffc` (update to latest master before recovery work begins)
- Deterministic replay hash (baseline == master == review == all isolations): `9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910`
- Acceptance map: `First Symmetry-6_April 17b`; route: release build `/play?bench=1`.

## Headline verdict

**Do NOT merge `codex/territory-overnight-integration` wholesale.** It mixes genuinely useful
work with **proven user-visible regressions**, and it lacks recent master fixes (smooth-fill,
resize/menu, and the 2026-06-30/07-01 settings overhaul). **Start recovery from current master**
and cherry-pick only measured, beneficial units.

Game **rules are intact**: deterministic replay hash is unchanged across baseline, master, the
review branch, and every isolation. The regressions are **presentation-timing**, not simulation.

## The core regression (proven, isolated)

The branch makes frame tables *look* smoother by **showing stale territory longer**:

1. **Conquest presentation scheduled as browser `background` work** (`GameCanvas.svelte`,
   `scheduler.postTask(..., { priority: "background" })`). Prepared territory pictures waited
   **~150–700 ms** before appearing after a capture or mode switch. Baseline & master show `0 ms`
   pending display in the same rows. Isolating this single unit to immediate/user-visible restored
   `0–10 ms` pending with the replay hash unchanged.
2. **Input-pressure yielding** delays the *visible ownership* update ~**170–180 ms** under input
   pressure — same class of problem (trades stale visuals for a prettier frame table).

Measured by an app-side signal, not inferred from frame timing:
`window.__PAX_BENCH__.getTerritorySchedulerSnapshot()` →
`territoryPresentationPendingAgeMs`, `...LastScheduleMode`, `...LastCommitLagMs`, posted/completed
counts (see UPDATE_25 instrument check). Confirmed non-blank via screenshot sanity (UPDATE_26).

**Not the cause:** physical-board / fixed-board re-checking (~0.9 ms total in a focused run;
board geometry is immutable after game start), the `snap:` diagnostic label (present in all three
versions), and the mode-change transition guard `78399c308` (reverting it did not help).

## Unit ledger (keep / revert / rewrite) — with commit hashes

| Unit | Commit | Verdict | Evidence |
| --- | --- | --- | --- |
| Conquest presentation background scheduling | `d2ac9d771a` (presentation part) | **REVERT** | UPDATE 7/8/27: pending 150–700ms → 0ms when reverted; hash unchanged |
| Input-pressure presentation yielding | `4c847ca20` | **REWRITE / ISOLATE** | UPDATE 11: ~170–180ms stale display; frame table only looks better by hiding cost |
| Conquest flash split (off base redraws) | `e33ba4e1e` | **REVERT-AND-BACKLOG** (perf) | UPDATE 10: not a proven perf win; keep only if there's a visual-design reason |
| Cell-grid fill/border split | `ae471a6c2` | **KEEP-WITH-FOLLOWUP (plain Cell Grid only)** | UPDATE 9 keep; UPDATE 13→14 corrected: Phase Edges/Ember attribution INVALIDATED (that file `CellGridFamily.ts` doesn't drive those modes — they use `CellGridPhaseEdgesFamily.ts`) |
| Mode-change transition guard | `78399c308` | **NOT THE CAUSE** | UPDATE (loop 6): revert did not improve Ember/Phase Field |
| Exact transition identity (tick/star/prev/new owner; recapture protection) | (lifecycle) | **KEEP, re-verify** | directionally valuable; needs a fresh recapture/overlap visual test after master integration |
| Rich transition sessions input | (GameCanvas input) | **INCONCLUSIVE / do not broad-revert** | UPDATE 15: disabling didn't fix heavy frames; may carry correctness |
| Review benchmark + replay + pending-display harness | `tools/debug/review-*.ts` | **KEEP** (non-invasive outside bench) | the pending-display sampler caught the real regression frame-timing missed |

## Rewrite target — two-stage presentation (the actual fix)

Correctness first, decoration second:

1. **Show correct current ownership immediately** (or within a strict, small, frame-sized
   budget) — never behind `background` priority, never held by input pressure.
2. **Prepare expensive transition decoration on a separate deadline-bounded path** (worker or
   scheduled pre-frame task): fancy capture waves, edge FX, etc.
3. **If the fancy plan is late, skip it for that capture** — show correct stable territory; never
   replay old ownership to protect the frame table.

Supported by web research (UPDATE_19): MDN `scheduler.postTask` (default priority is
`user-visible`, not `background`; visible game state is not background work), web.dev long-task
guidance (do visible truth first, then yield optional work), and PixiJS v8 perf tips (prefer
cached textures/sprites for stable heavy visuals over rebuilding complex Graphics every frame).

## Remaining real cost after stale-display is removed (open, unattributed)

Removing the delay exposes a genuinely heavy first truthful transition frame in **Phase Edges /
Ember Lattice / Phase Field** (immediate-display p95/p99 ~40–140ms). Timers point to a *combination*,
not one culprit: `territory.geometry0319.compute` (~40–46ms p50), `territory.phaseEdges.buildPlanForCapturedSession`
(~35–41ms p50), and `game.pixi.render.stage` (~19–53ms p50). These modes' renderer file
(`CellGridPhaseEdgesFamily.ts`) was **unchanged** vs baseline — the cost is fed in via
`GameCanvas.svelte` (transition sessions + localized previous geometry). This is the target of
recovery Loop 3, not a revert.

## Recovery work order (from UPDATE_24, condensed)

- **L1 — Master-based measurement branch (1 pass):** new worktree from latest master; bring ONLY
  the benchmark/replay/pending-display tools; build release; capture baseline acceptance rows.
- **L2 — Remove delayed display (≤3 attempts):** captures + mode switches show correct territory
  immediately/within one frame budget. Gate: pending-display `0`/strict budget across all primary
  modes; replay hash unchanged; screenshots show correct non-blank territory. No hiding delay
  behind another scheduler trick.
- **L3 — Split expensive Phase/Ember transition work (≤4 attempts):** stable territory immediately;
  build decoration off the critical path; apply only if ready. Gate: pending bounded; transition
  p95/p99 improves vs the immediate-display experiment; no repeated plan build per capture.
- **L4 — Mode-switch acceptance (≤3):** switching modes must not feel stuck/stale; pending `0`/budget.
- **L5 — Power Voronoi open check (≤2):** PV runtime mode-switch p95 stayed higher than master in
  some runs *without* delayed display — cause unproven (could be noise/instrumentation/geometry).
  Fresh same-run-count master-vs-recovery comparison; isolate only if it reproduces.
- **L6 — Keep-set cherry-pick (1 pass/candidate):** for each keeper ask "is this needed at all?",
  then require a direct user-facing benefit or correctness protection + a focused test + no
  acceptance regression. Candidates: exact transition identity, plain Cell-Grid fill/border split,
  non-invasive diagnostics, geometry correctness tests.

## Acceptance gates (final product gate)

Release `/play?bench=1`, map `First Symmetry-6_April 17b`, ≥8 runs/row. Modes: Cell Grid, Phase
Edges, Ember Lattice, Phase Field, Power Voronoi Runtime, Metaball, Perimeter. Scenarios: gameplay,
capture transition, mode switch, forced input pressure. Report **p50/p95/p99/worst, slow-frame
counts, pending-display, commit lag, screenshots — NO means** (means hide spikes). All must hold:

1. No stale visible conquest territory.
2. Mode switching leaves no territory pending for hundreds of ms.
3. Current master fixes preserved.
4. Deterministic replay hash unchanged unless a rule change is explicitly approved.
5. Primary modes match/beat current master on user-visible behavior.
6. Any remaining slower row has a named cause or bounded follow-up — not a vague perf claim.

## Invariants to carry forward (rule docs from the review)

- Board **physical geometry is immutable after a game starts**. Ownership changes recolor/reshape
  territory; stars and lanes do not move or rewire during a game.
- Ownership change = gameplay state, not physical board movement. Any perf change premised on
  detecting moving stars / rewired connections during live play is wrong by premise.

## Process gotchas captured

- `vite preview` serves the **last build** — it does not rebuild on source change. Always
  `bun run build` before a release benchmark, or the run measures a stale bundle (UPDATE_21).
- Fixed-board counters are cumulative page-lifetime — use the final snapshot, not a sum of rows.
- 3 runs/row ranks risk; ≥8 runs/row for final percentile confidence.

## Artifacts (in the review worktree)

Benchmark/replay JSON + screenshots live under
`C:\Users\mikep\.codex\worktrees\territory-*\...\.agent-harness\metrics\review-release\` (paths
enumerated per update). These are measurement data on a review branch; if that worktree is cleaned,
the durable value (verdicts, hashes, unit attributions) is captured above. **Follow-up task
(master list): copy the keep-set harness + representative artifacts into master during Loop 1.**

## Status

Review phase = complete and preserved. Product/recovery phase = **NOT STARTED** (do not begin until
explicitly resumed; it starts from latest master, per L1). This doc is the entry point for that work.
