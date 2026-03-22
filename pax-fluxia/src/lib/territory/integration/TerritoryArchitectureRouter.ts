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
    return raw === 'legacy' ? 'legacy' : 'clean';
}

export function resolveTerritoryArchitectureRoute(
    input: TerritoryArchitectureRouteInput,
): TerritoryArchitectureRouteDecision {
    const renderMode = input.renderMode ?? 'territory_canonical';
    const architecturePath = resolveArchitecturePath(input.architecturePath);
    const isCanonicalStyle = renderMode === 'territory_canonical';

    if (!isCanonicalStyle) {
        return {
            renderMode,
            architecturePath,
            route: 'legacy_style_renderer',
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
