import type { SettingScope } from "./settingMetadata";
import type { SettingsTier } from "../settingsDefs";
import type { Audience } from "$lib/shell/audience";

export type SettingsSectionId =
    | "players"
    | "match_flow"
    | "combat_tuning"
    | "economy"
    | "travel_orders"
    | "conquest"
    | "effects"
    | "map_options"
    | "transition"
    | "frontier_fx"
    | "territory_tuning"
    | "territory_styles"
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
    audience: Audience;
    scope: SettingScope | null;
    subsections?: readonly SettingsSubsectionDefinition[];
}

export const SETTINGS_SECTIONS: readonly SettingsSectionDefinition[] = [
    {
        id: "players",
        icon: "players",
        label: "Players",
        color: "#7dd3fc",
        tier: "basic",
        audience: "public",
        scope: "players",
    },
    {
        id: "match_flow",
        icon: "timing",
        label: "Timing",
        color: "#ffcc00",
        tier: "basic",
        audience: "public",
        scope: null,
    },
    {
        id: "combat_tuning",
        icon: "combat",
        label: "Combat Tuning",
        color: "#ff4466",
        tier: "advanced",
        audience: "advanced",
        scope: "battle",
    },
    {
        id: "economy",
        icon: "economy",
        label: "Economy",
        color: "#44ff88",
        tier: "basic",
        audience: "advanced",
        scope: "economy",
    },
    {
        id: "travel_orders",
        icon: "travel",
        label: "Travel & Orders",
        color: "#44aaff",
        tier: "advanced",
        audience: "advanced",
        scope: "travel",
    },
    {
        id: "conquest",
        icon: "conquest",
        label: "Conquest",
        color: "#ff66aa",
        tier: "advanced",
        audience: "advanced",
        scope: "conquest",
    },
    {
        id: "effects",
        icon: "effects",
        label: "Effects",
        color: "#f472b6",
        tier: "advanced",
        audience: "advanced",
        scope: "surge",
    },
    {
        id: "map_options",
        icon: "draw-polygon",
        label: "Map Options & Tuning",
        color: "#cc66ff",
        tier: "basic",
        audience: "public",
        scope: "visuals",
        subsections: [
            { id: "background", label: "Background", icon: "theme" },
            { id: "map-layout", label: "Map Layout", icon: "map-location" },
            { id: "labels-inspector", label: "Labels & Inspector", icon: "font" },
            { id: "connections", label: "Connections", icon: "link" },
        ],
    },
    {
        id: "transition",
        icon: "render",
        label: "Transition",
        color: "#a78bfa",
        tier: "advanced",
        audience: "advanced",
        scope: "territory",
    },
    {
        id: "frontier_fx",
        icon: "frontier-fx",
        label: "Frontier FX",
        color: "#f97316",
        tier: "basic",
        audience: "advanced",
        scope: "territory",
    },
    {
        id: "territory_tuning",
        icon: "topology",
        label: "Territory Topology",
        color: "#6ee7b7",
        tier: "basic",
        audience: "advanced",
        scope: "territory",
    },
    {
        id: "territory_styles",
        icon: "territory-styles",
        label: "Render",
        color: "#93c5fd",
        tier: "basic",
        audience: "advanced",
        scope: "territory",
        subsections: [
            { id: "power_voronoi_runtime", label: "PVV4", icon: "render" },
            { id: "perimeter_field", label: "Perimeter", icon: "render" },
            { id: "metaball", label: "Metaball", icon: "render" },
            { id: "cell_grid", label: "Cell Grid", icon: "topology" },
            { id: "phase_edges", label: "Phase Edges", icon: "phase-edges" },
            { id: "ember_lattice", label: "Ember", icon: "ember-lattice" },
            { id: "phase_field", label: "Phase Field", icon: "phase-field" },
            { id: "grid_gradient", label: "Grid Gradient", icon: "territory-styles" },
        ],
    },
    {
        id: "fleet_star_visuals",
        icon: "fleet-star",
        label: "Fleet & Star Visuals",
        color: "#88ccff",
        tier: "advanced",
        audience: "advanced",
        scope: "ships",
    },
    {
        id: "audio",
        icon: "audio",
        label: "Audio",
        color: "#44ddbb",
        tier: "basic",
        audience: "public",
        scope: "audio",
    },
    {
        id: "diagnostics",
        icon: "diagnostics",
        label: "Diagnostics",
        color: "#f59e0b",
        tier: "developer",
        audience: "internal",
        scope: "diagnostics",
        subsections: [
            { id: "overlays", label: "Overlays", icon: "overlay-legend" },
            { id: "measurements", label: "Measurements", icon: "measure" },
            { id: "recorder", label: "Recorder & Bundles", icon: "logging" },
            { id: "exports", label: "Exports", icon: "export" },
            { id: "mode-diagnostics", label: "Mode Diagnostics", icon: "ranking-star" },
        ],
    },
    {
        id: "logging",
        icon: "logging",
        label: "Logging",
        color: "#88aacc",
        tier: "developer",
        audience: "internal",
        scope: "logging",
    },
    {
        id: "ai",
        icon: "ai",
        label: "AI",
        color: "#ff8844",
        tier: "developer",
        audience: "internal",
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
    territory: "territory_tuning",
    territory_modes: "territory_tuning",
    frontier_fx: "frontier_fx",
    ember_lattice: "territory_styles",
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
