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
        id: 'territory_canonical',
        label: 'Layered Runtime',
        shortDescription: 'Direct-runtime territory route with comparison support',
        legacyDispatch: true,
        uiHidden: true,
    },
    {
        id: 'power_voronoi_canonical',
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
        label: 'PVV2 DY4 ref',
        shortDescription: 'Restored reference (8dce88c)',
        legacyDispatch: true,
        uiHidden: true,
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
        id: 'metaball_grid',
        label: 'Metaball grid',
        shortDescription:
            'Ownership geometry underlayer + world-anchored grid of metaball cells; conquest waves flip cells cell-by-cell',
        legacyDispatch: true,
    },
    {
        id: 'metaball_grid_phase_edges',
        label: 'Phase Edges: Ember Lattice',
        shortDescription:
            'Dense square-lattice territory renderer with contour-derived blended frontiers and inward heat grading',
        legacyDispatch: true,
    },
    {
        id: 'metaball_grid_phase_field',
        label: 'Metaball grid phase field',
        shortDescription:
            'Fill-first conquest mode with conquest-local PRE/POST compositing, frontier emphasis, and finish-tail controls',
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
