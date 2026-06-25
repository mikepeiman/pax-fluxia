export type TerritoryArchitecturePath = 'clean' | 'legacy';

export type TerritoryRuntimeRoute =
    | 'runtime_clean_bridge'
    | 'runtime_legacy_bridge'
    | 'render_family_renderer'
    | 'legacy_style_renderer';

export interface TerritoryArchitectureRouteInput {
    renderMode?: string;
    architecturePath?: string;
}

export interface TerritoryArchitectureRouteDecision {
    renderMode: string;
    architecturePath: TerritoryArchitecturePath;
    route: TerritoryRuntimeRoute;
    isRuntimeSurfaceStyle: boolean;
    isRenderFamilySurfaceStyle: boolean;
}

function resolveArchitecturePath(raw: string | undefined): TerritoryArchitecturePath {
    return 'clean';
}

export function resolveTerritoryArchitectureRoute(
    input: TerritoryArchitectureRouteInput,
): TerritoryArchitectureRouteDecision {
    const renderMode = input.renderMode ?? 'territory_runtime';
    const architecturePath = resolveArchitecturePath(input.architecturePath);
    const isRuntimeSurfaceStyle =
        renderMode === 'territory_runtime' ||
        renderMode === 'power_voronoi_runtime';
    const isRenderFamilySurfaceStyle =
        renderMode === 'metaball' ||
        renderMode === 'cell_grid' ||
        renderMode === 'phase_edges' ||
        renderMode === 'ember_lattice' ||
        renderMode === 'phase_field' ||
        renderMode === 'perimeter_field' ||
        renderMode === 'grid_gradient';

    if (isRenderFamilySurfaceStyle) {
        return {
            renderMode,
            architecturePath,
            route: 'render_family_renderer',
            isRuntimeSurfaceStyle,
            isRenderFamilySurfaceStyle,
        };
    }

    if (!isRuntimeSurfaceStyle) {
        return {
            renderMode,
            architecturePath,
            route: 'legacy_style_renderer',
            isRuntimeSurfaceStyle,
            isRenderFamilySurfaceStyle,
        };
    }

    if (renderMode === 'power_voronoi_runtime') {
        return {
            renderMode,
            architecturePath,
            route: 'runtime_clean_bridge',
            isRuntimeSurfaceStyle,
            isRenderFamilySurfaceStyle,
        };
    }

    return {
        renderMode,
        architecturePath,
        route:
            architecturePath === 'clean'
                ? 'runtime_clean_bridge'
                : 'runtime_legacy_bridge',
        isRuntimeSurfaceStyle,
        isRenderFamilySurfaceStyle,
    };
}
