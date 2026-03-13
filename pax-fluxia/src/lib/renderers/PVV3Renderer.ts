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

// ── Types ──────────────────────────────────────────────────────────────────

/** A site in the power diagram — star or virtual point with weight. */
interface PowerSite {
    x: number;
    y: number;
    weight: number;
    ownerId: string;
    starId: string;
    virtual?: 'corridor' | 'disconnect';
}

/** Polygon output from the power diagram, augmented with ownership info. */
interface TerritoryCell {
    points: [number, number][];
    ownerId: string;
    siteId: string;
}

/** Merged polygon for same-owner territory rendering. */
interface MergedTerritory {
    points: [number, number][];     // [[x,y], ...] closed polygon
    ownerId: string;
    color: number;          // hex fill color
}

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedShapeFingerprint = '';
let cachedVisualFingerprint = '';
let fillGraphics: PIXI.Graphics | null = null;
let borderGraphics: PIXI.Graphics | null = null;



// ── Smooth Transition State (Contested Border Mode) ─────────────────────────

/** A continuous polyline of chained shared border edges between two owners. */
interface SharedPolyline {
    points: [number, number][];  // ordered points of the chained polyline
    ownerPairKey: string;        // sorted owner pair key for matching
    color: number;               // blended color for rendering
}

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

// ── Shared Border Edge Extraction ──────────────────────────────────────────

/** A border edge segment shared between two different owners. */
interface SharedBorderEdge {
    x1: number; y1: number;
    x2: number; y2: number;
    ownerA: string;
    ownerB: string;
    colorA: number;
    colorB: number;
    siteIdA: string;  // star/cell identity on side A
    siteIdB: string;  // star/cell identity on side B
}

/**
 * Extract edges shared between cells of DIFFERENT owners (contested borders).
 * Each edge appears once with ownerA/ownerB — these are the boundaries where
 * territory borders should overlap and blend.
 */
function extractSharedEdges(cells: TerritoryCell[]): SharedBorderEdge[] {
    // Map: edgeKey → { owners+siteIds per side, coordinates }
    const edgeOwners = new Map<string, {
        sides: { ownerId: string; siteId: string }[];
        pts: [number, number, number, number];
    }>();

    for (const cell of cells) {
        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            if (!edgeOwners.has(key)) {
                edgeOwners.set(key, {
                    sides: [{ ownerId: cell.ownerId, siteId: cell.siteId }],
                    pts: [pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]],
                });
            } else {
                const entry = edgeOwners.get(key)!;
                // Only add if this is a different cell (same edge shared by two cells)
                if (!entry.sides.some(s => s.siteId === cell.siteId)) {
                    entry.sides.push({ ownerId: cell.ownerId, siteId: cell.siteId });
                }
            }
        }
    }

    // Collect only edges with exactly 2 different owners (contested boundaries)
    const shared: SharedBorderEdge[] = [];
    for (const [, entry] of edgeOwners) {
        if (entry.sides.length === 2 &&
            entry.sides[0].ownerId !== entry.sides[1].ownerId &&
            entry.sides[0].ownerId !== '__disconnect__' &&
            entry.sides[1].ownerId !== '__disconnect__') {
            shared.push({
                x1: entry.pts[0], y1: entry.pts[1],
                x2: entry.pts[2], y2: entry.pts[3],
                ownerA: entry.sides[0].ownerId,
                ownerB: entry.sides[1].ownerId,
                colorA: 0,
                colorB: 0,
                siteIdA: entry.sides[0].siteId,
                siteIdB: entry.sides[1].siteId,
            });
        }
    }
    return shared;
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

/** Resample a polygon to `n` evenly-spaced points along its perimeter (CLOSED — wraps last to first). */
function resamplePolygon(pts: [number, number][], n: number): [number, number][] {
    if (pts.length <= 1 || n <= 1) return pts.slice();

    // Compute cumulative arc lengths
    const arcLens: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
        arcLens.push(arcLens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const totalLen = arcLens[arcLens.length - 1];
    if (totalLen === 0) return pts.slice();

    const result: [number, number][] = [];
    let segIdx = 0;
    for (let i = 0; i < n; i++) {
        const targetLen = (i / n) * totalLen;
        while (segIdx < arcLens.length - 2 && arcLens[segIdx + 1] < targetLen) segIdx++;
        const segLen = arcLens[segIdx + 1] - arcLens[segIdx];
        const t = segLen > 0 ? (targetLen - arcLens[segIdx]) / segLen : 0;
        result.push([
            pts[segIdx][0] + (pts[segIdx + 1][0] - pts[segIdx][0]) * t,
            pts[segIdx][1] + (pts[segIdx + 1][1] - pts[segIdx][1]) * t,
        ]);
    }
    // Close the polygon
    result.push([result[0][0], result[0][1]]);
    return result;
}

/** Resample an OPEN polyline to `n` evenly-spaced points (no wrapping). */
function resamplePolyline(pts: [number, number][], n: number): [number, number][] {
    if (pts.length <= 1 || n <= 1) return pts.slice();

    const arcLens: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
        arcLens.push(arcLens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const totalLen = arcLens[arcLens.length - 1];
    if (totalLen === 0) return pts.slice();

    const result: [number, number][] = [];
    let segIdx = 0;
    for (let i = 0; i < n; i++) {
        const targetLen = (i / (n - 1)) * totalLen;  // n-1 so last point = endpoint
        while (segIdx < arcLens.length - 2 && arcLens[segIdx + 1] < targetLen) segIdx++;
        const segLen = arcLens[segIdx + 1] - arcLens[segIdx];
        const t = segLen > 0 ? (targetLen - arcLens[segIdx]) / segLen : 0;
        result.push([
            pts[segIdx][0] + (pts[segIdx + 1][0] - pts[segIdx][0]) * t,
            pts[segIdx][1] + (pts[segIdx + 1][1] - pts[segIdx][1]) * t,
        ]);
    }
    return result;
}

/** Get centroid of a polygon. */
function polygonCentroid(pts: [number, number][]): [number, number] {
    let cx = 0, cy = 0;
    const n = pts.length - 1;  // last point = first (closed)
    for (let i = 0; i < n; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    return n > 0 ? [cx / n, cy / n] : [0, 0];
}

/** Lerp two equal-length polygon arrays. */
function lerpPolygon(from: [number, number][], to: [number, number][], t: number): [number, number][] {
    const result: [number, number][] = [];
    const len = Math.min(from.length, to.length);
    for (let i = 0; i < len; i++) {
        result.push([
            from[i][0] + (to[i][0] - from[i][0]) * t,
            from[i][1] + (to[i][1] - from[i][1]) * t,
        ]);
    }
    return result;
}

/**
 * Chaikin corner-cutting subdivision for open polylines.
 * Preserves first and last points; interior corners are smoothed by
 * replacing each segment midpoint region with 25%/75% cut points.
 * @param pts Open polyline as array of [x, y] tuples
 * @param passes Number of smoothing iterations (0 = no change)
 */
function chaikinSmoothPolyline(pts: [number, number][], passes: number): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;

    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [current[0]]; // preserve start
        for (let i = 0; i < n - 1; i++) {
            const [ax, ay] = current[i];
            const [bx, by] = current[i + 1];
            // For first/last segment: keep the original endpoint and add one cut point
            if (i === 0) {
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            } else if (i === n - 2) {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            } else {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            }
        }
        next.push(current[n - 1]); // preserve end
        current = next;
    }
    return current;
}


/** Closed-polygon Chaikin: every edge including last->first gets corner-cut uniformly. */
function chaikinSmoothPolygon(pts: [number, number][], passes: number): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;

    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [];
        for (let i = 0; i < n; i++) {
            const [ax, ay] = current[i];
            const [bx, by] = current[(i + 1) % n];
            next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
        }
        current = next;
    }
    return current;
}
/** Chain shared border edges into continuous polylines, grouped by owner-pair.
 *  Edges between the same two owners that share endpoints get merged into polylines. */
