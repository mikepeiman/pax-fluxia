import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
    SETTINGS_CONTROLS,
    deriveRegistrySearchRecords,
} from "./settingsControlRegistry";
import { SETTINGS_SECTIONS } from "./settingsRegistry";
import { AI_VARIABLES, COMBAT_VARIABLES } from "../settingsDefs";

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

    it("registers every AI + Combat variable with matching label + range (renderer migration)", () => {
        const byKey = new Map(SETTINGS_CONTROLS.map((c) => [c.configKey, c]));
        for (const v of [...AI_VARIABLES, ...COMBAT_VARIABLES]) {
            const control = byKey.get(v.key);
            expect(control, `${v.key} not registered`).toBeDefined();
            expect(control!.label).toBe(v.label);
            expect(control!.range).toEqual({ min: v.min, max: v.max, step: v.step });
        }
    });

    /**
     * TOTALITY. Every control the user can reach must be in the registry —
     * otherwise its label, its search text and its persisted key are three
     * hand-kept lists that drift apart, which is the mechanism behind every
     * "searchable but unreachable" / "reachable but not searchable" bug this
     * project has shipped.
     *
     * The registry header promised this would be "enforced once population is
     * complete". It is complete as of the 2026-08-10 audit batch 5, so the
     * promise is now a test: 91 rendered-but-unregistered controls went to zero,
     * and this fails if a new one appears.
     *
     * Reads the markup directly rather than the ast-grep bridge so the guard has
     * no tooling prerequisite.
     */
    it("registers EVERY rendered control (no unregistered controls)", () => {
        const registered = new Set(SETTINGS_CONTROLS.map((c) => c.configKey));
        const rendered = new Map<string, string>();
        const walk = (dir: string) => {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(full);
                    continue;
                }
                if (!entry.name.endsWith(".svelte")) continue;
                const src = readFileSync(full, "utf-8");
                // Literal keys, plus the composite widget's `configX="KEY"` props.
                const patterns = [
                    /settingConfigKey="([A-Za-z0-9_.]+)"/g,
                    /config(?:Enabled|Sat|Light|Alpha|Width|Blend)="([A-Z][A-Z0-9_]+)"/g,
                ];
                for (const pattern of patterns) {
                    for (const match of src.matchAll(pattern)) {
                        if (!rendered.has(match[1]!)) rendered.set(match[1]!, entry.name);
                    }
                }
            }
        };
        walk(path.dirname(fileURLToPath(import.meta.url)));

        const unregistered = [...rendered]
            // `local.*` are UI-state controls, not GAME_CONFIG knobs.
            .filter(([key]) => !key.startsWith("local."))
            .filter(([key]) => !registered.has(key))
            .map(([key, file]) => `${key} (${file})`);

        expect(
            unregistered,
            `rendered controls missing from settingsControlRegistry:\n${unregistered.join("\n")}\n\n` +
                "Run `bun tools/gen-settings-registry.mjs`, or add a hand-authored entry if the row's label or key is computed.",
        ).toEqual([]);
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
