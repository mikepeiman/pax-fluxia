# Territory Pipeline Status

**Last updated:** 2026-04-07  
**Purpose:** Single ground truth for what works, what doesn't, and what was tested.

---

## Architecture

```
Ownership → Geometry → Transition → Presentation → PIXI
```

Runtime driver: `TerritoryRuntimeCoordinator` (frame-level, synchronous).  
Entry: `GameCanvas.svelte` → `GameCanvasTerritoryBridge` → `TerritoryRuntimeCoordinator.update()` → `PixiTerritoryPresenter.present()`.  
Requires: Style = "Canonical Layered Runtime" + Architecture = "Clean Architecture".

---

## Mode Inventory

### Geometry

| Mode | Status | Notes |
|------|--------|-------|
| `unified_vector` (Unified Vector Geometry) | **Working** | Sole registered mode. Produces `CanonicalGeometrySnapshot` with `FrontierTopology`. |

### Fill Transition

| Mode | Status | Notes |
|------|--------|-------|
| `unified_topology` (Unified Topology) | **New — needs live testing** | Fills + borders from same interpolated frontier sections. Added 2026-04-07. |
| `active_front` (Active Front Interpolation) | **Fixed — needs live testing** | Was broken: settings bridge mapped to `frontier_morph`. Fixed 2026-04-07. |
| `frontier_morph` (Frontier Topology Morph) | **Broken** | Legacy OT polygon morph. Known to produce corrupt intermediate frames. |
| `crossfade` (Alpha Crossfade Fill) | **Working (basic)** | Alpha-blends between prev and next geometry. No fill/border alignment. |
| `off` | **Working** | Snaps to target geometry. |

### Border Transition

| Mode | Status | Notes |
|------|--------|-------|
| `optimal_transport` | **Registered, not wired** | `BORDER_TRANSITION_MODE_BY_ID` exists but `TransitionLayerCoordinator` doesn't use it on the legacy path. |
| `rope_morph` | **Registered, not wired** | Same as above. |
| `off` | **Default (effective)** | Legacy path always produces `buildEmptyBorderFrame()`. |

### Style (Presentation)

| Mode | Status | Notes |
|------|--------|-------|
| `canonical` (Canonical Vector Polygon Style) | **Working** | Default. Draws fill + stroke from transition frame data. |
| `distance_field` | **Present** | Untested on clean pipeline. |
| `pixel` | **Present** | Untested on clean pipeline. |

---

## Bugs Fixed (this session, 2026-04-07)

### BUG-1: `active_front` mode not reachable from UI

**File:** `TerritorySettingsBridge.ts` — `resolveFillTransitionMode()`  
**Symptom:** Selecting "Active Front Interpolation" in the UI wrote `active_front` to config, but the bridge function didn't have a case for it — fell through to default `frontier_morph` (which is broken).  
**Fix:** Added `if (raw === 'active_front') return 'active_front';`

### BUG-2: Fill transition UI writes to wrong config key

**File:** `ControlsSection-Territory.svelte` — `selectFillTransition()`  
**Symptom:** UI wrote to `TERRITORY_FILL_TRANSITION` but bridge reads `TERRITORY_FILL_TRANSITION_MODE` first (which has hardcoded default `'frontier_morph'`). User selection was silently shadowed.  
**Fix:** Changed `updatePanel("territoryFillTransition", ...)` to `updatePanel("territoryFillTransitionMode", ...)`. Also fixed resolver to check `panel.territoryFillTransitionMode` first.

### BUG-3: Section orientation reversal causes criss-crossing interpolation

**File:** `FrontierTopologyPlanner.ts` — `buildFrontierTransitionPlan()`  
**Symptom:** When a section's canonical direction flips between prev/next topologies, `otInterpolatePolyline` interpolated between points going in opposite directions, creating figure-8 crossover patterns.  
**Fix:** Detect reversed orientation by checking if prev section's start vertex maps to next section's end vertex. Reverse `prevPoints` when detected, so both arrays run in the same direction.

### BUG-4: Double border rendering during topology transitions

**File:** `TopologyFrameSampler.ts` — `sampleTopologyFrame()` / `buildStaticFrame()`  
**Symptom:** Sampler emitted 86 individual section polylines as separate border draw commands, WHILE fill draw commands also included strokes. Double-rendered borders with seam artifacts at junctions.  
**Fix:** Emit empty `borderFrame` from topology sampler. Borders come from fill polygon strokes (same points, guaranteed alignment). Consistent with static rendering path.

---

## Changes Made (this session, 2026-04-07)

| Change | File(s) | Purpose |
|--------|---------|---------|
| Added `'unified_topology'` to `FillTransitionModeId` | `TerritoryModeSelection.ts` | New mode type for unified topology transition |
| Added catalog entry | `TerritoryModeCatalog.ts` | Descriptor for the new mode |
| Fixed `active_front` + added `unified_topology` resolution | `TerritorySettingsBridge.ts` | Settings bridge now handles both IDs |
| Replaced hardcoded `TOPOLOGY_PATH_ENABLED = false` with mode check | `TransitionLayerCoordinator.ts` | Topology path activates when user selects `unified_topology` |
| Added fallback warning log | `TransitionLayerCoordinator.ts` | Logs when unified topology selected but topology data unavailable |
| Added UI button | `ControlsSection-Territory.svelte` | "Unified Topology" in Fill Transition row |

---

## Testing Needed

### Priority 1 — Unified Topology path

1. **Static rendering:** Select Unified Topology, no conquests. Verify fills render correctly from geometry.
2. **Conquest animation:** Trigger a conquest. Verify smooth section-level interpolation with fills derived from borders.
3. **Diagnostics to check:** Console logs tagged `TransitionCoordinator`, `TopologyPlanner`, `CLR:TRACE`.
4. **Failure modes to watch:** Missing topology data (warning log), gaps between fills, fill/border misalignment, static sections jittering.

### Priority 2 — Active Front Interpolation

1. Now that the bridge fix is in, verify Active Front actually runs (check `CLR:TRACE` for `pathUsed: fill:active_front`).

### Priority 3 — Performance baseline

1. Check `Territory` log for frame timing, cache hit rate.
2. Monitor for frame drops during conquest transitions.

---

## Key File References

| Purpose | File |
|---------|------|
| Runtime coordinator | `territory/runtime/TerritoryRuntimeCoordinator.ts` |
| Transition coordinator | `territory/layers/transition/TransitionLayerCoordinator.ts` |
| Topology planner | `territory/layers/transition/planners/FrontierTopologyPlanner.ts` |
| Topology frame sampler | `territory/layers/transition/TopologyFrameSampler.ts` |
| Geometry compiler | `territory/layers/geometry/compiler_UnifiedVectorGeometry.ts` |
| Settings bridge | `territory/integration/TerritorySettingsBridge.ts` |
| UI controls | `components/ui/settings/ControlsSection-Territory.svelte` |
| Mode types | `territory/contracts/TerritoryModeSelection.ts` |
| Architecture reference | `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md` |
