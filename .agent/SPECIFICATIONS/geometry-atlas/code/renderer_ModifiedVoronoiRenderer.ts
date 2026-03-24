// ============================================================================
// ModifiedVoronoiRenderer — F-138: Unified territory fill via modified Voronoi cells
// ============================================================================
//
// Derived from VoronoiRenderer.ts for F-138.
// Uses d3-delaunay for per-star Voronoi cells, then applies a pipeline:
//   1. Merge same-owner adjacent cells (remove shared internal edges)
//   2. Chain remaining boundary edges into unified polygons per owner-cluster
//   3. Apply minimum star boundary margin (F-139)
//   4. Bézier arc smoothing at sharp vertices (angle < threshold)
//   5. Optional Chaikin smoothing on final boundary
//   6. Periphery coverage for edge star pairs (F-137)
//
// Performance: Only recomputed when ownership fingerprint changes.
// ============================================================================

import * as PIXI from 'pixi.js';
import { Delaunay } from 'd3-delaunay';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { findConnectedClustersOptimized } from './territoryUtils';
import type { ColorUtils } from './RenderContext';

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedFingerprint = '';
let cellGraphics: PIXI.Graphics | null = null;
let borderGraphics: PIXI.Graphics | null = null;
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build ownership fingerprint — only regenerate when this changes. */
function buildFingerprint(stars: StarState[]): string {
    let fp = 'modified:';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}|`;
    }
    // Include all visual config keys that affect rendering
    fp += `${GAME_CONFIG.VORONOI_ALPHA}:${GAME_CONFIG.VORONOI_BORDER_WIDTH}`;
    fp += `:${GAME_CONFIG.VORONOI_BORDER_ALPHA}:${GAME_CONFIG.VORONOI_BORDER_BRIGHTEN}`;
    fp += `:${GAME_CONFIG.VORONOI_SATURATION}:${GAME_CONFIG.VORONOI_LIGHTNESS}`;
    fp += `:${GAME_CONFIG.VORONOI_GLOW_RADIUS}:${GAME_CONFIG.VORONOI_GLOW_ALPHA}:${GAME_CONFIG.VORONOI_GLOW_LAYERS}`;
    fp += `:${GAME_CONFIG.VORONOI_BLUR}:${GAME_CONFIG.VORONOI_SMOOTHING}`;
    fp += `:${GAME_CONFIG.VORONOI_GRADIENT_BLEND}:${GAME_CONFIG.VORONOI_BLEND_WIDTH}`;
    // F-138 specific config keys
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_ARC_STRENGTH}:${GAME_CONFIG.MODIFIED_VORONOI_ARC_THRESHOLD}`;
    fp += `:${GAME_CONFIG.MODIFIED_VORONOI_ARC_MIN_SEGMENT}`;
    return fp;
}

/** Convert a numeric hex color (0xRRGGBB) to r,g,b components. */
function hexToRGB(hex: number): [number, number, number] {
    return [
        (hex >> 16) & 0xff,
        (hex >> 8) & 0xff,
        hex & 0xff,
    ];
}

/** Convert RGB (0-255) to HSL (h:0-360, s:0-1, l:0-1). */
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

/** Convert HSL (h:0-360, s:0-1, l:0-1) back to RGB (0-255). */
function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
    }
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
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

/** Adjust RGB color via HSL saturation + lightness multipliers. */
function adjustColorHSL(
    r: number, g: number, b: number,
    satMult: number, lightMult: number,
): [number, number, number] {
    const [h, s, l] = rgbToHSL(r, g, b);
    const newS = Math.min(1, Math.max(0, s * satMult));
    const newL = Math.min(1, Math.max(0, l * lightMult));
    return hslToRGB(h, newS, newL);
}

/** Pack r,g,b (0-255) into 0xRRGGBB. */
function rgbToHex(r: number, g: number, b: number): number {
    return (r << 16) | (g << 8) | b;
}


// ── Chaikin Smoothing ──────────────────────────────────────────────────────

/**
 * Apply Chaikin's corner-cutting algorithm to smooth a polygon.
 * Each iteration replaces every edge with two new points at 25%/75%,
 * producing increasingly rounded contours.
 * @param polygon Array of [x, y] vertices (closed: first === last)
 * @param iterations Number of smoothing passes (0 = no change)
 */
