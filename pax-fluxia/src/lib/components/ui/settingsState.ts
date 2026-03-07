import { GAME_CONFIG } from '$lib/config/game.config';
import { PANEL_CONFIG_MAP, type PanelConfigMapping } from './settingsDefs';

export interface SettingsSchemaEntry extends PanelConfigMapping {}

export const SETTINGS_SCHEMA: SettingsSchemaEntry[] = PANEL_CONFIG_MAP;

const SETTINGS_BY_PANEL_KEY = new Map(SETTINGS_SCHEMA.map((entry) => [entry.panelKey, entry] as const));

function applyMappedSetting(panelKey: string, value: unknown): void {
    const mapping = SETTINGS_BY_PANEL_KEY.get(panelKey);
    if (!mapping) {
        if ((import.meta as any).env?.DEV) {
            console.warn(`[settings] Missing mapping for panel key "${panelKey}"`);
        }
        return;
    }

    if (value === undefined) return;
    if (mapping.transform === 'inverse') {
        (GAME_CONFIG as any)[mapping.configKey] = 1 / (value as number);
    } else {
        (GAME_CONFIG as any)[mapping.configKey] = value;
    }
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