function chainSharedEdgesIntoPolylines(edges: SharedBorderEdge[], colorLookup?: (ownerA: string, ownerB: string) => number, smoothPasses = 0): SharedPolyline[] {
    // Group edges by sorted owner pair
    const byPair = new Map<string, SharedBorderEdge[]>();
    for (const e of edges) {
        const key = e.ownerA < e.ownerB ? `${e.ownerA}|${e.ownerB}` : `${e.ownerB}|${e.ownerA}`;
        if (!byPair.has(key)) byPair.set(key, []);
        byPair.get(key)!.push(e);
    }

    const result: SharedPolyline[] = [];
    const SNAP = 3;  // endpoint snapping tolerance (pixels)

    for (const [pairKey, pairEdges] of byPair) {
        // Build adjacency by endpoint
        const ptKey = (x: number, y: number) => `${Math.round(x / SNAP) * SNAP},${Math.round(y / SNAP) * SNAP}`;
        const adj = new Map<string, { x: number; y: number; next: string }[]>();
        const used = new Array(pairEdges.length).fill(false);

        for (let i = 0; i < pairEdges.length; i++) {
            const e = pairEdges[i];
            const k1 = ptKey(e.x1, e.y1);
            const k2 = ptKey(e.x2, e.y2);
            if (!adj.has(k1)) adj.set(k1, []);
            if (!adj.has(k2)) adj.set(k2, []);
            adj.get(k1)!.push({ x: e.x2, y: e.y2, next: k2 });
            adj.get(k2)!.push({ x: e.x1, y: e.y1, next: k1 });
        }

        // Greedy chain: start from an endpoint (degree 1) or any unused edge
        while (true) {
            // Find an unused edge
            let startIdx = -1;
            for (let i = 0; i < pairEdges.length; i++) {
                if (!used[i]) { startIdx = i; break; }
            }
            if (startIdx < 0) break;

            // Simple: just trace edges greedily
            const chain: [number, number][] = [];
            used[startIdx] = true;
            const e = pairEdges[startIdx];
            chain.push([e.x1, e.y1]);
            chain.push([e.x2, e.y2]);

            // Extend forward: try to find next unused edge that connects
            let extended = true;
            while (extended) {
                extended = false;
                const last = chain[chain.length - 1];
                const lk = ptKey(last[0], last[1]);
                for (let i = 0; i < pairEdges.length; i++) {
                    if (used[i]) continue;
                    const ei = pairEdges[i];
                    if (ptKey(ei.x1, ei.y1) === lk) {
                        chain.push([ei.x2, ei.y2]);
                        used[i] = true;
                        extended = true;
                        break;
                    }
                    if (ptKey(ei.x2, ei.y2) === lk) {
                        chain.push([ei.x1, ei.y1]);
                        used[i] = true;
                        extended = true;
                        break;
                    }
                }
            }

            // Extend backward similarly
            extended = true;
            while (extended) {
                extended = false;
                const first = chain[0];
                const fk = ptKey(first[0], first[1]);
                for (let i = 0; i < pairEdges.length; i++) {
                    if (used[i]) continue;
                    const ei = pairEdges[i];
                    if (ptKey(ei.x2, ei.y2) === fk) {
                        chain.unshift([ei.x1, ei.y1]);
                        used[i] = true;
                        extended = true;
                        break;
                    }
                    if (ptKey(ei.x1, ei.y1) === fk) {
                        chain.unshift([ei.x2, ei.y2]);
                        used[i] = true;
                        extended = true;
                        break;
                    }
                }
            }

            const [ownerA, ownerB] = pairKey.split('|');
            const color = colorLookup ? colorLookup(ownerA, ownerB) : 0x888888;

            // Apply Chaikin smoothing to convert straight Voronoi edges into smooth arcs
            const smoothed = smoothPasses > 0 ? chaikinSmoothPolyline(chain, smoothPasses) : chain;
            result.push({ points: smoothed, ownerPairKey: pairKey, color });
        }
    }

    return result;
}


