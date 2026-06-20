<script lang="ts">
    import { browser } from "$app/environment";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import type { PlayerState } from "$lib/types/game.types";
    import HudIcon from "./HudIcon.svelte";

    interface Props {
        players: PlayerState[];
        dockSide?: "left" | "right";
        onToggleDockSide?: () => void;
        onCollapse?: () => void;
    }

    type ShipFocus = "active" | "total";

    let {
        players = [],
        dockSide = "right",
        onToggleDockSide,
        onCollapse,
    }: Props = $props();

    const FOCUS_KEY = "pax-leaderboard-ship-focus";

    let shipFocus = $state<ShipFocus>(
        browser && localStorage.getItem(FOCUS_KEY) === "active"
            ? "active"
            : "total",
    );

    function setShipFocus(nextFocus: ShipFocus) {
        shipFocus = nextFocus;
        if (browser) {
            localStorage.setItem(FOCUS_KEY, nextFocus);
        }
    }

    function isLocalPlayer(player: PlayerState): boolean {
        const localId = activeGameStore.localPlayerId;
        return player.id === localId || (player as any).sessionId === localId;
    }

    function getActiveShips(player: PlayerState): number {
        return player.activeShips ?? 0;
    }

    function getDamagedShips(player: PlayerState): number {
        return player.damagedShips ?? 0;
    }

    function getTotalShips(player: PlayerState): number {
        return player.totalShips ?? getActiveShips(player) + getDamagedShips(player);
    }

    function getSortValue(player: PlayerState): number {
        return shipFocus === "active"
            ? getActiveShips(player)
            : getTotalShips(player);
    }

    function formatProduction(value: number | undefined): string {
        const numeric = value ?? 0;
        const rounded = Math.round(numeric * 100) / 100;
        return Number.isInteger(rounded)
            ? `${rounded}`
            : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    }

    const sortedPlayers = $derived(
        [...players].sort((a, b) => {
            const focusDelta = getSortValue(b) - getSortValue(a);
            if (focusDelta !== 0) return focusDelta;
            return getTotalShips(b) - getTotalShips(a);
        }),
    );

    const gameTotals = $derived.by(() => {
        let active = 0;
        let damaged = 0;
        for (const player of players) {
            active += getActiveShips(player);
            damaged += getDamagedShips(player);
        }
        return {
            active,
            damaged,
            total: active + damaged,
        };
    });

    const primaryLabel = $derived(shipFocus === "active" ? "Active" : "Total");
    const primaryTotal = $derived(
        shipFocus === "active" ? gameTotals.active : gameTotals.total,
    );

    const tickDurationMs = $derived(activeGameStore.effectiveTickMs ?? 1000);
    const tickKey = $derived(activeGameStore.currentTick ?? 0);
    const isRunning = $derived(
        !activeGameStore.isPaused && activeGameStore.currentTick > 0,
    );
</script>

