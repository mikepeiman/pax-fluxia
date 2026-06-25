/**
 * metaball-grid - wave planner (MG3)
 *
 * For each conquest event, compute a `flipTime in [0, 1]` for every changed
 * grid vstar attributed to that event. Legacy modes build the field from seed
 * cells plus a rank geometry; the newer phase-field modes assign continuous
 * flip times directly from conquest-local spatial relationships.
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
} from './cellGridTypes';
import { buildOrderedTransitionFrontier } from './cellGridActiveFrontier';

interface GridIndex {
    readonly cols: number;
    readonly rows: number;
    readonly byId: ReadonlyMap<string, GridVStar>;
}

interface DirectFlipPlan {
    readonly flipTimeByVId: ReadonlyMap<string, number>;
    readonly maxRank: number;
    readonly seedVIds: readonly string[];
}

function buildIndex(classification: GridClassification): GridIndex {
    const byId = new Map<string, GridVStar>();
    for (const v of classification.vstars) byId.set(v.id, v);
    return { cols: classification.cols, rows: classification.rows, byId };
}

function idAt(ix: number, iy: number): string {
    return `g:${ix}:${iy}`;
}

function clamp01(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function sortIdsByGrid(ids: readonly string[], index: GridIndex): string[] {
    return [...ids].sort((a, b) => {
        const va = index.byId.get(a);
        const vb = index.byId.get(b);
        if (!va || !vb) return a.localeCompare(b);
        if (va.iy !== vb.iy) return va.iy - vb.iy;
        if (va.ix !== vb.ix) return va.ix - vb.ix;
        return a.localeCompare(b);
    });
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

/**
 * Resolve the seed cells for one event under the selected seeding mode.
 *
 * - `winner_natives` - native cells of `event.newOwner` adjacent to any
 *   changed cell of the event.
 * - `conquered_star_center` - the single changed cell closest to the conquered
 *   star's world position.
 * - `winner_nearest_edge` - winner-native cells that share a 4-edge with the
 *   changed zone.
 */
