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
        starMargin: 45,
        corridorEnabled: true,
        corridorSpacing: 60,
        cxCount: 0,
        cxWeight: 0.5,
        disconnectEnabled: true,
        disconnectDistance: 400,
        dxWeight: 0.3,
        clusterSplit: false,
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
