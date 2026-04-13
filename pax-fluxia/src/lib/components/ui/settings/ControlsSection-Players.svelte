<script lang="ts">
    import { onMount } from "svelte";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
    import {
        PLAYER_HUE_NUDGE_LIMIT,
        PLAYER_PALETTE_SIZE,
        buildPlayerPaletteHex,
        clampPlayerHueNudge,
        generatePlayerPaletteHues,
        loadPlayerPaletteSettings,
        normalizePlayerPaletteNudges,
        savePlayerPaletteSettings,
    } from "$lib/utils/playerPalette";

    interface Props {
        syncFromConfig?: () => void;
    }

    let { syncFromConfig }: Props = $props();

    const initial = loadPlayerPaletteSettings();
    let anchorHue = $state(initial.anchorHue);
    let saturation = $state(initial.saturation);
    let lightness = $state(initial.lightness);
    let nudges = $state(normalizePlayerPaletteNudges(initial.nudges));
    let selectedPaletteIndex = $state(0);

    const rosterSize = $derived(
        Math.max(
            1,
            Math.min(activeGameStore.players.length || PLAYER_PALETTE_SIZE, PLAYER_PALETTE_SIZE),
        ),
    );

    const paletteHues = $derived(
        generatePlayerPaletteHues(
            anchorHue,
            rosterSize,
            nudges.slice(0, rosterSize),
        ),
    );
    const fullPaletteHues = $derived(
        generatePlayerPaletteHues(anchorHue, PLAYER_PALETTE_SIZE, nudges),
    );
    const paletteHex = $derived(
        buildPlayerPaletteHex(
            anchorHue,
            rosterSize,
            nudges.slice(0, rosterSize),
            saturation,
            lightness,
        ),
    );
    const selectedPaletteHue = $derived(fullPaletteHues[selectedPaletteIndex] ?? anchorHue);

    function persistAndApplyPalette(): void {
        savePlayerPaletteSettings({
            anchorHue,
            saturation,
            lightness,
            nudges,
        });
        activeGameStore.applyPlayerColors(
            buildPlayerPaletteHex(
                anchorHue,
                rosterSize,
                nudges.slice(0, rosterSize),
                saturation,
                lightness,
            ),
        );
    }

    function selectPaletteIndex(index: number): void {
        selectedPaletteIndex = Math.max(0, Math.min(index, Math.max(0, rosterSize - 1)));
    }

    function setSelectedPaletteNudge(value: number): void {
        const next = clampPlayerHueNudge(value);
        if (nudges[selectedPaletteIndex] === next) return;
        nudges[selectedPaletteIndex] = next;
        persistAndApplyPalette();
    }

    function resetSelectedPaletteNudge(): void {
        setSelectedPaletteNudge(0);
    }

    onMount(() => {
        persistAndApplyPalette();
    });

    $effect(() => {
        if (selectedPaletteIndex >= rosterSize) {
            selectedPaletteIndex = Math.max(0, rosterSize - 1);
        }
    });
</script>

<CategoryThemeBar category="players" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Live Player Palette</h4>
<p class="players-copy">
    One anchored 6-player palette for the whole match. Shift the anchor hue and
    we keep the full roster perceptually spread.
</p>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Anchor Hue</span>
        <span class="val">{Math.round(anchorHue)}°</span>
    </div>
    <input
        class="hue-slider"
        type="range"
        min="0"
        max="359"
        step="1"
        bind:value={anchorHue}
        style="--hue: {anchorHue}"
        oninput={() => persistAndApplyPalette()}
    />
</div>

