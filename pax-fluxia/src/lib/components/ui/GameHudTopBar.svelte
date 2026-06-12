<script lang="ts">
    import { territoryRenderStatus } from '$lib/stores/territoryRenderStatusStore';
    import { gameHudStatsStore } from '$lib/stores/gameHudStatsStore';
    import type { TerritoryModeShortcutOption } from '$lib/territory/ui/territoryModeShortcuts';

    interface Props {
        onMenuClick: () => void;
        onSettingsClick?: () => void;
        showAudienceModeToggle?: boolean;
        publicShellActive?: boolean;
        onSwitchToPublicShell?: () => void;
        onSwitchToDevShell?: () => void;
        showAdvancedToggle?: boolean;
        advancedActive?: boolean;
        onAdvancedToggle?: () => void;
        showInternalToggle?: boolean;
        internalActive?: boolean;
        onInternalToggle?: () => void;
        onDiagnosticsClick?: () => void;
        onThemesClick?: () => void;
        onRulerToggle?: () => void;
        onAuthoredMeasurementsToggle?: () => void;
        onFitViewport?: () => void;
        onHelpClick?: () => void;
        onModeSelect: (modeId: string) => void;
        modeOptions: TerritoryModeShortcutOption[];
        fallbackActiveModeId: string;
        currentThemeName?: string;
        diagnosticsActive?: boolean;
        rulerActive?: boolean;
        authoredMeasurementsActive?: boolean;
        authoredMeasurementsAvailable?: boolean;
    }

    let {
        onMenuClick,
        onSettingsClick,
        showAudienceModeToggle = false,
        publicShellActive = false,
        onSwitchToPublicShell,
        onSwitchToDevShell,
        showAdvancedToggle = false,
        advancedActive = false,
        onAdvancedToggle,
        showInternalToggle = false,
        internalActive = false,
        onInternalToggle,
        onDiagnosticsClick,
        onThemesClick,
        onRulerToggle,
        onAuthoredMeasurementsToggle,
        onFitViewport,
        onHelpClick,
        onModeSelect,
        modeOptions,
        fallbackActiveModeId,
        currentThemeName = 'Theme',
        diagnosticsActive = false,
        rulerActive = false,
        authoredMeasurementsActive = false,
        authoredMeasurementsAvailable = false,
    }: Props = $props();

    const activeModeId = $derived(
        $territoryRenderStatus.territoryMode &&
            $territoryRenderStatus.territoryMode !== 'none'
            ? $territoryRenderStatus.territoryMode
            : fallbackActiveModeId,
    );

    const statsLabel = $derived(
        `${$gameHudStatsStore.fps} FPS · ${$gameHudStatsStore.visualShips.toLocaleString()} ships`,
    );
</script>

