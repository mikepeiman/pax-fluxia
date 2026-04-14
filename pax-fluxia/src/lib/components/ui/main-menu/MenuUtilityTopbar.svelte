<script lang="ts">
    interface Props {
        bgOpen: boolean;
        bgImage: string;
        bgImages: string[];
        muted: boolean;
        masterVolume: number;
        onToggleBackgrounds: () => void;
        onSelectBackground: (image: string) => void;
        onToggleMute: () => void;
        onSetVolume: (value: number) => void;
        onOpenSettings: () => void;
    }

    let {
        bgOpen,
        bgImage,
        bgImages,
        muted,
        masterVolume,
        onToggleBackgrounds,
        onSelectBackground,
        onToggleMute,
        onSetVolume,
        onOpenSettings,
    }: Props = $props();

    function formatBackgroundLabel(name: string): string {
        return name
            .replace(/\.(png|jpe?g|webp|avif)$/i, "")
            .replace(/^pax-fluxia-/, "")
            .replace(/[-_]/g, " ");
    }
</script>

<div class="menu-topbar">
    <div class="menu-topbar__cluster">
        <div class="background-picker">
            <button
                type="button"
                class="topbar-chip"
                class:is-active={bgOpen}
                onclick={onToggleBackgrounds}
            >
                Background
            </button>

            {#if bgOpen}
                <div class="background-picker__menu">
                    <button
                        type="button"
                        class="background-picker__thumb"
                        class:is-active={!bgImage}
                        onclick={() => onSelectBackground("")}
                    >
                        <span class="background-picker__placeholder">None</span>
                        <span class="background-picker__label">Default</span>
                    </button>

                    {#each bgImages as image}
                        <button
                            type="button"
                            class="background-picker__thumb"
                            class:is-active={bgImage === image}
                            onclick={() => onSelectBackground(image)}
                        >
                            <img
                                src={`/assets/${image}`}
                                alt={formatBackgroundLabel(image)}
                                loading="lazy"
                            />
                            <span class="background-picker__label">{formatBackgroundLabel(image)}</span>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <div class="menu-topbar__cluster menu-topbar__cluster--right">
        <div class="audio-chip">
            <button
                type="button"
                class="topbar-chip"
                class:is-muted={muted}
                onclick={onToggleMute}
            >
                {muted ? "Muted" : "Audio"}
            </button>

            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVolume}
                disabled={muted}
                oninput={(event) =>
                    onSetVolume(
                        Number((event.currentTarget as HTMLInputElement).value),
                    )}
            />
        </div>

        <button
            type="button"
            class="topbar-icon"
            title="Open settings"
            onclick={onOpenSettings}
        >
            Settings
        </button>
    </div>
</div>

<style>
    .menu-topbar {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 12px 14px;
        border-radius: 18px;
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-elevated);
        backdrop-filter: blur(18px);
        box-shadow: var(--pf-shadow-elevated);
    }

    .menu-topbar__cluster {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .menu-topbar__cluster--right {
        margin-left: auto;
    }

    .background-picker {
        position: relative;
    }

    .topbar-chip,
    .topbar-icon {
        min-height: var(--pf-pill-h);
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-pill);
        color: var(--pf-muted-strong);
        font-family: "Rajdhani", sans-serif;
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
    }

    .topbar-chip:hover,
    .topbar-chip.is-active,
    .topbar-icon:hover {
        border-color: var(--pf-accent-soft);
        background: var(--pf-surface-pill-active);
        color: var(--pf-text);
    }

    .topbar-chip.is-muted {
        color: var(--pf-muted);
    }

    .audio-chip {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: var(--pf-pill-h);
        padding: 4px 6px 4px 4px;
        border-radius: 999px;
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-surface-control);
    }

    .audio-chip input {
        width: min(140px, 26vw);
    }

    .background-picker__menu {
        position: absolute;
        top: calc(100% + 10px);
        left: 0;
        z-index: 30;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
        gap: 8px;
        width: min(420px, 80vw);
        padding: 10px;
        border-radius: 18px;
        border: 1px solid var(--pf-border-strong);
        background: var(--pf-surface-elevated);
        backdrop-filter: blur(20px);
        box-shadow: var(--pf-shadow-elevated);
    }

    .background-picker__thumb {
        display: grid;
        gap: 6px;
        padding: 6px;
        border-radius: 14px;
        border: 1px solid transparent;
        background: var(--pf-surface-card);
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            transform 0.15s ease,
            background 0.15s ease;
    }

    .background-picker__thumb:hover,
    .background-picker__thumb.is-active {
        border-color: var(--pf-accent-soft);
        background: var(--pf-surface-card-hover);
        transform: translateY(-1px);
    }

    .background-picker__thumb img,
    .background-picker__placeholder {
        width: 100%;
        aspect-ratio: 1.5;
        border-radius: 10px;
        background: var(--pf-surface-field);
        object-fit: cover;
        display: grid;
        place-items: center;
        color: var(--pf-muted);
        font-family: "Rajdhani", sans-serif;
        font-weight: 700;
    }

    .background-picker__label {
        font-family: "Rajdhani", sans-serif;
        font-size: 0.76rem;
        font-weight: 600;
        color: var(--pf-muted);
        text-transform: capitalize;
    }

    @media (max-width: 640px) {
        .menu-topbar {
            flex-direction: column;
            align-items: stretch;
        }

        .menu-topbar__cluster,
        .menu-topbar__cluster--right {
            width: 100%;
            justify-content: space-between;
            margin-left: 0;
        }

        .audio-chip {
            flex: 1;
            justify-content: space-between;
        }
    }
</style>
