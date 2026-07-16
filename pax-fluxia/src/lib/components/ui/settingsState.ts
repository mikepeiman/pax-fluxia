import { GAME_CONFIG } from '$lib/config/game.config';
import {
    RESOLVED_PANEL_CONFIG_MAP,
    isTerritoryVisualKey,
    type PanelConfigMapping,
} from './settingsDefs';
import { recordSettingWrite } from '$lib/config/settingsTelemetry';

export interface SettingsSchemaEntry extends PanelConfigMapping {}

/** Resolved panelKey for every config row (required for setSetting → GAME_CONFIG). */
export const SETTINGS_SCHEMA: SettingsSchemaEntry[] =
    RESOLVED_PANEL_CONFIG_MAP as SettingsSchemaEntry[];

const SETTINGS_BY_PANEL_KEY = new Map(
    RESOLVED_PANEL_CONFIG_MAP.map((entry) => [entry.panelKey, entry] as const),
);
const SETTINGS_BY_CONFIG_KEY = new Map(
    RESOLVED_PANEL_CONFIG_MAP.map((entry) => [entry.configKey, entry] as const),
);

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
    const appliedValue: unknown = value;
    (GAME_CONFIG as any)[mapping.configKey] = appliedValue;

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
        const panelValue = value;

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
        nextPanel[mapping.panelKey] = value;
    }
    persist(nextPanel);
    return nextPanel;
}

/**
 * Dev-only guard to catch territory config keys that do not have schema coverage.
 */
export function warnOnMissingTerritorySchemaCoverage(
    configSource: Record<string, unknown> = GAME_CONFIG as unknown as Record<string, unknown>,
): void {
    if (!(import.meta as any).env?.DEV) return;

    // Territory-key knowledge comes from settingsDefs, not a private prefix
    // list — this one had drifted out of sync with the ladder it mirrored
    // (it omitted METABALL_ and PERIMETER_FIELD_).
    const missing: string[] = [];

    for (const key of Object.keys(configSource)) {
        if (!isTerritoryVisualKey(key)) continue;
        if (!SETTINGS_BY_CONFIG_KEY.has(key)) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        console.warn(
            `[settings] Missing territory schema coverage for ${missing.length} keys: ${missing.sort().join(', ')}`,
        );
    }
}
