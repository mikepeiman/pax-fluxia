// UI-owned presentation preferences — reactive layer.
//
// Thin `$state` wrapper over the pure logic in `./uiPreferences`. Components
// import THIS module: read fields off `uiPreferences` (reactive) and mutate via
// `setUiPreference`. Hydration is idempotent and browser-guarded, so importing
// during SSR/tests is inert. All validation, storage shape, legacy adoption,
// and the protected-safe reset live in the pure module and are unit-tested there.

import {
  DEFAULT_UI_PREFERENCES,
  clearUiPreferenceStorage,
  normalizeUiPreferenceField,
  resolveUiPreferences,
  writeUiPreferences,
  type UiPreferences,
} from "./uiPreferences";

export type { DockSide, UiDensity, UiPreferences } from "./uiPreferences";
export {
  DEFAULT_UI_PREFERENCES,
  UI_PREFERENCE_BOUNDS,
  UI_PREFERENCE_STORAGE_KEY,
} from "./uiPreferences";

/** Reactive singleton. Starts at defaults; `hydrateUiPreferences()` fills it in. */
export const uiPreferences = $state<UiPreferences>({ ...DEFAULT_UI_PREFERENCES });

let hydrated = false;

function getStorage(): Storage | null {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

/**
 * Load persisted preferences into the reactive store. Idempotent: safe to call
 * from multiple mount points; only the first call touches storage.
 */
export function hydrateUiPreferences(): void {
  if (hydrated) return;
  hydrated = true;
  const storage = getStorage();
  if (!storage) return;
  Object.assign(uiPreferences, resolveUiPreferences(storage));
}

function persist(): void {
  const storage = getStorage();
  if (storage) writeUiPreferences(storage, { ...uiPreferences });
}

/** Set one preference (validated) and persist the whole blob. */
export function setUiPreference<K extends keyof Omit<UiPreferences, "version">>(
  key: K,
  value: UiPreferences[K],
): void {
  const next = normalizeUiPreferenceField(key, value);
  if (uiPreferences[key] === next) return;
  uiPreferences[key] = next;
  persist();
}

/** Toggle a boolean preference (validated) and persist. */
export function toggleUiPreference(
  key: {
    [K in keyof UiPreferences]: UiPreferences[K] extends boolean ? K : never;
  }[keyof UiPreferences],
): void {
  setUiPreference(key, !uiPreferences[key]);
}

/**
 * Reset ONLY UI preferences to defaults and clear the namespace from storage.
 * Protected content (saved maps/games, gameplay presets, map-editor data) and
 * every other key are untouched.
 */
export function resetUiPreferences(): void {
  const storage = getStorage();
  if (storage) clearUiPreferenceStorage(storage);
  Object.assign(uiPreferences, DEFAULT_UI_PREFERENCES);
}
