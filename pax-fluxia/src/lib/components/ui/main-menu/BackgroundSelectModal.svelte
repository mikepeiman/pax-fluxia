<script lang="ts">
    import { browser } from "$app/environment";
    import { fade, fly } from "svelte/transition";
    import {
        getMenuThemeCssVars,
        getMenuThemeDefinition,
        type MenuTheme,
} from "./menuTheme";

    interface Props {
        visible: boolean;
        bgImage: string;
        bgImages: string[];
        menuTheme: MenuTheme;
        onClose: () => void;
        onSelectBackground: (image: string) => void;
    }

    let { visible, bgImage, bgImages, menuTheme, onClose, onSelectBackground }: Props = $props();
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
                    <h2>Background Select</h2>
                    <p class="background-modal__copy">
                        Selections are saved to {themeLabel}. Switching themes restores that theme's backdrop.
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

            <div class="background-modal__grid">
                <button
                    type="button"
                    class="background-modal__thumb"
                    class:is-active={!bgImage}
                    onclick={() => onSelectBackground("")}
                >
                    <span class="background-modal__placeholder">None</span>
                    <span class="background-modal__label">Default</span>
                </button>

                {#each bgImages as image}
                    <button
                        type="button"
                        class="background-modal__thumb"
                        class:is-active={bgImage === image}
                        onclick={() => onSelectBackground(image)}
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
            linear-gradient(180deg, color-mix(in srgb, var(--pf-surface-dialog) 90%, transparent) 0%, var(--pf-surface-dialog) 100%);
        box-shadow: var(--pf-shadow-elevated);
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
        font-weight: var(--pax-weight-bold);
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
        max-width: 48ch;
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
        font-weight: var(--pax-weight-bold);
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

    .background-modal__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(176px, 1fr));
        gap: 12px;
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
    .background-modal__placeholder {
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
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .background-modal__label {
        color: var(--pf-muted-strong);
        font-family: var(--pf-font-body);
        font-size: 0.84rem;
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.04em;
        text-transform: capitalize;
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
