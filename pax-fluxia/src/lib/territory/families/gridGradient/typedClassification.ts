import type { ConquestEvent } from '@pax/common';
import type {
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import { buildGridClassification, makeEventId } from '../metaballGrid/buildGridClassification';
import type {
    BuildGridClassificationParams,
    GridClassification,
    GridDistribution,
    GridOriginMode,
    GridOwnedStar,
    GridVRole,
    GridVStar,
} from '../metaballGrid/metaballGridTypes';

const DEFAULT_EVENT_ID = '__default__';
const WORLD_MIN_EPSILON = 0.000001;
const NULL_OWNER_INDEX = -1;

export type GridGradientClassificationAlgorithm = 'raster_scanline' | 'point_polygon';

export interface GridGradientTypedClassification {
    readonly ownerIdByIndex: readonly string[];
    readonly prevOwnerIndexByCell: Int16Array;
    readonly nextOwnerIndexByCell: Int16Array;
    readonly roleCodeByCell: Uint8Array;
    readonly emittableCellIndices: Uint32Array;
    readonly transitionCellIndices: Uint32Array;
}

export interface GridGradientOwnerGrid {
    readonly key: string;
    readonly algorithm: GridGradientClassificationAlgorithm;
    readonly ownerIndexByCell: Int16Array;
}

export interface GridGradientOwnerGridCache {
    get(key: string): GridGradientOwnerGrid | undefined;
    set(key: string, value: GridGradientOwnerGrid): void;
}

export interface GridGradientTypedClassificationResult {
    readonly classification: GridClassification;
    readonly typed: GridGradientTypedClassification;
    readonly algorithm: GridGradientClassificationAlgorithm;
    readonly prevOwnerGridCacheHit: boolean;
    readonly nextOwnerGridCacheHit: boolean;
    readonly ownerGridBuildMs: number;
    readonly classificationMaterializeMs: number;
}

export interface GridSpec {
    readonly cols: number;
    readonly rows: number;
    readonly spacingPx: number;
    readonly requestedSpacingPx: number;
    readonly originMode: GridOriginMode;
    readonly distribution: GridDistribution;
    readonly positionJitter: number;
    readonly worldMinX: number;
    readonly worldMinY: number;
    readonly worldWidth: number;
    readonly worldHeight: number;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly firstGridIx: number;
    readonly firstGridIy: number;
    readonly halfSpacing: number;
}

interface IndexedRegion {
    readonly regionIndex: number;
    readonly ownerId: string;
    readonly ownerIndex: number;
    readonly points: TerritoryRegionShape['points'];
    readonly anchorStarIds: readonly string[];
    readonly absArea: number;
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

function clamp01(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function resolveOffset(
    spacingPx: number,
    originMode: GridOriginMode,
): { offsetX: number; offsetY: number } {
    if (originMode === 'centered') {
        return { offsetX: spacingPx / 2, offsetY: spacingPx / 2 };
    }
    return { offsetX: 0, offsetY: 0 };
}

function resolveFirstGridIndex(
    worldMin: number,
    spacingPx: number,
    originOffset: number,
): number {
    return Math.ceil((worldMin - originOffset) / spacingPx);
}

function resolveGridCount(
    worldSize: number,
    spacingPx: number,
    firstLocalCoord: number,
    halfSpacing: number,
): number {
    return Math.max(
        1,
        Math.floor((worldSize - firstLocalCoord + halfSpacing) / spacingPx) + 1,
    );
}

function hash2Int(a: number, b: number): number {
    let h = (a | 0) * 374761393 + (b | 0) * 668265263;
    h = (h ^ (h >>> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
}

function buildGridSpec(params: Pick<
    BuildGridClassificationParams,
    'world' | 'spacingPx' | 'originMode' | 'maxCells' | 'distribution' | 'positionJitter'
>): GridSpec {
    const {
        world,
        spacingPx: requestedSpacingPx,
        originMode,
        maxCells,
        distribution: distributionArg,
        positionJitter: positionJitterArg,
    } = params;
    if (requestedSpacingPx <= 0) throw new Error('spacingPx must be > 0');
    if (world.width <= 0 || world.height <= 0) {
        throw new Error('world dimensions must be > 0');
    }
    const worldMinX = Number.isFinite(world.minX) ? world.minX! : 0;
    const worldMinY = Number.isFinite(world.minY) ? world.minY! : 0;
    let spacingPx = requestedSpacingPx;
    if (maxCells && maxCells > 0) {
        const floorSpacing = Math.sqrt((world.width * world.height) / maxCells);
        if (requestedSpacingPx < floorSpacing) spacingPx = floorSpacing;
        const provCols = Math.ceil(world.width / spacingPx);
        const provRows = Math.ceil(world.height / spacingPx);
        const provCells = provCols * provRows;
        if (provCells > maxCells) {
            spacingPx *= Math.sqrt(provCells / maxCells);
        }
    }

    const { offsetX, offsetY } = resolveOffset(spacingPx, originMode);
    const halfSpacing = spacingPx * 0.5;
    const firstGridIx = resolveFirstGridIndex(worldMinX, spacingPx, offsetX);
    const firstGridIy = resolveFirstGridIndex(worldMinY, spacingPx, offsetY);
    const firstLocalX = firstGridIx * spacingPx + offsetX - worldMinX;
    const firstLocalY = firstGridIy * spacingPx + offsetY - worldMinY;
    const cols = Math.abs(worldMinX) <= WORLD_MIN_EPSILON
        ? Math.ceil(world.width / spacingPx)
        : resolveGridCount(world.width, spacingPx, firstLocalX, halfSpacing);
    const rows = Math.abs(worldMinY) <= WORLD_MIN_EPSILON
        ? Math.ceil(world.height / spacingPx)
        : resolveGridCount(world.height, spacingPx, firstLocalY, halfSpacing);
    const distribution = distributionArg ?? 'square';
    const positionJitter = distribution === 'jittered'
        ? Math.max(0, Math.min(0.5, positionJitterArg ?? 0))
        : 0;

    return {
        cols,
        rows,
        spacingPx,
        requestedSpacingPx,
        originMode,
        distribution,
        positionJitter,
        worldMinX,
        worldMinY,
        worldWidth: world.width,
        worldHeight: world.height,
        offsetX,
        offsetY,
        firstGridIx,
        firstGridIy,
        halfSpacing,
    };
}

function cellX(spec: GridSpec, ix: number, globalIy: number): number {
    const rowXShift =
        spec.distribution === 'hex_offset' && (globalIy & 1) === 1
            ? spec.halfSpacing
            : 0;
    return (spec.firstGridIx + ix) * spec.spacingPx +
        spec.offsetX +
        rowXShift -
        spec.worldMinX;
}

function cellY(spec: GridSpec, iy: number): number {
    return (spec.firstGridIy + iy) * spec.spacingPx +
        spec.offsetY -
        spec.worldMinY;
}

function cellPoint(spec: GridSpec, ix: number, iy: number): { x: number; y: number } {
    const globalIy = spec.firstGridIy + iy;
    let x = cellX(spec, ix, globalIy);
    let y = cellY(spec, iy);
    if (spec.positionJitter > 0) {
        const jitterAmp = spec.positionJitter * spec.spacingPx;
        const hx = hash2Int(ix, iy) / 0x1_0000_0000;
        const hy = hash2Int(ix + 104729, iy + 48611) / 0x1_0000_0000;
        x += (hx * 2 - 1) * jitterAmp;
        y += (hy * 2 - 1) * jitterAmp;
    }
    return { x, y };
}

function collectOwnerIds(params: {
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly nextGeometry: ResolvedGeometrySnapshot;
    readonly prevOwnedStars?: ReadonlyArray<GridOwnedStar>;
    readonly nextOwnedStars?: ReadonlyArray<GridOwnedStar>;
}): string[] {
    const ids = new Set<string>();
    for (const region of params.prevGeometry.territoryRegions) ids.add(region.ownerId);
    for (const region of params.nextGeometry.territoryRegions) ids.add(region.ownerId);
    for (const star of params.prevOwnedStars ?? []) ids.add(star.ownerId);
    for (const star of params.nextOwnedStars ?? []) ids.add(star.ownerId);
    return [...ids].sort();
}

function ownerIndexById(ownerIds: readonly string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (let i = 0; i < ownerIds.length; i += 1) map.set(ownerIds[i], i);
    return map;
}

function indexRegions(
    regions: readonly TerritoryRegionShape[],
    ownerIndexByOwnerId: ReadonlyMap<string, number>,
): IndexedRegion[] {
    const out: IndexedRegion[] = [];
    for (let regionIndex = 0; regionIndex < regions.length; regionIndex += 1) {
        const region = regions[regionIndex];
        const ownerIndex = ownerIndexByOwnerId.get(region.ownerId);
        if (ownerIndex === undefined) continue;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let area = 0;
        for (let i = 0; i < region.points.length; i += 1) {
            const [x, y] = region.points[i];
            const [nx, ny] = region.points[(i + 1) % region.points.length];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            area += x * ny - nx * y;
        }
        out.push({
            regionIndex,
            ownerId: region.ownerId,
            ownerIndex,
            points: region.points,
            anchorStarIds:
                region.anchorStarIds
                ?? region.starIds?.filter((starId) =>
                    !starId.startsWith('corridor_') &&
                    !starId.startsWith('disconnect_'),
                )
                ?? [],
            absArea: Math.abs(area * 0.5),
            minX,
            minY,
            maxX,
            maxY,
        });
    }
    return out;
}

function nearestAnchorDistanceSq(
    region: IndexedRegion,
    x: number,
    y: number,
    starById: ReadonlyMap<string, GridOwnedStar>,
): number {
    let best = Infinity;
    for (let i = 0; i < region.anchorStarIds.length; i += 1) {
        const star = starById.get(region.anchorStarIds[i]);
        if (!star) continue;
        const dx = star.x - x;
        const dy = star.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq < best) best = distSq;
    }
    return best;
}

function chooseRegionAtPoint(params: {
    readonly current: IndexedRegion;
    readonly candidate: IndexedRegion;
    readonly x: number;
    readonly y: number;
    readonly starById: ReadonlyMap<string, GridOwnedStar>;
}): IndexedRegion {
    const { current, candidate, x, y, starById } = params;
    const currentHasAnchors = current.anchorStarIds.length > 0;
    const candidateHasAnchors = candidate.anchorStarIds.length > 0;
    if (currentHasAnchors !== candidateHasAnchors) {
        return candidateHasAnchors ? candidate : current;
    }

    const currentNearest = currentHasAnchors
        ? nearestAnchorDistanceSq(current, x, y, starById)
        : Infinity;
    const candidateNearest = candidateHasAnchors
        ? nearestAnchorDistanceSq(candidate, x, y, starById)
        : Infinity;
    if (candidateNearest !== currentNearest) {
        return candidateNearest < currentNearest ? candidate : current;
    }

    if (candidate.absArea !== current.absArea) {
        return candidate.absArea < current.absArea ? candidate : current;
    }

    const candidateIsNeutral = candidate.ownerId === 'neutral';
    const currentIsNeutral = current.ownerId === 'neutral';
    if (candidateIsNeutral !== currentIsNeutral && !candidateIsNeutral) {
        return candidate;
    }
    return current;
}

function buildStarById(stars?: ReadonlyArray<GridOwnedStar>): Map<string, GridOwnedStar> {
    const map = new Map<string, GridOwnedStar>();
    for (const star of stars ?? []) map.set(star.id, star);
    return map;
}

function buildNearestStarFallback(params: {
    readonly spec: GridSpec;
    readonly ownerIndexByCell: Int16Array;
    readonly ownerIndexByOwnerId: ReadonlyMap<string, number>;
    readonly ownedStars?: ReadonlyArray<GridOwnedStar>;
    readonly coverageRadiusSq: number;
}): void {
    const { spec, ownerIndexByCell, ownerIndexByOwnerId, ownedStars, coverageRadiusSq } = params;
    if (!ownedStars || ownedStars.length === 0) return;
    for (let iy = 0; iy < spec.rows; iy += 1) {
        for (let ix = 0; ix < spec.cols; ix += 1) {
            const cellIndex = iy * spec.cols + ix;
            if (ownerIndexByCell[cellIndex] !== NULL_OWNER_INDEX) continue;
            const { x, y } = cellPoint(spec, ix, iy);
            let bestOwnerIndex = NULL_OWNER_INDEX;
            let bestDistSq = Infinity;
            for (let i = 0; i < ownedStars.length; i += 1) {
                const star = ownedStars[i];
                const dx = star.x - x;
                const dy = star.y - y;
                const distSq = dx * dx + dy * dy;
                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    bestOwnerIndex = ownerIndexByOwnerId.get(star.ownerId) ?? NULL_OWNER_INDEX;
                }
            }
            if (bestDistSq <= coverageRadiusSq) ownerIndexByCell[cellIndex] = bestOwnerIndex;
        }
    }
}

function buildPointOwnerGrid(params: {
    readonly key: string;
    readonly baseParams: BuildGridClassificationParams;
    readonly ownerIndexByOwnerId: ReadonlyMap<string, number>;
}): GridGradientOwnerGrid {
    const classification = buildGridClassification({
        ...params.baseParams,
        nextGeometry: params.baseParams.prevGeometry,
        conquestEvents: [],
        nextOwnedStars: params.baseParams.prevOwnedStars,
    });
    const ownerIndexByCell = new Int16Array(
        classification.cols * classification.rows,
    );
    ownerIndexByCell.fill(NULL_OWNER_INDEX);
    for (const v of classification.vstars) {
        ownerIndexByCell[v.iy * classification.cols + v.ix] =
            v.nextOwnerId === null
                ? NULL_OWNER_INDEX
                : params.ownerIndexByOwnerId.get(v.nextOwnerId) ?? NULL_OWNER_INDEX;
    }
    return {
        key: params.key,
        algorithm: 'point_polygon',
        ownerIndexByCell,
    };
}

function fillRasterRegion(params: {
    readonly spec: GridSpec;
    readonly region: IndexedRegion;
    readonly indexedRegions: readonly IndexedRegion[];
    readonly ownerIndexByCell: Int16Array;
    readonly regionIndexByCell: Int32Array;
    readonly starById: ReadonlyMap<string, GridOwnedStar>;
}): void {
    const { spec, region, indexedRegions, ownerIndexByCell, regionIndexByCell, starById } = params;
    const intersections: number[] = [];
    const minIy = Math.max(
        0,
        Math.floor((region.minY - spec.offsetY + spec.worldMinY) / spec.spacingPx) -
            spec.firstGridIy -
            1,
    );
    const maxIy = Math.min(
        spec.rows - 1,
        Math.ceil((region.maxY - spec.offsetY + spec.worldMinY) / spec.spacingPx) -
            spec.firstGridIy +
            1,
    );

    for (let iy = minIy; iy <= maxIy; iy += 1) {
        const y = cellY(spec, iy);
        if (y < region.minY || y > region.maxY) continue;
        intersections.length = 0;
        const points = region.points;
        for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
            const [xi, yi] = points[i];
            const [xj, yj] = points[j];
            if ((yi > y) !== (yj > y)) {
                intersections.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
            }
        }
        if (intersections.length < 2) continue;
        intersections.sort((a, b) => a - b);

        const globalIy = spec.firstGridIy + iy;
        const rowXShift =
            spec.distribution === 'hex_offset' && (globalIy & 1) === 1
                ? spec.halfSpacing
                : 0;
        for (let k = 0; k + 1 < intersections.length; k += 2) {
            const left = intersections[k];
            const right = intersections[k + 1];
            if (right <= left) continue;
            const localGuessStart =
                Math.floor(
                    (left + spec.worldMinX - spec.offsetX - rowXShift) /
                        spec.spacingPx,
                ) - spec.firstGridIx - 1;
            const localGuessEnd =
                Math.ceil(
                    (right + spec.worldMinX - spec.offsetX - rowXShift) /
                        spec.spacingPx,
                ) - spec.firstGridIx + 1;
            const ix0 = Math.max(0, localGuessStart);
            const ix1 = Math.min(spec.cols - 1, localGuessEnd);
            for (let ix = ix0; ix <= ix1; ix += 1) {
                const x = cellX(spec, ix, globalIy);
                if (x < left || x >= right) continue;
                const cellIndex = iy * spec.cols + ix;
                const existingRegionIndex = regionIndexByCell[cellIndex];
                if (existingRegionIndex < 0) {
                    regionIndexByCell[cellIndex] = region.regionIndex;
                    ownerIndexByCell[cellIndex] = region.ownerIndex;
                    continue;
                }
                const existing = indexedRegions[existingRegionIndex];
                if (!existing || existing.ownerId === region.ownerId) continue;
                const chosen = chooseRegionAtPoint({
                    current: existing,
                    candidate: region,
                    x,
                    y,
                    starById,
                });
                if (chosen.regionIndex !== existing.regionIndex) {
                    regionIndexByCell[cellIndex] = chosen.regionIndex;
                    ownerIndexByCell[cellIndex] = chosen.ownerIndex;
                }
            }
        }
    }
}

function buildRasterOwnerGrid(params: {
    readonly key: string;
    readonly spec: GridSpec;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly ownerIndexByOwnerId: ReadonlyMap<string, number>;
    readonly ownedStars?: ReadonlyArray<GridOwnedStar>;
    readonly coverageRadiusSq: number;
}): GridGradientOwnerGrid {
    const size = params.spec.cols * params.spec.rows;
    const ownerIndexByCell = new Int16Array(size);
    const regionIndexByCell = new Int32Array(size);
    ownerIndexByCell.fill(NULL_OWNER_INDEX);
    regionIndexByCell.fill(-1);

    const indexedRegions = indexRegions(
        params.geometry.territoryRegions,
        params.ownerIndexByOwnerId,
    );
    const starById = buildStarById(params.ownedStars);
    for (const region of indexedRegions) {
        fillRasterRegion({
            spec: params.spec,
            region,
            indexedRegions,
            ownerIndexByCell,
            regionIndexByCell,
            starById,
        });
    }
    buildNearestStarFallback({
        spec: params.spec,
        ownerIndexByCell,
        ownerIndexByOwnerId: params.ownerIndexByOwnerId,
        ownedStars: params.ownedStars,
        coverageRadiusSq: params.coverageRadiusSq,
    });

    return {
        key: params.key,
        algorithm: 'raster_scanline',
        ownerIndexByCell,
    };
}

export function roleToCode(role: GridVRole): number {
    if (role === 'native') return 1;
    if (role === 'dispossessed') return 2;
    if (role === 'emergent') return 3;
    if (role === 'vacating') return 4;
    return 0;
}

export function codeToRole(code: number): GridVRole {
    if (code === 1) return 'native';
    if (code === 2) return 'dispossessed';
    if (code === 3) return 'emergent';
    if (code === 4) return 'vacating';
    return 'outside';
}

function classifyRole(prev: string | null, next: string | null): GridVRole {
    if (prev === null && next === null) return 'outside';
    if (prev === null) return 'emergent';
    if (next === null) return 'vacating';
    if (prev === next) return 'native';
    return 'dispossessed';
}

function attributeEvent(
    prev: string | null,
    next: string | null,
    gx: number,
    gy: number,
    events: ReadonlyArray<ConquestEvent>,
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null,
): string {
    if ((prev === null && next === null) || prev === next) return DEFAULT_EVENT_ID;
    const matches: number[] = [];
    for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        const matchesExactTransition =
            prev !== null && next !== null
                ? event.previousOwner === prev && event.newOwner === next
                : prev === null
                    ? event.newOwner === next
                    : event.previousOwner === prev;
        if (matchesExactTransition) matches.push(i);
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
            const distSq = dx * dx + dy * dy;
            if (distSq < bestDist) {
                bestDist = distSq;
                bestIdx = idx;
            }
        }
        return makeEventId(events[bestIdx]);
    }
    return makeEventId(events[matches[0]]);
}

