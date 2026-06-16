---
date created: 2026-06-16
last updated: 2026-06-16
last updated by: AI
type: decision / plan
status: RECOMMENDATION — pending user decision on path + sequencing
relevant prior docs:
  - .agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_PIPELINE_MODEL_AND_FIX_PLAN.md
  - .agent/docs/sessions/2026-06-16/2026-06-16_STRANDED_GEOMETRY_WORK_INVESTIGATION.md
  - .agent/docs/sessions/2026-06-16/2026-06-16_HANDOFF_KICKSTART_next-session.md
---

# Geometry Engine Decision — Hybrid-Converge (recommended)

## How this was decided
Phase A (angular-order junction walk) landed on master (`597305b46`). Then a merit-based,
intent-first assessment workflow ran: **6 parallel dimension readers** over the 736a Fresh PV
core, master's incumbent (post Phase-A), tests/adapter contract, and a proper
integration/reconciliation map — followed by an **adversarial verdict** that independently
re-verified every load-bearing claim against the live code (not the assessments). Optimization
target was the **game design intent**, never effort/diff size.

## Verified findings (the field is not what the earlier handoff assumed)
1. **Master already has the correct geometry foundation** post Phase-A: angular-order junction
   walk (`pickClockwiseAdjacentArc` in 3 files; the live PVV4 default consumes it via
   `Geometry_0319 → executeChainWalk → chainWalkCore`), and the render-family assembler has
   real-star `deriveStableRegionId` (`buildPowerVoronoi0319AuthoritySnapshot.ts:60`).
2. **The Fresh PV core (736a) would REGRESS the #1 intent if adopted PRIMARY.** Its region
   assembler `geometryCore/graph/buildRegionLoops.ts` (`walkSingleLoop`) uses a **greedy
   first-unused** walk — the exact junction bug master just fixed — and `pickClockwiseAdjacentArc`
   appears in **zero** of its files. Its loop identity is the same **centroid** anti-pattern
   (`pv-loop:owner:centroid:count`), with `starIds` only a side field. It is **41 commits ahead
   but 187 behind** master, with an independently-diverged resolver and `Canonical*`→`Resolved*`
   type drift.
3. **Fresh PV's one decisive, intent-advancing asset is its CONSTRAINT ENGINE** — a clean,
   tested, fragment-based **SM→LP→CX→DX** pipeline with ancestry + artifacts + per-constraint
   tunables (the real v7 model), plus its **shared-curve graph** (adjacent territories share ONE
   curve). This is genuinely better than master's blunt `minStarMargin` clamp and exists nowhere
   else in the repo.

## Decision: HYBRID-CONVERGE (high confidence; adversary: AGREE)
Graft Fresh PV's constraint engine + shared-curve graph into master as a **module**, keep
master's earned correctness (angular-order walk + real-star identity), converge the two
assemblers onto real-star identity, harden the imported solver's gaps, manually merge the
divergent resolver, and adopt as primary **only after in-game visual validation**.

**Path ranking (by intent merit, effort is only a sequencing input):**
- `hybrid-converge` — **BEST.** Lands the principled v7 solver WITHOUT regressing junction
  correctness; converges to one clean assembler. "Best of each" = reconcile well.
- `fresh-pv-primary` — viable only AFTER porting the angular walk into its assembler + fixing
  loop identity + reconciling the resolver — at which point it converges with hybrid anyway.
  As-is, primary = importing regressions on a stale base.
- `evolve-legacy-in-place` — viable, lowest-risk, but re-invents Fresh PV's proven constraint
  engine for no intent benefit. Its first 3 steps are identical to hybrid's → start here regardless.

## Proper plan (8 phases)
- **Phase 0 — Ground truth + RUNNING baseline (mandatory gate).** Baseline full territory suite
  on `597305b46` (record pre-existing failures: TerritorySettingsBridge starMargin 75-vs-0;
  benchmark harnesses). Capture in-game screenshots of fills+borders at 3+ ownership states for
  BOTH live assembler paths. No geometry path is "correct" on unit tests alone (all 736a tests
  are happy-path).
- **Phase 1 — Converge region identity on master FIRST** (pure intent win, fresh-pv-independent,
  lowest risk). Extract `deriveStableRegionId` → shared module; replace centroid region IDs in
  `compiler_UnifiedVectorGeometry.ts:255` with star-set-anchored IDs. Test-gate + add a stability
  test (region ID invariant under ownership-position perturbation AND independent of
  iteration-order/collision-suffix counters).
- **Phase 2 — Reconcile the two assemblers' identity/junction provenance.** Both consume shared
  `deriveStableRegionId`; align the render-family resolver's 2nd unsigned-angle walk with the
  primary angular walk → ONE junction-traversal source of truth. Visual-diff vs Phase 0.