// -- Shared-Boundary Smoothing ----------------------------------------------

/**
 * Replace shared-edge segments in territory polygons with smoothed polyline coordinates.
 * World-boundary vertices (not matched to any shared polyline) stay straight.
 * Adjacent territories get identical smoothed coordinates at their shared border.
 *
 * FIX: Rotates polygon to start at a non-interior vertex (junction / world boundary)
 * so shared edges never span the wrap-around point.
 */
function substituteSmoothedEdges(
    merged: MergedTerritory[],
    rawPolylines: SharedPolyline[],
    smoothedPolylines: SharedPolyline[]
): void {
    const SNAP = 3;
    const ptKey = (x: number, y: number) => `${Math.round(x / SNAP) * SNAP},${Math.round(y / SNAP) * SNAP}`;

    // Build mappings: raw polyline vertex keys -> smoothed polyline points
    interface PolylineMapping {
        rawKeys: string[];
        smoothedPoints: [number, number][];
        ownerPairKey: string;
    }
    const mappings: PolylineMapping[] = [];
    for (let pi = 0; pi < rawPolylines.length && pi < smoothedPolylines.length; pi++) {
        const raw = rawPolylines[pi];
        const smoothed = smoothedPolylines[pi];
        mappings.push({
            rawKeys: raw.points.map(p => ptKey(p[0], p[1])),
            smoothedPoints: smoothed.points as [number, number][],
            ownerPairKey: raw.ownerPairKey,
        });
    }

    // Collect interior vertex keys (not endpoints) across all polylines.
    // Starting a polygon scan at an interior vertex causes wrap-around mismatches.
    const interiorKeys = new Set<string>();
    for (const m of mappings) {
        for (let k = 1; k < m.rawKeys.length - 1; k++) {
            interiorKeys.add(m.rawKeys[k]);
        }
    }

    for (const territory of merged) {
        let pts = territory.points;
        if (pts.length < 3) continue;

        // ---- Rotate polygon to start at a non-interior vertex ----
        // This guarantees shared edges are encountered as complete runs.
        let rotateIdx = 0;
        for (let ri = 0; ri < pts.length; ri++) {
            if (!interiorKeys.has(ptKey(pts[ri][0], pts[ri][1]))) {
                rotateIdx = ri;
                break;
            }
        }
        if (rotateIdx > 0) {
            pts = [...pts.slice(rotateIdx), ...pts.slice(0, rotateIdx)];
        }

        // ---- Linear scan with forward/reverse matching ----
        const result: [number, number][] = [];
        let i = 0;

        while (i < pts.length) {
            const vKey = ptKey(pts[i][0], pts[i][1]);
            let matched = false;

            for (const mapping of mappings) {
                // Only consider polylines involving this territory's owner
                const [oA, oB] = mapping.ownerPairKey.split('|');
                if (territory.ownerId !== oA && territory.ownerId !== oB) continue;

                const rk = mapping.rawKeys;

                // Forward match: polygon vertices align with raw polyline start->end
                if (vKey === rk[0] && rk.length >= 2) {
                    let matchLen = 1;
                    for (let r = 1; r < rk.length && (i + matchLen) < pts.length; r++) {
                        if (ptKey(pts[i + matchLen][0], pts[i + matchLen][1]) === rk[r]) matchLen++;
                        else break;
                    }
                    if (matchLen >= 2) {
                        for (const sp of mapping.smoothedPoints) {
                            if (result.length > 0) {
                                const last = result[result.length - 1];
                                if (ptKey(last[0], last[1]) === ptKey(sp[0], sp[1])) continue;
                            }
                            result.push(sp);
                        }
                        i += matchLen;
                        matched = true;
                        break;
                    }
                }

                // Reverse match: polygon traverses polyline end->start
                if (vKey === rk[rk.length - 1] && rk.length >= 2) {
                    let matchLen = 1;
                    for (let r = rk.length - 2; r >= 0 && (i + matchLen) < pts.length; r--) {
                        if (ptKey(pts[i + matchLen][0], pts[i + matchLen][1]) === rk[r]) matchLen++;
                        else break;
                    }
                    if (matchLen >= 2) {
                        const reversed = [...mapping.smoothedPoints].reverse();
                        for (const sp of reversed) {
                            if (result.length > 0) {
                                const last = result[result.length - 1];
                                if (ptKey(last[0], last[1]) === ptKey(sp[0], sp[1])) continue;
                            }
                            result.push(sp);
                        }
                        i += matchLen;
                        matched = true;
                        break;
                    }
                }
            }

            if (!matched) {
                // World-boundary vertex or unmatched - keep as-is
                result.push(pts[i]);
                i++;
            }
        }

        territory.points = result;
    }
}
// ── Frontier Loop Assembly ─────────────────────────────────────────────────

/** A continuous closed frontier loop for one player's territory boundary. */
interface FrontierLoop {
    points: [number, number][];  // closed loop — first point ≈ last point
    ownerId: string;
}

/**
 * Assemble per-pair polylines into per-player closed frontier loops.
 *
 * Each SharedPolyline represents a boundary between two owners. A player's
 * complete frontier is formed by chaining all polylines involving that player
 * end-to-end at junction points (where 3+ territories meet).
 *
 * Returns a Map from ownerId → array of closed loops (multiple loops if
 * the player has disconnected territory regions).
 *
 * mapBounds: { xMin, yMin, xMax, yMax } — the Voronoi clip rectangle.
 * Open chains whose endpoints lie on the boundary are closed by walking
 * the map perimeter clockwise.
 */

