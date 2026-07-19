import { describe, it, expect } from "vitest";
import {
  DEFAULT_UI_PREFERENCES,
  UI_PREFERENCE_STORAGE_KEY,
  adoptLegacyUiPreferences,
  clearUiPreferenceStorage,
  normalizeUiPreferences,
  readUiPreferences,
  resolveUiPreferences,
  writeUiPreferences,
} from "./uiPreferences";

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

describe("normalizeUiPreferences — every field falls back on garbage", () => {
  it("returns defaults for an empty/absent blob", () => {
    expect(normalizeUiPreferences(undefined)).toEqual(DEFAULT_UI_PREFERENCES);
    expect(normalizeUiPreferences({})).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it("keeps valid fields and repairs invalid ones individually", () => {
    const result = normalizeUiPreferences({
      showStarInfo: true, // valid
      sidebarSide: "sideways", // invalid -> default "right"
      controlsSide: "left", // valid
      sidebarWidth: 99999, // out of range -> clamped to max 600
      settingsPanelWidth: "not-a-number", // invalid -> default 520
      leaderboardCollapsed: "yes", // wrong type -> default false
      density: "compact", // valid
      version: 999, // ignored -> current schema version
    });
    expect(result.showStarInfo).toBe(true);
    expect(result.sidebarSide).toBe("right");
    expect(result.controlsSide).toBe("left");
    expect(result.sidebarWidth).toBe(600);
    expect(result.settingsPanelWidth).toBe(520);
    expect(result.leaderboardCollapsed).toBe(false);
    expect(result.density).toBe("compact");
    expect(result.version).toBe(DEFAULT_UI_PREFERENCES.version);
  });

  it("clamps widths to their bounds", () => {
    expect(normalizeUiPreferences({ sidebarWidth: 10 }).sidebarWidth).toBe(340);
    expect(normalizeUiPreferences({ settingsPanelWidth: 10000 }).settingsPanelWidth).toBe(720);
  });
});

describe("round-trip persistence", () => {
  it("writes then reads back an equal blob", () => {
    const storage = createStorage();
    const prefs = {
      ...DEFAULT_UI_PREFERENCES,
      showStarInfo: true,
      sidebarSide: "left" as const,
      sidebarWidth: 512,
    };
    writeUiPreferences(storage, prefs);
    expect(readUiPreferences(storage)).toEqual(prefs);
  });

  it("reads null when the namespace is absent", () => {
    expect(readUiPreferences(createStorage())).toBeNull();
  });

  it("treats a corrupt blob as absent (never wedges the UI)", () => {
    const storage = createStorage({ [UI_PREFERENCE_STORAGE_KEY]: "{ not json" });
    expect(readUiPreferences(storage)).toBeNull();
  });
});

describe("legacy adoption (first-run migration)", () => {
  it("adopts existing per-key values", () => {
    const storage = createStorage({
      "pax-show-star-info": "true",
      "pax-pause-on-settings": "false",
      "pax-sidebar-side": "left",
      "pax-controls-side": "right",
      "pax-leaderboard-collapsed": "true",
      "pax-settings-ribbon-expanded": "false",
      "pax-sidebar-width": "555",
      "pax-settings-panel-width": "700",
    });
    const adopted = adoptLegacyUiPreferences(storage);
    expect(adopted.showStarInfo).toBe(true);
    expect(adopted.pauseOnSettings).toBe(false);
    expect(adopted.sidebarSide).toBe("left");
    expect(adopted.controlsSide).toBe("right");
    expect(adopted.leaderboardCollapsed).toBe(true);
    expect(adopted.settingsRibbonExpanded).toBe(false);
    expect(adopted.sidebarWidth).toBe(555);
    expect(adopted.settingsPanelWidth).toBe(700);
  });

  it("keeps defaults for absent legacy keys (pauseOnSettings defaults ON)", () => {
    const adopted = adoptLegacyUiPreferences(createStorage());
    expect(adopted).toEqual(DEFAULT_UI_PREFERENCES);
    expect(adopted.pauseOnSettings).toBe(true);
    expect(adopted.settingsRibbonExpanded).toBe(true);
  });

  it("resolveUiPreferences adopts legacy once, then persists the namespace and does NOT delete legacy keys", () => {
    const storage = createStorage({ "pax-sidebar-width": "480" });
    const resolved = resolveUiPreferences(storage);
    expect(resolved.sidebarWidth).toBe(480);
    // Namespace now written…
    expect(readUiPreferences(storage)?.sidebarWidth).toBe(480);
    // …and legacy key left in place (additive migration = safe rollback).
    expect(storage.getItem("pax-sidebar-width")).toBe("480");
  });

  it("resolveUiPreferences prefers the namespace over legacy keys on later loads", () => {
    const storage = createStorage({
      [UI_PREFERENCE_STORAGE_KEY]: JSON.stringify({
        ...DEFAULT_UI_PREFERENCES,
        sidebarWidth: 500,
      }),
      "pax-sidebar-width": "340", // stale legacy — must be ignored
    });
    expect(resolveUiPreferences(storage).sidebarWidth).toBe(500);
  });
});

describe("clearUiPreferenceStorage — protected persistence is sacred", () => {
  const PROTECTED = {
    pax_savedMaps: '{"map":"exact bytes"}',
    pax_savedGames: '{"game":"exact bytes"}',
    "pax-game-themes": '[{"name":"user preset"}]',
    pax_composedThemes: '[{"name":"composed"}]',
    pax_categoryThemes_visuals: '[{"name":"category"}]',
    pax_starredThemes_visuals: '["category"]',
    pax_themePresets: '[{"name":"legacy preset"}]',
    "pax-map-editor-autosaves-v1": '[{"revision":1}]',
    pax_defaultMap: '{"name":"default"}',
  };

  it("removes only the UI namespace and leaves every protected key byte-for-byte", () => {
    const storage = createStorage({
      ...PROTECTED,
      [UI_PREFERENCE_STORAGE_KEY]: JSON.stringify(DEFAULT_UI_PREFERENCES),
      // legacy UI + unrelated keys must also be untouched by the targeted reset
      "pax-sidebar-width": "555",
      unrelated_app_key: "untouched",
    });

    clearUiPreferenceStorage(storage);

    expect(storage.getItem(UI_PREFERENCE_STORAGE_KEY)).toBeNull();
    for (const [key, value] of Object.entries(PROTECTED)) {
      expect(storage.getItem(key), key).toBe(value);
    }
    expect(storage.getItem("pax-sidebar-width")).toBe("555");
    expect(storage.getItem("unrelated_app_key")).toBe("untouched");
  });
});
