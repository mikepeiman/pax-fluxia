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
import type { CanonicalTerritoryData } from '$lib/territory/orchestrator/renderMode';
import { log } from '$lib/utils/logger';
import { blendColors, hexToRGB } from '$lib/utils/colorUtils';
import {
    generateVoronoiTerritoryGeometry,
    buildTerritoryGeometryFingerprint,
    chaikinSmoothPolyline,
    chaikinSmoothPolygon,
    chainSharedEdgesIntoPolylines,
    type TerritoryGeometryData,
    type MergedTerritory,
    type SharedBorderEdge,
    type SharedPolyline,
    type TerritoryCell,
} from '$lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator';
import { resamplePolygon, resamplePolyline, lerpPolygon, polygonCentroid } from '$lib/territory/geometry/morphUtils';
import { SegmentMorphTransitionHandler, RopeBorderRenderer, PolygonMorphTransitionHandler } from '$lib/renderers/geometry/borderTransition';
import { territoryTransitions } from '$lib/fx/handlers/territoryTransitionHandler';

// ── Types ──────────────────────────────────────────────────────────────────

// Types are now imported from powerVoronoiTerritoryGeometryGenerator — TerritoryCell, MergedTerritory,
// SharedBorderEdge, SharedPolyline, TerritoryGeometryData
// ── Renderer State (encapsulated) ─────────────────────────────────────────

/**
 * All mutable state for one PVV2 renderer instance.
 * The legacy module-level state is now stored in `defaultState`.
 * The refactored adapter creates its own isolated state via `createPVV2State()`.
 */
export interface PVV2RendererState {
    // Cache
    cachedShapeFingerprint: string;
    cachedVisualFingerprint: string;
    fillGraphics: PIXI.Graphics | null;
    borderGraphics: PIXI.Graphics | null;
    // Border Transition (Segment Mode)
    prevBorderEdges: SharedBorderEdge[] | null;
    targetBorderEdges: SharedBorderEdge[] | null;
    borderTransitionStart: number;
    isBorderTransitioning: boolean;
    // Smooth Transition (Contested Border Mode)
    prevSharedPolylines: SharedPolyline[] | null;
    targetSharedPolylines: SharedPolyline[] | null;
    targetRawSharedPolylines: SharedPolyline[] | null;
    smoothTransitionStart: number;
    isSmoothTransitioning: boolean;
    lastMergedTerritories: MergedTerritory[] | null;
    // Fill Transition (alpha crossfade)
    prevMergedTerritories: MergedTerritory[] | null;
    prevEnclaveMap: Map<number, [number, number][][]> | null;
    fillTransitionStart: number;
    isFillTransitioning: boolean;
    // Active Morphers
    activeBorderTransitionHandler: SegmentMorphTransitionHandler | null;
    activeRopeRenderer: RopeBorderRenderer | null;
    activeShapeTransitionHandler: PolygonMorphTransitionHandler | null;
    // Cell Change Tracking
    lastCells: TerritoryCell[] | null;
    changedSiteIds: Set<string> | null;
    // Enclave Cache
    lastEnclaveMap: Map<number, [number, number][][]> | null;
    // (removed: lastWorldBorderPolylines — failed world rect border attempt)
}

/** Create a fresh PVV2 renderer state. */
export function createPVV2State(): PVV2RendererState {
    return {
        cachedShapeFingerprint: '',
        cachedVisualFingerprint: '',
        fillGraphics: null,
        borderGraphics: null,
        prevBorderEdges: null,
        targetBorderEdges: null,
        borderTransitionStart: 0,
        isBorderTransitioning: false,
        prevSharedPolylines: null,
        targetSharedPolylines: null,
        targetRawSharedPolylines: null,
        smoothTransitionStart: 0,
        isSmoothTransitioning: false,
        lastMergedTerritories: null,
        prevMergedTerritories: null,
        prevEnclaveMap: null,
        fillTransitionStart: 0,
        isFillTransitioning: false,
        activeBorderTransitionHandler: null,
        activeRopeRenderer: null,
        activeShapeTransitionHandler: null,
        lastCells: null,
        changedSiteIds: null,
        lastEnclaveMap: null,
        // (removed: lastWorldBorderPolylines)
    };
}