/** Classify which edge of a rectangle a point lies on (within tolerance). */
function classifyEdge(
    x: number, y: number,
    xMin: number, yMin: number, xMax: number, yMax: number,
    tol: number = 8,
): 'top' | 'right' | 'bottom' | 'left' | null {
    // Check edges in priority order (corners go to the first edge found)
    if (Math.abs(y - yMin) <= tol) return 'top';
    if (Math.abs(x - xMax) <= tol) return 'right';
    if (Math.abs(y - yMax) <= tol) return 'bottom';
    if (Math.abs(x - xMin) <= tol) return 'left';
    return null;
}

/** Walk clockwise from point A to point B along rectangle perimeter,
 *  returning intermediate corner points (NOT including A or B themselves). */
function walkBoundaryCW(
    ax: number, ay: number, edgeA: string,
    bx: number, by: number, edgeB: string,
    xMin: number, yMin: number, xMax: number, yMax: number,
): [number, number][] {
    // CW edge order: top → right → bottom → left
    const edgeOrder = ['top', 'right', 'bottom', 'left'];
    const corners: Record<string, [number, number]> = {
        'top→right': [xMax, yMin],
        'right→bottom': [xMax, yMax],
        'bottom→left': [xMin, yMax],
        'left→top': [xMin, yMin],
    };

    const pts: [number, number][] = [];
    let current = edgeA;
    let safety = 0;

    while (current !== edgeB && safety < 5) {
        const idx = edgeOrder.indexOf(current);
        const next = edgeOrder[(idx + 1) % 4];
        const cornerKey = `${current}→${next}`;
        if (corners[cornerKey]) {
            pts.push(corners[cornerKey]);
        }
        current = next;
        safety++;
    }

    return pts;
}

