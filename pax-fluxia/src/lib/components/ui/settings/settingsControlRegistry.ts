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
import { GENERATED_CONTROLS } from "./settingsControlRegistry.generated";
import { AI_VARIABLES, COMBAT_VARIABLES } from "../settingsDefs";

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
    /** Infotip + search description. Purpose-clear, plain language. Optional:
     *  generated entries may have none (search falls back to label + section). */
    description?: string;
    controlType: ControlType;
    /** Numeric range for `range` controls. */
    range?: { min: number; max: number; step: number };
    /** Display format passed to the range row (percent / fixed2 / multiplier …). */
    format?: "raw" | "percent" | "fixed2" | "fixed1" | "multiplier";
    /**
     * Display scale: the slider shows `stored * scale` and stores `input / scale`.
     * For a config that holds a 0–1 fraction but is shown as a 0–100 slider, scale
     * = 100. Omitted = 1 (no transform). Round-trip-tested per migrated section.
     */
    scale?: number;
    /** Suffix appended to the displayed value (e.g. "px", "ms", "x"). */
    unit?: string;
    /** Label shown INSTEAD of the number when the shown value is 0 (e.g. a
     *  MAX_SHIPS of 0 reads "unlimited", an auto-width reads "auto"). */
    zeroLabel?: string;
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
    { configKey: "MODIFIED_VORONOI_STAR_MARGIN", panelKey: "starMargin", section: "territory_tuning", subsection: null, label: "Minimum Star Margin", description: "Minimum clear radius kept around each star before neighbouring territory can encroach.", controlType: "range", range: { min: 0, max: 200, step: 1 }, aliases: ["msr"] },
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
    { configKey: "VORONOI_BORDER_SMOOTH", panelKey: "voronoiBorderSmooth", section: "transition", subsection: null, label: "Border Rounding (Chaikin passes)", description: "How many rounding passes are applied to territory borders. 0 = angular; higher = smoother, more rounded corners.", controlType: "range", range: { min: 0, max: 5, step: 1 }, aliases: ["chaikin", "smooth passes", "geometry smooth"] },
    { configKey: "TERRITORY_MORPH_COMPLETE_PCT", panelKey: "territoryMorphCompletePct", section: "transition", subsection: null, label: "Motion Completion (% of window)", description: "Fraction of the transition window over which the conquest sweep completes; the remainder holds the settled map.", controlType: "range", range: { min: 50, max: 100, step: 1 } },
    { configKey: "TERRITORY_TRANSITION_MS", panelKey: "territoryTransitionMs", section: "transition", subsection: null, label: "Transition Duration", description: "Length of a conquest transition animation in milliseconds.", controlType: "range", range: { min: 0, max: 3000, step: 50 } },
    { configKey: "TERRITORY_TRANSITION_BIND_TO_TICK", panelKey: "territoryTransitionBindToTick", section: "transition", subsection: null, label: "Bind duration to tick", description: "Lock the transition duration to the game's tick interval instead of a fixed millisecond value.", controlType: "toggle" },
];

/**
 * Territory → Render (territory_styles). These are RENDER-MODE-GATED: they only
 * mount when their mode's tuning card is shown. The `subsection` is the render
 * mode that surfaces the control, so a search click selects that mode's chip and
 * the control actually mounts (resolveActiveStyleId follows the selected chip) —
 * the fix for "search lands on a mode where the control isn't there". Keying by
 * configKey lets same-label controls coexist (e.g. "Max Cells" here AND in the
 * cell-grid family) — impossible in the flat label→key search map.
 */
