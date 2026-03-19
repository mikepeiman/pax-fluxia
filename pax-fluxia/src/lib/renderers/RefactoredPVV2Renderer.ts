// ============================================================================
// RefactoredPVV2Renderer — Class-Encapsulated Territory Renderer
// ============================================================================
//
// Non-destructive refactor of PowerVoronoiRenderer.ts.
// Phase 4, Step 4: Initially delegates to the existing renderPowerVoronoi
// function to get the dual-adapter pipeline working end-to-end.
//
// Roadmap:
//   - [x] Phase 1: Thin wrapper — delegates to legacy renderPowerVoronoi
//   - [ ] Phase 2: Move transition state (activeBorderTransitionHandler, etc.)
//         into class fields
//   - [ ] Phase 3: Replace drawFrame with getInterpolatedPolylines + renderer draw
//   - [ ] Phase 4: Wire into FX system as FXHandler<ConquestEvent>
//
// The original PowerVoronoiRenderer.ts is LEFT UNTOUCHED.
// ============================================================================

import type { StarState, StarConnection } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';
import type * as PIXI from 'pixi.js';
import { renderPowerVoronoi } from './PowerVoronoiRenderer';
import { log } from '$lib/utils/logger';
import type { TerritoryEngineInput } from '$lib/territory/orchestrator/types';

/**
 * Class-encapsulated wrapper around the PVV2 territory renderer.
 *
 * Currently delegates to the existing module-level renderPowerVoronoi function.
 * State encapsulation will be incrementally migrated in subsequent phases.
 */
export class RefactoredPVV2Renderer {
    private renderCount = 0;

    render(input: TerritoryEngineInput): void {
        this.renderCount++;

        if (this.renderCount === 1) {
            log.renderer(
                'RefactoredPVV2Renderer',
                'First render — delegating to legacy renderPowerVoronoi',
            );
        }

        // Phase 1: Direct delegation to the existing renderer.
        // This shares module-level state with legacy_pvv2 calls — that's expected
        // for now and will be separated when state is encapsulated.
        renderPowerVoronoi(
            input.stars,
            input.container,
            input.colorUtils,
            input.worldWidth,
            input.worldHeight,
            input.connections,
            undefined,
        );
    }

    reset(): void {
        this.renderCount = 0;
    }
}

// Singleton instance for use by the adapter dispatch
const _refactoredRenderer = new RefactoredPVV2Renderer();

/**
 * Entry point for the refactored_pvv2 adapter.
 * Called from engine.ts runLegacyAdapter().
 */
export function renderRefactoredPowerVoronoi(input: TerritoryEngineInput): void {
    _refactoredRenderer.render(input);
}