function chaikinSmooth(polygon: number[][], iterations: number): number[][] {
    if (iterations <= 0 || polygon.length < 3) return polygon;

    // Work with open polygon (remove closing point if present)
    let pts = polygon.slice();
    const isClosed = pts.length > 1 &&
        pts[0][0] === pts[pts.length - 1][0] &&
        pts[0][1] === pts[pts.length - 1][1];
    if (isClosed) pts = pts.slice(0, -1);

    for (let iter = 0; iter < iterations; iter++) {
        const n = pts.length;
        const next: number[][] = [];
        for (let i = 0; i < n; i++) {
            const p0 = pts[i];
            const p1 = pts[(i + 1) % n];
            next.push([
                0.75 * p0[0] + 0.25 * p1[0],
                0.75 * p0[1] + 0.25 * p1[1],
            ]);
            next.push([
                0.25 * p0[0] + 0.75 * p1[0],
                0.25 * p0[1] + 0.75 * p1[1],
            ]);
        }
        pts = next;
    }

    // Re-close
    if (isClosed && pts.length > 0) {
        pts.push([pts[0][0], pts[0][1]]);
    }
    return pts;
}

// ── F-138: Cell Merging ────────────────────────────────────────────────────

/** Canonical edge key for float-equal matching. */
function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
    // Sort endpoints so key is direction-independent
    const ax = +x1.toFixed(2), ay = +y1.toFixed(2);
    const bx = +x2.toFixed(2), by = +y2.toFixed(2);
    if (ax < bx || (ax === bx && ay < by)) {
        return `${ax},${ay}-${bx},${by}`;
    }
    return `${bx},${by}-${ax},${ay}`;
}

interface MergedPolygon {
    points: number[][]; // [[x,y], ...] closed polygon
    ownerId: string;
    clusterIdx: number;
    color: { hex: number; rgb: [number, number, number] };
}

/**
 * Merge same-owner adjacent Voronoi cells into unified polygons.
 * Algorithm:
 * 1. Extract all edges from all cells
 * 2. Build canonical edge keys; edges shared by same-owner cells are internal → discard
 * 3. Chain remaining external edges into closed polygons per owner-cluster
 */
