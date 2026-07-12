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
import { splitCellByFront, frontFieldOn } from './conquestFrontField';
import type { ConquestCut } from './kineticTypes';
import {
    WORLD_OWNER,
    type Point,
    type PowerCell,
    type WorldRect,
} from './powerCoreTypes';

export interface SurfaceRegion {
    readonly ownerId: string;
    /** Generator cell's siteId — the per-cell identity (fills are PER-CELL). */
    readonly siteId?: string;
    readonly points: Point[];
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

export function buildSurfaceFromCells(
    cells: readonly PowerCell[],
    passes: number,
    /** END_SNAP_FIX_EVAL 'converge': converge the shared-edge single source
     *  toward the settled surface (distance-capped) before deriving outputs. */
    converge?: SurfaceConvergeTarget,
): CellSurface {
    // Conform first: splice the conquest front's crossing points into the
    // neighbour edges (exact, single-diagram) so the frontier isn't dropped and
    // regions don't flood into each other (bucket-fill).
    const conformed = conformCellBoundaries(cells);
    const graph = buildSharedEdgeGraph(conformed, worldRectFromCells(conformed));
    smoothSharedEdges(graph, passes);
    // END_SNAP_FIX_EVAL 'converge' v2: converge the SINGLE SOURCE (smoothedPts)
    // so fills and borders downstream converge identically by construction.
    if (converge && converge.blend > 0) convergeSharedEdgesInPlace(graph, converge);

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
            cellFills.push({ ownerId: cell.ownerId, siteId: cell.siteId, points: ring });
        }
    }

    return { cellFills, frontiers, worldBorders };
}

// ═════════════════════════════════════════════════════════════════════════════
// END_SNAP_FIX_EVAL — two candidate fixes for the end-of-transition border snap
// (root cause: differential Chaikin rounding; see the 2026-07-12 post-mortem +
// endSnapFrameDelta.harness.test.ts). BOTH are behind the TERRITORY_END_SNAP_FIX
// toggle for user evaluation; after a winner is chosen, remove the loser and
// this banner. Everything below this line is eval scaffolding.
// ═════════════════════════════════════════════════════════════════════════════

// ── Candidate 1: 'converge' v2 — SYNTHESIS (user feedback 2026-07-12).
//    v1 converged the OUTPUTS (fills and borders projected onto DIFFERENT
//    target sets) — violating the single-source law and producing exactly the
//    observed glitches: border fragments "flying away across the map" (nearest
//    same-pair target could be a distant border) and slice-lines/black
//    triangles (fill/border divergence). v2 converges the SINGLE SOURCE — the
//    graph's shared-edge smoothedPts, AFTER Chaikin, BEFORE fills/frontiers
//    are derived — so fills and borders converge IDENTICALLY by construction,
//    and a DISTANCE CAP (the real rounding gap is ≤~10px; anything wanting to
//    travel farther is a wrong correspondence) makes fly-away impossible. ────

export interface SurfaceConvergeTarget {
    /** The SETTLED surface (buildSurfaceFromCells of the settled cells). */
    readonly settled: CellSurface;
    /** 0 = pure morph surface; 1 = fully landed on the settled surface. */
    readonly blend: number;
}

/** Max distance (px) a point may converge across. Beyond this the nearest
 *  same-pair settled border is a WRONG correspondence (the genuine rounding
 *  gap is ≤~10px) and the point stays put — the fly-away guard. */
const MAX_CONVERGE_SNAP_PX = 20;

/** Nearest point to (px,py) on a polyline set; null if empty. */
function nearestOnPolys(
    px: number,
    py: number,
    polys: readonly (readonly (readonly [number, number])[])[],
): [number, number] | null {
    let best: [number, number] | null = null;
    let bestD2 = Infinity;
    for (const poly of polys) {
        for (let i = 0; i + 1 < poly.length; i++) {
            const ax = poly[i]![0];
            const ay = poly[i]![1];
            const dx = poly[i + 1]![0] - ax;
            const dy = poly[i + 1]![1] - ay;
            const len2 = dx * dx + dy * dy;
            let t = len2 > 1e-12 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const cx = ax + t * dx;
            const cy = ay + t * dy;
            const d2 = (px - cx) ** 2 + (py - cy) ** 2;
            if (d2 < bestD2) {
                bestD2 = d2;
                best = [cx, cy];
            }
        }
    }
    return best;
}

/** Capped, blended projection of one point onto target polylines. */
function projectCapped(
    p: readonly [number, number],
    polys: readonly (readonly (readonly [number, number])[])[],
    blend: number,
): Point {
    if (polys.length === 0) return [p[0], p[1]];
    const t = nearestOnPolys(p[0], p[1], polys);
    if (!t) return [p[0], p[1]];
    const d = Math.hypot(t[0] - p[0], t[1] - p[1]);
    if (d > MAX_CONVERGE_SNAP_PX) return [p[0], p[1]]; // wrong correspondence — stay
    return [p[0] + (t[0] - p[0]) * blend, p[1] + (t[1] - p[1]) * blend];
}

