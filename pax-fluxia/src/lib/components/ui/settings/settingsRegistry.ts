import type { SettingScope } from "./settingMetadata";
import type { SettingsTier } from "../settingsDefs";

export type SettingsSectionId =
    | "players"
    | "match_flow"
    | "combat_tuning"
    | "economy"
    | "travel_orders"
    | "conquest"
    | "effects"
    | "map_options"
    | "territory_modes"
    | "territory_phase_field"
    | "territory_tuning"
    | "territory_styles"
    | "pvv4_transition"
    | "fleet_star_visuals"
    | "audio"
    | "diagnostics"
    | "logging"
    | "ai";

export interface SettingsSubsectionDefinition {
    id: string;
    label: string;
    icon: string;
}

export interface SettingsSectionDefinition {
    id: SettingsSectionId;
    icon: string;
    label: string;
    color: string;
    tier: SettingsTier;
    scope: SettingScope | null;
    subsections?: readonly SettingsSubsectionDefinition[];
}

export const SETTINGS_SECTIONS: readonly SettingsSectionDefinition[] = [
    {
        id: "players",
        icon: "👥",
        label: "Players",
        color: "#7dd3fc",
        tier: "basic",
        scope: "players",
    },
    {
        id: "match_flow",
        icon: "⚡",
        label: "Timing",
        color: "#ffcc00",
        tier: "basic",
        scope: null,
    },
    {
        id: "combat_tuning",
        icon: "⚔️",
        label: "Combat Tuning",
        color: "#ff4466",
        tier: "advanced",
        scope: "battle",
    },
    {
        id: "economy",
        icon: "🎛️",
        label: "Economy",
        color: "#44ff88",
        tier: "basic",
        scope: "economy",
    },
    {
        id: "travel_orders",
        icon: "🚀",
        label: "Travel & Orders",
        color: "#44aaff",
        tier: "advanced",
        scope: "travel",
    },
    {
        id: "conquest",
        icon: "🏰",
        label: "Conquest",
        color: "#ff66aa",
        tier: "advanced",
        scope: "conquest",
    },
    {
        id: "effects",
        icon: "✦",
        label: "Effects",
        color: "#f472b6",
        tier: "advanced",
        scope: "surge",
    },
    {
        id: "map_options",
        icon: "🗺️",
        label: "Map Options & Tuning",
        color: "#cc66ff",
        tier: "basic",
        scope: "visuals",
        subsections: [
            { id: "background", label: "Background", icon: "◈" },
            { id: "overlays", label: "Overlays", icon: "⌁" },
            { id: "map-layout", label: "Map Layout", icon: "⬡" },
            { id: "labels-inspector", label: "Labels & Inspector", icon: "⌁" },
            { id: "connections", label: "Connections", icon: "➠" },
        ],
    },
    {
        id: "territory_modes",
        icon: "🌍",
        label: "Territory System",
        color: "#66ccaa",
        tier: "basic",
        scope: "territory",
    },
    {
        id: "territory_phase_field",
        icon: "🫧",
        label: "Phase Field",
        color: "#7dd3fc",
        tier: "basic",
        scope: "territory",
    },
    {
        id: "territory_tuning",
        icon: "🧭",
        label: "Frontier Topology",
        color: "#6ee7b7",
        tier: "basic",
        scope: "territory",
    },
    {
        id: "territory_styles",
        icon: "🎨",
        label: "Render Families",
        color: "#93c5fd",
        tier: "basic",
        scope: "territory",
    },
    {
        id: "pvv4_transition",
        icon: "↔",
        label: "PVV4 Transition",
        color: "#67e8f9",
        tier: "developer",
        scope: "territory",
    },
    {
        id: "fleet_star_visuals",
        icon: "✨",
        label: "Fleet & Star Visuals",
        color: "#88ccff",
        tier: "advanced",
        scope: "ships",
    },
    {
        id: "audio",
        icon: "🔊",
        label: "Audio",
        color: "#44ddbb",
        tier: "basic",
        scope: "audio",
    },
    {
        id: "diagnostics",
        icon: "◎",
        label: "Diagnostics",
        color: "#f59e0b",
        tier: "developer",
        scope: "diagnostics",
        subsections: [
            { id: "overlays", label: "Overlays", icon: "◌" },
            { id: "measurements", label: "Measurements", icon: "📏" },
            { id: "recorder", label: "Recorder & Bundles", icon: "◫" },
            { id: "exports", label: "Exports", icon: "⬇" },
            { id: "mode-diagnostics", label: "Mode Diagnostics", icon: "◈" },
        ],
    },
    {
        id: "logging",
        icon: "📋",
        label: "Logging",
        color: "#88aacc",
        tier: "developer",
        scope: "logging",
    },
    {
        id: "ai",
        icon: "🤖",
        label: "AI",
        color: "#ff8844",
        tier: "developer",
        scope: "ai",
    },
] as const;

const COMPAT_SECTION_ID_ALIASES: Record<string, SettingsSectionId> = {
    players: "players",
    speed: "match_flow",
    rules: "match_flow",
    battle: "combat_tuning",
    economy: "economy",
    ai: "ai",
    travel: "travel_orders",
    surge: "effects",
    effects: "effects",
    conquest_effects: "conquest",
    conquest: "conquest",
    territory: "territory_modes",
    pvv4: "pvv4_transition",
    pvv4_transition: "pvv4_transition",
    ships: "fleet_star_visuals",
    visuals: "map_options",
    logging: "logging",
    audio: "audio",
    debug: "diagnostics",
};

export function normalizeSettingsSectionId(
    value: string | null | undefined,
): SettingsSectionId | null {
    if (!value) return null;
    const normalized = COMPAT_SECTION_ID_ALIASES[value] ?? value;
    return SETTINGS_SECTIONS.some((section) => section.id === normalized)
        ? (normalized as SettingsSectionId)
        : null;
}
