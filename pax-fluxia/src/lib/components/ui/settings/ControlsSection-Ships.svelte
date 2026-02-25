<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-SHIPS â€” In-Game Settings Controls: Ship Appearance
    // Extracted from GameSettingsPanel.svelte

    let {
    panel: Record<string, any>,
    updatePanel: (key: string, value: any) => void,

    } = $props();
</script>

<!-- ── Ship Size & Shape ── -->
<h4 class="sub-heading">Ship Size & Shape</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Visual Radius</span><span
            class="val"
            >{(GAME_CONFIG.SHIP_VISUAL_RADIUS ?? 3).toFixed(
                1,
            )}</span
        >
    </div>
    <input
        type="range"
        min="1"
        max="8"
        step="0.5"
        value={GAME_CONFIG.SHIP_VISUAL_RADIUS ?? 3}
        oninput={(e) => {
            GAME_CONFIG.SHIP_VISUAL_RADIUS = +(
                e.target as HTMLInputElement
            ).value;
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Scale Multiplier</span><span
            class="val"
            >{(panel.shipScaleMult as number).toFixed(
                1,
            )}×</span
        >
    </div>
    <input
        type="range"
        min="0.3"
        max="3.0"
        step="0.1"
        value={panel.shipScaleMult}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.SHIP_SCALE_MULT = v;
            updatePanel("shipScaleMult", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <label class="toggle-label"
            ><input
                type="checkbox"
                checked={panel.shipOutlineOn}
                onchange={() => {
                    panel.shipOutlineOn =
                        !panel.shipOutlineOn;
                    GAME_CONFIG.SHIP_OUTLINE_ON =
                        panel.shipOutlineOn as boolean;
                    updatePanel(
                        "shipOutlineOn",
                        panel.shipOutlineOn,
                    );
                }}
            /> Ship Outline</label
        >
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Outline px</span><span
            class="val"
            >{(panel.shipOutlinePx as number).toFixed(
                1,
            )}</span
        >
    </div>
    <input
        type="range"
        min="0.2"
        max="3.0"
        step="0.1"
        value={panel.shipOutlinePx}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.SHIP_OUTLINE_PX = v;
            updatePanel("shipOutlinePx", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Glow Intensity</span><span
            class="val"
            >{(panel.shipGlowIntensity as number).toFixed(
                2,
            )}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1.0"
        step="0.02"
        value={panel.shipGlowIntensity}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.SHIP_GLOW_INTENSITY = v;
            updatePanel("shipGlowIntensity", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Glow Radius</span><span
            class="val"
            >{(panel.shipGlowRadius as number).toFixed(
                1,
            )}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="15"
        step="0.5"
        value={panel.shipGlowRadius}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.SHIP_GLOW_RADIUS = v;
            updatePanel("shipGlowRadius", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Min Contrast</span><span
            class="val"
            >{(panel.minColorLightness as number).toFixed(
                2,
            )}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="0.6"
        step="0.01"
        value={panel.minColorLightness}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.MIN_COLOR_LIGHTNESS = v;
            updatePanel("minColorLightness", v);
        }}
    />
</div>

<!-- ── Star Halos (F-47) ── -->
<h4 class="sub-heading">Star Halos</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Show Halos</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.showStarPower}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement)
                        .checked;
                    GAME_CONFIG.SHOW_STAR_POWER = v;
                    updatePanel("showStarPower", v);
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
{#if panel.showStarPower}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Halo Alpha</span><span
                class="val"
                >{(panel.starPowerAlpha as number).toFixed(
                    2,
                )}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="0.3"
            step="0.005"
            value={panel.starPowerAlpha}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.STAR_POWER_ALPHA = v;
                updatePanel("starPowerAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Halo Radius</span><span
                class="val"
                >{(
                    panel.starPowerRadiusMult as number
                ).toFixed(1)}</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="8"
            step="0.5"
            value={panel.starPowerRadiusMult}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.STAR_POWER_RADIUS_MULT = v;
                updatePanel("starPowerRadiusMult", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Halo Layers</span><span
                class="val">{panel.starPowerLayers}</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={panel.starPowerLayers}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.STAR_POWER_LAYERS = v;
                updatePanel("starPowerLayers", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Halo Blur</span><span
                class="val"
                >{(panel.starPowerBlur as number).toFixed(
                    0,
                )}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={panel.starPowerBlur}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.STAR_POWER_BLUR = v;
                updatePanel("starPowerBlur", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Fleet Glow</span>
            <label class="toggle-switch">
                <input
                    type="checkbox"
                    checked={panel.haloFleetScale}
                    onchange={(e) => {
                        const v = (
                            e.target as HTMLInputElement
                        ).checked;
                        GAME_CONFIG.HALO_FLEET_SCALE = v;
                        updatePanel("haloFleetScale", v);
                    }}
                />
                <span class="toggle-slider"></span>
            </label>
        </div>
    </div>
    {#if panel.haloFleetScale}
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Fleet Intensity</span
                ><span class="val"
                    >{(
                        panel.haloFleetIntensity as number
                    ).toFixed(1)}×</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={panel.haloFleetIntensity}
                oninput={(e) => {
                    const v = +(
                        e.target as HTMLInputElement
                    ).value;
                    GAME_CONFIG.HALO_FLEET_INTENSITY = v;
                    updatePanel("haloFleetIntensity", v);
                }}
            />
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Fleet Mode</span>
                <div style="display: flex; gap: 4px;">
                    <button
                        class="mode-btn"
                        class:active={panel.haloFleetMode ===
                            "stepped"}
                        onclick={() => {
                            GAME_CONFIG.HALO_FLEET_MODE =
                                "stepped";
                            updatePanel(
                                "haloFleetMode",
                                "stepped",
                            );
                        }}>Stepped</button
                    >
                    <button
                        class="mode-btn"
                        class:active={panel.haloFleetMode ===
                            "linear"}
                        onclick={() => {
                            GAME_CONFIG.HALO_FLEET_MODE =
                                "linear";
                            updatePanel(
                                "haloFleetMode",
                                "linear",
                            );
                        }}>Linear</button
                    >
                </div>
            </div>
        </div>
        {#if panel.haloFleetMode === "stepped"}
            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Step Size</span
                    ><span class="val"
                        >{panel.haloFleetStepSize} ships</span
                    >
                </div>
                <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={panel.haloFleetStepSize}
                    oninput={(e) => {
                        const v = +(
                            e.target as HTMLInputElement
                        ).value;
                        GAME_CONFIG.HALO_FLEET_STEP_SIZE =
                            v;
                        updatePanel("haloFleetStepSize", v);
                    }}
                />
            </div>
        {/if}
        {#if panel.haloFleetMode === "linear"}
            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Max Ships</span
                    ><span class="val"
                        >{panel.haloFleetMaxShips}</span
                    >
                </div>
                <input
                    type="range"
                    min="50"
                    max="5000"
                    step="50"
                    value={panel.haloFleetMaxShips}
                    oninput={(e) => {
                        const v = +(
                            e.target as HTMLInputElement
                        ).value;
                        GAME_CONFIG.HALO_FLEET_MAX_SHIPS =
                            v;
                        updatePanel("haloFleetMaxShips", v);
                    }}
                />
            </div>
        {/if}
    {/if}
{/if}

<!-- ── Voronoi Territory ── -->
<h4 class="sub-heading">Voronoi Territory</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Show Voronoi</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.showVoronoi}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement)
                        .checked;
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
            <span class="var-name">Voronoi Alpha</span><span
                class="val"
                >{(panel.voronoiAlpha as number).toFixed(
                    2,
                )}</span
            >
        </div>
        <input
            type="range"
            min="0.02"
            max="0.4"
            step="0.01"
            value={panel.voronoiAlpha}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.VORONOI_ALPHA = v;
                updatePanel("voronoiAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Edge Blur</span><span
                class="val"
                >{(panel.voronoiBlur as number).toFixed(
                    0,
                )}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={panel.voronoiBlur}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.VORONOI_BLUR = v;
                updatePanel("voronoiBlur", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Smoothing</span><span
                class="val">{panel.voronoiSmoothing}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={panel.voronoiSmoothing}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
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
                        const v = (
                            e.target as HTMLInputElement
                        ).checked;
                        GAME_CONFIG.VORONOI_GRADIENT_BLEND =
                            v;
                        updatePanel(
                            "voronoiGradientBlend",
                            v,
                        );
                    }}
                />
                <span class="slider"></span>
            </label>
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Blend Width</span><span
                class="val"
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
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.VORONOI_BLEND_WIDTH = v;
                updatePanel("voronoiBlendWidth", v);
            }}
        />
    </div>
    <!-- Territory Borders -->
    <div
        class="var-row grayed"
        style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
    >
        🔲 Borders
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span
                class="val"
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
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.VORONOI_BORDER_WIDTH = v;
                updatePanel("voronoiBorderWidth", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span
                class="val"
                >{(
                    panel.voronoiBorderAlpha as number
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.voronoiBorderAlpha}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.VORONOI_BORDER_ALPHA = v;
                updatePanel("voronoiBorderAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Brighten</span
            ><span class="val"
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
                const v = +(e.target as HTMLInputElement)
                    .value;
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
            <span class="var-name">Saturation</span><span
                class="val"
                >{(
                    panel.voronoiSaturation as number
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiSaturation}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.VORONOI_SATURATION = v;
                updatePanel("voronoiSaturation", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span
                class="val"
                >{(
                    panel.voronoiLightness as number
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiLightness}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement)
                    .value;
                GAME_CONFIG.VORONOI_LIGHTNESS = v;
                updatePanel("voronoiLightness", v);
            }}
        />
    </div>
{/if}

<!-- ── Orbit Layout ── -->
<h4 class="sub-heading">Orbit Layout</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Orbit Spacing Size</span
        ><span class="val"
            >{(panel.shipBaseSize as number).toFixed(
                1,
            )}</span
        >
    </div>
    <input
        type="range"
        min="1"
        max="12"
        step="0.5"
        value={panel.shipBaseSize}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.SHIP_BASE_SIZE = v;
            updatePanel("shipBaseSize", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ring Spacing</span><span
            class="val"
            >{(panel.orbitRingMult as number).toFixed(
                1,
            )}×</span
        >
    </div>
    <input
        type="range"
        min="0.5"
        max="4"
        step="0.1"
        value={panel.orbitRingMult}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ORBIT_RING_MULT = v;
            updatePanel("orbitRingMult", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ships Per Ring</span><span
            class="val"
            >{(panel.orbitDensity as number).toFixed(
                1,
            )}</span
        >
    </div>
    <input
        type="range"
        min="0.5"
        max="4"
        step="0.1"
        value={panel.orbitDensity}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ORBIT_DENSITY = v;
            updatePanel("orbitDensity", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Max Ships/Star</span><span
            class="val">{panel.maxVisualShips}</span
        >
    </div>
    <input
        type="range"
        min="10"
        max="500"
        step="10"
        value={panel.maxVisualShips}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.MAX_VISUAL_SHIPS = v;
            updatePanel("maxVisualShips", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Star Radius</span><span
            class="val"
            >{(panel.starRenderRadius as number).toFixed(
                0,
            )}</span
        >
    </div>
    <input
        type="range"
        min="5"
        max="50"
        step="1"
        value={panel.starRenderRadius}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_RENDER_RADIUS = v;
            updatePanel("starRenderRadius", v);
        }}
    />
</div>

<!-- ── Density Coloring ── -->
<h4 class="sub-heading">Density Coloring</h4>
{#each densityVariables as v}
    <div
        class="var-row"
        class:disabled={!enabled[
            v.key as keyof typeof enabled
        ]}
    >
        <div class="row-top">
            <label class="toggle-label">
                <input
                    type="checkbox"
                    checked={enabled[
                        v.key as keyof typeof enabled
                    ]}
                    onchange={() =>
                        toggle(
                            v.key as keyof typeof enabled,
                        )}
                />
                <span class="var-name">{v.label}</span>
            </label>
            <span class="val"
                >{values[v.key as VarKey].toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min={v.min}
            max={v.max}
            step={v.step}
            value={values[v.key as VarKey]}
            oninput={(e) =>
                updateValue(
                    v.key as VarKey,
                    parseFloat(
                        (e.target as HTMLInputElement)
                            .value,
                    ),
                )}
            disabled={!enabled[
                v.key as keyof typeof enabled
            ]}
        />
    </div>
{/each}
<div class="var-row">
    <div class="row-top">
        <label class="toggle-label">
            <input
                type="checkbox"
                checked={GAME_CONFIG.DENSITY_DARKEN_ALT}
                onchange={() => {
                    GAME_CONFIG.DENSITY_DARKEN_ALT =
                        !GAME_CONFIG.DENSITY_DARKEN_ALT;
                }}
            />
            <span class="var-name">Alternate Darkening</span
            >
        </label>
    </div>
</div>

<!-- ── Star Glow ── -->
<h4 class="sub-heading">Star Glow</h4>
<div class="var-row">
    <div class="row-top">
        <label class="toggle-label">
            <input
                type="checkbox"
                checked={GAME_CONFIG.STAR_GLOW_ON}
                onchange={() => {
                    GAME_CONFIG.STAR_GLOW_ON =
                        !GAME_CONFIG.STAR_GLOW_ON;
                }}
            />
            <span class="var-name">Glow Enabled</span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Glow Radius</span><span
            class="val"
            >{(
                GAME_CONFIG.STAR_GLOW_RADIUS_MULT ?? 1.3
            ).toFixed(1)}×</span
        >
    </div>
    <input
        type="range"
        min="0.5"
        max="3.0"
        step="0.1"
        value={GAME_CONFIG.STAR_GLOW_RADIUS_MULT ?? 1.3}
        oninput={(e) => {
            GAME_CONFIG.STAR_GLOW_RADIUS_MULT = +(
                e.target as HTMLInputElement
            ).value;
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Glow Intensity</span><span
            class="val"
            >{(
                GAME_CONFIG.STAR_GLOW_INTENSITY ?? 0.25
            ).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1.0"
        step="0.02"
        value={GAME_CONFIG.STAR_GLOW_INTENSITY ?? 0.25}
        oninput={(e) => {
            GAME_CONFIG.STAR_GLOW_INTENSITY = +(
                e.target as HTMLInputElement
            ).value;
        }}
    />
</div>

<!-- ── Debug ── -->
<h4 class="sub-heading">Debug: Ship Count</h4>
{#if selectedStarStore.id}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Active Ships</span>
            <span class="val"
                >{debugShipCount.toLocaleString()}</span
            >
        </div>
        <input
            type="range"
            min={0}
            max={10000}
            step={10}
            value={debugShipCount}
            oninput={(e) =>
                updateDebugShipCount(
                    parseInt(
                        (e.target as HTMLInputElement)
                            .value,
                    ),
                )}
        />
    </div>
{:else}
    <div class="var-row grayed">
        <span class="future-desc"
            >Select a star to adjust ship count</span
        >
    </div>
{/if}

<!-- 🎨 MAP VISUALS -->