function resolveSeeds(params: {
    event: ConquestEvent;
    changedIds: readonly string[];
    index: GridIndex;
    seeding: GridWaveSeeding;
    adjacency: GridAdjacency;
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}): string[] {
    const { event, changedIds, index, seeding, adjacency, resolveStarPosition } = params;

    if (changedIds.length === 0) return [];

    if (seeding === 'conquered_star_center') {
        const pos = resolveStarPosition?.(event.starId);
        if (!pos) return [pickCentroidSeed(changedIds, index)];
        return [pickNearestCell(pos.x, pos.y, changedIds, index)];
    }

    const changedSet = new Set(changedIds);
    const winnerOwner = event.newOwner;
    const adjFor = seeding === 'winner_nearest_edge' ? '4' : adjacency;
    const offsets = neighborOffsets(adjFor);
    const seeds = new Set<string>();

    for (const changedId of changedIds) {
        const v = index.byId.get(changedId);
        if (!v) continue;
        for (const [dx, dy] of offsets) {
            const nx = v.ix + dx;
            const ny = v.iy + dy;
            if (nx < 0 || ny < 0 || nx >= index.cols || ny >= index.rows) continue;
            const neighborId = idAt(nx, ny);
            if (changedSet.has(neighborId)) continue;
            const neighbor = index.byId.get(neighborId);
            if (!neighbor) continue;
            if (neighbor.role === 'native' && neighbor.nextOwnerId === winnerOwner) {
                seeds.add(neighborId);
            }
        }
    }

    if (seeds.size === 0) {
        const pos = resolveStarPosition?.(event.starId);
        if (pos) return [pickNearestCell(pos.x, pos.y, changedIds, index)];
        return [changedIds[0]];
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

function resolveCentroid(ids: readonly string[], index: GridIndex): { x: number; y: number } {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const id of ids) {
        const v = index.byId.get(id);
        if (!v) continue;
        sx += v.x;
        sy += v.y;
        n += 1;
    }
    if (n === 0) {
        const fallback = index.byId.get(ids[0]);
        return fallback ? { x: fallback.x, y: fallback.y } : { x: 0, y: 0 };
    }
    return { x: sx / n, y: sy / n };
}

function pickCentroidSeed(ids: readonly string[], index: GridIndex): string {
    const centroid = resolveCentroid(ids, index);
    return pickNearestCell(centroid.x, centroid.y, ids, index);
}

/**
 * Multi-source BFS rank across changed cells, starting from seeds.
 * Rank for a seed = 0. Rank for its frontier = 1, etc. Cells unreachable
 * within the changed subgraph get rank = maxRank + 1 and therefore flip last.
 */
function rankByGridBfs(params: {
    seeds: readonly string[];
    changedIds: readonly string[];
    index: GridIndex;
    adjacency: GridAdjacency;
}): { rank: Map<string, number>; maxRank: number } {
    const { seeds, changedIds, index, adjacency } = params;
    const changedSet = new Set(changedIds);
    const offsets = neighborOffsets(adjacency);
    const rank = new Map<string, number>();
    const queue: string[] = [];

    for (const seed of seeds) {
        if (changedSet.has(seed)) {
            rank.set(seed, 0);
            queue.push(seed);
            continue;
        }

        const v = index.byId.get(seed);
        if (!v) continue;
        for (const [dx, dy] of offsets) {
            const nx = v.ix + dx;
            const ny = v.iy + dy;
            const neighborId = idAt(nx, ny);
            if (changedSet.has(neighborId) && !rank.has(neighborId)) {
                rank.set(neighborId, 0);
                queue.push(neighborId);
            }
        }
    }

    let head = 0;
    while (head < queue.length) {
        const currentId = queue[head++];
        const current = index.byId.get(currentId);
        if (!current) continue;
        const currentRank = rank.get(currentId) ?? 0;
        for (const [dx, dy] of offsets) {
            const nx = current.ix + dx;
            const ny = current.iy + dy;
            const neighborId = idAt(nx, ny);
            if (!changedSet.has(neighborId) || rank.has(neighborId)) continue;
            rank.set(neighborId, currentRank + 1);
            queue.push(neighborId);
        }
    }

    let maxRank = 0;
    for (const value of rank.values()) {
        if (value > maxRank) maxRank = value;
    }

    const unreachableRank = maxRank + 1;
    let hasUnreachable = false;
    for (const id of changedIds) {
        if (!rank.has(id)) {
            rank.set(id, unreachableRank);
            hasUnreachable = true;
        }
    }
    if (hasUnreachable) maxRank = unreachableRank;

    return { rank, maxRank };
}

/**
 * Rank by min Euclidean distance from any seed cell center.
 *
 * Buckets: `rank = round(distance / spacingPx)`. This keeps the legacy
 * distance-band mode comparable to BFS depths for diagnostics and tuning.
 */
function rankByEuclideanBand(params: {
    seeds: readonly string[];
    changedIds: readonly string[];
    index: GridIndex;
    spacingPx: number;
}): { rank: Map<string, number>; maxRank: number } {
    const { seeds, changedIds, index, spacingPx } = params;

    const seedPositions: Array<{ x: number; y: number }> = [];
    for (const seed of seeds) {
        const v = index.byId.get(seed);
        if (v) seedPositions.push({ x: v.x, y: v.y });
    }
    if (seedPositions.length === 0) {
        const first = index.byId.get(changedIds[0]);
        if (first) seedPositions.push({ x: first.x, y: first.y });
    }

    const rank = new Map<string, number>();
    let maxRank = 0;
    for (const id of changedIds) {
        const v = index.byId.get(id);
        if (!v) continue;
        let minD = Infinity;
        for (const seed of seedPositions) {
            const dx = v.x - seed.x;
            const dy = v.y - seed.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minD) minD = distance;
        }
        const value = Math.round(minD / spacingPx);
        rank.set(id, value);
        if (value > maxRank) maxRank = value;
    }
    return { rank, maxRank };
}

/**
 * Convert ranks to flip times in [0, 1]. Ties are broken deterministically by
 * `(gridIy, gridIx)`.
 */
function assignFlipTimes(params: {
    rank: ReadonlyMap<string, number>;
    maxRank: number;
    changedIds: readonly string[];
    index: GridIndex;
}): Map<string, number> {
    const { rank, maxRank, changedIds, index } = params;
    const flip = new Map<string, number>();
    const sorted = [...changedIds].sort((a, b) => {
        const ra = rank.get(a) ?? 0;
        const rb = rank.get(b) ?? 0;
        if (ra !== rb) return ra - rb;
        const va = index.byId.get(a);
        const vb = index.byId.get(b);
        if (!va || !vb) return a.localeCompare(b);
        if (va.iy !== vb.iy) return va.iy - vb.iy;
        if (va.ix !== vb.ix) return va.ix - vb.ix;
        return a.localeCompare(b);
    });

    if (maxRank <= 0) {
        for (const id of sorted) flip.set(id, 0);
        return flip;
    }

    for (const id of sorted) {
        const value = rank.get(id) ?? 0;
        flip.set(id, value / maxRank);
    }
    return flip;
}

