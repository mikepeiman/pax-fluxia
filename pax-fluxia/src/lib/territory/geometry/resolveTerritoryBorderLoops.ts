import type {
    CanonicalGeometrySnapshot,
    CanonicalShellLoop,
    TerritoryRegionShape,
} from '../contracts/GeometryContracts';

export interface ResolvedTerritoryBorderLoop {
    readonly loopId: string;
    readonly ownerId: string;
    readonly points: readonly [number, number][];
    readonly alignment: 0 | 1;
    readonly confidence: number;
}

function loopAlignment(loop: CanonicalShellLoop): 0 | 1 {
    return loop.classification === 'hole' ? 0 : 1;
}

function fromShellLoops(
    loops: readonly CanonicalShellLoop[],
): ResolvedTerritoryBorderLoop[] {
    return loops
        .filter((loop) => loop.points.length >= 2)
        .map((loop) => ({
            loopId: loop.shellLoopId,
            ownerId: loop.ownerId,
            points: loop.points,
            alignment: loopAlignment(loop),
            confidence: loop.confidence,
        }));
}

function fromTerritoryRegions(
    regions: readonly TerritoryRegionShape[],
): ResolvedTerritoryBorderLoop[] {
    return regions
        .filter((region) => region.points.length >= 2)
        .map((region) => ({
            loopId: `region:${region.regionId}`,
            ownerId: region.ownerId,
            points: region.points,
            alignment: 1,
            confidence: region.confidence,
        }));
}

export function resolveTerritoryBorderLoops(
    geometry: CanonicalGeometrySnapshot,
): readonly ResolvedTerritoryBorderLoop[] {
    if (geometry.shellLoops.length > 0) {
        return fromShellLoops(geometry.shellLoops);
    }
    return fromTerritoryRegions(geometry.territoryRegions);
}
