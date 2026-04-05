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

// ── Localized Boundary Transition Pipeline ─────────────────────────────────
import type { TerritoryTransitionPlanSet, TerritoryFrameGeometry, Vec2 } from '$lib/territory/transitions/types';
import { buildSnapshotsFromTMAP } from '../territory/transitions/buildSnapshotsFromTMAP';
import { diffFrontierMaps } from '../territory/transitions/diffFrontierMaps';
import { createCanonicalTransitionPlan } from '../territory/transitions/createCanonicalTransitionPlan';
import { computeGeometry0319 } from '../territory/compiler/Geometry_0319';
import type { TerritoryGeneratorSettings, PowerSite } from '../territory/compiler/powerVoronoiTerritoryGeometryGenerator';
import { computeTerritoryDeltaContext } from '$lib/territory/transitions/computeTerritoryDeltaContext';
import { createTerritoryTransitionPlan } from '$lib/territory/transitions/createTerritoryTransitionPlan';
import { sampleTransitionFrame } from '$lib/territory/transitions/sampleTransitionFrame';
import { drawTerritoryFrame } from '$lib/territory/transitions/drawTerritoryFrame';

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
    changedSitePrevOwners: Map<string, string> | null;
    // Enclave Cache
    lastEnclaveMap: Map<number, [number, number][][]> | null;
    // World border polylines — stored for fill reconstruction during Frontier Morph transitions
    lastWorldBorderPolylines: SharedPolyline[] | null;
    // Localized Boundary Transition
    prevGeometryData: TerritoryGeometryData | null;
    lastGeometryData: TerritoryGeometryData | null;
    activeTransitionPlan: TerritoryTransitionPlanSet | null;
    transitionStartTime: number | null;
    transitionDurationMs: number;
    // Weight Interpolation Transition
    weightLerpActive: boolean;
    weightLerpStartTime: number;
    weightLerpDurationMs: number;
    weightLerpStars: StarState[] | null;
    weightLerpConnections: StarConnection[] | null;
    weightLerpConfig: TerritoryGeneratorSettings | null;
    weightLerpConqueredStarIds: Set<string> | null;
    weightLerpPrevWeights: Map<string, number> | null;
    weightLerpTargetWeights: Map<string, number> | null;
    weightLerpGhostSites: PowerSite[] | null;
    weightLerpGhostWeightStart: Map<string, number> | null;
    /** F-165: Ghost target positions (conquered star) for position-lerp */
    weightLerpGhostTargetPos: Map<string, { x: number; y: number }> | null;
    // Island dissolution animation
    dyingIslands: Array<{
        polygon: [number, number][];
        center: { x: number; y: number };
        color: number;
        startTime: number;
        durationMs: number;
    }>;
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
        changedSitePrevOwners: null,
        lastEnclaveMap: null,
        lastWorldBorderPolylines: null,
        prevGeometryData: null,
        lastGeometryData: null,
        activeTransitionPlan: null,
        transitionStartTime: null,
        transitionDurationMs: 0,
        weightLerpActive: false,
        weightLerpStartTime: 0,
        weightLerpDurationMs: 0,
        weightLerpStars: null,
        weightLerpConnections: null,
        weightLerpConfig: null,
        weightLerpConqueredStarIds: null,
        weightLerpPrevWeights: null,
        weightLerpTargetWeights: null,
        weightLerpGhostSites: null,
        weightLerpGhostWeightStart: null,
        weightLerpGhostTargetPos: null,
        dyingIslands: [],
    };
}

/** Default (legacy) module-level state — used when no state is passed to renderPowerVoronoi. */
const defaultState: PVV2RendererState = createPVV2State();

// ── Fingerprint ────────────────────────────────────────────────────────────

/**
 * Build a cache key from star ownership + geometry-affecting config params.
 * If this string changes between frames, the renderer runs a full geometry
 * stage rebuild. If it stays the same, the renderer skips the expensive
 * power diagram computation.
 *
 * IMPORTANT: any config key that affects geometry output MUST be included here.
 * Otherwise, changing that setting in the UI will appear to have no effect
 * until the next conquest triggers a natural rebuild.
 */
