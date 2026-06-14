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

import type { StarState, StarConnection } from '../../types/game.types';
import {
    formatGeometry0319DebugConfig,
    snapshotGeometry0319DebugConfig,
} from '../../config/geometry0319Debug';
import { log } from '../../utils/logger';
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
import { executeChainWalk } from './chainWalkCore';
import {
    applyExplicitMinStarMargin,
    resolvePerStarMinStarMarginPx,
} from '../geometry/minStarMargin';
import {
    buildRealSiteWeight,
    buildVirtualSiteWeight,
    clampVirtualSiteWeightForRealStarOwnership,
} from './powerVoronoiWeights';
import { pointInPolygon } from '../geometry/geometryUtils';

import { weightedVoronoi } from 'd3-weighted-voronoi';
import { computeCorridorVirtuals, computeDisconnectVirtuals, DISCONNECT_OWNER_ID } from '../../renderers/territoryFeatures';
import { findConnectedClustersOptimized } from '../../renderers/territoryUtils';

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

function summarizeOwnerRegionCounts(
    regions: ReadonlyArray<MergedTerritory>,
): Map<string, number> {
    const counts = new Map<string, number>();
    for (const region of regions) {
        counts.set(region.ownerId, (counts.get(region.ownerId) ?? 0) + 1);
    }
    return counts;
}

function allOwnedStarsRemainInsideOwnerRegions(
    stars: ReadonlyArray<StarState>,
    regions: ReadonlyArray<MergedTerritory>,
): { ok: boolean; reason?: string } {
    for (const star of stars) {
        if (!star.ownerId) continue;
        const inside = regions
            .filter((region) => region.ownerId === star.ownerId)
            .some((region) => pointInPolygon(star.x, star.y, region.points));
        if (!inside) {
            return {
                ok: false,
                reason: `Star ${star.id} left owner ${star.ownerId} region`,
            };
        }
    }
    return { ok: true };
}

