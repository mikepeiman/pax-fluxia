// ============================================================================
// PowerVoronoiRenderer — F-138v2: Territory fill via weighted Voronoi (power diagram)
// ============================================================================
//
// FRESH implementation using d3-weighted-voronoi for gap-free territory rendering.
// Star margin is baked into the Voronoi as site weights — no post-processing needed.
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
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';
import type { CanonicalTerritoryData } from '$lib/territory-engine/renderMode';
import { log } from '$lib/utils/logger';
import {
    executePVV2MetricStage,
    buildPVV2Fingerprint,
    chaikinSmoothPolyline,
    chaikinSmoothPolygon,
    chainSharedEdgesIntoPolylines,
    type PVV2GeometryData,
    type MergedTerritory,
    type SharedBorderEdge,
    type SharedPolyline,
    type TerritoryCell,
} from '$lib/territory/compiler/pvv2MetricStage';
import { resamplePolygon, resamplePolyline, lerpPolygon, polygonCentroid } from '$lib/territory/geometry/morphUtils';
import { GraphicsPathMorpher, RopeBorderRenderer } from '$lib/renderers/geometry/borderTransition';

// ── Types ──────────────────────────────────────────────────────────────────

// Types are now imported from pvv2MetricStage — TerritoryCell, MergedTerritory,
// SharedBorderEdge, SharedPolyline, PVV2GeometryData

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedShapeFingerprint = '';
let cachedVisualFingerprint = '';
let fillGraphics: PIXI.Graphics | null = null;
let borderGraphics: PIXI.Graphics | null = null;

// ── Border Transition State (Segment Mode) ─────────────────────────────────

/** Previous shared border edge positions for segment mode animation. */
let prevBorderEdges: SharedBorderEdge[] | null = null;
let targetBorderEdges: SharedBorderEdge[] | null = null;
let borderTransitionStart = 0;
let isBorderTransitioning = false;

// ── Smooth Transition State (Contested Border Mode) ─────────────────────────

// SharedPolyline interface imported from pvv2MetricStage


let prevSharedPolylines: SharedPolyline[] | null = null;
let targetSharedPolylines: SharedPolyline[] | null = null;
let targetRawSharedPolylines: SharedPolyline[] | null = null;
let smoothTransitionStart = 0;
let isSmoothTransitioning = false;
let lastMergedTerritories: MergedTerritory[] | null = null;  // stored for smooth mode snapshot

// ── Fill Transition State (alpha crossfade) ────────────────────────────────
let prevMergedTerritories: MergedTerritory[] | null = null;
let prevEnclaveMap: Map<number, [number, number][][]> | null = null;
let fillTransitionStart = 0;
let isFillTransitioning = false;

// ── Active Border Morpher (from borderTransition.ts) ─────────────────
let activeMorpher: GraphicsPathMorpher | null = null;
let activeRopeRenderer: RopeBorderRenderer | null = null;

// ── Cell Change Tracking (frontier-first rendering) ────────────────────
let lastCells: TerritoryCell[] | null = null;  // cells from previous rebuild
let changedSiteIds: Set<string> | null = null; // stars that changed owner in this conquest

// ── Enclave Cache ──────────────────────────────────────────────────────────
let lastEnclaveMap: Map<number, [number, number][][]> | null = null;
let lastWorldBorderPolylines: import('$lib/territory/compiler/pvv2MetricStage').SharedPolyline[] = [];

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
    // Chaikin passes drives chainSharedEdgesIntoPolylines in the geometry stage
    // — must be a shape-fingerprint dependency, not visual-only
    fp += `:chaikin=${GAME_CONFIG.VORONOI_BORDER_SMOOTH}`;
    return fp;
}

function buildVisualFingerprint(): string {
    let fp = 'visual:';
    fp += `${GAME_CONFIG.VORONOI_ALPHA}:${GAME_CONFIG.VORONOI_BORDER_WIDTH}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_ALPHA}:${GAME_CONFIG.VORONOI_SATURATION}`;
    fp += `:${GAME_CONFIG.VORONOI_LIGHTNESS}`;
    // VORONOI_BORDER_SMOOTH removed — it's a geometry setting, not a visual one
    return fp;
}

// ── Color Helpers ──────────────────────────────────────────────────────────

function hexToRGB(hex: number): [number, number, number] {
    return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function rgbToHSL(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
}

function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
        Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
        Math.round(hue2rgb(p, q, h) * 255),
        Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
}

function adjustColorHSL(hex: number, satMult: number, lightMult: number): number {
    const [r, g, b] = hexToRGB(hex);
    const [h, s, l] = rgbToHSL(r, g, b);
    const [nr, ng, nb] = hslToRGB(
        h,
        Math.min(1, Math.max(0, s * satMult)),
        Math.min(1, Math.max(0, l * lightMult)),
    );
    return (nr << 16) | (ng << 8) | nb;
}

