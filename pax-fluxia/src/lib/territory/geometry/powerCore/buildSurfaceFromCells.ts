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
 * LIVE-LABEL CLASSIFICATION (the `fronts` param): kinetic-frame cells carry
 * their SETTLED (final) owner throughout an entire conquest morph — that is
 * what keeps the smoothing-chain topology stable and the snap gone. But it
 * also means the raw graph reads as the FINISHED map from frame 1. `fronts`
 * reclassifies the captured cell's rim (and adds the interior front chord)
 * from THIS FRAME's true ownership before frontiers/fills are assembled, so
 * the surface this function returns is simply correct — the caller draws it
 * with no conquest-specific presentation logic at all. See
 * .agent/docs/game/design/2026-07-09_TRANSITION_BORDER_CLASSIFICATION_PROPOSAL.md.
 *
 * Pure: no PIXI, no config, no Svelte. Offline-testable.
 */

import { buildSharedEdgeGraph } from './sharedEdgeGraph';
import { smoothSharedEdges } from './smoothSharedEdges';
import { chainEdgesIntoPolylines } from './buildPowerCoreAuthoritySnapshot';
import {
    clipPolylineByFront,
    frontFieldForRing,
    splitCellByFrontDetailed,
} from './conquestFrontField';
import { buildPushedFront } from './pushedBorderFront';
import {
    WORLD_OWNER,
    type Point,
    type PowerCell,
    type SharedEdge,
    type SharedEdgeGraph,
    type WorldRect,
} from './powerCoreTypes';
import type { ActiveConquestFront } from './kineticTypes';

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
     * merged regions), without the fragile face walk. Cells with an active front
     * (see `fronts`) are split into their ahead/behind pieces here.
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
 * on, so the mesh is CONFORMING before the shared-edge graph is built. A no-op
 * on the current architecture (kinetic-frame cells are always UNSPLIT — see the
 * module doc), kept for any caller that still passes pre-split cells (e.g. an
 * idle snapshot with legacy split geometry): those cells share a siteId, which
 * is otherwise unique per real power-diagram cell.
 */
const PT_Q = 1000;
/** Numeric point key (1e-3 grid) — no collisions for |coord*1e3| < 5e6, and far
 *  faster than string keys in the per-frame hot loops. */
function ptKey(x: number, y: number): number {
    return Math.round(x * PT_Q) * 1e7 + Math.round(y * PT_Q);
}

