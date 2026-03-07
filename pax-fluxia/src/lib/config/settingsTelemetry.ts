export interface SettingWriteTelemetry {
    panelKey: string;
    configKey: string | null;
    inputValue: unknown;
    panelValue: unknown;
    appliedValue: unknown;
    atMs: number;
}

const latestByPanelKey = new Map<string, SettingWriteTelemetry>();

export function recordSettingWrite(entry: SettingWriteTelemetry): void {
    latestByPanelKey.set(entry.panelKey, entry);
}

export function getSettingWrite(panelKey: string): SettingWriteTelemetry | null {
    return latestByPanelKey.get(panelKey) ?? null;
}

export function getSettingWrites(panelKeys: string[]): Record<string, SettingWriteTelemetry | null> {
    const out: Record<string, SettingWriteTelemetry | null> = {};
    for (const key of panelKeys) {
        out[key] = latestByPanelKey.get(key) ?? null;
    }
    return out;
}

export function clearSettingWrites(): void {
    latestByPanelKey.clear();
}
