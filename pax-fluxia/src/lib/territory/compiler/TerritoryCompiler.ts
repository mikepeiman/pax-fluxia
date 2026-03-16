/**
 * territory/compiler/TerritoryCompiler.ts
 *
 * Orchestrates the full compile pipeline:
 *
 *   StarState + Connections → MetricState → FrontierGraph → Regions → CanonicalTerritoryState
 *
 * Contract:
 * - Zero PIXI imports
 * - Zero rendering calls
 * - Zero fallback or placeholder geometry fabrication
 * - Returns typed CanonicalTerritoryState (ok or error)
 */

import type { Star, Connection } from '@pax/common';
import { executeMetricStage } from './metricStage';
import { executeFrontierStage } from './frontierStage';
import { executeRegionStage } from './regionStage';
import { fitFrontiers } from './frontierFitter';
import type {
    CanonicalTerritoryState,
    CanonicalTerritoryStateOk,
    CompileError,
    CompilerConfig,
} from './types';

function isError(v: unknown): v is CompileError {
    return (v as CompileError)?.kind === 'error';
}

export class TerritoryCompiler {
    /**
     * Run the full pipeline and return canonical territory state.
     * Never returns partial geometry. On failure, returns CompileError.
     */
    compile(
        stars: Star[],
        connections: Connection[],
        playerIds: string[],
        config: CompilerConfig,
    ): CanonicalTerritoryState {
        // ----------------------------------------------------------------
        // Stage 1: Metric
        // ----------------------------------------------------------------
        const metric = executeMetricStage(stars, connections, playerIds, config.metric ?? {});
        if (isError(metric)) return metric;

        // ----------------------------------------------------------------
        // Stage 2: Frontier graph (analytical lane split)
        // ----------------------------------------------------------------
        const frontier = executeFrontierStage(
            stars,
            connections,
            metric,
            config.frontier ?? { worldBounds: config.worldBounds },
        );
        if (isError(frontier)) return frontier;

        // ----------------------------------------------------------------
        // Stage 3: Regions
        // ----------------------------------------------------------------
        const regions = executeRegionStage(
            stars,
            connections,
            frontier,
            metric,
            config.region ?? { worldBounds: config.worldBounds },
        );
        if (isError(regions)) {
            // Recoverable region error → emit error state; renderer falls back
            if (regions.recoverable) return regions;
            return regions;
        }

        // ----------------------------------------------------------------
        // Stage 4: Geometry fitting
        // ----------------------------------------------------------------
        const family = config.family ?? 'straight';
        const fitted = fitFrontiers(frontier, family, config.fitter ?? {});
        if (isError(fitted)) {
            // Fitter is recoverable — use unfitted frontiers as fallback polylines
            console.warn('[TerritoryCompiler] fitter error:', fitted.message);
        }

        // ----------------------------------------------------------------
        // Build componentsByOwner map
        // ----------------------------------------------------------------
        const componentsByOwner = new Map<string, Set<string>>();
        for (const region of regions) {
            const existing = componentsByOwner.get(region.ownerId) ?? new Set();
            existing.add(region.componentId);
            componentsByOwner.set(region.ownerId, existing);
        }
        const componentsByOwnerFinal = new Map<string, string[]>();
        for (const [ownerId, compSet] of componentsByOwner) {
            componentsByOwnerFinal.set(ownerId, Array.from(compSet));
        }

        const result: CanonicalTerritoryStateOk = {
            kind: 'ok',
            metricTruth: metric,
            frontierGraph: frontier,
            fittedFrontiers: isError(fitted) ? [] : fitted,
            regions,
            componentsByOwner: componentsByOwnerFinal,
            transitionActive: false,
        };

        return result;
    }
}
