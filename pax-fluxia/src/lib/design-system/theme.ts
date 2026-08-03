export const PAX_THEME_STORAGE_KEY = "pax-ui-theme-id";

/**
 * The four keeper themes (user decision 2026-07-26). Order is the order they
 * appear in the HUD theme picker.
 *
 * A theme re-casts four axes, not just hue: palette, SHAPE (radii), TYPE (its
 * own vendored pairing) and MATERIAL (surface, bloom, texture, raster chrome).
 * The CSS that backs each id lives in `pax-theme.css` as a `[data-pax-theme]`
 * block; `tokenManifest.test.ts` asserts every id here has one.
 */
export const PAX_THEME_IDS = [
  "nebula-veil",
  "aurelia-drift",
  "neon-arcade",
  "broadcast-minimal",
] as const;

export type PaxThemeId = (typeof PAX_THEME_IDS)[number];

/** Nebula Veil leads: it is the most restrained and the most legible cold. */
export const DEFAULT_PAX_THEME_ID: PaxThemeId = "nebula-veil";

export interface PaxThemeDescriptor {
  id: PaxThemeId;
  name: string;
  intent: string;
  accent: {
    system: string;
    selection: string;
    danger: string;
  };
  typography: {
    brand: string;
    ui: string;
    copy: string;
    data: string;
  };
}

export const PAX_THEMES: Record<PaxThemeId, PaxThemeDescriptor> = {
  "nebula-veil": {
    id: "nebula-veil",
    name: "Nebula Veil",
    intent: "Precision instrumentation — machined, cool, deliberately unornamented.",
    accent: {
      system: "#3aa0ff",
      selection: "#8b93b8",
      danger: "#ff5a6a",
    },
    typography: {
      brand: "Chakra Petch",
      ui: "Barlow",
      copy: "Barlow",
      data: "JetBrains Mono",
    },
  },
  "aurelia-drift": {
    id: "aurelia-drift",
    name: "Aurelia Drift",
    intent: "Engraved brass instrument — warm, rounded, guilloche-ruled, serif-led.",
    accent: {
      system: "#55e7ef",
      selection: "#f6c469",
      danger: "#ff6a7a",
    },
    typography: {
      brand: "Cormorant Garamond",
      ui: "Spectral",
      copy: "Spectral",
      data: "JetBrains Mono",
    },
  },
  "neon-arcade": {
    id: "neon-arcade",
    name: "Neon Arcade",
    intent: "Synthwave cabinet — outline-first, real bloom, hard corners, raster chrome.",
    accent: {
      system: "#ff2bbb",
      selection: "#00e5ff",
      danger: "#ff4d6a",
    },
    typography: {
      brand: "Audiowide",
      ui: "Barlow",
      copy: "Barlow",
      data: "JetBrains Mono",
    },
  },
  "broadcast-minimal": {
    id: "broadcast-minimal",
    name: "Broadcast Minimal",
    intent: "Light broadcast graphics — flat white, hairline rules, one accent, no material.",
    accent: {
      system: "#1a56c4",
      selection: "#38455a",
      danger: "#b3182b",
    },
    typography: {
      brand: "Archivo",
      ui: "Archivo",
      copy: "Archivo",
      data: "JetBrains Mono",
    },
  },
};

export function isPaxThemeId(value: string | null | undefined): value is PaxThemeId {
  return Boolean(value && (PAX_THEME_IDS as readonly string[]).includes(value));
}

export function normalizePaxThemeId(value: string | null | undefined): PaxThemeId {
  return isPaxThemeId(value) ? value : DEFAULT_PAX_THEME_ID;
}

export function readStoredPaxThemeId(storage: Pick<Storage, "getItem"> | null | undefined): PaxThemeId {
  if (!storage) return DEFAULT_PAX_THEME_ID;
  return normalizePaxThemeId(storage.getItem(PAX_THEME_STORAGE_KEY));
}

export function writeStoredPaxThemeId(
  storage: Pick<Storage, "setItem"> | null | undefined,
  themeId: PaxThemeId,
) {
  storage?.setItem(PAX_THEME_STORAGE_KEY, themeId);
}

export function applyPaxTheme(root: HTMLElement, themeId: PaxThemeId) {
  root.dataset.paxTheme = themeId;
}

export function exportPaxThemeDescriptor(themeId: PaxThemeId): PaxThemeDescriptor {
  return PAX_THEMES[themeId];
}
