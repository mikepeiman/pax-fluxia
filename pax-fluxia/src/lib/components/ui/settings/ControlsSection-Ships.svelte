<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        PaxHudButton,
        PaxHudSegmentedControl,
        PaxInfoHint,
        PaxSettingsRangeRow,
        PaxSettingsToggleRow,
        type PaxHudSegmentedOption,
    } from "$lib/design-system";
    import { DENSITY_VARIABLES } from "../settingsDefs";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-STAR SYSTEM -- Star System Appearance (extracted from GameSettingsPanel.svelte)

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }
    let {
        panel,
        updatePanel,
        syncFromConfig,
    }: Props = $props();

    // Density variable slider metadata — panel key mapping follows PANEL_CONFIG_MAP convention
    const DENSITY_PANEL_MAP: Record<string, string> = {
        DENSITY_HUE_STEP: 'densityHueStep',
        DENSITY_SAT_STEP: 'densitySatStep',
        DENSITY_LIGHT_STEP: 'densityLightStep',
        DENSITY_TIERS: 'densityTiers',
    };

    const ARROW_HEAD_STYLE_OPTIONS: PaxHudSegmentedOption[] = [
        { value: "triangle", label: "Triangle" },
        { value: "chevron", label: "Chevron" },
        { value: "kite", label: "Kite" },
        { value: "spear", label: "Spear" },
    ];

    const ARROW_OUTLINE_TONE_OPTIONS: PaxHudSegmentedOption[] = [
        { value: "shadow", label: "Shadow" },
        { value: "steel", label: "Steel" },
        { value: "bright", label: "Bright" },
    ];

    const HALO_FLEET_MODE_OPTIONS: PaxHudSegmentedOption[] = [
        { value: "stepped", label: "Stepped" },
        { value: "linear", label: "Linear" },
    ];

    const STAR_SHAPE_MODE_OPTIONS: PaxHudSegmentedOption[] = [
        { value: "polygon", label: "Polygon" },
        { value: "circle", label: "Circle" },
    ];

    const STAR_LABEL_LAYOUT_OPTIONS: PaxHudSegmentedOption[] = [
        { value: "horizontal", label: "Pill" },
        { value: "vertical", label: "Stacked" },
    ];

    const STAR_LABEL_COLOR_MODE_OPTIONS: PaxHudSegmentedOption[] = [
        { value: "player", label: "Player" },
        { value: "universal", label: "Universal" },
    ];

    function applyGlowDominantOwnershipPreset() {
        const config = GAME_CONFIG as Record<string, any>;
        const updates: Array<[string, string, boolean | number]> = [
            ["showStarPower", "SHOW_STAR_POWER", true],
            ["starPowerAlpha", "STAR_POWER_ALPHA", 0.16],
            ["starPowerRadiusMult", "STAR_POWER_RADIUS_MULT", 2.3],
            ["starPowerLayers", "STAR_POWER_LAYERS", 8],
            ["starPowerBlur", "STAR_POWER_BLUR", 14],
            ["starPowerLayerCurve", "STAR_POWER_LAYER_CURVE", 1.55],
            [
                "starPowerEdgeBandStrength",
                "STAR_POWER_EDGE_BAND_STRENGTH",
                0.45,
            ],
            ["starPowerEdgeBandWidth", "STAR_POWER_EDGE_BAND_WIDTH", 0.28],
            ["haloFleetScale", "HALO_FLEET_SCALE", false],
        ];
        for (const [panelKey, configKey, value] of updates) {
            config[configKey] = value;
            updatePanel(panelKey, value);
        }
    }

    function writePanelConfig(panelKey: string, configKey: string, value: number | boolean | string) {
        (GAME_CONFIG as Record<string, any>)[configKey] = value;
        updatePanel(panelKey, value);
    }

    function setStarSystemScale(newScale: number) {
        const oldScale = GAME_CONFIG.STAR_SYSTEM_SCALE ?? 1;
        if (oldScale === 0) return;
        const ratio = newScale / oldScale;
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
        for (const [, configKey, val] of updates) {
            (GAME_CONFIG as Record<string, any>)[configKey] = val;
        }
        GAME_CONFIG.STAR_SYSTEM_SCALE = newScale;
        for (const [panelKey, , val] of updates) {
            updatePanel(panelKey, val);
        }
        updatePanel("starSystemScale", newScale);
    }

    function setStarLabelScale(newScale: number) {
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
            (GAME_CONFIG as Record<string, any>)[configKey] = val;
        }
        GAME_CONFIG.STAR_LABEL_SCALE = newScale;
        for (const [panelKey, , val] of updates) {
            updatePanel(panelKey, val);
        }
        updatePanel("starLabelScale", newScale);
    }

    function getArrowOutlineTone(): string {
        const color = panel.arrowOutlineColor ?? GAME_CONFIG.ARROW_OUTLINE_COLOR ?? 0x000000;
        if (color === 0x18273f) return "steel";
        if (color === 0xffffff) return "bright";
        return "shadow";
    }

    function setArrowOutlineTone(tone: string) {
        const color = tone === "steel" ? 0x18273f : tone === "bright" ? 0xffffff : 0x000000;
        writePanelConfig("arrowOutlineColor", "ARROW_OUTLINE_COLOR", color);
    }
</script>

<CategoryThemeBar category="ships" onApply={() => syncFromConfig?.()} />

