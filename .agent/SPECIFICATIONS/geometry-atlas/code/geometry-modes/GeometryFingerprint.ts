import type {
    TerritoryGeneratorSettings,
} from '../../../compiler/powerVoronoiTerritoryGeometryGenerator';
import { buildTerritoryGeometryFingerprint } from '../../../compiler/powerVoronoiTerritoryGeometryGenerator';
import type { StarState } from '$lib/types/game.types';
import type { GeometryModeId } from '../../../contracts/TerritoryModeSelection';

export function buildGeometryVersion(
    modeId: GeometryModeId,
    stars: readonly StarState[],
    settings: TerritoryGeneratorSettings,
    ownershipVersion: string,
): string {
    const hash = buildTerritoryGeometryFingerprint([...stars], settings);
    return `geometry:${modeId}:${ownershipVersion}:${hash}`;
}
