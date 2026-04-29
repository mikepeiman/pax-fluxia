/**
 * metaball-grid — wave planner (MG3)
 *
 * For each conquest event, compute a `flipTime ∈ [0, 1]` for every dispossessed
 * grid vstar attributed to that event. The wave cascades out from seed cells
 * under the selected `GridWaveSeeding`, with rank determined by the selected
 * `GridWaveGeometry`. Ties are broken deterministically by `(gridIy, gridIx)`.
 *
 * Pure function. Deterministic for fixed inputs.
 */

import type { ConquestEvent } from '@pax/common';
import { makeEventId } from './buildGridClassification';
import type {
    GridAdjacency,
    GridClassification,
    GridVStar,
    GridWaveGeometry,
    GridWavePlan,
    GridWavePlanEvent,
    GridWaveSeeding,
    PlanGridWaveParams,
} from './metaballGridTypes';
import { buildOrderedTransitionFrontier } from './metaballGridActiveFrontier';

// ─────────────────────────────────────────────────────────────────────────────
// Grid helpers.
// ─────────────────────────────────────────────────────────────────────────────

interface GridIndex {
    readonly cols: number;
    readonly rows: number;
    readonly byId: ReadonlyMap<string, GridVStar>;
}

function buildIndex(classification: GridClassification): GridIndex {
    const byId = new Map<string, GridVStar>();
    for (const v of classification.vstars) byId.set(v.id, v);
    return { cols: classification.cols, rows: classification.rows, byId };
}

function idAt(ix: number, iy: number): string {
    return `g:${ix}:${iy}`;
}