<section class="leaderboard">
    <div class="leaderboard__header">
        <div class="leaderboard__title-block">
            <span class="leaderboard__eyebrow">Command</span>
            <h3 class="leaderboard__title">Leaderboard</h3>
        </div>

        <div class="leaderboard__actions">
            <div class="leaderboard__focus-toggle" role="group" aria-label="Ship emphasis">
                <button
                    type="button"
                    class="focus-pill"
                    class:focus-pill--active={shipFocus === "active"}
                    onclick={() => setShipFocus("active")}
                    title="Emphasize active ships"
                >
                    <HudIcon name="focus" size={13} />
                    <span>Active</span>
                </button>
                <button
                    type="button"
                    class="focus-pill"
                    class:focus-pill--active={shipFocus === "total"}
                    onclick={() => setShipFocus("total")}
                    title="Emphasize total ships"
                >
                    <HudIcon name="total-focus" size={13} />
                    <span>Total</span>
                </button>
            </div>

            {#if onToggleDockSide}
                <button
                    type="button"
                    class="leaderboard__icon-btn"
                    onclick={onToggleDockSide}
                    title={dockSide === "right"
                        ? "Move leaderboard to left side"
                        : "Move leaderboard to right side"}
                >
                    <HudIcon name={dockSide === "right" ? "dock-left" : "dock-right"} size={15} />
                </button>
            {/if}

            {#if onCollapse}
                <button
                    type="button"
                    class="leaderboard__icon-btn"
                    onclick={onCollapse}
                    title="Collapse leaderboard to compact badge"
                >
                    <HudIcon name="chevron-up" size={15} />
                </button>
            {/if}
        </div>
    </div>

    <div class="leaderboard__summary">
        <div class="summary-chip">
            <span class="summary-chip__label">Ships</span>
            <span class="summary-chip__value font-hud-data">{primaryTotal}</span>
            <span class="summary-chip__meta">Focus: {primaryLabel}</span>
        </div>
        <div class="summary-chip summary-chip--tick">
            <span class="summary-chip__label">Tick</span>
            <span class="summary-chip__value font-hud-data">{activeGameStore.currentTick}</span>
            <span class="summary-chip__meta">Live cycle</span>
        </div>
    </div>

    {#key tickKey}
        <div class="tick-progress-bar">
            <div
                class="tick-progress-fill"
                class:running={isRunning}
                style={`animation-duration:${tickDurationMs}ms;`}
            ></div>
        </div>
    {/key}

    <div class="leaderboard__columns font-hud-data">
        <span class="leaderboard__col leaderboard__col--name">Commander</span>
        <span class="leaderboard__col leaderboard__col--primary">{primaryLabel}</span>
        <span class="leaderboard__col leaderboard__col--detail">
            <HudIcon name="ship-active" size={12} />
            <HudIcon name="ship-damaged" size={12} />
        </span>
        <span class="leaderboard__col leaderboard__col--stars">Stars</span>
        <span class="leaderboard__col leaderboard__col--prod">Prod</span>
    </div>

    <ul class="leaderboard__list">
        {#each sortedPlayers as player}
            {@const activeShips = getActiveShips(player)}
            {@const damagedShips = getDamagedShips(player)}
            {@const totalShips = getTotalShips(player)}
            {@const primaryShips = shipFocus === "active" ? activeShips : totalShips}

            <li class="leaderboard__item" class:is-self={isLocalPlayer(player)}>
                <span
                    class="player-dot"
                    class:player-dot--self={isLocalPlayer(player)}
                    style={`background-color:${player.color};`}
                ></span>
                <span class="player-name" class:player-name--self={isLocalPlayer(player)}>
                    {isLocalPlayer(player) ? "You" : player.name}
                </span>
                <span class="stat stat-primary font-hud-data" title={`${primaryLabel} ships`}>
                    {primaryShips}
                </span>
                <span class="stat stat-detail font-hud-data" title="Active / Damaged ships">
                    <span class="stat-detail__active">{activeShips}</span>
                    <span class="stat-detail__slash">/</span>
                    <span class="stat-detail__damaged">{damagedShips}</span>
                </span>
                <span class="stat stat-stars font-hud-data" title="Stars owned">
                    {player.starCount ?? 0}
                </span>
                <span class="stat stat-prod font-hud-data" title="Production per tick">
                    +{formatProduction(player.production)}
                </span>
            </li>
        {:else}
            <li class="leaderboard__empty">No players</li>
        {/each}
    </ul>
</section>

<style>
    .leaderboard {
        display: grid;
        gap: var(--pax-space-3);
        min-width: 0;
        padding: var(--pax-ui-pad-md);
        border: 1px solid var(--pax-ui-border);
        border-radius: var(--pax-ui-radius-md);
        background: var(--pax-ui-panel-bg);
        box-shadow: var(--pax-ui-shadow-soft);
    }

    .leaderboard__header,
    .leaderboard__actions,
    .leaderboard__summary,
    .summary-chip,
    .leaderboard__focus-toggle,
    .leaderboard__item,
    .leaderboard__columns,
    .leaderboard__col--detail,
    .stat-detail {
        display: flex;
        align-items: center;
    }

    .leaderboard__header {
        justify-content: space-between;
        gap: var(--pax-space-3);
    }

    .leaderboard__title-block {
        display: grid;
        gap: 2px;
    }

    .leaderboard__eyebrow {
        color: var(--pax-ui-accent);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-4xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.18em;
        text-transform: uppercase;
    }

    .leaderboard__title {
        margin: 0;
        color: var(--pax-ui-text-strong);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-sm-plus);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .leaderboard__actions {
        gap: var(--pax-space-2);
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .leaderboard__icon-btn,
    .focus-pill {
        min-height: 34px;
        border-radius: 12px;
        border: 1px solid var(--pax-ui-border);
        background: var(--pax-ui-button-bg);
        color: var(--pax-ui-text);
        cursor: pointer;
        transition:
            border-color 0.16s ease,
            background 0.16s ease,
            color 0.16s ease,
            transform 0.16s ease;
    }

    .leaderboard__icon-btn:hover,
    .focus-pill:hover {
        border-color: var(--pax-ui-border-strong);
        background: var(--pax-ui-button-bg-hover);
        color: var(--pax-ui-text-strong);
        transform: translateY(-1px);
    }

    .leaderboard__icon-btn {
        width: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }

    .leaderboard__focus-toggle {
        gap: var(--pax-gap-xs);
        padding: var(--pax-space-1);
        border: 1px solid rgba(112, 142, 186, 0.16);
        border-radius: 14px;
        background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    }

    .focus-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0 var(--pax-space-3);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-label);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .focus-pill--active {
        border-color: var(--pax-ui-border-warm);
        color: var(--pax-ui-accent-warm);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pax-ui-accent-warm) 14%, transparent);
    }

    .leaderboard__summary {
        gap: var(--pax-gap-sm);
    }

    .summary-chip {
        flex: 1 1 0;
        justify-content: space-between;
        gap: var(--pax-gap-sm);
        min-height: 58px;
        padding: 0 var(--pax-gap-md);
        border-radius: var(--pax-ui-radius-sm);
        border: 1px solid rgba(112, 142, 186, 0.14);
        background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    }

    .summary-chip__label,
    .summary-chip__meta {
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }

    .summary-chip__label {
        color: var(--pax-ui-text-soft);
    }

    .summary-chip__value {
        color: var(--pax-ui-text-strong);
        font-size: var(--pax-type-base);
    }

    .summary-chip__meta {
        color: var(--pax-ui-accent);
        text-align: right;
    }

    .summary-chip--tick .summary-chip__meta {
        color: var(--pax-ui-text-soft);
    }

    .tick-progress-bar {
        height: 4px;
        overflow: hidden;
        border-radius: 999px;
        background: color-mix(in srgb, var(--pax-ui-accent) 8%, transparent);
    }

    .tick-progress-fill {
        height: 100%;
        width: 100%;
        transform-origin: left center;
        background: linear-gradient(90deg, var(--pax-ui-accent), var(--pax-ui-accent-warm));
    }

    .tick-progress-fill.running {
        animation-name: tick-progress;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
    }

    @keyframes tick-progress {
        from {
            transform: scaleX(0);
        }

        to {
            transform: scaleX(1);
        }
    }

    .leaderboard__columns {
        gap: var(--pax-gap-sm);
        padding: 0 var(--pax-gap-sm);
        color: var(--pax-ui-text-soft);
        font-size: var(--pax-type-3xs);
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    .leaderboard__col {
        min-width: 0;
    }

    .leaderboard__col--name {
        flex: 1 1 auto;
    }

    .leaderboard__col--primary,
    .leaderboard__col--detail,
    .leaderboard__col--stars,
    .leaderboard__col--prod {
        justify-content: flex-end;
    }

    .leaderboard__col--primary,
    .stat-primary {
        width: 58px;
    }

    .leaderboard__col--detail,
    .stat-detail {
        width: 74px;
        gap: var(--pax-gap-xs);
    }

    .leaderboard__col--stars,
    .stat-stars {
        width: 46px;
    }

    .leaderboard__col--prod,
    .stat-prod {
        width: 58px;
    }

    .leaderboard__list {
        display: grid;
        gap: var(--pax-gap-xs);
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .leaderboard__item {
        gap: var(--pax-gap-sm);
        min-height: 42px;
        padding: 0 var(--pax-gap-sm);
        border-radius: 14px;
        border: 1px solid transparent;
        background: color-mix(in srgb, var(--pax-color-void) 82%, transparent);
        color: var(--pax-ui-text);
    }

    .leaderboard__item.is-self {
        border-color: color-mix(in srgb, var(--pax-ui-accent-warm) 24%, transparent);
        background:
            linear-gradient(180deg, rgba(28, 24, 14, 0.52), rgba(11, 14, 23, 0.82)),
            color-mix(in srgb, var(--pax-color-void) 82%, transparent);
    }

    .player-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        flex: 0 0 auto;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--pax-ui-text-strong) 4%, transparent);
    }

    .player-dot--self {
        box-shadow:
            0 0 0 3px color-mix(in srgb, var(--pax-ui-accent-warm) 8%, transparent),
            0 0 0 1px color-mix(in srgb, var(--pax-ui-accent-warm) 42%, transparent);
    }

    .player-name {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.03em;
        color: var(--pax-ui-text-strong);
    }

    .player-name--self {
        color: var(--pax-ui-accent-warm);
    }

    .stat {
        display: inline-flex;
        justify-content: flex-end;
        color: var(--pax-ui-text-strong);
        font-size: var(--pax-type-xs);
    }

    .stat-detail__active {
        color: var(--pax-ui-text-strong);
    }

    .stat-detail__slash {
        color: var(--pax-ui-text-dim);
    }

    .stat-detail__damaged {
        color: var(--pax-ui-text-soft);
    }

    .leaderboard__empty {
        padding: var(--pax-space-4);
        border-radius: var(--pax-ui-radius-sm);
        border: 1px dashed rgba(112, 142, 186, 0.24);
        color: var(--pax-ui-text-soft);
        text-align: center;
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-xs-plus);
    }

    @media (max-width: 1100px) {
        .leaderboard__summary {
            grid-template-columns: 1fr;
            display: grid;
        }
    }
</style>
