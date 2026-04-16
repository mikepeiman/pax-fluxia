import { coerceVsTransitionModeForRenderMode } from '$lib/territory/transitions/territoryTransitionModes';
import { TERRITORY_RENDER_MODE_CATALOG } from '$lib/territory/ui/territoryRenderModeCatalog';

export type ThemeRenderFamilyId =
    | 'canonical'
    | 'engine'
    | 'voronoi-lineage'
    | 'distance-field'
    | 'metaball'
    | 'perimeter-field'
    | 'graph'
    | 'pixel'
    | 'contour'
    | 'off'
    | 'agnostic';

export type ThemeRoutingStatus =
    | 'wired'
    | 'legacy-fallback'
    | 'agnostic'
    | 'needs-editing';

export interface ThemeRenderFamilyMeta {
    id: ThemeRenderFamilyId;
    label: string;
    description: string;
    order: number;
}

export interface ThemeLike {
    name: string;
    values: Partial<Record<string, number | string | boolean>>;
}

export interface ThemeRoutingAudit {
    renderMode: string | null;
    familyId: ThemeRenderFamilyId;
    familyLabel: string;
    status: ThemeRoutingStatus;
    notes: string[];
}

export interface ThemeFamilyGroup<T extends ThemeLike> {
    id: ThemeRenderFamilyId;
    label: string;
    description: string;
    order: number;
    themes: T[];
}

export type ThemePrimitiveValues = Partial<
    Record<string, number | string | boolean>
>;

export const THEME_RENDER_FAMILY_META: Record<
    ThemeRenderFamilyId,
    ThemeRenderFamilyMeta
> = {
    canonical: {
        id: 'canonical',
        label: 'Canonical',
        description: 'Canonical layered territory route.',
        order: 10,
    },
    engine: {
        id: 'engine',
        label: 'Engine / DY4',
        description: 'Territory engine and DY4 pipeline themes.',
        order: 20,
    },
    'voronoi-lineage': {
        id: 'voronoi-lineage',
        label: 'Voronoi Lineage',
        description: 'PVV, classic Voronoi, and related legacy territory styles.',
        order: 30,
    },
    'distance-field': {
        id: 'distance-field',
        label: 'Distance Field',
        description: 'Distance-field territory themes.',
        order: 40,
    },
    metaball: {
        id: 'metaball',
        label: 'Metaball',
        description: 'Metaball family territory themes.',
        order: 50,
    },
    'perimeter-field': {
        id: 'perimeter-field',
        label: 'Perimeter Field',
        description: 'Perimeter-field family territory themes.',
        order: 60,
    },
    graph: {
        id: 'graph',
        label: 'Graph / Lane',
        description: 'Lane-graph territory themes.',
        order: 70,
    },
    pixel: {
        id: 'pixel',
        label: 'Pixel',
        description: 'Pixel-grid territory themes.',
        order: 80,
    },
    contour: {
        id: 'contour',
        label: 'Contour',
        description: 'Contour / marching-squares territory themes.',
        order: 90,
    },
    off: {
        id: 'off',
        label: 'Territory Off',
        description: 'Themes that explicitly disable territory overlays.',
        order: 100,
    },
    agnostic: {
        id: 'agnostic',
        label: 'Mode Agnostic',
        description: 'Utility packs and themes that do not set a territory mode.',
        order: 110,
    },
};

const SUPPORTED_RENDER_MODES = new Set(
    TERRITORY_RENDER_MODE_CATALOG.map((mode) => mode.id),
);

const UI_HIDDEN_RENDER_MODES = new Set(
    TERRITORY_RENDER_MODE_CATALOG.filter((mode) => mode.uiHidden).map(
        (mode) => mode.id,
    ),
);

export function resolveThemeRenderMode(
    values: Record<string, unknown>,
): string | null {
    const explicitMode =
        typeof values.TERRITORY_RENDER_MODE === 'string'
            ? values.TERRITORY_RENDER_MODE.trim()
            : '';
    if (explicitMode) return explicitMode;
    if (values.TERRITORY_PVV3) return 'vs_pvv3';
    if (values.TERRITORY_POWER_VORONOI) return 'power_voronoi';
    if (values.TERRITORY_DISTANCE_FIELD) return 'distance_field';
    if (values.TERRITORY_VORONOI) return 'voronoi';
    if (values.TERRITORY_METABALL) return 'metaball';
    if (values.TERRITORY_PIXEL) return 'pixel';
    if (values.TERRITORY_GRAPH) return 'graph';
    if (values.TERRITORY_CONTOUR) return 'contour';
    if (values.TERRITORY_ENGINE_ENABLED) return 'territory_engine';
    return null;
}