function mergeSameOwnerCells(
    voronoi: ReturnType<typeof Delaunay.prototype.voronoi>,
    allStars: StarState[],
    ownedSet: Set<string>,
    ownedStars: StarState[],
    starColors: { hex: number; rgb: [number, number, number]; clusterIdx: number }[],
    clusterSplit: boolean,
): MergedPolygon[] {
    // Map owned star index for color lookups: star.id → index in ownedStars[]
    const ownedIdx = new Map<string, number>();
    for (let i = 0; i < ownedStars.length; i++) ownedIdx.set(ownedStars[i].id, i);

    // Build cluster key per star: "ownerId" or "ownerId:clusterIdx" if splitting
    const clusterKey = (allIdx: number) => {
        const s = allStars[allIdx];
        const oi = ownedIdx.get(s.id)!;
        const oid = s.ownerId!;
        return clusterSplit ? `${oid}:${starColors[oi].clusterIdx}` : oid;
    };

    // Step 1: Extract edges and count occurrences + track clusters
    // An edge shared by 2 cells of the SAME cluster = internal → remove
    // An edge appearing once = boundary → keep
    // An edge shared by 2 cells of DIFFERENT clusters = boundary → keep
    const edgeCount = new Map<string, number>();
    const edgeClusters = new Map<string, Set<string>>();
    type DirectedEdge = { x1: number; y1: number; x2: number; y2: number };

    for (let i = 0; i < allStars.length; i++) {
        if (!ownedSet.has(allStars[i].id)) continue; // skip unowned
        const cell = voronoi.cellPolygon(i);
        if (!cell || cell.length < 3) continue;
        const ck = clusterKey(i);

        for (let j = 0; j < cell.length - 1; j++) {
            const [x1, y1] = cell[j];
            const [x2, y2] = cell[j + 1];
            const key = edgeKey(x1, y1, x2, y2);

            edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
            if (!edgeClusters.has(key)) edgeClusters.set(key, new Set());
            edgeClusters.get(key)!.add(ck);
        }
    }

    // Step 2: Collect external edges per cluster
    const clusterEdges = new Map<string, DirectedEdge[]>();

    for (let i = 0; i < allStars.length; i++) {
        if (!ownedSet.has(allStars[i].id)) continue; // skip unowned
        const cell = voronoi.cellPolygon(i);
        if (!cell || cell.length < 3) continue;
        const ck = clusterKey(i);

        if (!clusterEdges.has(ck)) clusterEdges.set(ck, []);

        for (let j = 0; j < cell.length - 1; j++) {
            const [x1, y1] = cell[j];
            const [x2, y2] = cell[j + 1];
            const key = edgeKey(x1, y1, x2, y2);

            const count = edgeCount.get(key) ?? 0;
            const clusters = edgeClusters.get(key)!;
            // Internal edge: appears 2+ times AND all from the same cluster → skip
            if (count >= 2 && clusters.size === 1) continue;

            clusterEdges.get(ck)!.push({ x1, y1, x2, y2 });
        }
    }

    // Diagnostic: edges removed vs kept
    let totalEdges = 0, internalRemoved = 0;
    for (const [key, count] of edgeCount) {
        totalEdges += count;
        if (count >= 2 && edgeClusters.get(key)!.size === 1) internalRemoved += count;
    }
    console.log(`[ModifiedVoronoi:Merge] Total edge instances: ${totalEdges}, internal removed: ${internalRemoved}, unique clusters: ${clusterEdges.size}`);
    for (const [ck, edges] of clusterEdges) {
        console.log(`[ModifiedVoronoi:Merge]   Cluster "${ck}": ${edges.length} external edges`);
    }

    // Step 3: Chain edges into closed polygons per cluster
    const result: MergedPolygon[] = [];

    for (const [ck, edges] of clusterEdges) {
        if (edges.length === 0) continue;

        // Find owner info from first star in this cluster
        const allIdx = allStars.findIndex((s, i) => ownedSet.has(s.id) && clusterKey(i) === ck);
        if (allIdx === -1) continue;
        const ownerId = allStars[allIdx].ownerId!;
        const ownerIdx = ownedIdx.get(allStars[allIdx].id) ?? 0;

        // Build adjacency map: snapped endpoint → list of edge indices starting there
        // Store BOTH directions of each edge so chains can traverse either way
        const snap = (v: number) => +v.toFixed(2);
        const ptKey = (x: number, y: number) => `${snap(x)},${snap(y)}`;

        // Create indexed edges with both directions
        type IndexedEdge = { x1: number; y1: number; x2: number; y2: number; idx: number };
        const allEdges: IndexedEdge[] = [];
        for (let ei = 0; ei < edges.length; ei++) {
            const e = edges[ei];
            // Forward direction
            allEdges.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, idx: ei });
            // Reverse direction (same edge index — marking either as used marks both)
            allEdges.push({ x1: e.x2, y1: e.y2, x2: e.x1, y2: e.y1, idx: ei });
        }

        const adjacency = new Map<string, IndexedEdge[]>();
        for (const ie of allEdges) {
            const key = ptKey(ie.x1, ie.y1);
            if (!adjacency.has(key)) adjacency.set(key, []);
            adjacency.get(key)!.push(ie);
        }

        // Chain: follow endpoint → next edge until we close the ring
        const used = new Set<number>(); // original edge index

        for (let startIdx = 0; startIdx < edges.length; startIdx++) {
            if (used.has(startIdx)) continue;

            const chain: number[][] = [];
            const e0 = edges[startIdx];
            used.add(startIdx);
            chain.push([e0.x1, e0.y1]);
            chain.push([e0.x2, e0.y2]);

            const startPt = ptKey(e0.x1, e0.y1);
            let curEnd = ptKey(e0.x2, e0.y2);

            let safety = edges.length * 2;
            while (curEnd !== startPt && safety-- > 0) {
                const candidates = adjacency.get(curEnd);
                if (!candidates) break;

                let found = false;
                for (const cand of candidates) {
                    if (used.has(cand.idx)) continue;

                    used.add(cand.idx);
                    curEnd = ptKey(cand.x2, cand.y2);
                    chain.push([cand.x2, cand.y2]);
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

                result.push({
                    points: chain,
                    ownerId,
                    clusterIdx: starColors[ownerIdx].clusterIdx,
                    color: starColors[ownerIdx],
                });
            }
        }
    }

    return result;
}

