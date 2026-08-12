<script lang="ts">
    import "./panel-shared.css";
    import { settingsStore } from "../settingsStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { BG_IMAGES } from "$lib/config/bgManifest";
    import { PaxHudButton, PaxSettingsRangeRow } from "$lib/design-system";

    // ControlsSection-BACKGROUND — the battlefield backdrop.
    //
    // Split out of ControlsSection-Visuals (2026-08-12): the backdrop is part of
    // how the game LOOKS, so it belongs with Themes, not among map layout, star
    // labels and lane connections.

    const panel = $derived(settingsStore.panel);
    const updatePanel = settingsStore.set;
    const updateBgImage = settingsStore.updateBgImage;

    let bgImage = $derived(panel.bgImageUrl ?? GAME_CONFIG.BG_IMAGE_URL);
    const bgImages = BG_IMAGES;

    function changeBg(img: string) {
        updateBgImage(img);
    }

    function updateBgAlpha(value: number) {
        GAME_CONFIG.BG_IMAGE_ALPHA = value;
        updatePanel("bgImageAlpha", value);
        window.dispatchEvent(
            new CustomEvent("pax-bg-alpha-change", { detail: value }),
        );
    }
</script>

<section data-subsection-id="background" class="visuals-section">
    <div class="visuals-summary">
        <span
            data-setting-config-key="BG_IMAGE_URL"
            data-setting-description="Background image asset path displayed behind the battlefield."
        >
            Background Asset
        </span>
        <strong>{bgImage || "none"}</strong>
    </div>

    <div class="visuals-bg-grid">
        <PaxHudButton
            class="visuals-bg-thumb"
            active={!bgImage}
            title="No background"
            onclick={() => changeBg("")}
        >
            <span class="visuals-bg-none">None</span>
        </PaxHudButton>
        {#each bgImages as img}
            <PaxHudButton
                class="visuals-bg-thumb"
                active={bgImage === img}
                title={img
                    .replace(/\.(png|jpe?g|webp|avif)$/i, "")
                    .replace(/^pax-fluxia-/, "")}
                onclick={() => changeBg(img)}
            >
                <img
                    src="/assets/{img}"
                    alt={img}
                    class="visuals-bg-thumb__img"
                    loading="lazy"
                />
            </PaxHudButton>
        {/each}
    </div>

    <PaxSettingsRangeRow
        label="BG Opacity"
        value={panel.bgImageAlpha ?? GAME_CONFIG.BG_IMAGE_ALPHA ?? 0.35}
        min={0}
        max={1}
        step={0.05}
        format="fixed2"
        settingConfigKey="BG_IMAGE_ALPHA"
        onInput={updateBgAlpha}
    />
</section>

<style>
    /* Moved with the markup out of ControlsSection-Visuals (2026-08-12). Styles
       have to travel with the component they style — leaving them behind renders
       the panel unstyled, which svelte-check only reports as an "unused
       selector" warning in the file they were abandoned in. */
    .visuals-section {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
    }

    .visuals-summary {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--pax-space-2);
        padding: var(--pax-gap-sm);
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-sm);
        clip-path: var(--pax-ui-rounded-corner-sm);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 78%, transparent), color-mix(in srgb, var(--pax-color-void) 90%, transparent)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
    }

    .visuals-summary span {
        min-width: 0;
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

    .visuals-summary strong {
        max-width: 160px;
        overflow: hidden;
        color: var(--pax-ui-accent-warm-strong);
        font-family: var(--pax-ui-font-data);
        font-size: calc(0.68rem * var(--pax-ui-data-scale, 1));
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .visuals-bg-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
        gap: var(--pax-space-2);
    }

    :global(.visuals-bg-thumb) {
        width: 100%;
        height: 38px;
        min-height: 38px;
        padding: 0;
        overflow: hidden;
    }

    .visuals-bg-thumb__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .visuals-bg-none {
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.66rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
</style>
