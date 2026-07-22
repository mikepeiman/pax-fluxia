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

/**
 * The text the value field shows. Precedence: `zeroLabel` at 0 →
 * percent-of-fraction → a unit suffix combined with the format's number →
 * undefined (let the range row's own `format` render it).
 */
export function displayOutput(control: SettingsControl, shown: number): string | undefined {
    if (control.zeroLabel !== undefined && shown === 0) return control.zeroLabel;
    const { format, unit } = control;
    if (format === "percentOfFraction") return `${Math.round(shown * 100)}%`;
    if (unit) {
        const n =
            format === "multiplier"
                ? `${shown.toFixed(2)}x`
                : format === "fixed2"
                  ? shown.toFixed(2)
                  : format === "fixed1"
                    ? shown.toFixed(1)
                    : String(shown);
        return `${n}${unit}`;
    }
    return undefined;
}