function buildShapeFingerprint(stars: StarState[]): string {
    let fp = 'shape:';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}`;
    fp += `:${GAME_CONFIG.TERRITORY_CLUSTER_SPLIT}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}`;
    fp += `:cxN=${GAME_CONFIG.TERRITORY_CX_COUNT}`;
    fp += `:cxW=${GAME_CONFIG.TERRITORY_CX_WEIGHT}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}`;
    fp += `:dxW=${GAME_CONFIG.TERRITORY_DX_WEIGHT}`;
    // Chaikin passes drives chainSharedEdgesIntoPolylines in the geometry stage
    // — must be a shape-fingerprint dependency, not visual-only
    fp += `:chaikin=${GAME_CONFIG.VORONOI_BORDER_SMOOTH}`;
    // Geometry mode selects which generator runs:
    // - 'power_voronoi': standard generateVoronoiTerritoryGeometry
    // - 'unified_polygon': dense resampled variant
    // - 'new_frontiers_0319': Geometry_0319 with fixed world-boundary pipeline
    fp += `:geoMode=${GAME_CONFIG.TERRITORY_GEOMETRY_MODE}`;
    fp += `:engMethod=${GAME_CONFIG.TERRITORY_ENGINE_METHOD}`;
    // Refresh token: bumped by selectGeometryMode() on EVERY click (even
    // re-clicking the same mode) so the user can force a recompute without
    // changing any actual setting. See ControlsSection-Territory.svelte.
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



/** Draw a single territory fill (outer boundary + optional holes).
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

    // Fill path diagnostics — tracks which draw path is active, logs on change
    let _fillPath = 'none';

    if (canonicalShells.length > 0) {
        if (!s.fillGraphics) {
            s.fillGraphics = new PIXI.Graphics();
            voronoiContainer.addChild(s.fillGraphics);
        }
        console.log('%c[FILL-CLEAR] canonical path', 'color:red;font-weight:bold');
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
        _fillPath = `canonical|shells=${sorted.length}`;
        if (_fillPath !== (renderPowerVoronoi as any).__lastFillPath) { log.sys('FILL-DIAG', `PATH=${_fillPath}`); (renderPowerVoronoi as any).__lastFillPath = _fillPath; }
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
    const isAnimatingSmooth = (boundaryMode === 'smooth' && s.isSmoothTransitioning && s.prevSharedPolylines && s.targetSharedPolylines && transitionMs > 0) || s.weightLerpActive;
    // console.log('[DIAG-ANIM]', { isAnimatingSmooth, weightLerpActive: s.weightLerpActive, isSmoothTransitioning: s.isSmoothTransitioning, transitionMs });

    // Fill diagnostics — log only when the active path CHANGES

    if (isAnimatingSmooth && s.lastMergedTerritories && s.fillGraphics) {
        // When weight-lerp is active without smooth transition, use weight-lerp timing
        // (prevents outer rawT from instantly hitting 1 due to stale smoothTransitionStart)
        const outerStart = s.weightLerpActive ? s.weightLerpStartTime : s.smoothTransitionStart;
        const outerDur = s.weightLerpActive ? s.weightLerpDurationMs : transitionMs;
        const elapsed = now - outerStart;
        const rawT = Math.min(1, elapsed / (outerDur || 1));
        // Easing is now handled inside the morpher classes — pass raw t
        const easedT = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
        const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
        const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
        const smoothPasses = Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)));

        s.fillGraphics.clear();

        _fillPath = `smooth-anim|wl=${s.weightLerpActive}|splice=${!!(s.activeTransitionPlan?.plansByTerritoryId?.size)}|shape=${!!s.activeShapeTransitionHandler}|rope=${!!s.activeRopeRenderer}`;

        // Transition Frame Tracing
        if (s.weightLerpActive || s.isSmoothTransitioning || s.isBorderTransitioning) {
            log.renderer('DY4:TRACE', JSON.stringify({
                frame: 'transition',
                fillActive: s.weightLerpActive,
                smoothBorderActive: s.isSmoothTransitioning,
                segmentBorderActive: s.isBorderTransitioning,
                prevFillCount: s.weightLerpPrevWeights?.size ?? 0,
                targetFillCount: s.weightLerpTargetWeights?.size ?? 0,
                prevBorderCount: s.prevSharedPolylines?.length ?? 0,
                targetBorderCount: s.targetSharedPolylines?.length ?? 0,
                elapsed: {
                    fill: s.weightLerpActive ? (now - (s.weightLerpStartTime ?? 0)) : null,
                    smooth: s.isSmoothTransitioning ? (now - (s.smoothTransitionStart ?? 0)) : null,
                    segment: s.isBorderTransitioning ? (now - (s.borderTransitionStart ?? 0)) : null,
                },
            }));
        }

        // ── Ghost-Site Weight-Lerp Transition: recompute Voronoi each frame ──
        if (s.weightLerpActive && s.weightLerpStars && s.weightLerpConfig && s.weightLerpPrevWeights && s.weightLerpTargetWeights) {
            const elapsed = now - s.weightLerpStartTime;
            const rawT = Math.min(1, elapsed / s.weightLerpDurationMs);
            // console.log('[DIAG-WL]', { rawT, elapsed, durationMs: s.weightLerpDurationMs, mode: GAME_CONFIG.VS_TRANSITION_MODE });

            if (rawT >= 1) {
                // Transition complete — stop, let normal draw take over
                s.weightLerpActive = false;
                s.weightLerpGhostSites = null;
                s.weightLerpGhostWeightStart = null;
                // Cancel any stale smooth/fill transition state so normal draw works
                s.isSmoothTransitioning = false;
                s.isFillTransitioning = false;
                s.isBorderTransitioning = false;
                s.activeShapeTransitionHandler = null;
                s.activeBorderTransitionHandler = null;
                log.sys('TMAP-WeightLerp', `GHOST TRANSITION COMPLETE | duration=${elapsed.toFixed(0)}ms`);
            } else if (!GAME_CONFIG.DEBUG_DY4_DISABLE_FILL_CROSSFADE) {
                // A1: Expose crossfade logic behind isolation boolean
                // ── Mode-dependent easing + ghost strategy ──
                const mode = GAME_CONFIG.VS_TRANSITION_MODE ?? 'no_loser';
                let tConquest: number;
                const frameGhosts: PowerSite[] = [];

                switch (mode) {
                    case 'no_ghosts': {
                        // Pure weight ramp, no ghosts at all
                        tConquest = rawT * rawT;  // easeInQuad: gentle start
                        break;
                    }
                    case 'no_loser': {
                        // Victor ghost travels A→C, no loser ghost. Gentle conquest ramp.
                        tConquest = rawT * rawT * rawT;  // easeInCubic
                        const tV = 1 - Math.pow(1 - rawT, 3);  // easeOutCubic
                        if (s.weightLerpGhostSites && s.weightLerpGhostTargetPos) {
                            for (const ghost of s.weightLerpGhostSites) {
                                if (!ghost.starId.startsWith('vs_victor_')) continue;  // skip losers
                                const target = s.weightLerpGhostTargetPos.get(ghost.starId);
                                if (target) {
                                    frameGhosts.push({
                                        ...ghost,
                                        x: ghost.x + (target.x - ghost.x) * tV,
                                        y: ghost.y + (target.y - ghost.y) * tV,
                                        weight: ghost.weight,  // constant
                                    });
                                }
                            }
                        }
                        break;
                    }
                    case 'matched_ease': {
                        // Same easeInOut for everything — synchronized curves
                        const ease = rawT < 0.5
                            ? 2 * rawT * rawT
                            : 1 - Math.pow(-2 * rawT + 2, 2) / 2;  // easeInOutQuad
                        tConquest = ease;
                        if (s.weightLerpGhostSites && s.weightLerpGhostTargetPos) {
                            for (const ghost of s.weightLerpGhostSites) {
                                const target = s.weightLerpGhostTargetPos.get(ghost.starId);
                                if (target) {
                                    const isVictor = ghost.starId.startsWith('vs_victor_');
                                    frameGhosts.push({
                                        ...ghost,
                                        x: ghost.x + (target.x - ghost.x) * ease,
                                        y: ghost.y + (target.y - ghost.y) * ease,
                                        weight: isVictor ? ghost.weight : ghost.weight * (1 - ease),
                                    });
                                } else {
                                    frameGhosts.push({ ...ghost, weight: ghost.weight * (1 - ease) });
                                }
                            }
                        }
                        break;
                    }
                    case 'sequential': {
                        // Phase 1 (rawT 0-0.5): loser fades in place
                        // Phase 2 (rawT 0.5-1): victor travels A→C
                        tConquest = rawT * rawT;  // easeInQuad
                        if (s.weightLerpGhostSites && s.weightLerpGhostTargetPos) {
                            for (const ghost of s.weightLerpGhostSites) {
                                const isVictor = ghost.starId.startsWith('vs_victor_');
                                const target = s.weightLerpGhostTargetPos.get(ghost.starId);
                                if (isVictor) {
                                    // Phase 2: victor appears at rawT=0.5 and travels to target by rawT=1
                                    if (rawT > 0.5 && target) {
                                        const vt = (rawT - 0.5) * 2;  // 0→1 in second half
                                        frameGhosts.push({
                                            ...ghost,
                                            x: ghost.x + (target.x - ghost.x) * vt,
                                            y: ghost.y + (target.y - ghost.y) * vt,
                                            weight: ghost.weight,
                                        });
                                    }
                                } else {
                                    // Phase 1: loser fades in place during first half
                                    const lt = Math.min(1, rawT * 2);  // 0→1 in first half
                                    const w = ghost.weight * (1 - lt);
                                    if (w > 0.01) {
                                        frameGhosts.push({ ...ghost, weight: w });
                                    }
                                }
                            }
                        }
                        break;
                    }
                    case 'linear': {
                        // Everything linear — most predictable
                        tConquest = rawT;
                        if (s.weightLerpGhostSites && s.weightLerpGhostTargetPos) {
                            for (const ghost of s.weightLerpGhostSites) {
                                const target = s.weightLerpGhostTargetPos.get(ghost.starId);
                                if (target) {
                                    const isVictor = ghost.starId.startsWith('vs_victor_');
                                    frameGhosts.push({
                                        ...ghost,
                                        x: ghost.x + (target.x - ghost.x) * rawT,
                                        y: ghost.y + (target.y - ghost.y) * rawT,
                                        weight: isVictor ? ghost.weight : ghost.weight * (1 - rawT),
                                    });
                                } else {
                                    const w = ghost.weight * (1 - rawT);
                                    if (w > 0.01) frameGhosts.push({ ...ghost, weight: w });
                                }
                            }
                        }
                        break;
                    }
                    case 'dual_ghost':
                    default: {
                        // Original: both ghosts, easeOut for ghosts, easeIn for conquest
                        const tGhost = 1 - Math.pow(1 - rawT, 3);
                        tConquest = rawT * rawT * rawT;
                        if (s.weightLerpGhostSites && s.weightLerpGhostTargetPos) {
                            for (const ghost of s.weightLerpGhostSites) {
                                const target = s.weightLerpGhostTargetPos.get(ghost.starId);
                                if (target) {
                                    const isVictor = ghost.starId.startsWith('vs_victor_');
                                    frameGhosts.push({
                                        ...ghost,
                                        x: ghost.x + (target.x - ghost.x) * tGhost,
                                        y: ghost.y + (target.y - ghost.y) * tGhost,
                                        weight: isVictor ? ghost.weight : ghost.weight * (1 - tGhost),
                                    });
                                } else {
                                    const w = ghost.weight * (1 - tGhost);
                                    if (w > 0.01) frameGhosts.push({ ...ghost, weight: w });
                                }
                            }
                        }
                        break;
                    }
                }

                // Compute interpolated weights for real sites using tConquest
                const interpWeights = new Map<string, number>();
                for (const [starId, prevW] of s.weightLerpPrevWeights) {
                    const targetW = s.weightLerpTargetWeights.get(starId) ?? prevW;
                    interpWeights.set(starId, prevW + tConquest * (targetW - prevW));
                }

                // Recompute geometry with interpolated weights + ghost sites
                try {
                    const interpResult = computeGeometry0319(
                        s.weightLerpStars,
                        s.weightLerpConnections ?? [],
                        s.weightLerpConfig,
                        interpWeights,
                        frameGhosts.length > 0 ? frameGhosts : undefined,
                    );

                    if (!('kind' in interpResult)) {
                        // Assign colors to interpolated territories (geometry returns color=0)
                        const satMult2 = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
                        const lightMult2 = GAME_CONFIG.VORONOI_LIGHTNESS ?? 0.7;
                        const interpMerged = interpResult.mergedTerritories ?? [];
                        for (const mt of interpMerged) {
                            const rawColor = colorUtils.getPlayerColor(mt.ownerId);
                            mt.color = adjustColorHSL(rawColor, satMult2, lightMult2);
                        }
                        const interpEnclaveMap = interpResult.enclaveMap ?? null;
                        for (let i = 0; i < interpMerged.length; i++) {
                            const mt = interpMerged[i];
                            const isNeutral = !mt.ownerId || mt.ownerId === 'neutral';
                            if (isNeutral && GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT) continue;
                            drawTerritoryFillOnly(s.fillGraphics!, mt, interpEnclaveMap?.get(i), alpha);
                        }

                        // Draw borders from interpolated shared polylines
                        if (interpResult.sharedPolylines && s.fillGraphics) {
                            for (const polyline of interpResult.sharedPolylines) {
                                const pts = polyline.points;
                                if (pts.length < 2) continue;
                                // Compute border color from owner pair
                                const [ownerA, ownerB] = polyline.ownerPairKey.split('|');
                                const colA = adjustColorHSL(colorUtils.getPlayerColor(ownerA), satMult2, lightMult2);
                                const colB = adjustColorHSL(colorUtils.getPlayerColor(ownerB), satMult2, lightMult2);
                                const borderColor = blendColors(colA, colB, 0.5);
                                s.fillGraphics.setStrokeStyle({
                                    width: borderWidth,
                                    color: borderColor,
                                    alpha: borderAlpha,
                                });
                                s.fillGraphics.moveTo(pts[0][0], pts[0][1]);
                                for (let p = 1; p < pts.length; p++) {
                                    s.fillGraphics.lineTo(pts[p][0], pts[p][1]);
                                }
                                s.fillGraphics.stroke();
                            }
                        }
                    }
                } catch (err) {
                    log.error('PVV2', `Ghost weight-lerp geometry failed: ${err}`);
                    s.weightLerpActive = false;
                }

                // Skip normal drawing — we just drew the interpolated frame
                if (s.weightLerpActive) {
                    // ── Dying Island Dissolution ──
                    // Draw any island territories that are shrinking to their center point
                    if (s.dyingIslands.length > 0 && !GAME_CONFIG.DEBUG_DY4_DISABLE_FILL_CROSSFADE) {
                        const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
                        s.dyingIslands = s.dyingIslands.filter(island => {
                            const islandElapsed = now - island.startTime;
                            const islandRawT = Math.min(1, islandElapsed / island.durationMs);
                            if (islandRawT >= 1) return false; // expired — remove

                            // easeInQuad: slow start, accelerating shrink
                            const shrinkT = islandRawT * islandRawT;
                            // Alpha: full until 80%, then steep fade in last 20%
                            const alphaT = islandRawT < 0.8 ? 1 : 1 - ((islandRawT - 0.8) / 0.2);
                            const islandAlpha = alpha * alphaT;

                            // Lerp all polygon vertices toward center → build shrunk polygon
                            const { polygon, center } = island;
                            const shrunkPts: number[] = [];
                            for (const [px, py] of polygon) {
                                shrunkPts.push(
                                    px + (center.x - px) * shrinkT,
                                    py + (center.y - py) * shrinkT,
                                );
                            }
                            s.fillGraphics!.poly(shrunkPts);
                            s.fillGraphics!.fill({ color: island.color, alpha: islandAlpha });
                            return true; // keep in array
                        });
                    }

                    _fillPath = `weight-lerp|t=${rawT.toFixed(2)}|ghosts=${frameGhosts.length}|islands=${s.dyingIslands.length}`;
                    if (_fillPath !== (renderPowerVoronoi as any).__lastFillPath) { log.sys('FILL-DIAG', `PATH=${_fillPath}`); (renderPowerVoronoi as any).__lastFillPath = _fillPath; }
                    return;
                }
            }
        }

        // D-79 / B-101: Unified fill+border from same morphed closed polygons.
        // PolygonMorphTransitionHandler draws both fill AND stroke from the same interpolated points.
        if (s.activeTransitionPlan && s.activeTransitionPlan.plansByTerritoryId.size > 0) {
            _fillPath = `splice|plans=${s.activeTransitionPlan.plansByTerritoryId.size}`;
            // ── Localized boundary transition: splice-based patch replacement ──
            // Build set of ownerIds that are in the transition plan — skip in static draw.
            // We match by ownerId (not territory stable ID) because starIds change during conquest,
            // causing prev stable ID ≠ next stable ID for the same logical territory.
            const transitioningOwnerIds = new Set<string>();
            for (const plan of s.activeTransitionPlan.plansByTerritoryId.values()) {
                // R-131: don't splice-animate neutral territory when transparency is on
                const isNeutral = !plan.ownerId || plan.ownerId === 'neutral' || plan.ownerId === '';
                if (isNeutral && GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT) continue;
                transitioningOwnerIds.add(plan.ownerId);
            }
            const transitioningOwnerIndices = new Set<number>();
            const colorMap = new Map<string, number>();
            // Build ownerId → color lookup from latest merged territories
            const ownerColorMap = new Map<string, number>();
            if (s.lastMergedTerritories) {
                for (let mi = 0; mi < s.lastMergedTerritories.length; mi++) {
                    const mt = s.lastMergedTerritories[mi];
                    ownerColorMap.set(mt.ownerId, mt.color);
                    if (transitioningOwnerIds.has(mt.ownerId)) {
                        transitioningOwnerIndices.add(mi);
                    }
                }
            }
            // Populate color map using plan's territory IDs (skip neutral when transparent)
            for (const [planTid, plan] of s.activeTransitionPlan.plansByTerritoryId) {
                const isNeutral = !plan.ownerId || plan.ownerId === 'neutral' || plan.ownerId === '';
                if (isNeutral && GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT) continue;
                const color = ownerColorMap.get(plan.ownerId) ?? 0x444444;
                colorMap.set(planTid, color);
            }
            // Draw ONLY non-transitioning territories statically
            for (let i = 0; i < s.lastMergedTerritories.length; i++) {
                if (transitioningOwnerIndices.has(i)) continue; // skip — handled by splice below
                drawTerritoryFillOnly(s.fillGraphics, s.lastMergedTerritories[i], s.lastEnclaveMap?.get(i), alpha);
            }
            // Draw transitioning territories from the splice plan — fills AND borders from same geometry
            const spliceEasing = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const frameGeom = sampleTransitionFrame(s.activeTransitionPlan, rawT, spliceEasing);
            drawTerritoryFrame(frameGeom, s.fillGraphics, {
                fillAlpha: alpha,
                borderWidth: borderWidth,
                borderColor: 0x888888,
                borderAlpha: borderAlpha,
                colorByTerritory: colorMap,
            });
            // Also draw non-transitioning contested borders from polylines (steady-state borders)
            if (s.targetSharedPolylines && s.targetSharedPolylines.length > 0 && borderWidth > 0 && borderAlpha > 0) {
                // Filter out polylines that belong to transitioning owners — those are handled by splice geometry above
                const staticPolylines = s.targetSharedPolylines.filter(pl => {
                    const [ownerA, ownerB] = pl.ownerPairKey.split('|');
                    return !transitioningOwnerIds.has(ownerA) && !transitioningOwnerIds.has(ownerB);
                });
                if (staticPolylines.length > 0) {
                    drawBorderPolylines(s.fillGraphics, staticPolylines, 0, borderWidth, borderAlpha);
                }
            }
        } else if (s.activeShapeTransitionHandler) {
            _fillPath = 'shape-morph';
            // Legacy fallback — kept for non-splice transition modes
            s.activeShapeTransitionHandler.drawFrame(s.fillGraphics, rawT, alpha, borderWidth, borderAlpha);
        } else if (s.activeBorderTransitionHandler) {
            _fillPath = `border-morph|merged=${s.lastMergedTerritories.length}`;
            // Legacy segment morpher fallback (borders only — shape handler takes priority above)
            for (let i = 0; i < s.lastMergedTerritories.length; i++) {
                drawTerritoryFillOnly(s.fillGraphics, s.lastMergedTerritories[i], s.lastEnclaveMap?.get(i), alpha);
            }
            s.activeBorderTransitionHandler.drawFrame(s.fillGraphics, rawT, borderWidth, borderAlpha);
        } else if (s.activeRopeRenderer) {
            _fillPath = `rope|merged=${s.lastMergedTerritories.length}`;
            // Rope mode: draw target fills, rope handles borders
            for (let i = 0; i < s.lastMergedTerritories.length; i++) {
                drawTerritoryFillOnly(s.fillGraphics, s.lastMergedTerritories[i], s.lastEnclaveMap?.get(i), alpha);
            }
            s.activeRopeRenderer.setVisible(true);
            s.activeRopeRenderer.update(rawT, borderAlpha);
        } else {
            // No transition handler configured — draw static fills as fallback
            // This prevents fills from disappearing when smooth-anim clears graphics
            // but no sub-branch (weight-lerp/splice/morph/rope) is active
            _fillPath = `static-fallback|merged=${s.lastMergedTerritories.length}`;
            for (let i = 0; i < s.lastMergedTerritories.length; i++) {
                const mt = s.lastMergedTerritories[i];
                const isNeutral = !mt.ownerId || mt.ownerId === 'neutral';
                if (isNeutral && GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT) continue;
                drawTerritoryFillOnly(s.fillGraphics, mt, s.lastEnclaveMap?.get(i), alpha);
            }
            // Also draw steady-state borders
            if (s.targetSharedPolylines && s.targetSharedPolylines.length > 0 && borderWidth > 0 && borderAlpha > 0) {
                drawBorderPolylines(s.fillGraphics, s.targetSharedPolylines, 0, borderWidth, borderAlpha);
            }
        }

        // ── Dying Island Dissolution (non-weight-lerp path) ──
        // Islands may outlive the weight-lerp. Draw them in the static/morph path too.
        if (s.dyingIslands.length > 0 && s.fillGraphics) {
            const islandAlpha0 = GAME_CONFIG.VORONOI_ALPHA ?? 0.25;
            s.dyingIslands = s.dyingIslands.filter(island => {
                const islandElapsed = now - island.startTime;
                const islandRawT = Math.min(1, islandElapsed / island.durationMs);
                if (islandRawT >= 1) return false;
                const shrinkT = islandRawT * islandRawT;
                const alphaT = islandRawT < 0.8 ? 1 : 1 - ((islandRawT - 0.8) / 0.2);
                const { polygon, center } = island;
                const shrunkPts: number[] = [];
                for (const [px, py] of polygon) {
                    shrunkPts.push(px + (center.x - px) * shrinkT, py + (center.y - py) * shrinkT);
                }
                s.fillGraphics!.poly(shrunkPts);
                s.fillGraphics!.fill({ color: island.color, alpha: islandAlpha0 * alphaT });
                return true;
            });
        }
        if (rawT >= 1) {
            s.isSmoothTransitioning = false;
            s.isFillTransitioning = false;
            s.prevSharedPolylines = null;
            s.prevMergedTerritories = null;
            s.prevEnclaveMap = null;
            s.activeBorderTransitionHandler = null;
            s.activeShapeTransitionHandler = null;
            s.activeTransitionPlan = null;
            s.transitionStartTime = null;
            s.prevGeometryData = null;
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
    } else {
        _fillPath = `static|smoothTrans=${s.isSmoothTransitioning}|prevPL=${!!s.prevSharedPolylines}|targetPL=${!!s.targetSharedPolylines}|wl=${s.weightLerpActive}`;
    }
    // Log on path change
    if (_fillPath !== (renderPowerVoronoi as any).__lastFillPath) {
        log.sys('FILL-DIAG', `PATH=${_fillPath}`);
        (renderPowerVoronoi as any).__lastFillPath = _fillPath;
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
        // Geometry data snapshot for localized boundary transition
        if (s.lastGeometryData) {
            s.prevGeometryData = s.lastGeometryData;
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

    // ── F-165: Early conquest detection — zero conquered star weight BEFORE geometry ──
    // ONLY when VS weight-lerp transition method is running or about to start.
    // Other transition methods (splice morph, etc.) keep full weights.
    let conquestStarIds: Set<string> | null = null;
    const vsTransitionActive = s.weightLerpActive; // true when VS transition is already animating
    if (s.lastCells && shapeChanged) {
        const prevOwnerMap = new Map(s.lastCells.map(c => [c.siteId, c.ownerId]));
        for (const star of stars) {
            const prevOwner = prevOwnerMap.get(star.id);
            if (prevOwner && prevOwner !== star.ownerId) {
                if (!conquestStarIds) conquestStarIds = new Set();
                conquestStarIds.add(star.id);
            }
        }
    }

    // Suppress conquered star weight only when VS transition will handle rendering.
    // VS transition starts on any conquest (weightLerpActive will be set later this frame),
    // so we suppress whenever conquests are detected AND no other transition method overrides.
    let geomStars = stars;
    const vsWillRun = conquestStarIds && conquestStarIds.size > 0;
    if (vsWillRun || vsTransitionActive) {
        if (conquestStarIds && conquestStarIds.size > 0) {
            geomStars = stars.map(star => {
                if (conquestStarIds!.has(star.id)) {
                    return { ...star, weight: 0 };
                }
                return star;
            });
            log.sys('PowerVoronoi', `F-165: Zeroed weight for ${conquestStarIds.size} conquered stars (VS transition): ${[...conquestStarIds].join(', ')}`);
        }
    }

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
            cxCount: GAME_CONFIG.TERRITORY_CX_COUNT ?? 0,
            cxWeight: GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5,
            disconnectEnabled: Boolean(GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED) && Boolean(connections),
            disconnectDistance: GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400,
            dxWeight: GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3,
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
        stageResult = generateVoronoiTerritoryGeometry(geomStars, connections ?? [], stageConfig);
    }
    if ('kind' in stageResult) {
        // CompileError — recoverable means use last cached frame, non-recoverable clears
        log.error('PVV2', `geometry stage error at ${stageResult.stage}: ${stageResult.message}`);
        log.sys('FILL-DIAG', `PATH=GEOMETRY-ERROR|stage=${stageResult.stage}|recoverable=${stageResult.recoverable}|msg=${stageResult.message}`);
        if (!stageResult.recoverable) {
            if (s.fillGraphics) { console.log('%c[FILL-CLEAR] geometry error (non-recoverable)', 'color:red;font-weight:bold'); s.fillGraphics.clear(); }
            if (s.borderGraphics) { s.borderGraphics.clear(); }
        }
        // On recoverable error: DO NOT clear fills — keep previous frame visible
        return;
    }

    const { cells, mergedTerritories: merged, sharedEdges, rawSharedPolylines: builtRawPolylinesRaw, sharedPolylines: builtPolylinesRaw, enclaveMap, worldBorderPolylines } = stageResult;

    log.renderer('PVV2', `STAGE OUTPUT | cells=${cells.length} merged=${merged.length} polylines=${builtPolylinesRaw.length} chaikinPasses=${Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)}`);

    // Assign colors to merged territories (render concern, not geometry)
    for (const territory of merged) {
        const rawColor = colorUtils.getPlayerColor(territory.ownerId);
        territory.color = adjustColorHSL(rawColor, satMult, lightMult);
    }



    // Detect changed-owner stars for transition tracking
    s.changedSiteIds = null;
    s.changedSitePrevOwners = null;
    if (s.lastCells && shapeChanged) {
        const prevOwnerMap = new Map(s.lastCells.map(c => [c.siteId, c.ownerId]));
        const changed = new Set<string>();
        const prevOwners = new Map<string, string>();
        for (const cell of cells) {
            const prevOwner = prevOwnerMap.get(cell.siteId);
            if (prevOwner && prevOwner !== cell.ownerId) {
                changed.add(cell.siteId);
                prevOwners.set(cell.siteId, prevOwner);
            }
        }
        if (changed.size > 0) {
            s.changedSiteIds = changed;
            s.changedSitePrevOwners = prevOwners;
            log.sys('PowerVoronoi', `Conquest detected: ${changed.size} stars changed owner: ${[...changed].map(id => `${id}(${prevOwners.get(id)}→${cells.find(c => c.siteId === id)?.ownerId})`).join(', ')}`);
        }
    }
    s.lastCells = cells;



    // ── Stage 4: Render Fills ──────────────────────────────────────────────
    if (!s.fillGraphics) {
        s.fillGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(s.fillGraphics);
    }
    console.log('%c[FILL-CLEAR] rebuild', 'color:orange;font-weight:bold');
    s.fillGraphics.clear();
    s.fillGraphics.visible = true;

    // Fills and borders are drawn on the SAME path via fill+stroke in drawTerritoryFillWithHoles.
    // No separate border render pass needed.

    log.renderer('PVV2', `FILLS | ${merged.length} territories, enclaves=${enclaveMap.size}`);
    { const _rp = `rebuild|merged=${merged.length}|enclaves=${enclaveMap.size}`; if (_rp !== (renderPowerVoronoi as any).__lastFillPath) { log.sys('FILL-DIAG', `PATH=${_rp}`); (renderPowerVoronoi as any).__lastFillPath = _rp; } }


    // Steady-state fills: use raw polygon points (no independent smoothing — B-42 fix)
    // Borders are drawn SEPARATELY from sharedPolylines (contested edges only, blended colors)
    for (let i = 0; i < merged.length; i++) {
        drawTerritoryFillOnly(s.fillGraphics, merged[i], enclaveMap.get(i), alpha);
    }

    // Static vertex overlay — show dots immediately when toggle is ON (no transition required)
    if (GAME_CONFIG.DEBUG_MORPH_VERTICES && s.fillGraphics) {
        const vertexSize = GAME_CONFIG.DEBUG_MORPH_VERTEX_SIZE ?? 3;
        const vertexNth = GAME_CONFIG.DEBUG_MORPH_VERTEX_NTH ?? 10;
        for (const terr of merged) {
            for (let vi = 0; vi < terr.points.length; vi++) {
                if (vi % vertexNth !== 0) continue;
                const [px, py] = terr.points[vi];
                s.fillGraphics.circle(px, py, vertexSize);
                s.fillGraphics.fill({ color: 0xbbbbbb, alpha: 0.7 });
                s.fillGraphics.circle(px, py, vertexSize + 1);
                s.fillGraphics.stroke({ width: 0.5, color: 0x333333, alpha: 0.5 });
            }
        }
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
    s.lastWorldBorderPolylines = worldBorderPolylines;
    // Store full geometry data for localized boundary transition snapshots
    s.lastGeometryData = stageResult;

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
        // console.log('[DIAG-VS-SETUP]', { shapeChanged, fxTriggered, transitionMs, changedSites: s.changedSiteIds?.size ?? 0 });
        // Capture attacker star IDs from FX entries BEFORE consuming
        const attackerOriginMap = new Map<string, string[]>();
        for (const entry of territoryTransitions.getUnconsumed()) {
            if (entry.attackerStarIds && entry.attackerStarIds.length > 0) {
                attackerOriginMap.set(entry.starId, entry.attackerStarIds);
            }
            territoryTransitions.markConsumed(entry.starId);
        }

        // ── Ghost-Site Weight Interpolation ──
        // For each conquered star, we create a ghost site at the same position
        // with the OLD owner. Ghost fades out (W→0) while new owner fades in (0→W).
        // This correctly animates the boundary handoff.
        if (s.changedSiteIds && s.changedSiteIds.size > 0 && s.changedSitePrevOwners) {
            const baseDuration = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;
            const tickMs = GAME_CONFIG.BASE_TICK_MS ?? 1050;
            // VS transition duration: TERRITORY_TRANSITION_MS (slider) is the authoritative control.
            // VS_BIND_TO_TICK caps duration to tickMs (prevents overshoot into next tick).
            let wlTransitionMs = baseDuration;
            if (GAME_CONFIG.VS_BIND_TO_TICK && wlTransitionMs > tickMs) {
                wlTransitionMs = tickMs;
            }

            log.renderer('DY4:CONQUEST', JSON.stringify({
                fillStarted: true,
                smoothStarted: true,
                segmentStarted: false,
                prevFillCount: s.lastMergedTerritories?.length ?? 0,
                transitionMs: wlTransitionMs,
            }));

            // console.log('[DIAG-DURATION]', { baseDuration, wlTransitionMs, tickMs });
            const wlStarMargin = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45;
            const wlDefaultWeight = wlStarMargin * wlStarMargin;
            // Power lerp config for loser VS
            const powerLerpStart = GAME_CONFIG.VS_POWER_LERP_START || wlDefaultWeight;  // 0 = full weight
            const powerLerpEnd = GAME_CONFIG.VS_POWER_LERP_END ?? 0;

            const stageConfig: TerritoryGeneratorSettings = {
                starMargin: wlStarMargin,
                corridorEnabled: Boolean(GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED) && Boolean(connections),
                corridorSpacing: GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60,
                cxCount: GAME_CONFIG.TERRITORY_CX_COUNT ?? 0,
                cxWeight: GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5,
                disconnectEnabled: Boolean(GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED) && Boolean(connections),
                disconnectDistance: GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400,
                dxWeight: GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3,
                clusterSplit: Boolean(GAME_CONFIG.TERRITORY_CLUSTER_SPLIT),
                chaikinPasses: Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3))),
                frontierResolution: 0,
                boundaryPad: GAME_CONFIG.CHAIKIN_BOUNDARY_PAD ?? 50,
                boundaryEps: GAME_CONFIG.CHAIKIN_BOUNDARY_EPS ?? 6,
                worldWidth,
                worldHeight,
            };

            // Conquered star stays at weight=0 during entire transition (VS handles visual)
            // Snaps to full weight at transition completion (t=1)
            const prevWeights = new Map<string, number>();
            const targetWeights = new Map<string, number>();
            for (const star of stars) {
                if (star.ownerId) {
                    if (s.changedSiteIds.has(star.id)) {
                        prevWeights.set(star.id, 0);                // suppressed at start
                        targetWeights.set(star.id, wlDefaultWeight); // ramps UP to full during transition
                    } else {
                        prevWeights.set(star.id, wlDefaultWeight);
                        targetWeights.set(star.id, wlDefaultWeight);
                    }
                }
            }

            // ── Dual Virtual Star Algorithm (F-165 v3) ──
            // Both types spawn simultaneously at conquest, travel within one transition duration,
            // cease at t=1 before next steady-state render.
            const ghostSites: PowerSite[] = [];
            const ghostWeightStart = new Map<string, number>();
            const ghostTargetPos = new Map<string, { x: number; y: number }>();
            const starMap = new Map(stars.map(st => [st.id, st]));
            const connList = connections ?? [];

            for (const [starId, prevOwnerId] of s.changedSitePrevOwners) {
                const conqueredStar = starMap.get(starId);
                if (!conqueredStar) continue;

                // ── Victor VS: attacker → conquered ──
                const attackerIds = attackerOriginMap.get(starId);
                if (attackerIds && attackerIds.length > 0) {
                    for (const attackerId of attackerIds) {
                        const attackerStar = starMap.get(attackerId);
                        if (attackerStar) {
                            const vsId = `vs_victor_${starId}_${attackerId}`;
                            ghostSites.push({
                                x: attackerStar.x,
                                y: attackerStar.y,
                                weight: wlDefaultWeight,  // Victor VS: full weight
                                ownerId: conqueredStar.ownerId!,  // NEW owner
                                starId: vsId,
                            });
                            ghostTargetPos.set(vsId, { x: conqueredStar.x, y: conqueredStar.y });
                        }
                    }
                }

                // ── Loser VS: conquered → connected loser-owned stars ──
                const loserConnectedStars = connList
                    .filter(c => (c.sourceId === starId || c.targetId === starId))
                    .map(c => c.sourceId === starId ? c.targetId : c.sourceId)
                    .filter(connId => {
                        const connStar = starMap.get(connId);
                        return connStar && connStar.ownerId === prevOwnerId;
                    });

                if (loserConnectedStars.length > 0) {
                    // Retreat: one VS per connected loser-owned star
                    for (const connId of loserConnectedStars) {
                        const connStar = starMap.get(connId)!;
                        const vsId = `vs_loser_${starId}_${connId}`;
                        ghostSites.push({
                            x: conqueredStar.x,       // starts at CONQUERED
                            y: conqueredStar.y,
                            weight: powerLerpStart,    // Loser VS: config-driven start weight
                            ownerId: prevOwnerId,     // OLD owner
                            starId: vsId,
                        });
                        ghostTargetPos.set(vsId, { x: connStar.x, y: connStar.y });
                        ghostWeightStart.set(vsId, powerLerpStart);  // track for per-frame lerp
                    }
                } else {
                    // ISLAND: loser has no connected stars — this is an isolated single-star territory.
                    // Instead of just creating a fade ghost (which doesn't look right),
                    // capture the old territory polygon and register a dying island animation.
                    const vsId = `vs_loser_${starId}_fade`;
                    ghostSites.push({
                        x: conqueredStar.x,
                        y: conqueredStar.y,
                        weight: powerLerpStart,    // Loser VS: config-driven start weight
                        ownerId: prevOwnerId,     // OLD owner
                        starId: vsId,
                    });
                    ghostWeightStart.set(vsId, powerLerpStart);

                    // Capture the old island territory polygon for dissolution animation
                    if (s.lastMergedTerritories) {
                        const islandTerritory = s.lastMergedTerritories.find(mt =>
                            mt.ownerId === prevOwnerId &&
                            mt.points.length > 2
                        );
                        if (islandTerritory) {
                            // Compute centroid of the island polygon
                            let cx = 0, cy = 0;
                            const pts = islandTerritory.points;
                            for (const [px, py] of pts) { cx += px; cy += py; }
                            cx /= pts.length; cy /= pts.length;
                            s.dyingIslands.push({
                                polygon: pts.map(p => [p[0], p[1]] as [number, number]),
                                center: { x: cx, y: cy },
                                color: islandTerritory.color,
                                startTime: now,
                                durationMs: wlTransitionMs,
                            });
                            log.sys('TMAP-WeightLerp', `DYING ISLAND | owner=${prevOwnerId} star=${starId} pts=${pts.length}`);
                        }
                    }
                }
            }

            s.weightLerpActive = true;
            s.weightLerpStartTime = now;
            s.weightLerpDurationMs = wlTransitionMs;
            s.weightLerpStars = stars;
            s.weightLerpConnections = connections ?? [];
            s.weightLerpConfig = stageConfig;
            s.weightLerpConqueredStarIds = new Set(s.changedSiteIds);
            s.weightLerpPrevWeights = prevWeights;
            s.weightLerpTargetWeights = targetWeights;
            s.weightLerpGhostSites = ghostSites;
            s.weightLerpGhostWeightStart = ghostWeightStart;
            s.weightLerpGhostTargetPos = ghostTargetPos;
            s.activeTransitionPlan = null;
            s.transitionStartTime = null;
            // Cancel all old transition state — weight-lerp replaces everything
            s.isSmoothTransitioning = false;
            s.isFillTransitioning = false;
            s.isBorderTransitioning = false;
            s.activeShapeTransitionHandler = null;
            s.activeBorderTransitionHandler = null;
            log.sys('TMAP-WeightLerp', `GHOST TRANSITION | conquered=${[...s.changedSiteIds].join(',')} ghosts=${ghostSites.length} duration=${wlTransitionMs}ms`);
        }
        
        // A3: Force start even if null, though handled differently here
        if (GAME_CONFIG.DEBUG_DY4_FORCE_TRANSITION_START) {
            log.sys('PVV2', 'A3: DEBUG_DY4_FORCE_TRANSITION_START triggered');
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

            if (borderTransMode === 'pixi_mesh_rope' && !GAME_CONFIG.DEBUG_DY4_DISABLE_BORDER_TRANSITION) {
                const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5;
                s.activeRopeRenderer = new RopeBorderRenderer(s.prevSharedPolylines, s.targetSharedPolylines, easing, resampleN, borderWidth, overshoot);
                s.activeRopeRenderer.addTo(voronoiContainer);
            }
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

// ── Diagnostics Export ──────────────────────────────────────────────────────

/**
 * Synthesizes a CanonicalGeometrySnapshot from the internal PowerVoronoi cache state.
 * This satisfies the TransitionSnapshotRecorder's requirement for canvas rendering
 * without needing the legacy pipeline to run a full geometry compiler.
 */
export function exportPowerVoronoiGeometrySnapshot(
    type: 'current' | 'previous',
    version: string,
    ownershipVersion: string,
    state?: PVV2RendererState
): import('../territory/contracts/GeometryContracts').CanonicalGeometrySnapshot | null {
    const s = state ?? defaultState;
    const merged = type === 'current' ? s.lastMergedTerritories : s.prevMergedTerritories;
    const borders = type === 'current' ? s.targetSharedPolylines : s.prevSharedPolylines;

    if (!merged || !borders) {
        console.warn(`[exportPowerVoronoiGeometrySnapshot] Returning null for '${type}'. merged=${!!merged}, borders=${!!borders}`);
        return null;
    }

    return {
        version,
        sourceMode: 'unified_vector',
        sourceStyle: 'canonical' as any,
        ownershipVersion,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: merged.map((m, i) => ({
            regionId: `region_${m.ownerId}_${i}`,
            ownerId: m.ownerId,
            points: m.points,
            area: 0,
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            confidence: 1.0,
        })),
        frontierPolylines: borders.map((b, i) => {
            const [ownerA, ownerB] = b.ownerPairKey.split('|');
            return {
                frontierId: `frontier_${b.ownerPairKey}_${i}`,
                ownerA,
                ownerB,
                ownerPairKey: b.ownerPairKey,
                points: b.points,
                confidence: 1.0,
            };
        }),
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version,
            ownershipVersion,
            worldBounds: { width: 0, height: 0 },
            vertices: new Map(),
            sections: new Map(),
            loops: [],
            sectionsByOwnerPair: new Map(),
            sectionsByVertex: new Map(),
            sectionsByOwner: new Map(),
        },
        shells: [],
        shellLoops: [],
        provenance: {
            derivedFromField: false,
            notes: ['Synthesized from PowerVoronoiRenderer cache'],
        },
        diagnostics: {
            topologyReliable: false,
            identityReliable: false,
            closureReliable: true,
            notes: ['Generated locally from output cache for legacy transition snapshotting'],
        }
    };
}
