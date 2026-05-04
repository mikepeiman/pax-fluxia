<script lang="ts">
    import type {
        BackgroundModeDefinition,
        BackgroundSelection,
    } from "$lib/backgrounds";
    import type { MenuTheme } from "./menuTheme";
    import BackgroundSelectModal from "./BackgroundSelectModal.svelte";
    import MenuThemeRail from "./MenuThemeRail.svelte";

    interface Props {
        bgOpen: boolean;
        selection: BackgroundSelection;
        legacyImage: string;
        legacyImages: string[];
        backgroundModes: readonly BackgroundModeDefinition[];
        menuTheme: MenuTheme;
        muted: boolean;
        masterVolume: number;
        onToggleBackgrounds: () => void;
        onCloseBackgrounds: () => void;
        onSelectBackground: (selection: BackgroundSelection) => void;
        onMenuThemeChange: (theme: MenuTheme) => void;
        onToggleMute: () => void;
        onSetVolume: (value: number) => void;
        onOpenSettings: () => void;
    }

    let {
        bgOpen,
        selection,
        legacyImage,
        legacyImages,
        backgroundModes,
        menuTheme,
        muted,
        masterVolume,
        onToggleBackgrounds,
        onCloseBackgrounds,
        onSelectBackground,
        onMenuThemeChange,
        onToggleMute,
        onSetVolume,
        onOpenSettings,
    }: Props = $props();
</script>

<div class="menu-topbar">
    <div class="menu-topbar__cluster">
        <button
            type="button"
            class="topbar-chip"
            class:is-active={bgOpen}
            onclick={onToggleBackgrounds}
        >
            Background
        </button>

        <MenuThemeRail {menuTheme} {onMenuThemeChange} />
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
            title="Open audio mixer"
            onclick={onOpenSettings}
        >
            Mixer
        </button>
    </div>
</div>

<BackgroundSelectModal
    visible={bgOpen}
    {selection}
    {legacyImage}
    {legacyImages}
    {backgroundModes}
    {menuTheme}
    onClose={onCloseBackgrounds}
    {onSelectBackground}
/>

<style>
    .menu-topbar {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 12px 14px;
        border-radius: var(--pf-topbar-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-frame-topbar), var(--pf-surface-elevated);
        backdrop-filter: blur(18px);
        box-shadow: var(--pf-shadow-elevated);
        overflow: hidden;
        isolation: isolate;
    }

    .menu-topbar::before {
        content: "";
        position: absolute;
        inset: 0;
        background: center / cover no-repeat var(--pf-theme-banner-art);
        opacity: 0.16;
        pointer-events: none;
        mix-blend-mode: screen;
    }

    .menu-topbar > * {
        position: relative;
        z-index: 1;
    }

    .menu-topbar__cluster {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
    }

    .menu-topbar__cluster--right {
        margin-left: auto;
    }

    .topbar-chip,
    .topbar-icon {
        min-height: var(--pf-pill-h);
        padding: 0 14px;
        border-radius: var(--pf-pill-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-frame-control), var(--pf-surface-pill);
        color: var(--pf-muted-strong);
        font-family: var(--pf-font-body);
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
        background: var(--pf-frame-control), var(--pf-surface-pill-active);
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
        border-radius: var(--pf-pill-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-frame-control), var(--pf-surface-control);
    }

    .audio-chip input {
        width: min(140px, 26vw);
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
            flex-wrap: wrap;
            margin-left: 0;
        }

        .audio-chip {
            flex: 1;
            justify-content: space-between;
        }
    }
</style>
