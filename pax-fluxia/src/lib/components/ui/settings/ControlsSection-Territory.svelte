<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-Territory -- Territory Rendering (Voronoi + Metaball)

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
</script>

<CategoryThemeBar category="territory" onApply={() => syncFromConfig?.()} />

<!-- ── Territory Toggles ── -->
<h4 class="sub-heading">Active Layers</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🔷 Voronoi</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryVoronoi ?? true}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    if (v) {
                        GAME_CONFIG.TERRITORY_VORONOI = true;
                        GAME_CONFIG.TERRITORY_METABALL = false;
                        GAME_CONFIG.TERRITORY_PIXEL = false;
                        GAME_CONFIG.TERRITORY_GRAPH = false;
                        updatePanel("territoryVoronoi", true);
                        updatePanel("territoryMetaball", false);
                        updatePanel("territoryPixel", false);
                        updatePanel("territoryGraph", false);
                    } else {
                        GAME_CONFIG.TERRITORY_VORONOI = false;
                        updatePanel("territoryVoronoi", false);
                    }
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🫧 Metaball</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryMetaball ?? false}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    if (v) {
                        GAME_CONFIG.TERRITORY_METABALL = true;
                        GAME_CONFIG.TERRITORY_VORONOI = false;
                        GAME_CONFIG.TERRITORY_PIXEL = false;
                        GAME_CONFIG.TERRITORY_GRAPH = false;
                        updatePanel("territoryMetaball", true);
                        updatePanel("territoryVoronoi", false);
                        updatePanel("territoryPixel", false);
                        updatePanel("territoryGraph", false);
                    } else {
                        GAME_CONFIG.TERRITORY_METABALL = false;
                        updatePanel("territoryMetaball", false);
                    }
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🖼️ Pixel (Classic)</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryPixel ?? false}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    if (v) {
                        GAME_CONFIG.TERRITORY_PIXEL = true;
                        GAME_CONFIG.TERRITORY_VORONOI = false;
                        GAME_CONFIG.TERRITORY_METABALL = false;
                        GAME_CONFIG.TERRITORY_GRAPH = false;
                        updatePanel("territoryPixel", true);
                        updatePanel("territoryVoronoi", false);
                        updatePanel("territoryMetaball", false);
                        updatePanel("territoryGraph", false);
                    } else {
                        GAME_CONFIG.TERRITORY_PIXEL = false;
                        updatePanel("territoryPixel", false);
                    }
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">🔗 Lane Territory</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.territoryGraph ?? false}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    if (v) {
                        GAME_CONFIG.TERRITORY_GRAPH = true;
                        GAME_CONFIG.TERRITORY_VORONOI = false;
                        GAME_CONFIG.TERRITORY_METABALL = false;
                        GAME_CONFIG.TERRITORY_PIXEL = false;
                        updatePanel("territoryGraph", true);
                        updatePanel("territoryVoronoi", false);
                        updatePanel("territoryMetaball", false);
                        updatePanel("territoryPixel", false);
                    } else {
                        GAME_CONFIG.TERRITORY_GRAPH = false;
                        updatePanel("territoryGraph", false);
                    }
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>

