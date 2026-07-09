/**
 * buildSurfaceFromCells — turn ANY power-cell set into the SAME smooth,
 * single-source surface the idle map uses: per-owner region rings (fills) +
 * inter-owner frontier polylines + owner↔world border polylines, all sharing
 * one Chaikin-smoothed source (buildSharedEdgeGraph → smoothSharedEdges →
 * walkRegionLoops / chainEdgesIntoPolylines).
 *
 * The point: a MORPH frame's cells (frozen + moving bubble) go through the exact
 * same assembly as buildPowerCoreAuthoritySnapshot's idle path — so a conquest
 * sweep renders as smooth, watertight, owner-MERGED regions and rounded
 * frontiers, frame by frame, with fills and borders reading the identical
 * smoothed boundary (no per-cell tearing, no fill/border mismatch).
 *
 * Pure: no PIXI, no config, no Svelte. Offline-testable.
 */

import { buildSharedEdgeGraph } from './sharedEdgeGraph';
import { smoothSharedEdges } from './smoothSharedEdges';
import { chainEdgesIntoPolylines } from './buildPowerCoreAuthoritySnapshot';
import {
    WORLD_OWNER,
    type Point,
    type PowerCell,
    type WorldRect,
} from './powerCoreTypes';

export interface SurfaceRegion {
    readonly ownerId: string;
    readonly points: Point[];
    /** The generating cell's siteId (cellFills only) — lets presentation
     *  overlays (the conquest front clip) find a specific cell's smoothed fill. */
    readonly siteId?: string;
}

export interface SurfaceFrontier {
    readonly ownerA: string;
    /** WORLD_OWNER for owner↔world borders. */
    readonly ownerB: string;
    readonly points: [number, number][];
    readonly closed: boolean;
}

export interface CellSurface {
    /**
     * PER-CELL fills (one owner each — never bucket-fill), but each cell's
     * OWNER-BOUNDARY edges are swapped for the SAME smoothed polylines the borders
     * use, so the fill rounds to match the border and adjacent cells share the
     * exact boundary (no gap/overlap). Same-owner interior edges stay raw. This is
     * the robust smooth fill: single-owner (like raw cells) + smoothed (like the
     * merged regions), without the fragile face walk.
     */
    readonly cellFills: SurfaceRegion[];
    /** Inter-owner frontiers (ownerA < ownerB). */
    readonly frontiers: SurfaceFrontier[];
    /** Owner↔world borders (ownerB === WORLD_OWNER). */
    readonly worldBorders: SurfaceFrontier[];
}

/**
 * The clip rect the cells were built with, derived from their OWN bounding box.
 * Critical: onWorldBoundary uses a 1e-6 tolerance, so the rect MUST match where
 * the cells were actually clipped (the live kinetic clip is PADDED past the
 * presentation frame). Passing the presentation frame instead classifies zero
 * world edges ⇒ boundary owner faces never close ⇒ walkRegionLoops returns no
 * regions ⇒ fills vanish during the morph. Cells tile the clip, so the union
 * bbox is exactly the clip and every outer edge lands on it.
 */
function worldRectFromCells(cells: readonly PowerCell[]): WorldRect {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const cell of cells) {
        for (const [x, y] of cell.points) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }
    if (!Number.isFinite(minX)) {
        return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    return { width: maxX - minX, height: maxY - minY, minX, minY, maxX, maxY };
}

/**
 * Splice the conquest split's crossing points into the neighbour edges they lie
 * on, so the mesh is CONFORMING before the shared-edge graph is built. Without
 * this, [A,ip] (a split part) and [A,B] (its neighbour) key differently, the
 * frontier is dropped, and walkRegionLoops MERGES the two regions (bucket-fill).
 *
 * This is only reliable on a SINGLE-diagram frame (sampleKineticFrame full mode):
 * every cell shares exact edges, so a crossing lies EXACTLY on the neighbour edge
 * (tolerance 1e-9). On the legacy frozen/bubble stitch the crossed edge belongs to
 * a different diagram and the crossing is off-collinear — which is exactly why the
 * one-diagram frame is required. Power diagrams are otherwise conforming (every
 * real vertex is a shared corner), so this only ever inserts the split's own
 * crossings. A 64px vertex grid keeps it near-linear.
 */
const PT_Q = 1000;
/** Numeric point key (1e-3 grid) — no collisions for |coord*1e3| < 5e6, and far
 *  faster than string keys in the per-frame hot loops. */
function ptKey(x: number, y: number): number {
    return Math.round(x * PT_Q) * 1e7 + Math.round(y * PT_Q);
}

