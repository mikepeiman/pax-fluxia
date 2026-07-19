// UI-owned presentation preferences — pure logic (no Svelte runes).
//
// This module is the single owner of the HUD/settings *presentation* state that
// GameContainer used to scatter across ~9 direct `localStorage` keys. It is
// deliberately rune-free so it runs under `bun test` (Bun's native runner does
// not apply the Svelte compiler). The reactive `$state` layer lives in the
// sibling `uiPreferences.svelte.ts`, which is the only thing components import.
//
// Contract:
//   - ONE namespaced storage key (`UI_PREFERENCE_STORAGE_KEY`), versioned.
//   - Every read normalizes field-by-field, falling back to a default on any
//     invalid/missing value (a corrupt blob can never wedge the UI).
//   - `clearUiPreferenceStorage` removes ONLY this namespace. It never touches
//     protected content (saved maps/games, gameplay presets, map-editor data)
//     or any other key. Protected persistence is sacred — see the cutover plan.
//   - First-run adoption reads the legacy per-key values so existing users keep
//     their layout; legacy keys are left in place (additive migration = safe
//     rollback), and the namespace becomes the source of truth going forward.

export type DockSide = "left" | "right";
export type UiDensity = "comfortable" | "compact";

export interface UiPreferences {
  version: number;
  /** Star Inspector panel visibility (click a star to inspect). */
  showStarInfo: boolean;
  /** Pause the game while the settings panel is open. */
  pauseOnSettings: boolean;
  /** Settings ribbon/panel open state (desktop persists last-known). */
  settingsOpen: boolean;
  /** Which side the tactical/standings rail docks. */
  sidebarSide: DockSide;
  /** Which side the speed/quick-tools controls dock. */
  controlsSide: DockSide;
  /** Player standings collapsed into the topbar chip. */
  leaderboardCollapsed: boolean;
  /** Settings ribbon expanded (labels) vs compact (icons only). */
  settingsRibbonExpanded: boolean;
  /** Resizable tactical rail width, px. */
  sidebarWidth: number;
  /** Resizable settings panel width, px. */
  settingsPanelWidth: number;
  /** Interface density (forward-looking; wired by later HUD/settings slices). */
  density: UiDensity;
  /** Honor prefers-reduced-motion override (forward-looking). */
  reducedMotion: boolean;
}

export const UI_PREFERENCE_SCHEMA_VERSION = 1;
export const UI_PREFERENCE_STORAGE_KEY = "pax-ui-prefs-v1";

/** Interaction bounds for the two resizable widths (validation authority). */
export const UI_PREFERENCE_BOUNDS = {
  sidebarWidth: { min: 340, max: 600, default: 390 },
  settingsPanelWidth: { min: 420, max: 720, default: 520 },
} as const;

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  version: UI_PREFERENCE_SCHEMA_VERSION,
  showStarInfo: false,
  pauseOnSettings: true,
  settingsOpen: true,
  sidebarSide: "right",
  controlsSide: "left",
  leaderboardCollapsed: false,
  settingsRibbonExpanded: true,
  sidebarWidth: UI_PREFERENCE_BOUNDS.sidebarWidth.default,
  settingsPanelWidth: UI_PREFERENCE_BOUNDS.settingsPanelWidth.default,
  density: "comfortable",
  reducedMotion: false,
};

/**
 * Legacy per-key mapping used for one-time first-run adoption. Each entry knows
 * how to parse the old string value into the typed field. Keys are read but not
 * removed (additive migration keeps rollback safe).
 */
export const LEGACY_UI_PREFERENCE_KEYS = {
  "pax-show-star-info": "showStarInfo",
  "pax-pause-on-settings": "pauseOnSettings",
  "pax-settings-open": "settingsOpen",
  "pax-sidebar-side": "sidebarSide",
  "pax-controls-side": "controlsSide",
  "pax-leaderboard-collapsed": "leaderboardCollapsed",
  "pax-settings-ribbon-expanded": "settingsRibbonExpanded",
  "pax-sidebar-width": "sidebarWidth",
  "pax-settings-panel-width": "settingsPanelWidth",
} as const satisfies Record<string, keyof UiPreferences>;

function clampWidth(
  value: unknown,
  bounds: { min: number; max: number; default: number },
): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return bounds.default;
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(n)));
}

function coerceDockSide(value: unknown, fallback: DockSide): DockSide {
  return value === "left" || value === "right" ? value : fallback;
}

function coerceBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function coerceDensity(value: unknown, fallback: UiDensity): UiDensity {
  return value === "comfortable" || value === "compact" ? value : fallback;
}