function conformCellBoundaries(cells: readonly PowerCell[]): PowerCell[] {
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
    if (cand.size === 0) return [...cells]; // no split cells this frame → nothing to conform

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
 * Smoothing-continuity blend for in-flight conquests: the chain DECOMPOSITION
 * depends on ownership (chains break where owner pairs change), so an owner
 * flip re-smooths nearby borders in one frame. Fix: smooth the SAME raw edges
 * under BOTH ownerships and lerp each shared edge's smoothed polyline PRE→POST
 * by w, so every border RESHAPES continuously across the morph. HELD IN
 * RESERVE — not invoked by the family by default (live-label classification
 * makes the captured cell's own rim correct without it); available if a
 * reshape defect resurfaces elsewhere on the map.
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

// ── Live-label classification ────────────────────────────────────────────────

/** Index edges by their undirected RAW endpoint pair (1e-3 grid, matches
 *  sharedEdgeGraph's own quantization) — lets a captured cell's raw ring edges
 *  find their graph entry directly, no string keys in the hot loop. */
function indexByEndpoints<T extends { readonly pts: readonly Point[] }>(
    edges: readonly T[],
): Map<number, Map<number, T>> {
    const index = new Map<number, Map<number, T>>();
    for (const e of edges) {
        const a = e.pts[0]!;
        const b = e.pts[e.pts.length - 1]!;
        const ka = ptKey(a[0], a[1]);
        const kb = ptKey(b[0], b[1]);
        const lo = ka < kb ? ka : kb;
        const hi = ka < kb ? kb : ka;
        let inner = index.get(lo);
        if (!inner) index.set(lo, (inner = new Map()));
        inner.set(hi, e);
    }
    return index;
}

function lookupByEndpoints<T>(
    index: Map<number, Map<number, T>>,
    a: readonly [number, number],
    b: readonly [number, number],
): T | undefined {
    const ka = ptKey(a[0], a[1]);
    const kb = ptKey(b[0], b[1]);
    const lo = ka < kb ? ka : kb;
    const hi = ka < kb ? kb : ka;
    return index.get(lo)?.get(hi);
}

function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

interface ClassificationResult {
    readonly claimedSharedEdgeIds: ReadonlySet<string>;
    readonly claimedWorldEdgeIds: ReadonlySet<string>;
    readonly extraByPair: ReadonlyMap<string, { edgeId: string; points: readonly Point[] }[]>;
    readonly extraByOwner: ReadonlyMap<string, { edgeId: string; points: readonly Point[] }[]>;
    readonly fillOverrideBySite: ReadonlyMap<string, { ownerId: string; points: Point[] }[]>;
    /**
     * The moving front chords, PRE-FORMED — appended to `frontiers` AFTER the
     * chaining pass, never routed through chainEdgesIntoPolylines. This is what
     * guarantees the drawn front border is byte-identical to the fill split's
     * arc: the fill pieces (fillOverrideBySite) and these chords come from the
     * SAME splitCellByFrontDetailed call, and the fill never touches chaining,
     * so the border must not either — chaining could otherwise merge the front
     * arc into an adjacent same-owner-pair rim border (when their crossing
     * endpoints coincide) and reshape it, making the stroked front diverge from
     * the color boundary the fill draws.
     */
    readonly frontChords: SurfaceFrontier[];
}

const NO_CLASSIFICATION: ClassificationResult = {
    claimedSharedEdgeIds: new Set(),
    claimedWorldEdgeIds: new Set(),
    extraByPair: new Map(),
    extraByOwner: new Map(),
    fillOverrideBySite: new Map(),
    frontChords: [],
};

/**
 * Reclassify every active front's captured-cell rim from THIS FRAME's true
 * ownership, and emit the interior front chord. `cells` carry the SETTLED
 * owner throughout the morph, so the POST graph (`graph`) already reads as the
 * finished map — the captured cell's rim edge to a same-(new)-owner neighbor
 * (the attacker's own territory) is same-owner-internal there and DROPPED
 * entirely. Its geometry comes from the PRE graph (built by the caller with
 * every active front's captured cell reverted to its OLD owner): that edge is
 * a real shared edge there (different owners), absent from the POST graph —
 * exactly the persisting old attacker↔defender border.
 *
 * ONE GEOMETRY DOMAIN (the conquest-is-a-map-state invariant): the caller has
 * already folded the PRE-only edges' smoothedPts into the SAME ring lookup the
 * cell fills use, so `buildCellRing(cell)` — the ring split for the fill — and
 * the edge polylines clipped here are the IDENTICAL smoothed curves. Fill
 * seam, rim border, and front chord cannot diverge: an intermediate frame is
 * one coherent map whose (old↔new) border is pushed across the cell like a
 * wave, its ends sliding along the bounding borders.
 *
 * For each captured cell's raw rim edge, in order:
 *   1. Found in the POST graph (a real edge there) → split by the front field;
 *      BEHIND keeps the existing (new-owner, neighbor) pair; AHEAD becomes
 *      (old-owner, neighbor) unless neighbor === old-owner (same owner, drop).
 *   2. Not in POST, found in the PRE graph (the attacker-adjacent edge) →
 *      AHEAD becomes (old-owner, neighbor) — the real, persisting border;
 *      BEHIND is dropped unless neighbor !== new-owner.
 *   3. Found as a world edge → AHEAD reassigned to old-owner, BEHIND stays.
 *
 * At q→0 this reproduces the PRE settled frontier set exactly (everything is
 * "ahead"); once a front leaves `fronts` (q reaches 1) this function isn't
 * called for that cell at all, so the POST settled set is untouched — the
 * classification cannot introduce a start or end discontinuity by construction.
 *
 * KNOWN LIMITATION: two ADJACENT captured cells sharing a rim edge — the first
 * front processed claims that edge; the second front's own pass sees it
 * already claimed and skips it (first-processed wins). Rare (both neighbors
 * mid-conquest simultaneously); a joint two-field split is a follow-up, not
 * required for the single/typical-multi-conquest cases this fixes.
 */
function classifyActiveFronts(
    conformed: readonly PowerCell[],
    graph: SharedEdgeGraph,
    preSharedIndex: Map<number, Map<number, SharedEdge>>,
    fronts: readonly ActiveConquestFront[],
    buildCellRing: (cell: PowerCell) => Point[],
): ClassificationResult {
    if (fronts.length === 0) return NO_CLASSIFICATION;

    const cellBySite = new Map(conformed.map((c) => [c.siteId, c] as const));

    const postSharedIndex = indexByEndpoints(graph.sharedEdges);
    const postWorldIndex = indexByEndpoints(graph.worldEdges);

    const claimedSharedEdgeIds = new Set<string>();
    const claimedWorldEdgeIds = new Set<string>();
    const extraByPair = new Map<string, { edgeId: string; points: readonly Point[] }[]>();
    const extraByOwner = new Map<string, { edgeId: string; points: readonly Point[] }[]>();
    const fillOverrideBySite = new Map<string, { ownerId: string; points: Point[] }[]>();
    const frontChords: SurfaceFrontier[] = [];

    const pushEntry = (
        map: Map<string, { edgeId: string; points: readonly Point[] }[]>,
        key: string,
        edgeId: string,
        points: readonly Point[],
    ) => {
        if (points.length < 2) return;
        let bucket = map.get(key);
        if (!bucket) map.set(key, (bucket = []));
        bucket.push({ edgeId, points });
    };

    /** Sorted owner pair for the moving border (blend colour travels with it). */
    const frontPair = (af: ActiveConquestFront): [string, string] =>
        af.front.ownerOld < af.front.ownerIn
            ? [af.front.ownerOld, af.front.ownerIn]
            : [af.front.ownerIn, af.front.ownerOld];

    /**
     * PUSH front (the default): the pre-conquest border ITSELF travels — see
     * pushedBorderFront.ts. Returns false when the configuration can't build
     * it (no attacker-adjacent entry border, e.g. corridor conquests) — the
     * caller then falls back to the field front.
     */
    const classifyWithPush = (af: ActiveConquestFront, cell: PowerCell): boolean => {
        interface TaggedEdge {
            readonly cls: 'entry' | 'exit' | 'side';
            readonly neighbor: string | null; // null → unattributed (no stroke)
            readonly isWorld: boolean;
            readonly seq: readonly Point[]; // oriented along the ring walk
            readonly claim?: { shared?: string; world?: string };
        }
        const rawPts = cell.points;
        const n = rawPts.length;
        if (n < 3) return false;

        // 1. Classify every raw rim edge (post / world / pre-only) + claims.
        const edges: TaggedEdge[] = [];
        for (let i = 0; i < n; i++) {
            const a = rawPts[i]!;
            const b = rawPts[(i + 1) % n]!;
            const orient = (pts: readonly Point[]): readonly Point[] => {
                const ka = ptKey(a[0], a[1]);
                return ptKey(pts[0]![0], pts[0]![1]) === ka ? pts : [...pts].reverse();
            };
            const postEdge = lookupByEndpoints(postSharedIndex, a, b);
            if (postEdge) {
                const claimed = claimedSharedEdgeIds.has(postEdge.edgeId);
                const neighborOwner =
                    postEdge.ownerA === af.front.ownerIn
                        ? postEdge.ownerB
                        : postEdge.ownerB === af.front.ownerIn
                          ? postEdge.ownerA
                          : null;
                edges.push({
                    cls: neighborOwner === af.front.ownerOld ? 'exit' : 'side',
                    neighbor: claimed ? null : neighborOwner,
                    isWorld: false,
                    seq: orient(postEdge.smoothedPts),
                    claim: claimed ? undefined : { shared: postEdge.edgeId },
                });
                continue;
            }
            const worldEdge = lookupByEndpoints(postWorldIndex, a, b);
            if (worldEdge) {
                const claimed = claimedWorldEdgeIds.has(worldEdge.edgeId);
                edges.push({
                    cls: 'side',
                    neighbor: claimed ? null : WORLD_OWNER,
                    isWorld: true,
                    seq: orient(worldEdge.smoothedPts),
                    claim: claimed ? undefined : { world: worldEdge.edgeId },
                });
                continue;
            }
            const preEdge = lookupByEndpoints(preSharedIndex, a, b);
            if (preEdge) {
                const claimed = claimedSharedEdgeIds.has(preEdge.edgeId);
                edges.push({
                    // PRE-only ⇒ same-owner-internal in POST ⇒ the neighbour is
                    // the NEW owner's territory: the entry border.
                    cls: 'entry',
                    neighbor: claimed ? null : af.front.ownerIn,
                    isWorld: false,
                    seq: orient(preEdge.smoothedPts),
                    claim: claimed ? undefined : { shared: preEdge.edgeId },
                });
                continue;
            }
            edges.push({ cls: 'side', neighbor: null, isWorld: false, seq: [a, b] });
        }

        // 2. Longest cyclic run of entry edges → the entry border. None ⇒ the
        //    attacker isn't rim-adjacent (corridor capture) ⇒ field fallback.
        let entryStart = -1;
        let entryLen = 0;
        {
            let bestPts = -1;
            for (let s = 0; s < n; s++) {
                if (edges[s]!.cls !== 'entry' || edges[(s - 1 + n) % n]!.cls === 'entry') continue;
                let len = 0;
                let pts = 0;
                while (len < n && edges[(s + len) % n]!.cls === 'entry') {
                    pts += edges[(s + len) % n]!.seq.length;
                    len++;
                }
                if (pts > bestPts) {
                    bestPts = pts;
                    entryStart = s;
                    entryLen = len;
                }
            }
        }
        if (entryStart < 0 || entryLen >= n) return false;

        // 3. Build the tagged smoothed ring, rotated so the entry border is
        //    first. Per-edge arc spans recorded for the rim-run emission.
        const ring: Point[] = [];
        const segClass: ('entry' | 'exit' | 'side')[] = [];
        const spans: { s: number; e: number }[] = [];
        let runLen = 0;
        let lastKey = NaN;
        const orderedEdges: TaggedEdge[] = [];
        for (let k = 0; k < n; k++) orderedEdges.push(edges[(entryStart + k) % n]!);
        for (const edge of orderedEdges) {
            const sPos = runLen;
            for (const p of edge.seq) {
                const key = ptKey(p[0], p[1]);
                if (key === lastKey) continue;
                if (ring.length > 0) {
                    const prev = ring[ring.length - 1]!;
                    runLen += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
                    segClass.push(edge.cls);
                }
                ring.push([p[0], p[1]]);
                lastKey = key;
            }
            spans.push({ s: sPos, e: runLen });
        }
        // Close the ring: drop the duplicated closing vertex; its final segment
        // (last → first) belongs to the last edge.
        if (
            ring.length >= 2 &&
            ptKey(ring[0]![0], ring[0]![1]) === ptKey(ring[ring.length - 1]![0], ring[ring.length - 1]![1])
        ) {
            ring.pop();
        } else if (ring.length >= 2) {
            // Defensive: unclosed raw ring — account the wrap segment.
            const a = ring[ring.length - 1]!;
            const b = ring[0]!;
            runLen += Math.hypot(b[0] - a[0], b[1] - a[1]);
            segClass.push(orderedEdges[orderedEdges.length - 1]!.cls);
            spans[spans.length - 1]!.e = runLen;
        }
        if (ring.length < 3 || segClass.length !== ring.length) return false;

        const pushed = buildPushedFront({ ring, segClass, q: af.q });
        if (!pushed) return false;

        // Commit the claims only once the push construction succeeded.
        for (const edge of edges) {
            if (edge.claim?.shared) claimedSharedEdgeIds.add(edge.claim.shared);
            if (edge.claim?.world) claimedWorldEdgeIds.add(edge.claim.world);
        }

        // 4. Fills: the two pieces bounded by the moving border.
        const pieces: { ownerId: string; points: Point[] }[] = [];
        if (pushed.behindRing.length >= 3) {
            pieces.push({ ownerId: af.front.ownerIn, points: pushed.behindRing });
        }
        if (pushed.aheadRing.length >= 3) {
            pieces.push({ ownerId: af.front.ownerOld, points: pushed.aheadRing });
        }
        if (pieces.length === 0) return false;
        fillOverrideBySite.set(af.siteId, pieces);

        // 5. The moving border itself — pre-formed, blend colour travels with it.
        const [fa, fb] = frontPair(af);
        frontChords.push({
            ownerA: fa,
            ownerB: fb,
            points: pushed.front.map((p) => [p[0], p[1]] as [number, number]),
            closed: false,
        });

        // 6. Rim runs: BEHIND rim (through the entry border) reads the NEW
        //    owner; AHEAD rim reads the OLD owner; the junctions A/B slide, so
        //    the colour change travels with the wave. Entry edges are always
        //    fully behind ⇒ (new|new) ⇒ nothing drawn at the old position (the
        //    border has MOVED, not been eaten). Exit edges are ahead ⇒
        //    (old|old) ⇒ invisible until the front lands on them.
        const L = pushed.cum[ring.length]!;
        const pointAt = (pRaw: number): Point => {
            let p = pRaw % L;
            if (p < 0) p += L;
            let i = 0;
            while (i < ring.length - 1 && pushed.cum[i + 1]! < p) i++;
            const segLen = pushed.cum[i + 1]! - pushed.cum[i]!;
            const f = segLen < 1e-12 ? 0 : (p - pushed.cum[i]!) / segLen;
            const a = ring[i]!;
            const b = ring[(i + 1) % ring.length]!;
            return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        };
        const subPolyline = (from: number, to: number): Point[] => {
            const pts: Point[] = [pointAt(from)];
            for (let v = 0; v < ring.length; v++) {
                const p = pushed.cum[v]!;
                if (p > from + 1e-9 && p < to - 1e-9) pts.push([ring[v]![0], ring[v]![1]]);
            }
            pts.push(pointAt(to));
            return pts;
        };
        const behindIntervals: [number, number][] = [
            [pushed.posB, L],
            [0, pushed.posA],
        ];
        const aheadIntervals: [number, number][] = [[pushed.posA, pushed.posB]];
        for (let k = 0; k < orderedEdges.length; k++) {
            const edge = orderedEdges[k]!;
            const neighbor = edge.neighbor;
            if (!neighbor) continue;
            const span = spans[k]!;
            const emit = (
                intervals: [number, number][],
                owner: string,
                tag: string,
            ) => {
                if (!edge.isWorld && owner === neighbor) return; // same owner — no border
                let ri = 0;
                for (const [x, y] of intervals) {
                    const from = Math.max(span.s, x);
                    const to = Math.min(span.e, y);
                    if (to - from < 1e-9) continue;
                    const run = subPolyline(from, to);
                    if (run.length < 2) continue;
                    if (edge.isWorld) {
                        pushEntry(extraByOwner, owner, `${af.siteId}#${tag}${k}_${ri++}`, run);
                    } else {
                        pushEntry(
                            extraByPair,
                            pairKey(owner, neighbor),
                            `${af.siteId}#${tag}${k}_${ri++}`,
                            run,
                        );
                    }
                }
            };
            emit(behindIntervals, af.front.ownerIn, 'pb');
            emit(aheadIntervals, af.front.ownerOld, 'pa');
        }
        return true;
    };

    /** FIELD front (linear/radial variants + fallback): iso-contour split. */
    const classifyWithField = (af: ActiveConquestFront, cell: PowerCell): void => {
        const rim = buildCellRing(cell);
        if (rim.length < 3) return;
        const field = frontFieldForRing(rim, af.front, af.q);
        if (!field) return; // degenerate cell — leave settled classification

        const split = splitCellByFrontDetailed(
            { ...cell, ownerId: af.front.ownerIn, points: rim },
            af.front,
            af.q,
        );
        fillOverrideBySite.set(
            af.siteId,
            split.parts.map((p) => ({ ownerId: p.ownerId, points: p.points as Point[] })),
        );

        const ringPts = cell.points;
        const n = ringPts.length;
        for (let i = 0; i < n; i++) {
            const a = ringPts[i]!;
            const b = ringPts[(i + 1) % n]!;

            const postEdge = lookupByEndpoints(postSharedIndex, a, b);
            if (postEdge && !claimedSharedEdgeIds.has(postEdge.edgeId)) {
                claimedSharedEdgeIds.add(postEdge.edgeId);
                const neighborOwner =
                    postEdge.ownerA === af.front.ownerIn
                        ? postEdge.ownerB
                        : postEdge.ownerB === af.front.ownerIn
                          ? postEdge.ownerA
                          : null;
                if (neighborOwner) {
                    let bi = 0;
                    for (const run of clipPolylineByFront(postEdge.smoothedPts, field, 'behind')) {
                        pushEntry(
                            extraByPair,
                            pairKey(af.front.ownerIn, neighborOwner),
                            `${postEdge.edgeId}#b${bi++}`,
                            run,
                        );
                    }
                    if (neighborOwner !== af.front.ownerOld) {
                        let ai = 0;
                        for (const run of clipPolylineByFront(postEdge.smoothedPts, field, 'ahead')) {
                            pushEntry(
                                extraByPair,
                                pairKey(af.front.ownerOld, neighborOwner),
                                `${postEdge.edgeId}#a${ai++}`,
                                run,
                            );
                        }
                    }
                }
                continue;
            }

            const worldEdge = lookupByEndpoints(postWorldIndex, a, b);
            if (worldEdge && !claimedWorldEdgeIds.has(worldEdge.edgeId)) {
                claimedWorldEdgeIds.add(worldEdge.edgeId);
                let bi = 0;
                for (const run of clipPolylineByFront(worldEdge.smoothedPts, field, 'behind')) {
                    pushEntry(extraByOwner, af.front.ownerIn, `${worldEdge.edgeId}#wb${bi++}`, run);
                }
                let ai = 0;
                for (const run of clipPolylineByFront(worldEdge.smoothedPts, field, 'ahead')) {
                    pushEntry(extraByOwner, af.front.ownerOld, `${worldEdge.edgeId}#wa${ai++}`, run);
                }
                continue;
            }

            // Not in the POST graph (same-owner internal there) — the
            // attacker-adjacent edge, real only before capture.
            const preEdge = lookupByEndpoints(preSharedIndex, a, b);
            if (preEdge && !claimedSharedEdgeIds.has(preEdge.edgeId)) {
                claimedSharedEdgeIds.add(preEdge.edgeId);
                const neighborOwner =
                    preEdge.ownerA === af.front.ownerOld
                        ? preEdge.ownerB
                        : preEdge.ownerB === af.front.ownerOld
                          ? preEdge.ownerA
                          : null;
                if (neighborOwner) {
                    let ai = 0;
                    for (const run of clipPolylineByFront(preEdge.smoothedPts, field, 'ahead')) {
                        pushEntry(
                            extraByPair,
                            pairKey(af.front.ownerOld, neighborOwner),
                            `${preEdge.edgeId}#pa${ai++}`,
                            run,
                        );
                    }
                    if (neighborOwner !== af.front.ownerIn) {
                        let bi = 0;
                        for (const run of clipPolylineByFront(preEdge.smoothedPts, field, 'behind')) {
                            pushEntry(
                                extraByPair,
                                pairKey(af.front.ownerIn, neighborOwner),
                                `${preEdge.edgeId}#pb${bi++}`,
                                run,
                            );
                        }
                    }
                }
            }
        }

        // The moving front, pre-formed (never chained — byte-identical to the
        // fill split's boundary). Pair is old↔new for the travelling blend.
        const [fa, fb] = frontPair(af);
        for (const chain of split.frontChains) {
            if (chain.length < 2) continue;
            frontChords.push({
                ownerA: fa,
                ownerB: fb,
                points: chain.map((p) => [p[0], p[1]] as [number, number]),
                closed: false,
            });
        }
    };

    for (const af of fronts) {
        const cell = cellBySite.get(af.siteId);
        if (!cell) continue;
        if (af.front.mode === 'push' && classifyWithPush(af, cell)) continue;
        classifyWithField(af, cell);
    }

    return {
        claimedSharedEdgeIds,
        claimedWorldEdgeIds,
        extraByPair,
        extraByOwner,
        fillOverrideBySite,
        frontChords,
    };
}

export function buildSurfaceFromCells(
    cells: readonly PowerCell[],
    passes: number,
    blend?: SmoothingBlend,
    fronts: readonly ActiveConquestFront[] = [],
): CellSurface {
    // Conform first: splice any pre-split cell's crossing points into the
    // neighbour edges (a no-op on the current architecture — see the function
    // doc — kept for legacy-split callers).
    const conformed = conformCellBoundaries(cells);
    const world = worldRectFromCells(conformed);
    const graph = buildSharedEdgeGraph(conformed, world);
    smoothSharedEdges(graph, passes);

    // Smoothing-continuity blend — HELD IN RESERVE (see SmoothingBlend doc).
    if (blend && blend.w < 1 && blend.preOwnerBySiteId.size > 0) {
        const preCells = conformed.map((c) => {
            const pre = blend.preOwnerBySiteId.get(c.siteId);
            return pre ? { ...c, ownerId: pre } : c;
        });
        const preGraph = buildSharedEdgeGraph(preCells, world);
        smoothSharedEdges(preGraph, passes);
        const preById = new Map(preGraph.sharedEdges.map((e) => [e.edgeId, e]));
        for (const e of graph.sharedEdges) {
            const pre = preById.get(e.edgeId);
            if (!pre) continue;
            if (pre.ownerA !== e.ownerA || pre.ownerB !== e.ownerB) continue;
            e.smoothedPts = lerpPolylines(pre.smoothedPts, e.smoothedPts, blend.w);
        }
    }

    // Index every graph edge (shared + world) by its undirected endpoint pair —
    // used both to reconstruct a cell's smoothed rim (below, and by live-label
    // classification) and for the final per-cell fill loop.
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

    // PRE graph (only while conquests are in flight): every active front's
    // captured cell reverted to its OLD owner — the pre-conquest ownership.
    // Two jobs:
    //  1. classifyActiveFronts reads its edges for live-label rim attribution.
    //  2. ONE GEOMETRY DOMAIN: its PRE-ONLY edges (the attacker↔captured entry
    //     border — same-owner-internal in the POST graph, so absent from the
    //     lookup above) are folded into the SAME ring lookup the cell fills
    //     use. Without this, the fill ring falls back to the RAW polygon edge
    //     there while the drawn border uses the PRE-SMOOTHED curve — the fill
    //     seam and the stroked border visibly diverge from frame 1 of every
    //     conquest (the "border front doesn't match fill front" defect). With
    //     it, fill seam, rim border, front field, and front chord all read the
    //     identical smoothed curve: an intermediate frame is ONE map state and
    //     the old border is pushed across the cell as a single coherent wave.
    //     Neighbor (attacker) cells' rings pick up the same curve, so adjacent
    //     fills stay watertight.
    let preSharedIndex = new Map<number, Map<number, SharedEdge>>();
    if (fronts.length > 0) {
        const activeBySite = new Map(fronts.map((af) => [af.siteId, af] as const));
        const preCells = conformed.map((c) => {
            const af = activeBySite.get(c.siteId);
            return af ? { ...c, ownerId: af.front.ownerOld } : c;
        });
        const preGraph = buildSharedEdgeGraph(preCells, world);
        smoothSharedEdges(preGraph, passes);
        preSharedIndex = indexByEndpoints(preGraph.sharedEdges);
        for (const e of preGraph.sharedEdges) {
            const ka = ptKey(e.pts[0]![0], e.pts[0]![1]);
            const kb = ptKey(e.pts[e.pts.length - 1]![0], e.pts[e.pts.length - 1]![1]);
            if (!lookupEdge(ka, kb)) indexEdge(e.pts, e.smoothedPts);
        }
    }

    const buildCellRing = (cell: PowerCell): Point[] => {
        const pts = cell.points;
        const n = pts.length;
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
        if (
            ring.length >= 2 &&
            ptKey(ring[0]![0], ring[0]![1]) === ptKey(ring[ring.length - 1]![0], ring[ring.length - 1]![1])
        ) {
            ring.pop();
        }
        return ring;
    };

    // Live-label border classification (see classifyActiveFronts doc).
    const classification = classifyActiveFronts(conformed, graph, preSharedIndex, fronts, buildCellRing);

    const byPair = new Map<string, { edgeId: string; points: readonly Point[] }[]>();
    for (const e of graph.sharedEdges) {
        if (classification.claimedSharedEdgeIds.has(e.edgeId)) continue;
        const key = `${e.ownerA}|${e.ownerB}`;
        const bucket = byPair.get(key);
        const entry = { edgeId: e.edgeId, points: e.smoothedPts };
        if (bucket) bucket.push(entry);
        else byPair.set(key, [entry]);
    }
    for (const [key, entries] of classification.extraByPair) {
        const bucket = byPair.get(key);
        if (bucket) bucket.push(...entries);
        else byPair.set(key, [...entries]);
    }
    const frontiers = chainByGroup(
        byPair,
        (key) => key.split('|') as [string, string],
    );
    // Append the pre-formed front chords AFTER chaining — never chained, so the
    // stroked front is byte-identical to the fill split's arc (the whole point
    // of live-label classification: fill and border are the same geometry).
    for (const chord of classification.frontChords) frontiers.push(chord);

    const byOwner = new Map<string, { edgeId: string; points: readonly Point[] }[]>();
    for (const e of graph.worldEdges) {
        if (classification.claimedWorldEdgeIds.has(e.edgeId)) continue;
        const bucket = byOwner.get(e.owner);
        const entry = { edgeId: e.edgeId, points: e.smoothedPts };
        if (bucket) bucket.push(entry);
        else byOwner.set(e.owner, [entry]);
    }
    for (const [owner, entries] of classification.extraByOwner) {
        const bucket = byOwner.get(owner);
        if (bucket) bucket.push(...entries);
        else byOwner.set(owner, [...entries]);
    }
    const worldBorders = chainByGroup(byOwner, (owner) => [owner, WORLD_OWNER]);

    // Smoothed per-cell fills: swap each cell's owner-boundary edges for the
    // smoothed polyline (both cells sharing an inter-owner edge read the
    // identical smoothedPts, so their fills meet exactly on the curve and
    // match the stroked border). Cells with an active front are replaced by
    // their ahead/behind split pieces.
    const cellFills: SurfaceRegion[] = [];
    for (const cell of conformed) {
        if (cell.points.length < 3) continue;
        const override = classification.fillOverrideBySite.get(cell.siteId);
        if (override) {
            for (const piece of override) {
                if (piece.points.length >= 3) {
                    cellFills.push({
                        ownerId: piece.ownerId,
                        points: piece.points,
                        siteId: `${cell.siteId}§${piece.ownerId}`,
                    });
                }
            }
            continue;
        }
        const ring = buildCellRing(cell);
        if (ring.length >= 3) {
            cellFills.push({ ownerId: cell.ownerId, points: ring, siteId: cell.siteId });
        }
    }

    return { cellFills, frontiers, worldBorders };
}