/**
 * Converge the graph's shared-edge smoothedPts toward the SETTLED surface's
 * borders (per owner-pair, distance-capped). Runs AFTER smoothSharedEdges and
 * BEFORE any fills/frontiers are derived, so everything downstream reads the
 * converged single source — fill/border divergence is impossible. Shared edge
 * ENDPOINTS (junctions, chain-internal boundaries) are converged ONCE per
 * unique point against the UNION of all incident pairs' targets, so every edge
 * meeting that point moves it identically — watertightness is preserved.
 * World edges are untouched (their geometry lies on the clip rect and is
 * identical in morph and settled; only owner labels differ).
 */
function convergeSharedEdgesInPlace(
    graph: import('./powerCoreTypes').SharedEdgeGraph,
    target: SurfaceConvergeTarget,
): void {
    const blend = target.blend < 0 ? 0 : target.blend > 1 ? 1 : target.blend;
    if (blend <= 0) return;

    const pairKeyOf = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const byPair = new Map<string, [number, number][][]>();
    for (const f of target.settled.frontiers) {
        const k = pairKeyOf(f.ownerA, f.ownerB);
        (byPair.get(k) ?? byPair.set(k, []).get(k)!).push(f.points);
    }

    // Incident owner-pairs per shared endpoint (quantized key) — endpoints are
    // converged once against the UNION so all incident edges agree.
    const endpointPairs = new Map<number, Set<string>>();
    for (const e of graph.sharedEdges) {
        const k = pairKeyOf(e.ownerA, e.ownerB);
        for (const end of [e.smoothedPts[0]!, e.smoothedPts[e.smoothedPts.length - 1]!]) {
            const key = ptKey(end[0], end[1]);
            (endpointPairs.get(key) ?? endpointPairs.set(key, new Set()).get(key)!).add(k);
        }
    }

    const endpointCache = new Map<number, Point>();
    for (const e of graph.sharedEdges) {
        const own = byPair.get(pairKeyOf(e.ownerA, e.ownerB)) ?? [];
        const last = e.smoothedPts.length - 1;
        e.smoothedPts = e.smoothedPts.map((p, i) => {
            if (i === 0 || i === last) {
                const key = ptKey(p[0], p[1]);
                const cached = endpointCache.get(key);
                if (cached) return [cached[0], cached[1]] as Point;
                const pairs = endpointPairs.get(key);
                const union: [number, number][][] = [];
                if (pairs) for (const pk of pairs) union.push(...(byPair.get(pk) ?? []));
                const out = projectCapped(p, union, blend);
                endpointCache.set(key, out);
                return out;
            }
            return projectCapped(p, own, blend);
        });
    }
}

// ── Candidate 2: 'round_cut' — the surface was built from UNSPLIT cells
//    (rounding is byte-identical to idle); apply the conquest cut AFTERWARDS.
//    Classification is BY CONSTRUCTION: fills split by splitCellByFront on the
//    ROUNDED ring; border portions relabel by the SAME field's sign (T(x) > c
//    = old-owner side), restricted to points lying ON the captured ring. ─────

const ON_RING_EPS = 0.75; // px — ring points and frontier points share smoothedPts exactly

function distToRing(px: number, py: number, ring: readonly Point[]): number {
    let best = Infinity;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        const [ax, ay] = ring[i]!;
        const [bx, by] = ring[(i + 1) % n]!;
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy;
        let t = len2 > 1e-12 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d2 = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
        if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
}

/**
 * Apply deferred conquest cuts to a ROUNDED surface. For each cut:
 *  - the captured cell's rounded fill splits into victor/old parts (same
 *    splitCellByFront, run on the rounded ring — convexity is preserved by
 *    corner-cutting, so the exact walk applies);
 *  - every frontier/world-border portion ON the captured ring with T(x) > c
 *    flips to the OLD owner's pair (dropped entirely if that pair is
 *    same-owner); crossings are interpolated so the flip point is exact;
 *  - the front contour itself (the split parts' off-ring boundary) is added
 *    as the victor|old frontier.
 * At q→1 the old side vanishes ⇒ the surface IS the settled rounded map —
 * nothing pops, by construction.
 */
