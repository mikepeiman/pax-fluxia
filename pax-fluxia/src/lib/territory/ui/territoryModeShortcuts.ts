import { GAME_CONFIG } from '$lib/config/game.config';
import {
    loadPanelSettings,
    panelDefaultsFromConfig,
    savePanelSettings,
} from '$lib/components/ui/panelSync';
import { setSettingsFromConfigPatch } from '$lib/components/ui/settingsState';
import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';

import {
    resolveTerritoryRenderModeOptions,
    type ResolvedTerritoryRenderModeOption,
} from './territoryRenderModeCatalog';

export type TerritoryModeShortcutAppearance =
    | 'pvv4'
    | 'perimeter'
    | 'metaball'
    | 'grid'
    | 'phase_edges'
    | 'ember'
    | 'phase_field';

export type TerritoryModeShortcutOption = ResolvedTerritoryRenderModeOption & {
    shortLabel: string;
    appearance: TerritoryModeShortcutAppearance;
    displayLabel: string;
};

const TOPBAR_MODE_DEFS: ReadonlyArray<{
    id: string;
    shortLabel: string;
    displayLabel: string;
    appearance: TerritoryModeShortcutAppearance;
}> = [
    {
        id: 'power_voronoi_runtime',
        shortLabel: 'PVV4',
        displayLabel: 'Power Voronoi',
        appearance: 'pvv4',
    },
    {
        id: 'perimeter_field',
        shortLabel: 'Perimeter',
        displayLabel: 'Perimeter',
        appearance: 'perimeter',
    },
    {
        id: 'metaball',
        shortLabel: 'Metaball',
        displayLabel: 'Metaball',
        appearance: 'metaball',
    },
    {
        id: 'metaball_grid',
        shortLabel: 'Grid',
        displayLabel: 'Metaball Grid',
        appearance: 'grid',
    },
    {
        id: 'metaball_grid_phase_edges',
        shortLabel: 'Edges',
        displayLabel: 'Phase Edges',
        appearance: 'phase_edges',
    },
    {
        id: 'metaball_grid_ember_lattice',
        shortLabel: 'Ember',
        displayLabel: 'Ember Lattice',
        appearance: 'ember',
    },
    {
        id: 'metaball_grid_phase_field',
        shortLabel: 'Field',
        displayLabel: 'Phase Field',
        appearance: 'phase_field',
    },
];

const STYLE_TO_BOOLEAN: Record<string, string> = {
    vs_pvv3: 'territoryPVV3',
    power_voronoi: 'territoryPowerVoronoi',
    modified_voronoi: 'territoryModifiedVoronoi',
    distance_field: 'territoryDistanceField',
    voronoi: 'territoryVoronoi',
    metaball: 'territoryMetaball',
    pixel: 'territoryPixel',
    graph: 'territoryGraph',
    contour: 'territoryContour',
    territory_engine: 'territoryEngine',
};

export function getTopbarTerritoryModeOptions(): TerritoryModeShortcutOption[] {
    const catalogById = new Map(
        resolveTerritoryRenderModeOptions().map((option) => [option.id, option] as const),
    );

    return TOPBAR_MODE_DEFS.flatMap((def) => {
        const option = catalogById.get(def.id);
        if (!option || !option.selectable) return [];
        return [
            {
                ...option,
                label: def.displayLabel,
                shortLabel: def.shortLabel,
                displayLabel: def.displayLabel,
                appearance: def.appearance,
            },
        ];
    });
}

function resolveActiveFillTransitionMode(panel: Record<string, any>): string {
    return (
        panel.territoryFillTransitionMode ??
        panel.territoryFillTransition ??
        GAME_CONFIG.TERRITORY_FILL_TRANSITION_MODE ??
        GAME_CONFIG.TERRITORY_FILL_MODE ??
        'active_front'
    );
}

export function applyTopbarTerritoryModeShortcut(modeId: string): void {
    let panel = loadPanelSettings(panelDefaultsFromConfig());
    const configPatch: Record<string, unknown> = {
        TERRITORY_RENDER_MODE: modeId,
    };

    if (modeId === 'power_voronoi_runtime') {
        configPatch.TERRITORY_FILL_TRANSITION_MODE = 'pv_frontline';
        configPatch.TERRITORY_BORDER_TRANSITION_MODE = 'off';
        configPatch.TERRITORY_BORDER_TRANSITION = 'none';
    } else if (resolveActiveFillTransitionMode(panel) === 'pv_frontline') {
        configPatch.TERRITORY_FILL_TRANSITION_MODE = 'active_front';
    }

    panel = setSettingsFromConfigPatch(panel, configPatch, savePanelSettings);

    const styleFlagsPatch = Object.fromEntries(
        Object.entries(STYLE_TO_BOOLEAN).map(([styleId, panelKey]) => [
            panelKey,
            modeId !== 'none' && styleId === modeId,
        ]),
    );

    savePanelSettings({
        ...panel,
        ...styleFlagsPatch,
    });

    bumpTerritoryVisualConfig();

    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('pax-settings-config-sync-requested', {
                detail: { source: 'territory-mode-shortcut', modeId },
            }),
        );
    }
}
