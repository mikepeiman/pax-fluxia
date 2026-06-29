<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        PaxSettingsRangeRow,
        PaxSettingsSegmentedRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();

    const CONQUEST_MODE_OPTIONS = [
        { value: "immediate", label: "Immediate" },
        { value: "surge", label: "Surge" },
        { value: "travel", label: "Travel" },
        { value: "arrowhead", label: "Arrowhead" },
    ];

    const ARROW_EASING_OPTIONS = [
        { value: "easeIn", label: "In" },
        { value: "easeInOut", label: "In-out" },
        { value: "linear", label: "Linear" },
    ];

    const ENGULF_MODE_OPTIONS = [
        { value: "fan", label: "Fan" },
        { value: "collapse", label: "Collapse" },
        { value: "ring", label: "Ring" },
        { value: "swarm", label: "Swarm" },
    ];
</script>

<CategoryThemeBar category="conquest" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Animation</h4>
<PaxSettingsSegmentedRow
    label="Conquest Mode"
    hint="How conquest is animated: Immediate, Surge, Travel, or Arrowhead."
    settingConfigKey="CONQUEST_ANIMATION_MODE"
    value={panel.conquestAnimMode}
    options={CONQUEST_MODE_OPTIONS}
    onValueChange={(value) => {
        GAME_CONFIG.CONQUEST_ANIMATION_MODE = value as
            | "immediate"
            | "surge"
            | "travel"
            | "arrowhead";
        updatePanel("conquestAnimMode", value);
    }}
/>

<PaxSettingsRangeRow
    label="Color Delay"
    value={panel.conquestColorDelayTicks}
    min={0}
    max={10}
    step={0.5}
    suffix=" ticks"
    settingConfigKey="CONQUEST_COLOR_DELAY_TICKS"
    onInput={(value) => {
        GAME_CONFIG.CONQUEST_COLOR_DELAY_TICKS = value;
        updatePanel("conquestColorDelayTicks", value);
    }}
/>

<PaxSettingsRangeRow
    label="Flash Duration"
    value={panel.conquestFlashTicks}
    min={0}
    max={10}
    step={0.5}
    suffix=" ticks"
    settingConfigKey="CONQUEST_FLASH_TICKS"
    onInput={(value) => {
        GAME_CONFIG.CONQUEST_FLASH_TICKS = value;
        updatePanel("conquestFlashTicks", value);
    }}
/>

<PaxSettingsRangeRow
    label="Lerp Delay"
    value={panel.conquestLerpDelayMs}
    min={0}
    max={5000}
    step={10}
    suffix="ms"
    settingConfigKey="CONQUEST_LERP_DELAY_MS"
    onInput={(value) => {
        GAME_CONFIG.CONQUEST_LERP_DELAY_MS = value;
        updatePanel("conquestLerpDelayMs", value);
    }}
/>

<PaxSettingsRangeRow
    label="Travel Speed"
    value={panel.conquestTravelSpeed}
    min={0.01}
    max={2}
    step={0.01}
    format="multiplier"
    settingConfigKey="CONQUEST_TRAVEL_SPEED"
    onInput={(value) => {
        GAME_CONFIG.CONQUEST_TRAVEL_SPEED = value;
        updatePanel("conquestTravelSpeed", value);
    }}
/>

<PaxSettingsRangeRow
    label="Settle Duration"
    value={panel.conquestSettleMs}
    min={0}
    max={5000}
    step={10}
    suffix="ms"
    settingConfigKey="CONQUEST_SETTLE_MS"
    onInput={(value) => {
        GAME_CONFIG.CONQUEST_SETTLE_MS = value;
        updatePanel("conquestSettleMs", value);
    }}
/>

<PaxSettingsRangeRow
    label="Surge Stagger"
    value={panel.conquestSurgeStaggerMs}
    min={0}
    max={200}
    step={5}
    suffix="ms"
    settingConfigKey="CONQUEST_SURGE_STAGGER_MS"
    onInput={(value) => {
        GAME_CONFIG.CONQUEST_SURGE_STAGGER_MS = value;
        updatePanel("conquestSurgeStaggerMs", value);
    }}
/>

<h4 class="sub-heading">Force Glow</h4>
<PaxSettingsToggleRow
    label="Scale Glow With Force"
    checked={panel.conquestForceGlow ?? GAME_CONFIG.CONQUEST_FORCE_GLOW ?? true}
    description="Scale conquest glow with attacker force size."
    meta="Force"
    settingConfigKey="CONQUEST_FORCE_GLOW"
    onChange={(value) => {
        GAME_CONFIG.CONQUEST_FORCE_GLOW = value;
        updatePanel("conquestForceGlow", value);
    }}
/>

<PaxSettingsRangeRow
    label="Glow Multiplier"
    value={panel.conquestForceGlowMult ??
        GAME_CONFIG.CONQUEST_FORCE_GLOW_MULT ??
        0.15}
    min={0}
    max={1}
    step={0.01}
    format="fixed2"
    settingConfigKey="CONQUEST_FORCE_GLOW_MULT"
    onInput={(value) => {
        GAME_CONFIG.CONQUEST_FORCE_GLOW_MULT = value;
        updatePanel("conquestForceGlowMult", value);
    }}
/>

