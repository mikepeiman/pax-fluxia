import {
    DEFAULT_TERRITORY_MODE_SELECTION,
    type TerritoryModeSelection,
} from '../contracts/TerritoryModeSelection';
import type { TerritoryTunables } from '../contracts/TerritoryFrameInput';

export interface TerritoryRuntimeSettingsSnapshot {
    selection: TerritoryModeSelection;
    tunables: TerritoryTunables;
}

function asNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
}

export function readTerritoryRuntimeSettings(
    config: Record<string, unknown>,
): TerritoryRuntimeSettingsSnapshot {
    return {
        selection: {
            ownershipMode: DEFAULT_TERRITORY_MODE_SELECTION.ownershipMode,
            geometryMode: asString(
                config.TERRITORY_GEOMETRY_MODE,
                DEFAULT_TERRITORY_MODE_SELECTION.geometryMode,
            ) as TerritoryModeSelection['geometryMode'],
            fillTransitionMode: asString(
                config.TERRITORY_FILL_TRANSITION_MODE,
                DEFAULT_TERRITORY_MODE_SELECTION.fillTransitionMode,
            ) as TerritoryModeSelection['fillTransitionMode'],
            borderTransitionMode: asString(
                config.TERRITORY_BORDER_TRANSITION_MODE,
                DEFAULT_TERRITORY_MODE_SELECTION.borderTransitionMode,
            ) as TerritoryModeSelection['borderTransitionMode'],
            styleMode: asString(
                config.TERRITORY_STYLE_MODE,
                DEFAULT_TERRITORY_MODE_SELECTION.styleMode,
            ) as TerritoryModeSelection['styleMode'],
        },
        tunables: {
            transitionDurationMs: asNumber(config.TERRITORY_TRANSITION_MS, 600),
            borderWidth: asNumber(config.VORONOI_BORDER_WIDTH, 2),
            fillAlpha: asNumber(config.VORONOI_ALPHA, 0.2),
            borderAlpha: asNumber(config.VORONOI_BORDER_ALPHA, 0.5),
            geometrySmoothingPasses: asNumber(config.VORONOI_BORDER_SMOOTH, 2),
            frontierResolution: asNumber(config.FRONTIER_RESOLUTION, 5),
            boundaryPad: asNumber(config.CHAIKIN_BOUNDARY_PAD, 50),
            boundaryEps: asNumber(config.CHAIKIN_BOUNDARY_EPS, 6),
        },
    };
}