function assignConqueredStarRadialFlipTimes(params: {
    event?: ConquestEvent;
    changedIds: readonly string[];
    index: GridIndex;
    spacingPx: number;
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}): DirectFlipPlan {
    const { event, changedIds, index, spacingPx, resolveStarPosition } = params;
    const origin =
        (event ? resolveStarPosition?.(event.starId) ?? null : null)
        ?? resolveCentroid(changedIds, index);
    const seedId = pickNearestCell(origin.x, origin.y, changedIds, index);
    const sortedIds = sortIdsByGrid(changedIds, index);
    const flipTimeByVId = new Map<string, number>();

    let maxDistance = 0;
    const distanceById = new Map<string, number>();
    for (const id of sortedIds) {
        const v = index.byId.get(id);
        if (!v) continue;
        const dx = v.x - origin.x;
        const dy = v.y - origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        distanceById.set(id, distance);
        if (distance > maxDistance) maxDistance = distance;
    }

    if (maxDistance <= 0) {
        for (const id of sortedIds) flipTimeByVId.set(id, 0);
        return { flipTimeByVId, maxRank: 0, seedVIds: [seedId] };
    }

    for (const id of sortedIds) {
        flipTimeByVId.set(id, clamp01((distanceById.get(id) ?? 0) / maxDistance));
    }

    return {
        flipTimeByVId,
        maxRank: maxDistance / Math.max(1, spacingPx),
        seedVIds: [seedId],
    };
}

function resolvePreAndPostFrontierSeeds(params: {
    changedIds: readonly string[];
    index: GridIndex;
    adjacency: GridAdjacency;
}): { preSeedVIds: string[]; postSeedVIds: string[] } {
    const { changedIds, index, adjacency } = params;
    const changedSet = new Set(changedIds);
    const offsets = neighborOffsets(adjacency);
    const preSeeds = new Set<string>();
    const postSeeds = new Set<string>();

    for (const id of changedIds) {
        const v = index.byId.get(id);
        if (!v) continue;
        for (const [dx, dy] of offsets) {
            const nx = v.ix + dx;
            const ny = v.iy + dy;
            if (nx < 0 || ny < 0 || nx >= index.cols || ny >= index.rows) continue;
            const neighborId = idAt(nx, ny);
            if (changedSet.has(neighborId)) continue;
            const neighbor = index.byId.get(neighborId);
            if (!neighbor) continue;

            if (neighbor.prevOwnerId === v.nextOwnerId) preSeeds.add(id);
            if (neighbor.nextOwnerId === v.prevOwnerId) postSeeds.add(id);
        }
    }

    return {
        preSeedVIds: sortIdsByGrid([...preSeeds], index),
        postSeedVIds: sortIdsByGrid([...postSeeds], index),
    };
}

function assignPreToPostFrontierFlipTimes(params: {
    event?: ConquestEvent;
    changedIds: readonly string[];
    index: GridIndex;
    spacingPx: number;
    adjacency: GridAdjacency;
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}): DirectFlipPlan {
    const { changedIds, index, spacingPx, adjacency, event, resolveStarPosition } = params;
    const { preSeedVIds, postSeedVIds } = resolvePreAndPostFrontierSeeds({
        changedIds,
        index,
        adjacency,
    });

    // Some ownership deltas collapse to a map edge or a fully engulfed island,
    // which leaves one frontier side unobservable from the grid. Fall back to
    // the star-centered radial field in those degenerate cases.
    if (preSeedVIds.length === 0 || postSeedVIds.length === 0) {
        return assignConqueredStarRadialFlipTimes({
            event,
            changedIds,
            index,
            spacingPx,
            resolveStarPosition,
        });
    }

    const preDistance = rankByGridBfs({
        seeds: preSeedVIds,
        changedIds,
        index,
        adjacency,
    });
    const postDistance = rankByGridBfs({
        seeds: postSeedVIds,
        changedIds,
        index,
        adjacency,
    });

    const preSeedSet = new Set(preSeedVIds);
    const postSeedSet = new Set(postSeedVIds);
    const flipTimeByVId = new Map<string, number>();
    let maxRank = 0;

    for (const id of sortIdsByGrid(changedIds, index)) {
        const dPre = preDistance.rank.get(id) ?? 0;
        const dPost = postDistance.rank.get(id) ?? 0;
        const denom = dPre + dPost;

        let flipTime = 0.5;
        if (denom > 0) {
            flipTime = dPre / denom;
        } else if (preSeedSet.has(id) && !postSeedSet.has(id)) {
            flipTime = 0;
        } else if (postSeedSet.has(id) && !preSeedSet.has(id)) {
            flipTime = 1;
        }

        flipTimeByVId.set(id, clamp01(flipTime));
        if (denom > maxRank) maxRank = denom;
    }

    return {
        flipTimeByVId,
        maxRank,
        seedVIds: preSeedVIds,
    };
}

