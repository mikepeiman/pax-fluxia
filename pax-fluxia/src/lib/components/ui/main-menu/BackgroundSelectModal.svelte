<script lang="ts">
    import { browser } from "$app/environment";
    import { fade, fly } from "svelte/transition";
    import {
        buildLegacyImageSelection,
        type BackgroundModeDefinition,
        type BackgroundSelection,
    } from "$lib/backgrounds";
    import {
        getMenuThemeCssVars,
        getMenuThemeDefinition,
        type MenuTheme,
    } from "./menuTheme";

    interface Props {
        visible: boolean;
        selection: BackgroundSelection;
        legacyImage: string;
        legacyImages: string[];
        backgroundModes: readonly BackgroundModeDefinition[];
        menuTheme: MenuTheme;
        onClose: () => void;
        onSelectBackground: (selection: BackgroundSelection) => void;
    }

    let {
        visible,
        selection,
        legacyImage,
        legacyImages,
        backgroundModes,
        menuTheme,
        onClose,
        onSelectBackground,
    }: Props = $props();

    const themeLabel = $derived(getMenuThemeDefinition(menuTheme).label);

    function portal(node: HTMLElement) {
        if (!browser) {
            return {};
        }

        document.body.appendChild(node);

        return {
            destroy() {
                if (node.parentNode === document.body) {
                    document.body.removeChild(node);
                }
            },
        };
    }

    function formatBackgroundLabel(name: string): string {
        return name
            .replace(/\.(png|jpe?g|webp|avif)$/i, "")
            .replace(/^pax-fluxia-/, "")
            .replace(/[-_]/g, " ");
    }

    function modeSwatchClass(modeId: string): string {
        return `background-modal__swatch background-modal__swatch--${modeId}`;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (visible && event.key === "Escape") {
            onClose();
        }
    }

    $effect(() => {
        if (!browser || !visible) return;

        const previousOverflow = document.body.style.overflow;
        const previousTouchAction = document.body.style.touchAction;

        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.touchAction = previousTouchAction;
        };
    });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible}
    <div
        class="background-modal"
        use:portal
        style={getMenuThemeCssVars(menuTheme)}
        transition:fade={{ duration: 150 }}
    >
        <button
            type="button"
            class="background-modal__scrim"
            aria-label="Close background picker"
            onclick={onClose}
        ></button>

        <div class="background-modal__shell" transition:fly={{ y: 18, duration: 220 }}>
            <div class="background-modal__header">
                <div>
                    <p class="background-modal__eyebrow">Menu Environment</p>
                    <h2>Background Modes</h2>
                    <p class="background-modal__copy">
                        {themeLabel} remembers its own ambient backdrop. Primary modes are
                        live-rendered and tuned for readability.
                    </p>
                </div>

                <button
                    type="button"
                    class="background-modal__close"
                    aria-label="Close background picker"
                    onclick={onClose}
                >
                    X
                </button>
            </div>

            <section class="background-modal__section">
                <div class="background-modal__section-copy">
                    <p class="background-modal__section-title">Primary Modes</p>
                    <p class="background-modal__section-body">
                        Use these for the new animated menu treatment.
                    </p>
                </div>

                <div class="background-modal__grid">
                    {#each backgroundModes as mode}
                        <button
                            type="button"
                            class="background-modal__thumb"
                            class:is-active={selection.modeId === mode.id}
                            onclick={() => onSelectBackground({ modeId: mode.id, tunables: {} })}
                        >
                            <span class={modeSwatchClass(mode.id)}></span>
                            <span class="background-modal__label">{mode.label}</span>
                            <span class="background-modal__description">{mode.description}</span>
                        </button>
                    {/each}
                </div>
            </section>

            <section class="background-modal__section background-modal__section--legacy">
                <div class="background-modal__section-copy">
                    <p class="background-modal__section-title">Legacy Images</p>
                    <p class="background-modal__section-body">
                        Keep or restore existing static backdrops without leaving compatibility
                        mode.
                    </p>
                </div>

                <div class="background-modal__grid background-modal__grid--legacy">
                    <button
                        type="button"
                        class="background-modal__thumb"
                        class:is-active={selection.modeId === "legacy_image" && !legacyImage}
                        onclick={() => onSelectBackground(buildLegacyImageSelection(""))}
                    >
                        <span class="background-modal__placeholder">None</span>
                        <span class="background-modal__label">No Image</span>
                    </button>

                    {#each legacyImages as image}
                        <button
                            type="button"
                            class="background-modal__thumb"
                            class:is-active={selection.modeId === "legacy_image" && legacyImage === image}
                            onclick={() => onSelectBackground(buildLegacyImageSelection(image))}
                        >
                            <img
                                src={`/assets/${image}`}
                                alt={formatBackgroundLabel(image)}
                                loading="lazy"
                            />
                            <span class="background-modal__label">{formatBackgroundLabel(image)}</span>
                        </button>
                    {/each}
                </div>
            </section>
        </div>
    </div>
{/if}

<style>
    .background-modal {
        position: fixed;
        inset: 0;
        z-index: 1400;
        display: grid;
        place-items: start center;
        padding: clamp(18px, 4vh, 40px) 16px 16px;
        isolation: isolate;
    }

    .background-modal__scrim {
        position: absolute;
        inset: 0;
        border: 0;
        background: var(--pf-overlay-modal-scrim);
        cursor: pointer;
    }

    .background-modal__shell {
        position: relative;
        z-index: 1;
        width: min(1080px, calc(100vw - 32px));
        max-height: calc(100vh - 32px);
        overflow: auto;
        padding: 20px;
        border-radius: var(--pf-title-radius);
        border: 1px solid var(--pf-border-strong);
        background:
            var(--pf-frame-modal),
            linear-gradient(
                180deg,
                color-mix(in srgb, var(--pf-surface-dialog) 90%, transparent) 0%,
                var(--pf-surface-dialog) 100%
            );
        box-shadow: var(--pf-shadow-modal);
        backdrop-filter: blur(28px);
    }

    .background-modal__shell::before {
        content: "";
        position: absolute;
        inset: 0;
        background: center / cover no-repeat var(--pf-theme-banner-art);
        opacity: 0.16;
        mix-blend-mode: screen;
        pointer-events: none;
    }

    .background-modal__shell > * {
        position: relative;
        z-index: 1;
    }

    .background-modal__header {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
    }

    .background-modal__eyebrow {
        margin: 0 0 4px;
        color: var(--pf-accent-soft);
        font-family: var(--pf-font-body);
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
    }

    .background-modal h2 {
        margin: 0;
        color: var(--pf-heading);
        font-family: var(--pf-font-display);
        font-size: clamp(1.55rem, 2vw, 1.95rem);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .background-modal__copy {
        margin: 8px 0 0;
        color: var(--pf-muted);
        font-family: var(--pf-font-body);
        font-size: 0.98rem;
        max-width: 52ch;
    }

    .background-modal__close {
        min-width: 42px;
        min-height: 42px;
        padding: 0 14px;
        border-radius: var(--pf-pill-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-frame-control), var(--pf-surface-pill);
        color: var(--pf-muted-strong);
        font-family: var(--pf-font-body);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
    }

    .background-modal__close:hover {
        border-color: var(--pf-accent-soft);
        background: var(--pf-frame-control), var(--pf-surface-pill-active);
        color: var(--pf-text);
    }

    .background-modal__section {
        display: grid;
        gap: 14px;
    }

    .background-modal__section + .background-modal__section {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid var(--pf-divider);
    }

    .background-modal__section-title {
        margin: 0;
        color: var(--pf-heading);
        font-family: var(--pf-font-display);
        font-size: 0.94rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }

    .background-modal__section-body {
        margin: 6px 0 0;
        color: var(--pf-muted);
        font-family: var(--pf-font-body);
        font-size: 0.9rem;
        line-height: 1.5;
    }

    .background-modal__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(176px, 1fr));
        gap: 12px;
    }

    .background-modal__grid--legacy {
        grid-template-columns: repeat(auto-fit, minmax(152px, 1fr));
    }

    .background-modal__thumb {
        display: grid;
        gap: 8px;
        padding: 8px;
        border-radius: var(--pf-card-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-frame-panel), var(--pf-surface-card);
        cursor: pointer;
        text-align: left;
        transition:
            border-color 0.15s ease,
            transform 0.15s ease,
            background 0.15s ease,
            box-shadow 0.15s ease;
    }

    .background-modal__thumb:hover,
    .background-modal__thumb.is-active {
        border-color: var(--pf-accent-soft);
        background: var(--pf-frame-panel), var(--pf-surface-card-hover);
        transform: translateY(-2px);
        box-shadow: 0 18px 40px color-mix(in srgb, var(--pf-glow) 18%, transparent);
    }

    .background-modal__thumb img,
    .background-modal__placeholder,
    .background-modal__swatch {
        width: 100%;
        aspect-ratio: 1.6;
        border-radius: 12px;
        background: var(--pf-surface-field);
        object-fit: cover;
        display: grid;
        place-items: center;
        color: var(--pf-muted);
        font-family: var(--pf-font-body);
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .background-modal__swatch {
        position: relative;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--pf-border-soft) 75%, transparent);
    }

    .background-modal__swatch::before,
    .background-modal__swatch::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    .background-modal__swatch--nebula_veil {
        background:
            radial-gradient(circle at 22% 30%, rgba(127, 188, 255, 0.48), transparent 34%),
            radial-gradient(circle at 74% 28%, rgba(172, 112, 255, 0.32), transparent 28%),
            radial-gradient(circle at 62% 72%, rgba(47, 186, 166, 0.24), transparent 34%),
            linear-gradient(180deg, rgba(5, 12, 32, 0.96), rgba(3, 7, 19, 1));
    }

    .background-modal__swatch--nebula_veil::after {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 58%);
        mix-blend-mode: screen;
    }

    .background-modal__swatch--banner_light {
        background:
            linear-gradient(105deg, transparent 22%, rgba(255, 216, 136, 0.28) 42%, transparent 61%),
            linear-gradient(120deg, transparent 40%, rgba(120, 219, 255, 0.18) 56%, transparent 72%),
            linear-gradient(180deg, rgba(10, 20, 38, 0.98), rgba(4, 10, 24, 1));
    }

    .background-modal__swatch--shadow_mist {
        background:
            radial-gradient(circle at 30% 24%, rgba(108, 97, 176, 0.18), transparent 30%),
            radial-gradient(circle at 68% 62%, rgba(58, 80, 138, 0.16), transparent 34%),
            linear-gradient(180deg, rgba(9, 13, 28, 0.98), rgba(3, 5, 15, 1));
    }

    .background-modal__swatch--shadow_mist::after {
        background:
            radial-gradient(circle at 26% 42%, rgba(255, 255, 255, 0.04), transparent 4%),
            radial-gradient(circle at 72% 36%, rgba(150, 194, 255, 0.08), transparent 3%),
            radial-gradient(circle at 58% 76%, rgba(255, 255, 255, 0.04), transparent 3%);
    }

    .background-modal__label {
        color: var(--pf-muted-strong);
        font-family: var(--pf-font-body);
        font-size: 0.84rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: capitalize;
    }

    .background-modal__description {
        color: var(--pf-muted);
        font-family: var(--pf-font-body);
        font-size: 0.8rem;
        line-height: 1.45;
    }

    @media (max-width: 640px) {
        .background-modal {
            padding: 12px;
        }

        .background-modal__shell {
            width: min(100vw - 24px, 1080px);
            max-height: calc(100vh - 24px);
            padding: 16px;
            border-radius: 22px;
        }

        .background-modal__header {
            flex-direction: column;
            align-items: stretch;
        }

        .background-modal__close {
            align-self: flex-end;
        }

        .background-modal__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
</style>