function buildMinStarMarginValidator<TShared extends SharedPolyline>(params: {
    cells: ReadonlyArray<TerritoryCell>;
    baselineSharedPolylines: ReadonlyArray<TShared>;
    baselineWorldBorderPolylines: ReadonlyArray<TShared>;
    stars: ReadonlyArray<StarState>;
}) {
    const baselineRegions = constructFillsFromFrontierChain(
        [...params.baselineSharedPolylines],
        [...params.baselineWorldBorderPolylines],
        [...params.cells],
    );
    const baselineOwnerCounts = summarizeOwnerRegionCounts(baselineRegions);
    return (candidate: {
        sharedPolylines: ReadonlyArray<TShared>;
        worldBorderPolylines: ReadonlyArray<TShared>;
    }): { ok: boolean; reason?: string } => {
        const candidateRegions = constructFillsFromFrontierChain(
            [...candidate.sharedPolylines],
            [...candidate.worldBorderPolylines],
            [...params.cells],
        );
        if (candidateRegions.length !== baselineRegions.length) {
            return {
                ok: false,
                reason: `Region count ${candidateRegions.length} != ${baselineRegions.length}`,
            };
        }
        const candidateOwnerCounts = summarizeOwnerRegionCounts(candidateRegions);
        if (candidateOwnerCounts.size !== baselineOwnerCounts.size) {
            return {
                ok: false,
                reason: 'Owner region partition changed',
            };
        }
        for (const [ownerId, expectedCount] of baselineOwnerCounts.entries()) {
            if ((candidateOwnerCounts.get(ownerId) ?? 0) !== expectedCount) {
                return {
                    ok: false,
                    reason: `Owner ${ownerId} region count changed`,
                };
            }
        }
        for (const region of candidateRegions) {
            if (region.points.length < 4) {
                return {
                    ok: false,
                    reason: `Owner ${region.ownerId} region degenerated`,
                };
            }
            const first = region.points[0]!;
            const last = region.points[region.points.length - 1]!;
            if (Math.abs(first[0] - last[0]) > 6 || Math.abs(first[1] - last[1]) > 6) {
                return {
                    ok: false,
                    reason: `Owner ${region.ownerId} region opened`,
                };
            }
        }
        const starContainment = allOwnedStarsRemainInsideOwnerRegions(
            params.stars,
            candidateRegions,
        );
        if (!starContainment.ok) {
            return starContainment;
        }
        return { ok: true };
    };
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
        const localStarMargins = resolvePerStarMinStarMarginPx({
            stars: ownedStars,
            requestedMarginPx: starMargin,
            worldWidth,
            worldHeight,
        });
        const sites: PowerSite[] = ownedStars.map(s => ({
            x: s.x,
            y: s.y,
            weight:
                weightOverrides?.get(s.id) ??
                buildRealSiteWeight(
                    localStarMargins.get(s.id) ?? starMargin,
                    config.msrStarBias,
                ),
            ownerId: s.ownerId!,
            starId: s.id,
        }));
        const realOwnershipGuardSites = sites.map((site) => ({
            x: site.x,
            y: site.y,
            weight: site.weight,
            clearanceRadiusPx: 0,
        }));
        const realDisconnectGuardSites = sites.map((site) => ({
            x: site.x,
            y: site.y,
            weight: site.weight,
            clearanceRadiusPx: config.starCoreGuardRadius,
        }));

        // Inject ghost/extra sites (used for transition ghost old-owner duplicates)
        if (extraSites) {
            for (const es of extraSites) sites.push(es);
        }

        if (config.corridorEnabled) {
            const corridorVirtuals = computeCorridorVirtuals(
                ownedStars,
                connections,
                config.corridorSpacing,
                config.cxWeight,
                config.cxCount || undefined,
                // Use authored/cache lane paths only; territory geometry must not reroute lanes.
                undefined,
                config.cxContestMidpointVstars,
                true,
                true,
                config.cxContestPairWeight,
                config.cxContestPairCount,
                config.cxContestPairSpacing,
                config.starCoreGuardRadius,
            );
            for (const cv of corridorVirtuals) {
                const clampedWeight = clampVirtualSiteWeightForRealStarOwnership({
                    x: cv.x,
                    y: cv.y,
                    weight: buildVirtualSiteWeight(cv.weight),
                    realSites: realOwnershipGuardSites,
                });
                if (clampedWeight <= 0) continue;
                sites.push({
                    x: cv.x, y: cv.y,
                    weight: clampedWeight,
                    ownerId: cv.ownerId,
                    starId: `corridor_${cv.sourceStarA}_${cv.sourceStarB}`,
                    virtual: 'corridor',
                });
            }
        }

        if (config.disconnectEnabled) {
            const disconnectVirtuals = computeDisconnectVirtuals(ownedStars, stars, connections, config.disconnectDistance, config.dxWeight);
            for (const dv of disconnectVirtuals) {
                const clampedWeight = clampVirtualSiteWeightForRealStarOwnership({
                    x: dv.x,
                    y: dv.y,
                    weight: buildVirtualSiteWeight(dv.weight),
                    realSites: realDisconnectGuardSites,
                });
                if (clampedWeight <= 0) continue;
                sites.push({
                    x: dv.x, y: dv.y,
                    weight: clampedWeight,
                    ownerId: DISCONNECT_OWNER_ID,
                    starId: `disconnect_${dv.sourceStarA}_${dv.sourceStarB}`,
                    virtual: 'disconnect',
                });
            }
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
                if (site.virtual === 'corridor' || site.virtual === 'msr_support') {
                    const sourceId =
                        site.sourceStarId ??
                        (site.virtual === 'corridor'
                            ? site.starId.split('_')[1]
                            : undefined);
                    const srcCluster =
                        sourceId !== undefined ? clusterMap.get(sourceId) : undefined;
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
        let sharedPolylines: SharedPolyline[] = [];
        let worldBorderPolylines: SharedPolyline[] = [];
        let rawSharedPolylines: SharedPolyline[] = [];
        let rawWorldBorderPolylines: SharedPolyline[] = [];

        for (const pl of allPolylines) {
            if (pl.ownerPairKey.includes('world')) {
                worldBorderPolylines.push(pl);
            } else {
                sharedPolylines.push(pl);
            }
        }
        for (const pl of rawAllPolylines) {
            if (pl.ownerPairKey.includes('world')) {
                rawWorldBorderPolylines.push(pl);
            } else {
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
        const rawMinStarMarginValidator = buildMinStarMarginValidator({
            cells,
            baselineSharedPolylines: rawSharedPolylines,
            baselineWorldBorderPolylines: rawWorldBorderPolylines,
            stars: ownedStars,
        });
        const adjustedRawGeometry = applyExplicitMinStarMargin({
            sharedPolylines: rawSharedPolylines,
            worldBorderPolylines: rawWorldBorderPolylines,
            stars: ownedStars,
            requestedMarginPx: starMargin,
            worldWidth,
            worldHeight,
            validateRepair: (candidate) =>
                rawMinStarMarginValidator({
                    sharedPolylines: candidate.sharedPolylines,
                    worldBorderPolylines: candidate.worldBorderPolylines,
                }),
        });
        rawSharedPolylines = adjustedRawGeometry.sharedPolylines;
        rawWorldBorderPolylines = adjustedRawGeometry.worldBorderPolylines;
        const minStarMarginValidator = buildMinStarMarginValidator({
            cells,
            baselineSharedPolylines: sharedPolylines,
            baselineWorldBorderPolylines: worldBorderPolylines,
            stars: ownedStars,
        });
        const adjustedGeometry = applyExplicitMinStarMargin({
            sharedPolylines,
            worldBorderPolylines,
            stars: ownedStars,
            requestedMarginPx: starMargin,
            worldWidth,
            worldHeight,
            validateRepair: (candidate) =>
                minStarMarginValidator({
                    sharedPolylines: candidate.sharedPolylines,
                    worldBorderPolylines: candidate.worldBorderPolylines,
                }),
        });
        sharedPolylines = adjustedGeometry.sharedPolylines;
        worldBorderPolylines = adjustedGeometry.worldBorderPolylines;
        // Compute the chain walk once and share it across fill reconstruction
        // and the frontier map below (each previously re-walked the same data).
        const sharedWalkResult = executeChainWalk(
            sharedPolylines,
            worldBorderPolylines,
        );
        const mergedTerritories = constructFillsFromFrontierChain(
            sharedPolylines,
            worldBorderPolylines,
            cells,
            sharedWalkResult,
        );
        if (
            adjustedGeometry.minAppliedMarginPx > 0 &&
            (Math.abs(adjustedGeometry.minAppliedMarginPx - adjustedGeometry.requestedMarginPx) >
                0.01 ||
                Math.abs(adjustedGeometry.maxAppliedMarginPx - adjustedGeometry.requestedMarginPx) >
                    0.01)
        ) {
            log.renderer(
                'Geometry_0319',
                `MSR local radii ${adjustedGeometry.requestedMarginPx.toFixed(2)} -> ${adjustedGeometry.minAppliedMarginPx.toFixed(2)}..${adjustedGeometry.maxAppliedMarginPx.toFixed(2)}`,
            );
        }

        const fingerprint = buildTerritoryGeometryFingerprint(stars, config) + ':g0319';

        // Stage 10b: Build vector frontier map (identity annotation — Phase 1)
        // Junction vertices are needed to classify decisive vertices in the TMAP.
        const junctionPts = extractJunctionVertices(cells);
        const frontierMap = buildFrontierMap(sharedPolylines, worldBorderPolylines, junctionPts, fingerprint, sharedWalkResult);

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
            PERIMETER_FIELD_GEOMETRY_SOURCE: 'power_voronoi_0319',
            FRONTIER_RESOLUTION: config.frontierResolution,
            MODIFIED_VORONOI_STAR_MARGIN: config.starMargin,
            TERRITORY_MSR_STAR_BIAS: config.msrStarBias,
            MODIFIED_VORONOI_CORRIDOR_ENABLED: config.corridorEnabled,
            MODIFIED_VORONOI_CORRIDOR_SPACING: config.corridorSpacing,
            TERRITORY_CX_COUNT: config.cxCount,
            TERRITORY_CX_WEIGHT: config.cxWeight,
            TERRITORY_CX_CONTEST_MIDPOINT_VSTARS:
                config.cxContestMidpointVstars,
            TERRITORY_CX_CONTEST_PAIR_COUNT: config.cxContestPairCount,
            TERRITORY_CX_CONTEST_PAIR_WEIGHT: config.cxContestPairWeight,
            TERRITORY_CX_CONTEST_PAIR_SPACING: config.cxContestPairSpacing,
            MODIFIED_VORONOI_DISCONNECT_ENABLED: config.disconnectEnabled,
            MODIFIED_VORONOI_DISCONNECT_DISTANCE: config.disconnectDistance,
            TERRITORY_DX_WEIGHT: config.dxWeight,
            TERRITORY_CLUSTER_SPLIT: config.clusterSplit,
            VORONOI_BORDER_SMOOTH: config.chaikinPasses,
            CHAIKIN_BOUNDARY_PAD: config.boundaryPad,
            CHAIKIN_BOUNDARY_EPS: config.boundaryEps,
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
            minStarMarginDiagnostics: adjustedGeometry.diagnostics,
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
