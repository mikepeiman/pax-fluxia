<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { ANIM_SLIDERS } from "../settingsDefs";
    import {
        METABALL_BURST_BOUNDARY_BASIS_OPTIONS,
        coerceVsTransitionModeForRenderMode,
    } from "$lib/territory/transitions/territoryTransitionModes";

    const VS_SLIDERS = ANIM_SLIDERS.filter(
        (slider) => slider.group === "VS Transition",
    );

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        animLockModes: Record<string, any>;
        animLockRatios: Record<string, any>;
        getAnimValue: (key: string) => number;
        setAnimValue: (key: string, val: number) => void;
        formatAnimValue: (val: number, unit: string) => string;
        pinValueToTickDuration: (key: string) => void;
        lockRatioToTick: (key: string) => void;
        lockRatioToAnimSpeed: (key: string) => void;
        activeRenderMode: string;
        helperText?: string;
    }

    let {
        panel,
        updatePanel,
        animLockModes,
        animLockRatios,
        getAnimValue,
        setAnimValue,
        formatAnimValue,
        pinValueToTickDuration,
        lockRatioToTick,
        lockRatioToAnimSpeed,
        activeRenderMode,
        helperText = "",
    }: Props = $props();

    let activeTransitionMode = $derived(
        coerceVsTransitionModeForRenderMode(
            activeRenderMode,
            (panel.vsTransitionMode ?? GAME_CONFIG.VS_TRANSITION_MODE ?? null) as
                | string
                | null,
        ),
    );
    let showMetaballBurstBoundaryBasis = $derived(
        activeRenderMode === "metaball" &&
            activeTransitionMode === "metaball_six_slice_burst",
    );
</script>

{#if helperText}
    <div class="row-hint">{helperText}</div>
{/if}

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.vsBindToTick ?? GAME_CONFIG.VS_BIND_TO_TICK ?? true}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            GAME_CONFIG.VS_BIND_TO_TICK = value;
            updatePanel("vsBindToTick", value);
        }}
    />
    <span class="var-name">Bind VS timing to tick</span>
    <span class="val">
        {(panel.vsBindToTick ?? GAME_CONFIG.VS_BIND_TO_TICK ?? true)
            ? "On"
            : "Off"}
    </span>
</label>

{#each VS_SLIDERS as slider}
    <div class="var-row" class:locked={animLockModes[slider.key] != null}>
        <div class="row-top">
            <span class="var-name" title={slider.desc ?? ""}>{slider.label}</span>
            <span class="val-group">
                <span class="val"
                    >{formatAnimValue(getAnimValue(slider.key), slider.unit ?? "")}</span
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[slider.key] === "pinned"}
                    title={animLockModes[slider.key] === "pinned"
                        ? "Pinned to tick duration - click to unpin"
                        : "Pin value = tick duration"}
                    onclick={() => pinValueToTickDuration(slider.key)}>P</button
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[slider.key] === "ratio"}
                    title={animLockModes[slider.key] === "ratio"
                        ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}x tick - click to unlock`
                        : "Lock current ratio to tick"}
                    onclick={() => lockRatioToTick(slider.key)}>R</button
                >
                <button
                    class="lock-btn"
                    class:active={animLockModes[slider.key] === "animSpeed"}
                    title={animLockModes[slider.key] === "animSpeed"
                        ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}x animation speed - click to unlock`
                        : "Lock current ratio to animation speed"}
                    onclick={() => lockRatioToAnimSpeed(slider.key)}>A</button
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
            oninput={(event) => {
                const value = parseFloat(
                    (event.target as HTMLInputElement).value,
                );
                setAnimValue(slider.key, value);
            }}
        />
    </div>
{/each}

{#if showMetaballBurstBoundaryBasis}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Burst Boundary Basis</span>
            <span class="val">
                {panel.metaballBurstBoundaryBasis ??
                    GAME_CONFIG.METABALL_BURST_BOUNDARY_BASIS ??
                    "t0_region_contour"}
            </span>
        </div>
        <select
            class="mode-select"
            value={panel.metaballBurstBoundaryBasis ??
                GAME_CONFIG.METABALL_BURST_BOUNDARY_BASIS ??
                "t0_region_contour"}
            onchange={(event) => {
                const value = (event.target as HTMLSelectElement).value;
                GAME_CONFIG.METABALL_BURST_BOUNDARY_BASIS = value as any;
                updatePanel("metaballBurstBoundaryBasis", value);
            }}
        >
            {#each METABALL_BURST_BOUNDARY_BASIS_OPTIONS as option}
                <option value={option.id}>{option.label}</option>
            {/each}
        </select>
    </div>
{/if}

<style>
    @import "./panel-shared.css";

    .row-hint {
        margin: 8px 0 10px;
        font-size: 11px;
        line-height: 1.45;
        color: rgba(187, 205, 223, 0.82);
    }
</style>
