<script lang="ts">
    import { onMount } from "svelte";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
    import {
        PLAYER_PALETTE_SIZE,
        buildPlayerPaletteHex,
        generatePlayerPaletteHues,
        loadPlayerPaletteSettings,
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

    const paletteHues = $derived(
        generatePlayerPaletteHues(
            anchorHue,
            PLAYER_PALETTE_SIZE,
            saturation / 100,
            lightness / 100,
        ),
    );
    const paletteHex = $derived(
        buildPlayerPaletteHex(
            anchorHue,
            PLAYER_PALETTE_SIZE,
            saturation,
            lightness,
        ),
    );

    function persistAndApplyPalette(): void {
        savePlayerPaletteSettings({
            anchorHue,
            saturation,
            lightness,
        });
        activeGameStore.applyPlayerColors(
            buildPlayerPaletteHex(
                anchorHue,
                PLAYER_PALETTE_SIZE,
                saturation,
                lightness,
            ),
        );
    }

    onMount(() => {
        persistAndApplyPalette();
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
        <div class="players-preview-slot">
            <span class="players-preview-swatch" style="background: {hex}"></span>
            <span class="players-preview-label">P{index + 1}</span>
            <span class="players-preview-hue">{Math.round(paletteHues[index] ?? 0)}°</span>
        </div>
    {/each}
</div>

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
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 6px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
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
