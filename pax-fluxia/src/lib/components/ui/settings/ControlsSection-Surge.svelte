<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        PaxSettingsRangeRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();

    const pulseBound = $derived(
        panel.surgePulseBindToTick ??
            GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK ??
            true,
    );

    function setPulseBindToTick(value: boolean) {
        GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK = value;
        updatePanel("surgePulseBindToTick", value);

        if (value) {
            const tickMs = panel.tickInterval ?? GAME_CONFIG.BASE_TICK_MS;
            GAME_CONFIG.SURGE_PULSE_DURATION_MS = tickMs;
            updatePanel("surgePulseDurationMs", tickMs);
        }
    }
</script>

<CategoryThemeBar category="surge" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Attack Surge</h4>
<PaxSettingsRangeRow
    label="Surge Displacement"
    value={panel.attackSurgeMult}
    min={0}
    max={2}
    step={0.05}
    format="multiplier"
    settingConfigKey="ATTACK_SURGE_MULT"
    onInput={(value) => {
        GAME_CONFIG.ATTACK_SURGE_MULT = value;
        updatePanel("attackSurgeMult", value);
    }}
/>

<PaxSettingsToggleRow
    label="Force-Reactive Surge"
    checked={panel.attackSurgeProportional}
    description="Scale surge distance with the force gap."
    meta="Force gap"
    settingConfigKey="ATTACK_SURGE_PROPORTIONAL"
    onChange={(value) => {
        GAME_CONFIG.ATTACK_SURGE_PROPORTIONAL = value;
        updatePanel("attackSurgeProportional", value);
    }}
/>

