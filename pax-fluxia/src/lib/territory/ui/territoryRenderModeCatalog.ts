/**
 * Single catalog of territory render modes shown in settings UI, aligned with
 * `GameCanvas.svelte` territory style dispatch (`TERRITORY_RENDER_MODE`).
 */

export interface TerritoryRenderModeDefinition {
    readonly id: string;
    readonly label: string;
    readonly shortDescription?: string;
    /** Has a matching `case` in GameCanvas territory dispatch (or explicit off). */
    readonly legacyDispatch: boolean;
    /**
     * When true, hidden from settings "Render mode" buttons; `GameCanvas` may still
     * dispatch if `TERRITORY_RENDER_MODE` / saved panel state references this id.
     */
    readonly uiHidden?: boolean;
}

export const TERRITORY_RENDER_MODE_CATALOG: readonly TerritoryRenderModeDefinition[] = [
    { id: 'none', label: 'Off', shortDescription: 'No territory overlay', legacyDispatch: true },
    {
        id: 'territory_runtime',
        label: 'Layered Runtime',
        shortDescription: 'Direct-runtime territory route with comparison support',
        legacyDispatch: true,
        uiHidden: true,
    },
    {
        id: 'power_voronoi_runtime',
        label: 'Power Voronoi 0427 (PVV4)',
        shortDescription: 'Exact Power Voronoi direct-runtime path with full diagnostics',
        legacyDispatch: true,
    },
    {
        id: 'territory_engine',
        label: 'Engine (DY4 pipeline)',
        shortDescription: 'Modular territory engine router',
        legacyDispatch: true,
        uiHidden: true,
    },
    { id: 'vs_pvv3', label: 'PVV3', shortDescription: 'Frontier-first PVV3', legacyDispatch: true },
    {
        id: 'power_voronoi',
        label: 'PVV2 weighted',
        shortDescription: 'Weighted power Voronoi (current)',
        legacyDispatch: true,
        uiHidden: true,
    },
    {
        id: 'modified_voronoi',
        label: 'Modified Voronoi (deprecated)',
        shortDescription:
            'Deprecated - seam model superseded by PVV / power Voronoi. Not shown in UI; migrate saved configs.',
        legacyDispatch: true,
        uiHidden: true,
    },
    {
        id: 'pvv2_dy4',
        label: 'DY4 (Optimal Transport)',
        shortDescription:
            'Optimal-transport border morph conquest transitions (8dce88c reference) — distinct mode alongside PVV4',
        legacyDispatch: true,
    },
    { id: 'voronoi', label: 'Voronoi', shortDescription: 'Basic Voronoi', legacyDispatch: true },
    {
        id: 'distance_field',
        label: 'Distance field',
        shortDescription: 'GPU distance field + morph',
        legacyDispatch: true,
    },
    {
        id: 'perimeter_field',
        label: 'Perimeter field',
        shortDescription: 'Ownership geometry -> perimeter samples -> field render',
        legacyDispatch: true,
    },
    { id: 'metaball', label: 'Metaball', shortDescription: 'CPU influence field', legacyDispatch: true },
    {
        id: 'cell_grid',
        label: 'Cell Grid',
        shortDescription:
            'Ownership geometry underlayer + world-anchored grid of ownership cells; conquest waves flip cells cell-by-cell',
        legacyDispatch: true,
    },
    {
        id: 'phase_edges',
        label: 'Phase Edges',
        shortDescription:
            'Edge-forward square-lattice conquest mode with blended owner boundaries and shared grid-driven wave controls',
        legacyDispatch: true,
    },
    {
        id: 'ember_lattice',
        label: 'Ember Lattice',
        shortDescription:
            'Dense square-lattice territory renderer with contour-derived blended frontiers and inward heat grading',
        legacyDispatch: true,
    },
    {
        id: 'phase_field',
        label: 'Phase Field',
        shortDescription:
            'Fill-first conquest mode with conquest-local PRE/POST compositing, frontier emphasis, and finish-tail controls',
        legacyDispatch: true,
    },
    {
        id: 'grid_gradient',
        label: 'Grid Gradient',
        shortDescription:
            'Experimental render-family mode using PV geometry with invisible grid samples that grow toward region centers',
        legacyDispatch: true,
    },
    {
        id: 'power_vector',
        label: 'Power Vector',
        shortDescription:
            'PowerCore vector skin (K3a): fills power cells by owner; conquest frontiers SWEEP via the kinetic transition engine (needs Geometry Source = PowerCore to animate)',
        legacyDispatch: true,
    },
    { id: 'pixel', label: 'Pixel', shortDescription: 'Pixel ownership grid', legacyDispatch: true },
    { id: 'graph', label: 'Lane graph', shortDescription: 'Graph/lane influence', legacyDispatch: true },
    { id: 'contour', label: 'Contour', shortDescription: 'Marching squares worker', legacyDispatch: true },
];

export interface ResolvedTerritoryRenderModeOption extends TerritoryRenderModeDefinition {
    selectable: boolean;
    disabledReason?: string;
}

/**
 * Migration aliases for the 2026-06-24 semantic rename: the cell-grid family
 * dropped its (misnomer) `metaball_grid` prefix. Persisted render-mode ids
 * (saved panel state, imported themes) are mapped old → new on read so saved
 * setups keep resolving. Safe to keep indefinitely.
 */
const TERRITORY_RENDER_MODE_ALIASES: Readonly<Record<string, string>> = {
    metaball_grid_phase_field: 'phase_field',
    metaball_grid_phase_edges: 'phase_edges',
    metaball_grid_ember_lattice: 'ember_lattice',
    metaball_grid: 'cell_grid',
};

/** Resolve a possibly-legacy render-mode id to its current canonical id. */
export function normalizeTerritoryRenderModeId<T extends string | null | undefined>(
    modeId: T,
): T | string {
    if (!modeId) return modeId;
    return TERRITORY_RENDER_MODE_ALIASES[modeId] ?? modeId;
}

/** True if this mode id is omitted from the settings Render mode row (may still run from config). */
export function isTerritoryRenderModeUiHidden(modeId: string): boolean {
    const def = TERRITORY_RENDER_MODE_CATALOG.find((d) => d.id === modeId);
    return Boolean(def?.uiHidden);
}

export function resolveTerritoryRenderModeOptions(): ResolvedTerritoryRenderModeOption[] {
    return TERRITORY_RENDER_MODE_CATALOG.filter((def) => !def.uiHidden).map((def) => {
        if (!def.legacyDispatch) {
            return {
                ...def,
                selectable: false,
                disabledReason: 'No GameCanvas dispatch',
            };
        }
        return { ...def, selectable: true };
    });
}

export function getTerritoryRenderModeLabel(modeId: string | null | undefined): string {
    if (!modeId) return 'Off';
    return TERRITORY_RENDER_MODE_CATALOG.find((def) => def.id === modeId)?.label ?? modeId;
}
