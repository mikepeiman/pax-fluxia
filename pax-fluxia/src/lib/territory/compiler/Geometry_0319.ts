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
    extractJunctionVertices,
    buildTerritoryGeometryFingerprint,
} from './powerVoronoiTerritoryGeometryGenerator';

import { weightedVoronoi } from 'd3-weighted-voronoi';
import { computeCorridorVirtuals, computeDisconnectVirtuals, DISCONNECT_OWNER_ID } from '$lib/renderers/territoryFeatures';
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
): TerritoryGeometryData | CompileError {
    try {
        const { starMargin, worldWidth, worldHeight } = config;

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
        const sites: PowerSite[] = ownedStars.map(s => ({
            x: s.x,
            y: s.y,
            weight: starMargin * starMargin,
            ownerId: s.ownerId!,
            starId: s.id,
        }));

        if (config.corridorEnabled) {
            const corridorVirtuals = computeCorridorVirtuals(ownedStars, connections, config.corridorSpacing, 0.5);
            for (const cv of corridorVirtuals) {
                sites.push({
                    x: cv.x, y: cv.y,
                    weight: starMargin * starMargin * cv.weight,
                    ownerId: cv.ownerId,
                    starId: `corridor_${cv.sourceStarA}_${cv.sourceStarB}`,
                    virtual: 'corridor',
                });
            }
        }

        if (config.disconnectEnabled) {
            const disconnectVirtuals = computeDisconnectVirtuals(ownedStars, stars, connections, config.disconnectDistance, 0.3);
            for (const dv of disconnectVirtuals) {
                sites.push({
                    x: dv.x, y: dv.y,
                    weight: starMargin * starMargin * dv.weight,
                    ownerId: DISCONNECT_OWNER_ID,
                    starId: `disconnect_${dv.sourceStarA}_${dv.sourceStarB}`,
                    virtual: 'disconnect',
                });
            }
        }

        // ── Stage 1: Power diagram ──────────────────────────────────────────
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

            let effectiveOwner = site.ownerId;
            if (site.ownerId === DISCONNECT_OWNER_ID) {
                const parts = site.starId.split('_');
                const sourceStarA = parts[1];
                const sourceOwner = ownedStars.find(s => s.id === sourceStarA)?.ownerId;
                let nearestDist = Infinity;
                let nearestOwner = '';
                for (const s of ownedStars) {
                    if (s.ownerId === sourceOwner) continue;
                    const d = (s.x - site.x) ** 2 + (s.y - site.y) ** 2;
                    if (d < nearestDist) { nearestDist = d; nearestOwner = s.ownerId!; }
                }
                if (!nearestOwner) {
                    effectiveOwner = sourceOwner ?? '';
                    if (!effectiveOwner) continue;
                } else {
                    effectiveOwner = nearestOwner;
                }
            }

            const pts: [number, number][] = poly.map((p: number[]) => [p[0], p[1]] as [number, number]);
            if (pts.length > 0 && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) {
                pts.push([pts[0][0], pts[0][1]]);
            }
            cells.push({ points: pts, ownerId: effectiveOwner, siteId: site.starId });
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
        // Frontier-chain fills handle topology correctly — each owner gets one
        // closed ring. detectEnclaves indices correspond to mergedRaw, NOT the
        // frontier-chain mergedTerritories, so using them would cause mismatched
        // hole cutouts (the two-tone rendering bug).
        const enclaveMap = new Map<number, [number, number][][]>();

        // ── Stage 10: Build fill regions ────────────────────────────────────
        // constructFillsFromFrontierChain now receives COMPLETE data
        // (including corner-crossing world boundary edges)
        const mergedTerritories = constructFillsFromFrontierChain(sharedPolylines, worldBorderPolylines);

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
        log.sys('Geometry_0319',
            `${ownedStars.length} stars → ${cells.length} cells → ${mergedRaw.length} merged → ` +
            `${allPolylines.length} polylines (${sharedPolylines.length} shared + ${worldBorderPolylines.length} world) → ` +
            `${mergedTerritories.length} fills ` +
            `[closure: ${closedCount}/${mergedTerritories.length}${closureOk ? ' ✓' : ' ✗ GAPS'}]`
        );

        const fingerprint = buildTerritoryGeometryFingerprint(stars, config) + ':g0319';

        return {
            cells,
            mergedTerritories,
            sharedEdges,
            rawSharedPolylines,
            sharedPolylines,
            worldBorderPolylines,
            enclaveMap,
            fingerprint,
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
