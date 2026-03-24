import type {
    TerritoryGeometryData,
    TerritoryGeneratorSettings,
} from '../../../compiler/powerVoronoiTerritoryGeometryGenerator';
import type { CompileError } from '../../../compiler/types';
import type { TerritoryTunables, TerritoryWorldBounds } from '../../../contracts/TerritoryFrameInput';

export function isCompileError(value: unknown): value is CompileError {
    return (value as CompileError)?.kind === 'error';
}

export function buildGeneratorSettings(
    world: TerritoryWorldBounds,
    tunables: TerritoryTunables,
): TerritoryGeneratorSettings {
    return {
        starMargin: tunables.starMargin,
        corridorEnabled: tunables.corridorEnabled,
        corridorSpacing: tunables.corridorSpacing,
        cxCount: tunables.corridorCount,
        cxWeight: tunables.corridorWeight,
        disconnectEnabled: tunables.disconnectEnabled,
        disconnectDistance: tunables.disconnectDistance,
        dxWeight: tunables.disconnectWeight,
        clusterSplit: tunables.clusterSplitThreshold > 0,
        chaikinPasses: tunables.geometrySmoothingPasses,
        frontierResolution: tunables.frontierResolution,
        boundaryPad: tunables.boundaryPad,
        boundaryEps: tunables.boundaryEps,
        worldWidth: world.width,
        worldHeight: world.height,
    };
}

export function createEmptyTerritoryGeometryData(
    fingerprint: string,
): TerritoryGeometryData {
    return {
        cells: [],
        mergedTerritories: [],
        sharedEdges: [],
        rawSharedPolylines: [],
        sharedPolylines: [],
        worldBorderPolylines: [],
        enclaveMap: new Map<number, [number, number][][]>(),
        fingerprint,
    };
}
