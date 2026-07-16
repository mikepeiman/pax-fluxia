<script lang="ts">
  import "./panel-shared.css";
    import { settingsStore } from "../settingsStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { animationStore } from "$lib/stores/animationStore.svelte";
    import { ANIM_SLIDERS } from "../settingsDefs";
    // The pure lock math — setAnimValue below owns the config/panel writes.
    // (This used to call panelSync's side-effectful duplicate, which wrote
    // every locked value to GAME_CONFIG and then setAnimValue wrote it again.)
    import {
        recalcOnTickChange,
        recalcOnAnimSpeedChange,
    } from "../animLockMath";
    import {
        PaxHudButton,
        PaxHudRange,
        PaxSettingsRangeRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    const TT_SLIDER_KEY = "TERRITORY_TRANSITION_MS";
    const conquestTransitionSlider = ANIM_SLIDERS.find(
        (slider) => slider.key === TT_SLIDER_KEY,
    );

    // Settings data + anim-lock helpers come from the store, not props
    // (2026-07-15 audit phase 2b). The $derived ones stay reactive to store
    // mutations; the rest are stable method references.
    const panel = $derived(settingsStore.panel);
    const updatePanel = settingsStore.set;
    const tickInterval = $derived(settingsStore.tickInterval);
    const updateTickInterval = settingsStore.updateTickInterval;
    const animLockModes = $derived(settingsStore.animLockModes);
    const animLockRatios = $derived(settingsStore.animLockRatios);
    const getAnimValue = settingsStore.getAnimValue;
    const setAnimValue = settingsStore.setAnimValue;
    const formatAnimValue = settingsStore.formatAnimValue;
    const pinValueToTickDuration = settingsStore.pinValueToTickDuration;
    const lockRatioToTick = settingsStore.lockRatioToTick;
    const lockRatioToAnimSpeed = settingsStore.lockRatioToAnimSpeed;
    const syncFromConfig = settingsStore.syncFromConfig;

    function applyAnimUpdates(updates: Record<string, number>) {
        for (const [key, value] of Object.entries(updates)) {
            setAnimValue(key, value);
        }
    }

    function updateTick(value: number) {
        updateTickInterval(value);
        updatePanel("tickInterval", value);
        applyAnimUpdates(
            recalcOnTickChange(
                { modes: animLockModes, ratios: animLockRatios },
                ANIM_SLIDERS,
                value,
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
    }

    function setBindAnimToTick(value: boolean) {
        GAME_CONFIG.BIND_ANIMATION_TO_TICK = value;
        updatePanel("bindAnimToTick", value);

        if (value) {
            animationStore.setAnimationSpeed(tickInterval);
            GAME_CONFIG.ANIMATION_SPEED_MS = tickInterval;
            updatePanel("animSpeed", tickInterval);
        }
    }

    function updateAnimationSpeed(value: number) {
        animationStore.setAnimationSpeed(value);
        GAME_CONFIG.ANIMATION_SPEED_MS = value;
        updatePanel("animSpeed", value);
        applyAnimUpdates(
            recalcOnAnimSpeedChange(
                { modes: animLockModes, ratios: animLockRatios },
                ANIM_SLIDERS,
                value,
            ),
        );
    }

    function setTerritoryTransitionBindToTick(value: boolean) {
        GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK = value;
        updatePanel("territoryTransitionBindToTick", value);

        if (value) {
            setAnimValue(TT_SLIDER_KEY, tickInterval);
        }
    }

    const transitionLocked = $derived(
        animLockModes[TT_SLIDER_KEY] != null ||
            panel.territoryTransitionBindToTick,
    );
</script>

<CategoryThemeBar category="timing" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Global Rhythm</h4>
<PaxSettingsRangeRow
    label="Tick Interval"
    value={tickInterval}
    min={100}
    max={5000}
    step={50}
    suffix="ms"
    settingConfigKey="BASE_TICK_MS"
    onInput={updateTick}
/>

<PaxSettingsToggleRow
    label="Bind Animation Speed To Tick"
    checked={panel.bindAnimToTick}
    description="Keep animation speed synchronized with the simulation tick interval."
    meta={panel.bindAnimToTick ? "Bound" : "Free"}
    settingConfigKey="BIND_ANIMATION_TO_TICK"
    onChange={setBindAnimToTick}
/>

<PaxSettingsRangeRow
    label="Animation Speed"
    value={animationStore.speedMs}
    min={100}
    max={5000}
    step={50}
    suffix="ms"
    disabled={panel.bindAnimToTick as boolean}
    settingConfigKey="ANIMATION_SPEED_MS"
    onInput={updateAnimationSpeed}
/>

<h4 class="sub-heading">Transition Clock</h4>
{#if conquestTransitionSlider}
    <PaxSettingsToggleRow
        label="Bind Territory Transition To Tick"
        checked={panel.territoryTransitionBindToTick}
        description="Keep territory transition duration matched to the tick interval."
        meta={panel.territoryTransitionBindToTick ? "Bound" : "Free"}
        settingConfigKey="TERRITORY_TRANSITION_BIND_TO_TICK"
        onChange={setTerritoryTransitionBindToTick}
    />

    <div class="timing-lock-card" class:timing-lock-card--locked={transitionLocked}>
        <div class="timing-lock-card__header">
            <span class="timing-lock-card__label">Territory Transition</span>
            <span class="timing-lock-card__value">
                {formatAnimValue(
                    getAnimValue(TT_SLIDER_KEY),
                    conquestTransitionSlider.unit ?? "",
                )}
            </span>
        </div>
        <div class="timing-lock-card__actions" aria-label="Territory transition lock controls">
            <PaxHudButton
                label="P"
                size="sm"
                active={animLockModes[TT_SLIDER_KEY] === "pinned"}
                pressed={animLockModes[TT_SLIDER_KEY] === "pinned"}
                title={animLockModes[TT_SLIDER_KEY] === "pinned"
                    ? "Pinned to tick duration - click to unpin"
                    : "Pin value to tick duration"}
                onclick={() => pinValueToTickDuration(TT_SLIDER_KEY)}
            />
            <PaxHudButton
                label="R"
                size="sm"
                active={animLockModes[TT_SLIDER_KEY] === "ratio"}
                pressed={animLockModes[TT_SLIDER_KEY] === "ratio"}
                title={animLockModes[TT_SLIDER_KEY] === "ratio"
                    ? `Locked at ${(animLockRatios[TT_SLIDER_KEY] ?? 0).toFixed(3)}x tick - click to unlock`
                    : "Lock current ratio to tick"}
                onclick={() => lockRatioToTick(TT_SLIDER_KEY)}
            />
            <PaxHudButton
                label="A"
                size="sm"
                active={animLockModes[TT_SLIDER_KEY] === "animSpeed"}
                pressed={animLockModes[TT_SLIDER_KEY] === "animSpeed"}
                title={animLockModes[TT_SLIDER_KEY] === "animSpeed"
                    ? `Locked at ${(animLockRatios[TT_SLIDER_KEY] ?? 0).toFixed(3)}x animation speed - click to unlock`
                    : "Lock current ratio to animation speed"}
                onclick={() => lockRatioToAnimSpeed(TT_SLIDER_KEY)}
            />
        </div>
        <PaxHudRange
            label="Territory Transition"
            value={getAnimValue(TT_SLIDER_KEY)}
            min={conquestTransitionSlider.min ?? 0}
            max={conquestTransitionSlider.max ?? 3000}
            step={conquestTransitionSlider.step ?? 50}
            output={formatAnimValue(
                getAnimValue(TT_SLIDER_KEY),
                conquestTransitionSlider.unit ?? "",
            )}
            disabled={transitionLocked}
            onInput={(value) => setAnimValue(TT_SLIDER_KEY, value)}
        />
    </div>
{/if}

<style>

    .timing-lock-card {
        min-width: 0;
        display: grid;
        gap: 9px;
        padding: var(--pax-gap-sm);
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-sm);
        clip-path: var(--pax-ui-rounded-corner-sm);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 78%, transparent), color-mix(in srgb, var(--pax-color-void) 90%, transparent)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
    }

    .timing-lock-card--locked {
        opacity: 0.78;
    }

    .timing-lock-card__header,
    .timing-lock-card__actions {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: var(--pax-space-2);
    }

    .timing-lock-card__header {
        justify-content: space-between;
    }

    .timing-lock-card__actions {
        flex-wrap: wrap;
    }

    .timing-lock-card__label {
        overflow: hidden;
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.72rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.06em;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .timing-lock-card__value {
        color: var(--pax-ui-accent-warm-strong);
        font-family: var(--pax-ui-font-data);
        font-size: calc(0.72rem * var(--pax-ui-data-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        white-space: nowrap;
    }
</style>