/** Neighbor offsets for 4/8 adjacency. */
function neighborOffsets(adj: GridAdjacency): ReadonlyArray<readonly [number, number]> {
    if (adj === '4') {
        return [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ];
    }
    return [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed selection.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the seed cells for one event under the selected seeding mode.
 *
 * - `winner_natives`     — native cells of `event.newOwner` that are adjacent
 *                          (under `adjacency`) to any dispossessed cell of the event.
 * - `conquered_star_center` — the single cell closest to the conquered star's
 *                          world position (from `resolveStarPosition`).
 * - `winner_nearest_edge` — native cells of `event.newOwner` that share a 4-edge
 *                          (always 4-connected) with a dispossessed cell of
 *                          the event. Stricter subset of `winner_natives`.
 */
function resolveSeeds(params: {
    event: ConquestEvent;
    dispossessedIds: readonly string[];
    index: GridIndex;
    classification: GridClassification;
    seeding: GridWaveSeeding;
    adjacency: GridAdjacency;
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}): string[] {
    const { event, dispossessedIds, index, classification, seeding, adjacency, resolveStarPosition } = params;

    if (dispossessedIds.length === 0) return [];

    if (seeding === 'conquered_star_center') {
        const pos = resolveStarPosition?.(event.starId);
        if (!pos) {
            // Fallback: centroid of dispossessed cells, picking the closest cell to centroid.
            return [pickCentroidSeed(dispossessedIds, index)];
        }
        return [pickNearestCell(pos.x, pos.y, dispossessedIds, index)];
    }

    const dispossessedSet = new Set(dispossessedIds);
    const winnerOwner = event.newOwner;
    const adjFor = seeding === 'winner_nearest_edge' ? '4' : adjacency;
    const offsets = neighborOffsets(adjFor);

    const seeds = new Set<string>();
    for (const did of dispossessedIds) {
        const v = index.byId.get(did);
        if (!v) continue;
        for (const [dx, dy] of offsets) {
            const nx = v.ix + dx;
            const ny = v.iy + dy;
            if (nx < 0 || ny < 0 || nx >= index.cols || ny >= index.rows) continue;
            const nid = idAt(nx, ny);
            if (dispossessedSet.has(nid)) continue;
            const nv = index.byId.get(nid);
            if (!nv) continue;
            if (nv.role === 'native' && nv.nextOwnerId === winnerOwner) {
                seeds.add(nid);
            }
        }
    }

    // If no adjacent winner-native exists (e.g. winner had no foothold), fall back
    // to the nearest dispossessed cell to the conquered star if we can resolve it,
    // else the first dispossessed cell in deterministic order.
    if (seeds.size === 0) {
        const pos = resolveStarPosition?.(event.starId);
        if (pos) {
            return [pickNearestCell(pos.x, pos.y, dispossessedIds, index)];
        }
        return [dispossessedIds[0]];
    }

    return Array.from(seeds).sort();
}

function pickNearestCell(x: number, y: number, ids: readonly string[], index: GridIndex): string {
    let bestId = ids[0];
    let bestD = Infinity;
    for (const id of ids) {
        const v = index.byId.get(id);
        if (!v) continue;
        const dx = v.x - x;
        const dy = v.y - y;
        const d = dx * dx + dy * dy;
        if (d < bestD || (d === bestD && id < bestId)) {
            bestD = d;
            bestId = id;
        }
    }
    return bestId;
}

function pickCentroidSeed(ids: readonly string[], index: GridIndex): string {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const id of ids) {
        const v = index.byId.get(id);
        if (!v) continue;
        sx += v.x;
        sy += v.y;
        n++;
    }
    if (n === 0) return ids[0];
    return pickNearestCell(sx / n, sy / n, ids, index);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rank geometries.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multi-source BFS rank across dispossessed cells, starting from seeds.
 * Rank for a seed = 0. Rank for its frontier = 1, etc. Cells unreachable
 * within the dispossessed subgraph get rank = maxRank + 1 (placed at end).
 */
function rankByGridBfs(params: {
    seeds: readonly string[];
    dispossessedIds: readonly string[];
    index: GridIndex;
    adjacency: GridAdjacency;
}): { rank: Map<string, number>; maxRank: number } {
    const { seeds, dispossessedIds, index, adjacency } = params;
    const dispossessedSet = new Set(dispossessedIds);
    const offsets = neighborOffsets(adjacency);
    const rank = new Map<string, number>();
    const queue: string[] = [];

    // Seeds are rank 0 if they are themselves dispossessed; otherwise their
    // dispossessed neighbors are rank 0.
    for (const s of seeds) {
        if (dispossessedSet.has(s)) {
            rank.set(s, 0);
            queue.push(s);
        } else {
            const v = index.byId.get(s);
            if (!v) continue;
            for (const [dx, dy] of offsets) {
                const nx = v.ix + dx;
                const ny = v.iy + dy;
                const nid = idAt(nx, ny);
                if (dispossessedSet.has(nid) && !rank.has(nid)) {
                    rank.set(nid, 0);
                    queue.push(nid);
                }
            }
        }
    }

    // Standard BFS.
    let head = 0;
    while (head < queue.length) {
        const cur = queue[head++];
        const cv = index.byId.get(cur);
        if (!cv) continue;
        const curRank = rank.get(cur) ?? 0;
        for (const [dx, dy] of offsets) {
            const nx = cv.ix + dx;
            const ny = cv.iy + dy;
            const nid = idAt(nx, ny);
            if (!dispossessedSet.has(nid)) continue;
            if (rank.has(nid)) continue;
            rank.set(nid, curRank + 1);
            queue.push(nid);
        }
    }

    // Compute maxRank over reachable cells.
    let maxRank = 0;
    for (const r of rank.values()) if (r > maxRank) maxRank = r;

    // Unreachable dispossessed cells (if any) go one past maxRank.
    const unreachableRank = maxRank + 1;
    let hasUnreachable = false;
    for (const id of dispossessedIds) {
        if (!rank.has(id)) {
            rank.set(id, unreachableRank);
            hasUnreachable = true;
        }
    }
    if (hasUnreachable) maxRank = unreachableRank;

    return { rank, maxRank };
}

/**
 * Rank by min Euclidean distance from any seed cell centre. Ranks are discrete
 * bucket indices of the normalized distance, yielding smooth banded waves.
 *
 * Buckets: `rank = round(d / spacing)`. This keeps ranks comparable to grid_bfs
 * depths.
 */
function rankByEuclideanBand(params: {
    seeds: readonly string[];
    dispossessedIds: readonly string[];
    index: GridIndex;
    spacingPx: number;
}): { rank: Map<string, number>; maxRank: number } {
    const { seeds, dispossessedIds, index, spacingPx } = params;

    const seedPositions: Array<{ x: number; y: number }> = [];
    for (const s of seeds) {
        const v = index.byId.get(s);
        if (v) seedPositions.push({ x: v.x, y: v.y });
    }
    if (seedPositions.length === 0) {
        // Fall back to first dispossessed as seed.
        const first = index.byId.get(dispossessedIds[0]);
        if (first) seedPositions.push({ x: first.x, y: first.y });
    }

    const rank = new Map<string, number>();
    let maxRank = 0;
    for (const id of dispossessedIds) {
        const v = index.byId.get(id);
        if (!v) continue;
        let minD = Infinity;
        for (const s of seedPositions) {
            const dx = v.x - s.x;
            const dy = v.y - s.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < minD) minD = d;
        }
        const r = Math.round(minD / spacingPx);
        rank.set(id, r);
        if (r > maxRank) maxRank = r;
    }
    return { rank, maxRank };
}

// ─────────────────────────────────────────────────────────────────────────────
// Flip-time assignment.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert ranks to flip times in [0, 1]. Ties broken deterministically by
 * `(gridIy, gridIx)` per the plan.
 *
 * Special case: when `maxRank === 0` (all seeds are themselves the full
 * dispossessed set, or only one rank present), every cell gets `flipTime = 0`.
 * This is a degenerate wave — everything flips at progress 0 — and is
 * preferable to dividing by zero.
 */
function assignFlipTimes(params: {
    rank: ReadonlyMap<string, number>;
    maxRank: number;
    dispossessedIds: readonly string[];
    index: GridIndex;
}): Map<string, number> {
    const { rank, maxRank, dispossessedIds, index } = params;
    const flip = new Map<string, number>();

    // Sort dispossessed ids by (rank, iy, ix) for deterministic tiebreak.
    const sorted = [...dispossessedIds].sort((a, b) => {
        const ra = rank.get(a) ?? 0;
        const rb = rank.get(b) ?? 0;
        if (ra !== rb) return ra - rb;
        const va = index.byId.get(a);
        const vb = index.byId.get(b);
        if (!va || !vb) return a < b ? -1 : 1;
        if (va.iy !== vb.iy) return va.iy - vb.iy;
        return va.ix - vb.ix;
    });

    if (maxRank <= 0) {
        for (const id of sorted) flip.set(id, 0);
        return flip;
    }

    for (const id of sorted) {
        const r = rank.get(id) ?? 0;
        flip.set(id, r / maxRank);
    }
    return flip;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a full wave plan covering every dispossessed cell. Iterates events in
 * input order. Cells attributed to the synthetic default event are grouped
 * under a single synthetic plan entry.
 */
export function planGridWave(params: PlanGridWaveParams): GridWavePlan {
    const { classification, seeding, geometry, adjacency, conquestEvents, resolveStarPosition } = params;
    const index = buildIndex(classification);

    // Build event-id → cells lookup, then iterate in event order plus the default bucket.
    const eventOrder: Array<{ eventId: string; event?: ConquestEvent }> = conquestEvents.map((e) => ({
        eventId: makeEventId(e),
        event: e,
    }));
    const perEvent: GridWavePlanEvent[] = [];
    const flat = new Map<string, number>();

    for (const { eventId, event } of eventOrder) {
        const dispossessedIds = classification.dispossessedByEventId[eventId];
        if (!dispossessedIds || dispossessedIds.length === 0) continue;

        // Seeds: seeding mode requires a concrete event for winner_natives /
        // winner_nearest_edge / conquered_star_center. For the default bucket
        // (no event), fall back to centroid seed.
        let seeds: string[];
        if (event) {
            seeds = resolveSeeds({
                event,
                dispossessedIds,
                index,
                classification,
                seeding,
                adjacency,
                resolveStarPosition,
            });
        } else {
            seeds = [pickCentroidSeed(dispossessedIds, index)];
        }

        // Rank.
        const ranked =
            geometry === 'grid_bfs'
                ? rankByGridBfs({ seeds, dispossessedIds, index, adjacency })
                : rankByEuclideanBand({
                      seeds,
                      dispossessedIds,
                      index,
                      spacingPx: classification.spacingPx,
                  });

        const flipTimeByVId = assignFlipTimes({
            rank: ranked.rank,
            maxRank: ranked.maxRank,
            dispossessedIds,
            index,
        });

        for (const [id, t] of flipTimeByVId) flat.set(id, t);

        perEvent.push({
            eventId,
            seeding,
            geometry,
            adjacency,
            maxRank: ranked.maxRank,
            flipTimeByVId,
            seedVIds: seeds,
        });
    }

    const ordered = buildOrderedTransitionFrontier({
        classification,
        flipTimeByVId: flat,
    });

    return {
        perEvent,
        flipTimeByVId: flat,
        orderedTransitionVIds: ordered.orderedTransitionVIds,
        orderedFlipTimes: ordered.orderedFlipTimes,
    };
}