export function buildTypedDataFromClassification(
    classification: GridClassification,
): GridGradientTypedClassification {
    const ownerIds = new Set<string>();
    for (const v of classification.vstars) {
        if (v.prevOwnerId) ownerIds.add(v.prevOwnerId);
        if (v.nextOwnerId) ownerIds.add(v.nextOwnerId);
    }
    const ownerIdByIndex = [...ownerIds].sort();
    const ownerIndex = ownerIndexById(ownerIdByIndex);
    const size = classification.cols * classification.rows;
    const prevOwnerIndexByCell = new Int16Array(size);
    const nextOwnerIndexByCell = new Int16Array(size);
    const roleCodeByCell = new Uint8Array(size);
    prevOwnerIndexByCell.fill(NULL_OWNER_INDEX);
    nextOwnerIndexByCell.fill(NULL_OWNER_INDEX);
    const emittable: number[] = [];
    const transition: number[] = [];
    for (const v of classification.vstars) {
        const cellIndex = v.iy * classification.cols + v.ix;
        prevOwnerIndexByCell[cellIndex] =
            v.prevOwnerId === null
                ? NULL_OWNER_INDEX
                : ownerIndex.get(v.prevOwnerId) ?? NULL_OWNER_INDEX;
        nextOwnerIndexByCell[cellIndex] =
            v.nextOwnerId === null
                ? NULL_OWNER_INDEX
                : ownerIndex.get(v.nextOwnerId) ?? NULL_OWNER_INDEX;
        roleCodeByCell[cellIndex] = roleToCode(v.role);
        if (v.role !== 'outside') emittable.push(cellIndex);
        if (v.role !== 'outside' && v.role !== 'native') transition.push(cellIndex);
    }
    return {
        ownerIdByIndex,
        prevOwnerIndexByCell,
        nextOwnerIndexByCell,
        roleCodeByCell,
        emittableCellIndices: Uint32Array.from(emittable),
        transitionCellIndices: Uint32Array.from(transition),
    };
}

