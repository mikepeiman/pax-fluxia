<script lang="ts">
    import type { PlayerState } from "$lib/types/game.types";
    import { browser } from "$app/environment";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";

    interface Props {
        players: PlayerState[];
    }

    let { players = [] }: Props = $props();

    // Collapsible state with localStorage persistence
    const LS_KEY = "pax-leaderboard-collapsed";
    let isCollapsed = $state(
        browser ? localStorage.getItem(LS_KEY) === "true" : false,
    );

    function toggleCollapsed() {
        isCollapsed = !isCollapsed;
        if (browser) {
            localStorage.setItem(LS_KEY, String(isCollapsed));
        }
    }

    // Check if player is the local player (works for single and multiplayer)
    function isLocalPlayer(player: PlayerState): boolean {
        const localId = activeGameStore.localPlayerId;
        // In SP, localId matches player.id. In MP, localId is sessionId.
        return player.id === localId || (player as any).sessionId === localId;
    }

    // Derived to ensure reactivity with updated player data
    const sortedPlayers = $derived(
        [...players].sort((a, b) => (b.totalShips ?? 0) - (a.totalShips ?? 0)),
    );

    // Game-wide totals
    const gameTotals = $derived.by(() => {
        let active = 0,
            damaged = 0;
        for (const p of players) {
            active += p.activeShips ?? 0;
            damaged += p.damagedShips ?? 0;
        }
        return { active, damaged, total: active + damaged };
    });
</script>

<div class="leaderboard glass-panel">
    <button class="leaderboard__header" onclick={toggleCollapsed}>
        <h3 class="leaderboard__title font-display">Commanders</h3>
        <span class="collapse-icon">{isCollapsed ? "▶" : "▼"}</span>
    </button>

    {#if !isCollapsed}
        <!-- Game-wide totals row -->
        <div class="game-totals font-data">
            <span class="totals-label">Ships:</span>
            <span class="totals-total">{gameTotals.total}</span>
            <span class="totals-breakdown">
                <span class="totals-active">{gameTotals.active}</span><span
                    class="stat-dim">/{gameTotals.damaged}</span
                >
            </span>
        </div>
        <div class="tick-counter font-data">
            <span class="tick-label">Tick</span>
            <span class="tick-value">{activeGameStore.currentTick}</span>
        </div>

        <ul class="leaderboard__list">
            {#each sortedPlayers as player, index}
                {@const totalShips =
                    (player.activeShips ?? 0) + (player.damagedShips ?? 0)}
                <li
                    class="leaderboard__item"
                    class:is-self={isLocalPlayer(player)}
                >
                    <span
                        class="player-dot"
                        class:player-dot--self={isLocalPlayer(player)}
                        style="background-color: {player.color}"
                    ></span>
                    <span
                        class="player-name"
                        class:player-name--self={isLocalPlayer(player)}
                    >
                        {isLocalPlayer(player) ? "★ " : ""}{player.name}
                    </span>
                    <span class="player-stats font-data">
                        <span class="stat-total" title="Total Ships"
                            >{totalShips}</span
                        >
                        <span class="stat-breakdown" title="Active / Damaged"
                            >{player.activeShips ?? 0}<span class="stat-dim"
                                >/{player.damagedShips ?? 0}</span
                            ></span
                        >
                        <span class="stat-stars" title="Stars Owned"
                            >⭐{player.starCount ?? 0}</span
                        >
                        <span class="stat-prod" title="Production/sec"
                            >+{player.production ?? 0}</span
                        >
                    </span>
                </li>
            {:else}
                <li class="leaderboard__empty">No players</li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .leaderboard {
        padding: var(--space-4);
        min-width: 200px;
    }

    .leaderboard__title {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        margin: 0;
        letter-spacing: 0.15em;
    }

    .leaderboard__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        background: none;
        border: none;
        padding: 0;
        margin-bottom: var(--space-3);
        cursor: pointer;
        color: inherit;
    }

    .leaderboard__header:hover .collapse-icon {
        color: var(--color-accent-cyan);
    }

    .collapse-icon {
        font-size: var(--text-xs);
        color: var(--color-text-dim);
        transition: color var(--transition-fast);
    }

    .leaderboard__list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .leaderboard__item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2);
        border-radius: var(--radius-sm);
        background: rgba(255, 255, 255, 0.02);
    }

    /* First place styling (rank 1, not player identity) */
    .leaderboard__item:first-child {
        background: rgba(255, 255, 255, 0.04);
    }

    .player-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
        transition: all 0.2s ease;
    }

    /* Self (human player) visual flair */
    .is-self {
        background: rgba(68, 136, 255, 0.15);
        border: 1px solid rgba(68, 136, 255, 0.4);
        box-shadow: 0 0 8px rgba(68, 136, 255, 0.2);
    }

    .player-dot--self {
        width: 14px;
        height: 14px;
        box-shadow: 0 0 6px currentColor;
    }

    .player-name--self {
        font-weight: 600;
        color: #6af;
    }

    .player-name {
        flex: 1;
        font-size: var(--text-sm);
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .player-stats {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
    }

    .leaderboard__empty {
        font-size: var(--text-sm);
        color: var(--color-text-dim);
        text-align: center;
        padding: var(--space-4);
    }

    .stat-total {
        font-weight: 700;
        font-size: var(--text-sm);
        color: var(--color-text-primary);
        min-width: 2.5em;
        text-align: right;
    }

    .stat-breakdown {
        font-size: 0.65rem;
        opacity: 0.6;
        min-width: 3em;
    }

    .stat-dim {
        opacity: 0.5;
    }

    .stat-stars {
        min-width: 2.5em;
    }

    .stat-prod {
        color: #8f8;
        min-width: 2.5em;
    }

    .game-totals {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        margin-bottom: 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 0.7rem;
        color: var(--color-text-muted, #888);
    }
    .totals-label {
        opacity: 0.7;
    }
    .totals-total {
        font-weight: 700;
        color: var(--color-text-primary, #fff);
        font-size: 0.8rem;
    }
    .totals-active {
        color: #4ade80;
    }
    .totals-breakdown {
        font-size: 0.65rem;
        opacity: 0.7;
    }
    .tick-counter {
        display: flex;
        align-items: baseline;
        gap: 6px;
        padding: 6px 10px;
        margin-top: 2px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .tick-label {
        font-size: 0.75rem;
        color: var(--color-text-muted, #888);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }
    .tick-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-accent-cyan, #4fd1c5);
        text-shadow: 0 0 8px rgba(79, 209, 197, 0.4);
    }
</style>
