// ============================================================================
// RefactoredPVV2Renderer — Class-Encapsulated Territory Renderer
// ============================================================================
//
// Non-destructive refactor of PowerVoronoiRenderer.ts.
// This adapter holds its OWN PVV2RendererState, completely isolated from the
// legacy_pvv2 adapter's defaultState. Switching between them in the UI
// gives instant A/B comparison with zero crosstalk.
//
// The original PowerVoronoiRenderer.ts is SAFE — legacy callers still get
// the module-level defaultState automatically.
// ============================================================================

import { renderPowerVoronoi, createPVV2State, type PVV2RendererState } from './PowerVoronoiRenderer';
import { log } from '$lib/utils/logger';
import type { TerritoryEngineInput } from '$lib/territory/orchestrator/types';

/**
 * Class-encapsulated PVV2 territory renderer with isolated state.
 *
 * Uses the SAME renderPowerVoronoi logic as legacy_pvv2, but passes its own
 * PVV2RendererState. This means transition animations, fingerprint caches,
 * and PIXI.Graphics instances are fully independent.
 */
export class RefactoredPVV2Renderer {
    private renderCount = 0;
    private readonly state: PVV2RendererState = createPVV2State();

    render(input: TerritoryEngineInput): void {
        this.renderCount++;

        if (this.renderCount === 1) {
            log.renderer(
                'RefactoredPVV2Renderer',
                'First render — using isolated PVV2RendererState',
            );
        }

        // Pass our own state → completely isolated from legacy_pvv2's defaultState
        renderPowerVoronoi(
            input.stars,
            input.container,
            input.colorUtils,
            input.worldWidth,
            input.worldHeight,
            input.connections,
            undefined,
            this.state,
        );
    }

    reset(): void {
        this.renderCount = 0;
        // Reset our state to fresh defaults
        Object.assign(this.state, createPVV2State());
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
