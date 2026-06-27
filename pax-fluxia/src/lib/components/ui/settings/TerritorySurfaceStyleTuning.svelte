<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        cellGridFamilyConfigDefaults,
        cellGridPhaseEdgesModeDefaults,
    } from "$lib/territory/families/cellGrid/config";
    import {
        PaxInfoHint,
        PaxSettingsRangeRow,
        PaxSettingsSegmentedRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";
    import TerritorySlaWidget from "./TerritorySlaWidget.svelte";

    type StyleSectionId = "fill" | "border" | "finish";
    type TerritoryStyleFamily =
        | "shared"
        | "cell_grid"
        | "phase_edges"
        | "ember_lattice"
        | "perimeter_field";

    interface Props {
        panel: Record<string, unknown>;
        onUpdate: (
            configKey: string,
            panelKey: string,
            value: string | number | boolean,
        ) => void;
        sectionHeading?: string | null;
        intro?: string;
        fillHelp?: string;
        borderHelp?: string;
        activeSection?: "all" | "none" | StyleSectionId;
        showFinishSection?: boolean;
        styleFamily?: TerritoryStyleFamily;
    }

    const CELL_SHAPE_OPTIONS = [
        { value: "square", label: "Square" },
        { value: "circle", label: "Circle" },
        { value: "diamond", label: "Diamond" },
        { value: "hex", label: "Hex" },
    ];

    const BORDER_MODE_OPTIONS = [
        { value: "off", label: "Off" },
        { value: "territory_edge", label: "Edge" },
        { value: "per_cell", label: "Per cell" },
    ];

    const FRONTIER_BORDER_GEOMETRY_OPTIONS = [
        { value: "contour_matched", label: "Contour" },
        { value: "shared_edge", label: "Shared edge" },
    ];

    const JUNCTION_RENDER_OPTIONS = [
        { value: "gap", label: "Gap trim" },
        { value: "bubble", label: "Bubble" },
    ];

    let {
        panel,
        onUpdate,
        sectionHeading = "Style",
        intro = "",
        fillHelp = "Hue stays player-owned; adjust saturation, lightness, alpha, or disable fill entirely.",
        borderHelp = "Shared border surface controls for width, saturation, lightness, alpha, or disable borders entirely.",
        activeSection = "all",
        showFinishSection = true,
        styleFamily = "shared",
    }: Props = $props();

    function numVal(panelKey: string, configKey: string, def: number): number {
        const pv = panel[panelKey];
        if (typeof pv === "number" && !Number.isNaN(pv)) return pv;
        const cv = (GAME_CONFIG as unknown as Record<string, unknown>)[
            configKey
        ];
        if (typeof cv === "number" && !Number.isNaN(cv)) return cv;
        return def;
    }

    function boolVal(panelKey: string, configKey: string, def: boolean): boolean {
        const pv = panel[panelKey];
        if (typeof pv === "boolean") return pv;
        const cv = (GAME_CONFIG as unknown as Record<string, unknown>)[
            configKey
        ];
        if (typeof cv === "boolean") return cv;
        return def;
    }

    function stringVal(panelKey: string, configKey: string, def: string): string {
        const pv = panel[panelKey];
        if (typeof pv === "string") return pv;
        const cv = (GAME_CONFIG as unknown as Record<string, unknown>)[
            configKey
        ];
        if (typeof cv === "string") return cv;
        return def;
    }

    function showSection(sectionId: StyleSectionId): boolean {
        if (sectionId === "finish" && !showFinishSection) return false;
        return activeSection === "all" || activeSection === sectionId;
    }

    function isCellGridFamily(): boolean {
        return (
            styleFamily === "cell_grid" ||
            styleFamily === "phase_edges" ||
            styleFamily === "ember_lattice"
        );
    }

    function isPhaseEdgesFamily(): boolean {
        return styleFamily === "phase_edges";
    }

    function isEmberLatticeFamily(): boolean {
        return styleFamily === "ember_lattice";
    }

    function usesEdgeForwardDefaults(): boolean {
        return isPhaseEdgesFamily() || isEmberLatticeFamily();
    }

    function isPerimeterFieldFamily(): boolean {
        return styleFamily === "perimeter_field";
    }

    function currentDistribution(): "square" | "hex_offset" | "jittered" {
        const raw = stringVal(
            "cellGridDistribution",
            "CELL_GRID_DISTRIBUTION",
            "square",
        );
        if (raw === "hex_offset") return "hex_offset";
        if (raw === "jittered") return "jittered";
        return "square";
    }

    function currentCellShape(): "square" | "circle" | "diamond" | "hex" {
        const raw = stringVal(
            "cellGridCellShape",
            "CELL_GRID_CELL_SHAPE",
            "square",
        );
        if (raw === "circle") return "circle";
        if (raw === "diamond") return "diamond";
        if (raw === "hex") return "hex";
        return "square";
    }

    function currentBorderMode(): "off" | "per_cell" | "territory_edge" {
        const fallback = usesEdgeForwardDefaults()
            ? cellGridPhaseEdgesModeDefaults.CELL_GRID_BORDER_MODE
            : cellGridFamilyConfigDefaults.CELL_GRID_BORDER_MODE;
        const raw = stringVal(
            "cellGridBorderMode",
            "CELL_GRID_BORDER_MODE",
            fallback,
        );
        if (raw === "per_cell") return "per_cell";
        if (raw === "territory_edge") return "territory_edge";
        return "off";
    }

    function currentBorderBlend(): boolean {
        return boolVal(
            "cellGridBorderBlend",
            "CELL_GRID_BORDER_BLEND",
            usesEdgeForwardDefaults()
                ? cellGridPhaseEdgesModeDefaults.CELL_GRID_BORDER_BLEND
                : cellGridFamilyConfigDefaults.CELL_GRID_BORDER_BLEND,
        );
    }

    function currentFrontierTechnique():
        | "control"
        | "shader_frontier_band"
        | "marching_squares_midpoint"
        | "marching_squares_scalar"
        | "marching_triangles_fixed"
        | "marching_triangles_checkerboard"
        | "marching_triangles_gradient" {
        const raw = stringVal(
            "territoryFrontierTechnique",
            "TERRITORY_FRONTIER_TECHNIQUE",
            "control",
        );
        if (
            raw === "shader_frontier_band" ||
            raw === "marching_squares_midpoint" ||
            raw === "marching_squares_scalar" ||
            raw === "marching_triangles_fixed" ||
            raw === "marching_triangles_checkerboard" ||
            raw === "marching_triangles_gradient"
        ) {
            return raw;
        }
        return "control";
    }

    function currentFrontierBorderGeometryMode():
        | "shared_edge"
        | "contour_matched" {
        const raw = stringVal(
            "territoryFrontierBorderGeometryMode",
            "TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE",
            isEmberLatticeFamily()
                ? cellGridPhaseEdgesModeDefaults.TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE
                : "shared_edge",
        );
        return raw === "contour_matched" ? "contour_matched" : "shared_edge";
    }

    function currentFrontierJunctionRenderMode(): "gap" | "bubble" {
        const raw = stringVal(
            "territoryFrontierJunctionRenderMode",
            "TERRITORY_FRONTIER_JUNCTION_RENDER_MODE",
            "gap",
        );
        return raw === "bubble" ? "bubble" : "gap";
    }

    function currentFrontierOuterBorderEnabled(): boolean {
        return boolVal(
            "territoryFrontierOuterBorderEnabled",
            "TERRITORY_FRONTIER_OUTER_BORDER_ENABLED",
            usesEdgeForwardDefaults()
                ? cellGridPhaseEdgesModeDefaults.TERRITORY_FRONTIER_OUTER_BORDER_ENABLED
                : false,
        );
    }

    function currentBoundaryFillFlush(): boolean {
        return boolVal(
            "cellGridBoundaryFillFlush",
            "CELL_GRID_BOUNDARY_FILL_FLUSH",
            usesEdgeForwardDefaults()
                ? cellGridPhaseEdgesModeDefaults.CELL_GRID_BOUNDARY_FILL_FLUSH
                : cellGridFamilyConfigDefaults.CELL_GRID_BOUNDARY_FILL_FLUSH,
        );
    }

    function canEditFrontierBorderGeometry(): boolean {
        return (
            isEmberLatticeFamily() &&
            currentFrontierTechnique() === "control" &&
            currentDistribution() === "square" &&
            currentBorderMode() === "territory_edge" &&
            currentBorderBlend()
        );
    }

    function canEditSharedEdgeControls(): boolean {
        return (
            canEditFrontierBorderGeometry() &&
            currentFrontierBorderGeometryMode() === "shared_edge"
        );
    }

    function canEditSharedEdgeJunctionControls(): boolean {
        return canEditSharedEdgeControls();
    }

    function sharedEdgeControlGateReason(): string | null {
        if (!isEmberLatticeFamily()) {
            return "Only applies to Ember Lattice.";
        }
        if (currentFrontierTechnique() !== "control") {
            return "Requires Frontier Technique = Current control.";
        }
        if (currentDistribution() !== "square") {
            return "Requires Distribution = Square.";
        }
        if (currentBorderMode() !== "territory_edge") {
            return "Requires Border Mode = Territory edge.";
        }
        if (!currentBorderBlend()) {
            return "Requires Centered-blended borders = On.";
        }
        if (currentFrontierBorderGeometryMode() !== "shared_edge") {
            return "Requires Frontier Border Geometry = Straight shared edge.";
        }
        return null;
    }
</script>

{#if sectionHeading}
    <div class="sub-heading">
        {sectionHeading}
        {#if intro}<PaxInfoHint text={intro} />{/if}
    </div>
{:else if intro}
    <PaxInfoHint text={intro} />
{/if}

<div class="territory-style-stack">
    {#if showSection("fill")}
        <section data-subsection-id="fill">
            <TerritorySlaWidget
                title="Territory fill"
                help={fillHelp}
                {panel}
                {onUpdate}
                configEnabled="TERRITORY_SURFACE_FILL_ENABLED"
                panelEnabled="territorySurfaceFillEnabled"
                defaultEnabled={true}
                enabledLabel="Show fill"
                configSat="TERRITORY_SURFACE_SATURATION"
                panelSat="territorySurfaceSaturation"
                defaultSat={1.05}
                configLight="TERRITORY_SURFACE_LIGHTNESS"
                panelLight="territorySurfaceLightness"
                defaultLight={0.65}
                configAlpha="TERRITORY_SURFACE_ALPHA"
                panelAlpha="territorySurfaceAlpha"
                defaultAlpha={0.5}
            />

            {#if isCellGridFamily()}
                <div class="sub-heading territory-style-subheading">
                    Cell Paint
                    <PaxInfoHint text="Paint-time surface controls. They affect the visible cell primitive and boundary inset, not ownership topology." />
                </div>

                <PaxSettingsSegmentedRow
                    label="Cell Shape"
                    hint="Visual primitive drawn per cell: Square, Circle, Diamond, or Hex."
                    value={currentCellShape()}
                    options={CELL_SHAPE_OPTIONS}
                    settingConfigKey="CELL_GRID_CELL_SHAPE"
                    onValueChange={(value) => {
                        onUpdate(
                            "CELL_GRID_CELL_SHAPE",
                            "cellGridCellShape",
                            value,
                        );
                    }}
                />

                <PaxSettingsRangeRow
                    label="Cell Inset"
                    note="Creates visible gridline separation between cells without changing owner classification."
                    value={numVal("cellGridCellInsetPx", "CELL_GRID_CELL_INSET_PX", 0)}
                    min={0}
                    max={48}
                    step={0.5}
                    output={`${numVal("cellGridCellInsetPx", "CELL_GRID_CELL_INSET_PX", 0).toFixed(1)}px`}
                    settingConfigKey="CELL_GRID_CELL_INSET_PX"
                    onInput={(value) => {
                        onUpdate(
                            "CELL_GRID_CELL_INSET_PX",
                            "cellGridCellInsetPx",
                            value,
                        );
                    }}
                />

                <PaxSettingsRangeRow
                    label="Square Corner"
                    note="Only applies when the cell primitive is Square."
                    value={numVal("cellGridCellCornerPx", "CELL_GRID_CELL_CORNER_PX", 0)}
                    min={0}
                    max={48}
                    step={0.5}
                    output={`${numVal("cellGridCellCornerPx", "CELL_GRID_CELL_CORNER_PX", 0).toFixed(1)}px`}
                    disabled={currentCellShape() !== "square"}
                    settingConfigKey="CELL_GRID_CELL_CORNER_PX"
                    onInput={(value) => {
                        onUpdate(
                            "CELL_GRID_CELL_CORNER_PX",
                            "cellGridCellCornerPx",
                            value,
                        );
                    }}
                />

                <PaxSettingsToggleRow
                    label="Boundary fill matches border"
                    checked={currentBoundaryFillFlush()}
                    description="Keeps the visible fill locked to the visible territory frontier."
                    meta={currentBoundaryFillFlush() ? "On" : "Off"}
                    settingConfigKey="CELL_GRID_BOUNDARY_FILL_FLUSH"
                    onChange={(value) => {
                        onUpdate(
                            "CELL_GRID_BOUNDARY_FILL_FLUSH",
                            "cellGridBoundaryFillFlush",
                            value,
                        );
                    }}
                />

                <PaxSettingsRangeRow
                    label="Inward Offset"
                    note="Adds explicit pullback from the visible territory frontier."
                    value={numVal("cellGridInwardOffsetPx", "CELL_GRID_INWARD_OFFSET_PX", 0)}
                    min={0}
                    max={60}
                    step={1}
                    suffix="px"
                    settingConfigKey="CELL_GRID_INWARD_OFFSET_PX"
                    onInput={(value) => {
                        onUpdate(
                            "CELL_GRID_INWARD_OFFSET_PX",
                            "cellGridInwardOffsetPx",
                            value,
                        );
                    }}
                />
            {/if}

            {#if isPerimeterFieldFamily()}
                <div class="sub-heading territory-style-subheading">Perimeter Placement</div>
                <PaxSettingsRangeRow
                    label="Perimeter Inward Offset"
                    note="Pulls the visible fill surface inward from the sampled source perimeter without changing source topology."
                    value={numVal("perimeterFieldInwardOffsetPx", "PERIMETER_FIELD_INWARD_OFFSET_PX", 10)}
                    min={0}
                    max={60}
                    step={1}
                    suffix="px"
                    settingConfigKey="PERIMETER_FIELD_INWARD_OFFSET_PX"
                    onInput={(value) => {
                        onUpdate(
                            "PERIMETER_FIELD_INWARD_OFFSET_PX",
                            "perimeterFieldInwardOffsetPx",
                            value,
                        );
                    }}
                />
            {/if}
        </section>
    {/if}

    {#if showSection("border")}
        <section data-subsection-id="border">
            <TerritorySlaWidget
                title="Territory border"
                help={borderHelp}
                {panel}
                {onUpdate}
                configEnabled="TERRITORY_SURFACE_BORDER_ENABLED"
                panelEnabled="territorySurfaceBorderEnabled"
                defaultEnabled={true}
                enabledLabel="Show border"
                configWidth="TERRITORY_SURFACE_BORDER_WIDTH"
                panelWidth="territorySurfaceBorderWidth"
                defaultWidth={3}
                widthMin={0.5}
                widthMax={12}
                widthStep={0.5}
                configSat="TERRITORY_SURFACE_BORDER_SATURATION"
                panelSat="territorySurfaceBorderSaturation"
                defaultSat={1}
                configLight="TERRITORY_SURFACE_BORDER_LIGHTNESS"
                panelLight="territorySurfaceBorderLightness"
                defaultLight={1}
                configAlpha="TERRITORY_SURFACE_BORDER_ALPHA"
                panelAlpha="territorySurfaceBorderAlpha"
                defaultAlpha={1}
            />

            {#if isCellGridFamily()}
                <div class="sub-heading territory-style-subheading">
                    Border Paint
                    <PaxInfoHint text="These controls own the visible border strategy for Cell Grid surfaces. Note: Inward Offset lives in the Fill subsection because it changes the visible fill frontier rather than the stroke itself." />
                </div>

                <PaxSettingsSegmentedRow
                    label="Border Mode"
                    hint="Where to draw the Territory border stroke: Off, Edge (ownership boundaries only), or Per cell (full grid outline)."
                    value={currentBorderMode()}
                    options={BORDER_MODE_OPTIONS}
                    settingConfigKey="CELL_GRID_BORDER_MODE"
                    onValueChange={(value) => {
                        onUpdate(
                            "CELL_GRID_BORDER_MODE",
                            "cellGridBorderMode",
                            value,
                        );
                    }}
                />

                <PaxSettingsToggleRow
                    label="Centered-blended borders"
                    checked={currentBorderBlend()}
                    disabled={currentBorderMode() === "off" || currentDistribution() !== "square"}
                    description="Draws a single shared stroke where opposing owners meet."
                    meta={currentBorderBlend() ? "On" : "Off"}
                    settingConfigKey="CELL_GRID_BORDER_BLEND"
                    onChange={(value) => {
                        onUpdate(
                            "CELL_GRID_BORDER_BLEND",
                            "cellGridBorderBlend",
                            value,
                        );
                    }}
                />

                {#if usesEdgeForwardDefaults()}
                    <PaxSettingsToggleRow
                        label="Outer perimeter border"
                        checked={currentFrontierOuterBorderEnabled()}
                        disabled={currentBorderMode() === "off"}
                        description="Draw the owner-vs-world perimeter around the filled map area — a first-class perimeter, not the same as the internal faction frontiers."
                        meta={currentFrontierOuterBorderEnabled() ? "On" : "Off"}
                        settingConfigKey="TERRITORY_FRONTIER_OUTER_BORDER_ENABLED"
                        onChange={(value) => {
                            onUpdate(
                                "TERRITORY_FRONTIER_OUTER_BORDER_ENABLED",
                                "territoryFrontierOuterBorderEnabled",
                                value,
                            );
                        }}
                    />
                {/if}

                <PaxSettingsRangeRow
                    label="Border Chaikin Passes"
                    note="Global visible border smoothing."
                    value={numVal("cellGridBorderChaikinPasses", "CELL_GRID_BORDER_CHAIKIN_PASSES", usesEdgeForwardDefaults() ? cellGridPhaseEdgesModeDefaults.CELL_GRID_BORDER_CHAIKIN_PASSES : cellGridFamilyConfigDefaults.CELL_GRID_BORDER_CHAIKIN_PASSES)}
                    min={0}
                    max={4}
                    step={1}
                    settingConfigKey="CELL_GRID_BORDER_CHAIKIN_PASSES"
                    onInput={(value) => {
                        onUpdate(
                            "CELL_GRID_BORDER_CHAIKIN_PASSES",
                            "cellGridBorderChaikinPasses",
                            value,
                        );
                    }}
                />
            {/if}

            {#if isEmberLatticeFamily()}
                <div class="sub-heading territory-style-subheading">Ember Lattice Border Geometry</div>

                <PaxSettingsSegmentedRow
                    label="Frontier Border Geometry"
                    hint="Border path for the Ember Lattice frontier: Contour (rounded, contour-matched) or Shared edge (straight)."
                    value={currentFrontierBorderGeometryMode()}
                    options={FRONTIER_BORDER_GEOMETRY_OPTIONS}
                    disabled={!canEditFrontierBorderGeometry()}
                    settingConfigKey="TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE"
                    onValueChange={(value) => {
                        onUpdate(
                            "TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE",
                            "territoryFrontierBorderGeometryMode",
                            value,
                        );
                    }}
                />

                <PaxSettingsRangeRow
                    label="Shared Edge Smoothing"
                    note={sharedEdgeControlGateReason() ??
                        "Only affects the Straight shared edge border family."}
                    value={numVal("cellGridEdgeSmoothingPasses", "CELL_GRID_EDGE_SMOOTHING_PASSES", cellGridPhaseEdgesModeDefaults.CELL_GRID_EDGE_SMOOTHING_PASSES)}
                    min={0}
                    max={4}
                    step={1}
                    disabled={!canEditSharedEdgeControls()}
                    settingConfigKey="CELL_GRID_EDGE_SMOOTHING_PASSES"
                    onInput={(value) => {
                        onUpdate(
                            "CELL_GRID_EDGE_SMOOTHING_PASSES",
                            "cellGridEdgeSmoothingPasses",
                            value,
                        );
                    }}
                />

                <PaxSettingsSegmentedRow
                    label="Junction Render"
                    hint="How shared-edge junctions are drawn: Gap trim or Bubble."
                    value={currentFrontierJunctionRenderMode()}
                    options={JUNCTION_RENDER_OPTIONS}
                    disabled={!canEditSharedEdgeJunctionControls()}
                    settingConfigKey="TERRITORY_FRONTIER_JUNCTION_RENDER_MODE"
                    onValueChange={(value) => {
                        onUpdate(
                            "TERRITORY_FRONTIER_JUNCTION_RENDER_MODE",
                            "territoryFrontierJunctionRenderMode",
                            value,
                        );
                    }}
                />

                <PaxSettingsRangeRow
                    label="Junction Gap Trim"
                    note={sharedEdgeControlGateReason() ??
                        "Trims open straight shared-edge chains at multi-owner junctions."}
                    value={numVal("cellGridEdgeTrimPx", "CELL_GRID_EDGE_TRIM_PX", cellGridPhaseEdgesModeDefaults.CELL_GRID_EDGE_TRIM_PX)}
                    min={0}
                    max={12}
                    step={0.5}
                    output={`${numVal("cellGridEdgeTrimPx", "CELL_GRID_EDGE_TRIM_PX", cellGridPhaseEdgesModeDefaults.CELL_GRID_EDGE_TRIM_PX).toFixed(1)}px`}
                    disabled={!canEditSharedEdgeControls()}
                    settingConfigKey="CELL_GRID_EDGE_TRIM_PX"
                    onInput={(value) => {
                        onUpdate(
                            "CELL_GRID_EDGE_TRIM_PX",
                            "cellGridEdgeTrimPx",
                            value,
                        );
                    }}
                />

                <PaxSettingsRangeRow
                    label="Junction Bubble Radius"
                    note="Draws a small multi-owner bubble at straight shared-edge junctions."
                    value={numVal("territoryFrontierJunctionRadiusPx", "TERRITORY_FRONTIER_JUNCTION_RADIUS_PX", 6)}
                    min={0}
                    max={16}
                    step={0.5}
                    output={`${numVal("territoryFrontierJunctionRadiusPx", "TERRITORY_FRONTIER_JUNCTION_RADIUS_PX", 6).toFixed(1)}px`}
                    disabled={!canEditSharedEdgeJunctionControls() || currentFrontierJunctionRenderMode() !== "bubble"}
                    settingConfigKey="TERRITORY_FRONTIER_JUNCTION_RADIUS_PX"
                    onInput={(value) => {
                        onUpdate(
                            "TERRITORY_FRONTIER_JUNCTION_RADIUS_PX",
                            "territoryFrontierJunctionRadiusPx",
                            value,
                        );
                    }}
                />
            {/if}
        </section>
    {/if}

    {#if showSection("finish")}
        <section data-subsection-id="finish">
            <div class="sub-heading territory-style-finish-heading">
                Finish
                <PaxInfoHint text="Shared post and edge finish for the visible territory surface. These affect presentation, not ownership geometry." />
            </div>

            <PaxSettingsRangeRow
                label="GPU Blur"
                value={numVal("metaballBlur", "METABALL_BLUR", 0)}
                min={0}
                max={16}
                step={1}
                settingConfigKey="METABALL_BLUR"
                onInput={(value) => {
                    onUpdate("METABALL_BLUR", "metaballBlur", value);
                }}
            />

            <PaxSettingsToggleRow
                label="Blur affects borders"
                checked={boolVal(
                    "metaballBlurAffectsBorders",
                    "METABALL_BLUR_AFFECTS_BORDERS",
                    false,
                )}
                description="When blur is above 0, apply the blur pass to fill and border strokes together."
                meta={boolVal(
                    "metaballBlurAffectsBorders",
                    "METABALL_BLUR_AFFECTS_BORDERS",
                    false,
                )
                    ? "On"
                    : "Off"}
                settingConfigKey="METABALL_BLUR_AFFECTS_BORDERS"
                onChange={(value) => {
                    onUpdate(
                        "METABALL_BLUR_AFFECTS_BORDERS",
                        "metaballBlurAffectsBorders",
                        value,
                    );
                }}
            />

            <PaxSettingsRangeRow
                label="Border Chaikin Passes"
                value={numVal(
                    "metaballChaikinPasses",
                    "METABALL_CHAIKIN_PASSES",
                    0,
                )}
                min={0}
                max={4}
                step={1}
                settingConfigKey="METABALL_CHAIKIN_PASSES"
                onInput={(value) => {
                    onUpdate(
                        "METABALL_CHAIKIN_PASSES",
                        "metaballChaikinPasses",
                        value,
                    );
                }}
            />
        </section>
    {/if}
</div>

<style>

    .territory-style-stack {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-xs);
    }

    .territory-style-finish-heading {
        margin-top: var(--pax-gap-sm);
    }

    .territory-style-subheading {
        margin-top: var(--pax-space-3);
    }

    .sub-heading {
        display: flex;
        align-items: center;
        gap: var(--pax-space-2);
        margin: var(--pax-space-3) 0 var(--pax-gap-xs);
        color: color-mix(in srgb, var(--pax-ui-accent) 92%, transparent);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

</style>
