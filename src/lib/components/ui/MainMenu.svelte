<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import type { AILevel } from "$lib/types/game.types";

    // Local form state bound to settings
    let map = $state(gameStore.settings.map);
    let playerCount = $state(gameStore.settings.playerCount);
    let difficulty = $state<AILevel>(gameStore.settings.difficulty);

    const playerCounts = [2, 3, 4, 5, 6] as const;
    const difficulties: AILevel[] = ["easy", "normal", "hard", "expert"];

    function handleStart() {
        gameStore.updateSettings({ map, playerCount, difficulty });
        gameStore.startGame();
    }

    function handleMultiplayer() {
        console.log("Connecting to lobby...");
    }

    function handleMapEditor() {
        console.log("Opening Editor...");
    }

    function handleSettings() {
        console.log("Audio/Video Settings");
    }
</script>

<div class="menu-container">
    <div class="menu-card glass-panel glass-panel--accent animate-slide-up">
        <!-- Title -->
        <header class="menu-header">
            <h1 class="title font-display animate-glow">PAX FLUXIA</h1>
            <p class="subtitle">Territory Control Strategy</p>
        </header>

        <!-- Game Setup -->
        <section class="setup-section">
            <!-- Map Selector -->
            <div class="form-group">
                <label class="form-label" for="map-select">Map</label>
                <select id="map-select" class="select w-full" bind:value={map}>
                    <option value="empire">Empire (Standard)</option>
                    <option value="random" disabled
                        >Random Cluster (Coming Soon)</option
                    >
                </select>
            </div>

            <!-- Player Count -->
            <fieldset class="form-group">
                <legend class="form-label">Players</legend>
                <div class="segmented">
                    {#each playerCounts as count}
                        <button
                            class="segmented__btn"
                            class:segmented__btn--active={playerCount === count}
                            onclick={() => (playerCount = count)}
                        >
                            {count}
                        </button>
                    {/each}
                </div>
            </fieldset>

            <!-- Difficulty -->
            <fieldset class="form-group">
                <legend class="form-label">AI Difficulty</legend>
                <div class="segmented">
                    {#each difficulties as level}
                        <button
                            class="segmented__btn"
                            class:segmented__btn--active={difficulty === level}
                            onclick={() => (difficulty = level)}
                        >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                    {/each}
                </div>
            </fieldset>
        </section>

        <!-- Action Buttons -->
        <section class="actions-section">
            <button
                class="btn btn--primary btn--lg btn--pulse w-full"
                onclick={handleStart}
            >
                Start Game
            </button>

            <div class="secondary-actions">
                <button class="btn btn--secondary" onclick={handleMultiplayer}>
                    Multiplayer
                </button>
                <button class="btn btn--ghost" onclick={handleMapEditor}>
                    Map Editor
                </button>
                <button class="btn btn--ghost" onclick={handleSettings}>
                    ⚙️
                </button>
            </div>
        </section>
    </div>
</div>

<style>
    .menu-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: var(--space-4);
        background: radial-gradient(
                ellipse at center,
                rgba(0, 255, 255, 0.05) 0%,
                transparent 70%
            ),
            var(--color-void-deep);
    }

    .menu-card {
        width: 100%;
        max-width: 420px;
        padding: var(--space-8);
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .menu-header {
        text-align: center;
    }

    .title {
        font-size: var(--text-3xl);
        color: var(--color-accent-cyan);
        margin-bottom: var(--space-2);
    }

    .subtitle {
        color: var(--color-text-muted);
        font-size: var(--text-sm);
        text-transform: uppercase;
        letter-spacing: 0.2em;
    }

    .setup-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .form-label {
        font-size: var(--text-sm);
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .actions-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        margin-top: var(--space-4);
    }

    .secondary-actions {
        display: flex;
        gap: var(--space-2);
        justify-content: center;
    }
</style>
