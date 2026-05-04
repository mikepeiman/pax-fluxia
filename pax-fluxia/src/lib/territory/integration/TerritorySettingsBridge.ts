import {
    DEFAULT_TERRITORY_MODE_SELECTION,
    type TerritoryModeSelection,
} from '../contracts/TerritoryModeSelection';
import type {
    Pvv4ProgressProfileId,
    TerritoryTunables,
} from '../contracts/TerritoryFrameInput';
import { readTerritoryGeometryTunables } from '../geometry/geometryTuning';

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

function resolvePvv4ProgressProfile(
    rawValue: unknown,
): Pvv4ProgressProfileId {
    const raw = asString(rawValue, 'smoothstep');
    switch (raw) {
        case 'linear':
        case 'smoothstep':
        case 'ease_in_out_quad':
        case 'ease_in_out_cubic':
            return raw;
        default:
            return 'smoothstep';
    }
}

function resolveGeometryMode(_rawValue: unknown): TerritoryModeSelection['geometryMode'] {
    // All geometry modes are now unified. Any legacy string is silently normalized.
    return 'unified_vector';
}

function resolveFillTransitionMode(config: Record<string, unknown>): TerritoryModeSelection['fillTransitionMode'] {
    const raw = asString(
        config.TERRITORY_FILL_TRANSITION_MODE ?? config.TERRITORY_FILL_TRANSITION ?? config.TERRITORY_FILL_MODE,
        DEFAULT_TERRITORY_MODE_SELECTION.fillTransitionMode,
    );
    if (raw === 'none' || raw === 'off') return 'off';
    if (raw === 'legacy_fill_active_front' || raw === 'active_front') {
        return 'legacy_fill_active_front';
    }
    if (raw === 'topology_fill_rebuild' || raw === 'unified_topology') {
        return 'topology_fill_rebuild';
    }
    if (raw === 'legacy_fill_crossfade' || raw === 'crossfade') {
        return 'legacy_fill_crossfade';
    }
    // Broken legacy frontier morph configs migrate to the topology-driven path.
    if (raw === 'frontier' || raw === 'frontier_morph') {
        return 'topology_fill_rebuild';
    }
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
    const geometryTunables = readTerritoryGeometryTunables(config);
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
                const tickMs = asNumber(config.BASE_TICK_MS, 1250);
                const storedMs = asNumber(config.TERRITORY_TRANSITION_MS, 600);
                return bindToTick
                    ? Math.max(0, Math.round(tickMs))
                    : Math.max(0, Math.round(storedMs));
            })(),
            pvv4ProgressProfile: resolvePvv4ProgressProfile(
                config.PVV4_PROGRESS_PROFILE,
            ),
            pvv4ProgressBlend: asNumber(config.PVV4_PROGRESS_BLEND, 0.4),
            pvv4StableAnchorEps: asNumber(config.PVV4_STABLE_ANCHOR_EPS, 2),
            pvv4ChangeSpanEps: asNumber(config.PVV4_CHANGE_SPAN_EPS, 2),
            pvv4ChangeSpanPadPoints: asNumber(
                config.PVV4_CHANGE_SPAN_PAD_POINTS,
                0,
            ),
            borderWidth: asNumber(config.VORONOI_BORDER_WIDTH, 2),
            fillAlpha: asNumber(config.VORONOI_ALPHA, 0.2),
            borderAlpha: asNumber(config.VORONOI_BORDER_ALPHA, 0.5),
            ...geometryTunables,
        },
    };
}
