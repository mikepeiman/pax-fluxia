/**
 * Per-category presets must be presets FOR that category.
 *
 * The bug this guards: `getBuiltinCategoryPresets` used to slice every built-in
 * FULL theme per category, so every category's dropdown listed the same
 * whole-game theme names — Travel presets, Audio presets and Combat presets were
 * identical lists of things that were not category presets at all.
 */

import { describe, expect, it } from "vitest";
import { getBuiltinCategoryPresets, getBuiltinThemes } from "./builtinThemes";
import { CATEGORY_KEYS, type ThemeCategory } from "./categoryKeys";

const CATEGORIES = Object.keys(CATEGORY_KEYS) as ThemeCategory[];

describe("built-in category presets", () => {
    it("covers every theme category", () => {
        expect(CATEGORIES.length).toBeGreaterThan(5);
    });

    it("never offers a full theme as a category preset", () => {
        const fullThemeNames = new Set(getBuiltinThemes().map((theme) => theme.name));
        expect(fullThemeNames.size).toBeGreaterThan(10); // the fixture is real

        const leaked: string[] = [];
        for (const category of CATEGORIES) {
            for (const preset of getBuiltinCategoryPresets(category)) {
                if (fullThemeNames.has(preset.name)) leaked.push(`${category}: ${preset.name}`);
            }
        }
        expect(
            leaked,
            `full themes showing up as category presets:\n${leaked.join("\n")}`,
        ).toEqual([]);
    });

    // (A "the lists differ per category" check was tried and dropped: it passed
    // against the buggy implementation, because different categories happened to
    // have different subsets of themes with non-empty values. A guard that does
    // not fail on the bug it names is worse than no guard.)

    it("only carries keys that belong to its own category", () => {
        const foreign: string[] = [];
        for (const category of CATEGORIES) {
            const owned = new Set(CATEGORY_KEYS[category]);
            for (const preset of getBuiltinCategoryPresets(category)) {
                for (const key of Object.keys(preset.values)) {
                    if (!owned.has(key)) foreign.push(`${category}/${preset.name}: ${key}`);
                }
            }
        }
        expect(
            foreign,
            `category presets carrying keys from other categories:\n${foreign.join("\n")}`,
        ).toEqual([]);
    });

    it("reports each preset under the category it was filed in", () => {
        for (const category of CATEGORIES) {
            for (const preset of getBuiltinCategoryPresets(category)) {
                expect(preset.category).toBe(category);
                expect(preset.name.trim().length).toBeGreaterThan(0);
            }
        }
    });
});
