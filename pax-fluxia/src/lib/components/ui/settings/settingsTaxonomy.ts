import type { SettingsSectionId } from "./settingsRegistry";

/**
 * SINGLE SOURCE OF TRUTH for settings navigation grouping (the approved
 * 7-category ontology). The rail derives from this; each category's sections
 * become the top sub-nav chips, with one scroll surface below.
 *
 * This intentionally REPLACES the parallel structures once migration completes:
 *   - SETTINGS_TOOLS            (the old rail array, in GameSettingsPanel)
 *   - SECTION_TOOL_BY_ID        (tool<->section reverse map)
 *   - COMPAT_SECTION_ID_ALIASES (legacy id aliases, in settingsRegistry)
 * Section CONTENT definitions stay in settingsRegistry's SETTINGS_SECTIONS
 * (id/icon/label/color/tier/audience/scope) — this file only groups them.
 *
 * Utilities (Themes, Appearance, Stats, Hotkeys, Help) render bespoke drawers,
 * not plain sections; they live under `utilities`. Actions (Restart, Quit) are
 * `actions`. Both render as a compact cluster after the category icons.
 */

export type SettingsCategoryId =
    | "gameplay"
    | "fleet_stars"
    | "territory"
    | "map_effects"
    | "audio"
    | "interface"
    | "typography"
    | "developer";

export interface SettingsCategory {
    id: SettingsCategoryId;
    icon: string;
    label: string;
    color: string;
    /** Ordered sections shown as sub-nav chips for this category. */
    sections: readonly SettingsSectionId[];
}

export const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
    {
        id: "gameplay",
        icon: "conquest",
        label: "Gameplay",
        color: "#ffcc66",
        sections: [
            "players",
            "match_flow",
            "combat_tuning",
            "economy",
            "travel_orders",
            "conquest",
        ],
    },
    {
        id: "fleet_stars",
        icon: "fleet-star",
        label: "Fleet & Stars",
        color: "#88ccff",
        sections: ["fleet_star_visuals"],
    },
    {
        id: "territory",
        icon: "render",
        label: "Territory & Render",
        color: "#a78bfa",
        sections: [
            "territory_tuning",
            "territory_styles",
            "territory_phase_field",
            "territory_phase_edges",
            "territory_ember_lattice",
            "frontier_fx",
            "transition",
        ],
    },
    {
        id: "map_effects",
        icon: "map-options",
        label: "Map & Effects",
        color: "#cc66ff",
        sections: ["map_options", "effects"],
    },
    {
        id: "audio",
        icon: "audio",
        label: "Audio",
        color: "#44ddbb",
        sections: ["audio"],
    },
    {
        id: "interface",
        icon: "theme",
        label: "Interface",
        color: "#5ee6ff",
        // NOTE: themes/appearance/stats/hotkeys render as utility drawers, not
        // SETTINGS_SECTIONS. Migration step 2 unifies them as section-like panels.
        sections: [],
    },
    {
        id: "typography",
        icon: "font",
        label: "Typography",
        color: "#9be15d",
        // Renders the bespoke TypographyTokenPanel drawer (font roles + scales),
        // not a SETTINGS_SECTION — handled like the Interface utility panels.
        sections: [],
    },
    {
        id: "developer",
        icon: "diagnostics",
        label: "Developer",
        color: "#f59e0b",
        sections: ["diagnostics", "logging", "ai"],
    },
] as const;

/** Reverse lookup: section -> its owning category. Built from the single source. */
export const CATEGORY_BY_SECTION: Readonly<
    Partial<Record<SettingsSectionId, SettingsCategoryId>>
> = Object.fromEntries(
    SETTINGS_CATEGORIES.flatMap((category) =>
        category.sections.map((section) => [section, category.id]),
    ),
);