export function normalizeThemeValues<T extends ThemePrimitiveValues>(
    values: T,
): T {
    const explicitMode =
        typeof values.TERRITORY_RENDER_MODE === 'string'
            ? values.TERRITORY_RENDER_MODE.trim()
            : '';
    if (explicitMode) return { ...values };

    const inferredMode = resolveThemeRenderMode(values as Record<string, unknown>);
    if (!inferredMode) return { ...values };

    return {
        ...values,
        TERRITORY_RENDER_MODE: inferredMode,
    };
}

export function resolveThemeRenderFamilyId(
    renderMode: string | null,
): ThemeRenderFamilyId {
    switch (renderMode) {
        case 'territory_canonical':
            return 'canonical';
        case 'territory_engine':
            return 'engine';
        case 'vs_pvv3':
        case 'power_voronoi':
        case 'pvv2_dy4':
        case 'modified_voronoi':
        case 'voronoi':
            return 'voronoi-lineage';
        case 'distance_field':
            return 'distance-field';
        case 'metaball':
            return 'metaball';
        case 'perimeter_field':
            return 'perimeter-field';
        case 'graph':
            return 'graph';
        case 'pixel':
            return 'pixel';
        case 'contour':
            return 'contour';
        case 'none':
            return 'off';
        default:
            return 'agnostic';
    }
}

export function auditThemeRouting(
    values: Record<string, unknown>,
): ThemeRoutingAudit {
    const normalizedValues = normalizeThemeValues(
        values as ThemePrimitiveValues,
    );
    const renderMode = resolveThemeRenderMode(
        normalizedValues as Record<string, unknown>,
    );
    const familyId = resolveThemeRenderFamilyId(renderMode);
    const familyLabel = THEME_RENDER_FAMILY_META[familyId].label;
    const notes: string[] = [];
    const explicitMode =
        typeof values.TERRITORY_RENDER_MODE === 'string'
            ? values.TERRITORY_RENDER_MODE.trim()
            : '';

    if (!renderMode) {
        notes.push('No territory mode saved; this theme is mode-agnostic.');
        return {
            renderMode: null,
            familyId,
            familyLabel,
            status: 'agnostic',
            notes,
        };
    }

    if (!explicitMode) {
        notes.push(
            `Saved theme omits TERRITORY_RENDER_MODE; without normalization it inherits the current renderer. The app now infers "${renderMode}" from the legacy boolean mode keys on apply.`,
        );
        return {
            renderMode,
            familyId,
            familyLabel,
            status: 'legacy-fallback',
            notes,
        };
    }

    if (!SUPPORTED_RENDER_MODES.has(renderMode)) {
        notes.push(
            `Saved TERRITORY_RENDER_MODE="${renderMode}" is not in the current render-mode catalog.`,
        );
        return {
            renderMode,
            familyId,
            familyLabel,
            status: 'needs-editing',
            notes,
        };
    }

    if (UI_HIDDEN_RENDER_MODES.has(renderMode)) {
        notes.push(
            `Saved TERRITORY_RENDER_MODE="${renderMode}" is deprecated/hidden in the current UI.`,
        );
        return {
            renderMode,
            familyId,
            familyLabel,
            status: 'needs-editing',
            notes,
        };
    }

    const savedTransitionMode =
        typeof normalizedValues.VS_TRANSITION_MODE === 'string'
            ? normalizedValues.VS_TRANSITION_MODE
            : null;
    if (savedTransitionMode) {
        const coercedMode = coerceVsTransitionModeForRenderMode(
            renderMode,
            savedTransitionMode,
        );
        if (coercedMode !== savedTransitionMode) {
            notes.push(
                `Saved VS_TRANSITION_MODE="${savedTransitionMode}" is coerced to "${coercedMode}" for render mode "${renderMode}".`,
            );
            return {
                renderMode,
                familyId,
                familyLabel,
                status: 'needs-editing',
                notes,
            };
        }
    }

    notes.push(
        `Uses explicit TERRITORY_RENDER_MODE="${renderMode}" with current routing.`,
    );
    return {
        renderMode,
        familyId,
        familyLabel,
        status: 'wired',
        notes,
    };
}

export function groupThemesByRenderFamily<T extends ThemeLike>(
    themes: readonly T[],
): ThemeFamilyGroup<T>[] {
    const groups = new Map<ThemeRenderFamilyId, ThemeFamilyGroup<T>>();

    for (const theme of themes) {
        const audit = auditThemeRouting(
            theme.values as Record<string, unknown>,
        );
        const meta = THEME_RENDER_FAMILY_META[audit.familyId];
        const existing = groups.get(meta.id);
        if (existing) {
            existing.themes.push(theme);
            continue;
        }
        groups.set(meta.id, {
            ...meta,
            themes: [theme],
        });
    }

    return [...groups.values()].sort(
        (a, b) => a.order - b.order || a.label.localeCompare(b.label),
    );
}
