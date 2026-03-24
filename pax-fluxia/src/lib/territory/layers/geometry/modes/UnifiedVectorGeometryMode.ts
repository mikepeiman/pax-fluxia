/**
 * @file UnifiedVectorGeometryMode.ts
 *
 * Phase 2 of Geometry Pipeline Consolidation:
 * Single vector-native geometry mode replacing PowerVoronoiGeometryMode,
 * SeedGraphGeometryMode, and BoundaryAwareFrontierGeometryMode.
 *
 * Uses computeGeometry0319 (the best compiler) and produces enriched
 * GeometrySnapshot output with world borders and multimap frontier map.
 *
 * Layer: Geometry (Layer 2)
 * PIXI imports: NEVER
 */

import { computeGeometry0319 } from '../../../compiler/Geometry_0319';
import type { FrontierPolylineShape, GeometryMode, GeometrySnapshot } from '../GeometryMode';
import { buildGeometryVersion } from '../planners/GeometryFingerprint';
import {
    buildFrontierPolylineShapes,
    buildTerritoryRegionShapes,
    buildSharedFrontierMap,
} from '../planners/FrontierTopologyBuilder';
import {
    buildGeneratorSettings,
    createEmptyTerritoryGeometryData,
    isCompileError,
} from './geometryModeUtils';
import { log } from '$lib/utils/logger';

/**
 * Unified vector-native geometry mode.
 *
 * This is the single entry point for all polygon-based territory geometry.
 * It subsumes the three previous modes:
 *   - PowerVoronoiGeometryMode (old generator, no world borders)
 *   - SeedGraphGeometryMode (old generator, forced clusterSplit)
 *   - BoundaryAwareFrontierGeometryMode (computeGeometry0319 + world borders)
 *
 * All vector geometry now goes through computeGeometry0319, which fixes
 * the world-boundary edge issues and produces frontier-chain-based fills.
 */
export class UnifiedVectorGeometryMode implements GeometryMode {
    readonly id = 'unified_vector' as const;
    readonly label = 'Unified Vector Geometry';

    compute(input: Parameters<GeometryMode['compute']>[0]): GeometrySnapshot {
        log.renderer('UnifiedVector', `compute() called — ownership v${input.ownership.version}, ${input.stars.length} stars`);
        const settings = buildGeneratorSettings(input.world, input.tunables);
        const version = buildGeometryVersion(
            this.id,
            input.stars,
            settings,
            input.ownership.version,
        );

        const result = computeGeometry0319(
            [...input.stars],
            [...input.lanes],
            settings,
        );

        const geometry = isCompileError(result)
            ? (input.previousSnapshot?.legacyGeometryBridge as any) ??
            createEmptyTerritoryGeometryData(`${version}:empty`)
            : result;

        // Build frontier polylines (both inter-owner and world borders)
        const allPolylines = buildFrontierPolylineShapes(geometry);
        const frontierPolylines = allPolylines.filter(
            (p) => !p.ownerPairKey.includes('__world__') && !p.ownerPairKey.endsWith('|world'),
        );
        const worldBorderPolylines: FrontierPolylineShape[] = geometry.worldBorderPolylines.map(
            (p: { ownerPairKey: string; points: [number, number][] }) => ({
                ownerPairKey: p.ownerPairKey,
                points: p.points,
            }),
        );

        return {
            version,
            sourceMode: this.id,
            sourceStyle: input.styleMode,
            ownershipVersion: input.ownership.version,
            legacyGeometryBridge: geometry,
            territoryRegions: buildTerritoryRegionShapes(geometry),
            frontierPolylines,
            worldBorderPolylines,
            sharedFrontierMap: buildSharedFrontierMap(frontierPolylines),
        };
    }
}