/** Validate one field in isolation (used by both hydrate and per-field setters). */
export function normalizeUiPreferenceField<K extends keyof UiPreferences>(
  key: K,
  value: unknown,
): UiPreferences[K] {
  const d = DEFAULT_UI_PREFERENCES;
  switch (key) {
    case "showStarInfo":
    case "pauseOnSettings":
    case "settingsOpen":
    case "leaderboardCollapsed":
    case "settingsRibbonExpanded":
    case "reducedMotion":
      return coerceBool(value, d[key] as boolean) as UiPreferences[K];
    case "sidebarSide":
      return coerceDockSide(value, d.sidebarSide) as UiPreferences[K];
    case "controlsSide":
      return coerceDockSide(value, d.controlsSide) as UiPreferences[K];
    case "sidebarWidth":
      return clampWidth(value, UI_PREFERENCE_BOUNDS.sidebarWidth) as UiPreferences[K];
    case "settingsPanelWidth":
      return clampWidth(value, UI_PREFERENCE_BOUNDS.settingsPanelWidth) as UiPreferences[K];
    case "density":
      return coerceDensity(value, d.density) as UiPreferences[K];
    case "version":
      return UI_PREFERENCE_SCHEMA_VERSION as UiPreferences[K];
    default:
      return d[key];
  }
}

/**
 * Normalize an arbitrary parsed blob into a complete, valid `UiPreferences`.
 * Any missing or malformed field falls back to its default. Always returns the
 * current schema version regardless of the stored one (fields are validated
 * individually, so an older blob upgrades in place).
 */
export function normalizeUiPreferences(raw: unknown): UiPreferences {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_UI_PREFERENCES };
  for (const key of Object.keys(DEFAULT_UI_PREFERENCES) as Array<keyof UiPreferences>) {
    if (key === "version") continue;
    (out[key] as UiPreferences[typeof key]) = normalizeUiPreferenceField(
      key,
      source[key],
    );
  }
  return out;
}

/** Read + normalize the namespaced blob. Returns `null` when absent. */
export function readUiPreferences(storage: Storage): UiPreferences | null {
  const raw = storage.getItem(UI_PREFERENCE_STORAGE_KEY);
  if (raw == null) return null;
  try {
    return normalizeUiPreferences(JSON.parse(raw));
  } catch {
    // Corrupt JSON — treat as absent so callers fall back to defaults/adoption.
    return null;
  }
}

/** Persist the full, normalized blob under the single namespace key. */
export function writeUiPreferences(storage: Storage, prefs: UiPreferences): void {
  storage.setItem(UI_PREFERENCE_STORAGE_KEY, JSON.stringify(prefs));
}

/**
 * Build a `UiPreferences` from the legacy per-key values (first-run adoption).
 * Absent legacy keys keep their default. Legacy keys are NOT removed.
 */
export function adoptLegacyUiPreferences(storage: Storage): UiPreferences {
  const out = { ...DEFAULT_UI_PREFERENCES };
  for (const [legacyKey, field] of Object.entries(LEGACY_UI_PREFERENCE_KEYS) as Array<
    [string, keyof UiPreferences]
  >) {
    const raw = storage.getItem(legacyKey);
    if (raw == null) continue;
    switch (field) {
      case "pauseOnSettings":
        // Legacy semantics: ON unless the value is explicitly "false".
        out.pauseOnSettings = raw !== "false";
        break;
      case "sidebarSide":
        out.sidebarSide = coerceDockSide(raw, out.sidebarSide);
        break;
      case "controlsSide":
        out.controlsSide = coerceDockSide(raw, out.controlsSide);
        break;
      case "sidebarWidth":
        out.sidebarWidth = clampWidth(raw, UI_PREFERENCE_BOUNDS.sidebarWidth);
        break;
      case "settingsPanelWidth":
        out.settingsPanelWidth = clampWidth(raw, UI_PREFERENCE_BOUNDS.settingsPanelWidth);
        break;
      default:
        // Remaining fields are booleans persisted as "true"/"false".
        (out[field] as boolean) = raw === "true";
        break;
    }
  }
  return out;
}

/**
 * Resolve preferences for a fresh session: prefer the namespaced blob, else
 * adopt from legacy keys and persist the consolidated result so subsequent
 * loads read the single source of truth.
 */
export function resolveUiPreferences(storage: Storage): UiPreferences {
  const existing = readUiPreferences(storage);
  if (existing) return existing;
  const adopted = adoptLegacyUiPreferences(storage);
  writeUiPreferences(storage, adopted);
  return adopted;
}

/**
 * Clear ONLY the UI-preference namespace. Never touches protected content or
 * any other key. This is the targeted reset authorized by the cutover plan.
 */
export function clearUiPreferenceStorage(storage: Storage): void {
  storage.removeItem(UI_PREFERENCE_STORAGE_KEY);
}
