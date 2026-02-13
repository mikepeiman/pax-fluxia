<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { fade, fly } from "svelte/transition";
    import type { GameSettings } from "$lib/types/game.types";
    import MultiplayerLobby from "./MultiplayerLobby.svelte";
    import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";
    import { log } from "$lib/utils/logger";

    let visible = $state(true);
    let showMultiplayer = $state(false);

    // Watch multiplayer phase and transition to game when it starts
    $effect(() => {
        if (multiplayerStore.phase === "playing") {
            log.sys(
                "MainMenu",
                "Multiplayer game started, transitioning to game view",
            );
            visible = false;
            gameStore.setView("game");
        }
    });

    // Load from localStorage or use defaults
    function loadSetting<T>(key: string, defaultValue: T): T {
        if (typeof window === "undefined") return defaultValue;
        const stored = localStorage.getItem(`pax-fluxia-${key}`);
        if (stored) {
            try {
                return JSON.parse(stored) as T;
            } catch {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    function saveSetting(key: string, value: any) {
        if (typeof window === "undefined") return;
        localStorage.setItem(`pax-fluxia-${key}`, JSON.stringify(value));
    }

    // Config State (loaded from localStorage)
    let mapType = $state(loadSetting("mapType", "standard"));
    let playerCount = $state<GameSettings["playerCount"]>(
        loadSetting("playerCount", 6),
    );
    let difficulty = $state(loadSetting("difficulty", "Normal"));
    let starsPerPlayer = $state(loadSetting("starsPerPlayer", 5));
    let shipsPerStar = $state(loadSetting("shipsPerStar", 40));
    let minLinks = $state(loadSetting("minLinks", 1));
    let maxLinks = $state(loadSetting("maxLinks", 6));
    let starSpacing = $state(loadSetting("starSpacing", 1.0));
    let retainOrderOnConquest = $state(
        loadSetting("retainOrderOnConquest", true),
    );

    // Constants
    const MAP_DEFS: {
        id: string;
        label: string;
        mapType: "standard" | "debug" | "debug-b";
        stars: { x: number; y: number; color: string }[];
        connections: [number, number][];
    }[] = [
        {
            id: "standard",
            label: "STANDARD",
            mapType: "standard",
            stars: [
                { x: 15, y: 12, color: "#4488ff" },
                { x: 45, y: 8, color: "#ff4444" },
                { x: 50, y: 35, color: "#44ff44" },
                { x: 20, y: 38, color: "#ffaa00" },
                { x: 32, y: 22, color: "#aa44ff" },
            ],
            connections: [
                [0, 4],
                [1, 4],
                [2, 4],
                [3, 4],
                [0, 3],
                [1, 2],
            ],
        },
        {
            id: "debug",
            label: "DEBUG A",
            mapType: "debug",
            stars: [
                { x: 32, y: 8, color: "#44ff44" },
                { x: 12, y: 36, color: "#ff4444" },
                { x: 52, y: 36, color: "#ffaa00" },
                { x: 52, y: 10, color: "#4488ff" },
            ],
            connections: [
                [0, 1],
                [1, 2],
                [2, 0],
                [0, 3],
            ],
        },
        {
            id: "debug-b",
            label: "DEBUG B",
            mapType: "debug-b",
            stars: [
                { x: 8, y: 22, color: "#44ff44" },
                { x: 24, y: 12, color: "#ff4444" },
                { x: 38, y: 16, color: "#ffaa00" },
                { x: 50, y: 25, color: "#aa44ff" },
                { x: 58, y: 32, color: "#4488ff" },
                { x: 14, y: 38, color: "#666" },
            ],
            connections: [
                [0, 1],
                [1, 2],
                [2, 3],
                [3, 4],
                [0, 5],
            ],
        },
    ];
    const PLAYERS: GameSettings["playerCount"][] = [2, 3, 4, 5, 6];
    const DIFFICULTIES = ["Easy", "Normal", "Hard", "Expert"];

    function startGame() {
        // Save settings to localStorage
        saveSetting("mapType", mapType);
        saveSetting("playerCount", playerCount);
        saveSetting("difficulty", difficulty);
        saveSetting("starsPerPlayer", starsPerPlayer);
        saveSetting("shipsPerStar", shipsPerStar);
        saveSetting("minLinks", minLinks);
        saveSetting("maxLinks", maxLinks);
        saveSetting("starSpacing", starSpacing);
        saveSetting("retainOrderOnConquest", retainOrderOnConquest);

        // Apply Config
        GAME_CONFIG.STARS_PER_PLAYER = starsPerPlayer;
        GAME_CONFIG.STARTING_SHIPS = shipsPerStar;
        GAME_CONFIG.MIN_LINKS_PER_STAR = minLinks;
        GAME_CONFIG.MAX_LINKS_PER_STAR = maxLinks;
        GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST = retainOrderOnConquest;

        // Find the selected map definition
        const selectedMap =
            MAP_DEFS.find((m) => m.id === mapType) ?? MAP_DEFS[0];

        gameStore.updateSettings({
            playerCount,
            mapType: selectedMap.mapType,
            minLinksPerStar: minLinks,
            maxLinksPerStar: maxLinks,
            starSpacing: starSpacing,
        });

        // Auto-enable slowmo on debug-b map
        if (selectedMap.mapType === "debug-b") {
            GAME_CONFIG.CONQUEST_SLOWMO_ENABLED = true;
        }

        // Restart Engine
        gameStore.restart();
        visible = false;
    }
</script>

{#if visible}
    <!-- Multiplayer Lobby Modal -->
    {#if showMultiplayer}
        <div class="main-menu-overlay multiplayer-overlay" transition:fade>
            <div
                class="lobby-wrapper"
                transition:fly={{ y: 20, duration: 400 }}
            >
                <button
                    class="back-btn"
                    onclick={() => (showMultiplayer = false)}
                >
                    ← Back to Menu
                </button>
                <MultiplayerLobby />
            </div>
        </div>
    {:else}
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
                    <!-- Map Selection: Thumbnail Cards -->
                    <div class="control-group">
                        <label>MAP</label>
                        <div class="map-card-row">
                            {#each MAP_DEFS as m}
                                <button
                                    class="map-card"
                                    class:active={mapType === m.id}
                                    class:debug={m.id.startsWith("debug")}
                                    onclick={() => (mapType = m.id)}
                                >
                                    <svg
                                        class="map-thumb"
                                        viewBox="0 0 64 48"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        {#each m.connections as [a, b]}
                                            <line
                                                x1={m.stars[a].x}
                                                y1={m.stars[a].y}
                                                x2={m.stars[b].x}
                                                y2={m.stars[b].y}
                                                stroke={mapType === m.id
                                                    ? "#4488ff44"
                                                    : "#334466"}
                                                stroke-width="1"
                                            />
                                        {/each}
                                        {#each m.stars as star}
                                            <circle
                                                cx={star.x}
                                                cy={star.y}
                                                r="3"
                                                fill={star.color}
                                                opacity={mapType === m.id
                                                    ? 1
                                                    : 0.6}
                                            />
                                        {/each}
                                    </svg>
                                    <span class="map-card-label">{m.label}</span
                                    >
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- Player Count -->
                    <div class="control-group">
                        <label>PLAYERS</label>
                        <div class="button-row">
                            {#each PLAYERS as p}
                                <button
                                    class:active={playerCount === p}
                                    onclick={() => (playerCount = p)}
                                    >{p}</button
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
                        <div class="config-dual-row">
                            <div class="config-item">
                                <label>STARS / PLAYER</label>
                                <div class="slider-container">
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        bind:value={starsPerPlayer}
                                    />
                                    <span class="value">{starsPerPlayer}</span>
                                </div>
                            </div>
                            <div class="config-item">
                                <label>SHIPS / STAR</label>
                                <div class="slider-container">
                                    <input
                                        type="range"
                                        min="10"
                                        max="200"
                                        step="10"
                                        bind:value={shipsPerStar}
                                    />
                                    <span class="value">{shipsPerStar}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Link Connectivity Settings -->
                    <div class="control-group">
                        <label>LINK CONNECTIVITY</label>
                        <div class="config-dual-row">
                            <div class="config-item">
                                <span class="mini-label">MIN</span>
                                <div class="slider-container">
                                    <input
                                        type="range"
                                        min="1"
                                        max="4"
                                        bind:value={minLinks}
                                    />
                                    <span class="value">{minLinks}</span>
                                </div>
                            </div>
                            <div class="config-item">
                                <span class="mini-label">MAX</span>
                                <div class="slider-container">
                                    <input
                                        type="range"
                                        min="2"
                                        max="8"
                                        bind:value={maxLinks}
                                    />
                                    <span class="value">{maxLinks}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Star Spacing -->
                    <div class="control-group">
                        <label>STAR SPACING</label>
                        <div class="slider-container">
                            <span class="mini-label">DENSE</span>
                            <input
                                type="range"
                                min="0.5"
                                max="5.0"
                                step="0.1"
                                bind:value={starSpacing}
                            />
                            <span class="mini-label">SPARSE</span>
                            <span class="value">{starSpacing.toFixed(1)}x</span>
                        </div>
                    </div>

                    <!-- Order Behavior -->
                    <div class="control-group">
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                bind:checked={retainOrderOnConquest}
                            />
                            <span>Retain order after conquest</span>
                            <span class="tooltip"
                                >Attack orders become movement orders when
                                target is captured</span
                            >
                        </label>
                    </div>

                    <div class="action-area">
                        <button class="start-btn" onclick={startGame}>
                            START GAME
                        </button>

                        <div class="bottom-row">
                            <button
                                class="secondary-btn"
                                onclick={() => (showMultiplayer = true)}
                                >MULTIPLAYER</button
                            >
                            <button class="secondary-btn">MAP EDITOR</button>
                            <button class="icon-btn">⚙️</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}
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

    .map-card-row {
        display: flex;
        gap: 8px;
    }

    .map-card {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 6px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid #334466;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .map-card:hover {
        border-color: #557799;
        background: rgba(255, 255, 255, 0.06);
    }

    .map-card.active {
        border-color: #00cccc;
        background: rgba(0, 204, 204, 0.08);
        box-shadow: 0 0 12px rgba(0, 204, 204, 0.2);
    }

    .map-card.debug {
        border-color: #443322;
    }

    .map-card.debug.active {
        border-color: #ffaa33;
        background: rgba(255, 170, 51, 0.08);
        box-shadow: 0 0 12px rgba(255, 170, 51, 0.2);
    }

    .map-thumb {
        width: 64px;
        height: 48px;
    }

    .map-card-label {
        font-size: 0.55rem;
        letter-spacing: 1.5px;
        color: #8899aa;
        font-weight: 600;
    }

    .map-card.active .map-card-label {
        color: #00ffff;
    }

    .map-card.debug.active .map-card-label {
        color: #ffcc66;
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

    .config-dual-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .config-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .mini-label {
        font-size: 0.6rem;
        color: #667;
        letter-spacing: 1px;
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

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.85rem;
        color: #ccd;
        position: relative;
    }

    .checkbox-label input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: #00ffff;
        cursor: pointer;
    }

    .checkbox-label .tooltip {
        display: none;
        position: absolute;
        bottom: 100%;
        left: 0;
        background: rgba(0, 20, 40, 0.95);
        color: #8899aa;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 0.7rem;
        white-space: nowrap;
        border: 1px solid #334466;
        margin-bottom: 4px;
    }

    .checkbox-label:hover .tooltip {
        display: block;
    }

    /* Multiplayer Lobby Modal */
    .multiplayer-overlay {
        z-index: 10000;
    }

    .lobby-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 450px;
    }

    .back-btn {
        background: transparent;
        border: 1px solid #556;
        color: #889;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 4px;
        font-family: inherit;
        font-size: 0.9rem;
        transition: all 0.2s;
        align-self: flex-start;
    }

    .back-btn:hover {
        border-color: #fff;
        color: #fff;
    }
</style>
