<script lang="ts">
    import type { PlayerState } from "$lib/types/game.types";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    import { territoryRenderStatus } from "$lib/stores/territoryRenderStatusStore";
    import { gameHudStatsStore } from "$lib/stores/gameHudStatsStore";
    import type { TerritoryModeShortcutOption } from "$lib/territory/ui/territoryModeShortcuts";
    import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

    interface Props {
        onMenuClick: () => void;
        onSettingsClick?: () => void;
        onToggleLeaderboard?: () => void;
        onModeSelect: (modeId: string) => void;
        modeOptions: TerritoryModeShortcutOption[];
        fallbackActiveModeId: string;
        settingsActive?: boolean;
        leaderboardCollapsed?: boolean;
        players?: PlayerState[];
        localPlayerId?: string;
    }

    let {
        onMenuClick,
        onSettingsClick,
        onToggleLeaderboard,
        onModeSelect,
        modeOptions,
        fallbackActiveModeId,
        settingsActive = false,
        leaderboardCollapsed = false,
        players = [],
        localPlayerId,
    }: Props = $props();

    const activeModeId = $derived(
        $territoryRenderStatus.territoryMode &&
            $territoryRenderStatus.territoryMode !== "none"
            ? $territoryRenderStatus.territoryMode
            : fallbackActiveModeId,
    );

    function isLocalPlayer(player: PlayerState): boolean {
        return player.id === localPlayerId || player.sessionId === localPlayerId;
    }

    function formatElapsed(seconds: number): string {
        const safeSeconds = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(safeSeconds / 60);
        const remainder = safeSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }

    const localPlayer = $derived(
        players.find((player) => isLocalPlayer(player)) ?? players[0] ?? null,
    );

    const selectedStar = $derived(
        selectedStarStore.id
            ? (activeGameStore.stars ?? []).find((star) => star.id === selectedStarStore.id) ?? null
            : null,
    );

    const topbarMeta = $derived.by(() => {
        const tick = activeGameStore.currentTick ?? 0;
        const elapsedSeconds = (tick * (activeGameStore.effectiveTickMs ?? 1000)) / 1000;

        return [
            { label: "Match", value: activeGameStore.phase === "playing" ? "Live Match" : activeGameStore.phase },
            { label: "Timer", value: formatElapsed(elapsedSeconds) },
            { label: "Sector", value: `${(activeGameStore.stars ?? []).length} Stars` },
            { label: "Player", value: localPlayer ? localPlayer.name : "Observer" },
            { label: "Selected Star", value: selectedStar ? `Star ${selectedStar.id.replace(/^star-/, "")}` : "None" },
        ];
    });

    const topbarKpis = $derived.by(() => {
        const player = localPlayer;
        return [
            {
                icon: "ship-active",
                value: (player?.activeShips ?? player?.totalShips ?? 0).toLocaleString(),
                label: "ships",
            },
            {
                icon: "economy",
                value: `+${player?.production ?? 0}`,
                label: "/tick",
            },
            {
                icon: "timing",
                value: String(activeGameStore.currentTick ?? 0),
                label: "tick",
            },
        ];
    });

    const collapsedLeaderboardPlayer = $derived.by(() => {
        const sortedPlayers = [...players].sort((left, right) => (right.totalShips ?? 0) - (left.totalShips ?? 0));
        return sortedPlayers.find((player) => isLocalPlayer(player)) ?? sortedPlayers[0] ?? null;
    });

    const perfLabel = $derived(`${$gameHudStatsStore.fps} FPS | ${$gameHudStatsStore.visualShips.toLocaleString()} ships drawn`);
</script>