// ── Edge Key Helpers ───────────────────────────────────────────────────────

/** Canonical edge key — direction-independent, snapped to 2dp. */
function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
    const ax = +x1.toFixed(2), ay = +y1.toFixed(2);
    const bx = +x2.toFixed(2), by = +y2.toFixed(2);
    if (ax < bx || (ax === bx && ay < by)) return `${ax},${ay}-${bx},${by}`;
    return `${bx},${by}-${ax},${ay}`;
}

function ptKey(x: number, y: number): string {
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
}




/** Blend two hex colors by ratio t (0=colorA, 1=colorB). */
function blendColors(colorA: number, colorB: number, t: number): number {
    const [rA, gA, bA] = hexToRGB(colorA);
    const [rB, gB, bB] = hexToRGB(colorB);
    return (
        (Math.round(rA + (rB - rA) * t) << 16) |
        (Math.round(gA + (gB - gA) * t) << 8) |
        Math.round(bA + (bB - bA) * t)
    );
}

// ── Polygon Morph Helpers ─────────────────────────────────────────────────
// resamplePolygon, resamplePolyline, lerpPolygon, polygonCentroid imported from
// territory/geometry/morphUtils — animation-layer geometry helpers.

// chaikinSmoothPolyline, chaikinSmoothPolygon imported from pvv2MetricStage —
// these are geometry operations (change world-coordinate positions of frontier lines).

// ── Removed inline definitions:
// ── Geometry helpers (imported from pvv2MetricStage + morphUtils) ──────────
// chaikinSmoothPolyline, chaikinSmoothPolygon ← pvv2MetricStage (geometry layer)
// resamplePolyline, resamplePolygon, lerpPolygon, polygonCentroid ← morphUtils (animation layer)
// chainSharedEdgesIntoPolylines ← pvv2MetricStage (geometry layer)




// ── Bézier Midpoint Densification ──────────────────────────────────────────

/**
 * Densify a point array by evaluating quadratic Bézier curves through midpoints.
 * This is the same interpolation that was previously done at draw-time for borders.
 * Now applied once to BOTH fills and borders at the data level, ensuring
 * identical geometry for both render paths.
 *
 * For N input points, generates a dense array with ~N * SUBDIVISIONS points.
 * Both poly() fills and lineTo borders can then draw straight lines to this
 * shared dense geometry.
 */
function densifyBezierMidpoints(pts: [number, number][], subdivisions = 4): [number, number][] {
    if (pts.length < 3) return pts;

    const dense: [number, number][] = [];
    // Start point
    dense.push(pts[0]);

    // First segment: straight line to midpoint(pts[0], pts[1])
    const mid0x = (pts[0][0] + pts[1][0]) / 2;
    const mid0y = (pts[0][1] + pts[1][1]) / 2;
    dense.push([mid0x, mid0y]);

    // Interior segments: quadratic Bézier from current midpoint through pts[i] to next midpoint
    for (let i = 1; i < pts.length - 1; i++) {
        const cx = pts[i][0], cy = pts[i][1]; // control point
        const nextMidX = (pts[i][0] + pts[i + 1][0]) / 2;
        const nextMidY = (pts[i][1] + pts[i + 1][1]) / 2;
        const prevMidX = (pts[i - 1][0] + pts[i][0]) / 2;
        const prevMidY = (pts[i - 1][1] + pts[i][1]) / 2;

        // Sample quadratic Bézier: B(t) = (1-t)²·P0 + 2(1-t)t·C + t²·P1
        // P0 = prevMid, C = pts[i], P1 = nextMid
        for (let s = 1; s <= subdivisions; s++) {
            const t = s / subdivisions;
            const u = 1 - t;
            const x = u * u * prevMidX + 2 * u * t * cx + t * t * nextMidX;
            const y = u * u * prevMidY + 2 * u * t * cy + t * t * nextMidY;
            dense.push([x, y]);
        }
    }

    // Last segment: straight line to last point
    dense.push(pts[pts.length - 1]);
    return dense;
}

// ── Canonical Border Drawing ───────────────────────────────────────────────

/**
 * Draw border polylines as straight lines. Points are expected to be
 * pre-densified via densifyBezierMidpoints — no curves computed here.
 * This ensures borders and fills use identical geometry.
 */
function drawBorderPolylines(
    graphics: PIXI.Graphics,
    polylines: { points: [number, number][]; color: number }[],
    smoothPasses: number,
    width: number,
    alpha: number,
): void {
    let drawn = 0;
    for (const polyline of polylines) {
        const pts = smoothPasses > 0
            ? chaikinSmoothPolyline(polyline.points, smoothPasses)
            : polyline.points;
        if (pts.length < 2) continue;

        // Straight lines only — curves are baked into the point data
        graphics.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
            graphics.lineTo(pts[i][0], pts[i][1]);
        }
        graphics.stroke({ width, color: polyline.color, alpha, cap: 'round', join: 'round' });
        drawn++;
    }
    log.renderer('drawBorderPolylines', `drew ${drawn}/${polylines.length} polylines (smooth=${smoothPasses}, w=${width.toFixed(1)}, a=${alpha.toFixed(2)}, straight=true)`);
}

