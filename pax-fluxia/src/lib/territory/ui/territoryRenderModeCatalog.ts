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

// Cleanup Stage 3D: the catalog now lists ONLY the kept render modes. Every
// quarantined mode was removed (its dispatch + files are gone in Stage 3C); saved
// configs / imported themes referencing a removed id resolve to power_vector via
// normalizeTerritoryRenderModeId (the quarantine-fallback map below).
export const TERRITORY_RENDER_MODE_CATALOG: readonly TerritoryRenderModeDefinition[] = [
    { id: 'none', label: 'Off', shortDescription: 'No territory overlay', legacyDispatch: true },
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

/**
 * Quarantine fallback (cleanup campaign Stage 3): every render mode NOT in the
 * kept set (power_vector, grid_gradient, ember_lattice, phase_edges, phase_field,
 * plus `none`=Off) resolves to `power_vector` on read, so saved configs / imported
 * themes referencing a quarantined mode keep working (never crash, never blank)
 * after its dispatch + files are removed. `cell_grid` (the plain mode) is here per
 * ruling Q4 — the Phase/Ember/Field looks live on as their own kept ids.
 */
const TERRITORY_RENDER_MODE_QUARANTINE_FALLBACK: Readonly<Record<string, string>> = {
    territory_runtime: 'power_vector',
    power_voronoi_runtime: 'power_vector',
    territory_engine: 'power_vector',
    vs_pvv3: 'power_vector',
    power_voronoi: 'power_vector',
    modified_voronoi: 'power_vector',
    pvv2_dy4: 'power_vector',
    voronoi: 'power_vector',
    distance_field: 'power_vector',
    perimeter_field: 'power_vector',
    metaball: 'power_vector',
    cell_grid: 'power_vector',
    pixel: 'power_vector',
    graph: 'power_vector',
    contour: 'power_vector',
};

/**
 * Resolve a possibly-legacy render-mode id to its current canonical id: apply the
 * rename aliases first, then the Stage-3 quarantine fallback.
 */
export function normalizeTerritoryRenderModeId<T extends string | null | undefined>(
    modeId: T,
): T | string {
    if (!modeId) return modeId;
    const renamed = TERRITORY_RENDER_MODE_ALIASES[modeId] ?? modeId;
    return TERRITORY_RENDER_MODE_QUARANTINE_FALLBACK[renamed] ?? renamed;
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
