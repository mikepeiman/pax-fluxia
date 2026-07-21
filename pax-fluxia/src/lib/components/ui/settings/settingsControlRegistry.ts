/**
 * settingsControlRegistry — the SINGLE SOURCE OF TRUTH for every settings
 * control's identity and placement (the Settings IA rewrite, 2026-07-21).
 *
 * The panel, the search index, and the infotips all PROJECT from this. There is
 * no separate hand-authored search map (settingMetadata's SCOPE_LABEL_META) and
 * no per-component subsection grouping logic that can drift from it: a control's
 * home (category → section → subsection), its visible label, its description
 * (infotip text), and its searchable text are ONE declaration here.
 *
 * A control is `custom` when its widget is bespoke (audio per-sound cards, SLA
 * widgets, transfer panels): the entry still carries home/label/description/
 * search so those layers stay data-driven, while the render stays in its owning
 * ControlsSection component until it is migrated to the projection renderer.
 *
 * MIGRATION STATUS: seeded with the Territory Topology + Transition controls
 * (the messiest cluster). Remaining sections populate from the Phase-A inventory
 * as each is reconciled; the integrity test guards uniqueness/placement as they
 * land. Full completeness (every user-facing GAME_CONFIG key present exactly
 * once) is enforced once population is complete.
 */

import type { SettingsSectionId } from "./settingsRegistry";

export type ControlType =
    | "range"
    | "toggle"
    | "segmented"
    | "picker"
    | "select"
    | "info"
    | "custom";

export interface SettingsControl {
    /** The GAME_CONFIG key this control writes (the stable identity). */
    configKey: string;
    /** Panel-store key; omitted only for controls with no panel mirror. */
    panelKey?: string;
    /** Owning section (from settingsRegistry) — the category is derived. */
    section: SettingsSectionId;
    /** Subsection id within the section, or null for section-root controls. */
    subsection: string | null;
    /** Visible label — the SAME string the rendered row shows (no drift). */
    label: string;
    /** Infotip + search description. Purpose-clear, plain language. */
    description: string;
    controlType: ControlType;
    /** Numeric range for `range` controls. */
    range?: { min: number; max: number; step: number };
    /** Option values for `segmented` / `select` / `picker`. */
    options?: readonly string[];
    /** Rendered by a bespoke widget in its owning component (not the projector). */
    custom?: boolean;
    /**
     * Extra search synonyms NOT in the label/description (e.g. the technique name
     * "Chaikin" for a control labelled "Border Rounding"). Keeps search findable
     * without polluting the visible label.
     */
    aliases?: readonly string[];
}

/**
 * Territory → Topology ("Frontier Topology"). The live power-vector generator
 * inputs. FRONTIER_RESOLUTION + CHAIKIN_BOUNDARY_EPS are intentionally ABSENT:
 * they are dead knobs slated for removal (user 2026-07-21).
 */
const TERRITORY_TOPOLOGY_CONTROLS: readonly SettingsControl[] = [
    { configKey: "MODIFIED_VORONOI_STAR_MARGIN", panelKey: "starMargin", section: "territory_tuning", subsection: null, label: "Minimum Star Margin (MSR)", description: "Minimum clear radius kept around each star before neighbouring territory can encroach.", controlType: "range", range: { min: 0, max: 200, step: 1 } },
    { configKey: "TERRITORY_MSR_STAR_BIAS", panelKey: "territoryMsrStarBias", section: "territory_tuning", subsection: null, label: "Star Bias", description: "How strongly a star's own territory is favoured over its neighbours' near the margin.", controlType: "range", range: { min: 0, max: 4, step: 0.05 } },
    { configKey: "MODIFIED_VORONOI_CORRIDOR_ENABLED", panelKey: "corridorEnabled", section: "territory_tuning", subsection: null, label: "Corridor Virtual Sites (CX)", description: "Adds virtual sites along lanes so contested corridors between stars form clean boundaries.", controlType: "toggle" },
    { configKey: "TERRITORY_CX_CONTEST_MIDPOINT_VSTARS", panelKey: "cxContestMidpointVstars", section: "territory_tuning", subsection: null, label: "Lane Midpoint Pairs", description: "Places paired virtual sites at lane midpoints to sharpen the contested split between two owners.", controlType: "toggle" },
    { configKey: "TERRITORY_CX_CONTEST_PAIR_COUNT", panelKey: "cxContestPairCount", section: "territory_tuning", subsection: null, label: "Lane Midpoint Pair Count", description: "How many virtual-site pairs are placed along each contested lane.", controlType: "range", range: { min: 0, max: 8, step: 1 } },
    { configKey: "TERRITORY_CX_CONTEST_PAIR_SPACING", panelKey: "cxContestPairSpacing", section: "territory_tuning", subsection: null, label: "Lane Midpoint Pair Spacing", description: "Distance between the two sites of each midpoint pair.", controlType: "range", range: { min: 0, max: 100, step: 1 } },
    { configKey: "TERRITORY_CX_CONTEST_PAIR_WEIGHT", panelKey: "cxContestPairWeight", section: "territory_tuning", subsection: null, label: "Lane Midpoint Pair Weight", description: "Influence weight of the midpoint pairs on the surrounding boundary.", controlType: "range", range: { min: 0, max: 4, step: 0.05 } },
    { configKey: "TERRITORY_CX_COUNT", panelKey: "cxCount", section: "territory_tuning", subsection: null, label: "Corridor Sample Count", description: "Number of virtual sites sampled along each corridor lane.", controlType: "range", range: { min: 0, max: 16, step: 1 } },
    { configKey: "TERRITORY_CX_WEIGHT", panelKey: "cxWeight", section: "territory_tuning", subsection: null, label: "Corridor Weight", description: "Influence weight of corridor virtual sites on the boundary.", controlType: "range", range: { min: 0, max: 4, step: 0.05 } },
    { configKey: "MODIFIED_VORONOI_CORRIDOR_SPACING", panelKey: "corridorSpacing", section: "territory_tuning", subsection: null, label: "Corridor Spacing", description: "Spacing between corridor virtual sites along a lane.", controlType: "range", range: { min: 0, max: 200, step: 1 } },
    { configKey: "MODIFIED_VORONOI_DISCONNECT_ENABLED", panelKey: "disconnectEnabled", section: "territory_tuning", subsection: null, label: "Disconnect Gaps (DX)", description: "Introduces gaps that visually disconnect territories separated beyond a distance.", controlType: "toggle" },
    { configKey: "TERRITORY_DX_WEIGHT", panelKey: "dxWeight", section: "territory_tuning", subsection: null, label: "Disconnect Weight", description: "Influence weight of the disconnect sites that open the gaps.", controlType: "range", range: { min: 0, max: 4, step: 0.05 } },
    { configKey: "MODIFIED_VORONOI_DISCONNECT_DISTANCE", panelKey: "disconnectDistance", section: "territory_tuning", subsection: null, label: "Disconnect Distance", description: "Distance beyond which territories are disconnected by a gap.", controlType: "range", range: { min: 0, max: 400, step: 1 } },
];