/** Build lerped polylines from prev → target for transition animation.
 *  Matches polylines by ownerPairKey + nearest centroid, resamples + lerps.
 *  Returns an array suitable for substituteSmoothedEdges. */
function buildLerpedPolylines(
    prev: SharedPolyline[], target: SharedPolyline[],
    t: number,
): SharedPolyline[] {
    const RESAMPLE_N = 32;
    const result: SharedPolyline[] = [];

    // Group by ownerPairKey for matching
    const prevByKey = new Map<string, SharedPolyline[]>();
    for (const p of prev) {
        if (!prevByKey.has(p.ownerPairKey)) prevByKey.set(p.ownerPairKey, []);
        prevByKey.get(p.ownerPairKey)!.push(p);
    }
    const targetByKey = new Map<string, SharedPolyline[]>();
    for (const p of target) {
        if (!targetByKey.has(p.ownerPairKey)) targetByKey.set(p.ownerPairKey, []);
        targetByKey.get(p.ownerPairKey)!.push(p);
    }

    const allKeys = new Set([...prevByKey.keys(), ...targetByKey.keys()]);

    for (const key of allKeys) {
        const pLines = prevByKey.get(key) ?? [];
        const tLines = targetByKey.get(key) ?? [];
        const usedTargets = new Set<number>();

        for (const pLine of pLines) {
            const pC = polygonCentroid(pLine.points);
            let bestDist = Infinity;
            let bestIdx = -1;
            for (let ti = 0; ti < tLines.length; ti++) {
                if (usedTargets.has(ti)) continue;
                const tC = polygonCentroid(tLines[ti].points);
                const d = Math.hypot(pC[0] - tC[0], pC[1] - tC[1]);
                if (d < bestDist) { bestDist = d; bestIdx = ti; }
            }

            if (bestIdx >= 0) {
                usedTargets.add(bestIdx);
                const tLine = tLines[bestIdx];
                const pSampled = resamplePolyline(pLine.points, RESAMPLE_N);
                let tSampled = resamplePolyline(tLine.points, RESAMPLE_N);

                // Fix flipping: ensure polylines are oriented the same direction.
                // If start-of-prev is closer to end-of-target than start-of-target,
                // reverse the target to match orientation.
                const p0 = pSampled[0];
                const t0 = tSampled[0];
                const tN = tSampled[tSampled.length - 1];
                const distSameDir = Math.hypot(p0[0] - t0[0], p0[1] - t0[1]);
                const distReversed = Math.hypot(p0[0] - tN[0], p0[1] - tN[1]);
                if (distReversed < distSameDir) {
                    tSampled = tSampled.slice().reverse() as [number, number][];
                }

                result.push({ ...tLine, points: lerpPolygon(pSampled, tSampled, t) });
            } else {
                // Prev-only: use prev points (will fade out via alpha in caller)
                result.push({ ...pLine });
            }
        }

        // Target-only polylines: use target points (fade in via alpha in caller)
        for (let ti = 0; ti < tLines.length; ti++) {
            if (usedTargets.has(ti)) continue;
            result.push({ ...tLines[ti] });
        }
    }
    return result;
}

/** Draw shared border edges at interpolated positions between prev and target.
 *  Matches edges by midpoint proximity for smooth "borders sliding" animation. */
