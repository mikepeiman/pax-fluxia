<script lang="ts">
    import {
        hslToLab,
        deltaE00,
        MIN_DELTA_E,
        generatePalette,
    } from "$lib/utils/colorDistance";

    let {
        selectedHue = $bindable(210),
        saturation = 70,
        lightness = 55,
        paletteSize = 8,
        claimedHues = [] as number[],
        onSelect,
    }: {
        selectedHue: number;
        saturation?: number;
        lightness?: number;
        paletteSize?: number;
        claimedHues?: number[];
        onSelect?: (hue: number) => void;
    } = $props();

    let popupOpen = $state(false);

    const palette = $derived(
        generatePalette(paletteSize, saturation / 100, lightness / 100),
    );

    function hslColor(hue: number): string {
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    function isClaimed(hue: number): boolean {
        return claimedHues.some((ch) => Math.abs(ch - hue) < 5);
    }

    function isSelected(hue: number): boolean {
        return Math.abs(hue - selectedHue) < 5;
    }

    function select(hue: number) {
        selectedHue = hue;
        onSelect?.(hue);
        popupOpen = false;
    }
</script>

<div class="color-palette-wrapper">
    <!-- Swatch trigger -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
        class="swatch-trigger"
        style:background-color={hslColor(selectedHue)}
        onclick={() => (popupOpen = !popupOpen)}
        onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") popupOpen = !popupOpen;
        }}
        role="button"
        tabindex="0"
        title="Click to pick color"
    ></span>

    {#if popupOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="palette-backdrop" onclick={() => (popupOpen = false)}></div>
        <div class="palette-popup">
            <div class="palette-grid">
                {#each palette as hue}
                    <button
                        class="palette-swatch"
                        class:selected={isSelected(hue)}
                        class:claimed={isClaimed(hue) && !isSelected(hue)}
                        style:background-color={hslColor(hue)}
                        onclick={() => select(hue)}
                        title={isClaimed(hue)
                            ? "Already in use"
                            : `Hue ${Math.round(hue)}°`}
                    >
                        {#if isSelected(hue)}
                            <span class="check">✓</span>
                        {:else if isClaimed(hue)}
                            <span class="claimed-mark">•</span>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .color-palette-wrapper {
        position: relative;
        display: inline-block;
    }

    .swatch-trigger {
        display: inline-block;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
        flex-shrink: 0;
    }
    .swatch-trigger:hover {
        border-color: rgba(255, 255, 255, 0.5);
        transform: scale(1.1);
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
    }

    .palette-backdrop {
        position: fixed;
        inset: 0;
        z-index: 99;
    }

    .palette-popup {
        position: absolute;
        z-index: 1000;
        top: calc(100% + 8px);
        left: 0;
        background: rgba(10, 12, 20, 0.96);
        border: 1px solid rgba(0, 255, 255, 0.15);
        border-radius: 12px;
        padding: 10px;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
        animation: popup-in 0.15s ease-out;
    }

    @keyframes popup-in {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .palette-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
    }

    .palette-swatch {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.12);
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: none;
    }
    .palette-swatch:hover {
        border-color: rgba(255, 255, 255, 0.5);
        transform: scale(1.15);
    }
    .palette-swatch.selected {
        border-color: #fff;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
        transform: scale(1.1);
    }
    .palette-swatch.claimed {
        opacity: 0.5;
        border-style: dashed;
    }

    .check {
        color: #fff;
        font-size: 0.8rem;
        font-weight: 700;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
    }

    .claimed-mark {
        color: rgba(255, 255, 255, 0.6);
        font-size: 1rem;
    }
</style>