- **Phase 3 — Import Fresh PV's CONSTRAINT ENGINE as a module (import-and-compile ONLY; NOT wired
  live).** Copy `geometryCore/constraints/` + `graph/buildSharedCurveGraph.ts` +
  `smoothSharedCurves.ts`; rename `Canonical*`→`Resolved*` (mechanical, shapes identical). Do NOT
  import 736a's `buildRegionLoops` (greedy-walk regression). Do NOT activate on any live/baselined
  assembler until Phase 4.
- **Phase 4 — Harden the imported solver** (real gaps, untested in 736a): (a) MSR convergence loop
  (single-best-per-polyline under-protects); (b) inter-constraint validation hook (closure /
  self-intersection); (c) decide LP policy scope (only `clampToGate` is live); (d) edge-case tests
  (orphaned loops, disconnected chains, empty-anchor regions, 3+ owner junction alignment). First
  live activation gated on this.
- **Phase 5 — Resolve the high-risk resolver** (`resolveConstraintAlignedTerritoryGeometry.ts`: a
  true 3-way divergence 913-base → 960-master / 1523-736a). Constraints become an upstream
  APPLICATION stage; this file REDUCES to a post-processor (MSR display-margin clamp, display-rect
  inset/outset, compatibility-matrix, diagnostics aggregation). Manual concern-by-concern merge,
  test-gated + visual-diff per concern. **NOT git auto-merge.**
- **Phase 6 — Single tunable surface + diagnostics.** Add fresh* constraint tunables
  (cx/lp/dx + smoothingPasses) to `TerritoryGeometryTunables` + reader, exposed in settings; fold
  fingerprinting + `validateGeometryCoreSnapshot` into snapshot provenance. Establish single
  smoothing authority (compiler, not renderer — fixes double-smoothing hazard).
- **Phase 7 — Adopt as primary ONLY after the gate passes:** (a) full suite green vs Phase 0;
  (b) user in-game visual verification (gap-free fills, clean shared borders, correct junctions
  across the Phase 0 states); (c) conquest-morph capture shows frontier sections matching by ID
  across frames. No deletion of old paths until user verifies. Push origin/master after each commit.
- **Phase 8 (LATER, separate) — Transition direction.** Kinetic-Voronoi / dual regular
  triangulation (interpolate sites/weights; edge-collapse/cell-vanish as flip events). The plan
  leaves the foundation ready (shared-curve refs + stable IDs are prerequisites).

## Top risks
- **Resolver 3-way merge (highest).** Manual, concern-by-concern, test-gated. Assessments
  understate it as near-mechanical; it is not.
- **Imported solver is happy-path-tested only** — single-best-per-polyline MSR under-protection,
  one live LP policy, no convergence loop, no inter-constraint validation. Phase 4 hardening is
  mandatory before live activation.
- **Regression trap:** importing 736a's assembler (vs just the constraints) reintroduces the
  greedy-walk junction bug. Boundary: import constraint engine + shared-curve graph, NOT the
  assembler.
- **187-commit staleness:** contracts/tunables/runtime predate consolidation+perf; reconcile to
  current master (Canonical→Resolved is the visible tip).
- **Double-smoothing:** Fresh PV smooths in geometryCore; master's compiler also smooths. Establish
  single authority (Phase 6 / Phase 3).
- **No running/visual validation exists for either path producing correct fills WITH constraints
  active on a real map.** Phase 0 + Phase 7 gates close this.
- `GameCanvas.svelte` (frozen ~8k-line choke point) is touched by fresh_pv_core wiring —
  conflict-resolution-only, minimal.

## Adversary's corrections (folded into the plan)
1. Don't lean on "render-family path is untested/unmaintained" — it IS live (via
   `families/buildFamilyGeometry.ts`) and is the strategic direction; that's why Phase 2 must
   converge, not just promote-one-delete-other.
2. Strengthen Phase 1's identity test: also assert region IDs are independent of
   iteration-order / collision-suffix counters (`compiler_UnifiedVectorGeometry.ts:256-259`).
3. Make Phase 3 **import-and-compile-only** — do NOT wire the solver into any live or baselined
   assembler until Phase 4 hardening lands (an under-applied margin / self-intersecting edit would
   corrupt the Phase 0 visual baseline).

## Open decisions for the user
1. **Confirm path:** hybrid-converge (recommended) vs fresh-pv-primary vs evolve-in-place.
2. **Sequencing:** land Phases 1–2 (region-identity + assembler convergence on master — low-risk,
   fresh-pv-independent) as a standalone, user-verified milestone FIRST, before the higher-risk
   constraint-engine import (Phases 3–5)?
3. **Dual assembler:** retire render-family vs PVV4 duality NOW (converge to one), or keep both
   selectable during migration (Phase 2 aligns identity/junction provenance but keeps both live)?
4. **LP constraint scope:** full multi-policy (passThroughGate/splitAroundGate/avoidGate) or is
   `clampToGate` sufficient for now? (Affects Phase 4.)
5. Assumed unless told otherwise: in-game visual verification IS the adoption gate; smoothing
   authority lives in the compiler/constraint stage (not renderer).