function assembleFrontierLoops(
    polylines: SharedPolyline[],
    mapBounds?: { xMin: number; yMin: number; xMax: number; yMax: number },
): Map<string, FrontierLoop[]> {
    const SNAP = 4;  // junction snapping tolerance (px)
    const ptKey = (x: number, y: number) =>
        `${Math.round(x / SNAP) * SNAP},${Math.round(y / SNAP) * SNAP}`;

    // Accumulate all diagnostic lines into one string
    const diag: string[] = [];
    diag.push(`═══ assembleFrontierLoops: ${polylines.length} polylines ═══`);

    // Build endpoint adjacency table
    const endpointCounts = new Map<string, number>();
    const polyTable: { idx: number; pair: string; pts: number; start: string; end: string; startKey: string; endKey: string }[] = [];

    for (let pi = 0; pi < polylines.length; pi++) {
        const p = polylines[pi];
        const pts = p.points;
        if (pts.length < 2) { diag.push(`  poly[${pi}] SKIP (${pts.length} pts)`); continue; }
        const sk = ptKey(pts[0][0], pts[0][1]);
        const ek = ptKey(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        endpointCounts.set(sk, (endpointCounts.get(sk) ?? 0) + 1);
        endpointCounts.set(ek, (endpointCounts.get(ek) ?? 0) + 1);
        polyTable.push({
            idx: pi, pair: p.ownerPairKey, pts: pts.length,
            start: `(${pts[0][0].toFixed(0)},${pts[0][1].toFixed(0)})`,
            end: `(${pts[pts.length - 1][0].toFixed(0)},${pts[pts.length - 1][1].toFixed(0)})`,
            startKey: sk, endKey: ek,
        });
    }

    // Flag dangles
    const dangles: string[] = [];
    for (const [key, count] of endpointCounts) {
        if (count === 1) dangles.push(key);
    }
    if (dangles.length > 0) {
        diag.push(`⚠ ${dangles.length} DANGLING endpoints: ${dangles.join(', ')}`);
    } else {
        diag.push(`✓ All endpoints paired`);
    }

    // Group polylines by each owner they touch
    const byOwner = new Map<string, { points: [number, number][]; startKey: string; endKey: string; polyIdx: number }[]>();

    for (let pi = 0; pi < polylines.length; pi++) {
        const poly = polylines[pi];
        const [ownerA, ownerB] = poly.ownerPairKey.split('|');
        const pts = poly.points;
        if (pts.length < 2) continue;

        const startKey = ptKey(pts[0][0], pts[0][1]);
        const endKey = ptKey(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        const segment = { points: pts, startKey, endKey, polyIdx: pi };

        for (const owner of [ownerA, ownerB]) {
            if (!byOwner.has(owner)) byOwner.set(owner, []);
            byOwner.get(owner)!.push(segment);
        }
    }

    const result = new Map<string, FrontierLoop[]>();

    for (const [ownerId, segments] of byOwner) {
        const loops: FrontierLoop[] = [];
        const openChains: { points: [number, number][]; chainLog: string[] }[] = [];
        const used = new Array(segments.length).fill(false);

        while (true) {
            // Find first unused segment
            let startIdx = -1;
            for (let i = 0; i < segments.length; i++) {
                if (!used[i]) { startIdx = i; break; }
            }
            if (startIdx < 0) break;

            // Start a chain from this segment
            used[startIdx] = true;
            const chain: [number, number][] = [...segments[startIdx].points];
            const chainLog: string[] = [`seg[${segments[startIdx].polyIdx}]`];

            // Extend forward: find next segment whose start matches our end
            let extended = true;
            let fwdExtensions = 0;
            while (extended) {
                extended = false;
                const lastPt = chain[chain.length - 1];
                const lastKey = ptKey(lastPt[0], lastPt[1]);

                for (let i = 0; i < segments.length; i++) {
                    if (used[i]) continue;
                    const seg = segments[i];

                    if (seg.startKey === lastKey) {
                        for (let j = 1; j < seg.points.length; j++) {
                            chain.push(seg.points[j]);
                        }
                        used[i] = true;
                        extended = true;
                        fwdExtensions++;
                        chainLog.push(`+F[${seg.polyIdx}]`);
                        break;
                    }
                    if (seg.endKey === lastKey) {
                        for (let j = seg.points.length - 2; j >= 0; j--) {
                            chain.push(seg.points[j]);
                        }
                        used[i] = true;
                        extended = true;
                        fwdExtensions++;
                        chainLog.push(`+F[${seg.polyIdx}]R`);
                        break;
                    }
                }
            }

            // Extend backward: find next segment whose end matches our start
            extended = true;
            let bwdExtensions = 0;
            while (extended) {
                extended = false;
                const firstPt = chain[0];
                const firstKey = ptKey(firstPt[0], firstPt[1]);

                for (let i = 0; i < segments.length; i++) {
                    if (used[i]) continue;
                    const seg = segments[i];

                    if (seg.endKey === firstKey) {
                        for (let j = seg.points.length - 2; j >= 0; j--) {
                            chain.unshift(seg.points[j]);
                        }
                        used[i] = true;
                        extended = true;
                        bwdExtensions++;
                        chainLog.unshift(`+B[${seg.polyIdx}]`);
                        break;
                    }
                    if (seg.startKey === firstKey) {
                        for (let j = 1; j < seg.points.length; j++) {
                            chain.unshift(seg.points[j]);
                        }
                        used[i] = true;
                        extended = true;
                        bwdExtensions++;
                        chainLog.unshift(`+B[${seg.polyIdx}]R`);
                        break;
                    }
                }
            }

            // Check if naturally closed
            const first = chain[0];
            const last = chain[chain.length - 1];
            const isClosed = ptKey(first[0], first[1]) === ptKey(last[0], last[1]);

            if (isClosed) {
                chain[chain.length - 1] = [first[0], first[1]];
                const status = chain.length >= 4 ? '✓' : '⚠REJECTED';
                diag.push(`  [${ownerId}] ${status} ${chain.length}pts f=${fwdExtensions} b=${bwdExtensions} closed=true | ${chainLog.join(' → ')}`);
                if (chain.length >= 4) {
                    loops.push({ points: chain, ownerId });
                }
            } else {
                // Open chain — collect for boundary merge below
                diag.push(`  [${ownerId}] OPEN ${chain.length}pts f=${fwdExtensions} b=${bwdExtensions} | ${chainLog.join(' → ')}`);
                if (chain.length >= 2) {
                    openChains.push({ points: chain, chainLog });
                }
            }
        }

        // ── Boundary merge: stitch all open chains into one closed polygon ──
        if (openChains.length > 0 && mapBounds) {
            const { xMin, yMin, xMax, yMax } = mapBounds;

            // Compute CW perimeter position (0..4) for a point on the boundary
            // top=0→1, right=1→2, bottom=2→3, left=3→4
            const perimPos = (x: number, y: number): number => {
                const edge = classifyEdge(x, y, xMin, yMin, xMax, yMax);
                const w = xMax - xMin, h = yMax - yMin;
                if (edge === 'top') return 0 + (x - xMin) / w;
                if (edge === 'right') return 1 + (y - yMin) / h;
                if (edge === 'bottom') return 2 + (xMax - x) / w;
                if (edge === 'left') return 3 + (yMax - y) / h;
                return -1; // not on boundary
            };

            // For each open chain, compute perimeter pos of its endpoints
            type OpenChainEntry = {
                points: [number, number][];
                startPerim: number;
                endPerim: number;
                startEdge: string;
                endEdge: string;
                chainLog: string[];
            };
            const entries: OpenChainEntry[] = [];
            for (const oc of openChains) {
                const pts = oc.points;
                const s = pts[0], e = pts[pts.length - 1];
                const sEdge = classifyEdge(s[0], s[1], xMin, yMin, xMax, yMax);
                const eEdge = classifyEdge(e[0], e[1], xMin, yMin, xMax, yMax);
                if (sEdge && eEdge) {
                    entries.push({
                        points: pts,
                        startPerim: perimPos(s[0], s[1]),
                        endPerim: perimPos(e[0], e[1]),
                        startEdge: sEdge,
                        endEdge: eEdge,
                        chainLog: oc.chainLog,
                    });
                } else {
                    // Can't classify — push as individual loop (force close)
                    pts.push([pts[0][0], pts[0][1]]);
                    if (pts.length >= 4) loops.push({ points: pts, ownerId });
                    diag.push(`  [${ownerId}] ⚠force-closed ${pts.length}pts (non-boundary endpoint)`);
                }
            }

            if (entries.length > 0) {
                // Sort by endPerim (CW order around perimeter)
                entries.sort((a, b) => a.endPerim - b.endPerim);

                // Stitch: chain1-end →(walk)→ chain2-start → chain2 → chain2-end →(walk)→ ...
                const merged: [number, number][] = [];
                const mergeLog: string[] = [];

                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i];
                    const nextEntry = entries[(i + 1) % entries.length];

                    // Append this chain's points
                    for (const pt of entry.points) merged.push(pt);
                    mergeLog.push(`C${i}(${entry.points.length}pts)`);

                    // Walk from this chain's end to next chain's start
                    const walkPts = walkBoundaryCW(
                        entry.points[entry.points.length - 1][0],
                        entry.points[entry.points.length - 1][1],
                        entry.endEdge,
                        nextEntry.points[0][0],
                        nextEntry.points[0][1],
                        nextEntry.startEdge,
                        xMin, yMin, xMax, yMax,
                    );
                    for (const wp of walkPts) merged.push(wp);
                    if (walkPts.length > 0) mergeLog.push(`W+${walkPts.length}`);
                }

                // Close the merged polygon
                if (merged.length >= 2) {
                    merged.push([merged[0][0], merged[0][1]]);
                }

                diag.push(`  [${ownerId}] ✓MERGED ${merged.length}pts from ${entries.length} open chains | ${mergeLog.join(' → ')}`);

                if (merged.length >= 4) {
                    loops.push({ points: merged, ownerId });
                }
            }
        } else if (openChains.length > 0) {
            // No map bounds — force close each open chain individually
            for (const oc of openChains) {
                oc.points.push([oc.points[0][0], oc.points[0][1]]);
                if (oc.points.length >= 4) loops.push({ points: oc.points, ownerId });
            }
        }

        if (loops.length > 0) {
            result.set(ownerId, loops);
        }
    }

    // Emit one consolidated log + table
    log.renderer('FrontierDiag', diag.join('\n'));
    if (polyTable.length > 0) {
        console.table(polyTable);
    }


    return result;
}