/** Default (legacy) module-level state — used when no state is passed to renderPowerVoronoi. */
const defaultState: PVV2RendererState = createPVV2State();

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
    // Geometry mode controls which generator runs (standard vs Geometry_0319)
    fp += `:geoMode=${GAME_CONFIG.TERRITORY_GEOMETRY_MODE}`;
    fp += `:engMethod=${GAME_CONFIG.TERRITORY_ENGINE_METHOD}`;
    fp += `:geoRefresh=${(GAME_CONFIG as any).__GEOMETRY_REFRESH_TOKEN ?? 0}`;
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
// hexToRGB, blendColors: imported from '$lib/utils/colorUtils'

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






// ── Polygon Morph Helpers ─────────────────────────────────────────────────
// resamplePolygon, resamplePolyline, lerpPolygon, polygonCentroid imported from
// territory/geometry/morphUtils — animation-layer geometry helpers.

// chaikinSmoothPolyline, chaikinSmoothPolygon imported from powerVoronoiTerritoryGeometryGenerator —
// ────────────────────────────────────────────────────────────────────────────
// These are GEOMETRY operations — they change world coordinates.
// Used in the renderer only for fill smoothing (hole polygons, crossfade fills).
// ── Geometry helpers (imported from powerVoronoiTerritoryGeometryGenerator + morphUtils) ──────────
// chaikinSmoothPolyline, chaikinSmoothPolygon ← powerVoronoiTerritoryGeometryGenerator (geometry layer)
// resamplePolygon, resamplePolyline, lerpPolygon, polygonCentroid ← morphUtils (geometry layer)
// chainSharedEdgesIntoPolylines ← powerVoronoiTerritoryGeometryGenerator (geometry layer)




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
    if (!defaultState.borderGraphics) {
        defaultState.borderGraphics = new PIXI.Graphics();
        container.addChild(defaultState.borderGraphics);
    }
    defaultState.borderGraphics.clear();
    defaultState.borderGraphics.visible = true;

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
            defaultState.borderGraphics.moveTo(x1, y1);
            defaultState.borderGraphics.lineTo(x2, y2);
            defaultState.borderGraphics.stroke({ width: blendWidth, color, alpha: borderAlpha });
        } else {
            // Prev edge fading out (no match) — draw at prev position with decreasing alpha
            defaultState.borderGraphics.moveTo(pEdge.x1, pEdge.y1);
            defaultState.borderGraphics.lineTo(pEdge.x2, pEdge.y2);
            defaultState.borderGraphics.stroke({ width: blendWidth, color: pEdge.colorA || 0x888888, alpha: borderAlpha * (1 - t) });
        }
    }

    // Unmatched target edges — fade in
    for (let ti = 0; ti < target.length; ti++) {
        if (targetUsed.has(ti)) continue;
        const tEdge = target[ti];
        defaultState.borderGraphics.moveTo(tEdge.x1, tEdge.y1);
        defaultState.borderGraphics.lineTo(tEdge.x2, tEdge.y2);
        defaultState.borderGraphics.stroke({ width: blendWidth, color: tEdge.colorA || 0x888888, alpha: borderAlpha * t });
    }
}



// mergeSameOwnerCells and detectEnclaves moved to powerVoronoiTerritoryGeometryGenerator.ts (geometry stage)