/**
 * Build a full wave plan covering every changed cell. Iterates events in input
 * order. Cells attributed to the synthetic default event are grouped under a
 * single synthetic plan entry.
 */
export function planGridWave(params: PlanGridWaveParams): GridWavePlan {
    const { classification, seeding, geometry, adjacency, conquestEvents, resolveStarPosition } = params;
    // The per-cell string-keyed index is only consumed inside the per-event loop below.
    // In steady state (no conquest events / no changed cells) it is never needed, so build
    // it lazily — this avoids a full-grid Map allocation (one entry per cell, up to
    // ~50k-160k) on every cold plan build, the dominant avoidable cost when switching into
    // a grid-based render mode. Transition frames still build it on first use (unchanged).
    let indexMemo: GridIndex | null = null;
    const ensureIndex = (): GridIndex => {
        if (!indexMemo) indexMemo = buildIndex(classification);
        return indexMemo;
    };

    const eventOrder: Array<{ eventId: string; event?: ConquestEvent }> = conquestEvents.map((event) => ({
        eventId: makeEventId(event),
        event,
    }));
    if (classification.dispossessedByEventId[classification.defaultEventId]) {
        eventOrder.push({ eventId: classification.defaultEventId, event: undefined });
    }

    const perEvent: GridWavePlanEvent[] = [];
    const flat = new Map<string, number>();

    for (const { eventId, event } of eventOrder) {
        const changedIds = classification.dispossessedByEventId[eventId];
        if (!changedIds || changedIds.length === 0) continue;
        const index = ensureIndex();

        let flipPlan: DirectFlipPlan;

        if (geometry === 'conquered_star_radial') {
            flipPlan = assignConqueredStarRadialFlipTimes({
                event,
                changedIds,
                index,
                spacingPx: classification.spacingPx,
                resolveStarPosition,
            });
        } else if (geometry === 'pre_to_post_frontier') {
            flipPlan = assignPreToPostFrontierFlipTimes({
                event,
                changedIds,
                index,
                spacingPx: classification.spacingPx,
                adjacency,
                resolveStarPosition,
            });
        } else {
            const seeds = event
                ? resolveSeeds({
                      event,
                      changedIds,
                      index,
                      seeding,
                      adjacency,
                      resolveStarPosition,
                  })
                : [pickCentroidSeed(changedIds, index)];

            const ranked =
                geometry === 'grid_bfs'
                    ? rankByGridBfs({
                          seeds,
                          changedIds,
                          index,
                          adjacency,
                      })
                    : rankByEuclideanBand({
                          seeds,
                          changedIds,
                          index,
                          spacingPx: classification.spacingPx,
                      });

            flipPlan = {
                flipTimeByVId: assignFlipTimes({
                    rank: ranked.rank,
                    maxRank: ranked.maxRank,
                    changedIds,
                    index,
                }),
                maxRank: ranked.maxRank,
                seedVIds: seeds,
            };
        }

        for (const [id, flipTime] of flipPlan.flipTimeByVId) {
            flat.set(id, flipTime);
        }

        perEvent.push({
            eventId,
            seeding,
            geometry,
            adjacency,
            maxRank: flipPlan.maxRank,
            flipTimeByVId: flipPlan.flipTimeByVId,
            seedVIds: flipPlan.seedVIds,
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