function conformCellBoundaries(cells: readonly PowerCell[]): PowerCell[] {
    // ONLY the conquest split creates hanging nodes, and its parts are the only
    // cells that share a siteId (every real power-diagram cell has a unique one).
    // So the candidate crossings are just the split cells' vertices — a handful,
    // not the whole map. Far cells then query empty grid buckets and return
    // immediately, so this is O(edges) with a tiny constant instead of scanning
    // every vertex on every frame.
    const siteCount = new Map<string, number>();
    for (const c of cells) siteCount.set(c.siteId, (siteCount.get(c.siteId) ?? 0) + 1);
    const cand = new Map<number, Point>();
    for (const c of cells) {
        if ((siteCount.get(c.siteId) ?? 0) < 2) continue;
        for (const pt of c.points) {
            const k = ptKey(pt[0], pt[1]);
            if (!cand.has(k)) cand.set(k, [pt[0], pt[1]]);
        }
    }
    if (cand.size === 0) return [...cells]; // no split this frame → nothing to conform

    const GRID = 64;
    const gk = (gx: number, gy: number) => gx * 1e6 + gy;
    const grid = new Map<number, Point[]>();
    for (const v of cand.values()) {
        const k = gk(Math.floor(v[0] / GRID), Math.floor(v[1] / GRID));
        const bucket = grid.get(k);
        if (bucket) bucket.push(v);
        else grid.set(k, [v]);
    }
    const EPS2 = 1e-9 * 1e-9;
    const out: PowerCell[] = [];
    for (const c of cells) {
        const pts = c.points;
        const n = pts.length;
        const newPts: Point[] = [];
        for (let i = 0; i < n; i++) {
            const a = pts[i]!;
            const b = pts[(i + 1) % n]!;
            newPts.push([a[0], a[1]]);
            const ka = ptKey(a[0], a[1]);
            const kb = ptKey(b[0], b[1]);
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const len2 = dx * dx + dy * dy;
            if (len2 <= 1e-12) continue;
            const minGx = Math.floor(Math.min(a[0], b[0]) / GRID) - 1;
            const maxGx = Math.floor(Math.max(a[0], b[0]) / GRID) + 1;
            const minGy = Math.floor(Math.min(a[1], b[1]) / GRID) - 1;
            const maxGy = Math.floor(Math.max(a[1], b[1]) / GRID) + 1;
            const inserts: { t: number; p: Point }[] = [];
            for (let gx = minGx; gx <= maxGx; gx++) {
                for (let gy = minGy; gy <= maxGy; gy++) {
                    const bucket = grid.get(gk(gx, gy));
                    if (!bucket) continue;
                    for (const v of bucket) {
                        const kv = ptKey(v[0], v[1]);
                        if (kv === ka || kv === kb) continue;
                        const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / len2;
                        if (t <= 1e-6 || t >= 1 - 1e-6) continue;
                        const px = a[0] + t * dx;
                        const py = a[1] + t * dy;
                        if ((v[0] - px) ** 2 + (v[1] - py) ** 2 > EPS2) continue;
                        inserts.push({ t, p: v });
                    }
                }
            }
            if (inserts.length === 0) continue;
            inserts.sort((x, y) => x.t - y.t);
            let lastK = NaN;
            for (const ins of inserts) {
                const k = ptKey(ins.p[0], ins.p[1]);
                if (k === lastK) continue;
                lastK = k;
                newPts.push([ins.p[0], ins.p[1]]);
            }
        }
        out.push({ ...c, points: newPts });
    }
    return out;
}

function chainByGroup(
    entries: Map<string, { edgeId: string; points: readonly Point[] }[]>,
    split: (key: string) => [string, string],
): SurfaceFrontier[] {
    const out: SurfaceFrontier[] = [];
    for (const key of [...entries.keys()].sort()) {
        const [ownerA, ownerB] = split(key);
        for (const chain of chainEdgesIntoPolylines(entries.get(key)!)) {
            out.push({ ownerA, ownerB, points: chain.points, closed: chain.closed });
        }
    }
    return out;
}

/**
 * Cut polyline segments that lie ON any of the given rings (within eps) —
 * used by the conquest-front overlay to suppress the SETTLED frontier along the
 * captured cell's rim AHEAD of the front (the ahead piece's own outline draws
 * that rim in the old-owner pairing; without suppression the POST border shows
 * simultaneously with the moving front — a duplicated border). Returns the
 * kept sub-polylines (a line may split into several). Pure.
 */
