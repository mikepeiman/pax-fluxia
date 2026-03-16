// ============================================================================
// PVV3Renderer — Frontier-first territory rendering (power Voronoi V3)
// ============================================================================
//
// Forked from PowerVoronoiRenderer (PVV2) to implement frontier-first architecture.
// Territory polygons built from merged Voronoi regions, not border polylines.
//
// Architecture: Edge-graph aware. All boundary edges are shared between adjacent
// territories. Modifications move shared edges, not individual polygon vertices.
//
// Pipeline:
//   0. Build site array (owned stars + corridor virtuals + disconnect virtuals)
//   1. Power diagram via d3-weighted-voronoi (weight = starMargin²)
//   2. Build shared edge graph from cells
//   3. Merge: remove same-owner internal edges
//   4. Arc smoothing on shared edges (future)
//   5. Chaikin smoothing on shared edges
//   6. Trace edges → polygon contours → PIXI render
//
// Performance: Only recomputed when ownership fingerprint changes.
// ============================================================================

import * as PIXI from 'pixi.js';
import { weightedVoronoi } from 'd3-weighted-voronoi';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { findConnectedClustersOptimized } from './territoryUtils';
import { computeCorridorVirtuals, computeDisconnectVirtuals, DISCONNECT_OWNER_ID } from './territoryFeatures';
import type { ColorUtils } from './RenderContext';
import { log } from '$lib/utils/logger';
import type { CanonicalTerritoryData } from '$lib/territory-engine/renderMode';

// ── Re-exported geometry modules ──────────────────────────────────────────
import type {
    PowerSite, TerritoryCell, MergedTerritory, SharedPolyline,
    SharedBorderEdge, FrontierLoop,
} from './geometry/types';
import {
    hexToRGB, rgbToHSL, hslToRGB, adjustColorHSL, blendColors,
} from './geometry/colorUtils';
import { chaikinSmoothPolyline, chaikinSmoothPolygon } from './geometry/chaikin';
import {
    resamplePolygon, resamplePolyline, polygonCentroid, lerpPolygon,
    edgeKey, ptKey,
} from './geometry/polyUtils';

// Re-export types for downstream consumers
export type { PowerSite, TerritoryCell, MergedTerritory, SharedPolyline, SharedBorderEdge, FrontierLoop };
export { adjustColorHSL, blendColors, chaikinSmoothPolyline, chaikinSmoothPolygon };
export { resamplePolygon, resamplePolyline, polygonCentroid, lerpPolygon, edgeKey, ptKey };

// ── Phase 3 extracted geometry modules ────────────────────────────────────
import {
    extractSharedEdges, chainSharedEdgesIntoPolylines, substituteSmoothedEdges,
} from './geometry/borderPipeline';
import {
    classifyEdge, walkBoundaryCW, assembleFrontierLoops,
} from './geometry/frontierLoops';
import {
    parameterizeAndAlign, lerpFrontierCPs,
    drawBorderPolylines, buildLerpedPolylines, renderInterpolatedBorders,
} from './geometry/morphUtils';
import { mergeSameOwnerCells } from './geometry/mergeUtils';

export {
    extractSharedEdges, chainSharedEdgesIntoPolylines, substituteSmoothedEdges,
    classifyEdge, walkBoundaryCW, assembleFrontierLoops,
    parameterizeAndAlign, lerpFrontierCPs,
    drawBorderPolylines, buildLerpedPolylines, renderInterpolatedBorders,
    mergeSameOwnerCells,
};

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedShapeFingerprint = '';
let cachedVisualFingerprint = '';
let fillGraphics: PIXI.Graphics | null = null;
let borderGraphics: PIXI.Graphics | null = null;




// ── Smooth Transition State (Contested Border Mode) ─────────────────────────



let prevSharedPolylines: SharedPolyline[] | null = null;
let targetSharedPolylines: SharedPolyline[] | null = null;
let smoothTransitionStart = 0;
let isSmoothTransitioning = false;
let lastMergedTerritories: MergedTerritory[] | null = null;  // stored for smooth mode snapshot

