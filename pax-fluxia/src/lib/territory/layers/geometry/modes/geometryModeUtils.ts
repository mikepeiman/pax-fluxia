import type {
    TerritoryGeometryData,
    TerritoryGeneratorSettings,
} from '../../../compiler/powerVoronoiTerritoryGeometryGenerator';
import type { CompileError } from '../../../compiler/types';
import type { TerritoryTunables, TerritoryWorldBounds } from '../../../contracts/TerritoryFrameInput';
import { buildTerritoryGeneratorSettingsFromTunables } from '../../../geometry/geometryTuning';

export function isCompileError(value: unknown): value is CompileError {
    return (value as CompileError)?.kind === 'error';
}

export function buildGeneratorSettings(
    world: TerritoryWorldBounds,
    tunables: TerritoryTunables,
): TerritoryGeneratorSettings {
    return buildTerritoryGeneratorSettingsFromTunables({
        world,
        tunables,
    });
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