function materializeClassification(params: {
    readonly spec: GridSpec;
    readonly ownerIdByIndex: readonly string[];
    readonly prevOwnerGrid: GridGradientOwnerGrid;
    readonly nextOwnerGrid: GridGradientOwnerGrid;
    readonly conquestEvents: readonly ConquestEvent[];
    readonly resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}): { classification: GridClassification; typed: GridGradientTypedClassification } {
    const size = params.spec.cols * params.spec.rows;
    const vstars: GridVStar[] = new Array(size);
    const emittableVstars: GridVStar[] = [];
    const roleBins: Record<GridVRole, string[]> = {
        native: [],
        dispossessed: [],
        emergent: [],
        vacating: [],
        outside: [],
    };
    const dispossessedByEventId: Record<string, string[]> = {};
    const roleCodeByCell = new Uint8Array(size);
    const emittableCellIndices: number[] = [];
    const transitionCellIndices: number[] = [];

    for (let iy = 0; iy < params.spec.rows; iy += 1) {
        for (let ix = 0; ix < params.spec.cols; ix += 1) {
            const cellIndex = iy * params.spec.cols + ix;
            const { x, y } = cellPoint(params.spec, ix, iy);
            const prevOwnerIndex = params.prevOwnerGrid.ownerIndexByCell[cellIndex] ?? NULL_OWNER_INDEX;
            const nextOwnerIndex = params.nextOwnerGrid.ownerIndexByCell[cellIndex] ?? NULL_OWNER_INDEX;
            const prevOwnerId = prevOwnerIndex < 0 ? null : params.ownerIdByIndex[prevOwnerIndex] ?? null;
            const nextOwnerId = nextOwnerIndex < 0 ? null : params.ownerIdByIndex[nextOwnerIndex] ?? null;
            const role = classifyRole(prevOwnerId, nextOwnerId);
            const id = `g:${ix}:${iy}`;
            let eventId: string | null = null;
            if (role !== 'native' && role !== 'outside') {
                eventId = attributeEvent(
                    prevOwnerId,
                    nextOwnerId,
                    x,
                    y,
                    params.conquestEvents,
                    params.resolveStarPosition,
                );
                (dispossessedByEventId[eventId] ??= []).push(id);
                transitionCellIndices.push(cellIndex);
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
            vstars[cellIndex] = vstar;
            roleBins[role].push(id);
            roleCodeByCell[cellIndex] = roleToCode(role);
            if (role !== 'outside') {
                emittableVstars.push(vstar);
                emittableCellIndices.push(cellIndex);
            }
        }
    }

    return {
        classification: {
            cols: params.spec.cols,
            rows: params.spec.rows,
            spacingPx: params.spec.spacingPx,
            requestedSpacingPx: params.spec.requestedSpacingPx,
            originMode: params.spec.originMode,
            distribution: params.spec.distribution,
            vstars,
            emittableVstars,
            byRole: roleBins,
            dispossessedByEventId,
            defaultEventId: DEFAULT_EVENT_ID,
        },
        typed: {
            ownerIdByIndex: params.ownerIdByIndex,
            prevOwnerIndexByCell: params.prevOwnerGrid.ownerIndexByCell,
            nextOwnerIndexByCell: params.nextOwnerGrid.ownerIndexByCell,
            roleCodeByCell,
            emittableCellIndices: Uint32Array.from(emittableCellIndices),
            transitionCellIndices: Uint32Array.from(transitionCellIndices),
        },
    };
}

export function buildGridGradientOwnerGridKey(params: {
    readonly geometry: ResolvedGeometrySnapshot;
    readonly spec: GridSpec;
    readonly ownedStars?: ReadonlyArray<GridOwnedStar>;
    readonly ownerIdByIndex: readonly string[];
}): string {
    const starSig = (params.ownedStars ?? [])
        .map((star) => `${star.id}:${star.ownerId}:${Math.round(star.x * 100)}:${Math.round(star.y * 100)}`)
        .sort()
        .join(',');
    return [
        params.geometry.version,
        params.spec.worldMinX,
        params.spec.worldMinY,
        params.spec.worldWidth,
        params.spec.worldHeight,
        params.spec.spacingPx,
        params.spec.originMode,
        params.spec.distribution,
        params.spec.positionJitter,
        params.ownerIdByIndex.join(','),
        starSig,
    ].join('|');
}

function resolveOwnerGrid(params: {
    readonly key: string;
    readonly spec: GridSpec;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly baseParams: BuildGridClassificationParams;
    readonly ownerIndexByOwnerId: ReadonlyMap<string, number>;
    readonly ownedStars?: ReadonlyArray<GridOwnedStar>;
    readonly coverageRadiusSq: number;
    readonly cache?: GridGradientOwnerGridCache;
}): { grid: GridGradientOwnerGrid; cacheHit: boolean; buildMs: number } {
    const cached = params.cache?.get(params.key);
    if (cached) return { grid: cached, cacheHit: true, buildMs: 0 };
    const startMs = performance.now();
    const grid =
        params.spec.distribution === 'jittered' && params.spec.positionJitter > 0
            ? buildPointOwnerGrid({
                key: params.key,
                baseParams: {
                    ...params.baseParams,
                    prevGeometry: params.geometry,
                    prevOwnedStars: params.ownedStars,
                },
                ownerIndexByOwnerId: params.ownerIndexByOwnerId,
            })
            : buildRasterOwnerGrid({
                key: params.key,
                spec: params.spec,
                geometry: params.geometry,
                ownerIndexByOwnerId: params.ownerIndexByOwnerId,
                ownedStars: params.ownedStars,
                coverageRadiusSq: params.coverageRadiusSq,
            });
    params.cache?.set(params.key, grid);
    return { grid, cacheHit: false, buildMs: performance.now() - startMs };
}

export function buildGridGradientTypedClassification(
    params: BuildGridClassificationParams & {
        readonly ownerGridCache?: GridGradientOwnerGridCache;
    },
): GridGradientTypedClassificationResult {
    const spec = buildGridSpec(params);
    const ownerIdByIndex = collectOwnerIds({
        prevGeometry: params.prevGeometry,
        nextGeometry: params.nextGeometry,
        prevOwnedStars: params.prevOwnedStars,
        nextOwnedStars: params.nextOwnedStars,
    });
    const ownerIndex = ownerIndexById(ownerIdByIndex);
    const coverageRadius = params.coverageRadiusPx ?? spec.spacingPx * 3;
    const coverageRadiusSq = coverageRadius * coverageRadius;
    const prevKey = buildGridGradientOwnerGridKey({
        geometry: params.prevGeometry,
        spec,
        ownedStars: params.prevOwnedStars,
        ownerIdByIndex,
    });
    const nextKey = params.prevGeometry === params.nextGeometry &&
        params.prevOwnedStars === params.nextOwnedStars
        ? prevKey
        : buildGridGradientOwnerGridKey({
            geometry: params.nextGeometry,
            spec,
            ownedStars: params.nextOwnedStars,
            ownerIdByIndex,
        });

    const prev = resolveOwnerGrid({
        key: prevKey,
        spec,
        geometry: params.prevGeometry,
        baseParams: params,
        ownerIndexByOwnerId: ownerIndex,
        ownedStars: params.prevOwnedStars,
        coverageRadiusSq,
        cache: params.ownerGridCache,
    });
    const next = nextKey === prevKey
        ? { ...prev, cacheHit: true }
        : resolveOwnerGrid({
            key: nextKey,
            spec,
            geometry: params.nextGeometry,
            baseParams: params,
            ownerIndexByOwnerId: ownerIndex,
            ownedStars: params.nextOwnedStars,
            coverageRadiusSq,
            cache: params.ownerGridCache,
        });

    const materializeStartMs = performance.now();
    const materialized = materializeClassification({
        spec,
        ownerIdByIndex,
        prevOwnerGrid: prev.grid,
        nextOwnerGrid: next.grid,
        conquestEvents: params.conquestEvents,
        resolveStarPosition: params.resolveStarPosition,
    });

    return {
        classification: materialized.classification,
        typed: materialized.typed,
        algorithm:
            prev.grid.algorithm === 'point_polygon' || next.grid.algorithm === 'point_polygon'
                ? 'point_polygon'
                : 'raster_scanline',
        prevOwnerGridCacheHit: prev.cacheHit,
        nextOwnerGridCacheHit: next.cacheHit,
        ownerGridBuildMs: prev.buildMs + (nextKey === prevKey ? 0 : next.buildMs),
        classificationMaterializeMs: performance.now() - materializeStartMs,
    };
}