// ── Frontier Loop Parameterization (Step C) ───────────────────────────────

/**
 * Parameterize two frontier loops (F1, F2) to N control points and align
 * them at the longest static section.
 *
 * Algorithm:
 * 1. Resample both loops to N evenly-spaced CPs via arc-length
 * 2. For each possible rotation offset k of F2 relative to F1:
 *    count how many CPs are "static" (within ε pixels of each other)
 * 3. Find the rotation that maximizes the longest contiguous run of statics
 * 4. Rotate F2's CPs by that offset so CP[0] aligns at the static anchor
 *
 * Returns { f1CPs, f2CPs } — same length, aligned, ready for lerp.
 */
function parameterizeAndAlign(
    f1Loop: [number, number][],
    f2Loop: [number, number][],
    n: number,
    epsilon: number = 2,
): { f1CPs: [number, number][]; f2CPs: [number, number][] } {
    // Guard: degenerate loops (< 3 points can't form a polygon)
    if (f1Loop.length < 3 || f2Loop.length < 3) {
        // Return single-point arrays — caller will handle gracefully
        const fallback: [number, number] = f1Loop[0] ?? f2Loop[0] ?? [0, 0];
        const arr = Array.from({ length: n }, () => [fallback[0], fallback[1]] as [number, number]);
        return { f1CPs: arr, f2CPs: arr };
    }

    // Resample both to N CPs (arc-length parameterization)
    const f1Raw = resamplePolygon(f1Loop, n);
    const f2Raw = resamplePolygon(f2Loop, n);

    // Remove closure point (resamplePolygon adds pts[n] = pts[0])
    const f1CPs = f1Raw.slice(0, n) as [number, number][];
    const f2CPs = f2Raw.slice(0, n) as [number, number][];

    // Validate: ensure both arrays have exactly n entries
    if (f1CPs.length < n || f2CPs.length < n) {
        log.sys('FrontierAlign', `WARNING: resample produced ${f1CPs.length}/${f2CPs.length} CPs instead of ${n} — skipping alignment`);
        // Pad to n if needed
        while (f1CPs.length < n) f1CPs.push(f1CPs[f1CPs.length - 1] ?? [0, 0]);
        while (f2CPs.length < n) f2CPs.push(f2CPs[f2CPs.length - 1] ?? [0, 0]);
    }

    // Find best rotation: maximize the longest contiguous static run
    let bestOffset = 0;
    let bestLongestRun = 0;
    const eps2 = epsilon * epsilon;

    for (let offset = 0; offset < n; offset++) {
        // Count longest contiguous run of static CPs at this rotation
        let longestRun = 0;
        let currentRun = 0;

        for (let i = 0; i < n; i++) {
            const j = (i + offset) % n;
            const dx = f1CPs[i][0] - f2CPs[j][0];
            const dy = f1CPs[i][1] - f2CPs[j][1];
            if (dx * dx + dy * dy <= eps2) {
                currentRun++;
                if (currentRun > longestRun) longestRun = currentRun;
            } else {
                currentRun = 0;
            }
        }

        // Also check wrap-around: a run that spans the array boundary
        if (longestRun < n) {
            // Check if the run wraps from end to start
            let wrapRun = 0;
            // Count from end backward
            for (let i = n - 1; i >= 0; i--) {
                const j = (i + offset) % n;
                const dx = f1CPs[i][0] - f2CPs[j][0];
                const dy = f1CPs[i][1] - f2CPs[j][1];
                if (dx * dx + dy * dy <= eps2) wrapRun++;
                else break;
            }
            // Count from start forward
            let startRun = 0;
            for (let i = 0; i < n; i++) {
                const j = (i + offset) % n;
                const dx = f1CPs[i][0] - f2CPs[j][0];
                const dy = f1CPs[i][1] - f2CPs[j][1];
                if (dx * dx + dy * dy <= eps2) startRun++;
                else break;
            }
            const wrapTotal = wrapRun + startRun;
            if (wrapTotal > longestRun && wrapTotal <= n) longestRun = wrapTotal;
        }

        if (longestRun > bestLongestRun) {
            bestLongestRun = longestRun;
            bestOffset = offset;
        }
    }

    // Rotate F2 CPs by bestOffset so they align with F1
    if (bestOffset !== 0) {
        const rotated: [number, number][] = new Array(n);
        for (let i = 0; i < n; i++) {
            rotated[i] = f2CPs[(i + bestOffset) % n];
        }
        log.renderer('FrontierAlign', `Aligned with offset=${bestOffset}, longestStaticRun=${bestLongestRun}/${n} CPs`);
        return { f1CPs, f2CPs: rotated };
    }

    log.renderer('FrontierAlign', `No rotation needed, longestStaticRun=${bestLongestRun}/${n} CPs`);
    return { f1CPs, f2CPs };
}

/**
 * Lerp between two aligned CP arrays.
 * Static CPs (within ε) stay fixed. Changed CPs interpolate linearly.
 */
