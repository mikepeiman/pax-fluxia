import type { SettingsCategoryId } from "./settingsTaxonomy";

/**
 * The settings UTILITY PANELS — the bespoke drawers that live alongside the
 * config sections (theme picker, typography, save/load, stats, hotkeys, help).
 *
 * They used to be a local `const` inside `GameSettingsPanel.svelte`, which made
 * them invisible to everything else — including the settings search, whose index
 * is built from `SETTINGS_SECTIONS`. Searching "theme" or "appearance" returned
 * nothing at all, so the theme picker (the entry point to every HUD skin) could
 * only be found by knowing which category chip to click.
 *
 * This module is the single source of truth: the panel rail renders from it and
 * the search indexes from it, so a panel cannot exist in one and not the other.
 * `settingsPanels.test.ts` proves every panel is reachable by searching its name.
 */
export type SettingsPanelId =
    | "ui_appearance"
    | "ui_themes"
    | "ui_savegame"
    | "ui_config_io"
    | "ui_stats"
    | "ui_hotkeys"
    | "ui_help"
    | "ui_typography";

export interface SettingsPanelDefinition {
    readonly id: SettingsPanelId;
    /** Top-level category whose rail this panel appears under. */
    readonly category: SettingsCategoryId;
    readonly icon: string;
    readonly label: string;
    /** One line describing what the panel holds; shown as the search snippet. */
    readonly summary: string;
    /**
     * Extra search terms. These are the words a player would actually type —
     * "skin", "colour", "font" — not the internal vocabulary.
     */
    readonly keywords: readonly string[];
}

export const SETTINGS_PANELS: readonly SettingsPanelDefinition[] = [
    {
        id: "ui_appearance",
        category: "interface",
        icon: "gem",
        label: "Appearance",
        summary:
            "HUD skin and theme picker — switch between Nebula Veil, Aurelia Drift, Neon Arcade and Broadcast Minimal, plus the visual controls.",
        keywords: [
            "theme",
            "themes",
            "skin",
            "hud skin",
            "appearance",
            "look",
            "style",
            "colour",
            "color",
            "palette",
            "dark",
            "light",
            "nebula veil",
            "aurelia drift",
            "neon arcade",
            "broadcast minimal",
        ],
    },
    {
        id: "ui_themes",
        // Top-level category of its own (2026-08-11), not a drawer buried under
        // Interface: themes are a first-class surface in this game, not one of
        // Interface's odds and ends.
        category: "themes",
        icon: "library",
        label: "Themes",
        summary: "Saved theme library — store, load and manage your own theme presets.",
        keywords: ["theme", "themes", "library", "preset", "presets", "saved", "skin"],
    },
    {
        id: "ui_typography",
        category: "typography",
        icon: "font",
        label: "Typography",
        summary: "Font roles and type scales — the typeface each part of the HUD uses.",
        keywords: ["font", "fonts", "typeface", "type", "typography", "text size", "scale"],
    },
    {
        id: "ui_savegame",
        category: "interface",
        icon: "save-game",
        label: "Save / Load",
        summary: "Save the current match or load a previous one.",
        keywords: ["save", "load", "savegame", "restore", "resume"],
    },
    {
        id: "ui_config_io",
        category: "interface",
        icon: "export",
        label: "Import / Export",
        summary: "Import and export settings and config bundles.",
        keywords: ["import", "export", "config", "settings file", "backup", "share", "reset"],
    },
    {
        id: "ui_stats",
        category: "interface",
        icon: "ranking-star",
        label: "Stats",
        summary: "Live match statistics — tick, players and totals.",
        keywords: ["stats", "statistics", "tick", "players", "totals", "score"],
    },
    {
        id: "ui_hotkeys",
        category: "interface",
        icon: "keyboard",
        label: "Hotkeys",
        summary: "Keyboard shortcuts for camera, selection and orders.",
        keywords: ["hotkey", "hotkeys", "keyboard", "shortcut", "shortcuts", "keys", "binding"],
    },
    {
        id: "ui_help",
        category: "interface",
        icon: "help",
        label: "Help",
        summary: "How to play — rules, controls and terminology.",
        keywords: ["help", "how to play", "guide", "rules", "tutorial", "docs"],
    },
];

const PANEL_IDS = new Set<string>(SETTINGS_PANELS.map((panel) => panel.id));

export function isSettingsPanelId(value: string | null | undefined): value is SettingsPanelId {
    return Boolean(value && PANEL_IDS.has(value));
}

export function getSettingsPanel(id: SettingsPanelId): SettingsPanelDefinition {
    return SETTINGS_PANELS.find((panel) => panel.id === id) ?? SETTINGS_PANELS[0]!;
}

export function settingsPanelsForCategory(
    category: SettingsCategoryId,
): readonly SettingsPanelDefinition[] {
    return SETTINGS_PANELS.filter((panel) => panel.category === category);
}