{#if panel.attackSurgeProportional}
    <PaxSettingsRangeRow
        label="Force Cofactor"
        value={panel.attackSurgeForceCofactor}
        min={0.1}
        max={5}
        step={0.1}
        format="fixed2"
        settingConfigKey="ATTACK_SURGE_FORCE_COFACTOR"
        onInput={(value) => {
            GAME_CONFIG.ATTACK_SURGE_FORCE_COFACTOR = value;
            updatePanel("attackSurgeForceCofactor", value);
        }}
    />
{/if}

<PaxSettingsRangeRow
    label="Surge Ramp"
    value={panel.attackSurgeRampMs}
    min={0}
    max={2000}
    step={25}
    suffix="ms"
    settingConfigKey="ATTACK_SURGE_RAMP_MS"
    onInput={(value) => {
        GAME_CONFIG.ATTACK_SURGE_RAMP_MS = value;
        updatePanel("attackSurgeRampMs", value);
    }}
/>

<PaxSettingsRangeRow
    label="Surge Shape"
    value={panel.attackSurgeShape}
    min={0.1}
    max={4}
    step={0.1}
    format="fixed1"
    settingConfigKey="ATTACK_SURGE_SHAPE"
    onInput={(value) => {
        GAME_CONFIG.ATTACK_SURGE_SHAPE = value;
        updatePanel("attackSurgeShape", value);
    }}
/>

<h4 class="sub-heading">Pulse Timing</h4>
<PaxSettingsToggleRow
    label="Bind Pulse Duration To Tick"
    checked={pulseBound}
    description="Match surge pulse duration to the simulation tick."
    meta={pulseBound ? "Bound" : "Free"}
    settingConfigKey="SURGE_PULSE_BIND_TO_TICK"
    onChange={setPulseBindToTick}
/>

<PaxSettingsRangeRow
    label="Pulse Duration"
    value={panel.surgePulseDurationMs ?? GAME_CONFIG.SURGE_PULSE_DURATION_MS}
    min={0}
    max={5000}
    step={10}
    suffix="ms"
    disabled={pulseBound}
    settingConfigKey="SURGE_PULSE_DURATION_MS"
    onInput={(value) => {
        GAME_CONFIG.SURGE_PULSE_DURATION_MS = value;
        updatePanel("surgePulseDurationMs", value);
    }}
/>

<h4 class="sub-heading">Orb Merge</h4>
<PaxSettingsToggleRow
    label="Merge Ships Into Orb"
    checked={panel.orbTravel}
    description="Collapse travelling ships into a merged orbital pulse."
    meta="Travel collapse"
    settingConfigKey="ORB_TRAVEL"
    onChange={(value) => {
        GAME_CONFIG.ORB_TRAVEL = value;
        updatePanel("orbTravel", value);
    }}
/>

{#if panel.orbTravel}
    <PaxSettingsRangeRow
        label="Base Radius"
        value={panel.orbBaseRadius}
        min={2}
        max={30}
        step={1}
        suffix="px"
        settingConfigKey="ORB_BASE_RADIUS"
        onInput={(value) => {
            GAME_CONFIG.ORB_BASE_RADIUS = value;
            updatePanel("orbBaseRadius", value);
        }}
    />

    <PaxSettingsRangeRow
        label="Radius Scale"
        value={panel.orbRadiusScale}
        min={0.2}
        max={5}
        step={0.1}
        format="fixed2"
        settingConfigKey="ORB_RADIUS_SCALE"
        onInput={(value) => {
            GAME_CONFIG.ORB_RADIUS_SCALE = value;
            updatePanel("orbRadiusScale", value);
        }}
    />

    <PaxSettingsRangeRow
        label="Glow Multiplier"
        value={panel.orbGlowMult}
        min={0}
        max={4}
        step={0.1}
        format="fixed2"
        settingConfigKey="ORB_GLOW_MULT"
        onInput={(value) => {
            GAME_CONFIG.ORB_GLOW_MULT = value;
            updatePanel("orbGlowMult", value);
        }}
    />

    <h4 class="sub-heading">Orb Layers</h4>
    <div class="orb-pair">
        <PaxSettingsRangeRow
            label="Outer Alpha"
            value={panel.orbOuterAlpha}
            min={0}
            max={1}
            step={0.02}
            format="fixed2"
            settingConfigKey="ORB_OUTER_ALPHA"
            onInput={(value) => {
                GAME_CONFIG.ORB_OUTER_ALPHA = value;
                updatePanel("orbOuterAlpha", value);
            }}
        />
        <PaxSettingsRangeRow
            label="Outer Scale"
            value={panel.orbOuterScale}
            min={1}
            max={5}
            step={0.1}
            format="fixed1"
            settingConfigKey="ORB_OUTER_SCALE"
            onInput={(value) => {
                GAME_CONFIG.ORB_OUTER_SCALE = value;
                updatePanel("orbOuterScale", value);
            }}
        />
    </div>

    <div class="orb-pair">
        <PaxSettingsRangeRow
            label="Mid Alpha"
            value={panel.orbMidAlpha}
            min={0}
            max={1}
            step={0.02}
            format="fixed2"
            settingConfigKey="ORB_MID_ALPHA"
            onInput={(value) => {
                GAME_CONFIG.ORB_MID_ALPHA = value;
                updatePanel("orbMidAlpha", value);
            }}
        />
        <PaxSettingsRangeRow
            label="Mid Scale"
            value={panel.orbMidScale}
            min={0.5}
            max={3}
            step={0.1}
            format="fixed1"
            settingConfigKey="ORB_MID_SCALE"
            onInput={(value) => {
                GAME_CONFIG.ORB_MID_SCALE = value;
                updatePanel("orbMidScale", value);
            }}
        />
    </div>

    <div class="orb-pair">
        <PaxSettingsRangeRow
            label="Core Alpha"
            value={panel.orbCoreAlpha}
            min={0}
            max={2}
            step={0.05}
            format="fixed2"
            settingConfigKey="ORB_CORE_ALPHA"
            onInput={(value) => {
                GAME_CONFIG.ORB_CORE_ALPHA = value;
                updatePanel("orbCoreAlpha", value);
            }}
        />
        <PaxSettingsRangeRow
            label="Core Scale"
            value={panel.orbCoreScale}
            min={0.5}
            max={3}
            step={0.1}
            format="fixed1"
            settingConfigKey="ORB_CORE_SCALE"
            onInput={(value) => {
                GAME_CONFIG.ORB_CORE_SCALE = value;
                updatePanel("orbCoreScale", value);
            }}
        />
    </div>

    <PaxSettingsRangeRow
        label="Center Alpha"
        value={panel.orbCenterAlpha}
        min={0}
        max={2}
        step={0.05}
        format="fixed2"
        settingConfigKey="ORB_CENTER_ALPHA"
        onInput={(value) => {
            GAME_CONFIG.ORB_CENTER_ALPHA = value;
            updatePanel("orbCenterAlpha", value);
        }}
    />
{/if}

<style>
    @import "./panel-shared.css";
</style>