/** Draw a territory fill ONLY (no stroke).
 *  Borders are drawn separately via drawBorderPolylines on defaultState.borderGraphics.
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
    state?: PVV2RendererState,
    precomputedGeometry?: TerritoryGeometryData,
): void {
    const s = state ?? defaultState;
    const transitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;
    const now = performance.now();

    // Re-show s.fillGraphics — voronoiContainer blanket-hides every frame
    if (s.fillGraphics) s.fillGraphics.visible = true;
    // s.borderGraphics stays hidden — borders are now strokes on the fill path

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
        if (!s.fillGraphics) {
            s.fillGraphics = new PIXI.Graphics();
            voronoiContainer.addChild(s.fillGraphics);
        }
        s.fillGraphics.clear();
        s.fillGraphics.visible = true;

        // Canonical path owns ALL rendering for this frame.
        // Clear legacy s.borderGraphics so stale pvv2 polyline borders (different geometry)
        // do not persist and appear misaligned with canonical shell fills.
        if (s.borderGraphics) {
            s.borderGraphics.clear();
            s.borderGraphics.visible = false;
            log.renderer('PVV2', '🔴 CANONICAL PATH cleared s.borderGraphics!');
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
            s.fillGraphics.beginPath();
            s.fillGraphics.poly(smoothedPts.flat());
            s.fillGraphics.fill({ color: shellColor, alpha });

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
                s.fillGraphics.beginPath();
                s.fillGraphics.poly(smoothedHole.flat());
                s.fillGraphics.cut();
            }

            // Draw border ON the same shell points
            if (borderWidth > 0 && borderAlpha > 0) {
                s.fillGraphics.beginPath();
                s.fillGraphics.moveTo(smoothedPts[0][0], smoothedPts[0][1]);
                for (let i = 1; i < smoothedPts.length; i++) {
                    s.fillGraphics.lineTo(smoothedPts[i][0], smoothedPts[i][1]);
                }
                if (smoothedPts.length > 2) {
                    s.fillGraphics.lineTo(smoothedPts[0][0], smoothedPts[0][1]);
                }
                s.fillGraphics.stroke({
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
    // Clear stale s.borderGraphics — borders are drawn on s.fillGraphics only.
    // renderInterpolatedBorders (which created borderGraphics) is dead code,
    // but the Graphics object persists and renders a second set of borders.
    if (s.borderGraphics) {
        s.borderGraphics.clear();
        s.borderGraphics.visible = false;
    }
    // Per-frame animation (both modes)
    const boundaryMode = GAME_CONFIG.TERRITORY_BOUNDARY_MODE ?? 'smooth';

    // Throttled mode log — only on state change
    const modeKey = `${boundaryMode}|${s.isSmoothTransitioning}|${s.isBorderTransitioning}`;
    if ((drawBorderPolylines as any).__lastModeKey !== modeKey) {
        (drawBorderPolylines as any).__lastModeKey = modeKey;
        log.renderer('PVV2', `mode=${boundaryMode} smoothTransition=${s.isSmoothTransitioning} segmentTransition=${s.isBorderTransitioning}`);
    }

    // ── Per-frame geometric MORPH ──
    const isAnimatingSmooth = boundaryMode === 'smooth' && s.isSmoothTransitioning && s.prevSharedPolylines && s.targetSharedPolylines && transitionMs > 0;

    if (isAnimatingSmooth && s.lastMergedTerritories && s.fillGraphics) {
        const elapsed = now - s.smoothTransitionStart;
        const rawT = Math.min(1, elapsed / transitionMs);
        // Easing is now handled inside the morpher classes — pass raw t
        const easedT = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
        const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
        const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
        const smoothPasses = Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)));

        s.fillGraphics.clear();

        // D-79 / B-101: Unified fill+border from same morphed closed polygons.
        // PolygonMorphTransitionHandler draws both fill AND stroke from the same interpolated points.
        if (s.activeShapeTransitionHandler) {
            s.activeShapeTransitionHandler.drawFrame(s.fillGraphics, rawT, alpha, borderWidth, borderAlpha);
        } else if (s.activeBorderTransitionHandler) {
            // Legacy segment morpher fallback (borders only)
            for (let i = 0; i < s.lastMergedTerritories.length; i++) {
                drawTerritoryFillOnly(s.fillGraphics, s.lastMergedTerritories[i], s.lastEnclaveMap?.get(i), alpha);
            }
            s.activeBorderTransitionHandler.drawFrame(s.fillGraphics, rawT, borderWidth, borderAlpha);
        } else if (s.activeRopeRenderer) {
            // Rope mode: draw target fills, rope handles borders
            for (let i = 0; i < s.lastMergedTerritories.length; i++) {
                drawTerritoryFillOnly(s.fillGraphics, s.lastMergedTerritories[i], s.lastEnclaveMap?.get(i), alpha);
            }
            s.activeRopeRenderer.setVisible(true);
            s.activeRopeRenderer.update(rawT, borderAlpha);
        }

        if (rawT >= 1) {
            s.isSmoothTransitioning = false;
            s.isFillTransitioning = false;
            s.prevSharedPolylines = null;
            s.prevMergedTerritories = null;
            s.prevEnclaveMap = null;
            s.activeBorderTransitionHandler = null;
            s.activeShapeTransitionHandler = null;
            if (s.activeRopeRenderer) {
                s.activeRopeRenderer.removeAll();
                s.activeRopeRenderer = null;
            }
            // ── F2 FIX (refined) ────────────────────────────────────────────
            // Do NOT clear + redraw fills — that caused visible tick stutter.
            // The morpher's last frame at t=1 already shows correct fills.
            // But we DO need to draw steady-state contested borders so they persist
            // after the morpher/rope is cleaned up above.
            if (s.targetSharedPolylines && s.targetSharedPolylines.length > 0 && borderWidth > 0 && borderAlpha > 0) {
                drawBorderPolylines(s.fillGraphics, s.targetSharedPolylines, 0, borderWidth, borderAlpha);
            }

            log.renderer('PVV2', 'border transition complete — contested borders drawn, fills retained');
        }

        const shapeFpCheck = buildShapeFingerprint(stars);
        const visualFpCheck = buildVisualFingerprint();
        if (shapeFpCheck === s.cachedShapeFingerprint && visualFpCheck === s.cachedVisualFingerprint) {
            return;
        }
    } else if (boundaryMode === 'segment' && s.isBorderTransitioning && transitionMs > 0 && s.prevBorderEdges && s.targetBorderEdges) {
        const elapsed = now - s.borderTransitionStart;
        if (elapsed >= transitionMs) {
            s.isBorderTransitioning = false;
            s.prevBorderEdges = null;
        }
        const shapeFpCheck = buildShapeFingerprint(stars);
        const visualFpCheck = buildVisualFingerprint();
        if (shapeFpCheck === s.cachedShapeFingerprint && visualFpCheck === s.cachedVisualFingerprint) return;
    }

    const shapeFp = buildShapeFingerprint(stars);
    const visualFp = buildVisualFingerprint();
    const shapeChanged = shapeFp !== s.cachedShapeFingerprint;
    const visualChanged = visualFp !== s.cachedVisualFingerprint;

    if (!shapeChanged && !visualChanged) return;  // nothing changed

    log.renderer('PVV2', `REBUILD | shapeChanged=${shapeChanged} visualChanged=${visualChanged} | t+${(performance.now() - now).toFixed(1)}ms`);

    // ── Shape changed: snapshot for transition animation ─────────────────
    if (shapeChanged && transitionMs > 0) {
        // Segment mode: snapshot border edges
        if (s.targetBorderEdges && s.targetBorderEdges.length > 0) {
            s.prevBorderEdges = s.targetBorderEdges;
        }
        // Smooth mode: snapshot current shared polylines
        if (s.targetSharedPolylines && s.targetSharedPolylines.length > 0) {
            s.prevSharedPolylines = s.targetSharedPolylines;
        }
        // Fill crossfade: snapshot current merged territories
        if (s.lastMergedTerritories && s.lastMergedTerritories.length > 0) {
            s.prevMergedTerritories = s.lastMergedTerritories;
            s.prevEnclaveMap = s.lastEnclaveMap;
        }
    }

    s.cachedShapeFingerprint = shapeFp;
    s.cachedVisualFingerprint = visualFp;

    const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
    const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
    const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
    const satMult = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.VORONOI_LIGHTNESS ?? 0.7;
    const starMargin = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45;

    // ── Geometry Stage: use precomputed geometry if provided, else run generator ──
    let stageResult: TerritoryGeometryData | { kind: 'error'; stage: string; message: string; recoverable: boolean };
    if (precomputedGeometry) {
        stageResult = precomputedGeometry;
        log.renderer('PVV2', `Using precomputed geometry (Geometry_0319)`);
    } else {
        const stageConfig = {
            starMargin: GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45,
            corridorEnabled: Boolean(GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED) && Boolean(connections),
            corridorSpacing: GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60,
            disconnectEnabled: Boolean(GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED) && Boolean(connections),
            disconnectDistance: GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400,
            clusterSplit: Boolean(GAME_CONFIG.TERRITORY_CLUSTER_SPLIT),
            chaikinPasses: Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3))),
            // Only apply dense frontier resampling in unified_polygon geometry mode
            frontierResolution: (GAME_CONFIG.TERRITORY_GEOMETRY_MODE ?? 'power_voronoi') === 'unified_polygon'
                ? Math.max(1, Math.min(20, GAME_CONFIG.FRONTIER_RESOLUTION ?? 5))
                : 0,
            boundaryPad: GAME_CONFIG.CHAIKIN_BOUNDARY_PAD ?? 50,
            boundaryEps: GAME_CONFIG.CHAIKIN_BOUNDARY_EPS ?? 6,
            worldWidth,
            worldHeight,
        };
        stageResult = generateVoronoiTerritoryGeometry(stars, connections ?? [], stageConfig);
    }
    if ('kind' in stageResult) {
        // CompileError — recoverable means use last cached frame, non-recoverable clears
        log.error('PVV2', `geometry stage error at ${stageResult.stage}: ${stageResult.message}`);
        if (!stageResult.recoverable) {
            if (s.fillGraphics) { s.fillGraphics.clear(); }
            if (s.borderGraphics) { s.borderGraphics.clear(); }
        }
        return;
    }

    const { cells, mergedTerritories: merged, sharedEdges, rawSharedPolylines: builtRawPolylinesRaw, sharedPolylines: builtPolylinesRaw, enclaveMap } = stageResult;

    log.renderer('PVV2', `STAGE OUTPUT | cells=${cells.length} merged=${merged.length} edges=${sharedEdges.length} polylines=${builtPolylinesRaw.length} enclaves=${enclaveMap.size} chaikinPasses=${Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)}`);

    // Fingerprint from stage — used for changed-owner detection
    // Assign colors to merged territories (render concern, not geometry)
    for (const territory of merged) {
        const rawColor = colorUtils.getPlayerColor(territory.ownerId);
        territory.color = adjustColorHSL(rawColor, satMult, lightMult);
    }

    // Detect changed-owner stars for transition tracking
    s.changedSiteIds = null;
    if (s.lastCells && shapeChanged) {
        const prevOwnerMap = new Map(s.lastCells.map(c => [c.siteId, c.ownerId]));
        const changed = new Set<string>();
        for (const cell of cells) {
            const prevOwner = prevOwnerMap.get(cell.siteId);
            if (prevOwner && prevOwner !== cell.ownerId) {
                changed.add(cell.siteId);
            }
        }
        if (changed.size > 0) {
            s.changedSiteIds = changed;
            log.sys('PowerVoronoi', `Conquest detected: ${changed.size} stars changed owner: ${[...changed].join(', ')}`);
        }
    }
    s.lastCells = cells;

    log.sys('PowerVoronoi', `${cells.length} cells, ${merged.length} merged territories`);

    // ── Stage 4: Render Fills ──────────────────────────────────────────────
    if (!s.fillGraphics) {
        s.fillGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(s.fillGraphics);
    }
    s.fillGraphics.clear();
    s.fillGraphics.visible = true;

    // Fills and borders are drawn on the SAME path via fill+stroke in drawTerritoryFillWithHoles.
    // No separate border render pass needed.

    log.renderer('PVV2', `FILLS | enclaves=${enclaveMap.size} territories to draw=${merged.length}`);

    if (enclaveMap.size > 0) {
        log.renderer('PVV2', `B-38 enclave detection: ${enclaveMap.size} territories contain enclaves`);
    }

    // Steady-state fills: use raw polygon points (no independent smoothing — B-42 fix)
    // Borders are drawn SEPARATELY from sharedPolylines (contested edges only, blended colors)
    log.renderer('PVV2', `FILLS | drawing ${merged.length} territories`);
    for (let i = 0; i < merged.length; i++) {
        drawTerritoryFillOnly(s.fillGraphics, merged[i], enclaveMap.get(i), alpha);
    }

    // ── Store targets + start transition ────────────────────────────────
    // Always assign edge colors so polyline color map is populated correctly
    for (const edge of sharedEdges) {
        edge.colorA = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerA), satMult, lightMult);
        edge.colorB = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerB), satMult, lightMult);
    }
    s.targetBorderEdges = sharedEdges;
    s.lastMergedTerritories = merged;
    s.lastEnclaveMap = enclaveMap;

    // Build polylines for morph transition (reuse from render block if available)
    {
        const cMap = new Map<string, number>();
        for (const edge of sharedEdges) {
            const key = edge.ownerA < edge.ownerB ? `${edge.ownerA}|${edge.ownerB}` : `${edge.ownerB}|${edge.ownerA}`;
            if (!cMap.has(key)) cMap.set(key, blendColors(edge.colorA, edge.colorB, 0.5));
        }
        // builtPolylinesRaw from stage; assign colors here (render concern)
        s.targetSharedPolylines = builtPolylinesRaw.map(pl => {
            const [ownerA, ownerB] = pl.ownerPairKey.split('|');
            const color = cMap.get(`${ownerA}|${ownerB}`) ?? cMap.get(`${ownerB}|${ownerA}`) ?? 0x888888;
            return { ...pl, color };
        });
        s.targetRawSharedPolylines = builtRawPolylinesRaw?.map(pl => {
            const [ownerA, ownerB] = pl.ownerPairKey.split('|');
            const color = cMap.get(`${ownerA}|${ownerB}`) ?? cMap.get(`${ownerB}|${ownerA}`) ?? 0x888888;
            return { ...pl, color };
        }) ?? null;
    }

    // Draw contested borders from sharedPolylines (only edges between different owners)
    if (s.targetSharedPolylines && s.targetSharedPolylines.length > 0 && borderWidth > 0 && borderAlpha > 0) {
        drawBorderPolylines(s.fillGraphics, s.targetSharedPolylines, 0, borderWidth, borderAlpha);
        log.renderer('PVV2', `🟢 CONTESTED BORDERS DRAWN | polylines=${s.targetSharedPolylines.length} bw=${borderWidth} ba=${borderAlpha}`);
    }


    // Start transition based on geometry change or FX-driven conquest event
    const fxTriggered = territoryTransitions.hasActiveTransitions;
    if ((shapeChanged || fxTriggered) && transitionMs > 0) {
        // Mark any unconsumed FX transitions as consumed by this renderer
        for (const entry of territoryTransitions.getUnconsumed()) {
            territoryTransitions.markConsumed(entry.starId);
        }
        // Segment mode
        if (s.prevBorderEdges && s.prevBorderEdges.length > 0) {
            s.borderTransitionStart = now;
            s.isBorderTransitioning = true;
        }

        // Smooth mode — create the appropriate border morpher
        if (s.prevSharedPolylines && s.prevSharedPolylines.length > 0 && s.targetSharedPolylines && s.targetSharedPolylines.length > 0) {
            s.smoothTransitionStart = now;
            s.isSmoothTransitioning = true;
            s.isFillTransitioning = true;
            s.fillTransitionStart = now;

            // Clean up any stale morphers
            s.activeBorderTransitionHandler = null;
            if (s.activeRopeRenderer) {
                s.activeRopeRenderer.removeAll();
                s.activeRopeRenderer = null;
            }

            // Select mode and tuning params from config
            const borderTransMode = GAME_CONFIG.TERRITORY_BORDER_TRANSITION ?? 'pixi_graphics_morph';
            const easing = (GAME_CONFIG.BORDER_TRANS_EASING ?? 'back') as 'cubic' | 'back' | 'elastic' | 'ease-out' | 'ease-out-quad' | 'sine' | 'linear';
            const resampleN = Math.max(8, Math.min(64, Math.round(GAME_CONFIG.BORDER_TRANS_RESAMPLE_N ?? 32)));
            const overshoot = GAME_CONFIG.BORDER_TRANS_OVERSHOOT ?? 1.7;
            log.renderer('PVV2', `TRANSITION STARTED | mode=${borderTransMode} easing=${easing} resampleN=${resampleN} overshoot=${overshoot.toFixed(2)} prev=${s.prevSharedPolylines.length} target=${s.targetSharedPolylines.length} | transitionMs=${transitionMs}`);

            if (borderTransMode === 'pixi_mesh_rope') {
                const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
                s.activeRopeRenderer = new RopeBorderRenderer(s.prevSharedPolylines, s.targetSharedPolylines, easing, resampleN, borderWidth, overshoot);
                s.activeRopeRenderer.addTo(voronoiContainer);
            } else if ((GAME_CONFIG.TERRITORY_GEOMETRY_MODE ?? 'power_voronoi') === 'unified_polygon') {
                // Unified polygon geometry mode — fills + borders from same closed polygon data
                if (s.prevMergedTerritories && s.lastMergedTerritories) {
                    s.activeShapeTransitionHandler = new PolygonMorphTransitionHandler(s.prevMergedTerritories, s.lastMergedTerritories, easing, resampleN, overshoot);
                }
            } else if (borderTransMode === 'pixi_graphics_morph' || borderTransMode === 'optimal_transport' || borderTransMode === 'smooth_morph') {
                s.activeBorderTransitionHandler = new SegmentMorphTransitionHandler(s.prevSharedPolylines, s.targetSharedPolylines, easing, resampleN, overshoot);
            }
            // else: no morpher — borders only appear at rebuild time (steady-state)
        }
    }
    log.renderer('PVV2', `◀ rebuild complete | total=${(performance.now() - now).toFixed(1)}ms`);
}

// ── Cache Reset ────────────────────────────────────────────────────────────

export function resetPowerVoronoiCache(): void {
    defaultState.cachedShapeFingerprint = '';
    defaultState.cachedVisualFingerprint = '';
    // Segment mode state
    defaultState.isBorderTransitioning = false;
    defaultState.prevBorderEdges = null;
    defaultState.targetBorderEdges = null;
    defaultState.borderTransitionStart = 0;
    // Smooth mode state
    defaultState.isSmoothTransitioning = false;
    defaultState.prevSharedPolylines = null;
    defaultState.targetSharedPolylines = null;
    defaultState.targetRawSharedPolylines = null;
    defaultState.smoothTransitionStart = 0;
    defaultState.lastMergedTerritories = null;
    // Fill crossfade state
    defaultState.isFillTransitioning = false;
    defaultState.prevMergedTerritories = null;
    defaultState.prevEnclaveMap = null;
    defaultState.fillTransitionStart = 0;
    // Active morpher cleanup
    defaultState.activeBorderTransitionHandler = null;
    defaultState.activeShapeTransitionHandler = null;
    if (defaultState.activeRopeRenderer) {
        defaultState.activeRopeRenderer.removeAll();
        defaultState.activeRopeRenderer = null;
    }
    // Enclave state
    defaultState.lastEnclaveMap = null;
    // Cell change tracking state
    defaultState.lastCells = null;
    defaultState.changedSiteIds = null;
    log.renderer('PVV2', 'cache reset');
    if (defaultState.fillGraphics) {
        if (defaultState.fillGraphics.parent) defaultState.fillGraphics.parent.removeChild(defaultState.fillGraphics);
        defaultState.fillGraphics.destroy();
        defaultState.fillGraphics = null;
    }
    if (defaultState.borderGraphics) {
        if (defaultState.borderGraphics.parent) defaultState.borderGraphics.parent.removeChild(defaultState.borderGraphics);
        defaultState.borderGraphics.destroy();
        defaultState.borderGraphics = null;
    }
}