<div class="players-preview-grid">
    {#each paletteHex as hex, index}
        <button
            type="button"
            class="players-preview-slot"
            class:is-selected={selectedPaletteIndex === index}
            onclick={() => selectPaletteIndex(index)}
        >
            <span class="players-preview-swatch" style="background: {hex}"></span>
            <span class="players-preview-label">P{index + 1}</span>
            <span class="players-preview-hue">{Math.round(paletteHues[index] ?? 0)}°</span>
        </button>
    {/each}
</div>

<h4 class="sub-heading">Per-Player Nudge</h4>
<div class="players-focus-card">
    <div class="players-focus-row">
        <span class="players-focus-label">Selected</span>
        <span class="players-focus-value">P{selectedPaletteIndex + 1} · {Math.round(selectedPaletteHue)}°</span>
    </div>
    <div class="var-row compact-row">
        <div class="row-top">
            <span class="var-name">Hue Nudge</span>
            <span class="val">
                {(nudges[selectedPaletteIndex] ?? 0) > 0 ? "+" : ""}{nudges[selectedPaletteIndex] ?? 0}°
            </span>
        </div>
        <input
            type="range"
            min={-PLAYER_HUE_NUDGE_LIMIT}
            max={PLAYER_HUE_NUDGE_LIMIT}
            step="1"
            value={nudges[selectedPaletteIndex] ?? 0}
            oninput={(event) =>
                setSelectedPaletteNudge(Number((event.currentTarget as HTMLInputElement).value))}
        />
    </div>
    <button
        type="button"
        class="players-reset-btn"
        onclick={resetSelectedPaletteNudge}
        disabled={(nudges[selectedPaletteIndex] ?? 0) === 0}
    >
        Reset selected nudge
    </button>
</div>

<h4 class="sub-heading">Advanced Tuning</h4>
<details class="players-detail">
    <summary>Advanced palette tuning</summary>
    <div class="players-detail-grid">
        <div class="var-row compact-row">
            <div class="row-top">
                <span class="var-name">Saturation</span>
                <span class="val">{saturation}%</span>
            </div>
            <input
                type="range"
                min="40"
                max="100"
                step="1"
                bind:value={saturation}
                oninput={() => persistAndApplyPalette()}
            />
        </div>
        <div class="var-row compact-row">
            <div class="row-top">
                <span class="var-name">Lightness</span>
                <span class="val">{lightness}%</span>
            </div>
            <input
                type="range"
                min="35"
                max="70"
                step="1"
                bind:value={lightness}
                oninput={() => persistAndApplyPalette()}
            />
        </div>
    </div>
</details>

<style>
    @import "./panel-shared.css";

    .players-copy {
        margin: 0 0 8px;
        font-size: 11px;
        line-height: 1.45;
        color: rgba(210, 225, 255, 0.72);
    }

    .hue-slider {
        background: linear-gradient(
            to right,
            hsl(0, 82%, 56%),
            hsl(30, 82%, 56%),
            hsl(60, 82%, 56%),
            hsl(120, 82%, 56%),
            hsl(180, 82%, 56%),
            hsl(210, 82%, 56%),
            hsl(270, 82%, 56%),
            hsl(330, 82%, 56%),
            hsl(360, 82%, 56%)
        );
        height: 8px;
        border-radius: 999px;
    }
    .hue-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.92);
        background: hsl(var(--hue, 210), 82%, 56%);
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.35);
        cursor: pointer;
    }
    .hue-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.92);
        background: hsl(var(--hue, 210), 82%, 56%);
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.35);
        cursor: pointer;
    }

    .players-preview-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
    }
    .players-preview-slot {
        appearance: none;
        border: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 6px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            transform 0.15s ease;
    }
    .players-preview-slot:hover {
        border-color: rgba(120, 220, 255, 0.24);
    }
    .players-preview-slot.is-selected {
        border-color: rgba(0, 210, 255, 0.5);
        box-shadow: 0 0 0 1px rgba(0, 210, 255, 0.22);
        transform: translateY(-1px);
    }
    .players-preview-swatch {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.35);
    }
    .players-preview-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #dbeafe;
    }
    .players-preview-hue {
        font-size: 10px;
        color: rgba(180, 200, 230, 0.66);
    }

    .players-focus-card {
        display: grid;
        gap: 6px;
        margin-top: 8px;
        padding: 10px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(100, 200, 255, 0.12);
    }
    .players-focus-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
    }
    .players-focus-label {
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(185, 220, 255, 0.72);
    }
    .players-focus-value {
        font-size: 11px;
        font-weight: 700;
        color: #dbeafe;
    }
    .players-reset-btn {
        justify-self: start;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid rgba(100, 200, 255, 0.18);
        background: rgba(10, 20, 40, 0.55);
        color: rgba(220, 238, 255, 0.86);
        font-size: 11px;
        cursor: pointer;
    }
    .players-reset-btn:disabled {
        opacity: 0.45;
        cursor: default;
    }

    .players-detail {
        margin-top: 8px;
    }
    .players-detail summary {
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        color: rgba(190, 220, 255, 0.78);
        list-style: none;
    }
    .players-detail summary::-webkit-details-marker {
        display: none;
    }
    .players-detail-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 6px;
        margin-top: 8px;
    }
    .compact-row {
        gap: 4px;
    }
</style>
