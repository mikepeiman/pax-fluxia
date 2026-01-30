<script lang="ts">
    import type { PlayerState } from "$lib/types/game.types";

    interface Props {
        players: PlayerState[];
    }

    let { players = [] }: Props = $props();
</script>

<div class="leaderboard glass-panel">
    <h3 class="leaderboard__title font-display">Commanders</h3>

    <ul class="leaderboard__list">
        {#each players as player, index}
            <li class="leaderboard__item">
                <span
                    class="player-dot"
                    style="background-color: {player.color}"
                ></span>
                <span class="player-name">{player.name}</span>
                <span class="player-stats font-data">
                    {player.totalShips} / {player.starCount}⭐
                </span>
            </li>
        {:else}
            <li class="leaderboard__empty">No players</li>
        {/each}
    </ul>
</div>

<style>
    .leaderboard {
        padding: var(--space-4);
        min-width: 200px;
    }

    .leaderboard__title {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        margin-bottom: var(--space-3);
        letter-spacing: 0.15em;
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

    .leaderboard__item:first-child {
        background: rgba(0, 255, 255, 0.05);
        border: 1px solid rgba(0, 255, 255, 0.2);
    }

    .player-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
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
</style>