// ── F-139: Minimum Star Boundary Margin ────────────────────────────────────

/**
 * Push boundary vertices outward so no vertex is closer than minRadius
 * to any star center within the same territory.
 */
function applyMinStarMargin(
    polygons: MergedPolygon[],
    ownedStars: StarState[],
    minRadius: number,
): void {
    if (minRadius <= 0) return;

    for (const poly of polygons) {
        // Collect stars belonging to this owner
        const ownerStars = ownedStars.filter(s => s.ownerId === poly.ownerId);

        for (let i = 0; i < poly.points.length; i++) {
            const [vx, vy] = poly.points[i];

            for (const star of ownerStars) {
                const dx = vx - star.x;
                const dy = vy - star.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minRadius && dist > 0.001) {
                    // Push outward along star→vertex ray
                    const scale = minRadius / dist;
                    poly.points[i] = [star.x + dx * scale, star.y + dy * scale];
                }
            }
        }
    }
}

// ── F-138: Bézier Arc Smoothing at Sharp Vertices ──────────────────────────

/**
 * Compute interior angle at vertex i of a polygon (in degrees).
 * Returns 0-180, where small values mean sharp/acute corners.
 */
function interiorAngle(pts: number[][], i: number): number {
    const n = pts.length;
    // Handle closed polygon (last point == first)
    const isClosed = pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1];
    const len = isClosed ? n - 1 : n;

    const prev = (i - 1 + len) % len;
    const next = (i + 1) % len;

    const ax = pts[prev][0] - pts[i][0];
    const ay = pts[prev][1] - pts[i][1];
    const bx = pts[next][0] - pts[i][0];
    const by = pts[next][1] - pts[i][1];

    const dot = ax * bx + ay * by;
    const magA = Math.hypot(ax, ay);
    const magB = Math.hypot(bx, by);
    if (magA === 0 || magB === 0) return 180; // degenerate — skip

    // Clamp to [-1,1] to avoid NaN from floating point
    const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
    return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Evaluate a quadratic Bézier curve at parameter t.
 * B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
 */
function quadBezier(
    p0: number[], p1: number[], p2: number[], t: number,
): number[] {
    const u = 1 - t;
    return [
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ];
}

/**
 * Smooth sharp vertices by replacing them with quadratic Bézier arcs.
 * For each vertex with interior angle < threshold:
 *   1. Retract vertex toward the nearest star center (origin) by arcStrength
 *   2. Tessellate a Bézier arc from prev vertex through retracted point to next vertex
 *   3. Splice arc segments into the polygon
 */
function smoothSharpVertices(
    polygons: MergedPolygon[],
    ownedStars: StarState[],
    arcStrength: number,
    arcThreshold: number,
    arcMinSegment: number,
): void {
    if (arcStrength <= 0) return;

    for (const poly of polygons) {
        let pts = poly.points;
        const isClosed = pts.length > 1 &&
            pts[0][0] === pts[pts.length - 1][0] &&
            pts[0][1] === pts[pts.length - 1][1];
        if (isClosed) pts = pts.slice(0, -1);

        const newPts: number[][] = [];
        const len = pts.length;

        // Find nearest star to this polygon for origin computation
        const ownerStars = ownedStars.filter(s => s.ownerId === poly.ownerId);

        for (let i = 0; i < len; i++) {
            const angle = interiorAngle(pts, i);

            if (angle < arcThreshold && angle > 0) {
                // This vertex is sharp — apply arc smoothing
                const prev = pts[(i - 1 + len) % len];
                const curr = pts[i];
                const next = pts[(i + 1) % len];

                // Find nearest star center as the "origin" for retraction
                let nearestStar = ownerStars[0];
                let minDist = Infinity;
                for (const s of ownerStars) {
                    const d = Math.hypot(s.x - curr[0], s.y - curr[1]);
                    if (d < minDist) { minDist = d; nearestStar = s; }
                }

                // Retract toward origin
                const origin = [nearestStar.x, nearestStar.y];
                const controlPt = [
                    curr[0] + arcStrength * (origin[0] - curr[0]),
                    curr[1] + arcStrength * (origin[1] - curr[1]),
                ];

                // Compute arc length to determine segment count
                const arcLen = Math.hypot(next[0] - prev[0], next[1] - prev[1]) +
                    Math.hypot(controlPt[0] - prev[0], controlPt[1] - prev[1]);
                const segments = Math.max(3, Math.ceil(arcLen / Math.max(1, arcMinSegment)));

                // Tessellate Bézier: prev → controlPt → next
                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    newPts.push(quadBezier(prev, controlPt, next, t));
                }
            } else {
                newPts.push(pts[i]);
            }
        }

        // Re-close
        if (newPts.length > 0) {
            newPts.push([newPts[0][0], newPts[0][1]]);
        }
        poly.points = newPts;
    }
}