{#if panel.conquestAnimMode === "arrowhead"}
    <h4 class="sub-heading">Arrowhead Formation</h4>
    <PaxSettingsRangeRow
        label="Taper"
        value={panel.arrowTaper}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="ARROW_TAPER"
        onInput={(value) => {
            GAME_CONFIG.ARROW_TAPER = value;
            updatePanel("arrowTaper", value);
        }}
    />

    <PaxSettingsRangeRow
        label="Formation Width"
        value={panel.arrowWidth}
        min={0}
        max={200}
        step={5}
        output={panel.arrowWidth === 0 ? "auto" : `${panel.arrowWidth}px`}
        settingConfigKey="ARROW_WIDTH"
        onInput={(value) => {
            GAME_CONFIG.ARROW_WIDTH = value;
            updatePanel("arrowWidth", value);
        }}
    />

    <PaxSettingsRangeRow
        label="Arrowhead Speed"
        value={panel.arrowSpeed}
        min={0.1}
        max={3}
        step={0.1}
        format="multiplier"
        settingConfigKey="ARROW_SPEED"
        onInput={(value) => {
            GAME_CONFIG.ARROW_SPEED = value;
            updatePanel("arrowSpeed", value);
        }}
    />

    <PaxSettingsSegmentedRow
        label="Arrowhead Easing"
        hint="Easing for the arrowhead conquest animation: ease In, In-out, or Linear."
        settingConfigKey="ARROW_EASING"
        value={panel.arrowEasing}
        options={ARROW_EASING_OPTIONS}
        onValueChange={(value) => {
            GAME_CONFIG.ARROW_EASING = value as
                | "easeIn"
                | "easeInOut"
                | "linear";
            updatePanel("arrowEasing", value);
        }}
    />

    <PaxSettingsToggleRow
        label="Auto Stagger"
        checked={panel.arrowStaggerAuto}
        description="Bind arrowhead stagger timing to the simulation tick."
        meta="Tick"
        settingConfigKey="ARROW_STAGGER_AUTO"
        onChange={(value) => {
            GAME_CONFIG.ARROW_STAGGER_AUTO = value;
            updatePanel("arrowStaggerAuto", value);
        }}
    />

    <PaxSettingsRangeRow
        label="Arrowhead Stagger"
        value={panel.arrowStaggerMs}
        min={0}
        max={100}
        step={1}
        output={panel.arrowStaggerAuto ? "auto" : `${panel.arrowStaggerMs}ms`}
        settingConfigKey="ARROW_STAGGER_MS"
        onInput={(value) => {
            GAME_CONFIG.ARROW_STAGGER_MS = value;
            updatePanel("arrowStaggerMs", value);
        }}
    />

    <h4 class="sub-heading">Arrival Pattern</h4>
    <PaxSettingsSegmentedRow
        label="Engulf Mode"
        hint="Arrival pattern when ships engulf a star: Fan, Collapse, Ring, or Swarm."
        settingConfigKey="ARROW_ENGULF_MODE"
        value={panel.arrowEngulfMode}
        options={ENGULF_MODE_OPTIONS}
        onValueChange={(value) => {
            GAME_CONFIG.ARROW_ENGULF_MODE = value as
                | "fan"
                | "collapse"
                | "ring"
                | "swarm";
            updatePanel("arrowEngulfMode", value);
        }}
    />

    <PaxSettingsRangeRow
        label="Engulf Radius"
        value={panel.arrowEngulfRadius}
        min={10}
        max={200}
        step={5}
        suffix="px"
        settingConfigKey="ARROW_ENGULF_RADIUS"
        onInput={(value) => {
            GAME_CONFIG.ARROW_ENGULF_RADIUS = value;
            updatePanel("arrowEngulfRadius", value);
        }}
    />

    <div class="orb-pair">
        <PaxSettingsRangeRow
            label="Min Degrees"
            value={panel.arrowSpiralMinDeg}
            min={0}
            max={1080}
            step={30}
            suffix="deg"
            settingConfigKey="ARROW_SPIRAL_MIN_DEG"
            onInput={(value) => {
                GAME_CONFIG.ARROW_SPIRAL_MIN_DEG = value;
                updatePanel("arrowSpiralMinDeg", value);
            }}
        />
        <PaxSettingsRangeRow
            label="Max Degrees"
            value={panel.arrowSpiralMaxDeg}
            min={0}
            max={1080}
            step={30}
            suffix="deg"
            settingConfigKey="ARROW_SPIRAL_MAX_DEG"
            onInput={(value) => {
                GAME_CONFIG.ARROW_SPIRAL_MAX_DEG = value;
                updatePanel("arrowSpiralMaxDeg", value);
            }}
        />
    </div>

    <PaxSettingsToggleRow
        label="Random Spiral"
        checked={panel.arrowSpiralRandom as boolean}
        description="Choose a new spiral direction for each conquest."
        meta="Per conquest"
        settingConfigKey="ARROW_SPIRAL_RANDOM"
        onChange={(value) => {
            GAME_CONFIG.ARROW_SPIRAL_RANDOM = value;
            updatePanel("arrowSpiralRandom", value);
        }}
    />

    <PaxSettingsRangeRow
        label="Spiral Duration"
        value={panel.arrowSpiralDurationMs}
        min={0}
        max={3000}
        step={50}
        suffix="ms"
        settingConfigKey="ARROW_SPIRAL_DURATION_MS"
        onInput={(value) => {
            GAME_CONFIG.ARROW_SPIRAL_DURATION_MS = value;
            updatePanel("arrowSpiralDurationMs", value);
        }}
    />
{/if}
