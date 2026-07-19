// ============================================================================
// Full-config presets — save/restore the ENTIRE tunable config as one named
// preset. This is the "save my whole tuning session" feature the per-category
// preset bars could not provide (each only captured one category's keys).
// ============================================================================
//
// Unlike CategoryPresets, a full preset snapshots every tunable GAME_CONFIG key
// (all categories at once). Internal/derived keys (underscore-prefixed computed
// map geometry) are skipped — they are recomputed per map, never user-set.
//
// Storage: `pax_fullConfigPresets` (protected content — survives settings reset;
// see configTransfer.isProtectedContentStorageKey). The apply/load path is owned
// by the UI (ConfigTransferPanel) via settingsStore.applyPatch, so this module
// stays a pure, injectable data layer.

import { GAME_CONFIG } from "$lib/config/game.config";

export interface FullConfigPreset {
  name: string;
  values: Record<string, unknown>;
  createdAt: string;
  /** Discriminates a full-config preset from a per-category preset in files. */
  full: true;
}

export const FULL_CONFIG_PRESET_STORAGE_KEY = "pax_fullConfigPresets";

function getStorage(explicit?: Storage): Storage | null {
  if (explicit) return explicit;
  return typeof localStorage !== "undefined" ? localStorage : null;
}

/** Snapshot every tunable GAME_CONFIG key (skips internal `_`-prefixed derived keys). */
export function snapshotFullConfig(): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  const cfg = GAME_CONFIG as unknown as Record<string, unknown>;
  for (const key of Object.keys(cfg)) {
    if (key.startsWith("_")) continue;
    snap[key] = cfg[key];
  }
  return snap;
}

/** Validate an arbitrary parsed object as a full-config preset (file import). */
export function parseFullConfigPreset(raw: unknown): FullConfigPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const values =
    obj.values && typeof obj.values === "object" && !Array.isArray(obj.values)
      ? (obj.values as Record<string, unknown>)
      : null;
  if (!name || !values) return null;
  return {
    name,
    values,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
    full: true,
  };
}

export function listFullConfigPresets(storage?: Storage): FullConfigPreset[] {
  const store = getStorage(storage);
  if (!store) return [];
  try {
    const raw = store.getItem(FULL_CONFIG_PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => parseFullConfigPreset(entry))
      .filter((p): p is FullConfigPreset => p !== null);
  } catch {
    return [];
  }
}

function persist(presets: FullConfigPreset[], storage?: Storage): void {
  const store = getStorage(storage);
  if (store) store.setItem(FULL_CONFIG_PRESET_STORAGE_KEY, JSON.stringify(presets));
}

/** Save the current live config under `name` (overwrites an existing same-name preset). */
export function saveFullConfigPreset(name: string, storage?: Storage): FullConfigPreset {
  const preset: FullConfigPreset = {
    name: name.trim(),
    values: snapshotFullConfig(),
    createdAt: new Date().toISOString(),
    full: true,
  };
  const rest = listFullConfigPresets(storage).filter((p) => p.name !== preset.name);
  const next = [preset, ...rest];
  persist(next, storage);
  return preset;
}

/** Import a full-config preset object (from a file), persisting it. Returns it or null. */
export function importFullConfigPreset(raw: unknown, storage?: Storage): FullConfigPreset | null {
  const preset = parseFullConfigPreset(raw);
  if (!preset) return null;
  const rest = listFullConfigPresets(storage).filter((p) => p.name !== preset.name);
  persist([preset, ...rest], storage);
  return preset;
}

export function deleteFullConfigPreset(name: string, storage?: Storage): void {
  const next = listFullConfigPresets(storage).filter((p) => p.name !== name);
  persist(next, storage);
}

export function getFullConfigPreset(name: string, storage?: Storage): FullConfigPreset | null {
  return listFullConfigPresets(storage).find((p) => p.name === name) ?? null;
}
