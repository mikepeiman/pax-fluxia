<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        metaballGridFamilyConfigDefaults,
        metaballGridPhaseEdgesModeDefaults,
    } from "$lib/territory/families/metaballGrid/config";
    import TerritorySlaWidget from "./TerritorySlaWidget.svelte";

    type StyleSectionId = "fill" | "border" | "finish";
    type TerritoryStyleFamily =
        | "shared"
        | "metaball_grid"
        | "metaball_grid_phase_edges"
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

    function isMetaballGridFamily(): boolean {
        return (
            styleFamily === "metaball_grid" ||
            styleFamily === "metaball_grid_phase_edges"
        );
    }

    function isPhaseEdgesFamily(): boolean {
        return styleFamily === "metaball_grid_phase_edges";
    }

    function isPerimeterFieldFamily(): boolean {
        return styleFamily === "perimeter_field";
    }

    function currentDistribution(): "square" | "hex_offset" | "jittered" {
        const raw = stringVal(
            "metaballGridDistribution",
            "METABALL_GRID_DISTRIBUTION",
            "square",
        );
        if (raw === "hex_offset") return "hex_offset";
        if (raw === "jittered") return "jittered";
        return "square";
    }

    function currentCellShape(): "square" | "circle" | "diamond" | "hex" {
        const raw = stringVal(
            "metaballGridCellShape",
            "METABALL_GRID_CELL_SHAPE",
            "square",
        );
        if (raw === "circle") return "circle";
        if (raw === "diamond") return "diamond";
        if (raw === "hex") return "hex";
        return "square";
    }

    function currentBorderMode(): "off" | "per_cell" | "territory_edge" {
        const fallback = isPhaseEdgesFamily()
            ? metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_MODE
            : metaballGridFamilyConfigDefaults.METABALL_GRID_BORDER_MODE;
        const raw = stringVal(
            "metaballGridBorderMode",
            "METABALL_GRID_BORDER_MODE",
            fallback,
        );
        if (raw === "per_cell") return "per_cell";
        if (raw === "territory_edge") return "territory_edge";
        return "off";
    }

    function currentBorderBlend(): boolean {
        return boolVal(
            "metaballGridBorderBlend",
            "METABALL_GRID_BORDER_BLEND",
            isPhaseEdgesFamily()
                ? metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_BLEND
                : metaballGridFamilyConfigDefaults.METABALL_GRID_BORDER_BLEND,
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
            isPhaseEdgesFamily()
                ? metaballGridPhaseEdgesModeDefaults.TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE
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

    function canEditFrontierBorderGeometry(): boolean {
        return (
            isPhaseEdgesFamily() &&
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
</script>

{#if sectionHeading}
    <div class="sub-heading">{sectionHeading}</div>
{/if}

{#if intro}
    <div class="var-desc">{intro}</div>
{/if}

<div class="territory-style-stack">
    {#if showSection("fill")}
        <section data-subsection-id="fill">
            <TerritorySlaWidget
                title="Territory fill"
                help={fillHelp}
                {panel}
                {onUpdate}
                configEnabled="METABALL_FILL_ENABLED"
                panelEnabled="metaballFillEnabled"
                defaultEnabled={true}
                enabledLabel="Show fill"
                configSat="METABALL_SATURATION"
                panelSat="metaballSaturation"
                defaultSat={1.05}
                configLight="METABALL_LIGHTNESS"
                panelLight="metaballLightness"
                defaultLight={0.65}
                configAlpha="METABALL_ALPHA"
                panelAlpha="metaballAlpha"
                defaultAlpha={0.5}
            />

            {#if isMetaballGridFamily()}
                <div class="sub-heading territory-style-subheading">Cell Paint</div>
                <div class="var-desc">
                    These are paint-time surface controls. They affect the visible cell
                    primitive and boundary inset, not ownership topology.
                </div>

                <div class="var-row">
                    <div class="row-top">
                        <span class="var-name" title="Per-cell primitive used to paint the visible fill.">
                            Cell Shape
                        </span>
                        <span class="val">
                            {#if currentCellShape() === "square"}Square
                            {:else if currentCellShape() === "circle"}Circle
                            {:else if currentCellShape() === "diamond"}Diamond
                            {:else}Hex{/if}
                        </span>
                    </div>
                    <select
                        class="mode-select"
                        value={currentCellShape()}
                        onchange={(event) => {
                            const value = (event.target as HTMLSelectElement).value;
                            onUpdate(
                                "METABALL_GRID_CELL_SHAPE",
                                "metaballGridCellShape",
                                value,
                            );
                        }}
                    >
                        <option value="square">Square</option>
                        <option value="circle">Circle</option>
                        <option value="diamond">Diamond</option>
                        <option value="hex">Hex</option>
                    </select>
                </div>

                <div class="var-row">
                    <div class="row-top">
                        <span class="var-name" title="Per-cell inward shrink on every side.">
                            Cell Inset
                        </span>
                        <span class="val">{numVal("metaballGridCellInsetPx", "METABALL_GRID_CELL_INSET_PX", 0).toFixed(1)}px</span>
                    </div>
                    <div class="var-desc">
                        Creates visible gridline separation between cells without changing the underlying owner classification.
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="48"
                        step="0.5"
                        value={numVal("metaballGridCellInsetPx", "METABALL_GRID_CELL_INSET_PX", 0)}
                        oninput={(event) => {
                            const value = parseFloat((event.target as HTMLInputElement).value);
                            onUpdate(
                                "METABALL_GRID_CELL_INSET_PX",
                                "metaballGridCellInsetPx",
                                value,
                            );
                        }}
                    />
                </div>

                <div
                    class="var-row"
                    class:disabled={currentCellShape() !== "square"}
                >
                    <div class="row-top">
                        <span class="var-name" title="Rounded-corner radius for square cells only.">
                            Square Corner
                        </span>
                        <span class="val">{numVal("metaballGridCellCornerPx", "METABALL_GRID_CELL_CORNER_PX", 0).toFixed(1)}px</span>
                    </div>
                    <div class="var-desc">
                        Only applies when the cell primitive is Square.
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="48"
                        step="0.5"
                        disabled={currentCellShape() !== "square"}
                        value={numVal("metaballGridCellCornerPx", "METABALL_GRID_CELL_CORNER_PX", 0)}
                        oninput={(event) => {
                            const value = parseFloat((event.target as HTMLInputElement).value);
                            onUpdate(
                                "METABALL_GRID_CELL_CORNER_PX",
                                "metaballGridCellCornerPx",
                                value,
                            );
                        }}
                    />
                </div>

                <div class="var-row">
                    <div class="row-top">
                        <span class="var-name" title="Extra inset applied to boundary / in-transition fill cells.">
                            Inward Offset
                        </span>
                        <span class="val">{numVal("metaballGridInwardOffsetPx", "METABALL_GRID_INWARD_OFFSET_PX", 0).toFixed(0)}px</span>
                    </div>
                    <div class="var-desc">
                        Pulls the visible frontier fill inward from the classified territory edge. In Phase Edges this now drives the phase-surface fill replacement too, not just the legacy base cell paint path.
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="24"
                        step="1"
                        value={numVal("metaballGridInwardOffsetPx", "METABALL_GRID_INWARD_OFFSET_PX", 0)}
                        oninput={(event) => {
                            const value = parseFloat((event.target as HTMLInputElement).value);
                            onUpdate(
                                "METABALL_GRID_INWARD_OFFSET_PX",
                                "metaballGridInwardOffsetPx",
                                value,
                            );
                        }}
                    />
                </div>
            {/if}

            {#if isPerimeterFieldFamily()}
                <div class="sub-heading territory-style-subheading">Perimeter Placement</div>
                <div class="var-row">
                    <div class="row-top">
                        <span class="var-name" title="How far derived perimeter vstars sit inside the source boundary.">
                            Perimeter Inward Offset
                        </span>
                        <span class="val">{numVal("perimeterFieldInwardOffsetPx", "PERIMETER_FIELD_INWARD_OFFSET_PX", 10).toFixed(0)}px</span>
                    </div>
                    <div class="var-desc">
                        Pulls the visible fill surface inward from the sampled source perimeter without changing the source topology.
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="60"
                        step="1"
                        value={numVal("perimeterFieldInwardOffsetPx", "PERIMETER_FIELD_INWARD_OFFSET_PX", 10)}
                        oninput={(event) => {
                            const value = parseFloat((event.target as HTMLInputElement).value);
                            onUpdate(
                                "PERIMETER_FIELD_INWARD_OFFSET_PX",
                                "perimeterFieldInwardOffsetPx",
                                value,
                            );
                        }}
                    />
                </div>
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
                configEnabled="METABALL_BORDER_ENABLED"
                panelEnabled="metaballBorderEnabled"
                defaultEnabled={true}
                enabledLabel="Show border"
                configWidth="METABALL_BORDER_WIDTH"
                panelWidth="metaballBorderWidth"
                defaultWidth={3}
                widthMin={0.5}
                widthMax={12}
                widthStep={0.5}
                configSat="METABALL_BORDER_SATURATION"
                panelSat="metaballBorderSaturation"
                defaultSat={1}
                configLight="METABALL_BORDER_LIGHTNESS"
                panelLight="metaballBorderLightness"
                defaultLight={1}
                configAlpha="METABALL_BORDER_ALPHA"
                panelAlpha="metaballBorderAlpha"
                defaultAlpha={1}
            />

            {#if isMetaballGridFamily()}
                <div class="sub-heading territory-style-subheading">Border Paint</div>
                <div class="var-desc">
                    These controls own the visible border strategy for Metaball Grid surfaces. They no longer live in the tuning cards.
                </div>

                <div class="var-row">
                    <div class="row-top">
                        <span class="var-name" title="Which visible boundary gets stroked.">
                            Border Mode
                        </span>
                        <span class="val">
                            {#if currentBorderMode() === "off"}Off
                            {:else if currentBorderMode() === "per_cell"}Per cell
                            {:else}Territory edge{/if}
                        </span>
                    </div>
                    <div class="var-desc">
                        Per-cell outlines every visible cell. Territory edge only strokes the true owner boundary.
                    </div>
                    <select
                        class="mode-select"
                        value={currentBorderMode()}
                        onchange={(event) => {
                            const value = (event.target as HTMLSelectElement).value;
                            onUpdate(
                                "METABALL_GRID_BORDER_MODE",
                                "metaballGridBorderMode",
                                value,
                            );
                        }}
                    >
                        <option value="off">Off</option>
                        <option value="territory_edge">Territory edge</option>
                        <option value="per_cell">Per cell</option>
                    </select>
                </div>

                <label
                    class="toggle-row"
                    class:disabled={currentBorderMode() === "off" || currentDistribution() !== "square"}
                    title="Centered-blended borders draw a single shared stroke where opposing owners meet. In Per cell mode this overlays only the cross-owner boundaries; same-owner cell lines remain per-cell."
                >
                    <input
                        type="checkbox"
                        disabled={currentBorderMode() === "off" || currentDistribution() !== "square"}
                        checked={currentBorderBlend()}
                        onchange={(event) => {
                            const value = (event.target as HTMLInputElement).checked;
                            onUpdate(
                                "METABALL_GRID_BORDER_BLEND",
                                "metaballGridBorderBlend",
                                value,
                            );
                        }}
                    />
                    <span class="var-name">Centered-blended borders</span>
                    <span class="val">{currentBorderBlend() ? "On" : "Off"}</span>
                </label>
                <div class="var-desc">
                    When enabled on a Square grid, opposing-owner boundaries are drawn once as a shared blended stroke. In Per cell mode that blended stroke is added on top of the per-cell lattice so the actual faction frontier can still read as a single mixed boundary.
                </div>

                <div class="var-row">
                    <div class="row-top">
                        <span class="var-name" title="Chaikin passes applied to the visible border polyline.">
                            Border Chaikin Passes
                        </span>
                        <span class="val">{Math.round(numVal("metaballGridBorderChaikinPasses", "METABALL_GRID_BORDER_CHAIKIN_PASSES", isPhaseEdgesFamily() ? metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES : metaballGridFamilyConfigDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES))}</span>
                    </div>
                    <div class="var-desc">
                        Global visible border smoothing. In Phase Edges this applies to whichever border geometry family is currently selected.
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        value={numVal("metaballGridBorderChaikinPasses", "METABALL_GRID_BORDER_CHAIKIN_PASSES", isPhaseEdgesFamily() ? metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES : metaballGridFamilyConfigDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES)}
                        oninput={(event) => {
                            const value = parseInt((event.target as HTMLInputElement).value, 10);
                            onUpdate(
                                "METABALL_GRID_BORDER_CHAIKIN_PASSES",
                                "metaballGridBorderChaikinPasses",
                                value,
                            );
                        }}
                    />
                </div>
            {/if}

            {#if isPhaseEdgesFamily()}
                <div class="sub-heading territory-style-subheading">Phase Edges Border Geometry</div>

                <div
                    class="var-row"
                    class:disabled={!canEditFrontierBorderGeometry()}
                >
                    <div class="row-top">
                        <span class="var-name" title="Switch between the straighter steady-state border family and the rounded contour-matched family.">
                            Frontier Border Geometry
                        </span>
                        <span class="val">
                            {#if currentFrontierBorderGeometryMode() === "shared_edge"}Straight shared edge
                            {:else}Rounded contour-matched{/if}
                        </span>
                    </div>
                    <div class="var-desc">
                        Only applies on the Phase Edges control path with Square distribution, Territory edge borders, and Centered-blended borders enabled.
                    </div>
                    <select
                        class="mode-select"
                        disabled={!canEditFrontierBorderGeometry()}
                        value={currentFrontierBorderGeometryMode()}
                        onchange={(event) => {
                            const value = (event.target as HTMLSelectElement).value;
                            onUpdate(
                                "TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE",
                                "territoryFrontierBorderGeometryMode",
                                value,
                            );
                        }}
                    >
                        <option value="contour_matched">Rounded contour-matched</option>
                        <option value="shared_edge">Straight shared edge</option>
                    </select>
                </div>

                <div
                    class="var-row"
                    class:disabled={!canEditSharedEdgeControls()}
                >
                    <div class="row-top">
                        <span class="var-name" title="Extra rounding pressure on straight shared-edge control borders.">
                            Shared Edge Smoothing
                        </span>
                        <span class="val">{Math.round(numVal("metaballGridEdgeSmoothingPasses", "METABALL_GRID_EDGE_SMOOTHING_PASSES", metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_SMOOTHING_PASSES))}</span>
                    </div>
                    <div class="var-desc">
                        Only affects the Straight shared edge border family. Rounded contour-matched borders ignore this knob because they already derive from the rounded frontier surface.
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        disabled={!canEditSharedEdgeControls()}
                        value={numVal("metaballGridEdgeSmoothingPasses", "METABALL_GRID_EDGE_SMOOTHING_PASSES", metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_SMOOTHING_PASSES)}
                        oninput={(event) => {
                            const value = parseInt((event.target as HTMLInputElement).value, 10);
                            onUpdate(
                                "METABALL_GRID_EDGE_SMOOTHING_PASSES",
                                "metaballGridEdgeSmoothingPasses",
                                value,
                            );
                        }}
                    />
                </div>

                <div
                    class="var-row"
                    class:disabled={!canEditSharedEdgeJunctionControls()}
                >
                    <div class="row-top">
                        <span class="var-name" title="How straight shared-edge multi-owner junctions are presented.">
                            Junction Render
                        </span>
                        <span class="val">
                            {#if currentFrontierJunctionRenderMode() === "bubble"}Bubble{:else}Gap trim{/if}
                        </span>
                    </div>
                    <div class="var-desc">
                        Controls the three-way-or-more junction treatment on the Straight shared edge border family. Gap trim keeps the trimmed pixel gap; Bubble replaces that gap with a blended multi-owner bubble marker.
                    </div>
                    <select
                        class="mode-select"
                        disabled={!canEditSharedEdgeJunctionControls()}
                        value={currentFrontierJunctionRenderMode()}
                        onchange={(event) => {
                            const value = (event.target as HTMLSelectElement).value;
                            onUpdate(
                                "TERRITORY_FRONTIER_JUNCTION_RENDER_MODE",
                                "territoryFrontierJunctionRenderMode",
                                value,
                            );
                        }}
                    >
                        <option value="gap">Gap trim</option>
                        <option value="bubble">Bubble</option>
                    </select>
                </div>

                <div
                    class="var-row"
                    class:disabled={!canEditSharedEdgeControls()}
                >
                    <div class="row-top">
                        <span class="var-name" title="Trim open straight shared-edge chains inward at their endpoints. This is the low-pixel three-way junction gap slider.">
                            Junction Gap Trim
                        </span>
                        <span class="val">{numVal("metaballGridEdgeTrimPx", "METABALL_GRID_EDGE_TRIM_PX", metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_TRIM_PX).toFixed(1)}px</span>
                    </div>
                    <div class="var-desc">
                        This is the small three-way-junction gap control. On the current straight shared-edge path it also contributes some boundary fill pullback, which is why it affects both the visible endpoint gap and the fill cut.
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="12"
                        step="0.5"
                        disabled={!canEditSharedEdgeControls()}
                        value={numVal("metaballGridEdgeTrimPx", "METABALL_GRID_EDGE_TRIM_PX", metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_TRIM_PX)}
                        oninput={(event) => {
                            const value = parseFloat((event.target as HTMLInputElement).value);
                            onUpdate(
                                "METABALL_GRID_EDGE_TRIM_PX",
                                "metaballGridEdgeTrimPx",
                                value,
                            );
                        }}
                    />
                </div>

                <div
                    class="var-row"
                    class:disabled={!canEditSharedEdgeJunctionControls() || currentFrontierJunctionRenderMode() !== "bubble"}
                >
                    <div class="row-top">
                        <span class="var-name" title="Radius of the blended bubble marker drawn at straight shared-edge junctions with three or more contributing owners.">
                            Junction Bubble Radius
                        </span>
                        <span class="val">{numVal("territoryFrontierJunctionRadiusPx", "TERRITORY_FRONTIER_JUNCTION_RADIUS_PX", 6).toFixed(1)}px</span>
                    </div>
                    <div class="var-desc">
                        Experimental. Draws a small multi-owner bubble at straight shared-edge junctions, using the average of the contributing border colors.
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="16"
                        step="0.5"
                        disabled={!canEditSharedEdgeJunctionControls() || currentFrontierJunctionRenderMode() !== "bubble"}
                        value={numVal("territoryFrontierJunctionRadiusPx", "TERRITORY_FRONTIER_JUNCTION_RADIUS_PX", 6)}
                        oninput={(event) => {
                            const value = parseFloat((event.target as HTMLInputElement).value);
                            onUpdate(
                                "TERRITORY_FRONTIER_JUNCTION_RADIUS_PX",
                                "territoryFrontierJunctionRadiusPx",
                                value,
                            );
                        }}
                    />
                </div>
            {/if}
        </section>
    {/if}

    {#if showSection("finish")}
        <section data-subsection-id="finish">
            <div class="sub-heading territory-style-finish-heading">Finish</div>
            <div class="var-desc">
                Shared post and edge finish for the visible territory surface.
                These affect presentation, not ownership geometry.
            </div>

            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">GPU blur</span><span class="val"
                        >{Math.round(numVal("metaballBlur", "METABALL_BLUR", 0))}</span
                    >
                </div>
                <input
                    type="range"
                    min="0"
                    max="16"
                    step="1"
                    value={numVal("metaballBlur", "METABALL_BLUR", 0)}
                    oninput={(event) => {
                        const value = +(event.target as HTMLInputElement).value;
                        onUpdate("METABALL_BLUR", "metaballBlur", value);
                    }}
                />
            </div>

            <label
                class="toggle-row"
                title="When blur is above 0: off blurs fill only. On applies the blur pass to fill and border strokes together."
            >
                <input
                    type="checkbox"
                    checked={boolVal(
                        "metaballBlurAffectsBorders",
                        "METABALL_BLUR_AFFECTS_BORDERS",
                        false,
                    )}
                    onchange={(event) => {
                        const value = (event.target as HTMLInputElement).checked;
                        onUpdate(
                            "METABALL_BLUR_AFFECTS_BORDERS",
                            "metaballBlurAffectsBorders",
                            value,
                        );
                    }}
                />
                <span class="var-name">Blur affects borders</span>
                <span class="val"
                    >{boolVal(
                        "metaballBlurAffectsBorders",
                        "METABALL_BLUR_AFFECTS_BORDERS",
                        false,
                    )
                        ? "On"
                        : "Off"}</span
                >
            </label>

            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Border Chaikin passes</span><span
                        class="val"
                        >{Math.round(
                            numVal(
                                "metaballChaikinPasses",
                                "METABALL_CHAIKIN_PASSES",
                                0,
                            ),
                        )}</span
                    >
                </div>
                <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    value={numVal(
                        "metaballChaikinPasses",
                        "METABALL_CHAIKIN_PASSES",
                        0,
                    )}
                    oninput={(event) => {
                        const value = +(event.target as HTMLInputElement).value;
                        onUpdate(
                            "METABALL_CHAIKIN_PASSES",
                            "metaballChaikinPasses",
                            value,
                        );
                    }}
                />
            </div>
        </section>
    {/if}
</div>

<style>
    @import "./panel-shared.css";

    .territory-style-stack {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .territory-style-finish-heading {
        margin-top: 10px;
    }

    .territory-style-subheading {
        margin-top: 12px;
    }

    .var-desc {
        margin: 4px 0 10px;
        color: rgba(220, 232, 245, 0.72);
        font-size: 10px;
        line-height: 1.35;
    }

    .sub-heading {
        margin: 12px 0 6px;
        color: rgba(128, 222, 255, 0.92);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    .var-row.disabled,
    .toggle-row.disabled {
        opacity: 0.55;
    }
</style>
