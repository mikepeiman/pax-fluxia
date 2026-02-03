<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";

    // Get winner info
    const winner = $derived(gameStore.winner);
    const humanPlayer = $derived(gameStore.humanPlayer);

    // Determine if human won
    const isVictory = $derived(
        winner && humanPlayer && winner.id === humanPlayer.id,
    );

    // Get actual stats from engine
    const engineStats = $derived(gameStore.getStats());

    // Format elapsed time
    function formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }

    const elapsedTime = $derived(formatTime(engineStats.elapsedMs));
</script>

<div class="modal-backdrop">
    <div class="results-modal glass-panel glass-panel--accent animate-slide-up">
        <!-- Header -->
        <header class="results-header">
            <h1
                class="results-title font-display"
                class:victory={isVictory}
                class:defeat={!isVictory}
            >
                {isVictory ? "VICTORY" : "DEFEAT"}
            </h1>

            {#if winner}
                <p class="winner-name">
                    <span
                        class="winner-dot"
                        style="background-color: {winner.color}"
                    ></span>
                    {winner.name} conquers the galaxy
                </p>
            {/if}
        </header>

        <!-- Stats -->
        <section class="stats-grid">
            <div class="stat-item">
                <span class="stat-value font-data">{elapsedTime}</span>
                <span class="stat-label">Time Elapsed</span>
            </div>
            <div class="stat-item">
                <span class="stat-value font-data"
                    >{engineStats.totalTicks}</span
                >
                <span class="stat-label">Total Ticks</span>
            </div>
            <div class="stat-item">
                <span class="stat-value font-data"
                    >{engineStats.peakFleetSize.toLocaleString()}</span
                >
                <span class="stat-label">Peak Fleet</span>
            </div>
            <div class="stat-item">
                <span class="stat-value font-data"
                    >{engineStats.starsCaptured}</span
                >
                <span class="stat-label">Stars Captured</span>
            </div>
        </section>

        <!-- Actions -->
        <section class="results-actions">
            <button
                class="btn btn--primary btn--lg"
                onclick={() => gameStore.playAgain()}
            >
                Play Again
            </button>
            <button
                class="btn btn--secondary"
                onclick={() => gameStore.returnToMenu()}
            >
                Main Menu
            </button>
        </section>
    </div>
</div>

<style>
    .results-modal {
        width: 100%;
        max-width: 400px;
        padding: var(--space-8);
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
        text-align: center;
    }

    .results-header {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .results-title {
        font-size: var(--text-3xl);
        letter-spacing: 0.1em;
    }

    .results-title.victory {
        color: var(--color-accent-green);
        text-shadow: 0 0 30px var(--color-accent-green);
    }

    .results-title.defeat {
        color: var(--color-accent-red);
        text-shadow: 0 0 30px var(--color-accent-red);
    }

    .winner-name {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        color: var(--color-text-muted);
        font-size: var(--text-sm);
    }

    .winner-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-4);
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-3);
        background: rgba(255, 255, 255, 0.02);
        border-radius: var(--radius-md);
    }

    .stat-value {
        font-size: var(--text-xl);
        color: var(--color-accent-cyan);
    }

    .stat-label {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .results-actions {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        margin-top: var(--space-4);
    }
</style>