function renderInterpolatedBorders(
    container: PIXI.Container,
    prev: SharedBorderEdge[], target: SharedBorderEdge[],
    t: number,  // 0=prev, 1=target (eased)
    borderWidth: number, borderAlpha: number,
): void {
    if (!borderGraphics) {
        borderGraphics = new PIXI.Graphics();
        container.addChild(borderGraphics);
    }
    borderGraphics.clear();
    borderGraphics.visible = true;

    const blendWidth = borderWidth * 2.5;

    // Build midpoint index for target edges
    const targetUsed = new Set<number>();

    // For each prev edge, find nearest target edge by midpoint
    for (const pEdge of prev) {
        const pMx = (pEdge.x1 + pEdge.x2) / 2;
        const pMy = (pEdge.y1 + pEdge.y2) / 2;

        let bestDist = Infinity;
        let bestIdx = -1;
        for (let ti = 0; ti < target.length; ti++) {
            if (targetUsed.has(ti)) continue;
            const tMx = (target[ti].x1 + target[ti].x2) / 2;
            const tMy = (target[ti].y1 + target[ti].y2) / 2;
            const d = Math.hypot(pMx - tMx, pMy - tMy);
            if (d < bestDist) { bestDist = d; bestIdx = ti; }
        }

        if (bestIdx >= 0 && bestDist < 200) {
            // Matched pair — lerp endpoints
            targetUsed.add(bestIdx);
            const tEdge = target[bestIdx];
            const x1 = pEdge.x1 + (tEdge.x1 - pEdge.x1) * t;
            const y1 = pEdge.y1 + (tEdge.y1 - pEdge.y1) * t;
            const x2 = pEdge.x2 + (tEdge.x2 - pEdge.x2) * t;
            const y2 = pEdge.y2 + (tEdge.y2 - pEdge.y2) * t;
            // Use target edge color (since fills show target state)
            const color = tEdge.colorA || pEdge.colorA || 0x888888;
            borderGraphics.moveTo(x1, y1);
            borderGraphics.lineTo(x2, y2);
            borderGraphics.stroke({ width: blendWidth, color, alpha: borderAlpha });
        } else {
            // Prev edge fading out (no match) — draw at prev position with decreasing alpha
            borderGraphics.moveTo(pEdge.x1, pEdge.y1);
            borderGraphics.lineTo(pEdge.x2, pEdge.y2);
            borderGraphics.stroke({ width: blendWidth, color: pEdge.colorA || 0x888888, alpha: borderAlpha * (1 - t) });
        }
    }

    // Unmatched target edges — fade in
    for (let ti = 0; ti < target.length; ti++) {
        if (targetUsed.has(ti)) continue;
        const tEdge = target[ti];
        borderGraphics.moveTo(tEdge.x1, tEdge.y1);
        borderGraphics.lineTo(tEdge.x2, tEdge.y2);
        borderGraphics.stroke({ width: blendWidth, color: tEdge.colorA || 0x888888, alpha: borderAlpha * t });
    }
}



// mergeSameOwnerCells and detectEnclaves moved to pvv2MetricStage.ts (geometry stage)


/** Draw a territory fill ONLY (no stroke).
 *  Borders are drawn separately via drawBorderPolylines on borderGraphics.
 *  Fills use RAW polygon points — NO independent smoothing.
 *  Smoothing is applied only to border polylines in the compiler stage.
 *  Independent fill smoothing creates divergence (B-42). */
function drawTerritoryFillOnly(
    graphics: PIXI.Graphics,
    territory: MergedTerritory,
    holes: [number, number][][] | undefined,
    alpha: number,
): void {
    if (territory.points.length < 3) {
        log.renderer('PVV2:fill', `SKIP territory ownerId=${territory.ownerId} — only ${territory.points.length} pts`);
        return;
    }
    // R-131: Skip neutral territory fill when transparency is enabled
    const isNeutral = !territory.ownerId || territory.ownerId === 'neutral' || territory.ownerId === '';
    if (isNeutral && GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT) return;
    // Use raw polygon points — NO chaikin here. Stage owns smoothing.
    graphics.poly(territory.points.flat());
    graphics.fill({ color: territory.color, alpha });

    log.renderer('PVV2:fill', `  filled ownerId=${territory.ownerId} color=0x${territory.color.toString(16)} alpha=${alpha.toFixed(2)} pts=${territory.points.length} holes=${holes?.length ?? 0}`);
    if (holes) {
        for (const hole of holes) {
            if (hole.length < 3) continue;
            // Holes also use raw points — no independent smoothing
            graphics.poly(hole.flat());
            graphics.cut();
        }
    }
}


// ── Main Renderer ──────────────────────────────────────────────────────────

