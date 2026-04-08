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
    if (raw === 'active_front') return 'active_front';
    if (raw === 'unified_topology') return 'unified_topology';
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
            transitionDurationMs: (() => {
                const bindToTick = Boolean(config.TERRITORY_TRANSITION_BIND_TO_TICK);
                const tickMs = asNumber(config.BASE_TICK_MS, 1250);
                const storedMs = asNumber(config.TERRITORY_TRANSITION_MS, 600);
                return bindToTick
                    ? Math.max(0, Math.round(tickMs))
                    : Math.max(0, Math.round(storedMs));
            })(),
            borderWidth: asNumber(config.VORONOI_BORDER_WIDTH, 2),
            fillAlpha: asNumber(config.VORONOI_ALPHA, 0.2),
            borderAlpha: asNumber(config.VORONOI_BORDER_ALPHA, 0.5),
            geometrySmoothingPasses: asNumber(config.VORONOI_BORDER_SMOOTH, 2),
            frontierResolution: asNumber(config.FRONTIER_RESOLUTION, 5),
            boundaryPad: asNumber(config.CHAIKIN_BOUNDARY_PAD, 50),
            boundaryEps: asNumber(config.CHAIKIN_BOUNDARY_EPS, 6),
            // --- Geometry: MSR ---
            starMargin: asNumber(config.MODIFIED_VORONOI_STAR_MARGIN, 45),
            // --- Geometry: CX (Corridor Connection) ---
            corridorEnabled: Boolean(config.MODIFIED_VORONOI_CORRIDOR_ENABLED ?? true),
            corridorSpacing: asNumber(config.MODIFIED_VORONOI_CORRIDOR_SPACING, 60),
            corridorCount: asNumber(config.TERRITORY_CX_COUNT, 0),
            corridorWeight: asNumber(config.TERRITORY_CX_WEIGHT, 0.5),
            // --- Geometry: DX (Disconnect Zones) ---
            disconnectEnabled: Boolean(config.MODIFIED_VORONOI_DISCONNECT_ENABLED ?? false),
            disconnectDistance: asNumber(config.MODIFIED_VORONOI_DISCONNECT_DISTANCE, 400),
            disconnectWeight: asNumber(config.TERRITORY_DX_WEIGHT, 0.3),
            // --- Geometry: Cluster splitting ---
            clusterSplitThreshold: config.TERRITORY_CLUSTER_SPLIT ? 1 : 0,
        },
    };
}
