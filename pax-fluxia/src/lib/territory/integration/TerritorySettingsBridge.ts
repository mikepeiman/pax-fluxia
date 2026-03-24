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

function resolveGeometryMode(rawValue: unknown): TerritoryModeSelection['geometryMode'] {
    const raw = asString(rawValue, DEFAULT_TERRITORY_MODE_SELECTION.geometryMode);
    if (raw === 'unified_vector') return 'unified_vector';
    if (raw === 'new_frontiers_0319') return 'boundary_aware_frontier';
    if (raw === 'unified_polygon') return 'seed_graph';
    if (raw === 'power_voronoi') return 'power_voronoi';
    if (raw === 'boundary_aware_frontier') return 'boundary_aware_frontier';
    if (raw === 'seed_graph') return 'seed_graph';
    return DEFAULT_TERRITORY_MODE_SELECTION.geometryMode;
}

function resolveFillTransitionMode(config: Record<string, unknown>): TerritoryModeSelection['fillTransitionMode'] {
    const raw = asString(
        config.TERRITORY_FILL_TRANSITION_MODE ?? config.TERRITORY_FILL_TRANSITION ?? config.TERRITORY_FILL_MODE,
        DEFAULT_TERRITORY_MODE_SELECTION.fillTransitionMode,
    );
    if (raw === 'none' || raw === 'off') return 'off';
    if (raw === 'crossfade') return 'crossfade';
    if (raw === 'frontier' || raw === 'frontier_morph') return 'frontier_morph';
    return DEFAULT_TERRITORY_MODE_SELECTION.fillTransitionMode;
}

function resolveBorderTransitionMode(
    config: Record<string, unknown>,
): TerritoryModeSelection['borderTransitionMode'] {
    const raw = asString(
        config.TERRITORY_BORDER_TRANSITION_MODE ?? config.TERRITORY_BORDER_TRANSITION,
        DEFAULT_TERRITORY_MODE_SELECTION.borderTransitionMode,
    );
    if (raw === 'none' || raw === 'off') return 'off';
    if (raw === 'rope_morph' || raw === 'pixi_mesh_rope') return 'rope_morph';
    if (raw === 'optimal_transport') return 'optimal_transport';
    return DEFAULT_TERRITORY_MODE_SELECTION.borderTransitionMode;
}

function resolveStyleMode(config: Record<string, unknown>): TerritoryModeSelection['styleMode'] {
    const raw = asString(
        config.TERRITORY_STYLE_MODE ?? config.TERRITORY_RENDER_MODE,
        DEFAULT_TERRITORY_MODE_SELECTION.styleMode,
    );
    if (raw === 'distance_field') return 'distance_field';
    if (raw === 'pixel') return 'pixel';
    if (raw === 'canonical' || raw === 'territory_canonical') return 'canonical';
    return DEFAULT_TERRITORY_MODE_SELECTION.styleMode;
}

export function readTerritoryRuntimeSettings(
    config: Record<string, unknown>,
): TerritoryRuntimeSettingsSnapshot {
    return {
        selection: {
            ownershipMode: DEFAULT_TERRITORY_MODE_SELECTION.ownershipMode,
            geometryMode: resolveGeometryMode(config.TERRITORY_GEOMETRY_MODE),
            fillTransitionMode: resolveFillTransitionMode(config),
            borderTransitionMode: resolveBorderTransitionMode(config),
            styleMode: resolveStyleMode(config),
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