<div class="game-hud-topbar" role="toolbar" aria-label="Game quick controls">
    <div class="game-hud-topbar__left">
        <button
            class="game-hud-topbar__menu-btn"
            type="button"
            onclick={onMenuClick}
            title="Return to menu"
        >
            ← Menu
        </button>
        <div class="game-hud-topbar__stats-pill" title="Current render performance and visual ship count">
            {statsLabel}
        </div>
    </div>

    <div class="game-hud-topbar__center" aria-label="Territory render modes">
        {#each modeOptions as option (option.id)}
            <button
                type="button"
                class="mode-shortcut"
                class:active={activeModeId === option.id}
                data-appearance={option.appearance}
                onclick={() => onModeSelect(option.id)}
                title={option.shortDescription ?? option.label}
            >
                <span class="mode-shortcut__short">{option.shortLabel}</span>
                <span class="mode-shortcut__label">{option.label}</span>
            </button>
        {/each}
    </div>

    <div class="game-hud-topbar__right">
        {#if showAudienceModeToggle || showAdvancedToggle || showInternalToggle}
            <div class="audience-shortcuts">
                {#if showAudienceModeToggle}
                    <div class="audience-mode-toggle" aria-label="Shell mode">
                        <button
                            type="button"
                            class="audience-pill"
                            class:active={!publicShellActive}
                            onclick={onSwitchToDevShell}
                            title="Switch to the full development shell"
                        >
                            Dev
                        </button>
                        <button
                            type="button"
                            class="audience-pill"
                            class:active={publicShellActive}
                            onclick={onSwitchToPublicShell}
                            title="Preview the public shell without leaving dev"
                        >
                            Public
                        </button>
                    </div>
                {/if}
                {#if showAdvancedToggle && onAdvancedToggle}
                    <button
                        type="button"
                        class="audience-pill"
                        class:active={advancedActive}
                        onclick={onAdvancedToggle}
                        title={advancedActive ? "Hide advanced settings" : "Show advanced settings"}
                    >
                        Advanced
                    </button>
                {/if}
                {#if showInternalToggle && onInternalToggle}
                    <button
                        type="button"
                        class="audience-pill"
                        class:active={internalActive}
                        onclick={onInternalToggle}
                        title={internalActive ? "Hide internal tools" : "Unlock internal tools"}
                    >
                        Internal
                    </button>
                {/if}
            </div>
        {/if}

        {#if onThemesClick}
            <div class="theme-shortcuts">
                <button
                    type="button"
                    class="quick-action-btn quick-action-btn--theme"
                    onclick={onThemesClick}
                    title="Open theme controls"
                >
                    🎨
                </button>
                <button
                    type="button"
                    class="quick-action-btn quick-action-btn--theme-name"
                    onclick={onThemesClick}
                    title={`Current theme: ${currentThemeName}`}
                >
                    {currentThemeName}
                </button>
            </div>
        {/if}

        {#if onSettingsClick}
            <button
                type="button"
                class="quick-action-btn"
                onclick={onSettingsClick}
                title="Settings"
            >
                ⚙
            </button>
        {/if}
        {#if onDiagnosticsClick}
            <button
                type="button"
                class="quick-action-btn"
                class:active={diagnosticsActive}
                onclick={onDiagnosticsClick}
                title="Diagnostics"
            >
                ◎
            </button>
        {/if}
        {#if onRulerToggle}
            <button
                type="button"
                class="quick-action-btn"
                class:active={rulerActive}
                onclick={onRulerToggle}
                title={rulerActive ? 'Turn ruler off' : 'Turn ruler on'}
            >
                📏
            </button>
        {/if}
        {#if onAuthoredMeasurementsToggle && authoredMeasurementsAvailable}
            <button
                type="button"
                class="quick-action-btn"
                class:active={authoredMeasurementsActive}
                onclick={onAuthoredMeasurementsToggle}
                title={authoredMeasurementsActive ? 'Hide map measurements' : 'Show map measurements'}
            >
                ⇄
            </button>
        {/if}
        {#if onFitViewport}
            <button
                type="button"
                class="quick-action-btn quick-action-btn--desktop"
                onclick={onFitViewport}
                title="Fit to viewport"
            >
                ⛶
            </button>
        {/if}
        {#if onHelpClick}
            <button
                type="button"
                class="quick-action-btn quick-action-btn--desktop"
                onclick={onHelpClick}
                title="Help and controls"
            >
                ?
            </button>
        {/if}
    </div>
</div>

<style>
    .game-hud-topbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 220;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 14px;
        min-height: 56px;
        padding: 8px 14px;
        background:
            linear-gradient(180deg, rgba(4, 8, 20, 0.96), rgba(4, 8, 20, 0.72)),
            rgba(10, 14, 28, 0.78);
        backdrop-filter: blur(14px);
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        box-shadow: 0 12px 40px rgba(2, 6, 23, 0.32);
    }

    .game-hud-topbar__left,
    .game-hud-topbar__right {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }

    .game-hud-topbar__center {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-width: 0;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .game-hud-topbar__center::-webkit-scrollbar {
        display: none;
    }

    .game-hud-topbar__menu-btn,
    .quick-action-btn,
    .mode-shortcut {
        border: 1px solid rgba(148, 163, 184, 0.18);
        color: rgba(241, 245, 249, 0.94);
        cursor: pointer;
        transition:
            transform 0.14s ease,
            border-color 0.14s ease,
            box-shadow 0.14s ease,
            background 0.14s ease,
            color 0.14s ease;
    }

    .game-hud-topbar__menu-btn:hover,
    .quick-action-btn:hover,
    .mode-shortcut:hover {
        transform: translateY(-1px);
        border-color: rgba(125, 211, 252, 0.42);
        box-shadow: 0 10px 20px rgba(8, 15, 34, 0.24);
    }

    .game-hud-topbar__menu-btn {
        padding: 6px 11px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.82);
        font-family: "Montserrat", sans-serif;
        font-size: 0.66rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .game-hud-topbar__stats-pill {
        padding: 6px 11px;
        border-radius: 999px;
        background: rgba(3, 7, 18, 0.76);
        border: 1px solid rgba(16, 185, 129, 0.18);
        color: rgba(167, 243, 208, 0.92);
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 0.68rem;
        white-space: nowrap;
    }

    .mode-shortcut {
        position: relative;
        min-width: 74px;
        padding: 5px 8px 6px;
        border-radius: 10px;
        text-align: left;
        background: rgba(15, 23, 42, 0.74);
        overflow: hidden;
    }

    .mode-shortcut::before {
        content: "";
        position: absolute;
        inset: 0;
        opacity: 0.95;
    }

    .mode-shortcut > span {
        position: relative;
        z-index: 1;
        display: block;
    }

    .mode-shortcut__short {
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }

    .mode-shortcut__label {
        margin-top: 2px;
        font-size: 0.54rem;
        color: rgba(226, 232, 240, 0.88);
        white-space: nowrap;
    }

    .mode-shortcut[data-appearance="pvv4"]::before {
        background:
            radial-gradient(circle at 18% 22%, rgba(125, 211, 252, 0.34), transparent 44%),
            linear-gradient(135deg, rgba(30, 64, 175, 0.9), rgba(15, 23, 42, 0.88));
    }

    .mode-shortcut[data-appearance="perimeter"]::before {
        background:
            radial-gradient(circle at 82% 24%, rgba(45, 212, 191, 0.34), transparent 38%),
            linear-gradient(135deg, rgba(13, 148, 136, 0.92), rgba(15, 23, 42, 0.86));
    }

    .mode-shortcut[data-appearance="metaball"]::before {
        background:
            radial-gradient(circle at 22% 76%, rgba(251, 191, 36, 0.34), transparent 38%),
            linear-gradient(135deg, rgba(180, 83, 9, 0.92), rgba(30, 41, 59, 0.86));
    }

    .mode-shortcut[data-appearance="grid"]::before {
        background:
            linear-gradient(90deg, rgba(34, 197, 94, 0.12) 1px, transparent 1px),
            linear-gradient(rgba(34, 197, 94, 0.12) 1px, transparent 1px),
            linear-gradient(135deg, rgba(22, 163, 74, 0.92), rgba(15, 23, 42, 0.86));
        background-size: 12px 12px, 12px 12px, auto;
    }

    .mode-shortcut[data-appearance="phase_edges"]::before {
        background:
            linear-gradient(120deg, rgba(244, 114, 182, 0.16), transparent 46%),
            radial-gradient(circle at 74% 24%, rgba(192, 132, 252, 0.24), transparent 34%),
            linear-gradient(135deg, rgba(126, 34, 206, 0.9), rgba(15, 23, 42, 0.88));
    }

    .mode-shortcut[data-appearance="ember"]::before {
        background:
            linear-gradient(120deg, rgba(248, 113, 113, 0.18), transparent 48%),
            radial-gradient(circle at 76% 20%, rgba(251, 146, 60, 0.28), transparent 34%),
            linear-gradient(135deg, rgba(190, 24, 93, 0.92), rgba(15, 23, 42, 0.88));
    }

    .mode-shortcut[data-appearance="phase_field"]::before {
        background:
            linear-gradient(120deg, rgba(56, 189, 248, 0.18), transparent 44%),
            radial-gradient(circle at 78% 22%, rgba(244, 114, 182, 0.22), transparent 32%),
            linear-gradient(135deg, rgba(14, 116, 144, 0.94), rgba(67, 56, 202, 0.84));
    }

    .mode-shortcut[data-appearance="grid_gradient"]::before {
        background:
            radial-gradient(circle at 24% 28%, rgba(191, 219, 254, 0.28), transparent 20%),
            radial-gradient(circle at 62% 54%, rgba(45, 212, 191, 0.18), transparent 26%),
            linear-gradient(90deg, rgba(96, 165, 250, 0.11) 1px, transparent 1px),
            linear-gradient(rgba(96, 165, 250, 0.11) 1px, transparent 1px),
            linear-gradient(135deg, rgba(2, 132, 199, 0.92), rgba(15, 23, 42, 0.88));
        background-size: auto, auto, 10px 10px, 10px 10px, auto;
    }

    .mode-shortcut.active {
        border-color: rgba(248, 250, 252, 0.82);
        box-shadow:
            0 0 0 1px rgba(248, 250, 252, 0.18),
            0 14px 24px rgba(2, 6, 23, 0.3);
    }

    .theme-shortcuts {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    }

    .audience-shortcuts {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex-wrap: wrap;
    }

    .audience-mode-toggle {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px;
        border-radius: 999px;
        background: rgba(2, 6, 23, 0.58);
        border: 1px solid rgba(148, 163, 184, 0.16);
    }

    .audience-pill {
        min-height: 30px;
        padding: 0 10px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.76);
        color: rgba(226, 232, 240, 0.86);
        font-family: "Montserrat", sans-serif;
        font-size: 0.6rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            transform 0.14s ease,
            border-color 0.14s ease,
            background 0.14s ease,
            color 0.14s ease;
    }

    .audience-pill:hover {
        transform: translateY(-1px);
        border-color: rgba(125, 211, 252, 0.36);
        color: #fff;
    }

    .audience-pill.active {
        border-color: rgba(248, 250, 252, 0.58);
        background: rgba(59, 130, 246, 0.18);
        color: rgba(255, 255, 255, 0.98);
    }

    .quick-action-btn {
        min-width: 32px;
        min-height: 32px;
        padding: 0 9px;
        border-radius: 9px;
        background: rgba(15, 23, 42, 0.82);
        font-size: 0.84rem;
        line-height: 1;
    }

    .quick-action-btn--theme-name {
        max-width: 152px;
        justify-content: flex-start;
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .quick-action-btn--theme {
        color: rgba(253, 224, 71, 0.96);
    }

    .quick-action-btn.active {
        border-color: rgba(87, 248, 255, 0.48);
        color: rgba(87, 248, 255, 0.98);
        box-shadow: 0 0 0 1px rgba(87, 248, 255, 0.16);
    }

    @media (max-width: 1600px) {
        .quick-action-btn--theme-name {
            max-width: 112px;
        }
    }

    @media (max-width: 1360px) {
        .quick-action-btn--desktop {
            display: none;
        }
    }

    @media (max-width: 1024px) {
        .game-hud-topbar {
            display: none;
        }
    }
</style>
