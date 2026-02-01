<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { fade, fly } from "svelte/transition";

    let visible = $state(true);

    // Config State
    let mapType = $state("Empire (Standard)");
    let playerCount = $state(2);
    let difficulty = $state("Normal");
    let starsPerPlayer = $state(GAME_CONFIG.STARS_PER_PLAYER);

    // Constants
    const PLAYERS = [2, 3, 4, 5, 6];
    const DIFFICULTIES = ["Easy", "Normal", "Hard", "Expert"];

    function startGame() {
        // Apply Config
        GAME_CONFIG.STARS_PER_PLAYER = starsPerPlayer;
        gameStore.updateSettings({ playerCount });

        // Restart Engine
        gameStore.restart();
        visible = false;
    }
</script>

{#if visible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="main-menu-overlay" transition:fade>
        <div class="menu-chrome" transition:fly={{ y: 20, duration: 400 }}>
            <div class="glow-border"></div>

            <h1 class="title">
                <span class="pax">PAX</span>
                <span class="fluxia">FLUXIA</span>
            </h1>
            <div class="subtitle">TERRITORY CONTROL STRATEGY</div>

            <div class="controls-grid">
                <!-- Map Selection -->
                <div class="control-group">
                    <label>MAP</label>
                    <div class="select-box">
                        {mapType}
                    </div>
                </div>

                <!-- Player Count -->
                <div class="control-group">
                    <label>PLAYERS</label>
                    <div class="button-row">
                        {#each PLAYERS as p}
                            <button
                                class:active={playerCount === p}
                                onclick={() => (playerCount = p)}>{p}</button
                            >
                        {/each}
                    </div>
                </div>

                <!-- AI Difficulty -->
                <div class="control-group">
                    <label>AI DIFFICULTY</label>
                    <div class="button-row">
                        {#each DIFFICULTIES as d}
                            <button
                                class:active={difficulty === d}
                                onclick={() => (difficulty = d)}>{d}</button
                            >
                        {/each}
                    </div>
                </div>

                <!-- Game Config (New Features) -->
                <div class="control-group config-row">
                    <div class="config-item">
                        <label>STARS / PLAYER</label>
                        <div class="slider-container">
                            <input
                                type="range"
                                min="1"
                                max="10"
                                bind:value={starsPerPlayer}
                            />
                            <span class="value">{starsPerPlayer}</span>
                        </div>
                    </div>
                    <!-- Future: Ships per Star -->
                </div>

                <div class="action-area">
                    <button class="start-btn" onclick={startGame}>
                        START GAME
                    </button>

                    <div class="bottom-row">
                        <button class="secondary-btn">MULTIPLAYER</button>
                        <button class="secondary-btn">MAP EDITOR</button>
                        <button class="icon-btn">⚙️</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    :global(body) {
        margin: 0;
        background: #050510;
        overflow: hidden;
    }

    .main-menu-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #050510;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: "Orbitron", sans-serif;
    }

    .menu-chrome {
        position: relative;
        width: 450px;
        background: rgba(10, 15, 30, 0.95);
        border: 1px solid #4488ff;
        border-radius: 12px;
        padding: 40px;
        box-shadow: 0 0 50px rgba(68, 136, 255, 0.15);
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .glow-border {
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border-radius: 14px;
        border: 2px solid transparent;
        box-shadow: 0 0 15px #00ffff;
        opacity: 0.3;
        pointer-events: none;
        z-index: -1;
    }

    .title {
        text-align: center;
        font-size: 3rem;
        margin: 0;
        line-height: 1.1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
    }

    .pax {
        color: #00ffff;
        letter-spacing: 4px;
    }
    .fluxia {
        color: #00ffff;
        letter-spacing: 8px;
        font-weight: 900;
    }

    .subtitle {
        text-align: center;
        color: #667799;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.7rem;
        letter-spacing: 3px;
        margin-top: -10px;
        margin-bottom: 20px;
    }

    .control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    label {
        font-size: 0.7rem;
        color: #8899aa;
        letter-spacing: 1px;
    }

    .select-box {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid #334466;
        padding: 10px;
        border-radius: 4px;
        color: #fff;
        font-family: "Inter", sans-serif;
        font-size: 0.9rem;
        cursor: default;
    }

    .button-row {
        display: flex;
        border: 1px solid #334466;
        border-radius: 4px;
        overflow: hidden;
    }

    .button-row button {
        flex: 1;
        background: transparent;
        border: none;
        color: #667799;
        padding: 8px;
        cursor: pointer;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8rem;
        transition: all 0.2s;
        border-right: 1px solid #334466;
    }

    .button-row button:last-child {
        border-right: none;
    }

    .button-row button:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
    }

    .button-row button.active {
        background: #00ffff;
        color: #000;
        font-weight: bold;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
    }

    /* Config Sliders */
    .config-row {
        margin-top: 10px;
        padding-top: 20px;
        border-top: 1px solid #1a2a40;
    }

    .slider-container {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    input[type="range"] {
        flex: 1;
        accent-color: #00ffff;
        height: 6px;
        background: #223355;
        border-radius: 3px;
        appearance: none;
    }

    input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px #00ffff;
    }

    .value {
        color: #00ffff;
        font-family: "JetBrains Mono", monospace;
        width: 24px;
        text-align: right;
    }

    /* Action Area */
    .action-area {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .start-btn {
        background: linear-gradient(180deg, #00cccc, #0088aa);
        border: none;
        padding: 16px;
        color: #000;
        font-family: "Orbitron", sans-serif;
        font-size: 1.2rem;
        font-weight: 900;
        letter-spacing: 2px;
        cursor: pointer;
        border-radius: 6px;
        box-shadow: 0 0 20px rgba(0, 204, 204, 0.3);
        transition:
            transform 0.1s,
            box-shadow 0.1s;
    }

    .start-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 30px rgba(0, 204, 204, 0.5);
    }

    .start-btn:active {
        transform: translateY(1px);
    }

    .bottom-row {
        display: flex;
        gap: 10px;
    }

    .secondary-btn {
        flex: 2;
        background: transparent;
        border: 1px solid #00aaaa;
        color: #00aaaa;
        padding: 10px;
        font-family: "Orbitron", sans-serif;
        font-size: 0.8rem;
        letter-spacing: 1px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .secondary-btn:hover {
        background: rgba(0, 170, 170, 0.1);
        color: #00ffff;
        border-color: #00ffff;
    }

    .icon-btn {
        flex: 1;
        background: #111;
        border: 1px solid #333;
        color: #666;
        cursor: pointer;
        border-radius: 4px;
    }
</style>
