import type { TerritoryStyleMode } from './TerritoryStyleMode';
import { CanonicalTerritoryStyle } from './modes/CanonicalTerritoryStyle';
import { DistanceFieldStyle } from './modes/DistanceFieldStyle';
import { PixelTerritoryStyle } from './modes/PixelTerritoryStyle';

export const TERRITORY_STYLE_MODES: readonly TerritoryStyleMode[] = [
    new CanonicalTerritoryStyle(),
    new DistanceFieldStyle(),
    new PixelTerritoryStyle(),
];

export const TERRITORY_STYLE_MODE_BY_ID: ReadonlyMap<string, TerritoryStyleMode> =
    new Map(TERRITORY_STYLE_MODES.map((mode) => [mode.id, mode]));
