/**
 * metaball-grid — classification builder (MG2)
 *
 * Builds a world-anchored grid of vstars and resolves PREV/NEXT ownership for
 * each cell via point-in-polygon against `territoryRegions`. Classifies each
 * cell as `native | dispossessed | emergent | vacating | outside` and
 * attributes dispossessed/emergent/vacating cells to a conquest event.
 *
 * Pure function. Deterministic for fixed inputs.
 *
 * Complexity: O(N_v * N_regions) per call. For 1920×1080 @ 24 px spacing and
 * ~10 regions ≈ 72k point-in-polygon tests — one-shot per conquest.
 */

import type { ConquestEvent } from '@pax/common';
import type {
    CanonicalGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import { pointInPolygon } from '../../geometry/geometryUtils';
import type {
    BuildGridClassificationParams,
    GridClassification,
    GridClassificationPatchBounds,
    GridDistribution,
    GridOriginMode,
    GridOwnedStar,
    GridVRole,
    GridVStar,
} from './metaballGridTypes';

const DEFAULT_EVENT_ID = '__default__';

/**
 * Compute the origin offset for a grid of given spacing and origin mode.
 * `centered` puts the first cell at `(spacing/2, spacing/2)`, so the grid is
 * symmetric under world reflection. `corner` puts it at `(0, 0)`.
 */
function resolveOffset(spacingPx: number, originMode: GridOriginMode): { offsetX: number; offsetY: number } {
    if (originMode === 'centered') {
        return { offsetX: spacingPx / 2, offsetY: spacingPx / 2 };
    }
    return { offsetX: 0, offsetY: 0 };
}

interface IndexedRegion {
    readonly ownerId: string;
    readonly points: TerritoryRegionShape['points'];
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

interface RegionLookup {
    readonly bucketSize: number;
    readonly buckets: ReadonlyMap<string, readonly IndexedRegion[]>;
}

interface OwnedStarLookup {
    readonly bucketSize: number;
    readonly buckets: ReadonlyMap<string, readonly GridOwnedStar[]>;
}

interface NormalizedPatchBounds {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

function makeBucketKey(ix: number, iy: number): string {
    return `${ix}:${iy}`;
}

function bucketIndex(value: number, bucketSize: number): number {
    return Math.floor(value / bucketSize);
}

function indexRegion(region: TerritoryRegionShape): IndexedRegion {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < region.points.length; i++) {
        const [x, y] = region.points[i];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return {
        ownerId: region.ownerId,
        points: region.points,
        minX,
        minY,
        maxX,
        maxY,
    };
}

function buildRegionLookup(
    regions: readonly TerritoryRegionShape[],
    spacingPx: number,
): RegionLookup {
    const bucketSize = Math.max(32, spacingPx * 2);
    const buckets = new Map<string, IndexedRegion[]>();
    for (let i = 0; i < regions.length; i++) {
        const indexed = indexRegion(regions[i]);
        const minBx = bucketIndex(indexed.minX, bucketSize);
        const maxBx = bucketIndex(indexed.maxX, bucketSize);
        const minBy = bucketIndex(indexed.minY, bucketSize);
        const maxBy = bucketIndex(indexed.maxY, bucketSize);
        for (let by = minBy; by <= maxBy; by++) {
            for (let bx = minBx; bx <= maxBx; bx++) {
                const key = makeBucketKey(bx, by);
                let list = buckets.get(key);
                if (!list) {
                    list = [];
                    buckets.set(key, list);
                }
                list.push(indexed);
            }
        }
    }
    return { bucketSize, buckets };
}

/**
 * Test a world point against candidate regions whose bbox overlaps the point's
 * spatial bucket, preserving deterministic array order within that bucket.
 */
function resolveOwnerAt(
    x: number,
    y: number,
    lookup: RegionLookup,
): string | null {
    const bx = bucketIndex(x, lookup.bucketSize);
    const by = bucketIndex(y, lookup.bucketSize);
    const candidates = lookup.buckets.get(makeBucketKey(bx, by));
    if (!candidates || candidates.length === 0) return null;
    for (let i = 0; i < candidates.length; i++) {
        const r = candidates[i];
        if (x < r.minX || x > r.maxX || y < r.minY || y > r.maxY) continue;
        if (pointInPolygon(x, y, r.points)) {
            return r.ownerId;
        }
    }
    return null;
}

function buildOwnedStarLookup(
    ownedStars: ReadonlyArray<GridOwnedStar> | undefined,
    coverageRadiusPx: number,
): OwnedStarLookup | null {
    if (!ownedStars || ownedStars.length === 0) return null;
    const bucketSize = Math.max(1, coverageRadiusPx);
    const buckets = new Map<string, GridOwnedStar[]>();
    for (let i = 0; i < ownedStars.length; i++) {
        const star = ownedStars[i];
        const bx = bucketIndex(star.x, bucketSize);
        const by = bucketIndex(star.y, bucketSize);
        const key = makeBucketKey(bx, by);
        let list = buckets.get(key);
        if (!list) {
            list = [];
            buckets.set(key, list);
        }
        list.push(star);
    }
    return { bucketSize, buckets };
}

/**
 * Nearest-owned-star fallback. Used when polygon coverage misses a cell that
 * is clearly inside a player's star-sector (e.g. weighted voronoi MSR holes
 * at star centers). Returns the `ownerId` of the nearest owned star, but only
 * if it is within `coverageRadiusPxSq` (distance squared). Otherwise `null`.
 */
function resolveOwnerByNearestStar(
    x: number,
    y: number,
    lookup: OwnedStarLookup | null,
    coverageRadiusPxSq: number,
): string | null {
    if (!lookup) return null;
    const bx = bucketIndex(x, lookup.bucketSize);
    const by = bucketIndex(y, lookup.bucketSize);
    let bestOwner: string | null = null;
    let bestDist = Infinity;
    for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
            const bucket = lookup.buckets.get(makeBucketKey(bx + ox, by + oy));
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const s = bucket[i];
                const dx = s.x - x;
                const dy = s.y - y;
                const d = dx * dx + dy * dy;
                if (d < bestDist) {
                    bestDist = d;
                    bestOwner = s.ownerId;
                }
            }
        }
    }
    return bestDist <= coverageRadiusPxSq ? bestOwner : null;
}

