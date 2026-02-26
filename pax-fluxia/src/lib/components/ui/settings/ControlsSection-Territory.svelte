<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-Territory -- Territory Rendering (Voronoi + Metaball)

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();
</script>

<!-- ── Territory Mode ── -->
<h4 class="sub-heading">Territory Mode</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Renderer</span>
        <select
            class="mode-select"
            value={panel.territoryMode ?? "voronoi"}
            onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value as
                    | "voronoi"
                    | "metaball"
                    | "off";
                GAME_CONFIG.TERRITORY_MODE = v;
                updatePanel("territoryMode", v);
            }}
        >
            <option value="voronoi">Voronoi</option>
            <option value="metaball">Metaball</option>
            <option value="off">Off</option>
        </select>
    </div>
</div>

<!-- ── Voronoi Controls ── -->
{#if (panel.territoryMode ?? "voronoi") === "voronoi"}
    <h4 class="sub-heading">Voronoi Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Show Voronoi</span>
            <label class="toggle-switch">
                <input
                    type="checkbox"
                    checked={panel.showVoronoi}
                    onchange={(e) => {
                        const v = (e.target as HTMLInputElement).checked;
                        GAME_CONFIG.SHOW_VORONOI = v;
                        updatePanel("showVoronoi", v);
                    }}
                />
                <span class="toggle-slider"></span>
            </label>
        </div>
    </div>
    {#if panel.showVoronoi}
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Alpha</span><span class="val"
                    >{(panel.voronoiAlpha as number).toFixed(2)}</span
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
                    >{(panel.voronoiBlur as number).toFixed(0)}px</span
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
                    >{(panel.voronoiBorderAlpha as number).toFixed(2)}</span
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
        <!-- Color -->
        <div
            class="var-row grayed"
            style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
        >
            🎨 Color
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Saturation</span><span class="val"
                    >{(panel.voronoiSaturation as number).toFixed(2)}</span
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
                    >{(panel.voronoiLightness as number).toFixed(2)}</span
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
    {/if}
{/if}

<!-- ── Metaball Controls ── -->
{#if (panel.territoryMode ?? "voronoi") === "metaball"}
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
{/if}

<style>
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