function lerpFrontierCPs(
    f1CPs: [number, number][],
    f2CPs: [number, number][],
    t: number,
    epsilon: number = 2,
): [number, number][] {
    const n = f1CPs.length;
    const result: [number, number][] = new Array(n);
    const eps2 = epsilon * epsilon;

    for (let i = 0; i < n; i++) {
        const dx = f1CPs[i][0] - f2CPs[i][0];
        const dy = f1CPs[i][1] - f2CPs[i][1];

        if (dx * dx + dy * dy <= eps2) {
            // Static CP — stays at F1 position (no flicker)
            result[i] = [f1CPs[i][0], f1CPs[i][1]];
        } else {
            // Changed CP — interpolate
            result[i] = [
                f1CPs[i][0] + (f2CPs[i][0] - f1CPs[i][0]) * t,
                f1CPs[i][1] + (f2CPs[i][1] - f1CPs[i][1]) * t,
            ];
        }
    }

    // Close the loop
    result.push([result[0][0], result[0][1]]);
    return result;
}

// ── Canonical Border Drawing ───────────────────────────────────────────────

/**
 * Draw border polylines into a Graphics object as smooth Bézier curves.
 * Uses quadraticCurveTo through midpoints for smooth arc geometry.
 * This is the SINGLE canonical function for all border rendering — steady-state,
 * transition animation, and segment mode all use this function.
 * 
 * If smoothPasses > 0, Chaikin subdivision is applied first to generate more
 * control points for the Bézier interpolation. Round caps and joins ensure
 * clean visual connections at polyline junctions.
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

        if (pts.length === 2) {
            graphics.moveTo(pts[0][0], pts[0][1]);
            graphics.lineTo(pts[1][0], pts[1][1]);
        } else {
            // Quadratic Bézier through midpoints for smooth arc geometry
            graphics.moveTo(pts[0][0], pts[0][1]);
            const mid0x = (pts[0][0] + pts[1][0]) / 2;
            const mid0y = (pts[0][1] + pts[1][1]) / 2;
            graphics.lineTo(mid0x, mid0y);
            for (let i = 1; i < pts.length - 1; i++) {
                const midX = (pts[i][0] + pts[i + 1][0]) / 2;
                const midY = (pts[i][1] + pts[i + 1][1]) / 2;
                graphics.quadraticCurveTo(pts[i][0], pts[i][1], midX, midY);
            }
            const last = pts[pts.length - 1];
            graphics.lineTo(last[0], last[1]);
        }
        graphics.stroke({ width, color: polyline.color, alpha, cap: 'round', join: 'round' });
        drawn++;
    }
    // log.renderer('drawBorderPolylines', `drew ${drawn}/${polylines.length} polylines (smooth=${smoothPasses}, w=${width.toFixed(1)}, a=${alpha.toFixed(2)}, bezier=true)`); // THROTTLED: per-frame
}

/** Build lerped polylines from prev → target for transition animation.
 *  Matches polylines by ownerPairKey + nearest centroid, resamples + lerps.
 *  Returns an array suitable for drawBorderPolylines. */
function buildLerpedPolylines(
    prev: SharedPolyline[], target: SharedPolyline[],
    t: number,
): { points: [number, number][]; color: number }[] {
    const RESAMPLE_N = 32;
    const result: { points: [number, number][]; color: number }[] = [];

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

                result.push({ points: lerpPolygon(pSampled, tSampled, t), color: tLine.color });
            } else {
                // Prev-only: use prev points (will fade out via alpha in caller)
                result.push({ points: pLine.points, color: pLine.color });
            }
        }

        // Target-only polylines: use target points (fade in via alpha in caller)
        for (let ti = 0; ti < tLines.length; ti++) {
            if (usedTargets.has(ti)) continue;
            result.push({ points: tLines[ti].points, color: tLines[ti].color });
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



function mergeSameOwnerCells(
    cells: TerritoryCell[],
    clusterSplit: boolean,
    clusterMap: Map<string, number>,
): MergedTerritory[] {
    // Build cluster key per cell
    const clusterKeyOf = (cell: TerritoryCell) => {
        const cIdx = clusterMap.get(cell.siteId) ?? 0;
        return clusterSplit ? `${cell.ownerId}:${cIdx}` : cell.ownerId;
    };

    // Step 1: Count edges, track which cluster(s) share each edge
    const edgeCount = new Map<string, number>();
    const edgeClusters = new Map<string, Set<string>>();

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
            if (!edgeClusters.has(key)) edgeClusters.set(key, new Set());
            edgeClusters.get(key)!.add(ck);
        }
    }

    // Step 2: Collect external edges per cluster
    type DEdge = { x1: number; y1: number; x2: number; y2: number };
    const clusterEdges = new Map<string, DEdge[]>();
    const clusterColor = new Map<string, number>();

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        if (!clusterEdges.has(ck)) clusterEdges.set(ck, []);
        if (!clusterColor.has(ck)) clusterColor.set(ck, 0);

        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            const count = edgeCount.get(key) ?? 0;
            const clusters = edgeClusters.get(key)!;
            // Internal: shared by 2+ cells of the SAME cluster → skip
            if (count >= 2 && clusters.size === 1) continue;
            clusterEdges.get(ck)!.push({
                x1: pts[j][0], y1: pts[j][1],
                x2: pts[j + 1][0], y2: pts[j + 1][1],
            });
        }
    }

    // Step 3: Chain edges into closed polygons
    const result: MergedTerritory[] = [];

    for (const [ck, edges] of clusterEdges) {
        if (edges.length === 0) continue;
        const ownerId = ck.split(':')[0];

        // Bidirectional adjacency
        type IEdge = { x1: number; y1: number; x2: number; y2: number; idx: number };
        const allEdges: IEdge[] = [];
        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            allEdges.push({ ...e, idx: i });
            allEdges.push({ x1: e.x2, y1: e.y2, x2: e.x1, y2: e.y1, idx: i });
        }

        const adj = new Map<string, IEdge[]>();
        for (const ie of allEdges) {
            const k = ptKey(ie.x1, ie.y1);
            if (!adj.has(k)) adj.set(k, []);
            adj.get(k)!.push(ie);
        }

        const used = new Set<number>();
        for (let start = 0; start < edges.length; start++) {
            if (used.has(start)) continue;
            const chain: number[][] = [];
            const e0 = edges[start];
            used.add(start);
            chain.push([e0.x1, e0.y1]);
            chain.push([e0.x2, e0.y2]);

            const startPt = ptKey(e0.x1, e0.y1);
            let curEnd = ptKey(e0.x2, e0.y2);
            let safety = edges.length * 2;

            while (curEnd !== startPt && safety-- > 0) {
                const cands = adj.get(curEnd);
                if (!cands) break;
                let found = false;
                for (const c of cands) {
                    if (used.has(c.idx)) continue;
                    used.add(c.idx);
                    curEnd = ptKey(c.x2, c.y2);
                    chain.push([c.x2, c.y2]);
                    found = true;
                    break;
                }
                if (!found) break;
            }

            if (chain.length >= 3) {
                // Ensure closed
                if (chain[0][0] !== chain[chain.length - 1][0] ||
                    chain[0][1] !== chain[chain.length - 1][1]) {
                    chain.push([chain[0][0], chain[0][1]]);
                }
                result.push({ points: chain as [number, number][], ownerId, color: 0 });
            }
        }
    }

    return result;
}