function normalizePatchBounds(
    bounds: GridClassificationPatchBounds | null | undefined,
    world: { width: number; height: number },
): NormalizedPatchBounds | null {
    if (!bounds) return null;
    const minX = Math.max(0, Math.min(world.width, bounds.minX));
    const minY = Math.max(0, Math.min(world.height, bounds.minY));
    const maxX = Math.max(0, Math.min(world.width, bounds.maxX));
    const maxY = Math.max(0, Math.min(world.height, bounds.maxY));
    if (maxX < minX || maxY < minY) return null;
    return { minX, minY, maxX, maxY };
}

function isWithinPatch(x: number, y: number, bounds: NormalizedPatchBounds): boolean {
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function resolveBaseOwner(vstar: GridVStar): string | null {
    return vstar.nextOwnerId ?? vstar.prevOwnerId;
}

/**
 * Classify a `(prev, next)` pair into a role. Rules match the plan doc.
 */
function classifyRole(prev: string | null, next: string | null): GridVRole {
    if (prev === null && next === null) return 'outside';
    if (prev === null) return 'emergent';
    if (next === null) return 'vacating';
    if (prev === next) return 'native';
    return 'dispossessed';
}

/**
 * Attribute a grid vstar to an event. Matches on `(previousOwner, newOwner)`
 * equality; on multiple matches, tiebreaks by proximity to `event.starId` if
 * a position resolver is provided. Unmatched pairs route to the synthetic
 * default event bucket so no cell is ever orphaned.
 */
function attributeEvent(
    prev: string | null,
    next: string | null,
    gx: number,
    gy: number,
    events: ReadonlyArray<ConquestEvent>,
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null,
): string {
    if (prev === null || next === null || prev === next) return DEFAULT_EVENT_ID;

    // For emergent/vacating, we only have one non-null side. Match against
    // whichever side we have.
    const matches: number[] = [];
    for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (e.previousOwner === prev && e.newOwner === next) {
            matches.push(i);
        }
    }
    if (matches.length === 0) return DEFAULT_EVENT_ID;
    if (matches.length === 1) return makeEventId(events[matches[0]]);

    if (resolveStarPosition) {
        let bestIdx = matches[0];
        let bestDist = Infinity;
        for (const idx of matches) {
            const pos = resolveStarPosition(events[idx].starId);
            if (!pos) continue;
            const dx = pos.x - gx;
            const dy = pos.y - gy;
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
                bestDist = d;
                bestIdx = idx;
            }
        }
        return makeEventId(events[bestIdx]);
    }

    return makeEventId(events[matches[0]]);
}

/**
 * Deterministic event id. `ConquestEvent` does not carry a primary-key id, so
 * we synthesize one stable under deterministic event ordering.
 */
