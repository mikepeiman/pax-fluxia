<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { ANIM_SLIDERS } from "../settingsDefs";
    import {
        METABALL_BURST_BOUNDARY_BASIS_OPTIONS,
        coerceVsTransitionModeForRenderMode,
        getTransitionModeOptionsForRenderMode,
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

    type SliderSemantic = {
        label: string;
        desc: string;
        show?: boolean;
    };

    type ModeSemanticProfile = {
        bindLabel: string;
        bindDesc: string;
        note?: string;
        sliders: Partial<Record<string, SliderSemantic>>;
    };

    const DEFAULT_SEMANTICS: ModeSemanticProfile = {
        bindLabel: "Bind transition timing to tick",
        bindDesc: "Cap travel and influence timing to the current tick duration.",
        sliders: {
            VS_VICTOR_TRAVEL_MS: {
                label: "Victor Travel",
                desc: "How long the attacker transition site takes to reach the conquered star.",
            },
            VS_LOSER_TRAVEL_MS: {
                label: "Loser Travel",
                desc: "How long the loser transition site takes to move away from the conquered star.",
            },
            VS_POWER_LERP_START: {
                label: "Start Influence",
                desc: "Starting influence multiplier for the active transition samples.",
            },
            VS_POWER_LERP_END: {
                label: "End Influence",
                desc: "Ending influence multiplier for the active transition samples.",
            },
            VS_POWER_LERP_DURATION_MS: {
                label: "Influence Ramp",
                desc: "How long the transition influence lerp lasts.",
            },
        },
    };

    const MODE_SEMANTICS: Record<string, ModeSemanticProfile> = {
        metaball_lane_push: {
            bindLabel: "Bind lane-push timing to tick",
            bindDesc: "Cap the lane-push travel and influence ramps to the current tick duration.",
            note: "Lane Push moves a victor site down the lane while the old owner peels away.",
            sliders: {
                VS_VICTOR_TRAVEL_MS: {
                    label: "Victor Travel",
                    desc: "How long the advancing victor site takes to reach the conquered star.",
                },
                VS_LOSER_TRAVEL_MS: {
                    label: "Loser Retreat",
                    desc: "How long the old-owner retreat site takes to pull away from the conquered star.",
                },
                VS_POWER_LERP_START: {
                    label: "Victor Start Influence",
                    desc: "Starting multiplier for the advancing victor site. 0 uses the current lane-push default.",
                },
                VS_POWER_LERP_END: {
                    label: "Victor End Influence",
                    desc: "Ending multiplier for the advancing victor site. 0 uses the current lane-push default.",
                },
                VS_POWER_LERP_DURATION_MS: {
                    label: "Influence Ramp",
                    desc: "How long the lane-push influence ramp lasts. 0 falls back to the active travel duration.",
                },
            },
        },
        metaball_hold_then_switch: {
            bindLabel: "Bind hold-and-switch timing to tick",
            bindDesc: "Cap the held-target fade and victor travel to the current tick duration.",
            note: "Hold Then Switch keeps the conquered star on the old owner until its held influence fades out.",
            sliders: {
                VS_VICTOR_TRAVEL_MS: {
                    label: "Victor Travel",
                    desc: "How long the full-strength victor site takes to reach the conquered star.",
                },
                VS_LOSER_TRAVEL_MS: {
                    label: "Loser Travel",
                    desc: "",
                    show: false,
                },
                VS_POWER_LERP_START: {
                    label: "Held Target Start Influence",
                    desc: "Starting multiplier for the conquered star while it still belongs to the old owner. 0 uses full held strength.",
                },
                VS_POWER_LERP_END: {
                    label: "Held Target End Influence",
                    desc: "Ending multiplier for the conquered star just before ownership switches. 0 uses zero influence.",
                },
                VS_POWER_LERP_DURATION_MS: {
                    label: "Held Target Fade",
                    desc: "How long the held old-owner influence takes to fade out. 0 falls back to the active travel duration.",
                },
            },
        },
        metaball_instant_switch_grow_in: {
            bindLabel: "Bind grow-in timing to tick",
            bindDesc: "Cap the new-owner grow-in and victor travel to the current tick duration.",
            note: "Instant Switch + Grow-In flips ownership immediately, but the new-owner target and victor travel start from low influence.",
            sliders: {
                VS_VICTOR_TRAVEL_MS: {
                    label: "Victor Travel",
                    desc: "How long the victor site takes to travel from the attacker to the conquered star.",
                },
                VS_LOSER_TRAVEL_MS: {
                    label: "Loser Travel",
                    desc: "",
                    show: false,
                },
                VS_POWER_LERP_START: {
                    label: "Grow-In Start Influence",
                    desc: "Starting multiplier for the new-owner target and victor travel. 0 uses zero starting influence.",
                },
                VS_POWER_LERP_END: {
                    label: "Grow-In End Influence",
                    desc: "Ending multiplier for the new-owner target and victor travel. 0 uses full end influence.",
                },
                VS_POWER_LERP_DURATION_MS: {
                    label: "Grow-In Duration",
                    desc: "How long the new-owner influence takes to ramp in. 0 falls back to the active travel duration.",
                },
            },
        },
        metaball_six_slice_burst: {
            bindLabel: "Bind burst timing to tick",
            bindDesc: "Cap the burst travel and influence ramps to the current tick duration.",
            note: "Six-Slice Burst removes the target star entirely until settle, while five loser shards burst away.",
            sliders: {
                VS_VICTOR_TRAVEL_MS: {
                    label: "Victor Travel",
                    desc: "How long each victor site takes to reach the conquered star.",
                },
                VS_LOSER_TRAVEL_MS: {
                    label: "Burst Travel",
                    desc: "How long the five loser burst shards take to reach their shared travel radius.",
                },
                VS_POWER_LERP_START: {
                    label: "Burst Start Influence",
                    desc: "Starting multiplier for burst-mode transition influence. 0 uses the current burst defaults.",
                },
                VS_POWER_LERP_END: {
                    label: "Victor End Influence",
                    desc: "Ending multiplier for the victor shards at the end of the burst. 0 uses the current burst default.",
                },
                VS_POWER_LERP_DURATION_MS: {
                    label: "Influence Ramp",
                    desc: "How long the burst-mode influence ramp lasts. 0 falls back to the active travel duration.",
                },
            },
        },
    };

    function resolveModeSemantics(
        renderMode: string,
        transitionMode: string,
    ): ModeSemanticProfile {
        if (renderMode !== "metaball") {
            return DEFAULT_SEMANTICS;
        }
        return MODE_SEMANTICS[transitionMode] ?? DEFAULT_SEMANTICS;
    }

    let activeTransitionOption = $derived(
        getTransitionModeOptionsForRenderMode(activeRenderMode).find(
            (option) => option.id === activeTransitionMode,
        ) ?? null,
    );
    let modeSemantics = $derived(
        resolveModeSemantics(activeRenderMode, activeTransitionMode),
    );
    let visibleSliders = $derived(
        VS_SLIDERS.flatMap((slider) => {
            const semantic = modeSemantics.sliders[slider.key];
            if (semantic?.show === false) return [];
            return [
                {
                    slider,
                    label: semantic?.label ?? slider.label,
                    desc: semantic?.desc ?? slider.desc ?? "",
                },
            ];
        }),
    );
</script>

{#if helperText}
    <div class="row-hint">{helperText}</div>
{/if}
{#if modeSemantics.note || activeTransitionOption?.description}
    <div class="row-hint">
        {modeSemantics.note ?? activeTransitionOption?.description}
    </div>
{/if}
<div class="row-hint">
    Final handoff smoothing is shared in Timing → End Settle. The controls here still govern the renderer-specific travel and influence behavior before that settle window.
</div>

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
        <span
            class="var-name"
            data-setting-config-key="VS_BIND_TO_TICK"
            data-setting-description={modeSemantics.bindDesc}
            title={modeSemantics.bindDesc}>{modeSemantics.bindLabel}</span>
    <span class="val">
        {(panel.vsBindToTick ?? GAME_CONFIG.VS_BIND_TO_TICK ?? true)
            ? "On"
            : "Off"}
    </span>
</label>
<div class="row-hint row-hint--tight">{modeSemantics.bindDesc}</div>

{#each visibleSliders as semantic}
    {@const slider = semantic.slider}
    <div class="var-row" class:locked={animLockModes[slider.key] != null}>
        <div class="row-top">
                    <span
                        class="var-name"
                        data-setting-config-key={slider.key}
                        data-setting-description={semantic.desc}
                        title={semantic.desc}>{semantic.label}</span
                    >
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
        {#if semantic.desc}
            <div class="row-hint row-hint--tight">{semantic.desc}</div>
        {/if}
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
                    <span
                        class="var-name"
                        data-setting-config-key="METABALL_BURST_BOUNDARY_BASIS"
                        >Burst Boundary Basis</span
                    >
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
