<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { DENSITY_VARIABLES } from "../settingsDefs";
    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    import { logFlags } from "$lib/utils/logger";
    import { exportConfigJSON as exportConfigJSONBase } from "../panelSync";

    // ControlsSection-STAR SYSTEM -- Star System Appearance (extracted from GameSettingsPanel.svelte)

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        exportConfigMD: () => void;
        importConfigJSON: (e: Event) => void;
        configStatus: string;
        configStatusColor: string;
        syncFromConfig?: () => void;
    }
    let {
        panel,
        updatePanel,
        exportConfigMD,
        importConfigJSON,
        configStatus,
        configStatusColor,
        syncFromConfig,
    }: Props = $props();

    // Density variable slider metadata — panel key mapping follows PANEL_CONFIG_MAP convention
    const DENSITY_PANEL_MAP: Record<string, string> = {
        DENSITY_HUE_STEP: 'densityHueStep',
        DENSITY_SAT_STEP: 'densitySatStep',
        DENSITY_LIGHT_STEP: 'densityLightStep',
        DENSITY_TIERS: 'densityTiers',
    };

    let debugShipCount = $state(0);
    function updateDebugShipCount(count: number) {
        const starId = selectedStarStore.id;
        if (starId) debugShipCount = count;
    }
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
</script>

<CategoryThemeBar category="ships" onApply={() => syncFromConfig?.()} />

<!-- ── Master Star System Scale ── -->
<h4 class="sub-heading">⚡ Star System Scale</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">System Scale</span><span class="val"
            >{((panel.starSystemScale ?? 1) as number).toFixed(2)}×</span
        >
    </div>
    <input
        type="range"
        min="0.3"
        max="3.0"
        step="0.05"
        value={panel.starSystemScale ?? 1}
        oninput={(e) => {
            const newScale = +(e.target as HTMLInputElement).value;
            const oldScale = GAME_CONFIG.STAR_SYSTEM_SCALE ?? 1;
            if (oldScale === 0) return;
            const ratio = newScale / oldScale;
            // Compute new values from GAME_CONFIG (ground truth) × ratio
            const updates: [string, string, number][] = [
                [
                    "starRenderRadius",
                    "STAR_RENDER_RADIUS",
                    GAME_CONFIG.STAR_RENDER_RADIUS * ratio,
                ],
                [
                    "starRingRadius",
                    "STAR_RING_RADIUS",
                    GAME_CONFIG.STAR_RING_RADIUS * ratio,
                ],
                [
                    "orbitBaseRadius",
                    "ORBIT_BASE_RADIUS",
                    GAME_CONFIG.ORBIT_BASE_RADIUS * ratio,
                ],
                [
                    "damagedOrbitRadius",
                    "DAMAGED_ORBIT_RADIUS",
                    GAME_CONFIG.DAMAGED_ORBIT_RADIUS * ratio,
                ],
                [
                    "starIconScale",
                    "STAR_ICON_SCALE",
                    GAME_CONFIG.STAR_ICON_SCALE * ratio,
                ],
                [
                    "starLabelDistance",
                    "STAR_LABEL_DISTANCE",
                    (GAME_CONFIG.STAR_LABEL_DISTANCE ?? 55) * ratio,
                ],
                [
                    "starLabelFontSize",
                    "STAR_LABEL_FONT_SIZE",
                    (GAME_CONFIG.STAR_LABEL_FONT_SIZE ?? 22) * ratio,
                ],
                [
                    "starLabelIdFontSize",
                    "STAR_LABEL_ID_FONT_SIZE",
                    (GAME_CONFIG.STAR_LABEL_ID_FONT_SIZE ?? 14) * ratio,
                ],
                [
                    "starLabelDamagedFontSize",
                    "STAR_LABEL_DAMAGED_FONT_SIZE",
                    (GAME_CONFIG.STAR_LABEL_DAMAGED_FONT_SIZE ?? 16) * ratio,
                ],
                [
                    "starLabelScale",
                    "STAR_LABEL_SCALE",
                    (GAME_CONFIG.STAR_LABEL_SCALE ?? 1.0) * ratio,
                ],
                [
                    "starLabelLineHeight",
                    "STAR_LABEL_LINE_HEIGHT",
                    (GAME_CONFIG.STAR_LABEL_LINE_HEIGHT ?? 18) * ratio,
                ],
                [
                    "starHitRadius",
                    "STAR_HIT_RADIUS",
                    (GAME_CONFIG.STAR_HIT_RADIUS ?? 50) * ratio,
                ],
            ];
            // Write all to GAME_CONFIG first
            for (const [, configKey, val] of updates) {
                (GAME_CONFIG as any)[configKey] = val;
            }
            GAME_CONFIG.STAR_SYSTEM_SCALE = newScale;
            // Batch-update all panel keys in one pass (triggers reactive re-render)
            for (const [panelKey, , val] of updates) {
                updatePanel(panelKey, val);
            }
            updatePanel("starSystemScale", newScale);
        }}
    />
