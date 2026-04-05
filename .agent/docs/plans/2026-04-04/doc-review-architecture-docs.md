# Doc Review: 5 Architecture Documents vs. Current Codebase

**Date:** 2026-04-04

---

## TL;DR

All 5 documents are **directionally correct** — the pipeline they describe (`Ownership → Geometry → Transition → Presentation`) matches the implemented architecture. But each doc has specific claims that are now stale or partially superseded by subsequent work. The biggest news: **`ActiveFrontFillMode.ts` already exists** (733 lines, fully implemented), which changes the status of several "future work" items across these docs.

---

## 1. GEOMETRY_ATLAS.md (Mar 24)

### What's accurate
- The 2-tier structure description (Mode wrappers → Generator functions) is correct
- `computeGeometry0319()` as the superior generator — still true
- The FG2 pipeline description (`fg2SeedGraph.ts`, half-edge topology) — still exists
- Legacy renderer inventory (PVV2, PVV3, ModifiedVoronoi, raster workers) — still present

### What's stale

| Claim | Current Reality |
|---|---|
| "3 GeometryMode classes" (1A, 1B, 1C) | **Consolidated to 1.** `geometry/registry.ts` now has a single `UnifiedVectorGeometryMode`. The legacy modes still exist as files but are **not registered**. |
| "1A and 1B are obsolete — should become one" | **Done.** The consolidation was executed. |
| PowerVoronoiRenderer is 1678L | Currently **1754 lines** (grew slightly). |
| `BoundaryAwareFrontierGeometryMode` is "DEFAULT" | `UnifiedVectorGeometryMode` is the sole registered mode now. |

### Verdict: **~80% accurate.** Update Tier 1 section to reflect consolidation is done. Tier 2–5 are still accurate as a reference map.

---

## 2. GEOMETRY_CONSOLIDATION_ANALYSIS.md (Mar 24)

### What's accurate
- "Two master geometry modes" (Vector vs Raster) — still the correct mental model
- Contribution rankings — correct. `Geometry_0319` is foundation, FG2 has the richest topology
- The target of "1 rich output type" — aligned with what was built

### What's stale

| Claim | Current Reality |
|---|---|
| "Three modes should become one" | **Done.** Registry has one mode. This was the plan, and it was executed. |
| "What Gets Deleted" — lists 8 items for deletion | Files still exist on disk but most are **unused** (not imported, not registered). Plan to keep them until full success in unified pipeline — no deletions yet. |
| Open question: "keep raster renderers?" | Plan: keep them. No deletions until unified pipeline is fully successful. |

### Verdict: **~90% accurate.** The consolidation plan was executed as described. The "What Gets Deleted" section is now a deferred cleanup checklist.

---

## 3. territory-transition-external-research-brief.md (Mar 31)

### What's accurate
- Game map description — fully accurate
- Conquest description — accurate
- Visual constraints (no gaps, no overlaps, no slivers, fill/stroke align) — these remain the hard requirements
- Current architecture description (Compiler → FrontierTopology → TransitionSampler → Presenter) — still accurate
- "The Problem" (OT polygon morph produces corrupt intermediate frames) — still true for `FrontierMorphFillMode`
- The 5 research questions — still relevant as research context

### What's stale

| Claim | Current Reality |
|---|---|
| "Current broken implementation: `FrontierMorphFillMode`" | `FrontierMorphFillMode.ts` still exists, but `ActiveFrontFillMode.ts` has been implemented as the replacement (733 lines). The brief was written **before** the active-front approach was built. |
| "We need techniques researched" | The active-front technique was the result of this research. It's been implemented. The brief is now historical context, not an open request. |
| "Island spawning is not a transition case" | Confirmed correct — and the birth-impossibility proof (today's earlier analysis) further validates this. |

### Verdict: **~85% accurate as historical context**, but **misleading as current status** because it describes `FrontierMorphFillMode` as the active system. If reproducing this brief for an external agent, it needs an addendum: "The active-front approach was implemented — see `ActiveFrontFillMode.ts`."

---

## 4. territory-architecture-compact-outline.md (Mar 31)

### What's accurate
- The 4-layer pipeline — canonical and correct
- Layer Map (Ownership, Geometry, Transition, Presentation) — structurally accurate
- `compiler_UnifiedVectorGeometry.ts` as the geometry entry — matches `UnifiedVectorGeometryMode`
- `FrontierTopologyContracts.ts` types — these are the live types
- `TransitionLayerCoordinator.ts`, `SharedTransitionClock.ts` — exist and active
- `PixiFillPresenter.ts` — exists
- Data Flow diagram — accurate description of the pipeline
- Current Status table — accurate: Power Voronoi ✅, Chain walk ✅, Frontier topology ✅, Fill+stroke unified ✅, OT interpolation ❌ broken

### What's stale

| Claim | Current Reality |
|---|---|
| "Active fill mode: `FrontierMorphFillMode.ts`" | `ActiveFrontFillMode.ts` now exists as the replacement. `FrontierMorphFillMode` is legacy/broken. |
| "Legacy/unused modes" list | Missing new modes: `ActiveFrontFillMode.ts`, `OptimalTransportCorrespondenceBorderMode.ts`, `RopeInterpolatedBorderMode.ts` |
| Entry points | Several leftover mode files exist on disk (8+) — none are registered. |

### New files not in this doc
- `transition/modes/ActiveFrontFillMode.ts`
- `transition/planners/CorrespondencePlanner.ts`
- `transition/planners/GeometryTopologyDiff.ts`
- `transition/planners/TerritoryTransitionPlanner.ts`
- `transition/interpolatePolylines.ts`
- `transition/TopologyFrameSampler.ts`

### Verdict: **~75% accurate.** The structural skeleton is correct, but the Transition section is the most out-of-date.

---

## 5. external-agent-codebase-package.md (Apr 1)

### What's accurate
- `FrontierTopologyContracts.ts` types — fully accurate, this is the live contract
- `TransitionContracts.ts` types — accurate
- `FrontierMorphFillMode.ts` broken implementation description — accurate as documentation of the broken approach
- Topology JSON export code — this was implemented
- Real example log output format — accurate

### What's stale

| Claim | Current Reality |
|---|---|
| The entire framing: "we need external research" | The active-front approach was the outcome. `ActiveFrontFillMode.ts` implements it. |
| "Getting the Real prev/next Geometry JSON" — presented as TODO | This was implemented in the TransitionSnapshotRecorder. |

### Verdict: **~90% accurate as a reference package.** If sending to an external agent today, add `ActiveFrontFillMode.ts` and update framing.

---

## Deferred Cleanup: Dead Files on Disk

8+ geometry mode files exist on disk but are not registered. **Plan: keep until unified pipeline is fully successful.**

- `BoundaryAwareFrontierGeometryMode.ts`
- `BoundaryAwareFrontierMode.ts`
- `BoundaryConstrainedFrontierGeometryMode.ts`
- `PowerVoronoiGeometryMode.ts`
- `SeedGraphGeometryMode.ts`
- `SeedGraphClusterSplitGeometryMode.ts`
- `WeightedPowerVoronoiGeometryMode.ts`
