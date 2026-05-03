<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();
</script>

<CategoryThemeBar category="surge" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Attack Surge</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Surge Displacement</span>
        <span class="val">{((panel.attackSurgeMult ?? 0) as number).toFixed(2)}x</span>
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={panel.attackSurgeMult}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.ATTACK_SURGE_MULT = value;
            updatePanel("attackSurgeMult", value);
        }}
    />
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.attackSurgeProportional}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            GAME_CONFIG.ATTACK_SURGE_PROPORTIONAL = value;
            updatePanel("attackSurgeProportional", value);
        }}
    />
    <span class="var-name">Force-Reactive Surge</span>
    <span class="val">scales with force gap</span>
</label>

{#if panel.attackSurgeProportional}
    <div class="var-row compact">
        <div class="row-top">
            <span class="var-name">Force Cofactor</span>
            <span class="val">{((panel.attackSurgeForceCofactor ?? 0) as number).toFixed(2)}</span>
        </div>
        <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={panel.attackSurgeForceCofactor}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ATTACK_SURGE_FORCE_COFACTOR = value;
                updatePanel("attackSurgeForceCofactor", value);
            }}
        />
    </div>
{/if}

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Surge Ramp</span>
        <span class="val">{panel.attackSurgeRampMs}ms</span>
    </div>
    <input
        type="range"
        min="0"
        max="2000"
        step="25"
        value={panel.attackSurgeRampMs}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.ATTACK_SURGE_RAMP_MS = value;
            updatePanel("attackSurgeRampMs", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Surge Shape</span>
        <span class="val">{((panel.attackSurgeShape ?? 0) as number).toFixed(1)}</span>
    </div>
    <input
        type="range"
        min="0.1"
        max="4"
        step="0.1"
        value={panel.attackSurgeShape}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.ATTACK_SURGE_SHAPE = value;
            updatePanel("attackSurgeShape", value);
        }}
    />
</div>

<h4 class="sub-heading">Pulse Timing</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Bind Pulse Duration To Tick</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.surgePulseBindToTick ?? GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK ?? true}
                onchange={(event) => {
                    const value = (event.target as HTMLInputElement).checked;
                    GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK = value;
                    updatePanel("surgePulseBindToTick", value);

                    if (value) {
                        const tickMs = panel.tickInterval ?? GAME_CONFIG.BASE_TICK_MS;
                        GAME_CONFIG.SURGE_PULSE_DURATION_MS = tickMs;
                        updatePanel("surgePulseDurationMs", tickMs);
                    }
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>

<div class="var-row" class:locked={panel.surgePulseBindToTick ?? GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK ?? true}>
    <div class="row-top">
        <span class="var-name">Pulse Duration</span>
        <span class="val">{panel.surgePulseDurationMs ?? GAME_CONFIG.SURGE_PULSE_DURATION_MS}ms</span>
    </div>
    <input
        type="range"
        min="0"
        max="5000"
        step="10"
        value={panel.surgePulseDurationMs ?? GAME_CONFIG.SURGE_PULSE_DURATION_MS}
        disabled={panel.surgePulseBindToTick ?? GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK ?? true}
        oninput={(event) => {
            const value = +(event.target as HTMLInputElement).value;
            GAME_CONFIG.SURGE_PULSE_DURATION_MS = value;
            updatePanel("surgePulseDurationMs", value);
        }}
    />
</div>

<h4 class="sub-heading">Orb Merge</h4>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.orbTravel}
        onchange={() => {
            GAME_CONFIG.ORB_TRAVEL = !GAME_CONFIG.ORB_TRAVEL;
            updatePanel("orbTravel", GAME_CONFIG.ORB_TRAVEL);
        }}
    />
    <span class="var-name">Merge Ships Into Orb</span>
    <span class="val">travel collapse</span>
</label>

{#if panel.orbTravel}
    <div class="var-row compact">
        <div class="row-top">
            <span class="var-name">Base Radius</span>
            <span class="val">{((panel.orbBaseRadius ?? 0) as number).toFixed(0)}px</span>
        </div>
        <input
            type="range"
            min="2"
            max="30"
            step="1"
            value={panel.orbBaseRadius}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ORB_BASE_RADIUS = value;
                updatePanel("orbBaseRadius", value);
            }}
        />
    </div>

    <div class="var-row compact">
        <div class="row-top">
            <span class="var-name">Radius Scale</span>
            <span class="val">{((panel.orbRadiusScale ?? 0) as number).toFixed(2)}</span>
        </div>
        <input
            type="range"
            min="0.2"
            max="5"
            step="0.1"
            value={panel.orbRadiusScale}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ORB_RADIUS_SCALE = value;
                updatePanel("orbRadiusScale", value);
            }}
        />
    </div>

    <div class="var-row compact">
        <div class="row-top">
            <span class="var-name">Glow Multiplier</span>
            <span class="val">{((panel.orbGlowMult ?? 0) as number).toFixed(2)}</span>
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={panel.orbGlowMult}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ORB_GLOW_MULT = value;
                updatePanel("orbGlowMult", value);
            }}
        />
    </div>

    <h4 class="sub-heading">Orb Layers</h4>
    <div class="orb-pair">
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Outer Alpha</span>
                <span class="val">{((panel.orbOuterAlpha ?? 0) as number).toFixed(2)}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={panel.orbOuterAlpha}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ORB_OUTER_ALPHA = value;
                    updatePanel("orbOuterAlpha", value);
                }}
            />
        </div>
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Outer Scale</span>
                <span class="val">{((panel.orbOuterScale ?? 0) as number).toFixed(1)}</span>
            </div>
            <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={panel.orbOuterScale}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ORB_OUTER_SCALE = value;
                    updatePanel("orbOuterScale", value);
                }}
            />
        </div>
    </div>

    <div class="orb-pair">
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Mid Alpha</span>
                <span class="val">{((panel.orbMidAlpha ?? 0) as number).toFixed(2)}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={panel.orbMidAlpha}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ORB_MID_ALPHA = value;
                    updatePanel("orbMidAlpha", value);
                }}
            />
        </div>
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Mid Scale</span>
                <span class="val">{((panel.orbMidScale ?? 0) as number).toFixed(1)}</span>
            </div>
            <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={panel.orbMidScale}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ORB_MID_SCALE = value;
                    updatePanel("orbMidScale", value);
                }}
            />
        </div>
    </div>

    <div class="orb-pair">
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Core Alpha</span>
                <span class="val">{((panel.orbCoreAlpha ?? 0) as number).toFixed(2)}</span>
            </div>
            <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={panel.orbCoreAlpha}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ORB_CORE_ALPHA = value;
                    updatePanel("orbCoreAlpha", value);
                }}
            />
        </div>
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Core Scale</span>
                <span class="val">{((panel.orbCoreScale ?? 0) as number).toFixed(1)}</span>
            </div>
            <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={panel.orbCoreScale}
                oninput={(event) => {
                    const value = +(event.target as HTMLInputElement).value;
                    GAME_CONFIG.ORB_CORE_SCALE = value;
                    updatePanel("orbCoreScale", value);
                }}
            />
        </div>
    </div>

    <div class="var-row compact">
        <div class="row-top">
            <span class="var-name">Center Alpha</span>
            <span class="val">{((panel.orbCenterAlpha ?? 0) as number).toFixed(2)}</span>
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.orbCenterAlpha}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                GAME_CONFIG.ORB_CENTER_ALPHA = value;
                updatePanel("orbCenterAlpha", value);
            }}
        />
    </div>
{/if}

<style>
    @import "./panel-shared.css";
</style>