export function cutPolylinesNearRings(
    lines: readonly SurfaceFrontier[],
    rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
    eps: number,
): SurfaceFrontier[] {
    if (rings.length === 0) return [...lines];
    // Precompute ring bboxes (+eps) for a cheap prefilter.
    const boxes = rings.map((ring) => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const [x, y] of ring) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
        return { minX: minX - eps, minY: minY - eps, maxX: maxX + eps, maxY: maxY + eps };
    });
    const segDist = (
        px: number,
        py: number,
        a: readonly [number, number],
        b: readonly [number, number],
    ): number => {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const l2 = dx * dx + dy * dy;
        let t = l2 < 1e-12 ? 0 : ((px - a[0]) * dx + (py - a[1]) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        return Math.hypot(a[0] + t * dx - px, a[1] + t * dy - py);
    };
    const nearAnyRing = (x: number, y: number): boolean => {
        for (let r = 0; r < rings.length; r++) {
            const box = boxes[r]!;
            if (x < box.minX || x > box.maxX || y < box.minY || y > box.maxY) continue;
            const ring = rings[r]!;
            for (let i = 0; i < ring.length; i++) {
                if (segDist(x, y, ring[i]!, ring[(i + 1) % ring.length]!) <= eps) return true;
            }
        }
        return false;
    };

    const out: SurfaceFrontier[] = [];
    for (const line of lines) {
        const pts = line.points;
        if (pts.length < 2) continue;
        let run: [number, number][] = [];
        const flush = () => {
            if (run.length >= 2) {
                out.push({ ...line, points: run, closed: false });
            }
            run = [];
        };
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i]!;
            const b = pts[i + 1]!;
            const suppressed = nearAnyRing((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
            if (suppressed) {
                if (run.length > 0) run.push([a[0], a[1]]);
                flush();
            } else {
                if (run.length === 0) run.push([a[0], a[1]]);
                run.push([b[0], b[1]]);
            }
        }
        flush();
    }
    return out;
}

/**
 * Smoothing-continuity blend for in-flight conquests: the chain DECOMPOSITION
 * depends on ownership (chains break where owner pairs change), so an owner
 * flip re-smooths nearby borders in one frame — PRE-shaped curves snap to
 * POST-shaped curves (visible as "cells change rounding at conquest start" /
 * "the next border paints instantly"). Fix: smooth the SAME raw edges under
 * BOTH ownerships and lerp each shared edge's smoothed polyline PRE→POST by w,
 * so every border RESHAPES continuously across the morph. Edges whose owner
 * pair itself changes (the captured cell's rim) keep POST smoothing — the
 * front overlay governs their presentation.
 */
export interface SmoothingBlend {
    /** captured siteId → its PRE (old) ownerId. */
    readonly preOwnerBySiteId: ReadonlyMap<string, string>;
    /** 0 = PRE smoothing, 1 = POST smoothing. */
    readonly w: number;
}