{#if panel.territoryGraph}
    <!-- ── Lane Territory Controls ── -->
    <h4 class="sub-heading">Lane Territory Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{(panel.graphAlpha ?? 0.15).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.02"
            max="0.5"
            step="0.01"
            value={panel.graphAlpha ?? 0.15}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.GRAPH_ALPHA = v;
                updatePanel("graphAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lane Influence</span><span class="val"
                >{(panel.laneInfluence ?? 5).toFixed(1)}×
                {(panel.laneInfluence ?? 5) <= 2
                    ? "(subtle)"
                    : (panel.laneInfluence ?? 5) <= 5
                      ? "(moderate)"
                      : "(strong)"}</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={panel.laneInfluence ?? 5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.LANE_INFLUENCE = v;
                updatePanel("laneInfluence", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lane Width</span><span class="val"
                >{panel.laneWidth ?? 60}px</span
            >
        </div>
        <input
            type="range"
            min="20"
            max="200"
            step="5"
            value={panel.laneWidth ?? 60}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.LANE_WIDTH = v;
                updatePanel("laneWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Direct Falloff</span><span class="val"
                >{(panel.laneDirectFalloff ?? 1.0).toFixed(1)}
                {(panel.laneDirectFalloff ?? 1.0) <= 0.5
                    ? "(far reach)"
                    : (panel.laneDirectFalloff ?? 1.0) <= 1.5
                      ? "(natural)"
                      : "(tight)"}</span
            >
        </div>
        <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={panel.laneDirectFalloff ?? 1.0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.LANE_DIRECT_FALLOFF = v;
                updatePanel("laneDirectFalloff", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Resolution</span><span class="val"
                >{panel.graphResolution ?? 4}× downsample</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={panel.graphResolution ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.GRAPH_RESOLUTION = v;
                updatePanel("graphResolution", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blur</span><span class="val"
                >{panel.graphBlur ?? 4}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={panel.graphBlur ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.GRAPH_BLUR = v;
                updatePanel("graphBlur", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pressure</span><span class="val"
                >{(panel.graphPressure ?? 0).toFixed(2)}
                {(panel.graphPressure ?? 0) === 0 ? "(off)" : ""}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.graphPressure ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.GRAPH_PRESSURE = v;
                updatePanel("graphPressure", v);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Fade</span><span class="val"
                >{panel.graphEdgeFade ?? 120}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={panel.graphEdgeFade ?? 120}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.GRAPH_EDGE_FADE = v;
                updatePanel("graphEdgeFade", v);
            }}
        />
    </div>
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔲 Borders
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{panel.graphBorderWidth ?? 1}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={panel.graphBorderWidth ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.GRAPH_BORDER_WIDTH = v;
                updatePanel("graphBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{(panel.graphBorderAlpha ?? 0.6).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.graphBorderAlpha ?? 0.6}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.GRAPH_BORDER_ALPHA = v;
                updatePanel("graphBorderAlpha", v);
            }}
        />
    </div>
{/if}

{#if panel.territoryVoronoi}
    <!-- ── Voronoi Controls ── -->
    <h4 class="sub-heading">Voronoi Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{((panel.voronoiAlpha ?? 0) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.02"
            max="0.4"
            step="0.01"
            value={panel.voronoiAlpha}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.VORONOI_ALPHA = v;
                updatePanel("voronoiAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Blur</span><span class="val"
                >{((panel.voronoiBlur ?? 0) as number).toFixed(0)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={panel.voronoiBlur}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.VORONOI_BLUR = v;
                updatePanel("voronoiBlur", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Smoothing</span><span class="val"
                >{panel.voronoiSmoothing}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={panel.voronoiSmoothing}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.VORONOI_SMOOTHING = v;
                updatePanel("voronoiSmoothing", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Gradient Blend</span>
            <label class="toggle-switch">
                <input
                    type="checkbox"
                    checked={panel.voronoiGradientBlend}
                    onchange={(e) => {
                        const v = (e.target as HTMLInputElement).checked;
                        GAME_CONFIG.VORONOI_GRADIENT_BLEND = v;
                        updatePanel("voronoiGradientBlend", v);
                    }}
                />
                <span class="slider"></span>
            </label>
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blend Width</span><span class="val"
                >{panel.voronoiBlendWidth}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="80"
            step="5"
            value={panel.voronoiBlendWidth}
            disabled={!panel.voronoiGradientBlend}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.VORONOI_BLEND_WIDTH = v;
                updatePanel("voronoiBlendWidth", v);
            }}
        />
    </div>
    <!-- Borders -->
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔲 Borders
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{panel.voronoiBorderWidth}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="8"
            step="0.5"
            value={panel.voronoiBorderWidth}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.VORONOI_BORDER_WIDTH = v;
                updatePanel("voronoiBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{((panel.voronoiBorderAlpha ?? 0) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.voronoiBorderAlpha}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.VORONOI_BORDER_ALPHA = v;
                updatePanel("voronoiBorderAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Brighten</span><span class="val"
                >{panel.voronoiBorderBrighten}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="255"
            step="5"
            value={panel.voronoiBorderBrighten}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.VORONOI_BORDER_BRIGHTEN = v;
                updatePanel("voronoiBorderBrighten", v);
            }}
        />
    </div>
{/if}

<!-- ── Shared Pattern Controls (all modes) ── -->
{#if panel.territoryVoronoi || panel.territoryMetaball || panel.territoryPixel || panel.territoryGraph}
    <h4 class="sub-heading">🔲 Pattern</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Pattern</span><span class="val"
                >{panel.pixelPattern ?? "none"}</span
            >
        </div>
        <select
            class="mode-select"
            value={panel.pixelPattern ?? "none"}
            onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value as
                    | "none"
                    | "stripes"
                    | "crosshatch"
                    | "dots"
                    | "hex";
                GAME_CONFIG.PIXEL_PATTERN = v;
                GAME_CONFIG.GRAPH_PATTERN = v;
                updatePanel("pixelPattern", v);
                updatePanel("graphPattern", v);
            }}
        >
            <option value="none">None</option>
            <option value="stripes">Stripes</option>
            <option value="crosshatch">Crosshatch</option>
            <option value="dots">Dots</option>
            <option value="hex">Hex Grid</option>
        </select>
    </div>
    {#if (panel.pixelPattern ?? "none") === "hex"}
        <!-- Hex-specific controls -->
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Match Board</span>
                <label class="toggle-label">
                    <input
                        type="checkbox"
                        checked={panel.hexMatchBoard ?? false}
                        onchange={(e) => {
                            const v = (e.target as HTMLInputElement).checked;
                            GAME_CONFIG.HEX_MATCH_BOARD = v;
                            updatePanel("hexMatchBoard", v);
                        }}
                    />
                    <span class="val">{panel.hexMatchBoard ? "on" : "off"}</span
                    >
                </label>
            </div>
        </div>
        {#if !(panel.hexMatchBoard ?? false)}
            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Side Length</span><span class="val"
                        >{panel.hexSize ?? 30}px</span
                    >
                </div>
                <input
                    type="range"
                    min="10"
                    max="100"
                    step="2"
                    value={panel.hexSize ?? 30}
                    oninput={(e) => {
                        const v = +(e.target as HTMLInputElement).value;
                        GAME_CONFIG.HEX_SIZE = v;
                        updatePanel("hexSize", v);
                    }}
                />
            </div>
        {/if}
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Gap</span><span class="val"
                    >{panel.hexGap ?? 0}px</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={panel.hexGap ?? 0}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    GAME_CONFIG.HEX_GAP = v;
                    updatePanel("hexGap", v);
                }}
            />
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Line Width</span><span class="val"
                    >{(panel.hexLine ?? 1).toFixed(1)}px</span
                >
            </div>
            <input
                type="range"
                min="0.5"
                max="4"
                step="0.5"
                value={panel.hexLine ?? 1}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    GAME_CONFIG.HEX_LINE = v;
                    updatePanel("hexLine", v);
                }}
            />
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Blur</span><span class="val"
                    >{panel.hexBlur ?? 0}px</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={panel.hexBlur ?? 0}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    GAME_CONFIG.HEX_BLUR = v;
                    updatePanel("hexBlur", v);
                }}
            />
        </div>
    {:else}
        <!-- Generic pattern controls -->
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Pattern Scale</span><span class="val"
                    >{panel.pixelPatternScale ?? 4}</span
                >
            </div>
            <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={panel.pixelPatternScale ?? 4}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    GAME_CONFIG.PIXEL_PATTERN_SCALE = v;
                    GAME_CONFIG.GRAPH_PATTERN_SCALE = v;
                    updatePanel("pixelPatternScale", v);
                    updatePanel("graphPatternScale", v);
                }}
            />
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Pattern Rotation</span><span class="val"
                    >{(panel.pixelPatternRotation ?? 1).toFixed(1)}
                    {(panel.pixelPatternRotation ?? 1) === 0
                        ? "(off)"
                        : ""}</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={panel.pixelPatternRotation ?? 1}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    GAME_CONFIG.PIXEL_PATTERN_ROTATION = v;
                    GAME_CONFIG.GRAPH_PATTERN_ROTATION = v;
                    updatePanel("pixelPatternRotation", v);
                    updatePanel("graphPatternRotation", v);
                }}
            />
        </div>
    {/if}
{/if}

<!-- ── Shared Color Controls (always visible) ── -->
<h4 class="sub-heading">🎨 Territory Color</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Saturation</span><span class="val"
            >{((panel.voronoiSaturation ?? 0) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={panel.voronoiSaturation}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.VORONOI_SATURATION = v;
            updatePanel("voronoiSaturation", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Lightness</span><span class="val"
            >{((panel.voronoiLightness ?? 0) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={panel.voronoiLightness}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.VORONOI_LIGHTNESS = v;
            updatePanel("voronoiLightness", v);
        }}
    />
</div>

{#if panel.territoryPixel}
    <!-- ── Pixel (Classic) Controls ── -->
    <h4 class="sub-heading">Pixel (Classic) Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{(panel.pixelAlpha ?? 0.15).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.02"
            max="0.5"
            step="0.01"
            value={panel.pixelAlpha ?? 0.15}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_ALPHA = v;
                updatePanel("pixelAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Resolution</span><span class="val"
                >{panel.pixelResolution ?? 4}× downsample</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={panel.pixelResolution ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_RESOLUTION = v;
                updatePanel("pixelResolution", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Blend</span><span class="val"
                >{(panel.pixelEdgeBlend ?? 0).toFixed(1)}
                {(panel.pixelEdgeBlend ?? 0) === 0
                    ? "(off)"
                    : "(enemy only)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={panel.pixelEdgeBlend ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_EDGE_BLEND = v;
                updatePanel("pixelEdgeBlend", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blur</span><span class="val"
                >{panel.pixelBlur ?? 4}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={panel.pixelBlur ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_BLUR = v;
                updatePanel("pixelBlur", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Corridor Boost</span><span class="val"
                >{(panel.pixelCorridorBoost ?? 0.3).toFixed(2)}
                {(panel.pixelCorridorBoost ?? 0.3) === 0
                    ? "(off)"
                    : (panel.pixelCorridorBoost ?? 0.3) <= 0.15
                      ? "(light)"
                      : (panel.pixelCorridorBoost ?? 0.3) <= 0.35
                        ? "(natural)"
                        : (panel.pixelCorridorBoost ?? 0.3) <= 0.6
                          ? "(strong)"
                          : "(extreme)"}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            value={panel.pixelCorridorBoost ?? 0.3}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_CORRIDOR_BOOST = v;
                updatePanel("pixelCorridorBoost", v);
            }}
        />
    </div>
    <h4 class="sub-heading">🎨 Hue & Borders</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Hue Shift</span><span class="val"
                >{panel.pixelHueShift ?? 0}°</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={panel.pixelHueShift ?? 0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_HUE_SHIFT = v;
                updatePanel("pixelHueShift", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{panel.pixelBorderWidth ?? 1}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={panel.pixelBorderWidth ?? 1}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_BORDER_WIDTH = v;
                updatePanel("pixelBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{(panel.pixelBorderAlpha ?? 0.6).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.pixelBorderAlpha ?? 0.6}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_BORDER_ALPHA = v;
                updatePanel("pixelBorderAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Brighten</span><span class="val"
                >{panel.pixelBorderBrighten ?? 80}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="255"
            step="5"
            value={panel.pixelBorderBrighten ?? 80}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_BORDER_BRIGHTEN = v;
                updatePanel("pixelBorderBrighten", v);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Fade</span><span class="val"
                >{panel.pixelEdgeFade ?? 200}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={panel.pixelEdgeFade ?? 200}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.PIXEL_EDGE_FADE = v;
                updatePanel("pixelEdgeFade", v);
            }}
        />
    </div>
{/if}

{#if panel.territoryMetaball}
    <!-- ── Metaball Controls ── -->
    <h4 class="sub-heading">Metaball Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Influence Radius</span><span class="val"
                >{panel.metaballRadius ?? 120}px</span
            >
        </div>
        <input
            type="range"
            min="30"
            max="400"
            step="5"
            value={panel.metaballRadius ?? 120}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_INFLUENCE_RADIUS = v;
                updatePanel("metaballRadius", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Falloff</span>
            <select
                class="mode-select"
                value={panel.metaballFalloff ?? "inverse-square"}
                onchange={(e) => {
                    const v = (e.target as HTMLSelectElement).value as any;
                    GAME_CONFIG.METABALL_FALLOFF = v;
                    updatePanel("metaballFalloff", v);
                }}
            >
                <option value="inverse-square">Inverse Square</option>
                <option value="gaussian">Gaussian</option>
                <option value="smoothstep">Smoothstep</option>
            </select>
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blend Sharpness</span><span class="val"
                >{(panel.metaballSharpness ?? 3.0).toFixed(1)}</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={panel.metaballSharpness ?? 3.0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_BLEND_SHARPNESS = v;
                updatePanel("metaballSharpness", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{(panel.metaballAlpha ?? 0.5).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.05"
            max="1.0"
            step="0.05"
            value={panel.metaballAlpha ?? 0.5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_ALPHA = v;
                updatePanel("metaballAlpha", v);
            }}
        />
    </div>
    <!-- Advanced -->
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        ⚙️ Advanced
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Cell Size</span><span class="val"
                >{panel.metaballCellSize ?? 8}px</span
            >
        </div>
        <input
            type="range"
            min="2"
            max="20"
            step="1"
            value={panel.metaballCellSize ?? 8}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_CELL_SIZE = v;
                updatePanel("metaballCellSize", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Threshold</span><span class="val"
                >{(panel.metaballThreshold ?? 0.05).toFixed(3)}</span
            >
        </div>
        <input
            type="range"
            min="0.005"
            max="0.3"
            step="0.005"
            value={panel.metaballThreshold ?? 0.05}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_THRESHOLD = v;
                updatePanel("metaballThreshold", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Strength</span><span class="val"
                >{(panel.metaballStrength ?? 1.0).toFixed(1)}×</span
            >
        </div>
        <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={panel.metaballStrength ?? 1.0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_STRENGTH_MULT = v;
                updatePanel("metaballStrength", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Fade</span><span class="val"
                >{(panel.metaballEdgeFade ?? 3.0).toFixed(1)}</span
            >
        </div>
        <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={panel.metaballEdgeFade ?? 3.0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_EDGE_FADE = v;
                updatePanel("metaballEdgeFade", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Coverage</span><span class="val"
                >{(panel.metaballCoverage ?? 0.3).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={panel.metaballCoverage ?? 0.3}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_COVERAGE = v;
                updatePanel("metaballCoverage", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blur</span><span class="val"
                >{panel.metaballBlur ?? 4}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={panel.metaballBlur ?? 4}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_BLUR = v;
                updatePanel("metaballBlur", v);
            }}
        />
    </div>
    <!-- Borders -->
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔲 Borders
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{(panel.metaballBorderWidth ?? 1.5).toFixed(1)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="6"
            step="0.5"
            value={panel.metaballBorderWidth ?? 1.5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_BORDER_WIDTH = v;
                updatePanel("metaballBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{(panel.metaballBorderAlpha ?? 0.6).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.metaballBorderAlpha ?? 0.6}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.METABALL_BORDER_ALPHA = v;
                updatePanel("metaballBorderAlpha", v);
            }}
        />
    </div>
{/if}

<style>
    @import "./panel-shared.css";
    .sub-heading {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #aaa;
        margin: 12px 0 6px;
        padding: 0 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 3px;
    }
    .var-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 2px 4px;
    }
    .row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .var-name {
        font-size: 11px;
        color: #ccc;
    }
    .val {
        font-size: 10px;
        color: #888;
        font-family: monospace;
    }
    .mode-select {
        background: rgba(255, 255, 255, 0.08);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        font-size: 11px;
        padding: 2px 6px;
        cursor: pointer;
    }
    .mode-select:focus {
        outline: 1px solid rgba(100, 180, 255, 0.5);
    }
    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 28px;
        height: 14px;
    }
    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        transition: 0.2s;
    }
    .toggle-slider::before {
        position: absolute;
        content: "";
        height: 10px;
        width: 10px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        border-radius: 50%;
        transition: 0.2s;
    }
    .toggle-switch input:checked + .toggle-slider {
        background-color: #4ade80;
    }
    .toggle-switch input:checked + .toggle-slider::before {
        transform: translateX(14px);
    }
    input[type="range"] {
        width: 100%;
        height: 4px;
        appearance: none;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 2px;
        outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #4ade80;
        cursor: pointer;
    }
    .grayed {
        color: #888;
    }
</style>