const TERRITORY_STYLE_CONTROLS: readonly SettingsControl[] = [
    // Grid Gradient family.
    { configKey: "GRID_GRADIENT_SPACING_PX", section: "territory_styles", subsection: "grid_gradient", label: "Grid Spacing", description: "Spacing between grid-gradient cells, in pixels.", controlType: "range", range: { min: 2, max: 200, step: 1 } },
    { configKey: "GRID_GRADIENT_MAX_CELLS", section: "territory_styles", subsection: "grid_gradient", label: "Max Cells", description: "Upper bound on the number of grid-gradient cells drawn.", controlType: "range", range: { min: 100, max: 200000, step: 1000 } },
    { configKey: "GRID_GRADIENT_CELL_SHAPE", section: "territory_styles", subsection: "grid_gradient", label: "Shape", description: "Cell primitive drawn for the grid-gradient fill.", controlType: "custom" },
    { configKey: "GRID_GRADIENT_CENTER_SIZE_PX", section: "territory_styles", subsection: "grid_gradient", label: "Center Size", description: "Cell size at a territory's core (near its star).", controlType: "range", range: { min: 0, max: 100, step: 1 } },
    { configKey: "GRID_GRADIENT_EDGE_SIZE_PX", section: "territory_styles", subsection: "grid_gradient", label: "Edge Size", description: "Cell size at a territory's outer edge.", controlType: "range", range: { min: 0, max: 100, step: 1 } },
    { configKey: "GRID_GRADIENT_CURVE_POWER", section: "territory_styles", subsection: "grid_gradient", label: "Gradient Curve", description: "How sharply cell size ramps from centre to edge.", controlType: "range", range: { min: 0.1, max: 8, step: 0.1 } },
    { configKey: "GRID_GRADIENT_FILL_HUE_SHIFT_DEG", section: "territory_styles", subsection: "grid_gradient", label: "Hue Shift", description: "Hue rotation applied across the grid-gradient fill, in degrees.", controlType: "range", range: { min: -180, max: 180, step: 1 } },
    { configKey: "GRID_GRADIENT_BORDER_OFFSET_PX", section: "territory_styles", subsection: "grid_gradient", label: "Border Offset", description: "Inward offset of the border from the fill edge.", controlType: "range", range: { min: 0, max: 20, step: 0.5 } },
    { configKey: "GRID_GRADIENT_VECTOR_BORDERS_ENABLED", section: "territory_styles", subsection: "grid_gradient", label: "Vector borders", description: "Draw crisp vector borders instead of cell-derived edges.", controlType: "toggle" },
    { configKey: "GRID_GRADIENT_BORDER_DOTS_ENABLED", section: "territory_styles", subsection: "grid_gradient", label: "Border dots", description: "Stipple the border with dots.", controlType: "toggle" },
    { configKey: "GRID_GRADIENT_BORDER_DOT_SIZE_PX", section: "territory_styles", subsection: "grid_gradient", label: "Dot Size", description: "Size of the border stipple dots.", controlType: "range", range: { min: 0.5, max: 10, step: 0.5 } },
    { configKey: "GRID_GRADIENT_BORDER_DOT_STYLE", section: "territory_styles", subsection: "grid_gradient", label: "Dot Style", description: "Style of the border stipple dots.", controlType: "custom" },
    { configKey: "GRID_GRADIENT_SHADER_NOISE_STRENGTH", section: "territory_styles", subsection: "grid_gradient", label: "Shader Noise Roughness (Noise)", description: "Amount of per-pixel noise roughness in the shader-field fill.", controlType: "range", range: { min: 0, max: 1, step: 0.01 } },
    // Cell-grid family border smoothing (mounts under any cell-grid mode; phase_edges chosen as the canonical entry).
    { configKey: "CELL_GRID_BORDER_CHAIKIN_PASSES", section: "territory_styles", subsection: "phase_edges", label: "Border Chaikin Passes", description: "Chaikin rounding passes on the cell-grid territory border.", controlType: "range", range: { min: 0, max: 4, step: 1 }, aliases: ["chaikin"] },
    { configKey: "TERRITORY_FRONTIER_CHAIKIN_PASSES", section: "territory_styles", subsection: "phase_edges", label: "Frontier Chaikin", description: "Chaikin rounding passes on the phase-edges frontier line.", controlType: "range", range: { min: 0, max: 4, step: 1 }, aliases: ["chaikin"] },
    // Grid-gradient surface colour + jitter (rendered in GridGradientTuning).
    { configKey: "TERRITORY_SURFACE_SATURATION", section: "territory_styles", subsection: "grid_gradient", label: "Saturation", description: "Colour saturation of the grid-gradient territory fill.", controlType: "custom" },
    { configKey: "TERRITORY_SURFACE_LIGHTNESS", section: "territory_styles", subsection: "grid_gradient", label: "Lightness", description: "Colour lightness of the grid-gradient territory fill.", controlType: "custom" },
    { configKey: "TERRITORY_SURFACE_ALPHA", section: "territory_styles", subsection: "grid_gradient", label: "Alpha", description: "Opacity of the grid-gradient territory fill.", controlType: "custom" },
    { configKey: "GRID_GRADIENT_POSITION_JITTER", section: "territory_styles", subsection: "grid_gradient", label: "Position Jitter", description: "Random positional offset applied to grid-gradient cells.", controlType: "custom" },
    { configKey: "CELL_GRID_BOUNDARY_FILL_FLUSH", section: "territory_styles", subsection: "phase_edges", label: "Boundary fill matches border", description: "Flush the cell-grid fill to the territory border so no gap shows.", controlType: "toggle" },
];