export function renderPowerVoronoi(
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

    // Re-show fillGraphics — voronoiContainer blanket-hides every frame
    if (fillGraphics) fillGraphics.visible = true;
    // borderGraphics stays hidden — borders are now strokes on the fill path

    // ── CANONICAL DATA PATH ─────────────────────────────────────────────
    // When canonical data is provided with shells, draw fills and borders
    // from the SAME shell points. This is the V3 architecture: one set of
    // coordinates, both rendering paths, impossible to diverge.
    const canonicalShells = canonicalData?.shells ?? [];
    const canonicalAnimShells = canonicalData?.animatedShells ?? [];
    const canonicalAnimActive = canonicalData?.transitionActive ?? false;
    const canonicalShellLoops = canonicalData?.shellLoops ?? [];

    // One-shot diagnostic: log path decision on first call and on shell count change
    const diagKey = `canonical=${canonicalShells.length}|loops=${canonicalShellLoops.length}|anim=${canonicalAnimShells.length}`;
    if ((renderPowerVoronoi as any).__lastDiagKey !== diagKey) {
        (renderPowerVoronoi as any).__lastDiagKey = diagKey;
        log.renderer('PVV2', canonicalShells.length > 0
            ? `📐 CANONICAL path: ${canonicalShells.length} shells, ${canonicalShellLoops.length} loops, ${canonicalAnimShells.length} animShells, animActive=${canonicalAnimActive}`
            : `⚠️ LEGACY path: canonicalData=${!!canonicalData}, shells=${canonicalShells.length} (no canonical shells → falling through to d3-weighted-voronoi)`);
    }

    if (canonicalShells.length > 0) {
        if (!fillGraphics) {
            fillGraphics = new PIXI.Graphics();
            voronoiContainer.addChild(fillGraphics);
        }
        fillGraphics.clear();
        fillGraphics.visible = true;

        // Canonical path owns ALL rendering for this frame.
        // Clear legacy borderGraphics so stale pvv2 polyline borders (different geometry)
        // do not persist and appear misaligned with canonical shell fills.
        if (borderGraphics) {
            borderGraphics.clear();
            borderGraphics.visible = false;
            log.renderer('PVV2', '🔴 CANONICAL PATH cleared borderGraphics!');
        }

        const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
        const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
        const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
        const satMult = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
        const lightMult = GAME_CONFIG.VORONOI_LIGHTNESS ?? 0.7;
        const smoothPasses = 0; // NO smoothing in renderer — geometry arrives pre-computed from compiler stage

        // Choose shells: animated if transition active, otherwise static
        const shellsForRender = canonicalAnimActive && canonicalAnimShells.length > 0
            ? canonicalAnimShells
            : canonicalShells;

        // Sort largest-first (painter's algorithm)
        const sorted = shellsForRender.slice().sort((a, b) => b.absArea - a.absArea);

        // Build hole loop lookup
        const shellLoopById = new Map(
            canonicalShellLoops.map((loop: any) => [loop.shellLoopId, loop])
        );

        for (const shell of sorted) {
            if (shell.points.length < 3) continue;

            // R-131: Skip neutral territory fill when transparency is enabled
            const isNeutral = !shell.ownerId || shell.ownerId === 'neutral' || shell.ownerId === '';
            if (isNeutral && GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT) continue;

            const rawColor = colorUtils.getPlayerColor(shell.ownerId);
            const shellColor = adjustColorHSL(rawColor, satMult, lightMult);

            // Fills use geometry as-is — no smoothing in renderer
            const smoothedPts = shell.points;

            // Draw fill FROM shell points
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
                // Holes use geometry as-is — no smoothing in renderer
                const smoothedHole = hole.points;
                fillGraphics.beginPath();
                fillGraphics.poly(smoothedHole.flat());
                fillGraphics.cut();
            }

            // Draw border ON the same shell points
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

        log.renderer('PVV2', `CANONICAL path: ${sorted.length} shells (anim=${canonicalAnimActive})`);
        return; // Skip legacy pipeline entirely
    }

    // ── LEGACY PATH (no canonical data) ─────────────────────────────────
    // Per-frame animation (both modes)
    const boundaryMode = GAME_CONFIG.TERRITORY_BOUNDARY_MODE ?? 'smooth';

    // Throttled mode log — only on state change
    const modeKey = `${boundaryMode}|${isSmoothTransitioning}|${isBorderTransitioning}`;
    if ((drawBorderPolylines as any).__lastModeKey !== modeKey) {
        (drawBorderPolylines as any).__lastModeKey = modeKey;
        log.renderer('PVV2', `mode=${boundaryMode} smoothTransition=${isSmoothTransitioning} segmentTransition=${isBorderTransitioning}`);
    }

    // ── Per-frame geometric MORPH ──
    const isAnimatingSmooth = boundaryMode === 'smooth' && isSmoothTransitioning && prevSharedPolylines && targetSharedPolylines && transitionMs > 0;

    if (isAnimatingSmooth && lastMergedTerritories && fillGraphics) {
        const elapsed = now - smoothTransitionStart;
        const rawT = Math.min(1, elapsed / transitionMs);
        // Easing is now handled inside the morpher classes — pass raw t
        const easedT = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
        const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
        const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
        const smoothPasses = Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)));

        fillGraphics.clear();

        // 1. Alpha crossfade fills: prev fades out, target fades in
        if (prevMergedTerritories) {
            for (let i = 0; i < prevMergedTerritories.length; i++) {
                drawTerritoryFillOnly(fillGraphics, prevMergedTerritories[i], prevEnclaveMap?.get(i), alpha * (1 - easedT));
            }
        }
        for (let i = 0; i < lastMergedTerritories.length; i++) {
            drawTerritoryFillOnly(fillGraphics, lastMergedTerritories[i], lastEnclaveMap?.get(i), alpha * easedT);
        }

        // 2. Draw borders via the active morpher
        if (activeMorpher) {
            activeMorpher.drawFrame(fillGraphics, rawT, borderWidth, borderAlpha);
        } else if (activeRopeRenderer) {
            // CRITICAL: Re-show ropes after voronoiContainer's blanket-hide
            activeRopeRenderer.setVisible(true);
            activeRopeRenderer.update(rawT, borderAlpha);
        } else {
            // Legacy fallback DISABLED (F5): buildLerpedPolylines should not be in the active pipeline.
            // If this log fires, it means no morpher was created — investigate why.
            log.error('PVV2', `⚠️ LEGACY FALLBACK WOULD FIRE — no activeMorpher or activeRopeRenderer. borderTransMode=${GAME_CONFIG.TERRITORY_BORDER_TRANSITION ?? 'pixi_graphics_morph'}`);
            // ORIGINAL CODE (commented out for non-destructive test):
            // const frameFrontiers = buildLerpedPolylines(prevSharedPolylines!, targetSharedPolylines!, easedT);
            // drawBorderPolylines(fillGraphics, frameFrontiers, 0, borderWidth, borderAlpha);
        }

        if (rawT >= 1) {
            isSmoothTransitioning = false;
            isFillTransitioning = false;
            prevSharedPolylines = null;
            prevMergedTerritories = null;
            prevEnclaveMap = null;
            activeMorpher = null;
            if (activeRopeRenderer) {
                activeRopeRenderer.removeAll();
                activeRopeRenderer = null;
            }
            // ── F2 FIX (refined) ────────────────────────────────────────────
            // Do NOT clear + redraw fills — that caused visible tick stutter.
            // The morpher's last frame at t=1 already shows correct fills.
            // But we DO need to draw steady-state borders so they persist
            // after the morpher/rope is cleaned up above.
            if (targetSharedPolylines && targetSharedPolylines.length > 0 && borderWidth > 0 && borderAlpha > 0) {
                drawBorderPolylines(fillGraphics, targetSharedPolylines, 0, borderWidth, borderAlpha);
            }
            if (lastWorldBorderPolylines.length > 0 && borderWidth > 0 && borderAlpha > 0) {
                drawBorderPolylines(fillGraphics, lastWorldBorderPolylines, 0, borderWidth, borderAlpha);
            }
            log.renderer('PVV2', 'border transition complete — borders drawn, fills retained from morpher');
        }

        const shapeFpCheck = buildShapeFingerprint(stars);
        const visualFpCheck = buildVisualFingerprint();
        if (shapeFpCheck === cachedShapeFingerprint && visualFpCheck === cachedVisualFingerprint) {
            return;
        }
    } else if (boundaryMode === 'segment' && isBorderTransitioning && transitionMs > 0 && prevBorderEdges && targetBorderEdges) {
        const elapsed = now - borderTransitionStart;
        if (elapsed >= transitionMs) {
            isBorderTransitioning = false;
            prevBorderEdges = null;
        }
        const shapeFpCheck = buildShapeFingerprint(stars);
        const visualFpCheck = buildVisualFingerprint();
        if (shapeFpCheck === cachedShapeFingerprint && visualFpCheck === cachedVisualFingerprint) return;
    }

    const shapeFp = buildShapeFingerprint(stars);
    const visualFp = buildVisualFingerprint();
    const shapeChanged = shapeFp !== cachedShapeFingerprint;
    const visualChanged = visualFp !== cachedVisualFingerprint;

    if (!shapeChanged && !visualChanged) return;  // nothing changed

    log.renderer('PVV2', `REBUILD | shapeChanged=${shapeChanged} visualChanged=${visualChanged} | t+${(performance.now() - now).toFixed(1)}ms`);

    // ── Shape changed: snapshot for transition animation ─────────────────
    if (shapeChanged && transitionMs > 0) {
        // Segment mode: snapshot border edges
        if (targetBorderEdges && targetBorderEdges.length > 0) {
            prevBorderEdges = targetBorderEdges;
        }
        // Smooth mode: snapshot current shared polylines
        if (targetSharedPolylines && targetSharedPolylines.length > 0) {
            prevSharedPolylines = targetSharedPolylines;
        }
        // Fill crossfade: snapshot current merged territories
        if (lastMergedTerritories && lastMergedTerritories.length > 0) {
            prevMergedTerritories = lastMergedTerritories;
            prevEnclaveMap = lastEnclaveMap;
        }
    }

    cachedShapeFingerprint = shapeFp;
    cachedVisualFingerprint = visualFp;

    const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
    const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
    const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
    const satMult = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.VORONOI_LIGHTNESS ?? 0.7;
    const starMargin = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45;

    // ── Geometry Stage: delegate to pvv2MetricStage ───────────────────────
    // All geometry computation (site-building, d3-weighted-voronoi, cell merge,
    // edge extraction, Chaikin smoothing) now lives in the compiler stage.
    const stageConfig = {
        starMargin: GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45,
        corridorEnabled: Boolean(GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED) && Boolean(connections),
        corridorSpacing: GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60,
        disconnectEnabled: Boolean(GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED) && Boolean(connections),
        disconnectDistance: GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400,
        clusterSplit: Boolean(GAME_CONFIG.TERRITORY_CLUSTER_SPLIT),
        chaikinPasses: Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3))),
        worldWidth,
        worldHeight,
    };

    const stageResult = executePVV2MetricStage(stars, connections ?? [], stageConfig);
    if ('kind' in stageResult) {
        // CompileError — recoverable means use last cached frame, non-recoverable clears
        log.error('PVV2', `geometry stage error at ${stageResult.stage}: ${stageResult.message}`);
        if (!stageResult.recoverable) {
            if (fillGraphics) { fillGraphics.clear(); }
            if (borderGraphics) { borderGraphics.clear(); }
        }
        return;
    }

    const { cells, mergedTerritories: merged, sharedEdges, rawSharedPolylines: builtRawPolylinesRaw, sharedPolylines: builtPolylinesRaw, worldBorderPolylines, enclaveMap } = stageResult;
    lastWorldBorderPolylines = worldBorderPolylines;  // cache for transition-end redraw

    log.renderer('PVV2', `STAGE OUTPUT | cells=${cells.length} merged=${merged.length} edges=${sharedEdges.length} polylines=${builtPolylinesRaw.length} enclaves=${enclaveMap.size} chaikinPasses=${stageConfig.chaikinPasses}`);

    // Fingerprint from stage — used for changed-owner detection
    // Assign colors to merged territories (render concern, not geometry)
    for (const territory of merged) {
        const rawColor = colorUtils.getPlayerColor(territory.ownerId);
        territory.color = adjustColorHSL(rawColor, satMult, lightMult);
    }

    // Detect changed-owner stars for transition tracking
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

    log.sys('PowerVoronoi', `${cells.length} cells, ${merged.length} merged territories`);

    // ── Stage 4: Render Fills ──────────────────────────────────────────────
    if (!fillGraphics) {
        fillGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(fillGraphics);
    }
    fillGraphics.clear();
    fillGraphics.visible = true;

    // Fills and borders are drawn on the SAME path via fill+stroke in drawTerritoryFillWithHoles.
    // No separate border render pass needed.

    log.renderer('PVV2', `FILLS | enclaves=${enclaveMap.size} territories to draw=${merged.length}`);

    if (enclaveMap.size > 0) {
        log.renderer('PVV2', `B-38 enclave detection: ${enclaveMap.size} territories contain enclaves`);
    }

    // Steady-state fills: use raw polygon points (no independent smoothing — B-42 fix)
    log.renderer('PVV2', `STEADY-STATE FILLS | drawing ${merged.length} territories`);
    for (let i = 0; i < merged.length; i++) {
        drawTerritoryFillOnly(fillGraphics, merged[i], enclaveMap.get(i), alpha);
    }

    // ── Store targets + start transition ────────────────────────────────
    // Always assign edge colors so polyline color map is populated correctly
    for (const edge of sharedEdges) {
        edge.colorA = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerA), satMult, lightMult);
        edge.colorB = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerB), satMult, lightMult);
    }
    targetBorderEdges = sharedEdges;
    lastMergedTerritories = merged;
    lastEnclaveMap = enclaveMap;

    // Build polylines for morph transition (reuse from render block if available)
    {
        const cMap = new Map<string, number>();
        for (const edge of sharedEdges) {
            const key = edge.ownerA < edge.ownerB ? `${edge.ownerA}|${edge.ownerB}` : `${edge.ownerB}|${edge.ownerA}`;
            if (!cMap.has(key)) cMap.set(key, blendColors(edge.colorA, edge.colorB, 0.5));
        }
        // builtPolylinesRaw from stage; assign colors here (render concern)
        targetSharedPolylines = builtPolylinesRaw.map(pl => {
            const [ownerA, ownerB] = pl.ownerPairKey.split('|');
            const color = cMap.get(`${ownerA}|${ownerB}`) ?? cMap.get(`${ownerB}|${ownerA}`) ?? 0x888888;
            return { ...pl, color };
        });
        targetRawSharedPolylines = builtRawPolylinesRaw?.map(pl => {
            const [ownerA, ownerB] = pl.ownerPairKey.split('|');
            const color = cMap.get(`${ownerA}|${ownerB}`) ?? cMap.get(`${ownerB}|${ownerA}`) ?? 0x888888;
            return { ...pl, color };
        }) ?? null;
    }

    // Draw inner contested borders on fillGraphics (same layer, after fills)
    if (targetSharedPolylines && targetSharedPolylines.length > 0 && borderWidth > 0 && borderAlpha > 0) {
        drawBorderPolylines(fillGraphics, targetSharedPolylines, 0, borderWidth, borderAlpha);
        log.renderer('PVV2', `🟢 BORDERS DRAWN on fillGraphics | polylines=${targetSharedPolylines.length} bw=${borderWidth} ba=${borderAlpha}`);
    } else {
        log.renderer('PVV2', `🔴 BORDERS SKIPPED | polylines=${targetSharedPolylines?.length ?? 'null'} bw=${borderWidth} ba=${borderAlpha}`);
    }
    // Draw world-boundary border lines — territory-colored, derived from outer polygon faces
    if (worldBorderPolylines.length > 0 && borderWidth > 0 && borderAlpha > 0) {
        drawBorderPolylines(fillGraphics, worldBorderPolylines, 0, borderWidth, borderAlpha);
        log.renderer('PVV2', `🌐 WORLD BORDERS DRAWN | polylines=${worldBorderPolylines.length}`);
    }

    // Start transition based on mode
    if (shapeChanged && transitionMs > 0) {
        // Segment mode
        if (prevBorderEdges && prevBorderEdges.length > 0) {
            borderTransitionStart = now;
            isBorderTransitioning = true;
        }

        // Smooth mode — create the appropriate border morpher
        if (prevSharedPolylines && prevSharedPolylines.length > 0 && targetSharedPolylines && targetSharedPolylines.length > 0) {
            smoothTransitionStart = now;
            isSmoothTransitioning = true;
            isFillTransitioning = true;
            fillTransitionStart = now;

            // Clean up any stale morphers
            activeMorpher = null;
            if (activeRopeRenderer) {
                activeRopeRenderer.removeAll();
                activeRopeRenderer = null;
            }

            // Select mode and tuning params from config
            const borderTransMode = GAME_CONFIG.TERRITORY_BORDER_TRANSITION ?? 'pixi_graphics_morph';
            const easing = (GAME_CONFIG.BORDER_TRANS_EASING ?? 'back') as 'cubic' | 'back' | 'elastic' | 'ease-out' | 'ease-out-quad' | 'sine' | 'linear';
            const resampleN = Math.max(8, Math.min(64, Math.round(GAME_CONFIG.BORDER_TRANS_RESAMPLE_N ?? 32)));
            const overshoot = GAME_CONFIG.BORDER_TRANS_OVERSHOOT ?? 1.7;
            log.renderer('PVV2', `TRANSITION STARTED | mode=${borderTransMode} easing=${easing} resampleN=${resampleN} overshoot=${overshoot.toFixed(2)} prev=${prevSharedPolylines.length} target=${targetSharedPolylines.length} | transitionMs=${transitionMs}`);

            if (borderTransMode === 'pixi_mesh_rope') {
                const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
                activeRopeRenderer = new RopeBorderRenderer(prevSharedPolylines, targetSharedPolylines, easing, resampleN, borderWidth, overshoot);
                activeRopeRenderer.addTo(voronoiContainer);
            } else if (borderTransMode === 'pixi_graphics_morph' || borderTransMode === 'optimal_transport' || borderTransMode === 'smooth_morph') {
                // All graphics-based morphers use the same underlying GraphicsPathMorpher.
                // optimal_transport and smooth_morph previously fell through to the legacy
                // buildLerpedPolylines path which is now disabled.
                activeMorpher = new GraphicsPathMorpher(prevSharedPolylines, targetSharedPolylines, easing, resampleN, overshoot);
            }
            // else: no morpher — borders only appear at rebuild time (steady-state)
        }
    }
    log.renderer('PVV2', `◀ rebuild complete | total=${(performance.now() - now).toFixed(1)}ms`);
}

// ── Cache Reset ────────────────────────────────────────────────────────────

export function resetPowerVoronoiCache(): void {
    cachedShapeFingerprint = '';
    cachedVisualFingerprint = '';
    // Segment mode state
    isBorderTransitioning = false;
    prevBorderEdges = null;
    targetBorderEdges = null;
    borderTransitionStart = 0;
    // Smooth mode state
    isSmoothTransitioning = false;
    prevSharedPolylines = null;
    targetSharedPolylines = null;
    targetRawSharedPolylines = null;
    smoothTransitionStart = 0;
    lastMergedTerritories = null;
    // Fill crossfade state
    isFillTransitioning = false;
    prevMergedTerritories = null;
    prevEnclaveMap = null;
    fillTransitionStart = 0;
    // Active morpher cleanup
    activeMorpher = null;
    if (activeRopeRenderer) {
        activeRopeRenderer.removeAll();
        activeRopeRenderer = null;
    }
    // Enclave state
    lastEnclaveMap = null;
    // Cell change tracking state
    lastCells = null;
    changedSiteIds = null;
    log.renderer('PVV2', 'cache reset');
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
