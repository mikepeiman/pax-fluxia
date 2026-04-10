/**
 * Single catalog of territory render modes shown in settings UI, aligned with
 * `GameCanvas.svelte` territory style dispatch (`TERRITORY_RENDER_MODE`).
 */

/** Modes that never require a RenderFamily adapter (canonical path or off). */
const EXEMPT_FROM_FAMILY_GATE = new Set<string>(['none', 'territory_canonical']);

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
        label: 'Canonical layered',
        shortDescription: 'Clean architecture / engine controller',
        legacyDispatch: true,
    },
    {
        id: 'territory_engine',
        label: 'Engine (DY4 pipeline)',
        shortDescription: 'Modular territory engine router',
        legacyDispatch: true,
    },
    { id: 'vs_pvv3', label: 'PVV3', shortDescription: 'Frontier-first PVV3', legacyDispatch: true },
    {
        id: 'power_voronoi',
        label: 'PVV2 weighted',
        shortDescription: 'Weighted power Voronoi (current)',
        legacyDispatch: true,
    },
    {
        id: 'modified_voronoi',
        label: 'Modified Voronoi (deprecated)',
        shortDescription:
            'Deprecated — seam model superseded by PVV / power Voronoi. Not shown in UI; migrate saved configs.',
        legacyDispatch: true,
        uiHidden: true,
    },
    {
        id: 'pvv2_dy4',
        label: 'PVV2 DY4 ref',
        shortDescription: 'Restored reference (8dce88c)',
        legacyDispatch: true,
    },
    { id: 'voronoi', label: 'Voronoi', shortDescription: 'Basic Voronoi', legacyDispatch: true },
    {
        id: 'distance_field',
        label: 'Distance field',
        shortDescription: 'GPU distance field + morph',
        legacyDispatch: true,
    },
    { id: 'metaball', label: 'Metaball', shortDescription: 'CPU influence field', legacyDispatch: true },
    { id: 'pixel', label: 'Pixel', shortDescription: 'Pixel ownership grid', legacyDispatch: true },
    { id: 'graph', label: 'Lane graph', shortDescription: 'Graph/lane influence', legacyDispatch: true },
    { id: 'contour', label: 'Contour', shortDescription: 'Marching squares worker', legacyDispatch: true },
];

export interface ResolvedTerritoryRenderModeOption extends TerritoryRenderModeDefinition {
    selectable: boolean;
    disabledReason?: string;
}

/**
 * When `useRenderFamilies` is false, all legacy-dispatch modes are selectable.
 * When true, only exempt modes or modes listed in `familyAdapterReadyIds` are selectable.
 */
/** True if this mode id is omitted from the settings Render mode row (may still run from config). */
export function isTerritoryRenderModeUiHidden(modeId: string): boolean {
    const def = TERRITORY_RENDER_MODE_CATALOG.find((d) => d.id === modeId);
    return Boolean(def?.uiHidden);
}

export function resolveTerritoryRenderModeOptions(
    useRenderFamilies: boolean,
    familyAdapterReadyIds: ReadonlySet<string>,
): ResolvedTerritoryRenderModeOption[] {
    return TERRITORY_RENDER_MODE_CATALOG.filter((def) => !def.uiHidden).map((def) => {
        if (!def.legacyDispatch) {
            return {
                ...def,
                selectable: false,
                disabledReason: 'No GameCanvas dispatch',
            };
        }
        if (!useRenderFamilies || EXEMPT_FROM_FAMILY_GATE.has(def.id)) {
            return { ...def, selectable: true };
        }
        if (familyAdapterReadyIds.has(def.id)) {
            return { ...def, selectable: true };
        }
        return {
            ...def,
            selectable: false,
            disabledReason:
                'Render Family gate on — no adapter registered yet (turn off USE_RENDER_FAMILIES for legacy path).',
        };
    });
}
