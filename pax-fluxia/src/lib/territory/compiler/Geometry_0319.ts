/**
 * territory/compiler/Geometry_0319.ts
 *
 * Layer 2: Territory Geometry Generation — Ownership-Annotated Frontier
 *
 * Fixes fill/border divergence by making world-boundary edges first-class
 * in the edge chaining pipeline. The existing constructFillsFromFrontierChain
 * algorithm is sound — it just receives incomplete world boundary data.
 * This module fixes the input by classifying ALL merged polygon edges
 * as either inter-owner or owner-world.
 *
 * Selectable as "New-Frontiers-0319" in the Geometry dropdown.
 *
 * Rules (from TERRITORY_ARCHITECTURE.md):
 * - Zero PIXI imports
 * - Zero rendering calls
 * - Zero config mutation
 * - Returns typed TerritoryGeometryData | CompileError
 */

import type { StarState, StarConnection } from '$lib/types/game.types';
import {
    formatGeometry0319DebugConfig,
    snapshotGeometry0319DebugConfig,
} from '$lib/config/geometry0319Debug';
import { log } from '$lib/utils/logger';
import type { CompileError } from './types';

import {
    // Types
    type PowerSite,
    type TerritoryCell,
    type MergedTerritory,
    type SharedBorderEdge,
    type SharedPolyline,
    type TerritoryGeometryData,
    type TerritoryGeneratorSettings,
    // Functions
    edgeKey,
    extractSharedEdges,
    mergeSameOwnerCells,
    chainSharedEdgesIntoPolylines,
    constructFillsFromFrontierChain,
    detectEnclaves,
    extractJunctionVertices,
    buildTerritoryGeometryFingerprint,
} from './powerVoronoiTerritoryGeometryGenerator';
import { buildFrontierMap } from './buildFrontierMap';
import { applyExplicitMinStarMargin } from '../geometry/minStarMargin';
import {
    applyExplicitDisconnectZones,
    buildDisconnectZones,
} from '../geometry/disconnectZones';

import { weightedVoronoi } from 'd3-weighted-voronoi';
import {
    computeCxVirtuals,
    computeLpVirtuals,
} from '$lib/renderers/territoryFeatures';
import { findConnectedClustersOptimized } from '$lib/renderers/territoryUtils';

// ---------------------------------------------------------------------------
// World-boundary edge extraction — the key fix
// ---------------------------------------------------------------------------

/**
 * Extract ALL world-boundary edges from merged territory polygons.
 *
 * Unlike extractWorldBorderPolylines (which only captures edges where BOTH
 * endpoints are on the SAME boundary side), this captures EVERY merged polygon
 * edge that is NOT a contested inter-owner edge — including corner-crossing
 * edges that span two boundary sides.
 *
 * Classification: for each edge of a merged polygon, check if its edgeKey
 * matches any SharedBorderEdge. If NO match → it's a world boundary edge.
 */