</div>

<!-- ── Ship Size & Shape ── -->
<h4 class="sub-heading">Ship Size & Shape</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Visual Radius</span><span class="val"
            >{((panel.shipVisualRadius ?? 3) as number).toFixed(1)}</span
        >
    </div>
    <input
        type="range"
        min="1"
        max="8"
        step="0.5"
        value={panel.shipVisualRadius ?? 3}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.SHIP_VISUAL_RADIUS = v;
            updatePanel("shipVisualRadius", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Scale Multiplier</span><span class="val"
            >{((panel.shipScaleMult ?? 0) as number).toFixed(1)}×</span
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
                    panel.shipOutlineOn = !panel.shipOutlineOn;
                    GAME_CONFIG.SHIP_OUTLINE_ON =
                        panel.shipOutlineOn as boolean;
                    updatePanel("shipOutlineOn", panel.shipOutlineOn);
                }}
            /> Ship Outline</label
        >
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Outline px</span><span class="val"
            >{((panel.shipOutlinePx ?? 0) as number).toFixed(1)}</span
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
        <span class="var-name">Glow Intensity</span><span class="val"
            >{((panel.shipGlowIntensity ?? 0) as number).toFixed(2)}</span
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
        <span class="var-name">Glow Radius</span><span class="val"
            >{((panel.shipGlowRadius ?? 0) as number).toFixed(1)}</span
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
        <span class="var-name">Min Contrast</span><span class="val"
            >{((panel.minColorLightness ?? 0) as number).toFixed(2)}</span
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
                    const v = (e.target as HTMLInputElement).checked;
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
            <span class="var-name">Halo Alpha</span><span class="val"
                >{((panel.starPowerAlpha ?? 0) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="0.3"
            step="0.005"
            value={panel.starPowerAlpha}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.STAR_POWER_ALPHA = v;
                updatePanel("starPowerAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Halo Radius</span><span class="val"
                >{((panel.starPowerRadiusMult ?? 0) as number).toFixed(1)}</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="8"
            step="0.5"
            value={panel.starPowerRadiusMult}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.STAR_POWER_RADIUS_MULT = v;
                updatePanel("starPowerRadiusMult", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Halo Layers</span><span class="val"
                >{panel.starPowerLayers}</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={panel.starPowerLayers}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.STAR_POWER_LAYERS = v;
                updatePanel("starPowerLayers", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Halo Blur</span><span class="val"
                >{((panel.starPowerBlur ?? 0) as number).toFixed(0)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={panel.starPowerBlur}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
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
                        const v = (e.target as HTMLInputElement).checked;
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
                <span class="var-name">Fleet Intensity</span><span class="val"
                    >{((panel.haloFleetIntensity ?? 0) as number).toFixed(
                        1,
                    )}×</span
                >
            </div>
            <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={panel.haloFleetIntensity}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
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
                        class:active={panel.haloFleetMode === "stepped"}
                        onclick={() => {
                            GAME_CONFIG.HALO_FLEET_MODE = "stepped";
                            updatePanel("haloFleetMode", "stepped");
                        }}>Stepped</button
                    >
                    <button
                        class="mode-btn"
                        class:active={panel.haloFleetMode === "linear"}
                        onclick={() => {
                            GAME_CONFIG.HALO_FLEET_MODE = "linear";
                            updatePanel("haloFleetMode", "linear");
                        }}>Linear</button
                    >
                </div>
            </div>
        </div>
        {#if panel.haloFleetMode === "stepped"}
            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Step Size</span><span class="val"
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
                        const v = +(e.target as HTMLInputElement).value;
                        GAME_CONFIG.HALO_FLEET_STEP_SIZE = v;
                        updatePanel("haloFleetStepSize", v);
                    }}
                />
            </div>
        {/if}
        {#if panel.haloFleetMode === "linear"}
            <div class="var-row">
                <div class="row-top">
                    <span class="var-name">Max Ships</span><span class="val"
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
                        const v = +(e.target as HTMLInputElement).value;
                        GAME_CONFIG.HALO_FLEET_MAX_SHIPS = v;
                        updatePanel("haloFleetMaxShips", v);
                    }}
                />
            </div>
        {/if}
    {/if}
{/if}

<!-- ── Orbit Layout ── -->
<h4 class="sub-heading">Orbit Layout</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Inner Orbit Padding</span><span class="val"
            >{((panel.orbitBaseRadius ?? 0) as number).toFixed(1)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="20"
        step="0.5"
        value={panel.orbitBaseRadius}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ORBIT_BASE_RADIUS = v;
            updatePanel("orbitBaseRadius", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Orbit Spacing Size</span><span class="val"
            >{((panel.shipBaseSize ?? 0) as number).toFixed(1)}</span
        >
    </div>
    <input
        type="range"
        min="1"
        max="12"
        step="0.1"
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
        <span class="var-name">Ring Spacing</span><span class="val"
            >{((panel.orbitRingMult ?? 0) as number).toFixed(1)}×</span
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
        <span class="var-name">Ships Per Ring</span><span class="val"
            >{((panel.orbitDensity ?? 0) as number).toFixed(1)}</span
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
        <span class="var-name">Max Ships/Star</span><span class="val"
            >{panel.maxVisualShips}</span
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
        <span class="var-name">Star Radius</span><span class="val"
            >{((panel.starRenderRadius ?? 0) as number).toFixed(0)}</span
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

<!-- ── Star Shape ── -->
<h4 class="sub-heading">Star Shape</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shape Mode</span>
        <div style="display: flex; gap: 4px;">
            <button
                class="mode-btn"
                class:active={panel.starShapeMode === "polygon"}
                onclick={() => {
                    GAME_CONFIG.STAR_SHAPE_MODE = "polygon";
                    updatePanel("starShapeMode", "polygon");
                }}>Polygon</button
            >
            <button
                class="mode-btn"
                class:active={panel.starShapeMode === "circle"}
                onclick={() => {
                    GAME_CONFIG.STAR_SHAPE_MODE = "circle";
                    updatePanel("starShapeMode", "circle");
                }}>Circle</button
            >
        </div>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Icon Scale</span><span class="val"
            >{((panel.starIconScale ?? 0.55) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0.2"
        max="0.8"
        step="0.05"
        value={panel.starIconScale ?? 0.55}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_ICON_SCALE = v;
            updatePanel("starIconScale", v);
        }}
    />
</div>
{#if panel.starShapeMode === "polygon"}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Corner Radius</span><span class="val"
                >{((panel.starCornerRadius ?? 0.3) as number).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.starCornerRadius ?? 0.3}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.STAR_CORNER_RADIUS = v;
                updatePanel("starCornerRadius", v);
            }}
        />
    </div>
{/if}

<h4 class="sub-heading">Ownership Ring</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ring Radius</span><span class="val"
            >{((panel.starRingRadius ?? 30) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="60"
        step="1"
        value={panel.starRingRadius ?? 30}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_RING_RADIUS = v;
            updatePanel("starRingRadius", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ring Offset (Legacy)</span><span class="val"
            >{((panel.starRingOffset ?? 20) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="40"
        step="1"
        value={panel.starRingOffset ?? 20}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_RING_OFFSET = v;
            updatePanel("starRingOffset", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ring Width</span><span class="val"
            >{((panel.starRingWidth ?? 2) as number).toFixed(1)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="6"
        step="0.5"
        value={panel.starRingWidth ?? 2}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_RING_WIDTH = v;
            updatePanel("starRingWidth", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ring Alpha</span><span class="val"
            >{((panel.starRingAlpha ?? 0.8) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={panel.starRingAlpha ?? 0.8}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_RING_ALPHA = v;
            updatePanel("starRingAlpha", v);
        }}
    />
</div>
<!-- Ownership-ring SLA -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ring Saturation</span><span class="val"
            >{((panel.starRingSaturation ?? 1.0) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={panel.starRingSaturation ?? 1.0}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_RING_SATURATION = v;
            updatePanel("starRingSaturation", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Ring Lightness</span><span class="val"
            >{((panel.starRingLightness ?? 1.0) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={panel.starRingLightness ?? 1.0}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_RING_LIGHTNESS = v;
            updatePanel("starRingLightness", v);
        }}
    />
</div>

<!-- ── Star Labels (Pill) ── -->
<h4 class="sub-heading">Star Labels</h4>

<!-- Layout Toggle: Pill vs Stacked (large buttons) -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Layout</span>
        <div style="display: flex; gap: 6px;">
            <button
                class="mode-btn"
                class:active={GAME_CONFIG.STAR_LABEL_LAYOUT === "horizontal"}
                style="padding: 6px 16px; font-size: 13px; font-weight: 600;"
                onclick={() => {
                    GAME_CONFIG.STAR_LABEL_LAYOUT = "horizontal";
                    updatePanel("starLabelLayout", "horizontal");
                }}>Pill</button
            >
            <button
                class="mode-btn"
                class:active={GAME_CONFIG.STAR_LABEL_LAYOUT === "vertical"}
                style="padding: 6px 16px; font-size: 13px; font-weight: 600;"
                onclick={() => {
                    GAME_CONFIG.STAR_LABEL_LAYOUT = "vertical";
                    updatePanel("starLabelLayout", "vertical");
                }}>Stacked</button
            >
        </div>
    </div>
</div>

<!-- Master Font Scale -->
<div class="var-row" style="border-left: 3px solid #668; padding-left: 6px;">
    <div class="row-top">
        <span class="var-name" style="font-weight: bold;"
            >🔗 Label Font Scale</span
        ><span class="val"
            >{((panel.starLabelScale ?? 1.0) as number).toFixed(2)}×</span
        >
    </div>
    <input
        type="range"
        min="0.3"
        max="3.0"
        step="0.05"
        value={panel.starLabelScale ?? 1.0}
        oninput={(e) => {
            const newScale = +(e.target as HTMLInputElement).value;
            const oldScale = GAME_CONFIG.STAR_LABEL_SCALE ?? 1;
            if (oldScale === 0) return;
            const ratio = newScale / oldScale;
            const updates: [string, string, number][] = [
                [
                    "starLabelIdFontSize",
                    "STAR_LABEL_ID_FONT_SIZE",
                    (GAME_CONFIG.STAR_LABEL_ID_FONT_SIZE ?? 13) * ratio,
                ],
                [
                    "starLabelFontSize",
                    "STAR_LABEL_FONT_SIZE",
                    (GAME_CONFIG.STAR_LABEL_FONT_SIZE ?? 14) * ratio,
                ],
                [
                    "starLabelDamagedFontSize",
                    "STAR_LABEL_DAMAGED_FONT_SIZE",
                    (GAME_CONFIG.STAR_LABEL_DAMAGED_FONT_SIZE ?? 12) * ratio,
                ],
                [
                    "starLabelLineHeight",
                    "STAR_LABEL_LINE_HEIGHT",
                    (GAME_CONFIG.STAR_LABEL_LINE_HEIGHT ?? 18) * ratio,
                ],
            ];
            for (const [, configKey, val] of updates) {
                (GAME_CONFIG as any)[configKey] = val;
            }
            GAME_CONFIG.STAR_LABEL_SCALE = newScale;
            for (const [panelKey, , val] of updates) {
                updatePanel(panelKey, val);
            }
            updatePanel("starLabelScale", newScale);
        }}
    />
</div>

<!-- Angle -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Angle</span><span class="val"
            >{((panel.starLabelAngle ?? 35) as number).toFixed(0)}°</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="360"
        step="5"
        value={panel.starLabelAngle ?? 35}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_ANGLE = v;
            updatePanel("starLabelAngle", v);
        }}
    />
</div>

<!-- Distance -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Distance</span><span class="val"
            >{((panel.starLabelDistance ?? 55) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="10"
        max="150"
        step="5"
        value={panel.starLabelDistance ?? 55}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_DISTANCE = v;
            updatePanel("starLabelDistance", v);
        }}
    />
</div>

<!-- Star ID Font -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">ID Font</span><span class="val"
            >{((panel.starLabelIdFontSize ?? 13) as number).toFixed(0)}</span
        >
    </div>
    <input
        type="range"
        min="6"
        max="30"
        step="1"
        value={panel.starLabelIdFontSize ?? 13}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_ID_FONT_SIZE = v;
            updatePanel("starLabelIdFontSize", v);
        }}
    />
</div>

<!-- Active Ships Font -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Active Font</span><span class="val"
            >{((panel.starLabelFontSize ?? 14) as number).toFixed(0)}</span
        >
    </div>
    <input
        type="range"
        min="8"
        max="40"
        step="1"
        value={panel.starLabelFontSize ?? 14}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_FONT_SIZE = v;
            updatePanel("starLabelFontSize", v);
        }}
    />
</div>

<!-- Damaged Ships Font -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Damaged Font</span><span class="val"
            >{((panel.starLabelDamagedFontSize ?? 12) as number).toFixed(
                0,
            )}</span
        >
    </div>
    <input
        type="range"
        min="6"
        max="30"
        step="1"
        value={panel.starLabelDamagedFontSize ?? 12}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_DAMAGED_FONT_SIZE = v;
            updatePanel("starLabelDamagedFontSize", v);
        }}
    />
</div>

<!-- Pad X -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Pad X</span><span class="val"
            >{((panel.starLabelPadX ?? 4) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="20"
        step="1"
        value={panel.starLabelPadX ?? 4}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_PAD_X = v;
            updatePanel("starLabelPadX", v);
        }}
    />
</div>

<!-- Pad Y -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Pad Y</span><span class="val"
            >{((panel.starLabelPadY ?? 2) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="20"
        step="1"
        value={panel.starLabelPadY ?? 2}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_PAD_Y = v;
            updatePanel("starLabelPadY", v);
        }}
    />
</div>

<!-- Gap -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Gap</span><span class="val"
            >{((panel.starLabelGap ?? 2) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="12"
        step="1"
        value={panel.starLabelGap ?? 2}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_GAP = v;
            updatePanel("starLabelGap", v);
        }}
    />
</div>

<!-- BG Alpha -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">BG Opacity</span><span class="val"
            >{((panel.starLabelBgAlpha ?? 0.75) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={panel.starLabelBgAlpha ?? 0.75}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_BG_ALPHA = v;
            updatePanel("starLabelBgAlpha", v);
        }}
    />
</div>

<!-- Border Alpha -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Border Opacity</span><span class="val"
            >{((panel.starLabelBorderAlpha ?? 0.5) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={panel.starLabelBorderAlpha ?? 0.5}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_BORDER_ALPHA = v;
            updatePanel("starLabelBorderAlpha", v);
        }}
    />
</div>

<!-- Line Height (vertical mode) -->
{#if GAME_CONFIG.STAR_LABEL_LAYOUT === "vertical"}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Line Height</span><span class="val"
                >{((panel.starLabelLineHeight ?? 18) as number).toFixed(
                    0,
                )}px</span
            >
        </div>
        <input
            type="range"
            min="8"
            max="40"
            step="1"
            value={panel.starLabelLineHeight ?? 18}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.STAR_LABEL_LINE_HEIGHT = v;
                updatePanel("starLabelLineHeight", v);
            }}
        />
    </div>
{/if}

<!-- Color Mode: Player vs Universal (large toggle) -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Tag Color</span>
        <div style="display: flex; gap: 6px;">
            <button
                class="mode-btn"
                class:active={GAME_CONFIG.STAR_LABEL_COLOR_MODE === "player"}
                style="padding: 6px 16px; font-size: 13px; font-weight: 600;"
                onclick={() => {
                    GAME_CONFIG.STAR_LABEL_COLOR_MODE = "player";
                    updatePanel("starLabelColorMode", "player");
                }}>Player</button
            >
            <button
                class="mode-btn"
                class:active={GAME_CONFIG.STAR_LABEL_COLOR_MODE === "universal"}
                style="padding: 6px 16px; font-size: 13px; font-weight: 600;"
                onclick={() => {
                    GAME_CONFIG.STAR_LABEL_COLOR_MODE = "universal";
                    updatePanel("starLabelColorMode", "universal");
                }}>Universal</button
            >
        </div>
    </div>
</div>

<!-- Universal HSLA sliders (only shown in universal mode) -->
{#if GAME_CONFIG.STAR_LABEL_COLOR_MODE === "universal"}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Hue</span><span class="val"
                >{GAME_CONFIG.STAR_LABEL_UNIVERSAL_H ?? 220}°</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={GAME_CONFIG.STAR_LABEL_UNIVERSAL_H ?? 220}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.STAR_LABEL_UNIVERSAL_H = v;
                updatePanel("starLabelUniversalH", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
                >{GAME_CONFIG.STAR_LABEL_UNIVERSAL_S ?? 30}%</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={GAME_CONFIG.STAR_LABEL_UNIVERSAL_S ?? 30}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.STAR_LABEL_UNIVERSAL_S = v;
                updatePanel("starLabelUniversalS", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
                >{GAME_CONFIG.STAR_LABEL_UNIVERSAL_L ?? 25}%</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={GAME_CONFIG.STAR_LABEL_UNIVERSAL_L ?? 25}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.STAR_LABEL_UNIVERSAL_L = v;
                updatePanel("starLabelUniversalL", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{(
                    (GAME_CONFIG.STAR_LABEL_UNIVERSAL_A ?? 0.75) as number
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={GAME_CONFIG.STAR_LABEL_UNIVERSAL_A ?? 0.75}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                GAME_CONFIG.STAR_LABEL_UNIVERSAL_A = v;
                updatePanel("starLabelUniversalA", v);
            }}
        />
    </div>
{/if}

<!-- Border Width -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Border Width</span><span class="val"
            >{((panel.starLabelBorderWidth ?? 1) as number).toFixed(1)}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="5"
        step="0.5"
        value={panel.starLabelBorderWidth ?? 1}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_LABEL_BORDER_WIDTH = v;
            updatePanel("starLabelBorderWidth", v);
        }}
    />
</div>

<!-- Leash toggle -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Leash Line</span>
        <label style="display:flex;align-items:center;gap:4px;">
            <input
                type="checkbox"
                checked={GAME_CONFIG.STAR_LABEL_LEASH}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    GAME_CONFIG.STAR_LABEL_LEASH = v;
                    updatePanel("starLabelLeash", v);
                }}
            />
            <span class="val"
                >{GAME_CONFIG.STAR_LABEL_LEASH ? "On" : "Off"}</span
            >
        </label>
    </div>
</div>

<!-- ── Order Arrows ── -->
<h4 class="sub-heading">Order Arrows</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arrowhead Size</span><span class="val"
            >{((panel.arrowHeadSize ?? 30) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="5"
        max="60"
        step="5"
        value={panel.arrowHeadSize ?? 30}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_HEAD_SIZE = v;
            updatePanel("arrowHeadSize", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shaft Width</span><span class="val"
            >{((panel.arrowShaftWidth ?? 6) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="1"
        max="12"
        step="1"
        value={panel.arrowShaftWidth ?? 6}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_SHAFT_WIDTH = v;
            updatePanel("arrowShaftWidth", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arrow Opacity</span><span class="val"
            >{((panel.arrowAlpha ?? 0.6) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0.1"
        max="1.0"
        step="0.05"
        value={panel.arrowAlpha ?? 0.6}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_ALPHA = v;
            updatePanel("arrowAlpha", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arrow Length</span><span class="val"
            >{((panel.arrowLengthFraction ?? 0.5) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0.1"
        max="1.0"
        step="0.05"
        value={panel.arrowLengthFraction ?? 0.5}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_LENGTH_FRACTION = v;
            updatePanel("arrowLengthFraction", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Dash Length</span><span class="val"
            >{((panel.arrowDashLength ?? 15) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="3"
        max="30"
        step="1"
        value={panel.arrowDashLength ?? 15}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_DASH_LENGTH = v;
            updatePanel("arrowDashLength", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Dash Gap</span><span class="val"
            >{((panel.arrowDashGap ?? 10) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="2"
        max="25"
        step="1"
        value={panel.arrowDashGap ?? 10}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_DASH_GAP = v;
            updatePanel("arrowDashGap", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Head Opacity</span><span class="val"
            >{((panel.arrowHeadAlpha ?? 0.6) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0.1"
        max="1.0"
        step="0.05"
        value={panel.arrowHeadAlpha ?? 0.6}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_HEAD_ALPHA = v;
            updatePanel("arrowHeadAlpha", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Outline Width</span><span class="val"
            >{((panel.arrowOutlineWidth ?? 0) as number).toFixed(1)}px</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="5"
        step="0.5"
        value={panel.arrowOutlineWidth ?? 0}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_OUTLINE_WIDTH = v;
            updatePanel("arrowOutlineWidth", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Outline Opacity</span><span class="val"
            >{((panel.arrowOutlineAlpha ?? 0.6) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1.0"
        step="0.05"
        value={panel.arrowOutlineAlpha ?? 0.6}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.ARROW_OUTLINE_ALPHA = v;
            updatePanel("arrowOutlineAlpha", v);
        }}
    />
</div>

<!-- ── Damaged Ships ── -->
<h4 class="sub-heading">Damaged Ships</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Damaged Scale</span><span class="val"
            >{((panel.damagedShipScale ?? 0.7) as number).toFixed(2)}×</span
        >
    </div>
    <input
        type="range"
        min="0.1"
        max="1.5"
        step="0.05"
        value={panel.damagedShipScale ?? 0.7}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.DAMAGED_SHIP_SCALE = v;
            updatePanel("damagedShipScale", v);
        }}
    />
</div>

<!-- ── Interaction ── -->
<h4 class="sub-heading">Interaction</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Hit Zone Radius</span><span class="val"
            >{((panel.starHitRadius ?? 50) as number).toFixed(0)}px</span
        >
    </div>
    <input
        type="range"
        min="20"
        max="120"
        step="5"
        value={panel.starHitRadius ?? 50}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_HIT_RADIUS = v;
            updatePanel("starHitRadius", v);
        }}
    />
</div>

<!-- ── Density Coloring ── -->
<h4 class="sub-heading">Density Coloring</h4>
{#each DENSITY_VARIABLES as v}
    {@const panelKey = DENSITY_PANEL_MAP[v.key] ?? v.key}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">{v.label}</span>
            <span class="val">{((panel[panelKey] ?? (GAME_CONFIG as any)[v.key] ?? v.min) as number).toFixed(2)}</span>
        </div>
        <input
            type="range"
            min={v.min}
            max={v.max}
            step={v.step}
            value={panel[panelKey] ?? (GAME_CONFIG as any)[v.key] ?? v.min}
            oninput={(e) => {
                const val = parseFloat((e.target as HTMLInputElement).value);
                (GAME_CONFIG as any)[v.key] = val;
                updatePanel(panelKey, val);
            }}
        />
    </div>
{/each}
<div class="var-row">
    <div class="row-top">
        <label class="toggle-label">
            <input
                type="checkbox"
                checked={panel.densityDarkenAlt}
                onchange={() => {
                    const v = !panel.densityDarkenAlt;
                    GAME_CONFIG.DENSITY_DARKEN_ALT = v;
                    updatePanel("densityDarkenAlt", v);
                }}
            />
            <span class="var-name">Alternate Darkening</span>
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
                checked={panel.starGlowOn}
                onchange={() => {
                    const v = !panel.starGlowOn;
                    GAME_CONFIG.STAR_GLOW_ON = v;
                    updatePanel("starGlowOn", v);
                }}
            />
            <span class="var-name">Glow Enabled</span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Glow Radius</span><span class="val"
            >{((panel.starGlowRadiusMult ?? 1.3) as number).toFixed(1)}×</span
        >
    </div>
    <input
        type="range"
        min="0.5"
        max="3.0"
        step="0.1"
        value={panel.starGlowRadiusMult ?? 1.3}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_GLOW_RADIUS_MULT = v;
            updatePanel("starGlowRadiusMult", v);
        }}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Glow Intensity</span><span class="val"
            >{((panel.starGlowIntensity ?? 0.25) as number).toFixed(2)}</span
        >
    </div>
    <input
        type="range"
        min="0"
        max="1.0"
        step="0.02"
        value={panel.starGlowIntensity ?? 0.25}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.STAR_GLOW_INTENSITY = v;
            updatePanel("starGlowIntensity", v);
        }}
    />
</div>

<!-- ── Debug ── -->
<h4 class="sub-heading">Debug: Ship Count</h4>
{#if selectedStarStore.id}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Active Ships</span>
            <span class="val">{debugShipCount.toLocaleString()}</span>
        </div>
        <input
            type="range"
            min={0}
            max={10000}
            step={10}
            value={debugShipCount}
            oninput={(e) =>
                updateDebugShipCount(
                    parseInt((e.target as HTMLInputElement).value),
                )}
        />
    </div>
{:else}
    <div class="var-row grayed">
        <span class="future-desc">Select a star to adjust ship count</span>
    </div>
{/if}

<style>
    @import "./panel-shared.css";
</style>