<!-- ── Master Star System Scale ── -->
<h4 class="sub-heading">Star System Scale</h4>
<div class="var-row">
    <PaxSettingsRangeRow
        label="System Scale"
        value={panel.starSystemScale ?? 1}
        min={0.3}
        max={3}
        step={0.05}
        output={`${((panel.starSystemScale ?? 1) as number).toFixed(2)}x`}
        settingConfigKey="STAR_SYSTEM_SCALE"
        onInput={setStarSystemScale}
    />
</div>

<!-- ── Ship Size & Shape ── -->
<h4 class="sub-heading">Ship Size & Shape</h4>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Visual Radius"
        value={panel.shipVisualRadius ?? 3}
        min={1}
        max={8}
        step={0.5}
        format="fixed1"
        settingConfigKey="SHIP_VISUAL_RADIUS"
        onInput={(value) => writePanelConfig("shipVisualRadius", "SHIP_VISUAL_RADIUS", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Scale Multiplier"
        value={panel.shipScaleMult ?? GAME_CONFIG.SHIP_SCALE_MULT ?? 1}
        min={0.3}
        max={3}
        step={0.1}
        output={`${((panel.shipScaleMult ?? GAME_CONFIG.SHIP_SCALE_MULT ?? 1) as number).toFixed(1)}x`}
        settingConfigKey="SHIP_SCALE_MULT"
        onInput={(value) => writePanelConfig("shipScaleMult", "SHIP_SCALE_MULT", value)}
    />
</div>
<PaxSettingsToggleRow
    label="Ship Outline"
    checked={panel.shipOutlineOn ?? GAME_CONFIG.SHIP_OUTLINE_ON ?? false}
    meta={(panel.shipOutlineOn ?? GAME_CONFIG.SHIP_OUTLINE_ON ?? false) ? "On" : "Off"}
    settingConfigKey="SHIP_OUTLINE_ON"
    onChange={(value) => writePanelConfig("shipOutlineOn", "SHIP_OUTLINE_ON", value)}
/>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Outline px"
        value={panel.shipOutlinePx ?? GAME_CONFIG.SHIP_OUTLINE_PX ?? 0}
        min={0.2}
        max={3}
        step={0.1}
        format="fixed1"
        settingConfigKey="SHIP_OUTLINE_PX"
        onInput={(value) => writePanelConfig("shipOutlinePx", "SHIP_OUTLINE_PX", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Glow Intensity"
        value={panel.shipGlowIntensity ?? GAME_CONFIG.SHIP_GLOW_INTENSITY ?? 0}
        min={0}
        max={1}
        step={0.02}
        format="fixed2"
        settingConfigKey="SHIP_GLOW_INTENSITY"
        onInput={(value) => writePanelConfig("shipGlowIntensity", "SHIP_GLOW_INTENSITY", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Glow Radius"
        value={panel.shipGlowRadius ?? GAME_CONFIG.SHIP_GLOW_RADIUS ?? 0}
        min={0}
        max={15}
        step={0.5}
        format="fixed1"
        settingConfigKey="SHIP_GLOW_RADIUS"
        onInput={(value) => writePanelConfig("shipGlowRadius", "SHIP_GLOW_RADIUS", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Min Contrast"
        value={panel.minColorLightness ?? GAME_CONFIG.MIN_COLOR_LIGHTNESS ?? 0}
        min={0}
        max={0.6}
        step={0.01}
        format="fixed2"
        settingConfigKey="MIN_COLOR_LIGHTNESS"
        onInput={(value) => writePanelConfig("minColorLightness", "MIN_COLOR_LIGHTNESS", value)}
    />
</div>

<!-- ── Star Halos (F-47) ── -->
<h4 class="sub-heading">Star Halos</h4>
<PaxSettingsToggleRow
    label="Show Halos"
    checked={panel.showStarPower ?? GAME_CONFIG.SHOW_STAR_POWER ?? false}
    meta={(panel.showStarPower ?? GAME_CONFIG.SHOW_STAR_POWER ?? false) ? "On" : "Off"}
    settingConfigKey="SHOW_STAR_POWER"
    onChange={(value) => writePanelConfig("showStarPower", "SHOW_STAR_POWER", value)}
/>
{#if panel.showStarPower}
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Halo Alpha"
            value={panel.starPowerAlpha ?? GAME_CONFIG.STAR_POWER_ALPHA ?? 0}
            min={0}
            max={0.3}
            step={0.005}
            format="fixed2"
            settingConfigKey="STAR_POWER_ALPHA"
            onInput={(value) => writePanelConfig("starPowerAlpha", "STAR_POWER_ALPHA", value)}
        />
    </div>
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Halo Radius"
            value={panel.starPowerRadiusMult ?? GAME_CONFIG.STAR_POWER_RADIUS_MULT ?? 1}
            min={1}
            max={8}
            step={0.5}
            format="fixed1"
            settingConfigKey="STAR_POWER_RADIUS_MULT"
            onInput={(value) => writePanelConfig("starPowerRadiusMult", "STAR_POWER_RADIUS_MULT", value)}
        />
    </div>
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Halo Layers"
            value={panel.starPowerLayers ?? GAME_CONFIG.STAR_POWER_LAYERS ?? 1}
            min={1}
            max={12}
            step={1}
            output={`${panel.starPowerLayers ?? GAME_CONFIG.STAR_POWER_LAYERS ?? 1}`}
            settingConfigKey="STAR_POWER_LAYERS"
            onInput={(value) => writePanelConfig("starPowerLayers", "STAR_POWER_LAYERS", value)}
        />
    </div>
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Halo Blur"
            value={panel.starPowerBlur ?? GAME_CONFIG.STAR_POWER_BLUR ?? 0}
            min={0}
            max={20}
            step={1}
            suffix="px"
            settingConfigKey="STAR_POWER_BLUR"
            onInput={(value) => writePanelConfig("starPowerBlur", "STAR_POWER_BLUR", value)}
        />
    </div>
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Layer Curve"
            value={panel.starPowerLayerCurve ?? GAME_CONFIG.STAR_POWER_LAYER_CURVE ?? 1}
            min={0.4}
            max={2.5}
            step={0.05}
            format="fixed2"
            settingConfigKey="STAR_POWER_LAYER_CURVE"
            onInput={(value) => writePanelConfig("starPowerLayerCurve", "STAR_POWER_LAYER_CURVE", value)}
        />
    </div>
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Edge Band"
            value={panel.starPowerEdgeBandStrength ?? GAME_CONFIG.STAR_POWER_EDGE_BAND_STRENGTH ?? 0}
            min={0}
            max={1}
            step={0.05}
            format="fixed2"
            settingConfigKey="STAR_POWER_EDGE_BAND_STRENGTH"
            onInput={(value) => writePanelConfig("starPowerEdgeBandStrength", "STAR_POWER_EDGE_BAND_STRENGTH", value)}
        />
    </div>
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Edge Width"
            value={panel.starPowerEdgeBandWidth ?? GAME_CONFIG.STAR_POWER_EDGE_BAND_WIDTH ?? 0.2}
            min={0.05}
            max={0.6}
            step={0.01}
            format="fixed2"
            settingConfigKey="STAR_POWER_EDGE_BAND_WIDTH"
            onInput={(value) => writePanelConfig("starPowerEdgeBandWidth", "STAR_POWER_EDGE_BAND_WIDTH", value)}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">
                Glow-Dominant Ownership
                <PaxInfoHint text="Opt-in halo-heavy preset for ownership readability experiments." />
            </span>
            <PaxHudButton
                label="Apply Experimental Preset"
                size="sm"
                onclick={applyGlowDominantOwnershipPreset}
            />
        </div>
    </div>
    <PaxSettingsToggleRow
        label="Fleet Glow"
        checked={panel.haloFleetScale ?? GAME_CONFIG.HALO_FLEET_SCALE ?? false}
        meta={(panel.haloFleetScale ?? GAME_CONFIG.HALO_FLEET_SCALE ?? false) ? "On" : "Off"}
        settingConfigKey="HALO_FLEET_SCALE"
        onChange={(value) => writePanelConfig("haloFleetScale", "HALO_FLEET_SCALE", value)}
    />
    {#if panel.haloFleetScale}
        <div class="var-row">
            <PaxSettingsRangeRow
                label="Fleet Intensity"
                value={panel.haloFleetIntensity ?? GAME_CONFIG.HALO_FLEET_INTENSITY ?? 0}
                min={0}
                max={2}
                step={0.1}
                output={`${((panel.haloFleetIntensity ?? GAME_CONFIG.HALO_FLEET_INTENSITY ?? 0) as number).toFixed(1)}x`}
                settingConfigKey="HALO_FLEET_INTENSITY"
                onInput={(value) => writePanelConfig("haloFleetIntensity", "HALO_FLEET_INTENSITY", value)}
            />
        </div>
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Fleet Mode</span>
                <PaxHudSegmentedControl
                    ariaLabel="Halo fleet mode"
                    value={panel.haloFleetMode ?? GAME_CONFIG.HALO_FLEET_MODE ?? "stepped"}
                    options={HALO_FLEET_MODE_OPTIONS}
                    density="compact"
                    onValueChange={(value) => writePanelConfig("haloFleetMode", "HALO_FLEET_MODE", value)}
                />
            </div>
        </div>
        {#if panel.haloFleetMode === "stepped"}
            <div class="var-row">
                <PaxSettingsRangeRow
                    label="Step Size"
                    value={panel.haloFleetStepSize ?? GAME_CONFIG.HALO_FLEET_STEP_SIZE ?? 100}
                    min={100}
                    max={2000}
                    step={100}
                    output={`${panel.haloFleetStepSize ?? GAME_CONFIG.HALO_FLEET_STEP_SIZE ?? 100} ships`}
                    settingConfigKey="HALO_FLEET_STEP_SIZE"
                    onInput={(value) => writePanelConfig("haloFleetStepSize", "HALO_FLEET_STEP_SIZE", value)}
                />
            </div>
        {/if}
        {#if panel.haloFleetMode === "linear"}
            <div class="var-row">
                <PaxSettingsRangeRow
                    label="Max Ships"
                    value={panel.haloFleetMaxShips ?? GAME_CONFIG.HALO_FLEET_MAX_SHIPS ?? 50}
                    min={50}
                    max={5000}
                    step={50}
                    output={`${panel.haloFleetMaxShips ?? GAME_CONFIG.HALO_FLEET_MAX_SHIPS ?? 50}`}
                    settingConfigKey="HALO_FLEET_MAX_SHIPS"
                    onInput={(value) => writePanelConfig("haloFleetMaxShips", "HALO_FLEET_MAX_SHIPS", value)}
                />
            </div>
        {/if}
    {/if}
{/if}

<!-- ── Orbit Layout ── -->
<h4 class="sub-heading">Orbit Layout</h4>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Inner Orbit Padding"
        value={panel.orbitBaseRadius ?? GAME_CONFIG.ORBIT_BASE_RADIUS ?? 0}
        min={0}
        max={20}
        step={0.5}
        format="fixed1"
        settingConfigKey="ORBIT_BASE_RADIUS"
        onInput={(value) => writePanelConfig("orbitBaseRadius", "ORBIT_BASE_RADIUS", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Orbit Spacing Size"
        value={panel.shipBaseSize ?? GAME_CONFIG.SHIP_BASE_SIZE ?? 1}
        min={1}
        max={12}
        step={0.1}
        format="fixed1"
        settingConfigKey="SHIP_BASE_SIZE"
        onInput={(value) => writePanelConfig("shipBaseSize", "SHIP_BASE_SIZE", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Ring Spacing"
        value={panel.orbitRingMult ?? GAME_CONFIG.ORBIT_RING_MULT ?? 0.5}
        min={0.5}
        max={4}
        step={0.1}
        output={`${((panel.orbitRingMult ?? GAME_CONFIG.ORBIT_RING_MULT ?? 0.5) as number).toFixed(1)}x`}
        settingConfigKey="ORBIT_RING_MULT"
        onInput={(value) => writePanelConfig("orbitRingMult", "ORBIT_RING_MULT", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Ship Spacing"
        value={panel.orbitDensity ?? GAME_CONFIG.ORBIT_DENSITY ?? 0.5}
        min={0.5}
        max={4}
        step={0.1}
        format="fixed1"
        settingConfigKey="ORBIT_DENSITY"
        onInput={(value) => writePanelConfig("orbitDensity", "ORBIT_DENSITY", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Max Ships/Star"
        value={panel.maxVisualShips ?? GAME_CONFIG.MAX_VISUAL_SHIPS ?? 10}
        min={10}
        max={500}
        step={10}
        output={`${panel.maxVisualShips ?? GAME_CONFIG.MAX_VISUAL_SHIPS ?? 10}`}
        settingConfigKey="MAX_VISUAL_SHIPS"
        onInput={(value) => writePanelConfig("maxVisualShips", "MAX_VISUAL_SHIPS", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Star Radius"
        value={panel.starRenderRadius ?? GAME_CONFIG.STAR_RENDER_RADIUS ?? 5}
        min={5}
        max={50}
        step={1}
        output={`${panel.starRenderRadius ?? GAME_CONFIG.STAR_RENDER_RADIUS ?? 5}`}
        settingConfigKey="STAR_RENDER_RADIUS"
        onInput={(value) => writePanelConfig("starRenderRadius", "STAR_RENDER_RADIUS", value)}
    />
</div>

<!-- ── Star Shape ── -->
<h4 class="sub-heading">Star Shape</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shape Mode</span>
    </div>
    <PaxHudSegmentedControl
        value={panel.starShapeMode ?? GAME_CONFIG.STAR_SHAPE_MODE ?? "polygon"}
        options={STAR_SHAPE_MODE_OPTIONS}
        ariaLabel="Star shape mode"
        density="compact"
        onValueChange={(value) => writePanelConfig("starShapeMode", "STAR_SHAPE_MODE", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Icon Scale"
        value={panel.starIconScale ?? GAME_CONFIG.STAR_ICON_SCALE ?? 0.55}
        min={0.2}
        max={0.8}
        step={0.05}
        format="fixed2"
        settingConfigKey="STAR_ICON_SCALE"
        onInput={(value) => writePanelConfig("starIconScale", "STAR_ICON_SCALE", value)}
    />
</div>
{#if panel.starShapeMode === "polygon"}
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Corner Radius"
            value={panel.starCornerRadius ?? GAME_CONFIG.STAR_CORNER_RADIUS ?? 0.3}
            min={0}
            max={1}
            step={0.05}
            format="fixed2"
            settingConfigKey="STAR_CORNER_RADIUS"
            onInput={(value) => writePanelConfig("starCornerRadius", "STAR_CORNER_RADIUS", value)}
        />
    </div>
{/if}

<h4 class="sub-heading">Ownership Ring</h4>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Ring Radius"
        value={panel.starRingRadius ?? GAME_CONFIG.STAR_RING_RADIUS ?? 30}
        min={0}
        max={60}
        step={1}
        suffix="px"
        settingConfigKey="STAR_RING_RADIUS"
        onInput={(value) => writePanelConfig("starRingRadius", "STAR_RING_RADIUS", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Ring Width"
        value={panel.starRingWidth ?? GAME_CONFIG.STAR_RING_WIDTH ?? 2}
        min={0}
        max={6}
        step={0.5}
        format="fixed1"
        settingConfigKey="STAR_RING_WIDTH"
        onInput={(value) => writePanelConfig("starRingWidth", "STAR_RING_WIDTH", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Ring Alpha"
        value={panel.starRingAlpha ?? GAME_CONFIG.STAR_RING_ALPHA ?? 0.8}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="STAR_RING_ALPHA"
        onInput={(value) => writePanelConfig("starRingAlpha", "STAR_RING_ALPHA", value)}
    />
</div>
<!-- Ownership-ring SLA -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Ring Saturation"
        value={panel.starRingSaturation ?? GAME_CONFIG.STAR_RING_SATURATION ?? 1.0}
        min={0}
        max={2}
        step={0.05}
        format="fixed2"
        settingConfigKey="STAR_RING_SATURATION"
        onInput={(value) => writePanelConfig("starRingSaturation", "STAR_RING_SATURATION", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Ring Lightness"
        value={panel.starRingLightness ?? GAME_CONFIG.STAR_RING_LIGHTNESS ?? 1.0}
        min={0}
        max={2}
        step={0.05}
        format="fixed2"
        settingConfigKey="STAR_RING_LIGHTNESS"
        onInput={(value) => writePanelConfig("starRingLightness", "STAR_RING_LIGHTNESS", value)}
    />
</div>

<!-- ── Star Labels (Pill) ── -->
<h4 class="sub-heading">Star Labels</h4>

<!-- Layout Toggle: Pill vs Stacked (large buttons) -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Layout</span>
    </div>
    <PaxHudSegmentedControl
        value={panel.starLabelLayout ?? GAME_CONFIG.STAR_LABEL_LAYOUT ?? "horizontal"}
        options={STAR_LABEL_LAYOUT_OPTIONS}
        ariaLabel="Star label layout"
        density="compact"
        onValueChange={(value) => writePanelConfig("starLabelLayout", "STAR_LABEL_LAYOUT", value)}
    />
</div>

<!-- Master Font Scale -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Label Font Scale"
        value={panel.starLabelScale ?? GAME_CONFIG.STAR_LABEL_SCALE ?? 1.0}
        min={0.3}
        max={3.0}
        step={0.05}
        format="multiplier"
        settingConfigKey="STAR_LABEL_SCALE"
        onInput={setStarLabelScale}
    />
</div>

<!-- Angle -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Angle"
        value={panel.starLabelAngle ?? GAME_CONFIG.STAR_LABEL_ANGLE ?? 35}
        min={0}
        max={360}
        step={5}
        suffix="deg"
        settingConfigKey="STAR_LABEL_ANGLE"
        onInput={(value) => writePanelConfig("starLabelAngle", "STAR_LABEL_ANGLE", value)}
    />
</div>

<!-- Distance -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Distance"
        value={panel.starLabelDistance ?? GAME_CONFIG.STAR_LABEL_DISTANCE ?? 55}
        min={10}
        max={150}
        step={5}
        suffix="px"
        settingConfigKey="STAR_LABEL_DISTANCE"
        onInput={(value) => writePanelConfig("starLabelDistance", "STAR_LABEL_DISTANCE", value)}
    />
</div>

<!-- Star ID Font -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="ID Font"
        value={panel.starLabelIdFontSize ?? GAME_CONFIG.STAR_LABEL_ID_FONT_SIZE ?? 13}
        min={6}
        max={30}
        step={1}
        settingConfigKey="STAR_LABEL_ID_FONT_SIZE"
        onInput={(value) => writePanelConfig("starLabelIdFontSize", "STAR_LABEL_ID_FONT_SIZE", value)}
    />
</div>

<!-- Active Ships Font -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Active Font"
        value={panel.starLabelFontSize ?? GAME_CONFIG.STAR_LABEL_FONT_SIZE ?? 14}
        min={8}
        max={40}
        step={1}
        settingConfigKey="STAR_LABEL_FONT_SIZE"
        onInput={(value) => writePanelConfig("starLabelFontSize", "STAR_LABEL_FONT_SIZE", value)}
    />
</div>

<!-- Damaged Ships Font -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Damaged Font"
        value={panel.starLabelDamagedFontSize ?? GAME_CONFIG.STAR_LABEL_DAMAGED_FONT_SIZE ?? 12}
        min={6}
        max={30}
        step={1}
        settingConfigKey="STAR_LABEL_DAMAGED_FONT_SIZE"
        onInput={(value) => writePanelConfig("starLabelDamagedFontSize", "STAR_LABEL_DAMAGED_FONT_SIZE", value)}
    />
</div>

<!-- Pad X -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Pad X"
        value={panel.starLabelPadX ?? GAME_CONFIG.STAR_LABEL_PAD_X ?? 4}
        min={0}
        max={20}
        step={1}
        suffix="px"
        settingConfigKey="STAR_LABEL_PAD_X"
        onInput={(value) => writePanelConfig("starLabelPadX", "STAR_LABEL_PAD_X", value)}
    />
</div>

<!-- Pad Y -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Pad Y"
        value={panel.starLabelPadY ?? GAME_CONFIG.STAR_LABEL_PAD_Y ?? 2}
        min={0}
        max={20}
        step={1}
        suffix="px"
        settingConfigKey="STAR_LABEL_PAD_Y"
        onInput={(value) => writePanelConfig("starLabelPadY", "STAR_LABEL_PAD_Y", value)}
    />
</div>

<!-- Gap -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Gap"
        value={panel.starLabelGap ?? GAME_CONFIG.STAR_LABEL_GAP ?? 2}
        min={0}
        max={12}
        step={1}
        suffix="px"
        settingConfigKey="STAR_LABEL_GAP"
        onInput={(value) => writePanelConfig("starLabelGap", "STAR_LABEL_GAP", value)}
    />
</div>

<!-- BG Alpha -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="BG Opacity"
        value={panel.starLabelBgAlpha ?? GAME_CONFIG.STAR_LABEL_BG_ALPHA ?? 0.75}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="STAR_LABEL_BG_ALPHA"
        onInput={(value) => writePanelConfig("starLabelBgAlpha", "STAR_LABEL_BG_ALPHA", value)}
    />
</div>

<!-- Border Alpha -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Border Opacity"
        value={panel.starLabelBorderAlpha ?? GAME_CONFIG.STAR_LABEL_BORDER_ALPHA ?? 0.5}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="STAR_LABEL_BORDER_ALPHA"
        onInput={(value) => writePanelConfig("starLabelBorderAlpha", "STAR_LABEL_BORDER_ALPHA", value)}
    />
</div>

<!-- Line Height (vertical mode) -->
{#if GAME_CONFIG.STAR_LABEL_LAYOUT === "vertical"}
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Line Height"
            value={panel.starLabelLineHeight ?? GAME_CONFIG.STAR_LABEL_LINE_HEIGHT ?? 18}
            min={8}
            max={40}
            step={1}
            suffix="px"
            settingConfigKey="STAR_LABEL_LINE_HEIGHT"
            onInput={(value) => writePanelConfig("starLabelLineHeight", "STAR_LABEL_LINE_HEIGHT", value)}
        />
    </div>
{/if}

<!-- Color Mode: Player vs Universal (large toggle) -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Tag Color</span>
    </div>
    <PaxHudSegmentedControl
        value={panel.starLabelColorMode ?? GAME_CONFIG.STAR_LABEL_COLOR_MODE ?? "player"}
        options={STAR_LABEL_COLOR_MODE_OPTIONS}
        ariaLabel="Star label color mode"
        density="compact"
        onValueChange={(value) => writePanelConfig("starLabelColorMode", "STAR_LABEL_COLOR_MODE", value)}
    />
</div>

<!-- Universal HSLA sliders (only shown in universal mode) -->
{#if GAME_CONFIG.STAR_LABEL_COLOR_MODE === "universal"}
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Hue"
            value={panel.starLabelUniversalH ?? GAME_CONFIG.STAR_LABEL_UNIVERSAL_H ?? 220}
            min={0}
            max={360}
            step={1}
            suffix="deg"
            settingConfigKey="STAR_LABEL_UNIVERSAL_H"
            onInput={(value) => writePanelConfig("starLabelUniversalH", "STAR_LABEL_UNIVERSAL_H", value)}
        />
    </div>
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Saturation"
            value={panel.starLabelUniversalS ?? GAME_CONFIG.STAR_LABEL_UNIVERSAL_S ?? 30}
            min={0}
            max={100}
            step={1}
            suffix="%"
            settingConfigKey="STAR_LABEL_UNIVERSAL_S"
            onInput={(value) => writePanelConfig("starLabelUniversalS", "STAR_LABEL_UNIVERSAL_S", value)}
        />
    </div>
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Lightness"
            value={panel.starLabelUniversalL ?? GAME_CONFIG.STAR_LABEL_UNIVERSAL_L ?? 25}
            min={0}
            max={100}
            step={1}
            suffix="%"
            settingConfigKey="STAR_LABEL_UNIVERSAL_L"
            onInput={(value) => writePanelConfig("starLabelUniversalL", "STAR_LABEL_UNIVERSAL_L", value)}
        />
    </div>
    <div class="var-row">
        <PaxSettingsRangeRow
            label="Alpha"
            value={panel.starLabelUniversalA ?? GAME_CONFIG.STAR_LABEL_UNIVERSAL_A ?? 0.75}
            min={0}
            max={1}
            step={0.05}
            format="fixed2"
            settingConfigKey="STAR_LABEL_UNIVERSAL_A"
            onInput={(value) => writePanelConfig("starLabelUniversalA", "STAR_LABEL_UNIVERSAL_A", value)}
        />
    </div>
{/if}

<!-- Border Width -->
<div class="var-row">
    <PaxSettingsRangeRow
        label="Border Width"
        value={panel.starLabelBorderWidth ?? GAME_CONFIG.STAR_LABEL_BORDER_WIDTH ?? 1}
        min={0}
        max={5}
        step={0.5}
        output={`${(panel.starLabelBorderWidth ?? GAME_CONFIG.STAR_LABEL_BORDER_WIDTH ?? 1).toFixed(1)}px`}
        settingConfigKey="STAR_LABEL_BORDER_WIDTH"
        onInput={(value) => writePanelConfig("starLabelBorderWidth", "STAR_LABEL_BORDER_WIDTH", value)}
    />
</div>

<!-- Leash toggle -->
<div class="var-row">
    <PaxSettingsToggleRow
        label="Leash Line"
        checked={panel.starLabelLeash ?? GAME_CONFIG.STAR_LABEL_LEASH ?? false}
        settingConfigKey="STAR_LABEL_LEASH"
        onToggle={(value) => writePanelConfig("starLabelLeash", "STAR_LABEL_LEASH", value)}
    />
</div>

<!-- ── Order Arrows ── -->
<h4 class="sub-heading">Order Arrows</h4>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Arrowhead Size"
        value={panel.arrowHeadSize ?? GAME_CONFIG.ARROW_HEAD_SIZE ?? 30}
        min={5}
        max={60}
        step={5}
        suffix="px"
        settingConfigKey="ARROW_HEAD_SIZE"
        onInput={(value) => writePanelConfig("arrowHeadSize", "ARROW_HEAD_SIZE", value)}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Arrowhead Style</span>
    </div>
    <PaxHudSegmentedControl
        value={panel.arrowHeadStyle ?? GAME_CONFIG.ARROW_HEAD_STYLE ?? "triangle"}
        options={ARROW_HEAD_STYLE_OPTIONS}
        ariaLabel="Arrowhead style"
        density="compact"
        onValueChange={(value) => writePanelConfig("arrowHeadStyle", "ARROW_HEAD_STYLE", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Arrowhead Spread"
        value={panel.arrowHeadSpreadDeg ?? GAME_CONFIG.ARROW_HEAD_SPREAD_DEG ?? 30}
        min={10}
        max={70}
        step={1}
        suffix="deg"
        settingConfigKey="ARROW_HEAD_SPREAD_DEG"
        onInput={(value) => writePanelConfig("arrowHeadSpreadDeg", "ARROW_HEAD_SPREAD_DEG", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Arrowhead Notch"
        value={panel.arrowHeadNotch ?? GAME_CONFIG.ARROW_HEAD_NOTCH ?? 0.2}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="ARROW_HEAD_NOTCH"
        onInput={(value) => writePanelConfig("arrowHeadNotch", "ARROW_HEAD_NOTCH", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Shaft Width"
        value={panel.arrowShaftWidth ?? GAME_CONFIG.ARROW_SHAFT_WIDTH ?? 6}
        min={1}
        max={12}
        step={1}
        suffix="px"
        settingConfigKey="ARROW_SHAFT_WIDTH"
        onInput={(value) => writePanelConfig("arrowShaftWidth", "ARROW_SHAFT_WIDTH", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Arrow Opacity"
        value={panel.arrowAlpha ?? GAME_CONFIG.ARROW_ALPHA ?? 0.6}
        min={0.1}
        max={1.0}
        step={0.05}
        format="fixed2"
        settingConfigKey="ARROW_ALPHA"
        onInput={(value) => writePanelConfig("arrowAlpha", "ARROW_ALPHA", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Gradient Steps"
        value={panel.arrowShaftSteps ?? GAME_CONFIG.ARROW_SHAFT_STEPS ?? 6}
        min={1}
        max={16}
        step={1}
        settingConfigKey="ARROW_SHAFT_STEPS"
        onInput={(value) => writePanelConfig("arrowShaftSteps", "ARROW_SHAFT_STEPS", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Flow Speed"
        value={panel.arrowFlowSpeed ?? GAME_CONFIG.ARROW_FLOW_SPEED ?? 1.2}
        min={0}
        max={3}
        step={0.05}
        format="multiplier"
        settingConfigKey="ARROW_FLOW_SPEED"
        onInput={(value) => writePanelConfig("arrowFlowSpeed", "ARROW_FLOW_SPEED", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Dash Length"
        value={panel.arrowDashLength ?? GAME_CONFIG.ARROW_DASH_LENGTH ?? 15}
        min={3}
        max={30}
        step={1}
        suffix="px"
        settingConfigKey="ARROW_DASH_LENGTH"
        onInput={(value) => writePanelConfig("arrowDashLength", "ARROW_DASH_LENGTH", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Head VFX"
        value={panel.arrowHeadVfxAlpha ?? GAME_CONFIG.ARROW_HEAD_VFX_ALPHA ?? 0.16}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="ARROW_HEAD_VFX_ALPHA"
        onInput={(value) => writePanelConfig("arrowHeadVfxAlpha", "ARROW_HEAD_VFX_ALPHA", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Force Reactivity"
        value={panel.arrowForceIntensity ?? GAME_CONFIG.ARROW_FORCE_INTENSITY ?? 0.4}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="ARROW_FORCE_INTENSITY"
        onInput={(value) => writePanelConfig("arrowForceIntensity", "ARROW_FORCE_INTENSITY", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Force Ceiling"
        value={panel.arrowForceIntensityMaxShips ?? GAME_CONFIG.ARROW_FORCE_INTENSITY_MAX_SHIPS ?? 250}
        min={25}
        max={1000}
        step={25}
        suffix=" ships"
        settingConfigKey="ARROW_FORCE_INTENSITY_MAX_SHIPS"
        onInput={(value) => writePanelConfig("arrowForceIntensityMaxShips", "ARROW_FORCE_INTENSITY_MAX_SHIPS", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Dash Gap"
        value={panel.arrowDashGap ?? GAME_CONFIG.ARROW_DASH_GAP ?? 10}
        min={2}
        max={25}
        step={1}
        suffix="px"
        settingConfigKey="ARROW_DASH_GAP"
        onInput={(value) => writePanelConfig("arrowDashGap", "ARROW_DASH_GAP", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Head Opacity"
        value={panel.arrowHeadAlpha ?? GAME_CONFIG.ARROW_HEAD_ALPHA ?? 0.6}
        min={0.1}
        max={1.0}
        step={0.05}
        format="fixed2"
        settingConfigKey="ARROW_HEAD_ALPHA"
        onInput={(value) => writePanelConfig("arrowHeadAlpha", "ARROW_HEAD_ALPHA", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Outline Width"
        value={panel.arrowOutlineWidth ?? GAME_CONFIG.ARROW_OUTLINE_WIDTH ?? 0}
        min={0}
        max={5}
        step={0.5}
        output={`${(panel.arrowOutlineWidth ?? GAME_CONFIG.ARROW_OUTLINE_WIDTH ?? 0).toFixed(1)}px`}
        settingConfigKey="ARROW_OUTLINE_WIDTH"
        onInput={(value) => writePanelConfig("arrowOutlineWidth", "ARROW_OUTLINE_WIDTH", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Outline Opacity"
        value={panel.arrowOutlineAlpha ?? GAME_CONFIG.ARROW_OUTLINE_ALPHA ?? 0.6}
        min={0}
        max={1.0}
        step={0.05}
        format="fixed2"
        settingConfigKey="ARROW_OUTLINE_ALPHA"
        onInput={(value) => writePanelConfig("arrowOutlineAlpha", "ARROW_OUTLINE_ALPHA", value)}
    />
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Outline Tone</span>
    </div>
    <PaxHudSegmentedControl
        value={getArrowOutlineTone()}
        options={ARROW_OUTLINE_TONE_OPTIONS}
        ariaLabel="Arrow outline tone"
        density="compact"
        onValueChange={setArrowOutlineTone}
    />
</div>

<!-- ── Damaged Ships ── -->
<h4 class="sub-heading">Damaged Ships</h4>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Orbit Radius"
        value={panel.damagedOrbitRadius ?? GAME_CONFIG.DAMAGED_ORBIT_RADIUS ?? 15}
        min={4}
        max={40}
        step={1}
        suffix="px"
        settingConfigKey="DAMAGED_ORBIT_RADIUS"
        onInput={(value) => writePanelConfig("damagedOrbitRadius", "DAMAGED_ORBIT_RADIUS", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsToggleRow
        label="Evade Incoming Fire"
        checked={panel.damagedOrbitEvade ?? GAME_CONFIG.DAMAGED_ORBIT_EVADE ?? false}
        settingConfigKey="DAMAGED_ORBIT_EVADE"
        onToggle={(value) => writePanelConfig("damagedOrbitEvade", "DAMAGED_ORBIT_EVADE", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Damaged Scale"
        value={panel.damagedShipScale ?? GAME_CONFIG.DAMAGED_SHIP_SCALE ?? 0.7}
        min={0.1}
        max={1.5}
        step={0.05}
        format="multiplier"
        settingConfigKey="DAMAGED_SHIP_SCALE"
        onInput={(value) => writePanelConfig("damagedShipScale", "DAMAGED_SHIP_SCALE", value)}
    />
</div>

<!-- ── Interaction ── -->
<h4 class="sub-heading">Interaction</h4>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Hit Zone Radius"
        value={panel.starHitRadius ?? GAME_CONFIG.STAR_HIT_RADIUS ?? 50}
        min={20}
        max={120}
        step={5}
        suffix="px"
        settingConfigKey="STAR_HIT_RADIUS"
        onInput={(value) => writePanelConfig("starHitRadius", "STAR_HIT_RADIUS", value)}
    />
</div>

<!-- ── Density Coloring ── -->
<h4 class="sub-heading">Density Coloring</h4>
{#each DENSITY_VARIABLES as v}
    {@const panelKey = DENSITY_PANEL_MAP[v.key] ?? v.key}
    <div class="var-row">
        <PaxSettingsRangeRow
            label={v.label}
            value={panel[panelKey] ?? (GAME_CONFIG as Record<string, any>)[v.key] ?? v.min}
            min={v.min}
            max={v.max}
            step={v.step}
            format="fixed2"
            settingConfigKey={v.key}
            onInput={(value) => writePanelConfig(panelKey, v.key, value)}
        />
    </div>
{/each}
<div class="var-row">
    <PaxSettingsToggleRow
        label="Alternate Darkening"
        checked={panel.densityDarkenAlt ?? GAME_CONFIG.DENSITY_DARKEN_ALT ?? false}
        settingConfigKey="DENSITY_DARKEN_ALT"
        onToggle={(value) => writePanelConfig("densityDarkenAlt", "DENSITY_DARKEN_ALT", value)}
    />
</div>

<!-- ── Star Glow ── -->
<h4 class="sub-heading">Star Glow</h4>
<div class="var-row">
    <PaxSettingsToggleRow
        label="Glow Enabled"
        checked={panel.starGlowOn ?? GAME_CONFIG.STAR_GLOW_ON ?? false}
        settingConfigKey="STAR_GLOW_ON"
        onToggle={(value) => writePanelConfig("starGlowOn", "STAR_GLOW_ON", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Glow Radius"
        value={panel.starGlowRadiusMult ?? GAME_CONFIG.STAR_GLOW_RADIUS_MULT ?? 1.3}
        min={0.5}
        max={3.0}
        step={0.1}
        output={`${(panel.starGlowRadiusMult ?? GAME_CONFIG.STAR_GLOW_RADIUS_MULT ?? 1.3).toFixed(1)}x`}
        settingConfigKey="STAR_GLOW_RADIUS_MULT"
        onInput={(value) => writePanelConfig("starGlowRadiusMult", "STAR_GLOW_RADIUS_MULT", value)}
    />
</div>
<div class="var-row">
    <PaxSettingsRangeRow
        label="Glow Intensity"
        value={panel.starGlowIntensity ?? GAME_CONFIG.STAR_GLOW_INTENSITY ?? 0.25}
        min={0}
        max={1.0}
        step={0.02}
        format="fixed2"
        settingConfigKey="STAR_GLOW_INTENSITY"
        onInput={(value) => writePanelConfig("starGlowIntensity", "STAR_GLOW_INTENSITY", value)}
    />
</div>
