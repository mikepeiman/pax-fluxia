---
date created: 2026-06-16
last updated: 2026-06-16
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_PIPELINE_MODEL_AND_FIX_PLAN.md
  - .agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_AUDIT.md
superseding docs:
---

# Stranded Geometry Work — Investigation Findings

User suspected more PVV geometry work existed (unmerged worktrees and/or docs dropped in
reconciliation). **Both confirmed, and they materially change the geometry strategy.** All
findings verified directly against the branch git trees (not assumed).

## FINDING 1 (pivotal): a de-novo geometry engine exists — in an UNMERGED worktree

`codex/2026-05-06-phase-field-history-salvage` (worktree `736a`, **41 own commits ahead** of its
merge-base, none on master) contains an entire clean-room Power-Voronoi geometry pipeline,
**`pax-fluxia/src/lib/territory/geometryCore/` — 23 files, ~3,900 LOC**, and it is **wired**:
that branch's `layers/geometry/registry.ts` registers `new FreshPvGeometryCoreMode()` as the
geometry mode (verified). It is not scattered experiments — it's an integrated, selectable
alternative geometry engine. Contents:

- `buildPowerDiagram.ts` — power-Voronoi construction; `buildPvEdgeLedger.ts`,
  `buildWorldBoundary.ts` — edges + world boundary as first-class.
- **`constraints/` — a pluggable constraint solver implementing the recovery-plan-v7 model:**
  `applyStarMarginConstraint` (**MSR done as a real constraint**, not a blunt clamp — defect #11),
  `applyCorridorConstraint` (CX), `applyDisconnectSeamConstraint` (DX — defect #14),
  `applyLanePairConstraint` (LP), + a dispatcher.
- `graph/buildRegionLoops.ts` (region-loop/topology assembly), `buildSharedCurveGraph.ts`,
  `smoothSharedCurves.ts` (**shared-curve smoothing so adjacent territories share one curve** —
  the "section exists once" + no-gap invariants, defects #1/#2/#6).
- `adapters/adaptPvCoreToCanonicalSnapshot.ts` (bridges back to the existing snapshot contract),
  diagnostics, types, clean `index.ts`.
- Plus unmerged display-geometry work in `geometry/resolveConstraintAlignedTerritoryGeometry.ts`
  (1523 LOC vs master 960): `buildVisibleDisplayTerritoryGeometry`, `alignClosedRingToWorldBounds`,
  `closeTerritoryRegionWorldCornerGaps` — world-rect corner-gap closing master has none of.

**This is almost certainly the "de-novo geometry engine" the user remembered.** It is NOT dcc7
(dcc7 = the transition work, reuses 0319). Correction to my earlier answer: the de-novo engine
is real — it lives in `phase-field-history-salvage`, unmerged. Caveat: some commits are
"wiring failure / audit readiness" — completeness/functionality must be assessed before trusting
it end-to-end.

## FINDING 2: the junction-walk FIX already exists — also unmerged

`codex/phase-field-msr-boundary-fixes` (worktree `bea2`, **28 own commits ahead**) has
`compiler/chainWalkCore.ts` at **449 LOC vs master's 272**, adding `pickClockwiseAdjacentArc`,
`OwnerDirectedPolylineArc`, `walkFromStartArc`, near-closed-loop detection, polygon-area
tie-breaking, deterministic junction-vertex tracking. Verified: bea2 chainWalk has 7
clockwise/angle references; **master has 0.** This is exactly the prime fix scoped in the fix
plan — already written. (Ignore this branch's MSR / resolveConstraintAligned — master's are
newer/superseded.) Also carries a `GRID_REPLACEMENT_ARCHITECTURE_SPEC` doc not on master.

## FINDING 3: 41 dcc7 structural docs dropped from reconciliation

The PVV4 reconciliation (dcc7 → consolidation → master) ported code slices but **not the docs**.
41 geometry/structural docs exist in `codex/render-infra/pvv4-transition-bets` but not master,
incl.: `territory-runtime-recovery-plan v1–v7` (the CX/LP/DX/MSR constraint contract),
`topological-change-process` expanded (05-15) + deepening (05-16), `live-vs-pvv4-geometry-render-audit`,
`render-pipeline-fallback-audit`, `PVV4_TRANSITION_RECOVERY_PLAN`, `pvv4_branch_assessment`,
`transition-diagnosis v1–v23`, the casebook + playtest protocol. (Their reasoning is already
captured in `2026-06-16_GEOMETRY_PIPELINE_MODEL_AND_FIX_PLAN.md`, but the source docs themselves
are stranded.)

## FINDING 4: render-bridge contracts (partial, needs reconcile)

`codex/territory-rendering-checkpoint-2026-06-12` (`db53`, 3 own commits) has new
`RenderFamilyInputContract` / `RenderFamilyInputSpace ('map'|'presentation')` / `TransitionPrelude`
contracts + worker-offloaded fill-region sourcing in `MetaballGridPhaseFieldFamily`. Forked in
parallel with master's "finalize 0319 geometry constraints" → needs a 3-way reconcile, not a merge.

## SUPERSEDED / not geometry (verified, do not salvage)
- `continue-metaball-perimeter-mode` (11) + `perimeter-field-metaball` (7): **fully merged** into
  master (all commits present by subject).
- `rebuild-master-from-186cbf03` (11): replay/perf, no novel geometry.
- `perimeter-field-audit-20260414` (4): docs-only (gap report / implementation plan — useful intent).

## Strategic implication — a fork in the road
The earlier fix plan assumed patching master's legacy 0319 path. This finding adds a real
alternative: **a de-novo geometry core that already implements the v7 constraint model the
"right" way exists** (stranded in 736a), and the **junction-walk fix already exists** (stranded
in bea2). So the choice is no longer "fix legacy vs rewrite from scratch" — it's "fix legacy"
vs "**assess + adopt the existing Fresh PV core**." Recommended next step: a focused completeness/
quality assessment of the 736a `geometryCore/` (is it functional, tested, contract-correct?)
before choosing. Bringing the 41 dropped docs onto master is low-risk and high-value regardless.
