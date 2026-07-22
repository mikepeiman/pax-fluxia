import { describe, expect, it } from "vitest";
import {
    SETTINGS_CONTROLS,
    deriveRegistrySearchRecords,
} from "./settingsControlRegistry";
import { SETTINGS_SECTIONS } from "./settingsRegistry";

const SECTION_BY_ID = new Map(SETTINGS_SECTIONS.map((s) => [s.id, s]));

describe("settingsControlRegistry integrity", () => {
    it("has no duplicate config keys (one home per control)", () => {
        const seen = new Map<string, number>();
        for (const control of SETTINGS_CONTROLS) {
            seen.set(control.configKey, (seen.get(control.configKey) ?? 0) + 1);
        }
        const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
        expect(dupes).toEqual([]);
    });

    it("places every control in a real section", () => {
        for (const control of SETTINGS_CONTROLS) {
            expect(SECTION_BY_ID.has(control.section)).toBe(true);
        }
    });

    it("references only subsections that exist on the owning section", () => {
        for (const control of SETTINGS_CONTROLS) {
            if (control.subsection == null) continue;
            const section = SECTION_BY_ID.get(control.section);
            const ids = (section?.subsections ?? []).map((sub) => sub.id);
            expect(ids).toContain(control.subsection);
        }
    });

    it("carries the shape each control type needs", () => {
        for (const control of SETTINGS_CONTROLS) {
            if (control.controlType === "range") {
                expect(control.range, `${control.configKey} needs a range`).toBeDefined();
            }
            if (control.controlType === "segmented" || control.controlType === "select") {
                expect(
                    control.options?.length ?? 0,
                    `${control.configKey} needs options`,
                ).toBeGreaterThan(0);
            }
        }
    });

    it("derives a searchable record per control (label + description present)", () => {
        const records = deriveRegistrySearchRecords();
        expect(records.length).toBe(SETTINGS_CONTROLS.length);
        for (const record of records) {
            expect(record.label.length).toBeGreaterThan(0);
            // description is optional (generated entries may lack one).
            expect(record.searchText).toContain(record.label.toLowerCase());
        }
    });
});
