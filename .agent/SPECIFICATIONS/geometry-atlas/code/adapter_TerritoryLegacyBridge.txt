/**
 * territory/legacy/TerritoryLegacyBridge.ts
 *
 * QUARANTINE BOUNDARY — isolates legacy renderers from the canonical architecture.
 *
 * Legacy renderers (PVV2/PowerVoronoiRenderer, PVV3, DistanceField) may exist
 * during migration, but they must not:
 * - Define canonical ownership truth
 * - Override compiler contract outputs
 * - Contaminate the render layer with legacy design decisions
 *
 * This bridge is a TEMPORARY escape hatch during refactoring, not a permanent
 * parallel architecture. As canonical equivalents are proven correct, each
 * legacy mode is removed from this file.
 *
 * Rules per LEGACY_QUARANTINE.md:
 * - This file is the ONLY place legacy renderers may be imported
 * - Never import from this file into the compiler or canonical render layer
 */

import type * as PIXI from 'pixi.js';
import type { Star, Connection } from '@pax/common';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import { runFG2DataPipeline, extractCanonicalData } from '$lib/territory/orchestrator';

export type LegacyStyleId =
    | 'territory_engine'   // Old DY4 pipeline — SACROSANCT, do not alter
    | 'vs_pvv3'            // PVV3 vector stroke
    | 'power_voronoi'      // PVV2 power voronoi
    | 'distance_field'     // GPU distance field
    | 'voronoi'
    | 'metaball'
    | 'pixel'
    | 'graph'
    | 'contour';

export interface LegacyBridgeInput {
    style: LegacyStyleId;
    stars: Star[];
    connections: Connection[];
    container: PIXI.Container;
    colorUtils: ColorUtils;
    worldWidth: number;
    worldHeight: number;
    renderer?: PIXI.Renderer;
    gameNowMs: number;
}

/**
 * Route a legacy style mode to its corresponding renderer.
 * All imports of legacy renderers are made dynamically inside this function
 * to minimize contamination of the canonical compilation graph.
 *
 * Returns true if the style was handled, false if unrecognized.
 */
export async function renderLegacyStyle(input: LegacyBridgeInput): Promise<boolean> {
    const {
        style, stars, connections, container, colorUtils,
        worldWidth, worldHeight, renderer, gameNowMs,
    } = input;

    switch (style) {
        case 'territory_engine': {
            // SACROSANCT — DY4 optimal transport. Do not alter behavior.
            const { renderTerritoryEngine } = await import('$lib/territory/orchestrator');
            renderTerritoryEngine({
                stars, container, colorUtils, worldWidth, worldHeight,
                connections, renderer, gameNowMs,
            });
            return true;
        }

        case 'vs_pvv3': {
            const [{ runFG2DataPipeline, extractCanonicalData }, { renderPVV3 }] =
                await Promise.all([
                    import('$lib/territory/orchestrator'),
                    import('$lib/renderers/PVV3Renderer'),
                ]);
            const artifacts = runFG2DataPipeline({
                stars, container, colorUtils, worldWidth, worldHeight,
                connections, gameNowMs,
            });
            renderPVV3(stars, container, colorUtils, worldWidth, worldHeight,
                connections, extractCanonicalData(artifacts));
            return true;
        }

        case 'power_voronoi': {
            const [{ runFG2DataPipeline, extractCanonicalData }, { renderPowerVoronoi }] =
                await Promise.all([
                    import('$lib/territory/orchestrator'),
                    import('$lib/renderers/PowerVoronoiRenderer'),
                ]);
            const artifacts = runFG2DataPipeline({
                stars, container, colorUtils, worldWidth, worldHeight,
                connections, gameNowMs,
            });
            renderPowerVoronoi(stars, container, colorUtils, worldWidth, worldHeight,
                connections, extractCanonicalData(artifacts));
            return true;
        }

        case 'distance_field': {
            const { renderDistanceFieldTerritory } = await import('$lib/renderers/DistanceFieldTerritoryRenderer');
            renderDistanceFieldTerritory(stars, container, colorUtils,
                worldWidth, worldHeight, connections, renderer);
            return true;
        }

        case 'voronoi': {
            const { renderVoronoi } = await import('$lib/renderers/VoronoiRenderer');
            renderVoronoi(stars, container, colorUtils, worldWidth, worldHeight, connections);
            return true;
        }

        case 'metaball': {
            const { renderMetaball } = await import('$lib/renderers/MetaballRenderer');
            renderMetaball(stars, container, colorUtils, worldWidth, worldHeight, connections);
            return true;
        }

        case 'pixel': {
            const { renderPixelTerritory } = await import('$lib/renderers/PixelTerritoryRenderer');
            renderPixelTerritory(stars, container, colorUtils, worldWidth, worldHeight, connections);
            return true;
        }

        case 'graph': {
            const { renderLaneTerritory } = await import('$lib/renderers/LaneTerritoryRenderer');
            renderLaneTerritory(stars, container, colorUtils, worldWidth, worldHeight, connections);
            return true;
        }

        case 'contour': {
            const { renderContourTerritory } = await import('$lib/renderers/ContourTerritoryRenderer');
            renderContourTerritory(stars, container, colorUtils, worldWidth, worldHeight, connections);
            return true;
        }

        default:
            return false;
    }
}
