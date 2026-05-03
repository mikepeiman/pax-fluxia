export type TerritoryArchitecturePath = 'clean' | 'legacy';

export type TerritoryCanonicalRoute =
    | 'canonical_clean_bridge'
    | 'canonical_legacy_bridge'
    | 'legacy_style_renderer';

export interface TerritoryArchitectureRouteInput {
    renderMode?: string;
    architecturePath?: string;
}

export interface TerritoryArchitectureRouteDecision {
    renderMode: string;
    architecturePath: TerritoryArchitecturePath;
    route: TerritoryCanonicalRoute;
    isCanonicalStyle: boolean;
}

function resolveArchitecturePath(raw: string | undefined): TerritoryArchitecturePath {
    return 'clean';
}

export function resolveTerritoryArchitectureRoute(
    input: TerritoryArchitectureRouteInput,
): TerritoryArchitectureRouteDecision {
    const renderMode = input.renderMode ?? 'territory_canonical';
    const architecturePath = resolveArchitecturePath(input.architecturePath);
    const isCanonicalStyle =
        renderMode === 'territory_canonical' ||
        renderMode === 'power_voronoi_canonical';

    if (!isCanonicalStyle) {
        return {
            renderMode,
            architecturePath,
            route: 'legacy_style_renderer',
            isCanonicalStyle,
        };
    }

    if (renderMode === 'power_voronoi_canonical') {
        return {
            renderMode,
            architecturePath,
            route: 'canonical_clean_bridge',
            isCanonicalStyle,
        };
    }

    return {
        renderMode,
        architecturePath,
        route:
            architecturePath === 'clean'
                ? 'canonical_clean_bridge'
                : 'canonical_legacy_bridge',
        isCanonicalStyle,
    };
}
