import { describe, it, expect } from "vitest";
import {
  FULL_CONFIG_PRESET_STORAGE_KEY,
  deleteFullConfigPreset,
  getFullConfigPreset,
  importFullConfigPreset,
  listFullConfigPresets,
  parseFullConfigPreset,
  saveFullConfigPreset,
  snapshotFullConfig,
} from "./fullConfigPresets";

function createStorage(entries: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(entries));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

describe("snapshotFullConfig", () => {
  it("captures the whole tunable config (many keys) and skips internal _ keys", () => {
    const snap = snapshotFullConfig();
    const keys = Object.keys(snap);
    expect(keys.length).toBeGreaterThan(300);
    expect(keys.some((k) => k.startsWith("_"))).toBe(false);
    // spans multiple domains, not just one category
    expect(snap).toHaveProperty("AI_MUST_ATTACK_RATIO");
    expect(snap).toHaveProperty("TERRITORY_CX_COUNT");
    expect(snap).toHaveProperty("FRONTIER_RESOLUTION");
    expect(snap).toHaveProperty("BASE_TICK_MS");
  });
});

describe("parseFullConfigPreset", () => {
  it("accepts a valid preset object", () => {
    const p = parseFullConfigPreset({ name: "Mine", values: { BASE_TICK_MS: 500 }, full: true });
    expect(p).toMatchObject({ name: "Mine", values: { BASE_TICK_MS: 500 }, full: true });
  });
  it("rejects missing name/values, arrays, and primitives", () => {
    expect(parseFullConfigPreset({ values: {} })).toBeNull();
    expect(parseFullConfigPreset({ name: "x" })).toBeNull();
    expect(parseFullConfigPreset({ name: "x", values: [1, 2] })).toBeNull();
    expect(parseFullConfigPreset("nope")).toBeNull();
    expect(parseFullConfigPreset(null)).toBeNull();
  });
});

describe("save/list/get/delete round-trip", () => {
  it("saves the current config under a name and reads it back", () => {
    const storage = createStorage();
    const saved = saveFullConfigPreset("Session A", storage);
    expect(saved.name).toBe("Session A");
    expect(Object.keys(saved.values).length).toBeGreaterThan(300);

    const list = listFullConfigPresets(storage);
    expect(list.map((p) => p.name)).toEqual(["Session A"]);
    expect(getFullConfigPreset("Session A", storage)?.values).toEqual(saved.values);
  });

  it("overwrites a same-name preset and keeps newest first", () => {
    const storage = createStorage();
    saveFullConfigPreset("A", storage);
    saveFullConfigPreset("B", storage);
    saveFullConfigPreset("A", storage); // overwrite -> moves to front
    expect(listFullConfigPresets(storage).map((p) => p.name)).toEqual(["A", "B"]);
  });

  it("deletes by name", () => {
    const storage = createStorage();
    saveFullConfigPreset("A", storage);
    saveFullConfigPreset("B", storage);
    deleteFullConfigPreset("A", storage);
    expect(listFullConfigPresets(storage).map((p) => p.name)).toEqual(["B"]);
  });

  it("imports a valid preset and ignores a corrupt store", () => {
    const storage = createStorage({ [FULL_CONFIG_PRESET_STORAGE_KEY]: "{ not json" });
    expect(listFullConfigPresets(storage)).toEqual([]);
    const imported = importFullConfigPreset({ name: "Imp", values: { LETHALITY: 0.5 } }, storage);
    expect(imported?.name).toBe("Imp");
    expect(listFullConfigPresets(storage).map((p) => p.name)).toEqual(["Imp"]);
  });
});
