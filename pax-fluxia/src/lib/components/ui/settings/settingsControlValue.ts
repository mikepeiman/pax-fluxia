import type { SettingsControl } from "./settingsControlRegistry";

/**
 * Pure display↔storage transform for a registry control, extracted so the
 * scale round-trips are unit-testable (the renderer is a Svelte component the
 * human-eyes-only workflow can't verify directly).
 *
 * A control that STORES a 0–1 fraction but is SHOWN on a 0–100 slider sets
 * `scale: 100`. `toShown` maps stored→slider, `toStored` maps slider input back.
 */
export function toShown(control: SettingsControl, stored: number): number {
    return stored * (control.scale ?? 1);
}

export function toStored(control: SettingsControl, shown: number): number {
    return shown / (control.scale ?? 1);
}

/** The text the value field shows: `zeroLabel` at 0, else number + unit (the
 *  format prop on the range row still applies when no explicit output is given). */
export function displayOutput(control: SettingsControl, shown: number): string | undefined {
    if (control.zeroLabel !== undefined && shown === 0) return control.zeroLabel;
    if (control.unit) return `${shown}${control.unit}`;
    return undefined; // let the row's format/default render it
}
