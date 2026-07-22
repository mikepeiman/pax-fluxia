import { describe, it, expect } from "vitest";
import { toShown, toStored, displayOutput } from "./settingsControlValue";
import type { SettingsControl } from "./settingsControlRegistry";

const ctrl = (over: Partial<SettingsControl>): SettingsControl => ({
    configKey: "X",
    section: "economy",
    subsection: null,
    label: "X",
    controlType: "range",
    ...over,
});

describe("settings control value transforms", () => {
    it("scale maps stored↔shown and round-trips (percent slider over a 0–1 config)", () => {
        const c = ctrl({ scale: 100 });
        expect(toShown(c, 0.1)).toBeCloseTo(10);
        expect(toStored(c, 50)).toBeCloseTo(0.5);
        expect(toStored(c, toShown(c, 0.1))).toBeCloseTo(0.1);
    });

    it("no scale is identity", () => {
        const c = ctrl({});
        expect(toShown(c, 5)).toBe(5);
        expect(toStored(c, 5)).toBe(5);
    });

    it("displayOutput: zeroLabel at 0, unit suffix, else undefined (format takes over)", () => {
        expect(displayOutput(ctrl({ zeroLabel: "unlimited" }), 0)).toBe("unlimited");
        expect(displayOutput(ctrl({ zeroLabel: "unlimited" }), 5)).toBeUndefined();
        expect(displayOutput(ctrl({ unit: "px" }), 3)).toBe("3px");
        expect(displayOutput(ctrl({}), 3)).toBeUndefined();
    });
});