/**
 * Disconnect Buffer: for same-owner star pairs that are NOT lane-connected,
 * create a visible enemy-territory buffer between their regions.
 *
 * TWO-PHASE algorithm:
 * Phase A: Push same-owner polygon vertices AWAY from center 1/3rd of
 *          the connection vector (cede space)
 * Phase B: Extend adjacent ENEMY territory vertices INTO the center 1/3rd
 *          (fill the gap so enemies meet at the connection vector)
 */
function applyDisconnectBuffer(
    mergedPolygons: MergedPolygon[],
    ownedStars: StarState[],
    connections: StarConnection[],
) {
    // Build fast connection lookup
    const connSet = new Set<string>();
    for (const c of connections) {
        connSet.add(`${c.sourceId}|${c.targetId}`);
        connSet.add(`${c.targetId}|${c.sourceId}`);
    }

    // Group stars by owner
    const starsByOwner = new Map<string, StarState[]>();
    for (const s of ownedStars) {
        if (!s.ownerId) continue;
        if (!starsByOwner.has(s.ownerId)) starsByOwner.set(s.ownerId, []);
        starsByOwner.get(s.ownerId)!.push(s);
    }

    type DisconnectZone = {
        ownerId: string;
        cx: number; cy: number;     // midpoint of connection vector
        ax: number; ay: number;     // unit vector along connection (A→B)
        nx: number; ny: number;     // unit normal (perpendicular)
        thirdLen: number;           // half-length of center third along axis
        dist: number;               // total distance between stars
        starA: StarState; starB: StarState;
    };

    const zones: DisconnectZone[] = [];

    for (const [ownerId, ownerStars] of starsByOwner) {
        for (let i = 0; i < ownerStars.length; i++) {
            for (let j = i + 1; j < ownerStars.length; j++) {
                const a = ownerStars[i];
                const b = ownerStars[j];

                // Skip if they ARE lane-connected — corridors handle these
                if (connSet.has(`${a.id}|${b.id}`)) continue;

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 1) continue;

                // Only apply to proximate pairs (far-apart pairs won't share territory)
                if (dist > 400) continue;

                const ax = dx / dist;
                const ay = dy / dist;

                zones.push({
                    ownerId,
                    cx: (a.x + b.x) / 2,
                    cy: (a.y + b.y) / 2,
                    ax, ay,
                    nx: -ay, ny: ax,
                    thirdLen: dist / 6,
                    dist,
                    starA: a, starB: b,
                });
            }
        }
    }

    if (zones.length === 0) return;

    for (const zone of zones) {
        const corridorWidth = zone.thirdLen * 2.5;

        for (const poly of mergedPolygons) {
            const isSameOwner = poly.ownerId === zone.ownerId;

            for (let vi = 0; vi < poly.points.length; vi++) {
                const [px, py] = poly.points[vi];

                // Project vertex onto connection axis relative to midpoint
                const relX = px - zone.cx;
                const relY = py - zone.cy;
                const projAlong = relX * zone.ax + relY * zone.ay;
                const projPerp = relX * zone.nx + relY * zone.ny;
                const absProjPerp = Math.abs(projPerp);

                // Is this vertex near the center third zone?
                if (Math.abs(projAlong) >= zone.thirdLen || absProjPerp >= corridorWidth) continue;

                if (isSameOwner) {
                    // PHASE A: Push same-owner vertices AWAY from center zone
                    // Move along connection axis toward nearest star
                    const pushDir = projAlong < 0 ? -1 : 1; // toward nearest star
                    const pushAmount = zone.thirdLen - Math.abs(projAlong);
                    poly.points[vi] = [
                        px + zone.ax * pushDir * pushAmount * 0.8,
                        py + zone.ay * pushDir * pushAmount * 0.8,
                    ];
                } else {
                    // PHASE B: Extend enemy vertices INTO the center zone
                    // Pull perpendicular toward the connection vector line (projPerp → 0)
                    // This makes enemy territory fill the gap where same-owner retreated
                    const pullStrength = 0.6; // how aggressively to pull toward midline
                    const perpPull = -projPerp * pullStrength;
                    // Also nudge slightly along-axis toward the midpoint
                    const alongPull = -projAlong * 0.3;
                    poly.points[vi] = [
                        px + zone.nx * perpPull + zone.ax * alongPull,
                        py + zone.ny * perpPull + zone.ay * alongPull,
                    ];
                }
            }
        }
    }

    console.log(`[ModifiedVoronoi] Applied disconnect buffer to ${zones.length} non-connected same-owner pairs`);
}