/**
 * AI / Combat sliders are already clean data arrays (key/label/min/max/step/desc)
 * that the sections render in a loop — source registry entries straight from them
 * so there is exactly one definition. `fixed2` matches the sections' format.
 */
function controlsFromVariables(
    vars: ReadonlyArray<{
        key: string;
        label: string;
        min: number;
        max: number;
        step: number;
        desc?: string;
    }>,
    section: SettingsSectionId,
): SettingsControl[] {
    return vars.map((v) => ({
        configKey: v.key,
        section,
        subsection: null,
        label: v.label,
        description: v.desc,
        controlType: "range" as const,
        range: { min: v.min, max: v.max, step: v.step },
        format: "fixed2" as const,
    }));
}
const AI_CONTROLS = controlsFromVariables(AI_VARIABLES, "ai");
const COMBAT_CONTROLS = controlsFromVariables(COMBAT_VARIABLES, "combat_tuning");

/**
 * The full control registry. Hand-authored territory entries above (curated
 * labels/descriptions/subsections for the mode-gated + topology/transition
 * controls); GENERATED_CONTROLS below is machine-extracted from the remaining
 * ControlsSection components (one section per file) — rendered label is ground
 * truth, so those labels cannot drift. Regenerate with tools/gen-settings-registry.mjs.
 */
/**
 * Presentation the generator can't extract because it lives in a control's
 * onInput/output LOGIC, not its static props: percent `scale` (config stores a
 * 0–1 fraction shown on a 0–100 slider), display `format`, `unit` suffix, and
 * `zeroLabel` (a sentinel like "unlimited"/"auto" shown at 0). Applied onto the
 * generated/authored entries below so the renderer reproduces the section
 * faithfully. Added per section as it migrates to SettingsControlRenderer.
 */
const CONTROL_PRESENTATION: Record<
    string,
    Partial<Pick<SettingsControl, "format" | "scale" | "unit" | "zeroLabel">>
> = {
    // Economy
    BASE_PRODUCTION: { format: "fixed2" },
    TRANSFER_RATE: { format: "percent", scale: 100 },
    MAX_SHIPS_PER_TRANSFER: { zeroLabel: "unlimited" },
    REPAIR_RATE: { format: "percent" },
    REPAIR_SUPPRESS_ATTACKER: { format: "percent", scale: 100 },
    REPAIR_SUPPRESS_DEFENDER: { format: "percent", scale: 100 },
};

const RAW_CONTROLS: readonly SettingsControl[] = [
    ...TERRITORY_TOPOLOGY_CONTROLS,
    ...TERRITORY_TRANSITION_CONTROLS,
    ...TERRITORY_STYLE_CONTROLS,
    ...AI_CONTROLS,
    ...COMBAT_CONTROLS,
    ...GENERATED_CONTROLS,
];

export const SETTINGS_CONTROLS: readonly SettingsControl[] = RAW_CONTROLS.map(
    (control) =>
        CONTROL_PRESENTATION[control.configKey]
            ? { ...control, ...CONTROL_PRESENTATION[control.configKey] }
            : control,
);

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
        description: control.description ?? "",
        searchText: [control.label, control.description ?? "", ...(control.aliases ?? [])]
            .join(" ")
            .toLowerCase(),
    }));
}

/** Config keys the registry already owns — callers dedupe legacy sources by this. */
export function registryOwnedConfigKeys(): ReadonlySet<string> {
    return new Set(SETTINGS_CONTROLS.map((control) => control.configKey));
}
