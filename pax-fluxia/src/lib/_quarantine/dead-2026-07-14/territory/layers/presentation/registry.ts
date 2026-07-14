import type { TerritoryStyleMode } from './TerritoryStyleMode';
import { PixelQuantizedMeshStyle } from './modes/PixelQuantizedMeshStyle';
import { SignedDistanceFieldMeshStyle } from './modes/SignedDistanceFieldMeshStyle';
import { VectorPolygonMeshStyle } from './modes/VectorPolygonMeshStyle';

export const TERRITORY_STYLE_MODES: readonly TerritoryStyleMode[] = [
    new VectorPolygonMeshStyle(),
    new SignedDistanceFieldMeshStyle(),
    new PixelQuantizedMeshStyle(),
];

export const TERRITORY_STYLE_MODE_BY_ID: ReadonlyMap<string, TerritoryStyleMode> =
    new Map(TERRITORY_STYLE_MODES.map((mode) => [mode.id, mode]));
