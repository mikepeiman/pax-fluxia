# Implementation Directive: Unified Border/Fill Transitions

## Goal
Implement the `executeTransitionPass` function inside `src/lib/territory/render/TerritoryRenderer.ts` using the provided specification. This function acts as the single source of truth for conquest animation frames in the canonical architecture.

## Primary Objective: Synchronize Fills and Borders
The implementation must eradicate the fill vs. border misalignment bug during animations. It must achieve this by strictly deriving frame fills from the mathematically interpolated frame frontiers.

## Required Approach
1.  **Interpolate Borders**: Interpolate the raw frontiers from the previous state to the target state based on the eased frame time $t$.
2.  **Snap Fills to Interpolated Borders**: Deep clone the target territory regions, and then force the fill polygon edges to warp and snap exactly to those moving frame frontiers. This guarantees mathematical vertex alignment.
3.  **Strict Cache Separation**: Output the unified geometry into distinct caches (`borderCache` and `fillCache`).
4.  **Drawing**: Pass the caches to `this.borderRenderer.draw()` and `this.fillRenderer.draw()`.

## Reference Implementation
Implement the exact logic below:

```typescript
// src/lib/territory/render/TerritoryRenderer.ts

import * as PIXI from 'pixi.js';
import type { CanonicalTerritoryStateOk } from '../compiler/types';
import type { TransitionPlan } from '../compiler/TerritoryTransitionPlanner';
import type { SharedPolyline, MergedTerritory } from '$lib/renderers/geometry/types';
import { buildLerpedPolylines } from '$lib/renderers/geometry/morphUtils';
import { substituteSmoothedEdges } from '$lib/renderers/geometry/borderPipeline';
import { easeInOutCubic } from '$lib/renderers/ShipRenderer';

export class TerritoryRenderer {
    // ... internal layer renderers and caches ...

    /**
     * Executes a conquest animation frame. 
     * Eradicates the fill vs. border drift bug by strictly deriving frame fills 
     * from the interpolated frame frontiers.
     */
    private _executeTransitionPass(
        state: CanonicalTerritoryStateOk, 
        plan: TransitionPlan, 
        nowMs: number,
        config: any
    ): void {
        // 1. Compute the time parameter (t) for the current frame
        const elapsed = nowMs - plan.startedAtMs;
        const rawProgress = Math.max(0, Math.min(1, elapsed / plan.durationMs));
        const t = easeInOutCubic(rawProgress);

        // 2. Generate Ephemeral Frame Frontiers (The Moving Borders)
        // Lerp the raw frontiers from their previous state to their target state.
        const lerpedData = buildLerpedPolylines(plan.previousFrontiers, plan.targetFrontiers, t);

        // Re-pack into SharedPolyline interfaces for the substitution function
        const frameFrontiers: SharedPolyline[] = lerpedData.map((data, index) => ({
            ...plan.targetFrontiers[index], // Retain IDs and topology
            points: data.points
        }));

        // 3. Re-derive Frame Regions (The Fix!)
        // Deep clone the final target regions so we don't mutate the canonical end-state.
        const frameRegions = this.cloneRegions(plan.targetRegions);

        // Force the fill polygon edges to warp and snap exactly to the moving frameFrontiers.
        // This guarantees 100% vertex alignment between borders and fills on every frame.
        substituteSmoothedEdges(frameRegions, plan.targetFrontiers, frameFrontiers);

        // 4. Build Caches from the Ephemeral Frame Truth
        const borderCache = this.buildBorderMeshCache(frameFrontiers);
        const fillCache = this.buildFillMeshCache(frameRegions);

        // 5. Draw Layers
        this.fillRenderer.draw(fillCache, config.fill);
        this.borderRenderer.draw(borderCache, config.border);

        // 6. Complete Transition Lifecycle
        if (rawProgress >= 1.0) {
            state.transitionActive = false; 
        }
    }

    /**
     * Deep clones territory regions to prevent mutating the canonical target state 
     * during the frame-by-frame interpolation pass.
     */
    private cloneRegions(regions: MergedTerritory[]): MergedTerritory[] {
        return regions.map(region => ({
            ownerId: region.ownerId,
            color: region.color,
            points: region.points.map(pt => [pt[0], pt[1]]) // clone coordinate arrays
        }));
    }
}
```

## Secondary Objective: Fix Ghost Border Diagnostic Render
The pipeline trace identifies that when using the "FG2 Seed Graph" method, the geometry compiler (`src/lib/territory-engine/methods/fg2SeedGraph.ts`) implements a native `executeFG2StageRender` function. This draws raw Beziér geometry directly to the canvas container (as a diagnostic layer), which currently overlaps with the actual Style renderers (PVV3, etc.), creating double-drawn ghost lines.

**Task:** Disable, hide, or conditionally gate the native rendering in `fg2SeedGraph.ts` behind a diagnostic trace flag (like `GAME_CONFIG.TERRITORY_ENGINE_TRACE_MODE`) so it no longer draws simultaneously with the main style renders.

## Architectural Notes (Hypothesis to Monitor)
The codebase architecture strictly enforces drawing Fills and Borders into different `PIXI.Graphics` containers (Layer Separation). 

There is an ongoing hypothesis that PIXI v8's WebGL triangulation algorithm interprets identical vertices slightly differently when converting them into `fill()` mesh data versus `stroke()` mesh data, leading to sub-pixel misalignment or dark blending lines (bug alias: B-42).

If, after implementing the mathematically perfect `substituteSmoothedEdges` vertex alignment, visual misalignment or artifacts are still observed between fills and borders on animated curved segments, consider this sub-pixel hypothesis as a potential root cause to investigate, which may require collapsing the drawing into a single `graphics.poly(v).fill().stroke()` execution call. Focus primarily on executing the directive provided above.
