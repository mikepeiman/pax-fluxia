import { GAME_CONFIG } from '$lib/config/game.config';
import { PANEL_CONFIG_MAP, type PanelConfigMapping } from './settingsDefs';
import { recordSettingWrite } from '$lib/config/settingsTelemetry';

export interface SettingsSchemaEntry extends PanelConfigMapping {}

export const SETTINGS_SCHEMA: SettingsSchemaEntry[] = PANEL_CONFIG_MAP;

const SETTINGS_BY_PANEL_KEY = new Map(SETTINGS_SCHEMA.map((entry) => [entry.panelKey, entry] as const));
const SETTINGS_BY_CONFIG_KEY = new Map(SETTINGS_SCHEMA.map((entry) => [entry.configKey, entry] as const));

function applyMappedSetting(panelKey: string, value: unknown): void {
    const mapping = SETTINGS_BY_PANEL_KEY.get(panelKey);
    if (!mapping) {
        if ((import.meta as any).env?.DEV) {
            console.warn(`[settings] Missing mapping for panel key "${panelKey}"`);
        }
        recordSettingWrite({
            panelKey,
            configKey: null,
            inputValue: value,
            panelValue: value,
            appliedValue: null,
            atMs: performance.now(),
        });
        return;
    }

    if (value === undefined) return;
    let appliedValue: unknown;
    if (mapping.transform === 'inverse') {
        appliedValue = 1 / (value as number);
        (GAME_CONFIG as any)[mapping.configKey] = appliedValue;
    } else {
        appliedValue = value;
        (GAME_CONFIG as any)[mapping.configKey] = appliedValue;
    }

    recordSettingWrite({
        panelKey,
        configKey: mapping.configKey,
        inputValue: value,
        panelValue: value,
        appliedValue,
        atMs: performance.now(),
    });
}

export function setSetting(
    currentPanel: Record<string, any>,
    panelKey: string,
    value: unknown,
    persist: (panel: Record<string, any>) => void,
): Record<string, any> {
    const nextPanel = { ...currentPanel, [panelKey]: value };
    applyMappedSetting(panelKey, value);
    persist(nextPanel);
    return nextPanel;
}

export function setManySettings(
    currentPanel: Record<string, any>,
    patch: Record<string, unknown>,
    persist: (panel: Record<string, any>) => void,
): Record<string, any> {
    const nextPanel = { ...currentPanel };
    for (const [key, value] of Object.entries(patch)) {
        nextPanel[key] = value;
        applyMappedSetting(key, value);
    }
    persist(nextPanel);
    return nextPanel;
}
export function setSettingsFromConfigPatch(
    currentPanel: Record<string, any>,
    configPatch: Record<string, unknown>,
    persist: (panel: Record<string, any>) => void,
): Record<string, any> {
    const nextPanel = { ...currentPanel };
    for (const [configKey, value] of Object.entries(configPatch)) {
        if (value === undefined) continue;
        (GAME_CONFIG as any)[configKey] = value;

        const mapping = SETTINGS_BY_CONFIG_KEY.get(configKey);
        const panelKey = mapping?.panelKey ?? `config:${configKey}`;
        const panelValue =
            mapping?.transform === 'inverse' ? 1 / (value as number) : value;

        if (mapping) {
            nextPanel[mapping.panelKey] = panelValue;
        }

        recordSettingWrite({
            panelKey,
            configKey,
            inputValue: value,
            panelValue,
            appliedValue: value,
            atMs: performance.now(),
        });
    }
    persist(nextPanel);
    return nextPanel;
}

/**
 * Read-only config->panel sync used by initialization and reload paths.
 * Unlike setSettingsFromConfigPatch, this does not mutate GAME_CONFIG.
 */
export function syncPanelFromConfigPatch(
    currentPanel: Record<string, any>,
    configPatch: Record<string, unknown>,
    persist: (panel: Record<string, any>) => void,
): Record<string, any> {
    const nextPanel = { ...currentPanel };
    for (const [configKey, value] of Object.entries(configPatch)) {
        if (value === undefined) continue;
        const mapping = SETTINGS_BY_CONFIG_KEY.get(configKey);
        if (!mapping) continue;
        const panelValue =
            mapping.transform === 'inverse' ? 1 / (value as number) : value;
        nextPanel[mapping.panelKey] = panelValue;
    }
    persist(nextPanel);
    return nextPanel;
}
