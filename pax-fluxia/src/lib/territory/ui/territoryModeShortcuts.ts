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

export type TerritoryModeShortcutOption = ResolvedTerritoryRenderModeOption & {
    displayLabel: string;
};

/**
 * Topbar render-mode chips — every selectable mode in the catalog, in catalog
 * order. The catalog is the single source of truth (id, label, shortLabel);
 * there is no separate hand-maintained chip list and no fallback dropdown.
 * The keep-set is small enough that every mode IS a chip.
 */
export function getTopbarTerritoryModeOptions(): TerritoryModeShortcutOption[] {
    return resolveTerritoryRenderModeOptions()
        .filter((option) => option.selectable)
        .map((option) => ({ ...option, displayLabel: option.label }));
}

function resolveActiveFillTransitionMode(panel: Record<string, any>): string {
    return (
        panel.territoryFillTransitionMode ??
        GAME_CONFIG.TERRITORY_FILL_TRANSITION_MODE ??
        GAME_CONFIG.TERRITORY_FILL_MODE ??
        'active_front'
    );
}

export function applyTopbarTerritoryModeShortcut(modeId: string): void {
    const panel = loadPanelSettings(panelDefaultsFromConfig());
    const configPatch: Record<string, unknown> = {
        TERRITORY_RENDER_MODE: modeId,
    };

    // Persisted-panel migration: pv_frontline belonged to the quarantined PVV4
    // runtime; a saved panel can still carry it, and no kept mode can play it.
    if (resolveActiveFillTransitionMode(panel) === 'pv_frontline') {
        configPatch.TERRITORY_FILL_TRANSITION_MODE = 'active_front';
    }

    setSettingsFromConfigPatch(panel, configPatch, savePanelSettings);

    bumpTerritoryVisualConfig();

    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('pax-settings-config-sync-requested', {
                detail: { source: 'territory-mode-shortcut', modeId },
            }),
        );
    }
}
