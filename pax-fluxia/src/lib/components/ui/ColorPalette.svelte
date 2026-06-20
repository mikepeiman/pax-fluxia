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
        border: 2px solid color-mix(in srgb, var(--pax-ui-text-strong) 20%, transparent);
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 0 8px color-mix(in srgb, var(--pax-color-void) 40%, transparent);
        flex-shrink: 0;
    }
    .swatch-trigger:hover {
        border-color: color-mix(in srgb, var(--pax-ui-text-strong) 50%, transparent);
        transform: scale(1.1);
        box-shadow: 0 0 12px color-mix(in srgb, var(--pax-color-void) 60%, transparent);
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
        background: color-mix(in srgb, var(--pax-color-void) 96%, transparent);
        border: 1px solid color-mix(in srgb, var(--pax-ui-accent) 15%, transparent);
        border-radius: 12px;
        padding: 10px;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 32px color-mix(in srgb, var(--pax-color-void) 70%, transparent);
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
        border: 2px solid color-mix(in srgb, var(--pax-ui-text-strong) 12%, transparent);
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: none;
    }
    .palette-swatch:hover {
        border-color: color-mix(in srgb, var(--pax-ui-text-strong) 50%, transparent);
        transform: scale(1.15);
    }
    .palette-swatch.selected {
        border-color: var(--pax-ui-text-strong);
        box-shadow: 0 0 10px color-mix(in srgb, var(--pax-ui-text-strong) 40%, transparent);
        transform: scale(1.1);
    }
    .palette-swatch.claimed {
        opacity: 0.5;
        border-style: dashed;
    }

    .check {
        color: var(--pax-ui-text-strong);
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-bold);
        text-shadow: 0 1px 3px color-mix(in srgb, var(--pax-color-void) 80%, transparent);
    }

    .claimed-mark {
        color: color-mix(in srgb, var(--pax-ui-text-strong) 60%, transparent);
        font-size: var(--pax-type-base);
    }
</style>
