export const PAX_THEME_STORAGE_KEY = "pax-ui-theme-id";

export const PAX_THEME_IDS = ["aurelia-drift", "cyber-flux"] as const;

export type PaxThemeId = (typeof PAX_THEME_IDS)[number];

export const DEFAULT_PAX_THEME_ID: PaxThemeId = "aurelia-drift";

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
  "aurelia-drift": {
    id: "aurelia-drift",
    name: "Aurelia Drift",
    intent: "Premium dark naval-sci-fi HUD with gold trim and cyan system focus.",
    accent: {
      system: "#55e7ef",
      selection: "#f6c469",
      danger: "#ff6a7a",
    },
    typography: {
      brand: "Cinzel",
      ui: "Rajdhani",
      copy: "Inter",
      data: "JetBrains Mono",
    },
  },
  "cyber-flux": {
    id: "cyber-flux",
    name: "Cyber Flux",
    intent: "Legacy neon-cyan shell for compatibility and contrast testing.",
    accent: {
      system: "#00ffff",
      selection: "#ffcc00",
      danger: "#ff3366",
    },
    typography: {
      brand: "Rajdhani",
      ui: "Rajdhani",
      copy: "Inter",
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
