import { describe, it, expect } from "vitest";
import { DEFAULT_GAME_CONFIG } from "$lib/config/game.config";
import { CATEGORY_KEYS, EXCLUDED_FROM_CATEGORIES } from "$lib/config/categoryKeys";

// Enforces that CATEGORY_KEYS is a complete, non-overlapping partition of every
// GAME_CONFIG key: each key is in exactly ONE category, or explicitly excluded.
// This is the guard that keeps per-category presets from silently losing a
// third of config again (the 2026-07-19 "not saving 99% of settings" bug).

const ALL_CONFIG_KEYS = Object.keys(DEFAULT_GAME_CONFIG);
const ALL_CATEGORY_KEYS = Object.values(CATEGORY_KEYS).flat();

describe("CATEGORY_KEYS is a complete, non-overlapping partition of GAME_CONFIG", () => {
  it("lists no key in more than one category", () => {
    const seen = new Map<string, number>();
    for (const key of ALL_CATEGORY_KEYS) {
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    expect(duplicates, `keys in multiple categories: ${duplicates.join(", ")}`).toEqual([]);
  });

  it("covers every GAME_CONFIG key (in a category or explicitly excluded)", () => {
    const covered = new Set([...ALL_CATEGORY_KEYS, ...EXCLUDED_FROM_CATEGORIES]);
    const uncovered = ALL_CONFIG_KEYS.filter((k) => !covered.has(k));
    expect(
      uncovered,
      `GAME_CONFIG keys in no category and not excluded (add to a category in ` +
        `categoryThemes.ts CATEGORY_KEYS, or to EXCLUDED_FROM_CATEGORIES): ` +
        `${uncovered.join(", ")}`,
    ).toEqual([]);
  });

  it("references no stale keys (every listed/excluded key exists in GAME_CONFIG)", () => {
    const live = new Set(ALL_CONFIG_KEYS);
    const stale = [...ALL_CATEGORY_KEYS, ...EXCLUDED_FROM_CATEGORIES].filter((k) => !live.has(k));
    expect(stale, `keys listed but absent from GAME_CONFIG: ${stale.join(", ")}`).toEqual([]);
  });

  it("captures the topology tuning keys under the territory category", () => {
    const territory = new Set(CATEGORY_KEYS.territory);
    for (const key of [
      "CHAIKIN_BOUNDARY_PAD",
      "TERRITORY_CX_COUNT",
      "TERRITORY_CX_CONTEST_PAIR_COUNT",
      "MODIFIED_VORONOI_STAR_MARGIN",
      "TERRITORY_MSR_STAR_BIAS",
    ]) {
      expect(territory.has(key), `${key} should be in the territory category`).toBe(true);
    }
  });
});
