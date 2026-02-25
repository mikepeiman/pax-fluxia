<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { animationStore } from "$lib/stores/animationStore.svelte";
    import { ANIM_SLIDERS } from "../settingsDefs";
    import { recalcAnimLocksOnTickChange, recalcAnimLocksOnAnimSpeedChange } from "../panelSync";

    // ControlsSection-SPEED â€” In-Game Settings Controls: Timing
    // Extracted from GameSettingsPanel.svelte

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        tickInterval: number;
        updateTickInterval: (v: number) => void;
        animLockModes: Record<string, any>;
        animLockRatios: Record<string, any>;
        animValues: Record<string, number>;
        getAnimValue: (key: string) => number;
        setAnimValue: (key: string, val: number) => void;
        formatAnimValue: (val: number, unit: string) => string;
        pinValueToTickDuration: (key: string) => void;
        lockRatioToTick: (key: string) => void;
        lockRatioToAnimSpeed: (key: string) => void;
    }
    let { panel, updatePanel, tickInterval, updateTickInterval, animLockModes, animLockRatios, animValues, getAnimValue, setAnimValue, formatAnimValue, pinValueToTickDuration, lockRatioToTick, lockRatioToAnimSpeed }: Props = $props();
</script>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Tick Interval</span><span
            class="val">{tickInterval}ms</span
        >
    </div>
    <input
        type="range"
        min="100"
        max="5000"
        step="50"
        value={tickInterval}
        oninput={(e) => {
            const v = parseInt(
                (e.target as HTMLInputElement).value,
            );
            updateTickInterval(v);
            updatePanel("tickInterval", v);
            Object.assign(animValues, recalcAnimLocksOnTickChange(v, animLockModes, animLockRatios, ANIM_SLIDERS));
            // Auto-sync animation speed when bound
            if (panel.bindAnimToTick) {
                animationStore.setAnimationSpeed(v);
                GAME_CONFIG.ANIMATION_SPEED_MS = v;
                updatePanel("animSpeed", v);
            }
        }}
    />
</div>
<!-- Bind Animation to Tick Toggle -->
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Bind Anim → Tick</span>
        <label class="toggle-switch">
            <input
                type="checkbox"
                checked={panel.bindAnimToTick}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement)
                        .checked;
                    GAME_CONFIG.BIND_ANIMATION_TO_TICK = v;
                    updatePanel("bindAnimToTick", v);
                    if (v) {
                        // Immediately sync animation speed to current tick interval
                        const tick =
                            GAME_CONFIG.BASE_TICK_MS;
                        animationStore.setAnimationSpeed(
                            tick,
                        );
                        GAME_CONFIG.ANIMATION_SPEED_MS =
                            tick;
                        updatePanel("animSpeed", tick);
                    }
                }}
            />
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Animation Speed</span><span
            class="val">{animationStore.speedMs}ms</span
        >
    </div>
    <input
        type="range"
        min="100"
        max="5000"
        step="50"
        value={animationStore.speedMs}
        disabled={panel.bindAnimToTick as boolean}
        oninput={(e) => {
            const v = parseInt(
                (e.target as HTMLInputElement).value,
            );
            animationStore.setAnimationSpeed(v);
            updatePanel("animSpeed", v);
            Object.assign(animValues, recalcAnimLocksOnAnimSpeedChange(v, animLockModes, animLockRatios, ANIM_SLIDERS));
        }}
    />
</div>

<!-- Animation Duration Sliders with Tick-Lock -->
{#each ANIM_SLIDERS as slider, i}
    {#if i === 0 || ANIM_SLIDERS[i - 1].group !== slider.group}
        <div
            class="var-row grayed"
            style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
        >
            🎬 {slider.group}
        </div>
    {/if}
    {#if slider.type === "toggle"}
        <label class="toggle-row">
            <input
                type="checkbox"
                checked={(GAME_CONFIG as any)[slider.key]}
                onchange={() => {
                    (GAME_CONFIG as any)[slider.key] = !(
                        GAME_CONFIG as any
                    )[slider.key];
                }}
            />
            <span class="var-name">{slider.label}</span>
        </label>
        {#if slider.desc}
            <div
                class="var-row grayed"
                style="font-size: 9px; padding: 0 4px 4px; margin-top: -6px; opacity: 0.6;"
            >
                {slider.desc}
            </div>
        {/if}
    {:else}
        <div
            class="var-row"
            class:locked={animLockModes[slider.key] != null}
        >
            <div class="row-top">
                <span class="var-name">{slider.label}</span>
                <span class="val-group">
                    <span class="val"
                        >{formatAnimValue(
                            getAnimValue(slider.key),
                            slider.unit ?? "",
                        )}</span
                    >
                    <button
                        class="lock-btn"
                        class:active={animLockModes[
                            slider.key
                        ] === "pinned"}
                        title={animLockModes[slider.key] ===
                        "pinned"
                            ? "Pinned to tick duration — click to unpin"
                            : "Pin value = tick duration"}
                        onclick={() =>
                            pinValueToTickDuration(
                                slider.key,
                            )}>🕐</button
                    >
                    <button
                        class="lock-btn"
                        class:active={animLockModes[
                            slider.key
                        ] === "ratio"}
                        title={animLockModes[slider.key] ===
                        "ratio"
                            ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}×tick — click to unlock`
                            : "Lock current ratio to tick"}
                        onclick={() =>
                            lockRatioToTick(slider.key)}
                        >◆</button
                    >
                    <button
                        class="lock-btn"
                        class:active={animLockModes[
                            slider.key
                        ] === "animSpeed"}
                        title={animLockModes[slider.key] ===
                        "animSpeed"
                            ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}×anim — click to unlock`
                            : "Lock current ratio to animation speed"}
                        onclick={() =>
                            lockRatioToAnimSpeed(
                                slider.key,
                            )}>⚡</button
                    >
                </span>
            </div>
            <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={getAnimValue(slider.key)}
                disabled={animLockModes[slider.key] != null}
                oninput={(e) => {
                    const v = parseFloat(
                        (e.target as HTMLInputElement)
                            .value,
                    );
                    setAnimValue(slider.key, v);
                }}
            />
        </div>
    {/if}
{/each}