/**
 * Territory → Transition. Conquest morph timing + the conquest front's shape.
 * CANONICAL homes for the previously-duplicated Front Shape / Border Rounding
 * (their power-vector-gated copies in TerritorySurfaceStyleTuning are the
 * duplicates to retire — placement resolved in the IA pass).
 */
const TERRITORY_TRANSITION_CONTROLS: readonly SettingsControl[] = [
    { configKey: "TERRITORY_CONQUEST_FRONT_MODE", panelKey: "territoryConquestFrontMode", section: "transition", subsection: null, label: "Front Shape", description: "Shape of the conquest split as it sweeps across a captured star. Radial = curved front from the attack origin; Linear = straight sweep.", controlType: "segmented", options: ["radial", "linear"] },
    { configKey: "VORONOI_BORDER_SMOOTH", panelKey: "voronoiBorderSmooth", section: "transition", subsection: null, label: "Border Rounding", description: "How many rounding passes are applied to territory borders. 0 = angular; higher = smoother, more rounded corners.", controlType: "range", range: { min: 0, max: 5, step: 1 }, aliases: ["chaikin", "smooth passes", "geometry smooth"] },
    { configKey: "TERRITORY_MORPH_COMPLETE_PCT", panelKey: "territoryMorphCompletePct", section: "transition", subsection: null, label: "Motion Completion (% of window)", description: "Fraction of the transition window over which the conquest sweep completes; the remainder holds the settled map.", controlType: "range", range: { min: 50, max: 100, step: 1 } },
    { configKey: "TERRITORY_TRANSITION_MS", panelKey: "territoryTransitionMs", section: "transition", subsection: null, label: "Transition Duration", description: "Length of a conquest transition animation in milliseconds.", controlType: "range", range: { min: 0, max: 3000, step: 50 } },
    { configKey: "TERRITORY_TRANSITION_BIND_TO_TICK", panelKey: "territoryTransitionBindToTick", section: "transition", subsection: null, label: "Bind duration to tick", description: "Lock the transition duration to the game's tick interval instead of a fixed millisecond value.", controlType: "toggle" },
];

/** The full control registry (grows as sections are reconciled). */
export const SETTINGS_CONTROLS: readonly SettingsControl[] = [
    ...TERRITORY_TOPOLOGY_CONTROLS,
    ...TERRITORY_TRANSITION_CONTROLS,
];

/** Search record projected from a control — label + description + aliases only. */
export interface RegistrySearchRecord {
    configKey: string;
    panelKey?: string;
    section: SettingsSectionId;
    subsection: string | null;
    label: string;
    description: string;
    /** Combined haystack (label + description + aliases), lowercased. */
    searchText: string;
}

/** Derive search records from the registry — the search index's real source. */
export function deriveRegistrySearchRecords(): RegistrySearchRecord[] {
    return SETTINGS_CONTROLS.map((control) => ({
        configKey: control.configKey,
        panelKey: control.panelKey,
        section: control.section,
        subsection: control.subsection,
        label: control.label,
        description: control.description,
        searchText: [control.label, control.description, ...(control.aliases ?? [])]
            .join(" ")
            .toLowerCase(),
    }));
}

/** Config keys the registry already owns — callers dedupe legacy sources by this. */
export function registryOwnedConfigKeys(): ReadonlySet<string> {
    return new Set(SETTINGS_CONTROLS.map((control) => control.configKey));
}
