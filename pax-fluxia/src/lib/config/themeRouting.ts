import { coerceVsTransitionModeForRenderMode } from '../territory/transitions/territoryTransitionModes';
import { TERRITORY_RENDER_MODE_CATALOG } from '../territory/ui/territoryRenderModeCatalog';

/**
 * Theme families track the KEPT render modes (cleanup campaign Stage 3). Every
 * mode retired by the quarantine groups under a single `legacy` bucket rather
 * than its own dead label — such themes resolve to power_vector on apply
 * (`normalizeTerritoryRenderModeId`) and should be re-saved.
 */
export type ThemeRenderFamilyId =
    | 'power-vector'
    | 'cell-grid'
    | 'grid-gradient'
    | 'off'
    | 'legacy'
    | 'agnostic';

export type ThemeRoutingStatus =
    | 'wired'
    | 'compat-inferred'
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
    'power-vector': {
        id: 'power-vector',
        label: 'Power Vector',
        description: 'PowerCore vector skin — the default territory route.',
        order: 10,
    },
    'cell-grid': {
        id: 'cell-grid',
        label: 'Cell Grid',
        description:
            'Square-lattice conquest skins: Phase Edges, Ember Lattice, Phase Field.',
        order: 20,
    },
    'grid-gradient': {
        id: 'grid-gradient',
        label: 'Grid Gradient',
        description:
            'PV geometry with grid samples that grow toward region centers.',
        order: 30,
    },
    off: {
        id: 'off',
        label: 'Territory Off',
        description: 'Themes that explicitly disable territory overlays.',
        order: 100,
    },
    legacy: {
        id: 'legacy',
        label: 'Legacy (retired modes)',
        description:
            'Themes saved against render modes retired in the 2026-07 cleanup. They resolve to Power Vector on apply and should be re-saved.',
        order: 105,
    },
    agnostic: {
        id: 'agnostic',
        label: 'Mode Agnostic',
        description: 'Utility packs and themes that do not set a territory mode.',
        order: 110,
    },
};

/** Kept render mode -> theme family. Anything else resolves to `legacy`. */
const RENDER_MODE_THEME_FAMILIES: Readonly<Record<string, ThemeRenderFamilyId>> = {
    power_vector: 'power-vector',
    phase_edges: 'cell-grid',
    ember_lattice: 'cell-grid',
    phase_field: 'cell-grid',
    grid_gradient: 'grid-gradient',
    none: 'off',
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
    if (!renderMode) return 'agnostic';
    return RENDER_MODE_THEME_FAMILIES[renderMode] ?? 'legacy';
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
            `Saved theme omits TERRITORY_RENDER_MODE; without normalization it inherits the current renderer. The app now infers "${renderMode}" from the older boolean mode keys on apply.`,
        );
        return {
            renderMode,
            familyId,
            familyLabel,
            status: 'compat-inferred',
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
            `Saved TERRITORY_RENDER_MODE="${renderMode}" is hidden in the current UI and should be updated.`,
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
