<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";

    let visible = $state(true);
    let starsPerPlayer = $state(GAME_CONFIG.STARS_PER_PLAYER);
    // let shipsPerStar = $state(10);

    function startGame() {
        GAME_CONFIG.STARS_PER_PLAYER = starsPerPlayer;

        // Trigger Restart
        gameStore.restart();
        visible = false;
    }
</script>

{#if visible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="main-menu-overlay">
        <div class="menu-panel">
            <h1>PAX FLUXIA</h1>

            <div class="control-group">
                <label for="stars">Stars Per Player</label>
                <input
                    type="range"
                    id="stars"
                    min="1"
                    max="10"
                    bind:value={starsPerPlayer}
                />
                <span>{starsPerPlayer}</span>
            </div>

            <button class="start-btn" onclick={startGame}>START NEW GAME</button
            >
            <button class="resume-btn" onclick={() => (visible = false)}
                >RESUME</button
            >
        </div>
    </div>
{/if}

<style>
    .main-menu-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(10, 10, 18, 0.85);
        backdrop-filter: blur(10px);
        z-index: 2000; /* Above HUD */
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-family: "JetBrains Mono", monospace;
    }

    .menu-panel {
        background: rgba(30, 30, 40, 0.9);
        padding: 40px;
        border: 2px solid #4488ff;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 0 30px rgba(68, 136, 255, 0.2);
    }

    h1 {
        font-size: 3rem;
        margin-bottom: 40px;
        letter-spacing: 4px;
        text-shadow: 0 0 10px #4488ff;
    }

    .control-group {
        margin-bottom: 25px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
    }

    label {
        font-size: 1.2rem;
    }

    input[type="range"] {
        width: 200px;
        accent-color: #4488ff;
    }

    button {
        display: block;
        width: 100%;
        padding: 15px;
        margin-top: 10px;
        font-size: 1.2rem;
        font-weight: bold;
        cursor: pointer;
        border: none;
        border-radius: 4px;
        transition: all 0.2s;
        font-family: inherit;
    }

    .start-btn {
        background: #4488ff;
        color: #000;
        margin-bottom: 10px;
    }

    .start-btn:hover {
        background: #6699ff;
        transform: scale(1.02);
    }

    .resume-btn {
        background: transparent;
        color: #888;
        border: 1px solid #444;
    }

    .resume-btn:hover {
        color: #fff;
        border-color: #fff;
    }
</style>