/** Resample an open polyline to n points by arc length (linear). */
function resamplePolyline(pts: readonly Point[], n: number): Point[] {
    if (pts.length === n) return pts.map((p) => [p[0], p[1]] as Point);
    const cum: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
        cum.push(cum[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
    }
    const total = cum[cum.length - 1]!;
    const out: Point[] = [];
    for (let k = 0; k < n; k++) {
        const target = total * (k / (n - 1));
        let i = 1;
        while (i < cum.length - 1 && cum[i]! < target) i++;
        const t0 = cum[i - 1]!;
        const t1 = cum[i]!;
        const f = t1 - t0 < 1e-12 ? 0 : (target - t0) / (t1 - t0);
        out.push([
            pts[i - 1]![0] + (pts[i]![0] - pts[i - 1]![0]) * f,
            pts[i - 1]![1] + (pts[i]![1] - pts[i - 1]![1]) * f,
        ]);
    }
    return out;
}

/** Pointwise lerp of two open polylines (resampled to a common count). */
function lerpPolylines(a: readonly Point[], b: readonly Point[], w: number): Point[] {
    const n = Math.max(a.length, b.length);
    const ra = resamplePolyline(a, n);
    const rb = resamplePolyline(b, n);
    const out: Point[] = [];
    for (let i = 0; i < n; i++) {
        out.push([
            ra[i]![0] + (rb[i]![0] - ra[i]![0]) * w,
            ra[i]![1] + (rb[i]![1] - ra[i]![1]) * w,
        ]);
    }
    return out;
}

export function buildSurfaceFromCells(
    cells: readonly PowerCell[],
    passes: number,
    blend?: SmoothingBlend,
): CellSurface {
    // Conform first: splice the conquest front's crossing points into the
    // neighbour edges (exact, single-diagram) so the frontier isn't dropped and
    // regions don't flood into each other (bucket-fill).
    const conformed = conformCellBoundaries(cells);
    const graph = buildSharedEdgeGraph(conformed, worldRectFromCells(conformed));
    smoothSharedEdges(graph, passes);

    // Smoothing-continuity blend (see SmoothingBlend): lerp shared edges'
    // smoothed polylines between the PRE-ownership and POST-ownership chain
    // decompositions. edgeIds are endpoint-keyed (geometry-only), so the same
    // raw edge matches across both graphs; owner-pair-changed edges (the rim)
    // are skipped and keep POST smoothing.
    if (blend && blend.w < 1 && blend.preOwnerBySiteId.size > 0) {
        const preCells = conformed.map((c) => {
            const pre = blend.preOwnerBySiteId.get(c.siteId);
            return pre ? { ...c, ownerId: pre } : c;
        });
        const preGraph = buildSharedEdgeGraph(preCells, worldRectFromCells(preCells));
        smoothSharedEdges(preGraph, passes);
        const preById = new Map(preGraph.sharedEdges.map((e) => [e.edgeId, e]));
        for (const e of graph.sharedEdges) {
            const pre = preById.get(e.edgeId);
            if (!pre) continue; // POST-only edge (rim) — front overlay governs
            if (pre.ownerA !== e.ownerA || pre.ownerB !== e.ownerB) continue;
            e.smoothedPts = lerpPolylines(pre.smoothedPts, e.smoothedPts, blend.w);
        }
    }

    const byPair = new Map<string, { edgeId: string; points: readonly Point[] }[]>();
    for (const e of graph.sharedEdges) {
        const key = `${e.ownerA}|${e.ownerB}`;
        const bucket = byPair.get(key);
        const entry = { edgeId: e.edgeId, points: e.smoothedPts };
        if (bucket) bucket.push(entry);
        else byPair.set(key, [entry]);
    }
    const frontiers = chainByGroup(
        byPair,
        (key) => key.split('|') as [string, string],
    );

    const byOwner = new Map<string, { edgeId: string; points: readonly Point[] }[]>();
    for (const e of graph.worldEdges) {
        const bucket = byOwner.get(e.owner);
        const entry = { edgeId: e.edgeId, points: e.smoothedPts };
        if (bucket) bucket.push(entry);
        else byOwner.set(e.owner, [entry]);
    }
    const worldBorders = chainByGroup(byOwner, (owner) => [owner, WORLD_OWNER]);

    // Smoothed per-cell fills: index every graph edge (shared + world) by its
    // undirected endpoint pair, then rebuild each conformed cell, replacing its
    // owner-boundary edges with the smoothed polyline (canonically oriented) and
    // leaving same-owner interior edges raw. Both cells sharing an inter-owner edge
    // read the identical smoothedPts, so their fills meet exactly on the curve and
    // match the stroked border.
    // Index every graph edge (shared + world) by its undirected endpoint pair
    // (numeric nested map — no string keys in the hot loop). startKey is the
    // canonical smoothedPts[0] key so we know when to reverse.
    const smoothByPair = new Map<number, Map<number, { pts: readonly Point[]; startKey: number }>>();
    const indexEdge = (pts: readonly Point[], smoothed: readonly Point[]) => {
        const ka = ptKey(pts[0]![0], pts[0]![1]);
        const kb = ptKey(pts[pts.length - 1]![0], pts[pts.length - 1]![1]);
        const lo = ka < kb ? ka : kb;
        const hi = ka < kb ? kb : ka;
        let inner = smoothByPair.get(lo);
        if (!inner) smoothByPair.set(lo, (inner = new Map()));
        inner.set(hi, { pts: smoothed, startKey: ka });
    };
    for (const e of graph.sharedEdges) indexEdge(e.pts, e.smoothedPts);
    for (const e of graph.worldEdges) indexEdge(e.pts, e.smoothedPts);
    const lookupEdge = (ka: number, kb: number) => {
        const lo = ka < kb ? ka : kb;
        const hi = ka < kb ? kb : ka;
        return smoothByPair.get(lo)?.get(hi);
    };

    const cellFills: SurfaceRegion[] = [];
    for (const cell of conformed) {
        const pts = cell.points;
        const n = pts.length;
        if (n < 3) continue;
        const ring: Point[] = [];
        let lastKey = NaN;
        const push = (p: Point) => {
            const k = ptKey(p[0], p[1]);
            if (k === lastKey) return;
            lastKey = k;
            ring.push([p[0], p[1]]);
        };
        for (let i = 0; i < n; i++) {
            const a = pts[i]!;
            const b = pts[(i + 1) % n]!;
            const ka = ptKey(a[0], a[1]);
            const sm = lookupEdge(ka, ptKey(b[0], b[1]));
            if (sm) {
                const seq = ka === sm.startKey ? sm.pts : [...sm.pts].reverse();
                for (const p of seq) push(p);
            } else {
                push(a);
                push(b);
            }
        }
        if (ring.length >= 2 && ptKey(ring[0]![0], ring[0]![1]) === ptKey(ring[ring.length - 1]![0], ring[ring.length - 1]![1])) {
            ring.pop();
        }
        if (ring.length >= 3) {
            cellFills.push({ ownerId: cell.ownerId, points: ring, siteId: cell.siteId });
        }
    }

    return { cellFills, frontiers, worldBorders };
}
