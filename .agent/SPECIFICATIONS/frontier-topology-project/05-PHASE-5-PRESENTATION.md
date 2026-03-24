# Phase 5: Presentation Wiring

**Sprint:** 5 of 5 | **Risk:** Low | **Estimated effort:** ~80 lines  
**Prerequisites:** Phases 1-4 complete. Read `CODE-MAP.md` first.

---

## Goal

Wire the frame-t `FrontierTopology` output from the sampler into the existing `FillTransitionFrame` and `BorderTransitionFrame` interfaces so the presentation layer renders it.

## Strategy

The presentation layer already consumes `FillTransitionFrame` (regions: {ownerId, points}[]) and `BorderTransitionFrame` (frontiers: {ownerPairKey, points}[]). We just need to populate these from the sampled FrontierTopology.

No changes to the presentation layer or PIXI renderers are needed.

## Option A: New Unified Transition Mode (Recommended)

**New file:** `pax-fluxia/src/lib/territory/layers/transition/modes/FrontierTopologyTransitionMode.ts`

A single mode that implements BOTH `FillTransitionMode` and `BorderTransitionMode`:

```typescript
export class FrontierTopologyFillMode implements FillTransitionMode {
    readonly id = 'frontier_topology_fill' as const;
    readonly label = 'Frontier Topology Fill';

    plan(input: FillTransitionPlanInput): FillTransitionPlan {
        // Store prev + next FrontierTopology from GeometrySnapshot
        // Store the FrontierTransitionPlan built by Phase 3 planner
    }

    sample(plan: FillTransitionPlan, ctx: TransitionSampleContext): FillTransitionFrame {
        // Call sampleFrontierTopology(plan, prev, next, ctx.progress)
        // Convert frame topology loops → regions
    }
}

export class FrontierTopologyBorderMode implements BorderTransitionMode {
    readonly id = 'frontier_topology_border' as const;
    readonly label = 'Frontier Topology Border';

    plan(input: BorderTransitionPlanInput): BorderTransitionPlan {
        // Store prev + next FrontierTopology + transition plan
    }

    sample(plan: BorderTransitionPlan, ctx: TransitionSampleContext): BorderTransitionFrame {
        // Call sampleFrontierTopology(plan, prev, next, ctx.progress)
        // Convert frame topology sections → frontiers
    }
}
```

### CRITICAL: Shared Plan Instance

Both fill and border modes should share the SAME `FrontierTransitionPlan` and call the SAME `sampleFrontierTopology` function. This ensures both derive from identical frame-t data.

Implementation: have the `FrontierTopologyFillMode.plan()` build the transition plan and cache it. `FrontierTopologyBorderMode.plan()` retrieves the same cached plan (via shared reference or caching by geometry version pair).

## Registration

In `pax-fluxia/src/lib/territory/layers/transition/registry.ts`:

```typescript
// Add to existing registries:
import { FrontierTopologyFillMode } from './modes/FrontierTopologyTransitionMode';
import { FrontierTopologyBorderMode } from './modes/FrontierTopologyTransitionMode';

// Register alongside existing modes:
FILL_TRANSITION_MODE_BY_ID.set('frontier_topology_fill', new FrontierTopologyFillMode());
BORDER_TRANSITION_MODE_BY_ID.set('frontier_topology_border', new FrontierTopologyBorderMode());
```

In `pax-fluxia/src/lib/territory/contracts/TerritoryModeSelection.ts`:

Add `'frontier_topology_fill'` to `FillTransitionModeId` and `'frontier_topology_border'` to `BorderTransitionModeId`.

## Fallback Behavior

If `GeometrySnapshot.frontierTopology` is undefined (e.g., using PowerVoronoiGeometryMode or SeedGraphGeometryMode which don't emit topology), fall back to the existing snap behavior:

```typescript
sample(...): FillTransitionFrame {
    if (!typedPlan.frontierTopology) {
        return { regions: typedPlan.targetRegions };
    }
    // Normal topology-based sampling
}
```

## UI Integration

In `ControlsSection-Territory.svelte`, add the new modes to the transition dropdowns if desired. Or make `frontier_topology_fill` / `frontier_topology_border` the new defaults when using the Canonical Layered Runtime architecture.

## Making It Default

In `game.config.ts`, update the territory section defaults:

```typescript
TERRITORY_FILL_TRANSITION_MODE: 'frontier_topology_fill',
TERRITORY_BORDER_TRANSITION_MODE: 'frontier_topology_border',
```

But ONLY after all phases are verified. Until then, keep existing defaults and make the new modes opt-in via the settings UI.

## Verification

1. `npx vite build` must pass
2. Select the new transition modes from the Territory settings panel
3. Start a game and trigger conquests — verify:
   - Borders morph smoothly from prev to next positions
   - Fills track borders exactly (derived from same frame sections)
   - Static borders stay perfectly still (zero jitter)
   - Spawning borders emerge from anchor points
   - Vanishing borders collapse to anchor points
4. Switch back to old modes — existing behavior unchanged

## What NOT to do

- Do NOT modify the Presentation layer
- Do NOT modify PixiTerritoryPresenter, PixiFillPresenter, or PixiBorderPresenter
- Do NOT change the PIXI rendering pipeline
- Do NOT remove existing transition modes (they remain as fallbacks)
- Do NOT change DY4 behavior

## Post-Phase 5: Cleanup (Optional Future Work)

Once verified and stable:
1. Make topology modes the default
2. Deprecate old FrontierMorphFillMode and OptimalTransportBorderMode
3. Remove `legacyGeometryBridge` from GeometrySnapshot
4. Make `frontierTopology` required (not optional) on GeometrySnapshot