export function makeEventId(event: ConquestEvent): string {
    return `e:${event.tick}:${event.starId}:${event.previousOwner}->${event.newOwner}`;
}

/**
 * Deterministic 32-bit integer hash of two ints. Mirrors the simple mix used
 * elsewhere in metaball-grid for flip-time jitter; kept here to avoid an
 * import cycle. Result is in [0, 2^32).
 */
function hash2Int(a: number, b: number): number {
    let h = (a | 0) * 374761393 + (b | 0) * 668265263;
    h = (h ^ (h >>> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
}

/**
 * Build a deterministic classification of the visual-truth grid for one
 * PREV→NEXT transition.
 */
export function buildGridClassification(params: BuildGridClassificationParams): GridClassification {
    const {
        world,
        spacingPx: requestedSpacingPx,
        originMode,
        prevGeometry,
        nextGeometry,
        conquestEvents,
        resolveStarPosition,
        prevOwnedStars,
        nextOwnedStars,
        coverageRadiusPx,
        maxCells,
        distribution: distributionArg,
        positionJitter: positionJitterArg,
        baseClassification,
        patchBounds: patchBoundsArg,
    } = params;

    if (requestedSpacingPx <= 0) throw new Error('spacingPx must be > 0');
    if (world.width <= 0 || world.height <= 0) throw new Error('world dimensions must be > 0');

    // Coarsen spacing upward if a maxCells cap would otherwise be exceeded.
    // A grid at `s` px has `ceil(w/s) * ceil(h/s)` cells. We approximate the
    // minimum spacing that stays under the cap with
    // `s_eff = max(requested, ceil(sqrt(w*h / maxCells)))`, then iterate once
    // more in case the ceilings push us back over.
    let spacingPx = requestedSpacingPx;
    if (maxCells && maxCells > 0) {
        const floorSpacing = Math.sqrt((world.width * world.height) / maxCells);
        if (requestedSpacingPx < floorSpacing) {
            spacingPx = floorSpacing;
        }
        // Tighten after the ceiling-based cell count is computed; if still
        // over the cap, bump spacing by the sqrt of the overshoot ratio.
        const provCols = Math.ceil(world.width / spacingPx);
        const provRows = Math.ceil(world.height / spacingPx);
        const provCells = provCols * provRows;
        if (provCells > maxCells) {
            spacingPx *= Math.sqrt(provCells / maxCells);
        }
    }

    const cols = Math.ceil(world.width / spacingPx);
    const rows = Math.ceil(world.height / spacingPx);
    const { offsetX, offsetY } = resolveOffset(spacingPx, originMode);
    const distribution = distributionArg ?? 'square';
    // Clamp jitter fraction to [0, 0.5]; > 0.5 lets neighbours swap slots.
    const positionJitter = distribution === 'jittered'
        ? Math.max(0, Math.min(0.5, positionJitterArg ?? 0))
        : 0;

    const coverageRadius = coverageRadiusPx ?? spacingPx * 3;
    const coverageRadiusSq = coverageRadius * coverageRadius;
    const patchBounds = normalizePatchBounds(patchBoundsArg, world);
    const canReuseBaseClassification =
        patchBounds !== null &&
        baseClassification !== undefined &&
        baseClassification.cols === cols &&
        baseClassification.rows === rows &&
        baseClassification.spacingPx === spacingPx &&
        baseClassification.originMode === originMode &&
        baseClassification.distribution === distribution;
    const prevRegionLookup = buildRegionLookup(prevGeometry.territoryRegions, spacingPx);
    const nextRegionLookup =
        prevGeometry === nextGeometry
            ? prevRegionLookup
            : buildRegionLookup(nextGeometry.territoryRegions, spacingPx);
    const prevOwnedStarLookup = buildOwnedStarLookup(prevOwnedStars, coverageRadius);
    const nextOwnedStarLookup =
        prevGeometry === nextGeometry && prevOwnedStars === nextOwnedStars
            ? prevOwnedStarLookup
            : buildOwnedStarLookup(nextOwnedStars, coverageRadius);
    const sameSnapshot =
        prevGeometry === nextGeometry &&
        prevRegionLookup === nextRegionLookup &&
        prevOwnedStarLookup === nextOwnedStarLookup;

    // Role bins (string arrays so downstream can skip vstar[] realloc).
    const roleBins: Record<GridVRole, string[]> = {
        native: [],
        dispossessed: [],
        emergent: [],
        vacating: [],
        outside: [],
    };
    const dispossessedByEventId: Record<string, string[]> = {};

    const vstars: GridVStar[] = new Array(cols * rows);
    const emittableVstars: GridVStar[] = [];
    const halfSpacing = spacingPx * 0.5;
    const jitterAmp = positionJitter * spacingPx;
    const baseVstars = canReuseBaseClassification ? baseClassification.vstars : null;

    for (let iy = 0; iy < rows; iy++) {
        // `hex_offset`: shift odd rows by half-spacing for honeycomb packing.
        const rowXShift = distribution === 'hex_offset' && (iy & 1) === 1 ? halfSpacing : 0;
        for (let ix = 0; ix < cols; ix++) {
            const index = iy * cols + ix;
            const baseV = baseVstars?.[index];
            let x = baseV?.x ?? (ix * spacingPx + offsetX + rowXShift);
            let y = baseV?.y ?? (iy * spacingPx + offsetY);
            if (!baseV && jitterAmp > 0) {
                // Deterministic per-cell scatter. Use two independent hashes
                // so x/y offsets do not correlate diagonally.
                const hx = hash2Int(ix, iy) / 0x1_0000_0000; // [0, 1)
                const hy = hash2Int(ix + 104729, iy + 48611) / 0x1_0000_0000; // [0, 1)
                x += (hx * 2 - 1) * jitterAmp;
                y += (hy * 2 - 1) * jitterAmp;
            }
            const id = baseV?.id ?? `g:${ix}:${iy}`;

            if (baseV && patchBounds && !isWithinPatch(x, y, patchBounds)) {
                const baseOwnerId = resolveBaseOwner(baseV);
                const unchangedRole = classifyRole(baseOwnerId, baseOwnerId);
                const reused =
                    baseV.role === unchangedRole &&
                    baseV.eventId === null &&
                    baseV.prevOwnerId === baseOwnerId &&
                    baseV.nextOwnerId === baseOwnerId
                        ? baseV
                        : {
                              id,
                              ix,
                              iy,
                              x,
                              y,
                              prevOwnerId: baseOwnerId,
                              nextOwnerId: baseOwnerId,
                              role: unchangedRole,
                              eventId: null,
                          };
                vstars[index] = reused;
                roleBins[reused.role].push(reused.id);
                if (reused.role !== 'outside') {
                    emittableVstars.push(reused);
                }
                continue;
            }

            // Polygon-first; nearest-owned-star fallback fills gaps left by
            // explicit margin shaping, including MSR-style moats in the source geometry.
            let prevOwnerId = baseV ? resolveBaseOwner(baseV) : resolveOwnerAt(x, y, prevRegionLookup);
            if (!baseV && prevOwnerId === null) {
                prevOwnerId = resolveOwnerByNearestStar(x, y, prevOwnedStarLookup, coverageRadiusSq);
            }
            let nextOwnerId = prevOwnerId;
            if (!sameSnapshot) {
                nextOwnerId = resolveOwnerAt(x, y, nextRegionLookup);
                if (nextOwnerId === null) {
                    nextOwnerId = resolveOwnerByNearestStar(x, y, nextOwnedStarLookup, coverageRadiusSq);
                }
            }
            const role = classifyRole(prevOwnerId, nextOwnerId);

            let eventId: string | null = null;
            if (role !== 'native' && role !== 'outside') {
                eventId = attributeEvent(prevOwnerId, nextOwnerId, x, y, conquestEvents, resolveStarPosition);
                (dispossessedByEventId[eventId] ??= []).push(id);
            }

            const vstar: GridVStar = {
                id,
                ix,
                iy,
                x,
                y,
                prevOwnerId,
                nextOwnerId,
                role,
                eventId,
            };
            vstars[index] = vstar;
            roleBins[role].push(id);
            if (role !== 'outside') {
                emittableVstars.push(vstar);
            }
        }
    }

    return {
        cols,
        rows,
        spacingPx,
        requestedSpacingPx,
        originMode,
        distribution,
        vstars,
        emittableVstars,
        byRole: {
            native: roleBins.native,
            dispossessed: roleBins.dispossessed,
            emergent: roleBins.emergent,
            vacating: roleBins.vacating,
            outside: roleBins.outside,
        },
        dispossessedByEventId,
        defaultEventId: DEFAULT_EVENT_ID,
    };
}

/** Helper for consumers that need row-major index → vstar lookup. */
export function gridIndex(ix: number, iy: number, cols: number): number {
    return iy * cols + ix;
}
