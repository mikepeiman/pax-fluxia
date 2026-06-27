import {
    DEFAULT_TERRITORY_MODE_SELECTION,
    type TerritoryModeSelection,
} from '../contracts/TerritoryModeSelection';
import type { TerritoryTunables } from '../contracts/TerritoryFrameInput';
import { readNormalizedTerritoryGeometryTunables } from '../geometry/geometryTuning';

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

function resolveGeometryMode(_rawValue: unknown): TerritoryModeSelection['geometryMode'] {
    const raw = asString(_rawValue, DEFAULT_TERRITORY_MODE_SELECTION.geometryMode);
    if (raw === 'resolved_power_voronoi') return 'resolved_power_voronoi';
    if (raw === 'power_core_candidate') return 'power_core_candidate';
    // All other geometry modes are normalized onto the maintained unified compiler path.
    return 'unified_vector';
}

function resolveFillTransitionMode(config: Record<string, unknown>): TerritoryModeSelection['fillTransitionMode'] {
    const raw = asString(
        config.TERRITORY_FILL_TRANSITION_MODE ?? config.TERRITORY_FILL_TRANSITION ?? config.TERRITORY_FILL_MODE,
        DEFAULT_TERRITORY_MODE_SELECTION.fillTransitionMode,
    );
    if (raw === 'none' || raw === 'off') return 'off';
    if (raw === 'active_front') return 'active_front';
    if (raw === 'unified_topology') return 'unified_topology';
    if (raw === 'pv_frontline') return 'pv_frontline';
    if (raw === 'crossfade') return 'crossfade';
    if (raw === 'frontier' || raw === 'frontier_morph') return 'active_front';
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
    if (raw === 'vector' || raw === 'territory_runtime') return 'vector';
    return DEFAULT_TERRITORY_MODE_SELECTION.styleMode;
}

export function readTerritoryRuntimeSettings(
    config: Record<string, unknown>,
    effectiveTickMs?: number,
): TerritoryRuntimeSettingsSnapshot {
    const geometryTunables = readNormalizedTerritoryGeometryTunables(config);
    return {
        selection: {
            ownershipMode: DEFAULT_TERRITORY_MODE_SELECTION.ownershipMode,
            geometryMode: resolveGeometryMode(config.TERRITORY_GEOMETRY_MODE),
            fillTransitionMode: resolveFillTransitionMode(config),
            borderTransitionMode: resolveBorderTransitionMode(config),
            styleMode: resolveStyleMode(config),
        },
        tunables: {
            transitionDurationMs: (() => {
                const bindToTick = Boolean(config.TERRITORY_TRANSITION_BIND_TO_TICK);
                const tickMs = asNumber(
                    effectiveTickMs,
                    asNumber(config.BASE_TICK_MS, 1250),
                );
                const storedMs = asNumber(config.TERRITORY_TRANSITION_MS, 600);
                return bindToTick
                    ? Math.max(0, Math.round(tickMs))
                    : Math.max(0, Math.round(storedMs));
            })(),
            borderWidth: asNumber(config.VORONOI_BORDER_WIDTH, 2),
            fillAlpha: asNumber(config.VORONOI_ALPHA, 0.2),
            borderAlpha: asNumber(config.VORONOI_BORDER_ALPHA, 0.5),
            ...geometryTunables,
        },
    };
}