// ── Main Renderer ──────────────────────────────────────────────────────────

/**
 * F-138: Render modified Voronoi territory overlay.
 * Pipeline: d3-delaunay cells → merge same-owner → min star margin →
 * Bézier arc smoothing → Chaikin smoothing → render.
 */
export function renderModifiedVoronoi(
    stars: StarState[],
    voronoiContainer: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
): void {
    if (!GAME_CONFIG.TERRITORY_MODIFIED_VORONOI) {
        if (cellGraphics) cellGraphics.visible = false;
        if (borderGraphics) borderGraphics.visible = false;
        return;
    }

    // Ensure own children are visible (don't touch shared container)
    if (cellGraphics) cellGraphics.visible = true;
    if (borderGraphics) borderGraphics.visible = true;

    const fingerprint = buildFingerprint(stars) + `:${worldWidth}:${worldHeight}:c${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}:cs${GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}`;

    // Skip regeneration if nothing changed
    if (fingerprint === cachedFingerprint && cellGraphics) {
        return;
    }

    cachedFingerprint = fingerprint;

    // Only consider owned stars for rendering, but compute Voronoi from ALL stars
    // so each star gets its natural cell size (no inflation from missing neighbors)
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        if (cellGraphics) cellGraphics.visible = false;
        if (borderGraphics) borderGraphics.visible = false;
        return;
    }

    const alpha = GAME_CONFIG.VORONOI_ALPHA ?? 0.15;
    const borderWidth = GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 2;
    const borderAlpha = GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.4;
    const borderBrighten = GAME_CONFIG.VORONOI_BORDER_BRIGHTEN ?? 80;
    const satMult = GAME_CONFIG.VORONOI_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.VORONOI_LIGHTNESS ?? 0.7;

    // Extend bounds moderately past map edges for clean boundary cells
    const pad = Math.max(worldWidth, worldHeight) * 0.3;
    const bounds: [number, number, number, number] = [
        -pad, -pad,
        worldWidth + pad, worldHeight + pad,
    ];

    // ── Corridor Virtual Sites: inject points along same-owner lanes ──
    // Virtual sites participate in Voronoi, creating corridor cells that merge with owners
    const corridorEnabled = GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ?? true;
    const corridorSpacing = GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 80;

    // Build augmented star array: real stars + virtual corridor sites
    const starById = new Map<string, StarState>();
    for (const s of stars) starById.set(s.id, s);

    const virtualStars: StarState[] = [];
    const virtualStarSource = new Map<string, string>(); // virtual ID → source star ID
    if (corridorEnabled && connections && connections.length > 0) {
        let virtualIdx = 0;
        for (const conn of connections) {
            const srcStar = starById.get(conn.sourceId);
            const tgtStar = starById.get(conn.targetId);
            if (!srcStar || !tgtStar) continue;
            // Only inject along same-owner lanes
            if (!srcStar.ownerId || !tgtStar.ownerId || srcStar.ownerId !== tgtStar.ownerId) continue;

            // Sample points along the lane at corridorSpacing intervals
            const dx = tgtStar.x - srcStar.x;
            const dy = tgtStar.y - srcStar.y;
            const dist = Math.hypot(dx, dy);
            const numSites = Math.max(1, Math.floor(dist / corridorSpacing));

            for (let s = 1; s < numSites; s++) {
                const t = s / numSites;
                const vx = srcStar.x + dx * t;
                const vy = srcStar.y + dy * t;
                const vid = `__corridor_${virtualIdx++}`;
                virtualStarSource.set(vid, conn.sourceId);
                virtualStars.push({
                    id: vid,
                    x: vx,
                    y: vy,
                    ownerId: srcStar.ownerId,
                    ships: 0,
                } as unknown as StarState);
            }
        }
        if (virtualStars.length > 0) {
            console.log(`[ModifiedVoronoi] Injected ${virtualStars.length} corridor virtual sites`);
        }
    }

    // Augmented array: OWNED stars + virtual corridor sites
    // Currently all stars are owned; this is forward-compatible for future unowned stars.
    // Gaps are from pipeline modifications (margin, arcs), NOT from missing cells.
    const augmentedStars: StarState[] = [...ownedStars, ...virtualStars];

    // ── Compute Voronoi from owned stars + virtual corridor sites ──
    const allPoints = augmentedStars.map(s => [s.x, s.y] as [number, number]);
    const delaunay = Delaunay.from(allPoints);
    const voronoi = delaunay.voronoi(bounds);

    // All augmented entries are owned — every cell gets rendered
    const ownedSet = new Set(augmentedStars.map(s => s.id));

    // Build connected clusters for ownership comparison
    for (const s of ownedStars) starById.set(s.id, s);
    const clusterMap = findConnectedClustersOptimized(
        ownedStars,
        connections ?? [],
        starById,
    );

    // Pre-compute adjusted colors per star (real + virtual)
    // Virtual corridor stars get the same color as their owner
    const augOwnedStars = [...ownedStars, ...virtualStars];
    const starColors: { hex: number; rgb: [number, number, number]; clusterIdx: number }[] = augOwnedStars.map(s => {
        const rawRgb = hexToRGB(colorUtils.getPlayerColor(s.ownerId!));
        const rgb = adjustColorHSL(rawRgb[0], rawRgb[1], rawRgb[2], satMult, lightMult);
        return {
            hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
            rgb,
            clusterIdx: clusterMap.get(s.id)?.clusterIdx
                ?? clusterMap.get(virtualStarSource.get(s.id) ?? '')?.clusterIdx
                ?? -1,
        };
    });

    // ══════════════════════════════════════════════════════════════════════
    // F-138 Pipeline: Merge → Arcs → Star Margin (hard) → Smooth → Render
    // ══════════════════════════════════════════════════════════════════════
    console.time('[ModifiedVoronoi] Total pipeline');

    // Stage 1: Merge same-owner cells
    console.time('[ModifiedVoronoi] Stage 1: Merge cells');
    const mergedPolygons = mergeSameOwnerCells(
        voronoi, augmentedStars, ownedSet, augOwnedStars, starColors, GAME_CONFIG.TERRITORY_CLUSTER_SPLIT,
    );
    console.timeEnd('[ModifiedVoronoi] Stage 1: Merge cells');
    console.log(`[ModifiedVoronoi] Merged into ${mergedPolygons.length} polygons, total vertices: ${mergedPolygons.reduce((s, p) => s + p.points.length, 0)}`);

    // Stage 1b: Disconnect buffer — push same-owner non-connected territory apart
    if (connections && connections.length > 0) {
        console.time('[ModifiedVoronoi] Stage 1b: Disconnect buffer');
        applyDisconnectBuffer(mergedPolygons, ownedStars, connections);
        console.timeEnd('[ModifiedVoronoi] Stage 1b: Disconnect buffer');
    }

    // Stage 2: Bézier arc smoothing at sharp vertices (BEFORE margin so margin wins)
    console.time('[ModifiedVoronoi] Stage 2: Arc smoothing');
    const arcStrength = GAME_CONFIG.MODIFIED_VORONOI_ARC_STRENGTH ?? 0.3;
    const arcThreshold = GAME_CONFIG.MODIFIED_VORONOI_ARC_THRESHOLD ?? 150;
    const arcMinSeg = GAME_CONFIG.MODIFIED_VORONOI_ARC_MIN_SEGMENT ?? 4;
    smoothSharpVertices(mergedPolygons, ownedStars, arcStrength, arcThreshold, arcMinSeg);
    console.timeEnd('[ModifiedVoronoi] Stage 2: Arc smoothing');
    console.log(`[ModifiedVoronoi] After smoothing, total vertices: ${mergedPolygons.reduce((s, p) => s + p.points.length, 0)}`);

    // Stage 3: Enforce minimum star boundary margin (F-139) — LAST geometric constraint
    // Cap margin at half the minimum inter-star distance to prevent overlapping margins
    console.time('[ModifiedVoronoi] Stage 3: Star margin (hard)');
    let minStarDist = Infinity;
    for (let a = 0; a < stars.length; a++) {
        for (let b = a + 1; b < stars.length; b++) {
            const d = Math.hypot(stars[a].x - stars[b].x, stars[a].y - stars[b].y);
            if (d < minStarDist) minStarDist = d;
        }
    }
    const maxMargin = minStarDist / 2;
    const rawMargin = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45;
    const starMargin = Math.min(rawMargin, maxMargin);
    if (rawMargin > maxMargin) {
        console.log(`[ModifiedVoronoi] Star margin capped: ${rawMargin}px → ${starMargin.toFixed(1)}px (minStarDist=${minStarDist.toFixed(1)}px)`);
    }
    applyMinStarMargin(mergedPolygons, ownedStars, starMargin);
    console.timeEnd('[ModifiedVoronoi] Stage 3: Star margin (hard)');

    // Stage 6: Chaikin smoothing (optional)
    const smoothingIter = GAME_CONFIG.VORONOI_SMOOTHING ?? 0;

    // ── BACKFILL: Draw raw Voronoi cells as base layer for 100% coverage ──
    // This guarantees no gaps — every pixel belongs to some territory.
    // Modified polygons render on top with refined boundaries.
    if (!cellGraphics) {
        cellGraphics = new PIXI.Graphics();
        voronoiContainer.addChild(cellGraphics);
    }
    cellGraphics.clear();

    // Single layer: merged + modified polygons (all compute passes produce the final result)
    for (const poly of mergedPolygons) {
        const smoothed = chaikinSmooth(poly.points, smoothingIter);
        cellGraphics.poly(smoothed.flat());
        cellGraphics.fill({ color: poly.color.hex, alpha });
    }
    console.timeEnd('[ModifiedVoronoi] Total pipeline');

    // ── Draw territory borders as unified paths ──
    if (borderWidth > 0 && borderAlpha > 0) {
        if (!borderGraphics) {
            borderGraphics = new PIXI.Graphics();
            voronoiContainer.addChild(borderGraphics);
        }
        borderGraphics.clear();

        for (const poly of mergedPolygons) {
            const pts = chaikinSmooth(poly.points, smoothingIter);
            const borderColor = rgbToHex(
                Math.min(255, poly.color.rgb[0] + borderBrighten),
                Math.min(255, poly.color.rgb[1] + borderBrighten),
                Math.min(255, poly.color.rgb[2] + borderBrighten),
            );

            // Build single unified path, then stroke once
            if (pts.length > 1) {
                borderGraphics.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    borderGraphics.lineTo(pts[i][0], pts[i][1]);
                }
                borderGraphics.closePath();
                borderGraphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
            }
        }
    } else if (borderGraphics) {
        borderGraphics.clear();
    }

    // ── Apply GPU blur for smooth territory edges (cached) ──
    const blurStrength = GAME_CONFIG.VORONOI_BLUR ?? 8;
    if (blurStrength > 0) {
        if (!cachedBlurFilter || cachedBlurStrength !== blurStrength) {
            cachedBlurFilter = new PIXI.BlurFilter({ strength: blurStrength, quality: 4 });
            cachedBlurStrength = blurStrength;
        }
        cellGraphics.filters = [cachedBlurFilter];
    } else {
        cachedBlurFilter = null;
        cachedBlurStrength = -1;
        if (cellGraphics) cellGraphics.filters = [];
    }
}

// ── Cache Reset ────────────────────────────────────────────────────────────

/** Reset cached data (call on game session change). */
export function resetModifiedVoronoiCache(): void {
    cachedFingerprint = '';
    if (cellGraphics) {
        if (cellGraphics.parent) cellGraphics.parent.removeChild(cellGraphics);
        cellGraphics.destroy();
        cellGraphics = null;
    }
    if (borderGraphics) {
        if (borderGraphics.parent) borderGraphics.parent.removeChild(borderGraphics);
        borderGraphics.destroy();
        borderGraphics = null;
    }
    cachedBlurFilter = null;
    cachedBlurStrength = -1;
}