function extractAllWorldBoundaryEdges(
    mergedRaw: MergedTerritory[],
    interOwnerEdgeKeys: Set<string>,
): SharedBorderEdge[] {
    const result: SharedBorderEdge[] = [];

    for (const territory of mergedRaw) {
        const pts = territory.points;
        const n = pts.length;
        if (n < 2) continue;

        for (let i = 0; i < n - 1; i++) {
            const [x1, y1] = pts[i];
            const [x2, y2] = pts[i + 1];
            const ek = edgeKey(x1, y1, x2, y2);

            if (!interOwnerEdgeKeys.has(ek)) {
                // This edge is NOT contested between two owners → world boundary
                result.push({
                    x1, y1,
                    x2, y2,
                    ownerA: territory.ownerId,
                    ownerB: 'world',
                    colorA: 0,
                    colorB: 0,
                    siteIdA: territory.ownerId,
                    siteIdB: 'world',
                });
            }
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Compute territory geometry using ownership-annotated frontier.
 *
 * Reuses stages 0–4 from the existing generator (power diagram, cells,
 * shared edges, cluster map, merge cells), then fixes the world-boundary
 * edge extraction to capture ALL boundary edges — not just same-side ones.
 *
 * The existing constructFillsFromFrontierChain algorithm then receives
 * complete data and can properly close fill rings.
 */
export function computeGeometry0319(
    stars: StarState[],
    connections: StarConnection[],
    config: TerritoryGeneratorSettings,
    weightOverrides?: Map<string, number>,
    extraSites?: PowerSite[],
): TerritoryGeometryData | CompileError {
    try {
        const { starWeight, worldWidth, worldHeight } = config;

        const ownedStars = stars.filter(s => s.ownerId);
        if (ownedStars.length < 2) {
            return {
                kind: 'error',
                stage: 'metric',
                message: 'Geometry_0319: fewer than 2 owned stars — cannot compute power diagram',
                recoverable: true,
            } satisfies CompileError;
        }

        // ── Stage 0: Build site array ───────────────────────────────────────
        const defaultWeight = starWeight * starWeight;
        const sites: PowerSite[] = ownedStars.map(s => ({
            x: s.x,
            y: s.y,
            weight: weightOverrides?.get(s.id) ?? defaultWeight,
            ownerId: s.ownerId!,
            starId: s.id,
        }));

        // Inject ghost/extra sites (used for transition ghost old-owner duplicates)
        if (extraSites) {
            for (const es of extraSites) sites.push(es);
        }

        if (config.cxEnabled) {
            const cxVirtuals = computeCxVirtuals(
                ownedStars,
                connections,
                config.cxSpacingPx,
                config.cxWeight,
                config.cxPointCount || undefined,
            );
            for (const cv of cxVirtuals) {
                sites.push({
                    x: cv.x, y: cv.y,
                    weight: starWeight * starWeight * cv.weight,
                    ownerId: cv.ownerId,
                    starId: `cx_${cv.sourceStarA}_${cv.sourceStarB}`,
                    virtual: 'corridor',
                });
            }

            const lpVirtuals = computeLpVirtuals(
                ownedStars,
                connections,
                config.cxSpacingPx,
                config.cxWeight,
                config.cxPointCount || undefined,
                undefined,
                config.lpMidpointPairEnabled,
                true,
                config.lpPairWeight,
                config.lpPairCount,
                config.lpPairSpacingPx,
            );
            for (const lv of lpVirtuals) {
                sites.push({
                    x: lv.x, y: lv.y,
                    weight: starWeight * starWeight * lv.weight,
                    ownerId: lv.ownerId,
                    starId: `lp_${lv.sourceStarA}_${lv.sourceStarB}_${lv.anchorStarId}`,
                    virtual: 'corridor',
                });
            }
        }

        if (config.dxEnabled) {
            const disconnectVirtuals: never[] = [];
            void disconnectVirtuals;
        }

        // ── Stage 1: Power diagram ──────────────────────────────────────────
        // Use the configured world clip, matching the authoritative power-voronoi
        // geometry path. World-border edges must be true world bounds, not a
        // star-local rectangle, or owner-vs-world polylines collapse into
        // internal bars and boxes.
        const pad = config.boundaryPad;
        const clip: [number, number][] = [
            [-pad, -pad],
            [worldWidth + pad, -pad],
            [worldWidth + pad, worldHeight + pad],
            [-pad, worldHeight + pad],
        ];

        let polygons: any[];
        try {
            const wv = weightedVoronoi()
                .x((d: PowerSite) => d.x)
                .y((d: PowerSite) => d.y)
                .weight((d: PowerSite) => d.weight)
                .clip(clip);
            polygons = wv(sites);
        } catch (e) {
            return {
                kind: 'error',
                stage: 'metric',
                message: `Geometry_0319: d3-weighted-voronoi crashed: ${e}`,
                recoverable: false,
            } satisfies CompileError;
        }

        // ── Stage 2: Convert to TerritoryCell[] ─────────────────────────────
        const cells: TerritoryCell[] = [];
        for (let i = 0; i < polygons.length; i++) {
            const poly = polygons[i];
            if (!poly || poly.length < 3) continue;
            const site = (poly as any).site?.originalObject as PowerSite | undefined;
            if (!site) continue;

            const pts: [number, number][] = poly.map((p: number[]) => [p[0], p[1]] as [number, number]);
            if (pts.length > 0 && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) {
                pts.push([pts[0][0], pts[0][1]]);
            }
            cells.push({ points: pts, ownerId: site.ownerId, siteId: site.starId });
        }

        // Individual stage logs consolidated into single summary below (see Stage 10)

        // ── Stage 3: Extract inter-owner shared edges ───────────────────────
        const sharedEdges = extractSharedEdges(cells);

        // ── Stage 4: Build cluster map + merge cells ────────────────────────
        const clusterMap = new Map<string, number>();
        if (config.clusterSplit) {
            const starById = new Map(ownedStars.map(s => [s.id, s]));
            const clusters = findConnectedClustersOptimized(ownedStars, connections, starById);
            for (const [starId, info] of clusters) {
                clusterMap.set(starId, info.clusterIdx);
            }
            for (const site of sites) {
                if (site.virtual === 'corridor') {
                    const sourceId = site.starId.split('_')[1];
                    const srcCluster = clusterMap.get(sourceId);
                    if (srcCluster !== undefined) clusterMap.set(site.starId, srcCluster);
                }
            }
        }

        const mergedRaw = mergeSameOwnerCells(cells, config.clusterSplit, clusterMap);

        // ── Stage 5: Build inter-owner edge key set ─────────────────────────
        const interOwnerEdgeKeys = new Set<string>();
        for (const edge of sharedEdges) {
            interOwnerEdgeKeys.add(edgeKey(edge.x1, edge.y1, edge.x2, edge.y2));
        }

        // ── Stage 6: Extract ALL world-boundary edges ───────────────────────
        // This is the KEY FIX: captures corner-crossing edges that the old
        // extractWorldBorderPolylines misses.
        const worldBoundaryEdges = extractAllWorldBoundaryEdges(mergedRaw, interOwnerEdgeKeys);

        // ── Stage 7: Chain ALL edges into polylines ─────────────────────────
        // Concatenate inter-owner + owner-world edges and chain together.
        const allFrontierEdges: SharedBorderEdge[] = [...sharedEdges, ...worldBoundaryEdges];
        const rawAllPolylines = chainSharedEdgesIntoPolylines(allFrontierEdges, 0);
        const allPolylines = chainSharedEdgesIntoPolylines(allFrontierEdges, config.chaikinPasses);

        // ── Stage 8: Separate into inter-owner and world-border ─────────────
        const sharedPolylines: SharedPolyline[] = [];
        const worldBorderPolylines: SharedPolyline[] = [];
        const rawSharedPolylines: SharedPolyline[] = [];

        for (const pl of allPolylines) {
            if (pl.ownerPairKey.includes('world')) {
                worldBorderPolylines.push(pl);
            } else {
                sharedPolylines.push(pl);
            }
        }
        for (const pl of rawAllPolylines) {
            if (!pl.ownerPairKey.includes('world')) {
                rawSharedPolylines.push(pl);
            }
        }


        // ── Stage 9: Enclaves ───────────────────────────────────────────────
        // Run detectEnclaves on the frontier-chain fills (NOT mergedRaw) so that
        // indices match the mergedTerritories array the renderer actually draws.
        // This lets the renderer cut holes in the outer fill, preventing two-tone.
        // (Previous empty-map approach failed: outer fill painted over inner territory.)

        // ── Stage 10: Build fill regions ────────────────────────────────────
        // constructFillsFromFrontierChain now receives COMPLETE data
        // (including corner-crossing world boundary edges)
        const mergedTerritories = constructFillsFromFrontierChain(sharedPolylines, worldBorderPolylines, cells);
        let appliedDisconnectZones = 0;
        if (config.dxEnabled) {
            const disconnectZones = buildDisconnectZones(
                ownedStars,
                connections,
                config.dxMaxDistancePx,
                undefined,
                Math.max(0.12, Math.min(0.45, config.dxWeight)),
            );
            appliedDisconnectZones = applyExplicitDisconnectZones(
                mergedTerritories,
                disconnectZones,
            );
        }
        const minStarMargin = applyExplicitMinStarMargin(
            mergedTerritories,
            ownedStars,
            config.msrPx,
        );
        if (
            minStarMargin.appliedMarginPx > 0
            && Math.abs(minStarMargin.appliedMarginPx - minStarMargin.requestedMarginPx) >
                0.01
        ) {
            log.renderer(
                'Geometry_0319',
                `MSR clamp ${minStarMargin.requestedMarginPx.toFixed(2)} -> ${minStarMargin.appliedMarginPx.toFixed(2)}`,
            );
        }
        if (appliedDisconnectZones > 0) {
            log.renderer(
                'Geometry_0319',
                `DX applied on ${appliedDisconnectZones} disconnect zones`,
            );
        }

        const fingerprint = buildTerritoryGeometryFingerprint(stars, config) + ':g0319';

        // Stage 10b: Build canonical frontier map (identity annotation — Phase 1)
        // Junction vertices are needed to classify decisive vertices in the TMAP.
        const junctionPts = extractJunctionVertices(cells);
        const frontierMap = buildFrontierMap(sharedPolylines, worldBorderPolylines, junctionPts, fingerprint);

        // Now detect enclaves on the actual fill output
        const enclaveMap = detectEnclaves(mergedTerritories);

        // Diagnostic: check fill closure (only warn on failures)
        let closedCount = 0;
        for (const fill of mergedTerritories) {
            const first = fill.points[0];
            const last = fill.points[fill.points.length - 1];
            const dx = Math.abs(first[0] - last[0]);
            const dy = Math.abs(first[1] - last[1]);
            if (dx < 6 && dy < 6) closedCount++;
        }

        // Single consolidated summary log (replaces ~8 individual stage logs)
        const closureOk = closedCount === mergedTerritories.length;
        const geometrySnapshot = snapshotGeometry0319DebugConfig({
            geometrySource: 'power_voronoi_0319',
            frontierResolution: config.frontierResolution,
            starWeight: config.starWeight,
            msrPx: config.msrPx,
            cxEnabled: config.cxEnabled,
            cxSpacingPx: config.cxSpacingPx,
            cxPointCount: config.cxPointCount,
            cxWeight: config.cxWeight,
            lpMidpointPairEnabled: config.lpMidpointPairEnabled,
            lpPairCount: config.lpPairCount,
            lpPairSpacingPx: config.lpPairSpacingPx,
            lpPairWeight: config.lpPairWeight,
            dxEnabled: config.dxEnabled,
            dxMaxDistancePx: config.dxMaxDistancePx,
            dxWeight: config.dxWeight,
            clusterSplit: config.clusterSplit,
            chaikinPasses: config.chaikinPasses,
            boundaryPad: config.boundaryPad,
            boundaryEps: config.boundaryEps,
        });
        log.renderer(
            'Geometry_0319 Config',
            formatGeometry0319DebugConfig(geometrySnapshot),
            geometrySnapshot,
        );
        log.renderer('Geometry_0319',
            `${ownedStars.length} stars → ${cells.length} cells → ${mergedRaw.length} merged → ` +
            `${allPolylines.length} polylines (${sharedPolylines.length} shared + ${worldBorderPolylines.length} world) → ` +
            `${mergedTerritories.length} fills ` +
            `[closure: ${closedCount}/${mergedTerritories.length}${closureOk ? ' ✓' : ' ✗ GAPS'}]`
        );
        return {
            cells,
            mergedTerritories,
            sharedEdges,
            rawSharedPolylines,
            sharedPolylines,
            worldBorderPolylines,
            enclaveMap,
            fingerprint,
            frontierMap,
        } satisfies TerritoryGeometryData;

    } catch (err) {
        return {
            kind: 'error',
            stage: 'metric',
            message: err instanceof Error ? err.message : String(err),
            recoverable: false,
        } satisfies CompileError;
    }
}