// ── Main Renderer ──────────────────────────────────────────────────────────

export function renderPVV3(
    stars: StarState[],
    voronoiContainer: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
): void {
    const transitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;
    const now = performance.now();

    // Re-show graphics — voronoiContainer blanket-hides every frame
    if (fillGraphics) fillGraphics.visible = true;

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
    // Adjacent territories share identical smoothed coordinates ? no gaps.
    const smoothPasses = Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)));
    if (smoothPasses > 0 && sharedEdges.length > 0) {
        // Assign colors for polyline construction
        for (const edge of sharedEdges) {
            edge.colorA = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerA), satMult, lightMult);
            edge.colorB = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerB), satMult, lightMult);
        }
        const colorMap = new Map<string, number>();
        for (const edge of sharedEdges) {
            const key = edge.ownerA < edge.ownerB ? `${edge.ownerA}|${edge.ownerB}` : `${edge.ownerB}|${edge.ownerA}`;
            if (!colorMap.has(key)) colorMap.set(key, blendColors(edge.colorA, edge.colorB, 0.5));
        }
        const colorLookup = (a: string, b: string) => {
            const key = a < b ? `${a}|${b}` : `${b}|${a}`;
            return colorMap.get(key) ?? 0x888888;
        };

        const rawPolylines = chainSharedEdgesIntoPolylines(sharedEdges, colorLookup, 0);
        const smoothedPolylines = chainSharedEdgesIntoPolylines(sharedEdges, colorLookup, smoothPasses);
        substituteSmoothedEdges(merged, rawPolylines, smoothedPolylines);
        // DIAGNOSTIC: raw vs smoothed polylines
        if (isPVV3Diag()) for (let pi = 0; pi < rawPolylines.length; pi++) {
            const rp = rawPolylines[pi];
            const sp = smoothedPolylines[pi];
            log.renderer(`PVV3`, `  Polyline[${pi}] ${rp.ownerPairKey}: raw=${rp.points.length}pts smooth=${sp.points.length}pts`);
            log.renderer(`PVV3`, `    raw start=(${rp.points[0][0].toFixed(0)},${rp.points[0][1].toFixed(0)}) end=(${rp.points[rp.points.length-1][0].toFixed(0)},${rp.points[rp.points.length-1][1].toFixed(0)})`);
        }
        log.renderer(`PVV3`, `Stage 3b: substituted ${rawPolylines.length} shared polylines, smooth=${smoothPasses}`);
        // DIAGNOSTIC: per-territory vertex counts after substitution
        if (isPVV3Diag()) for (const t of merged) {
            log.renderer(`PVV3`, `  After sub: ${t.ownerId} ${t.points.length} vertices`);
        }
    }

    // ── Stage 4: Render Fills ──────────────────────────────────────────────
    if (!fillGraphics) {
        fillGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(fillGraphics);
    }
    fillGraphics.clear();
    fillGraphics.visible = true;

    // Unified fill + stroke per territory (smoothed polygons)
    for (const territory of merged) {
        fillGraphics.poly(territory.points.flat());
        fillGraphics.fill({ color: territory.color, alpha });
        if (borderWidth > 0 && borderAlpha > 0) {
            fillGraphics.stroke({ width: borderWidth, color: territory.color, alpha: borderAlpha });
        }
    }



    // ── Store targets + start transition ────────────────────────────────
    // Assign colors if not already done in the border render block
    if (borderWidth <= 0 || borderAlpha <= 0) {
        for (const edge of sharedEdges) {
            edge.colorA = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerA), satMult, lightMult);
            edge.colorB = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerB), satMult, lightMult);
        }
    }
    lastMergedTerritories = merged;
    
    // Build polylines for morph transition (reuse from render block if available)
    {
        const smoothN = Math.max(0, Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)));
        const cMap = new Map<string, number>();
        for (const edge of sharedEdges) {
            const key = edge.ownerA < edge.ownerB ? `${edge.ownerA}|${edge.ownerB}` : `${edge.ownerB}|${edge.ownerA}`;
            if (!cMap.has(key)) cMap.set(key, blendColors(edge.colorA, edge.colorB, 0.5));
        }
        targetSharedPolylines = chainSharedEdgesIntoPolylines(sharedEdges, (a, b) => {
            const key = a < b ? `${a}|${b}` : `${b}|${a}`;
            return cMap.get(key) ?? 0x888888;
        }, smoothN);
    
        // Build frontier loops from smoothed merged territory polygons
        targetFrontierLoops = new Map<string, FrontierLoop[]>();
        for (const territory of merged) {
            const loops = targetFrontierLoops.get(territory.ownerId) ?? [];
            loops.push({ points: territory.points, ownerId: territory.ownerId });
            targetFrontierLoops.set(territory.ownerId, loops);
        }
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