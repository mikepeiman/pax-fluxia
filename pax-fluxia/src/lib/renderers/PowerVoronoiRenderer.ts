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
//   5. Chaikin smoothing on shared edges (future)
//   6. Trace edges → polygon contours → PIXI render
//
// Performance: Only recomputed when ownership fingerprint changes.
// ============================================================================

import * as PIXI from 'pixi.js';
import { weightedVoronoi } from 'd3-weighted-voronoi';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { findConnectedClustersOptimized } from './territoryUtils';
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

// ── Border Transition State (Segment Mode) ─────────────────────────────────

/** Previous shared border edge positions for segment mode animation. */
let prevBorderEdges: SharedBorderEdge[] | null = null;
let targetBorderEdges: SharedBorderEdge[] | null = null;
let borderTransitionStart = 0;
let isBorderTransitioning = false;

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
let outlineGraphics: PIXI.Graphics | null = null;
let lastMergedTerritories: MergedTerritory[] | null = null;  // stored for smooth mode snapshot

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
}

/**
 * Extract edges shared between cells of DIFFERENT owners (contested borders).
 * Each edge appears once with ownerA/ownerB — these are the boundaries where
 * territory borders should overlap and blend.
 */
function extractSharedEdges(cells: TerritoryCell[]): SharedBorderEdge[] {
    // Map: edgeKey → { owners: Set<string>, ownerPerCell: string[] }
    const edgeOwners = new Map<string, { owners: string[]; pts: [number, number, number, number] }>();

    for (const cell of cells) {
        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            if (!edgeOwners.has(key)) {
                edgeOwners.set(key, {
                    owners: [cell.ownerId],
                    pts: [pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]],
                });
            } else {
                const entry = edgeOwners.get(key)!;
                if (!entry.owners.includes(cell.ownerId)) {
                    entry.owners.push(cell.ownerId);
                }
            }
        }
    }

    // Collect only edges with exactly 2 different owners (contested boundaries)
    const shared: SharedBorderEdge[] = [];
    for (const [, entry] of edgeOwners) {
        if (entry.owners.length === 2 &&
            entry.owners[0] !== entry.owners[1] &&
            entry.owners[0] !== '__disconnect__' &&
            entry.owners[1] !== '__disconnect__') {
            shared.push({
                x1: entry.pts[0], y1: entry.pts[1],
                x2: entry.pts[2], y2: entry.pts[3],
                ownerA: entry.owners[0],
                ownerB: entry.owners[1],
                colorA: 0,
                colorB: 0,
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

/** Resample a polygon to `n` evenly-spaced points along its perimeter. */
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

/** Chain shared border edges into continuous polylines, grouped by owner-pair.
 *  Edges between the same two owners that share endpoints get merged into polylines. */
function chainSharedEdgesIntoPolylines(edges: SharedBorderEdge[], colorLookup?: (ownerA: string, ownerB: string) => number): SharedPolyline[] {
    // Group edges by sorted owner pair
    const byPair = new Map<string, SharedBorderEdge[]>();
    for (const e of edges) {
        const key = e.ownerA < e.ownerB ? `${e.ownerA}|${e.ownerB}` : `${e.ownerB}|${e.ownerA}`;
        if (!byPair.has(key)) byPair.set(key, []);
        byPair.get(key)!.push(e);
    }

    const result: SharedPolyline[] = [];
    const SNAP = 0.5;  // endpoint snapping tolerance

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

            result.push({ points: chain, ownerPairKey: pairKey, color });
        }
    }

    return result;
}

/** Draw contested border polylines at interpolated positions (prev → target).
 *  Matches polylines by ownerPairKey + nearest centroid, resamples + lerps. */
function renderContestedBorders(
    container: PIXI.Container,
    prev: SharedPolyline[], target: SharedPolyline[],
    t: number,
    borderWidth: number, borderAlpha: number,
): void {
    if (!outlineGraphics) {
        outlineGraphics = new PIXI.Graphics();
        container.addChild(outlineGraphics);
    }
    outlineGraphics.clear();
    outlineGraphics.visible = true;

    const blendWidth = borderWidth * 2.5;
    const RESAMPLE_N = 32;

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
                // Matched: resample both to same point count and lerp
                usedTargets.add(bestIdx);
                const tLine = tLines[bestIdx];
                const pSampled = resamplePolygon(pLine.points, RESAMPLE_N);
                const tSampled = resamplePolygon(tLine.points, RESAMPLE_N);
                const lerped = lerpPolygon(pSampled, tSampled, t);

                outlineGraphics.moveTo(lerped[0][0], lerped[0][1]);
                for (let i = 1; i < lerped.length; i++) outlineGraphics.lineTo(lerped[i][0], lerped[i][1]);
                outlineGraphics.stroke({ width: blendWidth, color: tLine.color, alpha: borderAlpha * 1.5 });
            } else {
                // Prev-only polyline: fade out
                const pts = pLine.points;
                outlineGraphics.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) outlineGraphics.lineTo(pts[i][0], pts[i][1]);
                outlineGraphics.stroke({ width: blendWidth, color: pLine.color, alpha: borderAlpha * 1.5 * (1 - t) });
            }
        }

        // Target-only polylines: fade in
        for (let ti = 0; ti < tLines.length; ti++) {
            if (usedTargets.has(ti)) continue;
            const pts = tLines[ti].points;
            outlineGraphics.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) outlineGraphics.lineTo(pts[i][0], pts[i][1]);
            outlineGraphics.stroke({ width: blendWidth, color: tLines[ti].color, alpha: borderAlpha * 1.5 * t });
        }
    }
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
            borderGraphics.stroke({ width: blendWidth, color, alpha: borderAlpha * 1.5 });
        } else {
            // Prev edge fading out (no match) — draw at prev position with decreasing alpha
            borderGraphics.moveTo(pEdge.x1, pEdge.y1);
            borderGraphics.lineTo(pEdge.x2, pEdge.y2);
            borderGraphics.stroke({ width: blendWidth, color: pEdge.colorA || 0x888888, alpha: borderAlpha * 1.5 * (1 - t) });
        }
    }

    // Unmatched target edges — fade in
    for (let ti = 0; ti < target.length; ti++) {
        if (targetUsed.has(ti)) continue;
        const tEdge = target[ti];
        borderGraphics.moveTo(tEdge.x1, tEdge.y1);
        borderGraphics.lineTo(tEdge.x2, tEdge.y2);
        borderGraphics.stroke({ width: blendWidth, color: tEdge.colorA || 0x888888, alpha: borderAlpha * 1.5 * t });
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

export function renderPowerVoronoi(
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
    if (borderGraphics) borderGraphics.visible = true;
    if (outlineGraphics) outlineGraphics.visible = true;

    // ── Per-frame animation (both modes) ────────────────────────────────
    const boundaryMode = GAME_CONFIG.TERRITORY_BOUNDARY_MODE ?? 'smooth';

    // Segment mode: edge-level lerp
    if (boundaryMode === 'segment' && isBorderTransitioning && transitionMs > 0 && prevBorderEdges && targetBorderEdges) {
        const elapsed = now - borderTransitionStart;
        const rawT = Math.min(1, elapsed / transitionMs);
        const eased = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        renderInterpolatedBorders(voronoiContainer, prevBorderEdges, targetBorderEdges,
            eased, GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5, GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4);

        if (rawT >= 1) {
            isBorderTransitioning = false;
            prevBorderEdges = null;
        }
        const shapeFpCheck = buildShapeFingerprint(stars);
        const visualFpCheck = buildVisualFingerprint();
        if (shapeFpCheck === cachedShapeFingerprint && visualFpCheck === cachedVisualFingerprint) return;
    }

    // Smooth mode: contested shared border polyline morph
    if (boundaryMode === 'smooth' && isSmoothTransitioning && transitionMs > 0 && prevSharedPolylines && targetSharedPolylines) {
        const elapsed = now - smoothTransitionStart;
        const rawT = Math.min(1, elapsed / transitionMs);
        const eased = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        renderContestedBorders(voronoiContainer, prevSharedPolylines, targetSharedPolylines,
            eased, GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 1.5, GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4);

        if (rawT >= 1) {
            isSmoothTransitioning = false;
            prevSharedPolylines = null;
            if (outlineGraphics) { outlineGraphics.clear(); outlineGraphics.visible = false; }
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
    }

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

    // Corridor virtual sites
    if (GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED && connections) {
        const spacing = GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60;
        const starMap = new Map(ownedStars.map(s => [s.id, s]));
        for (const conn of connections) {
            const sA = starMap.get(conn.sourceId);
            const sB = starMap.get(conn.targetId);
            if (!sA || !sB || sA.ownerId !== sB.ownerId) continue;

            const dx = sB.x - sA.x, dy = sB.y - sA.y;
            const dist = Math.hypot(dx, dy);
            if (dist < spacing) continue;

            const steps = Math.floor(dist / spacing);
            for (let step = 1; step < steps; step++) {
                const t = step / steps;
                sites.push({
                    x: sA.x + dx * t,
                    y: sA.y + dy * t,
                    weight: starMargin * starMargin * 0.5,  // half-weight for corridors
                    ownerId: sA.ownerId!,
                    starId: `corridor_${conn.sourceId}_${conn.targetId}_${step}`,
                    virtual: 'corridor',
                });
            }
        }
    }

    // Disconnect virtual enemy sites — separate non-connected same-owner territories
    if (GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED && connections) {
        const maxDist = GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400;

        // Build set of connected same-owner pairs (bidirectional)
        const connectedPairs = new Set<string>();
        const starMap = new Map(ownedStars.map(s => [s.id, s]));
        for (const conn of connections) {
            const sA = starMap.get(conn.sourceId);
            const sB = starMap.get(conn.targetId);
            if (!sA || !sB || sA.ownerId !== sB.ownerId) continue;
            connectedPairs.add(`${conn.sourceId}|${conn.targetId}`);
            connectedPairs.add(`${conn.targetId}|${conn.sourceId}`);
        }

        // For each pair of same-owner stars NOT connected, inject enemy virtual site
        let disconnectCount = 0;
        for (let i = 0; i < ownedStars.length; i++) {
            for (let j = i + 1; j < ownedStars.length; j++) {
                const sA = ownedStars[i], sB = ownedStars[j];
                if (sA.ownerId !== sB.ownerId) continue;
                if (connectedPairs.has(`${sA.id}|${sB.id}`)) continue;

                const dist = Math.hypot(sB.x - sA.x, sB.y - sA.y);
                if (dist > maxDist) continue;

                // Place enemy virtual site at midpoint
                const mx = (sA.x + sB.x) / 2;
                const my = (sA.y + sB.y) / 2;
                sites.push({
                    x: mx,
                    y: my,
                    weight: starMargin * starMargin * 0.3,  // small weight
                    ownerId: `__disconnect__`,               // synthetic owner — won't merge with anything
                    starId: `disconnect_${sA.id}_${sB.id}`,
                    virtual: 'disconnect',
                });
                disconnectCount++;
            }
        }
        if (disconnectCount > 0) {
            log.sys('PowerVoronoi', `Injected ${disconnectCount} disconnect virtual sites`);
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
        if (site.ownerId === '__disconnect__') continue;  // disconnect cells are invisible boundary pushers

        // Ensure closed polygon
        const pts: [number, number][] = poly.map((p: number[]) => [p[0], p[1]] as [number, number]);
        if (pts.length > 0 && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) {
            pts.push([pts[0][0], pts[0][1]]);
        }

        cells.push({
            points: pts,
            ownerId: site.ownerId,
            siteId: site.starId,
        });
    }

    log.sys('PowerVoronoi', `${cells.length} cells from ${sites.length} sites (${sites.filter(s => s.virtual).length} virtual)`);

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

    // ── Stage 3: Merge same-owner cells ────────────────────────────────────
    const merged = mergeSameOwnerCells(cells, GAME_CONFIG.TERRITORY_CLUSTER_SPLIT, clusterMap);

    // Assign colors
    for (const territory of merged) {
        const rawColor = colorUtils.getPlayerColor(territory.ownerId);
        territory.color = adjustColorHSL(rawColor, satMult, lightMult);
    }

    log.sys('PowerVoronoi', `Merged to ${merged.length} territories`);

    // ── Stage 4: Render ────────────────────────────────────────────────────
    if (!fillGraphics) {
        fillGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(fillGraphics);
    }
    fillGraphics.clear();
    fillGraphics.visible = true;

    for (const territory of merged) {
        fillGraphics.poly(territory.points.flat());
        fillGraphics.fill({ color: territory.color, alpha });
    }

    // Borders — strength-blended shared edges (F-142)
    if (borderWidth > 0 && borderAlpha > 0) {
        if (!borderGraphics) {
            borderGraphics = new PIXI.Graphics();
            voronoiContainer.addChild(borderGraphics);
        }
        borderGraphics.clear();
        borderGraphics.visible = true;

        // Layer 1: Each territory's own border in its territory color
        for (const territory of merged) {
            const [r, g, b] = hexToRGB(territory.color);
            const borderColor = (Math.min(255, r + 40) << 16) |
                (Math.min(255, g + 40) << 8) |
                Math.min(255, b + 40);
            const pts = territory.points;
            if (pts.length > 1) {
                borderGraphics.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    borderGraphics.lineTo(pts[i][0], pts[i][1]);
                }
                borderGraphics.closePath();
                borderGraphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
            }
        }

        // Layer 2: Shared edges — dual overlapping strokes with strength blend
        // Build nearest-star lookup per owner for proximity gradient
        const ownerStars = new Map<string, StarState[]>();
        for (const s of ownedStars) {
            if (!ownerStars.has(s.ownerId!)) ownerStars.set(s.ownerId!, []);
            ownerStars.get(s.ownerId!)!.push(s);
        }


        // ── Ship strength per owner (available for FX: power influence, border blend) ──
        const ownerStrength = new Map<string, number>();
        for (const s of ownedStars) {
            ownerStrength.set(s.ownerId!, (ownerStrength.get(s.ownerId!) ?? 0) + (s.activeShips ?? 0) + (s.damagedShips ?? 0));
        }

        // Assign colors to shared edges
        for (const edge of sharedEdges) {
            edge.colorA = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerA), satMult, lightMult);
            edge.colorB = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerB), satMult, lightMult);
        }

        // Render shared edges with proximity-based gradient
        const blendWidth = borderWidth * 2.5;  // shared edges are wider for visual impact

        for (const edge of sharedEdges) {
            const starsA = ownerStars.get(edge.ownerA) ?? [];
            const starsB = ownerStars.get(edge.ownerB) ?? [];

            // Strength data available for future FX (not used in fingerprint/animation loop)
            const _strengthA = ownerStrength.get(edge.ownerA) ?? 1;
            const _strengthB = ownerStrength.get(edge.ownerB) ?? 1;
            // TODO: Wire to UI toggle for strength-weighted border blend
            // const totalStrength = _strengthA + _strengthB;
            // const strengthRatio = totalStrength > 0 ? _strengthB / totalStrength : 0.5;

            // Edge midpoint for proximity check
            const mx = (edge.x1 + edge.x2) / 2;
            const my = (edge.y1 + edge.y2) / 2;

            // Find nearest star of each owner to edge midpoint
            let distA = Infinity, distB = Infinity;
            for (const s of starsA) {
                const d = Math.hypot(s.x - mx, s.y - my);
                if (d < distA) distA = d;
            }
            for (const s of starsB) {
                const d = Math.hypot(s.x - mx, s.y - my);
                if (d < distB) distB = d;
            }

            // Proximity-only blend (strength blend ready but flagged out of animation loop)
            const totalDist = distA + distB;
            const blendT = totalDist > 0 ? distA / totalDist : 0.5;

            // Boost saturation and lightness based on dominance
            const dominance = Math.abs(blendT - 0.5) * 2;  // 0 = equal, 1 = fully dominant
            const blendedColor = blendColors(edge.colorA, edge.colorB, blendT);

            // Boost the blended color's saturation and lightness based on dominance
            const [bR, bG, bB] = hexToRGB(blendedColor);
            const [bH, bS, bL] = rgbToHSL(bR, bG, bB);
            const boostedSat = Math.min(1, bS + dominance * 0.3);
            const boostedLight = Math.min(0.85, bL + dominance * 0.15);
            const [fR, fG, fB] = hslToRGB(bH, boostedSat, boostedLight);
            const finalColor = (fR << 16) | (fG << 8) | fB;

            // Draw the shared edge with the blended color
            borderGraphics.moveTo(edge.x1, edge.y1);
            borderGraphics.lineTo(edge.x2, edge.y2);
            borderGraphics.stroke({ width: blendWidth, color: finalColor, alpha: borderAlpha * 1.5 });
        }
    } else if (borderGraphics) {
        borderGraphics.clear();
    }

    // ── Store targets + start transition ────────────────────────────────
    // Assign colors to shared edges
    for (const edge of sharedEdges) {
        edge.colorA = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerA), satMult, lightMult);
        edge.colorB = adjustColorHSL(colorUtils.getPlayerColor(edge.ownerB), satMult, lightMult);
    }
    targetBorderEdges = sharedEdges;
    lastMergedTerritories = merged;  // store for next frame's smooth mode snapshot

    // Start transition based on mode
    if (shapeChanged && transitionMs > 0) {
        // Segment mode
        if (prevBorderEdges && prevBorderEdges.length > 0) {
            borderTransitionStart = now;
            isBorderTransitioning = true;
        }

        // Smooth mode: chain shared edges into polylines and start transition
        if (prevSharedPolylines && prevSharedPolylines.length > 0) {
            // Build color lookup from current shared edge colors
            const colorMap = new Map<string, number>();
            for (const edge of sharedEdges) {
                const key = edge.ownerA < edge.ownerB ? `${edge.ownerA}|${edge.ownerB}` : `${edge.ownerB}|${edge.ownerA}`;
                if (!colorMap.has(key)) {
                    colorMap.set(key, blendColors(edge.colorA, edge.colorB, 0.5));
                }
            }
            targetSharedPolylines = chainSharedEdgesIntoPolylines(sharedEdges, (a, b) => {
                const key = a < b ? `${a}|${b}` : `${b}|${a}`;
                return colorMap.get(key) ?? 0x888888;
            });
            smoothTransitionStart = now;
            isSmoothTransitioning = true;
        }
    }
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
    smoothTransitionStart = 0;
    lastMergedTerritories = null;
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
    if (outlineGraphics) {
        if (outlineGraphics.parent) outlineGraphics.parent.removeChild(outlineGraphics);
        outlineGraphics.destroy();
        outlineGraphics = null;
    }
}