// ── Frontier Loop State (arc-length morphing) ──────────────────────────────
let prevFrontierLoops: Map<string, FrontierLoop[]> | null = null;
let targetFrontierLoops: Map<string, FrontierLoop[]> | null = null;
let frontierTransitionStart = 0;
let isFrontierTransitioning = false;

// ── Cell Change Tracking (frontier-first rendering) ────────────────────
let lastCells: TerritoryCell[] | null = null;  // cells from previous rebuild
let changedSiteIds: Set<string> | null = null; // stars that changed owner in this conquest


// Diagnostic logging - enable in browser console: window.__PVV3_DIAG = true
const isPVV3Diag = () => typeof globalThis !== 'undefined' && (globalThis as any).__PVV3_DIAG;



// ── Fingerprint ────────────────────────────────────────────────────────────

function buildShapeFingerprint(stars: StarState[]): string {
    let fp = 'shape:';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}`;
    fp += `:${GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}`;
    return fp;
}

function buildVisualFingerprint(): string {
    let fp = 'visual:';
    fp += `${GAME_CONFIG.VORONOI_ALPHA}:${GAME_CONFIG.VORONOI_BORDER_WIDTH}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_ALPHA}:${GAME_CONFIG.VORONOI_SATURATION}`;
    fp += `:${GAME_CONFIG.VORONOI_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_SMOOTH}`;
    return fp;
}

// ── Geometry functions extracted to geometry/ sub-modules ──────────────────
// See: borderPipeline.ts, frontierLoops.ts, morphUtils.ts, mergeUtils.ts
// Functions are imported above and re-exported for backward compatibility.

// ── Main Renderer ──────────────────────────────────────────────────────────

export function renderPVV3(
    stars: StarState[],
    voronoiContainer: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
    canonicalData?: CanonicalTerritoryData,
): void {
    const transitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;
    const now = performance.now();

    // Re-show graphics — voronoiContainer blanket-hides every frame
    if (fillGraphics) fillGraphics.visible = true;
    if (borderGraphics) borderGraphics.visible = true;

    // ── Per-frame animation ────────────────────────────────────────────

    // Throttled transition state log
    const transKey = `${isSmoothTransitioning}|${isFrontierTransitioning}`;
    if ((drawBorderPolylines as any).__lastTransKey !== transKey) {
        (drawBorderPolylines as any).__lastTransKey = transKey;
        log.renderer('PVV3', `smoothTransition=${isSmoothTransitioning} frontierTransition=${isFrontierTransitioning}`);
    }
    // -- PVV3: Per-frame animations DISABLED ------------------------------
    // Smooth border morph and frontier loop morph are incompatible with
    // unified fill+stroke model (they draw on fillGraphics without clearing).
    // Territories snap on rebuild instead of morphing.
    // TODO: restore with proper clear-and-redraw-all-per-frame approach.

    const shapeFp = buildShapeFingerprint(stars);
    const visualFp = buildVisualFingerprint();
    const shapeChanged = shapeFp !== cachedShapeFingerprint;
    const visualChanged = visualFp !== cachedVisualFingerprint;

    if (!shapeChanged && !visualChanged) return;  // nothing changed

    log.renderer('PVV3', `REBUILD | shapeChanged=${shapeChanged} visualChanged=${visualChanged} | t+${(performance.now() - now).toFixed(1)}ms`);

    // ── Shape changed: snapshot for transition animation ─────────────────
    // Transition snapshots disabled � no per-frame morph to feed

    cachedShapeFingerprint = shapeFp;
    cachedVisualFingerprint = visualFp;

    const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
    const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
    const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
    const satMult = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.VORONOI_LIGHTNESS ?? 0.7;
    const starMargin = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45;

    // ── Stage 0: Build site array ──────────────────────────────────────────
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length < 2) return;

    const sites: PowerSite[] = ownedStars.map(s => ({
        x: s.x,
        y: s.y,
        weight: starMargin * starMargin,    // power diagram weight
        ownerId: s.ownerId!,
        starId: s.id,
    }));

    // Corridor virtual sites (shared module)
    if (GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED && connections) {
        const spacing = GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60;
        const corridorVirtuals = computeCorridorVirtuals(ownedStars, connections, spacing, 0.5);
        for (const cv of corridorVirtuals) {
            sites.push({
                x: cv.x,
                y: cv.y,
                weight: starMargin * starMargin * cv.weight,
                ownerId: cv.ownerId,
                starId: `corridor_${cv.sourceStarA}_${cv.sourceStarB}`,
                virtual: 'corridor',
            });
        }
    }

    // Disconnect virtual enemy sites (shared module)
    if (GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED && connections) {
        const maxDist = GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400;
        const disconnectVirtuals = computeDisconnectVirtuals(ownedStars, stars, connections, maxDist, 0.3);
        for (const dv of disconnectVirtuals) {
            sites.push({
                x: dv.x,
                y: dv.y,
                weight: starMargin * starMargin * dv.weight,
                ownerId: DISCONNECT_OWNER_ID,
                starId: `disconnect_${dv.sourceStarA}_${dv.sourceStarB}`,
                virtual: 'disconnect',
            });
        }
        if (disconnectVirtuals.length > 0) {
            log.sys('PowerVoronoi', `Injected ${disconnectVirtuals.length} disconnect virtual sites`);
        }
    }

    // ── Stage 1: Power diagram ─────────────────────────────────────────────
    const pad = 50;
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
        console.error('[PowerVoronoi] d3-weighted-voronoi CRASHED:', e);
        return;
    }

    // Convert to TerritoryCell array
    const cells: TerritoryCell[] = [];
    for (let i = 0; i < polygons.length; i++) {
        const poly = polygons[i];
        if (!poly || poly.length < 3) continue;
        const site = (poly as any).site?.originalObject as PowerSite | undefined;
        if (!site) continue;

        // Disconnect cells: assign to nearest ENEMY owner for fill rendering.
        // In DF, disconnect sites push same-owner territory apart; the gap is filled by
        // whatever enemy is closest. We replicate this by finding the source owner
        // (the same-owner pair being disconnected) and assigning to nearest OTHER owner.
        let effectiveOwner = site.ownerId;
        if (site.ownerId === DISCONNECT_OWNER_ID) {
            // Extract source owner: starId = 'disconnect_{starA}_{starB}'
            const parts = site.starId.split('_');
            const sourceStarA = parts[1];
            const sourceOwner = ownedStars.find(s => s.id === sourceStarA)?.ownerId;

            let nearestDist = Infinity;
            let nearestOwner = '';
            for (const s of ownedStars) {
                // Skip same-owner stars — we want the ENEMY fill
                if (s.ownerId === sourceOwner) continue;
                const dx = s.x - site.x;
                const dy = s.y - site.y;
                const d = dx * dx + dy * dy;
                if (d < nearestDist) { nearestDist = d; nearestOwner = s.ownerId!; }
            }
            if (!nearestOwner) {
                // Fallback: if no enemy exists, use source owner (solo player edge case)
                effectiveOwner = sourceOwner ?? '';
                if (!effectiveOwner) continue;
            } else {
                effectiveOwner = nearestOwner;
            }
            log.renderer('PVV3', `disconnect cell (${site.x.toFixed(0)},${site.y.toFixed(0)}) src=${sourceOwner} → enemy fill ${effectiveOwner}`);
        }

        // Ensure closed polygon
        const pts: [number, number][] = poly.map((p: number[]) => [p[0], p[1]] as [number, number]);
        if (pts.length > 0 && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) {
            pts.push([pts[0][0], pts[0][1]]);
        }

        cells.push({
            points: pts,
            ownerId: effectiveOwner,
            siteId: site.starId,
        });
    }

    log.sys('PowerVoronoi', `${cells.length} cells from ${sites.length} sites (${sites.filter(s => s.virtual).length} virtual)`);

    // ── Stage 1c: Detect changed-owner stars ───────────────────────────────
    changedSiteIds = null;
    if (lastCells && shapeChanged) {
        const prevOwnerMap = new Map(lastCells.map(c => [c.siteId, c.ownerId]));
        const changed = new Set<string>();
        for (const cell of cells) {
            const prevOwner = prevOwnerMap.get(cell.siteId);
            if (prevOwner && prevOwner !== cell.ownerId) {
                changed.add(cell.siteId);
            }
        }
        if (changed.size > 0) {
            changedSiteIds = changed;
            log.sys('PowerVoronoi', `Conquest detected: ${changed.size} stars changed owner: ${[...changed].join(', ')}`);
        }
    }
    lastCells = cells;

    // ── Stage 2: Build cluster map ─────────────────────────────────────────
    const clusterMap = new Map<string, number>();
    if (GAME_CONFIG.TERRITORY_CLUSTER_SPLIT && connections) {
        const starById = new Map(ownedStars.map(s => [s.id, s]));
        const clusters = findConnectedClustersOptimized(ownedStars, connections, starById);
        for (const [starId, info] of clusters) {
            clusterMap.set(starId, info.clusterIdx);
        }
        // Virtual corridor sites inherit source star cluster
        for (const site of sites) {
            if (site.virtual === 'corridor') {
                const sourceId = site.starId.split('_')[1]; // corridor_{sourceId}_{targetId}_{step}
                const srcCluster = clusterMap.get(sourceId);
                if (srcCluster !== undefined) clusterMap.set(site.starId, srcCluster);
            }
        }
    }

    // ── FG2 CANONICAL PATH ──────────────────────────────────────────────────
    // If canonical data was provided by the orchestrator, use it.
    // Otherwise fall through to legacy PVV3 datagen path.
    const fg2Shells = canonicalData?.shells ?? [];
    const fg2ShellLoops = canonicalData?.shellLoops ?? [];
    const fg2AnimShells = canonicalData?.animatedShells ?? [];
    const fg2AnimActive = canonicalData?.transitionActive ?? false;
    const useFG2 = fg2Shells.length > 0;

    // Smooth passes — shared by FG2 and legacy paths
    const boundaryMode = GAME_CONFIG.TERRITORY_BOUNDARY_MODE ?? 'smooth';
    const requestedSmoothPasses = Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)));
    const appliedSmoothPasses = boundaryMode === 'smooth' ? requestedSmoothPasses : 0;

    if (useFG2) {
        // ── FG2 Fill + Border Rendering ──────────────────────────────────────
        if (!fillGraphics) {
            fillGraphics = new PIXI.Graphics();
            voronoiContainer.addChild(fillGraphics);
        }
        fillGraphics.clear();
        fillGraphics.visible = true;

        // Choose shells: animated if transition active, otherwise static
        const shellsForRender = fg2AnimActive && fg2AnimShells.length > 0
            ? fg2AnimShells
            : fg2Shells;

        // Sort largest-first (painter's algorithm)
        const sorted = shellsForRender.slice().sort((a, b) => b.absArea - a.absArea);

        // Build hole loop lookup from ownerShellLoops
        const shellLoopById = new Map(
            fg2ShellLoops.map((loop: any) => [loop.shellLoopId, loop])
        );

        for (const shell of sorted) {
            if (shell.points.length < 3) continue;
            const rawColor = colorUtils.getPlayerColor(shell.ownerId);
            const shellColor = adjustColorHSL(rawColor, satMult, lightMult);

            // Smooth shell polygon so fills have rounded corners matching borders.
            // Without this, fill polygons have sharp Voronoi corners while border
            // strokes visually round them via join style → visible divergence (B-42).
            const smoothedPts = appliedSmoothPasses > 0
                ? chaikinSmoothPolygon(shell.points, appliedSmoothPasses)
                : shell.points;

            // Draw fill polygon
            fillGraphics.beginPath();
            fillGraphics.poly(smoothedPts.flat());
            fillGraphics.fill({ color: shellColor, alpha });

            // Cut holes
            const holeLoops: Array<{ points: [number, number][] }> =
                'holeLoops' in shell && Array.isArray((shell as any).holeLoops)
                    ? (shell as any).holeLoops
                    : 'holeLoopIds' in shell && Array.isArray((shell as any).holeLoopIds)
                        ? (shell as any).holeLoopIds
                            .map((id: string) => shellLoopById.get(id))
                            .filter((l: any) => l && l.points?.length >= 3)
                        : [];
            for (const hole of holeLoops) {
                if (hole.points.length < 3) continue;
                const smoothedHole = appliedSmoothPasses > 0
                    ? chaikinSmoothPolygon(hole.points, appliedSmoothPasses)
                    : hole.points;
                fillGraphics.beginPath();
                fillGraphics.poly(smoothedHole.flat());
                fillGraphics.cut();
            }

            // Draw border stroke on smoothed shell contour
            if (borderWidth > 0 && borderAlpha > 0) {
                fillGraphics.beginPath();
                fillGraphics.moveTo(smoothedPts[0][0], smoothedPts[0][1]);
                for (let i = 1; i < smoothedPts.length; i++) {
                    fillGraphics.lineTo(smoothedPts[i][0], smoothedPts[i][1]);
                }
                if (smoothedPts.length > 2) {
                    fillGraphics.lineTo(smoothedPts[0][0], smoothedPts[0][1]);
                }
                fillGraphics.stroke({
                    width: borderWidth,
                    color: shellColor,
                    alpha: borderAlpha,
                    join: 'round',
                    cap: 'round',
                });
            }
        }

        log.renderer('PVV3', `FG2 canonical path: ${sorted.length} shells rendered (anim=${fg2AnimActive})`);

        // ── FG2 DIAGNOSTIC DUMP ─────────────────────────────────────────────
        // Expose full shell data for inspection via browser console
        const dumpData = {
            path: 'FG2_CANONICAL',
            timestamp: Date.now(),
            shellCount: sorted.length,
            animActive: fg2AnimActive,
            traceRunId: null,

            shells: sorted.map((shell, idx) => {
                const pts = shell.points;
                const closed = pts.length >= 3 &&
                    Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 0.01 &&
                    Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 0.01;
                // Compute perimeter
                let perimeter = 0;
                for (let i = 1; i < pts.length; i++) {
                    perimeter += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
                }
                return {
                    idx,
                    shellId: shell.shellId,
                    ownerId: shell.ownerId,
                    pointCount: pts.length,
                    area: Math.round(shell.absArea),
                    perimeter: Math.round(perimeter),
                    confidence: shell.confidence,
                    closed,
                    first: pts[0] ? [+pts[0][0].toFixed(1), +pts[0][1].toFixed(1)] : null,
                    last: pts[pts.length - 1] ? [+pts[pts.length - 1][0].toFixed(1), +pts[pts.length - 1][1].toFixed(1)] : null,
                    holeCount: 'holeLoopIds' in shell ? (shell as any).holeLoopIds?.length ?? 0
                        : 'holeLoops' in shell ? (shell as any).holeLoops?.length ?? 0 : 0,
                    points: pts,  // full geometry for detailed inspection
                };
            }),
            // Adjacency analysis: find shared edges between shells
            adjacencyReport: (() => {
                const edgeOwners = new Map<string, string[]>();
                for (const shell of sorted) {
                    const pts = shell.points;
                    for (let i = 0; i < pts.length - 1; i++) {
                        const ax = +pts[i][0].toFixed(2), ay = +pts[i][1].toFixed(2);
                        const bx = +pts[i + 1][0].toFixed(2), by = +pts[i + 1][1].toFixed(2);
                        const key = ax < bx || (ax === bx && ay < by)
                            ? `${ax},${ay}-${bx},${by}`
                            : `${bx},${by}-${ax},${ay}`;
                        if (!edgeOwners.has(key)) edgeOwners.set(key, []);
                        edgeOwners.get(key)!.push(shell.ownerId);
                    }
                }
                let sharedEdgeCount = 0;
                let overlapEdgeCount = 0;
                const overlapSamples: string[] = [];
                for (const [key, owners] of edgeOwners) {
                    if (owners.length === 2 && owners[0] !== owners[1]) sharedEdgeCount++;
                    if (owners.length === 2 && owners[0] === owners[1]) {
                        overlapEdgeCount++;
                        if (overlapSamples.length < 5) overlapSamples.push(`${key} (${owners[0]})`);
                    }
                    if (owners.length > 2) {
                        overlapEdgeCount++;
                        if (overlapSamples.length < 5) overlapSamples.push(`${key} (${owners.join(',')})`);
                    }
                }
                return {
                    totalEdges: edgeOwners.size,
                    sharedBetweenOwners: sharedEdgeCount,
                    overlapSameOwner: overlapEdgeCount,
                    overlapSamples,
                };
            })(),
            // Vertex proximity analysis: find near-miss vertices between different shells
            nearMissReport: (() => {
                const issues: Array<{ shellA: string; shellB: string; ownerA: string; ownerB: string; ptA: [number, number]; ptB: [number, number]; dist: number }> = [];
                const NEAR_THRESHOLD = 5; // pixels
                for (let a = 0; a < sorted.length; a++) {
                    for (let b = a + 1; b < sorted.length; b++) {
                        if (sorted[a].ownerId === sorted[b].ownerId) continue;
                        const ptsA = sorted[a].points;
                        const ptsB = sorted[b].points;
                        for (let i = 0; i < ptsA.length; i++) {
                            for (let j = 0; j < ptsB.length; j++) {
                                const dx = ptsA[i][0] - ptsB[j][0];
                                const dy = ptsA[i][1] - ptsB[j][1];
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist > 0.01 && dist < NEAR_THRESHOLD) {
                                    issues.push({
                                        shellA: sorted[a].shellId,
                                        shellB: sorted[b].shellId,
                                        ownerA: sorted[a].ownerId,
                                        ownerB: sorted[b].ownerId,
                                        ptA: [+ptsA[i][0].toFixed(2), +ptsA[i][1].toFixed(2)],
                                        ptB: [+ptsB[j][0].toFixed(2), +ptsB[j][1].toFixed(2)],
                                        dist: +dist.toFixed(2),
                                    });
                                    if (issues.length >= 50) break;
                                }
                            }
                            if (issues.length >= 50) break;
                        }
                        if (issues.length >= 50) break;
                    }
                    if (issues.length >= 50) break;
                }
                return { nearMissCount: issues.length, threshold: NEAR_THRESHOLD, issues };
            })(),
        };
        (window as any).__FG2_DUMP = dumpData;

        // Log summary table to console
        console.group('%c[PVV3 FG2 Diagnostic]', 'color: #7bdff2; font-weight: bold');
        console.log(`Path: FG2 CANONICAL | Shells: ${sorted.length} | Anim: ${fg2AnimActive}`);
        console.table(dumpData.shells.map(s => ({
            '#': s.idx,
            owner: s.ownerId,
            pts: s.pointCount,
            area: s.area,
            perim: s.perimeter,
            conf: s.confidence.toFixed(2),
            closed: s.closed ? 'Y' : 'N',
            holes: s.holeCount,
            first: s.first?.join(',') ?? '-',
            last: s.last?.join(',') ?? '-',
        })));
        console.log(`Adjacency: ${dumpData.adjacencyReport.sharedBetweenOwners} shared edges, ${dumpData.adjacencyReport.overlapSameOwner} overlaps`);
        if (dumpData.nearMissReport.nearMissCount > 0) {
            console.warn(`NEAR-MISS VERTICES: ${dumpData.nearMissReport.nearMissCount} pairs within ${dumpData.nearMissReport.threshold}px`);
            console.table(dumpData.nearMissReport.issues.slice(0, 20).map(i => ({
                shellA: i.shellA.slice(-6),
                shellB: i.shellB.slice(-6),
                ownerA: i.ownerA,
                ownerB: i.ownerB,
                ptA: i.ptA.join(','),
                ptB: i.ptB.join(','),
                dist: i.dist,
            })));
        } else {
            console.log('No near-miss vertices found (all shared edges exact)');
        }
        console.log('Full data: window.__FG2_DUMP');
        console.groupEnd();


        // Snapshot + transition state (minimal — FG2 handles its own animation)
        prevSharedPolylines = null;
        targetSharedPolylines = null;
        lastMergedTerritories = null;
        prevFrontierLoops = null;
        targetFrontierLoops = null;

        log.renderer('PVV3', `rebuild complete (FG2) | total=${(performance.now() - now).toFixed(1)}ms`);
        return;  // Skip legacy pipeline entirely
    }

    // FG2 not used — falling through to legacy merge+substitute pipeline
    // ⚠️ DEPRECATED: This path computes fills and borders from independent data
    // sources, causing visible divergence (B-42). The engine should always provide
    // FG2 artifacts so the canonical path above activates instead.
    console.warn('%c[PVV3] ⚠️ LEGACY PATH (DEPRECATED) — FG2 shells not available', 'color: #ff4444; font-weight: bold',
        `canonicalData=${!!canonicalData}, shellCount=${fg2Shells.length}. This path causes fill/border divergence.`);




    // ── Stage 2b: Extract shared edges (before merge removes internal edges) ──
    const sharedEdges = extractSharedEdges(cells);

    // DIAGNOSTIC: shared edge extraction
    if (isPVV3Diag()) {
        const pairCounts = new Map<string, number>();
        for (const e of sharedEdges) {
            const pk = e.ownerA < e.ownerB ? `${e.ownerA}|${e.ownerB}` : `${e.ownerB}|${e.ownerA}`;
            pairCounts.set(pk, (pairCounts.get(pk) ?? 0) + 1);
        }
        const pairSummary = [...pairCounts.entries()].map(([k, v]) => `${k}:${v}`).join(", ");
        log.renderer(`PVV3`, `Stage 2b: ${sharedEdges.length} shared edges across ${pairCounts.size} owner-pairs | ${pairSummary}`);
    }


    // ── Stage 3: Merge same-owner cells ────────────────────────────────────
    const merged = mergeSameOwnerCells(cells, GAME_CONFIG.TERRITORY_CLUSTER_SPLIT, clusterMap);

    // Assign colors
    for (const territory of merged) {
        const rawColor = colorUtils.getPlayerColor(territory.ownerId);
        territory.color = adjustColorHSL(rawColor, satMult, lightMult);
    }

    log.sys('PowerVoronoi', `Merged to ${merged.length} territories`);
    // DIAGNOSTIC: merged territory polygons
    if (isPVV3Diag()) for (const t of merged) {
        log.renderer(`PVV3`, `  Territory ${t.ownerId}: ${t.points.length} vertices`);
    }

    // -- Stage 3b: Shared-boundary smoothing --------------------------------
    // Smooth shared edges ONCE, then substitute into territory polygons.
    // Adjacent territories share identical coordinates at their shared border.
    for (const edge of sharedEdges) {
        edge.colorA = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerA), satMult, lightMult);
        edge.colorB = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerB), satMult, lightMult);
    }
    const ownerPairColorMap = new Map<string, number>();
    for (const edge of sharedEdges) {
        const key = edge.ownerA < edge.ownerB ? `${edge.ownerA}|${edge.ownerB}` : `${edge.ownerB}|${edge.ownerA}`;
        if (!ownerPairColorMap.has(key)) {
            ownerPairColorMap.set(key, blendColors(edge.colorA, edge.colorB, 0.5));
        }
    }
    const ownerPairColorLookup = (a: string, b: string) => {
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        return ownerPairColorMap.get(key) ?? 0x888888;
    };
    // boundaryMode, requestedSmoothPasses, appliedSmoothPasses already computed above (shared with FG2)
    const rawBorderPolylines = sharedEdges.length > 0
        ? chainSharedEdgesIntoPolylines(sharedEdges, ownerPairColorLookup, 0)
        : [];
    if (appliedSmoothPasses > 0 && rawBorderPolylines.length > 0) {
        const smoothedPolylines = chainSharedEdgesIntoPolylines(
            sharedEdges,
            ownerPairColorLookup,
            appliedSmoothPasses,
        );
        substituteSmoothedEdges(merged, rawBorderPolylines, smoothedPolylines);
        if (isPVV3Diag()) for (let pi = 0; pi < rawBorderPolylines.length; pi++) {
            const rp = rawBorderPolylines[pi];
            const sp = smoothedPolylines[pi];
            log.renderer(`PVV3`, `  Polyline[${pi}] ${rp.ownerPairKey}: raw=${rp.points.length}pts smooth=${sp.points.length}pts`);
            log.renderer(`PVV3`, `    raw start=(${rp.points[0][0].toFixed(0)},${rp.points[0][1].toFixed(0)}) end=(${rp.points[rp.points.length - 1][0].toFixed(0)},${rp.points[rp.points.length - 1][1].toFixed(0)})`);
        }
        log.renderer(`PVV3`, `Stage 3b: substituted ${rawBorderPolylines.length} shared polylines, smooth=${appliedSmoothPasses}`);
        if (isPVV3Diag()) for (const t of merged) {
            log.renderer(`PVV3`, `  After sub: ${t.ownerId} ${t.points.length} vertices`);
        }
    }

    // ── Stage 4: Render Fills + unified shared borders ─────────────────────
    if (!fillGraphics) {
        fillGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(fillGraphics);
    }
    fillGraphics.clear();
    fillGraphics.visible = true;

    if (!borderGraphics) {
        borderGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(borderGraphics);
    }
    borderGraphics.clear();
    borderGraphics.visible = borderWidth > 0 && borderAlpha > 0 && rawBorderPolylines.length > 0;

    for (const territory of merged) {
        // Apply Chaikin smoothing to fill polygons so they match the smoothed
        // borders drawn by drawBorderPolylines. Without this, fills use straight
        // edges while borders use Chaikin+Bézier curves → visible gaps (B-42).
        const fillPts = appliedSmoothPasses > 0
            ? chaikinSmoothPolygon(territory.points, appliedSmoothPasses)
            : territory.points;
        fillGraphics.beginPath();
        fillGraphics.poly(fillPts.flat());
        fillGraphics.fill({ color: territory.color, alpha });
    }
    if (borderGraphics.visible) {
        drawBorderPolylines(
            borderGraphics,
            rawBorderPolylines,
            appliedSmoothPasses,
            borderWidth,
            borderAlpha,
        );
    }

    // ── Store targets + start transition ────────────────────────────────
    lastMergedTerritories = merged;

    targetSharedPolylines = chainSharedEdgesIntoPolylines(
        sharedEdges,
        ownerPairColorLookup,
        appliedSmoothPasses,
    );

    // Build frontier loops from the merged territory polygons used for fills.
    targetFrontierLoops = new Map<string, FrontierLoop[]>();
    for (const territory of merged) {
        const loops = targetFrontierLoops.get(territory.ownerId) ?? [];
        loops.push({ points: territory.points, ownerId: territory.ownerId });
        targetFrontierLoops.set(territory.ownerId, loops);
    }

    // Start transition based on mode
    if (shapeChanged && transitionMs > 0) {
        // Smooth mode
        if (prevSharedPolylines && prevSharedPolylines.length > 0) {
            smoothTransitionStart = now;
            isSmoothTransitioning = true;
            log.renderer('PVV3', `TRANSITION STARTED | prev=${prevSharedPolylines.length} target=${targetSharedPolylines?.length ?? 0} | transitionMs=${transitionMs}`);
        }

        // Frontier loop morph (arc-length mode)
        if (prevFrontierLoops && prevFrontierLoops.size > 0) {
            frontierTransitionStart = now;
            isFrontierTransitioning = true;
            log.renderer('PVV3', `FRONTIER LOOP MORPH STARTED | prev=${prevFrontierLoops.size} owners, target=${targetFrontierLoops?.size ?? 0} owners`);
        }
    }
    log.renderer('PVV3', `◀ rebuild complete | total=${(performance.now() - now).toFixed(1)}ms`);


    // Snapshot targets for next rebuild's transition source
    prevSharedPolylines = targetSharedPolylines;
    prevFrontierLoops = targetFrontierLoops;
}

// ── Cache Reset ────────────────────────────────────────────────────────────

export function resetPVV3Cache(): void {
    cachedShapeFingerprint = '';
    cachedVisualFingerprint = '';
    // Smooth mode state
    isSmoothTransitioning = false;
    prevSharedPolylines = null;
    targetSharedPolylines = null;
    smoothTransitionStart = 0;
    lastMergedTerritories = null;
    // Frontier loop state
    isFrontierTransitioning = false;
    prevFrontierLoops = null;
    targetFrontierLoops = null;
    frontierTransitionStart = 0;
    // Cell change tracking state
    lastCells = null;
    changedSiteIds = null;
    log.renderer('PVV3', 'cache reset');
    if (fillGraphics) {
        if (fillGraphics.parent) fillGraphics.parent.removeChild(fillGraphics);
        fillGraphics.destroy();
        fillGraphics = null;
    }
    if (borderGraphics) {
        if (borderGraphics.parent) borderGraphics.parent.removeChild(borderGraphics);
        borderGraphics.destroy();
        borderGraphics = null;
    }
}