<div class="game-hud-topbar" role="toolbar" aria-label="Game quick controls">
    <div class="topbar-brand">
        <button class="topbar-icon-button" type="button" onclick={onMenuClick} title="Return to menu" aria-label="Return to menu">
            <HudIcon name="menu" />
        </button>
        <div class="brand-mark" aria-hidden="true">
            <HudIcon name="yellow" size={19} />
        </div>
        <div class="brand-wordmark">Pax Fluxia</div>
    </div>

    <div class="topbar-meta" aria-label="Match status">
        {#each topbarMeta as item}
            <div class="topbar-meta-item">
                <span class="topbar-meta-item__label">{item.label}</span>
                <span class="topbar-meta-item__value">{item.value}</span>
            </div>
        {/each}
    </div>

    <div class="topbar-modes" aria-label="Territory render modes">
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

    <div class="topbar-status" aria-label="Player resources and HUD controls">
        <div class="topbar-kpis" title={perfLabel}>
            {#each topbarKpis as item}
                <div class="topbar-kpi">
                    <HudIcon name={item.icon} size={16} />
                    <span class="topbar-kpi__value font-hud-data">{item.value}</span>
                    <span class="topbar-kpi__label">{item.label}</span>
                </div>
            {/each}
        </div>

        <div class="topbar-actions">
            <a class="topbar-chip topbar-chip--test" href="/dev/ui-test" title="Open UI layout test">
                <HudIcon name="diagnostics" />
                <span>UI test</span>
            </a>
            <a class="topbar-chip topbar-chip--test" href="/dev/aurelia-hud" title="Open Aurelia Drift HUD package demo">
                <HudIcon name="gem" />
                <span>Aurelia HUD</span>
            </a>

            {#if onSettingsClick}
                <button
                    type="button"
                    class="topbar-chip"
                    class:topbar-chip--active={settingsActive}
                    onclick={onSettingsClick}
                    title={settingsActive ? "Collapse settings ribbon" : "Expand settings ribbon"}
                >
                    <HudIcon name="tune" />
                    <span>{settingsActive ? "Ribbon Open" : "Open Ribbon"}</span>
                    <HudIcon name={settingsActive ? "chevron-up" : "chevron-down"} size={15} />
                </button>
            {/if}

            {#if onToggleLeaderboard}
                <button
                    type="button"
                    class="topbar-chip topbar-chip--leaderboard"
                    class:topbar-chip--badge={leaderboardCollapsed}
                    onclick={onToggleLeaderboard}
                    title={leaderboardCollapsed ? "Expand leaderboard" : "Collapse leaderboard"}
                >
                    <HudIcon name="leaderboard" />
                    {#if leaderboardCollapsed && collapsedLeaderboardPlayer}
                        <span class="topbar-badge">
                            <span
                                class="topbar-badge__dot"
                                style={`background:${collapsedLeaderboardPlayer.color};`}
                            ></span>
                            <span class="topbar-badge__name">
                                {isLocalPlayer(collapsedLeaderboardPlayer) ? "You" : collapsedLeaderboardPlayer.name}
                            </span>
                            <span class="topbar-badge__value font-hud-data">
                                {collapsedLeaderboardPlayer.totalShips ?? 0}
                            </span>
                        </span>
                    {:else}
                        <span>Leaderboard</span>
                    {/if}
                    <HudIcon name={leaderboardCollapsed ? "chevron-down" : "chevron-up"} size={15} />
                </button>
            {/if}
        </div>
    </div>
</div>

<style>
    .game-hud-topbar {
        height: var(--pax-ui-topbar-height);
        display: grid;
        grid-template-columns: auto minmax(360px, 1fr) minmax(0, 420px) auto;
        align-items: stretch;
        gap: 14px;
        min-width: 0;
        padding: 8px 12px;
        border-bottom: 1px solid var(--pax-ui-divider);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 98%, transparent), color-mix(in srgb, var(--pax-color-void) 90%, transparent)),
            radial-gradient(circle at top left, color-mix(in srgb, var(--pax-ui-accent-warm) 12%, transparent), transparent 32%),
            radial-gradient(circle at top right, color-mix(in srgb, var(--pax-ui-accent) 12%, transparent), transparent 40%);
        backdrop-filter: blur(20px);
        box-shadow: var(--pax-ui-shadow-soft);
        overflow: hidden;
    }

    .topbar-brand,
    .topbar-meta,
    .topbar-status,
    .topbar-actions,
    .topbar-kpis,
    .topbar-chip,
    .topbar-icon-button,
    .brand-mark,
    .topbar-badge,
    .topbar-kpi {
        display: flex;
        align-items: center;
        min-width: 0;
    }

    .topbar-brand {
        gap: 10px;
        padding-right: 8px;
    }

    .topbar-icon-button,
    .topbar-chip,
    .mode-shortcut {
        border: 1px solid var(--pax-ui-border);
        background: color-mix(in srgb, var(--pax-color-void) 82%, transparent);
        color: var(--pax-ui-text);
        cursor: pointer;
        transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;
    }

    .topbar-icon-button:hover,
    .topbar-chip:hover,
    .mode-shortcut:hover {
        transform: translateY(-1px);
        border-color: var(--pax-ui-border-strong);
        background: color-mix(in srgb, var(--pax-color-void) 94%, transparent);
        color: var(--pax-ui-text-strong);
        box-shadow: var(--pax-ui-glow);
    }

    .topbar-icon-button {
        width: 46px;
        height: 46px;
        justify-content: center;
        border-radius: 13px;
    }

    .brand-mark {
        width: 30px;
        height: 30px;
        justify-content: center;
        color: var(--pax-ui-accent-warm);
        filter: drop-shadow(0 0 12px color-mix(in srgb, var(--pax-ui-accent-warm) 42%, transparent));
    }

    .brand-wordmark {
        color: var(--pax-ui-text-strong);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-md);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.16em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .topbar-meta {
        display: grid;
        grid-template-columns: repeat(5, minmax(92px, 1fr));
        min-width: 0;
        border-left: 1px solid var(--pax-ui-divider);
        border-right: 1px solid var(--pax-ui-divider);
    }

    .topbar-meta-item {
        min-width: 0;
        display: grid;
        align-content: center;
        gap: 2px;
        padding: 0 14px;
        border-right: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 13%, transparent);
    }

    .topbar-meta-item:last-child {
        border-right: none;
    }

    .topbar-meta-item__label,
    .topbar-kpi__label {
        color: var(--pax-ui-text-dim);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-4xs);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.14em;
        line-height: 1;
        text-transform: uppercase;
    }

    .topbar-meta-item__value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--pax-ui-text-strong);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-semibold);
        letter-spacing: 0.02em;
    }

    .topbar-modes {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-width: 0;
        overflow: hidden;
    }

    .mode-shortcut {
        position: relative;
        min-width: 76px;
        padding: 6px 9px 7px;
        border-radius: 10px;
        text-align: left;
        overflow: hidden;
        font-family: var(--pax-ui-font-ui);
    }

    .mode-shortcut::before {
        content: "";
        position: absolute;
        inset: 0;
        opacity: 0.88;
    }

    .mode-shortcut > span {
        position: relative;
        z-index: 1;
        display: block;
    }

    .mode-shortcut__short {
        color: var(--pax-ui-text-strong);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.16em;
        text-transform: uppercase;
    }

    .mode-shortcut__label {
        margin-top: 2px;
        color: color-mix(in srgb, var(--pax-ui-text) 86%, transparent);
        font-size: var(--pax-type-4xs);
        white-space: nowrap;
    }

    .mode-shortcut[data-appearance="pvv4"]::before {
        background: radial-gradient(circle at 18% 22%, rgba(125, 211, 252, 0.28), transparent 44%), linear-gradient(135deg, rgba(30, 64, 175, 0.88), rgba(15, 23, 42, 0.9));
    }

    .mode-shortcut[data-appearance="perimeter"]::before {
        background: radial-gradient(circle at 82% 24%, rgba(45, 212, 191, 0.28), transparent 38%), linear-gradient(135deg, rgba(13, 148, 136, 0.88), rgba(15, 23, 42, 0.9));
    }

    .mode-shortcut[data-appearance="metaball"]::before {
        background: radial-gradient(circle at 22% 76%, rgba(251, 191, 36, 0.28), transparent 38%), linear-gradient(135deg, rgba(180, 83, 9, 0.86), rgba(30, 41, 59, 0.9));
    }

    .mode-shortcut[data-appearance="grid"]::before {
        background: linear-gradient(90deg, rgba(34, 197, 94, 0.12) 1px, transparent 1px), linear-gradient(rgba(34, 197, 94, 0.12) 1px, transparent 1px), linear-gradient(135deg, rgba(22, 101, 52, 0.92), rgba(15, 23, 42, 0.9));
        background-size: 8px 8px, 8px 8px, auto;
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
        border-color: var(--pax-ui-border-warm);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pax-ui-accent-warm) 18%, transparent);
    }

    .topbar-status {
        justify-content: flex-end;
        gap: 10px;
    }

    .topbar-kpis {
        height: 46px;
        gap: 9px;
        padding: 0 10px;
        border: 1px solid color-mix(in srgb, var(--pax-ui-accent) 14%, transparent);
        border-radius: 14px;
        background: color-mix(in srgb, var(--pax-color-void) 76%, transparent);
    }

    .topbar-kpi {
        gap: 6px;
        color: var(--pax-ui-accent);
        white-space: nowrap;
    }

    .topbar-kpi__value {
        color: var(--pax-ui-text-strong);
        font-size: var(--pax-type-xs-plus);
    }

    .topbar-actions {
        gap: 8px;
    }

    .topbar-chip {
        height: 46px;
        justify-content: center;
        gap: 8px;
        max-width: 220px;
        padding: 0 12px;
        border-radius: 14px;
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-xs);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
        text-decoration: none;
    }

    .topbar-chip--active {
        border-color: var(--pax-ui-border-strong);
        background: var(--pax-ui-button-bg-active);
        color: var(--pax-ui-text-strong);
    }

    .topbar-chip--leaderboard {
        min-width: 148px;
    }

    .topbar-chip--badge {
        min-width: 188px;
    }

    .topbar-badge {
        gap: 7px;
        min-width: 0;
    }

    .topbar-badge__dot {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--pax-ui-text-strong) 4%, transparent);
    }

    .topbar-badge__name {
        max-width: 92px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .topbar-badge__value {
        color: var(--pax-ui-text-strong);
        font-size: var(--pax-type-xs);
    }

    @media (max-width: 1540px) {
        .game-hud-topbar { grid-template-columns: auto minmax(320px, 1fr) auto; }
        .topbar-modes { display: none; }
    }

    @media (max-width: 1260px) {
        .game-hud-topbar { grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; }
        .topbar-meta { grid-template-columns: repeat(3, minmax(84px, 1fr)); }
        .topbar-meta-item:nth-child(1), .topbar-meta-item:nth-child(3), .topbar-kpis { display: none; }
    }

    @media (max-width: 1024px) {
        .game-hud-topbar { display: none; }
    }
</style>
