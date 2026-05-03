<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { animationStore } from "$lib/stores/animationStore.svelte";
    import { ANIM_SLIDERS } from "../settingsDefs";
    import {
        recalcAnimLocksOnTickChange,
        recalcAnimLocksOnAnimSpeedChange,
    } from "../panelSync";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    const TT_SLIDER_KEY = "TERRITORY_TRANSITION_MS";
    const conquestTransitionSlider = ANIM_SLIDERS.find(
        (slider) => slider.key === TT_SLIDER_KEY,
    );
    const TT_SETTLE_SLIDER_KEY = "TERRITORY_TRANSITION_SETTLE_PCT";
    const conquestTransitionSettleSlider = ANIM_SLIDERS.find(
        (slider) => slider.key === TT_SETTLE_SLIDER_KEY,
    );

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        tickInterval: number;
        updateTickInterval: (value: number) => void;
        animLockModes: Record<string, any>;
        animLockRatios: Record<string, any>;
        animValues: Record<string, number>;
        getAnimValue: (key: string) => number;
        setAnimValue: (key: string, value: number) => void;
        formatAnimValue: (value: number, unit: string) => string;
        pinValueToTickDuration: (key: string) => void;
        lockRatioToTick: (key: string) => void;
        lockRatioToAnimSpeed: (key: string) => void;
        syncFromConfig?: () => void;
    }

    let {
        panel,
        updatePanel,
        tickInterval,
        updateTickInterval,
        animLockModes,
        animLockRatios,
        animValues,
        getAnimValue,
        setAnimValue,
        formatAnimValue,
        pinValueToTickDuration,
        lockRatioToTick,
        lockRatioToAnimSpeed,
        syncFromConfig,
    }: Props = $props();

    function applyAnimUpdates(updates: Record<string, number>) {
        for (const [key, value] of Object.entries(updates)) {
            setAnimValue(key, value);
        }
    }
</script>

<CategoryThemeBar category="timing" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Global Rhythm</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Tick Interval</span>
        <span class="val">{tickInterval}ms</span>
    </div>
    <input
        type="range"
        min="100"
        max="5000"
        step="50"
        value={tickInterval}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value);
            updateTickInterval(value);
            updatePanel("tickInterval", value);
            applyAnimUpdates(
                recalcAnimLocksOnTickChange(
                    value,
                    animLockModes,
                    animLockRatios,
                    ANIM_SLIDERS,
                ),
            );

            if (panel.bindAnimToTick) {
                animationStore.setAnimationSpeed(value);
                GAME_CONFIG.ANIMATION_SPEED_MS = value;
                updatePanel("animSpeed", value);
            }

            if (panel.territoryTransitionBindToTick) {
                setAnimValue(TT_SLIDER_KEY, value);
            }
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Bind Animation Speed To Tick</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.bindAnimToTick}
                onchange={(event) => {
                    const value = (event.target as HTMLInputElement).checked;
                    GAME_CONFIG.BIND_ANIMATION_TO_TICK = value;
                    updatePanel("bindAnimToTick", value);

                    if (value) {
                        animationStore.setAnimationSpeed(tickInterval);
                        GAME_CONFIG.ANIMATION_SPEED_MS = tickInterval;
                        updatePanel("animSpeed", tickInterval);
                    }
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Animation Speed</span>
        <span class="val">{animationStore.speedMs}ms</span>
    </div>
    <input
        type="range"
        min="100"
        max="5000"
        step="50"
        value={animationStore.speedMs}
        disabled={panel.bindAnimToTick as boolean}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value);
            animationStore.setAnimationSpeed(value);
            GAME_CONFIG.ANIMATION_SPEED_MS = value;
            updatePanel("animSpeed", value);
            applyAnimUpdates(
                recalcAnimLocksOnAnimSpeedChange(
                    value,
                    animLockModes,
                    animLockRatios,
                    ANIM_SLIDERS,
                ),
            );
        }}
    />
</div>

<h4 class="sub-heading">Transition Clock</h4>
{#if conquestTransitionSlider}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Bind Territory Transition To Tick</span>
            <label class="toggle-switch">
                <input
                    type="checkbox"
                    checked={panel.territoryTransitionBindToTick}
                    onchange={(event) => {
                        const value = (event.target as HTMLInputElement).checked;
                        GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK = value;
                        updatePanel("territoryTransitionBindToTick", value);

                        if (value) {
                            setAnimValue(TT_SLIDER_KEY, tickInterval);
                        }
                    }}
                />
                <span class="toggle-slider"></span>
            </label>
        </div>
    </div>

    <div
        class="var-row"
        class:locked={animLockModes[TT_SLIDER_KEY] != null ||
            panel.territoryTransitionBindToTick}
    >
        <div class="row-top">
            <span class="var-name">Territory Transition</span>
            <span class="val-group">
                <span class="val">
                    {formatAnimValue(
                        getAnimValue(TT_SLIDER_KEY),
                        conquestTransitionSlider.unit ?? "",
                    )}
                </span>
                <button
                    class="lock-btn"
                    class:active={animLockModes[TT_SLIDER_KEY] === "pinned"}
                    title={animLockModes[TT_SLIDER_KEY] === "pinned"
                        ? "Pinned to tick duration - click to unpin"
                        : "Pin value to tick duration"}
                    onclick={() => pinValueToTickDuration(TT_SLIDER_KEY)}>P</button
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[TT_SLIDER_KEY] === "ratio"}
                    title={animLockModes[TT_SLIDER_KEY] === "ratio"
                        ? `Locked at ${(animLockRatios[TT_SLIDER_KEY] ?? 0).toFixed(3)}x tick - click to unlock`
                        : "Lock current ratio to tick"}
                    onclick={() => lockRatioToTick(TT_SLIDER_KEY)}>R</button
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[TT_SLIDER_KEY] === "animSpeed"}
                    title={animLockModes[TT_SLIDER_KEY] === "animSpeed"
                        ? `Locked at ${(animLockRatios[TT_SLIDER_KEY] ?? 0).toFixed(3)}x animation speed - click to unlock`
                        : "Lock current ratio to animation speed"}
                    onclick={() => lockRatioToAnimSpeed(TT_SLIDER_KEY)}>A</button
                >
            </span>
        </div>
        <input
            type="range"
            min={conquestTransitionSlider.min}
            max={conquestTransitionSlider.max}
            step={conquestTransitionSlider.step}
            value={getAnimValue(TT_SLIDER_KEY)}
            disabled={animLockModes[TT_SLIDER_KEY] != null ||
                panel.territoryTransitionBindToTick}
            oninput={(event) => {
                const value = parseFloat((event.target as HTMLInputElement).value);
                setAnimValue(TT_SLIDER_KEY, value);
            }}
        />
    </div>
{/if}

{#if conquestTransitionSettleSlider}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">End Settle</span>
            <span class="val">
                {formatAnimValue(
                    getAnimValue(TT_SETTLE_SLIDER_KEY),
                    conquestTransitionSettleSlider.unit ?? "",
                )}
            </span>
        </div>
        <input
            type="range"
            min={conquestTransitionSettleSlider.min}
            max={conquestTransitionSettleSlider.max}
            step={conquestTransitionSettleSlider.step}
            value={getAnimValue(TT_SETTLE_SLIDER_KEY)}
            oninput={(event) => {
                const value = parseFloat((event.target as HTMLInputElement).value);
                setAnimValue(TT_SETTLE_SLIDER_KEY, value);
            }}
        />
    </div>
{/if}

<style>
    @import "./panel-shared.css";
</style>