export function cutSurfaceByFront(
    surface: CellSurface,
    cuts: readonly ConquestCut[],
): CellSurface {
    let frontiers = [...surface.frontiers];
    let worldBorders = [...surface.worldBorders];
    let cellFills = [...surface.cellFills];

    for (const cut of cuts) {
        const fillIdx = cellFills.findIndex((r) => r.siteId === cut.siteId);
        if (fillIdx < 0) continue;
        const fill = cellFills[fillIdx]!;
        const ring = fill.points;
        if (ring.length < 3) continue;

        const { T, c } = frontFieldOn(ring, cut.front, cut.q);
        const onRing = (p: readonly [number, number]) =>
            distToRing(p[0], p[1], ring) < ON_RING_EPS;
        const oldSide = (p: readonly [number, number]) => onRing(p) && T(p) > c;

        // ── Fills: split the rounded ring by the front. ─────────────────────
        const parts = splitCellByFront(
            { ...fill, siteId: cut.siteId, ownerId: cut.front.ownerIn, points: ring.map((p) => [p[0], p[1]] as Point) } as PowerCell,
            cut.front,
            cut.q,
        );
        const newFills: SurfaceRegion[] = parts.map((part) => ({
            ownerId: part.ownerId,
            siteId: cut.siteId,
            points: part.points,
        }));
        cellFills.splice(fillIdx, 1, ...newFills);

        // ── Front contour: victor part's off-ring runs (+ their on-ring
        //    neighbours as endpoints) = the moving victor|old border. ────────
        const victorPart = parts.find((p) => p.ownerId === cut.front.ownerIn);
        if (victorPart && parts.length > 1) {
            const vp = victorPart.points;
            const m = vp.length;
            const off = vp.map((p) => !onRing(p));
            for (let start = 0; start < m; start++) {
                if (!off[start] || off[(start - 1 + m) % m]) continue;
                // start of an off-ring run
                const contour: Point[] = [vp[(start - 1 + m) % m]!];
                let i = start;
                while (off[i % m] && contour.length <= m) {
                    contour.push(vp[i % m]!);
                    i++;
                }
                contour.push(vp[i % m]!);
                if (contour.length >= 2) {
                    const a = cut.front.ownerIn < cut.front.ownerOld;
                    frontiers.push({
                        ownerA: a ? cut.front.ownerIn : cut.front.ownerOld,
                        ownerB: a ? cut.front.ownerOld : cut.front.ownerIn,
                        points: contour.map((p) => [p[0], p[1]] as [number, number]),
                        closed: false,
                    });
                }
            }
        }

        // ── Borders: relabel old-side portions of every line touching the
        //    ring. Field-sign classification — zero hand-enumerated cases. ───
        const relabelLine = (
            pts: readonly (readonly [number, number])[],
            emit: (run: [number, number][], toOld: boolean) => void,
        ): void => {
            let run: [number, number][] = [];
            let runOld: boolean | null = null;
            const flush = () => {
                if (run.length >= 2 && runOld !== null) emit(run, runOld);
                run = [];
                runOld = null;
            };
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i]!;
                const pOld = oldSide(p);
                if (runOld === null) {
                    run.push([p[0], p[1]]);
                    runOld = pOld;
                    continue;
                }
                if (pOld === runOld) {
                    run.push([p[0], p[1]]);
                    continue;
                }
                // classification flips between prev and p
                const prev = run[run.length - 1]!;
                const bothOn = onRing(prev) && onRing(p);
                if (bothOn) {
                    // T crossed c along the ring: interpolate the exact crossing.
                    const ta = T(prev);
                    const tb = T(p);
                    const t = Math.abs(tb - ta) > 1e-12 ? (c - ta) / (tb - ta) : 0.5;
                    const x: [number, number] = [
                        prev[0] + (p[0] - prev[0]) * Math.max(0, Math.min(1, t)),
                        prev[1] + (p[1] - prev[1]) * Math.max(0, Math.min(1, t)),
                    ];
                    run.push(x);
                    flush();
                    run = [x, [p[0], p[1]]];
                    runOld = pOld;
                } else {
                    // Left/entered the ring: the previous vertex is the shared
                    // break point — it ends the old run and starts the new one.
                    flush();
                    run = [
                        [prev[0], prev[1]],
                        [p[0], p[1]],
                    ];
                    runOld = pOld;
                }
            }
            flush();
        };

        const nextFrontiers: SurfaceFrontier[] = [];
        for (const f of frontiers) {
            const touchesVictor = f.ownerA === cut.front.ownerIn || f.ownerB === cut.front.ownerIn;
            if (!touchesVictor) {
                nextFrontiers.push(f);
                continue;
            }
            const other = f.ownerA === cut.front.ownerIn ? f.ownerB : f.ownerA;
            relabelLine(f.points, (runPts, toOld) => {
                if (!toOld) {
                    nextFrontiers.push({ ...f, points: runPts, closed: false });
                    return;
                }
                if (other === cut.front.ownerOld) return; // old|old → not a border
                const a = cut.front.ownerOld < other;
                nextFrontiers.push({
                    ownerA: a ? cut.front.ownerOld : other,
                    ownerB: a ? other : cut.front.ownerOld,
                    points: runPts,
                    closed: false,
                });
            });
        }
        frontiers = nextFrontiers;

        const nextWorld: SurfaceFrontier[] = [];
        for (const w of worldBorders) {
            if (w.ownerA !== cut.front.ownerIn) {
                nextWorld.push(w);
                continue;
            }
            relabelLine(w.points, (runPts, toOld) => {
                nextWorld.push(
                    toOld
                        ? { ...w, ownerA: cut.front.ownerOld, points: runPts, closed: false }
                        : { ...w, points: runPts, closed: false },
                );
            });
        }
        worldBorders = nextWorld;
    }

    return { cellFills, frontiers, worldBorders };
}
