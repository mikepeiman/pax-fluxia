<script lang="ts">
    import {
        getMenuThemeCssVars,
        getMenuThemeDefinition,
        MENU_THEME_OPTIONS,
        type MenuTheme,
} from "./menuTheme";

    interface Props {
        menuTheme: MenuTheme;
        onMenuThemeChange: (theme: MenuTheme) => void;
    }

    let { menuTheme, onMenuThemeChange }: Props = $props();

    const themeEntries = MENU_THEME_OPTIONS.map((option) => ({
        ...option,
        definition: getMenuThemeDefinition(option.id),
    }));
</script>

<div class="theme-rail" role="group" aria-label="Menu theme">
    {#each themeEntries as entry}
        <button
            type="button"
            class="theme-rail__button"
            class:is-active={menuTheme === entry.id}
            style={getMenuThemeCssVars(entry.id)}
            title={`${entry.label}: ${entry.summary}`}
            onclick={() => onMenuThemeChange(entry.id)}
        >
            <img src={entry.definition.identity.chipArt} alt="" aria-hidden="true" />
            <span>{entry.definition.identity.modeLabel}</span>
        </button>
    {/each}
</div>

<style>
    .theme-rail {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px;
        border-radius: var(--pf-rail-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-frame-control), var(--pf-surface-control);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .theme-rail__button {
        position: relative;
        width: 68px;
        height: 42px;
        padding: 0;
        border-radius: var(--pf-button-radius);
        border: 1px solid transparent;
        background:
            var(--pf-frame-control),
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 100%),
            var(--pf-surface-card);
        color: var(--pf-muted-strong);
        cursor: pointer;
        overflow: hidden;
        transition:
            transform 0.16s ease,
            border-color 0.16s ease,
            box-shadow 0.16s ease,
            background 0.16s ease;
    }

    .theme-rail__button img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.95;
        mix-blend-mode: screen;
    }

    .theme-rail__button::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
            linear-gradient(180deg, rgba(3, 6, 14, 0.02), rgba(3, 6, 14, 0.54)),
            radial-gradient(circle at 50% 0%, var(--pf-glow), transparent 62%);
        pointer-events: none;
    }

    .theme-rail__button span {
        position: absolute;
        left: 50%;
        bottom: 7px;
        transform: translateX(-50%);
        z-index: 1;
        font-family: var(--pf-font-display);
        font-size: 0.58rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #f8fcff;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
        white-space: nowrap;
    }

    .theme-rail__button:hover,
    .theme-rail__button.is-active {
        transform: translateY(-1px);
        border-color: var(--pf-accent-soft);
        box-shadow: var(--pf-shadow-glow);
    }

    .theme-rail__button.is-active {
        background:
            var(--pf-frame-control),
            linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 100%),
            var(--pf-surface-card-hover);
    }

    @media (max-width: 640px) {
        .theme-rail {
            width: 100%;
            justify-content: space-between;
        }

        .theme-rail__button {
            flex: 1;
            width: auto;
        }
    }
</style>
