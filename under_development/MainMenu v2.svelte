<script lang="ts">
    import { fade } from "svelte/transition";

    // Game Setup State
    let mapType = $state("standard");
    let minLinks = $state(1);
    let maxLinks = $state(8);
    let starSpacing = $state(1.0);
    let playerCount = $state(2);
    let starsPerPlayer = $state(5);
    let shipsPerStar = $state(40);
    let playerName = $state("Commander");
    let playerColor = $state("#00ffff"); // Default Commander color

    // AI & Multiplayer State
    let activeTab = $state("ai"); // 'ai' or 'mp'
    let playerConfigs = $state([
        {
            id: "P2",
            color: "#ff4444",
            difficulty: "Easy",
            advanced: false,
            strategy: "Default",
        },
        {
            id: "P3",
            color: "#44ff44",
            difficulty: "Normal",
            advanced: true,
            strategy: "Frontline",
        },
        {
            id: "P4",
            color: "#ffaa00",
            difficulty: "Hard",
            advanced: true,
            strategy: "Frontline",
        },
        {
            id: "P5",
            color: "#aa44ff",
            difficulty: "Expert",
            advanced: false,
            strategy: "Default",
        },
        {
            id: "P6",
            color: "#4488ff",
            difficulty: "Expert",
            advanced: false,
            strategy: "Default",
        },
    ]);
    let savedMaps = $state([
        "Saved Map 1",
        "Saved Map 2",
        "Saved Map 3",
        "Saved Map 4",
        "Saved Map 5",
    ]);
    let selectedSavedMap = $state("");
    let audioMuted = $state(false);
    let audioVolume = $state(0.8);
    let tickDuration = $state(1250); // ms
    let roomId = $state("");
    let browseGames = $state([
        "Browse Game 1",
        "Browse Game 2",
        "Browse Game 3",
        "Browse Game 4",
    ]);

    const MAP_DEFS = [
        { id: "standard", label: "RANDOMIZED" },
        { id: "debug", label: "DEBUG A" },
        { id: "debug-b", label: "DEBUG B" },
    ];

    const PLAYERS = [2, 3, 4, 5, 6];
    const DIFFICULTIES = ["Easy", "Normal", "Hard", "Expert"];
    const STRATEGIES = ["Default", "Frontline", "Mirror", "Spread"];
    const PALETTE_COLORS = [
        "#00ffff",
        "#ff4444",
        "#44ff44",
        "#ffaa00",
        "#aa44ff",
        "#4488ff",
    ];
</script>

<div class="command-center-console" transition:fade={{ duration: 300 }}>
    <div class="console-panel left-panel">
        <div class="panel-header">
            <h2>GAME SETUP</h2>
        </div>
        <div class="panel-content">
            <!-- MAP Section -->
            <section class="config-section">
                <h3>MAP</h3>
                <div class="map-cards">
                    {#each MAP_DEFS as m}
                        <button
                            class="map-card"
                            class:active={mapType === m.id}
                            onclick={() => (mapType = m.id)}
                        >
                            <div class="map-preview">
                                <!-- Placeholder for map preview SVG/image -->
                                <svg viewBox="0 0 64 48" class="map-svg">
                                    <circle
                                        cx="32"
                                        cy="24"
                                        r="10"
                                        fill="currentColor"
                                        opacity="0.5"
                                    />
                                    <!-- Add more representative shapes based on mapType -->
                                </svg>
                            </div>
                            <span class="map-label">{m.label}</span>
                        </button>
                    {/each}
                </div>
            </section>

            <!-- LINKS & SPACING Section -->
            <section class="config-section">
                <h3>LINKS & SPACING</h3>
                <div class="control-row">
                    <label>Links <span class="range-label">[1-8]</span></label>
                    <div class="slider-container range-dual">
                        <!-- Simplified RangeDual representation -->
                        <input
                            type="range"
                            min="1"
                            max="8"
                            bind:value={minLinks}
                            class="range-thumb min"
                        />
                        <div
                            class="range-track"
                            style="left: {((minLinks - 1) / 7) *
                                100}%; right: {100 -
                                ((maxLinks - 1) / 7) * 100}%"
                        ></div>
                        <input
                            type="range"
                            min="1"
                            max="8"
                            bind:value={maxLinks}
                            class="range-thumb max"
                        />
                        <span class="value-display"
                            >[{minLinks}-{maxLinks}]</span
                        >
                    </div>
                </div>
                <div class="control-row">
                    <label
                        >Spacing <span class="range-label">[0.5x-5.0x]</span
                        ></label
                    >
                    <div class="slider-container">
                        <input
                            type="range"
                            min="0.5"
                            max="5.0"
                            step="0.1"
                            bind:value={starSpacing}
                            class="glow-slider"
                        />
                        <span class="value-display"
                            >{starSpacing.toFixed(1)}x</span
                        >
                    </div>
                </div>
            </section>

            <!-- PLAYERS, STARS, SHIPS Section -->
            <section class="config-section">
                <h3>PLAYERS, STARS, SHIPS</h3>
                <div class="control-row">
                    <label>Players</label>
                    <div class="button-group">
                        {#each PLAYERS as p}
                            <button
                                class:active={playerCount === p}
                                onclick={() => (playerCount = p)}>{p}</button
                            >
                        {/each}
                    </div>
                    <span class="value-display">{playerCount}</span>
                </div>
                <div class="control-row">
                    <label
                        >Stars per player <span class="range-label">[1-20]</span
                        ></label
                    >
                    <div class="slider-container">
                        <input
                            type="range"
                            min="1"
                            max="20"
                            bind:value={starsPerPlayer}
                            class="glow-slider"
                        />
                        <span class="value-display">{starsPerPlayer}</span>
                    </div>
                </div>
                <div class="control-row">
                    <label
                        >Ships per star <span class="range-label">[10-200]</span
                        ></label
                    >
                    <div class="slider-container">
                        <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            bind:value={shipsPerStar}
                            class="glow-slider"
                        />
                        <span class="value-display">{shipsPerStar}</span>
                    </div>
                </div>
            </section>

            <!-- COMMANDER IDENTITY Section -->
            <section class="config-section">
                <h3>COMMANDER IDENTITY</h3>
                <div class="identity-widget">
                    <div class="color-palette">
                        {#each PALETTE_COLORS as color}
                            <button
                                class="color-swatch"
                                class:active={playerColor === color}
                                style:background-color={color}
                                onclick={() => (playerColor = color)}
                                aria-label="Select color {color}"
                            ></button>
                        {/each}
                    </div>
                    <div class="commander-name">
                        <label for="commander-name-input">YOUR COMMANDER</label>
                        <input
                            type="text"
                            id="commander-name-input"
                            bind:value={playerName}
                            class="glow-input"
                        />
                    </div>
                </div>
            </section>

            <button class="start-game-btn">START GAME</button>
        </div>
    </div>

    <div class="console-panel right-panel">
        <div class="panel-header tab-header">
            <button
                class:active={activeTab === "ai"}
                onclick={() => (activeTab = "ai")}>AI OPPONENTS</button
            >
            <button
                class:active={activeTab === "mp"}
                onclick={() => (activeTab = "mp")}>MULTIPLAYER</button
            >
        </div>
        <div class="panel-content">
            {#if activeTab === "ai"}
                <section class="ai-opponents-list">
                    <h3>AI OPPONENTS</h3>
                    {#each playerConfigs.slice(0, playerCount - 1) as config}
                        <div class="ai-config-row">
                            <div class="ai-id">
                                <span
                                    class="color-dot"
                                    style:background-color={config.color}
                                ></span>
                                {config.id}
                            </div>
                            <div class="ai-settings">
                                <div class="setting-group">
                                    <label>Difficulty</label>
                                    <select
                                        bind:value={config.difficulty}
                                        class="glow-select"
                                    >
                                        {#each DIFFICULTIES as d}<option
                                                value={d}>{d}</option
                                            >{/each}
                                    </select>
                                </div>
                                <label class="advanced-toggle">
                                    <input
                                        type="checkbox"
                                        bind:checked={config.advanced}
                                    /> Advanced
                                </label>
                                {#if config.advanced}
                                    <div class="setting-group">
                                        <label>Strategy</label>
                                        <select
                                            bind:value={config.strategy}
                                            class="glow-select"
                                        >
                                            {#each STRATEGIES as s}<option
                                                    value={s}>{s}</option
                                                >{/each}
                                        </select>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </section>

                <section class="config-section">
                    <h3>SAVED MAPS</h3>
                    <div class="saved-maps-container">
                        <select
                            bind:value={selectedSavedMap}
                            class="glow-select saved-map-list"
                            size="5"
                        >
                            {#each savedMaps as map}
                                <option value={map}>{map}</option>
                            {/each}
                        </select>
                        <div class="saved-map-actions">
                            <button class="action-btn">Load</button>
                            <button class="action-btn">Delete</button>
                            <button class="action-btn">...</button>
                        </div>
                    </div>
                </section>

                <section class="config-section">
                    <h3>AUDIO</h3>
                    <div class="control-row audio-control">
                        <button
                            class="mute-btn"
                            class:muted={audioMuted}
                            onclick={() => (audioMuted = !audioMuted)}
                        >
                            {audioMuted ? "🔇" : "🔊"} Mute
                        </button>
                        <div class="slider-container">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                bind:value={audioVolume}
                                disabled={audioMuted}
                                class="glow-slider"
                            />
                        </div>
                        <button class="settings-btn">Settings</button>
                    </div>
                </section>

                <section class="config-section">
                    <h3>TICK DURATION</h3>
                    <div class="control-row tick-control">
                        <span class="tick-label">0</span>
                        <div class="slider-container">
                            <input
                                type="range"
                                min="0"
                                max="3000"
                                step="250"
                                bind:value={tickDuration}
                                class="glow-slider"
                            />
                        </div>
                        <span class="tick-label">3000ms</span>
                        <span class="value-display"
                            >{(tickDuration / 1000).toFixed(2)}s</span
                        >
                    </div>
                </section>
            {:else}
                <section class="multiplayer-section">
                    <h3>MULTIPLAYER</h3>
                    <div class="mp-actions">
                        <button class="glow-btn">Create Room</button>
                        <button class="glow-btn">Join Room</button>
                    </div>
                    <div class="room-id-input">
                        <label for="room-id">Room ID</label>
                        <input
                            type="text"
                            id="room-id"
                            bind:value={roomId}
                            class="glow-input"
                        />
                    </div>
                    <div class="browse-games">
                        <label>Browse Games</label>
                        <select class="glow-select browse-list" size="5">
                            {#each browseGames as game}
                                <option>{game}</option>
                            {/each}
                        </select>
                    </div>
                </section>
            {/if}
        </div>
    </div>
</div>

<style>
    @import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&display=swap");

    :global(body) {
        margin: 0;
        background-color: #050510;
        background-image: radial-gradient(
            ellipse at center,
            #1a2a3a 0%,
            #050510 100%
        );
        font-family: "Orbitron", sans-serif;
        color: #00ffff;
        overflow: hidden;
    }

    .command-center-console {
        display: flex;
        justify-content: center;
        gap: 2rem;
        padding: 2rem;
        height: 100vh;
        box-sizing: border-box;
        background-image: url("/assets/nebula-bg.jpg"); /* Replace with actual background */
        background-size: cover;
        background-position: center;
    }

    .console-panel {
        background: rgba(10, 20, 30, 0.9);
        border: 2px solid #00ffff;
        border-radius: 1rem;
        box-shadow:
            0 0 20px rgba(0, 255, 255, 0.3),
            inset 0 0 20px rgba(0, 255, 255, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        backdrop-filter: blur(10px);
    }

    .left-panel {
        width: 45%;
        min-width: 500px;
    }

    .right-panel {
        width: 40%;
        min-width: 450px;
    }

    .panel-header {
        background: rgba(0, 255, 255, 0.1);
        padding: 1rem;
        text-align: center;
        border-bottom: 1px solid #00ffff;
        position: relative;
    }

    .panel-header h2 {
        margin: 0;
        font-size: 1.5rem;
        letter-spacing: 0.2rem;
        text-shadow: 0 0 10px #00ffff;
    }

    /* Decorative header elements */
    .panel-header::before,
    .panel-header::after {
        content: "";
        position: absolute;
        top: 0;
        width: 20%;
        height: 100%;
        border-bottom: 1px solid #00ffff;
        transform: skewX(-30deg);
    }
    .panel-header::before {
        left: 0;
        border-right: 1px solid #00ffff;
    }
    .panel-header::after {
        right: 0;
        border-left: 1px solid #00ffff;
    }

    .panel-content {
        padding: 1.5rem;
        overflow-y: auto;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    h3 {
        font-size: 1rem;
        color: #00aaaa;
        margin-bottom: 0.8rem;
        letter-spacing: 0.1rem;
    }

    .config-section {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }

    /* MAP CARDS */
    .map-cards {
        display: flex;
        gap: 1rem;
    }

    .map-card {
        flex: 1;
        background: rgba(0, 255, 255, 0.05);
        border: 1px solid #00aaaa;
        border-radius: 0.5rem;
        padding: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #00aaaa;
    }

    .map-card:hover {
        background: rgba(0, 255, 255, 0.1);
        border-color: #00ffff;
        color: #00ffff;
    }

    .map-card.active {
        background: rgba(0, 255, 255, 0.15);
        border-color: #00ffff;
        color: #00ffff;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
    }

    .map-preview {
        width: 100%;
        height: 80px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 0.3rem;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .map-svg {
        width: 80%;
        height: 80%;
        fill: currentColor;
    }

    /* CONTROLS */
    .control-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    label {
        font-size: 0.9rem;
        color: #00aaaa;
    }

    .range-label {
        font-size: 0.8rem;
        color: #007777;
    }

    .slider-container {
        flex-grow: 1;
        display: flex;
        align-items: center;
    }

    .glow-slider {
        width: 100%;
        -webkit-appearance: none;
        background: rgba(0, 255, 255, 0.1);
        height: 6px;
        border-radius: 3px;
        outline: none;
        border: 1px solid #00aaaa;
    }

    .glow-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px #00ffff;
        border: 2px solid #00aaaa;
    }

    .value-display {
        font-family: "JetBrains Mono", monospace;
        margin-left: 1rem;
        min-width: 40px;
        text-align: right;
        color: #00ffff;
    }

    /* Range Dual (Simplified) */
    .range-dual {
        position: relative;
        height: 20px;
    }
    .range-thumb {
        position: absolute;
        top: 0;
        height: 20px;
        width: 100%;
        -webkit-appearance: none;
        background: none;
        pointer-events: none;
    }
    .range-thumb::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px #00ffff;
        border: 2px solid #00aaaa;
        pointer-events: auto;
        position: relative;
        z-index: 1;
    }
    .range-track {
        position: absolute;
        top: 7px;
        height: 6px;
        background: rgba(0, 255, 255, 0.3);
        border-radius: 3px;
        z-index: 0;
    }

    /* Button Group */
    .button-group {
        display: flex;
        border: 1px solid #00aaaa;
        border-radius: 0.3rem;
        overflow: hidden;
    }
    .button-group button {
        background: rgba(0, 255, 255, 0.05);
        border: none;
        border-right: 1px solid #00aaaa;
        color: #00aaaa;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-family: "Orbitron", sans-serif;
        transition: all 0.2s;
    }
    .button-group button:last-child {
        border-right: none;
    }
    .button-group button:hover {
        background: rgba(0, 255, 255, 0.15);
        color: #00ffff;
    }
    .button-group button.active {
        background: rgba(0, 255, 255, 0.2);
        color: #00ffff;
        box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.3);
    }

    /* Commander Identity */
    .identity-widget {
        display: flex;
        gap: 1.5rem;
        align-items: center;
        background: rgba(0, 255, 255, 0.05);
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid #00aaaa;
    }
    .color-palette {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
    }
    .color-swatch {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
    }
    .color-swatch:hover {
        transform: scale(1.1);
    }
    .color-swatch.active {
        border-color: #ffffff;
        box-shadow: 0 0 10px currentColor;
    }
    .commander-name {
        flex-grow: 1;
    }
    .glow-input {
        width: 100%;
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid #00aaaa;
        padding: 0.5rem;
        color: #00ffff;
        font-family: "Orbitron", sans-serif;
        border-radius: 0.3rem;
        outline: none;
    }
    .glow-input:focus {
        border-color: #00ffff;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
    }

    /* Start Game Button */
    .start-game-btn {
        background: linear-gradient(180deg, #00ffff 0%, #00aaaa 100%);
        border: none;
        padding: 1rem 2rem;
        font-family: "Orbitron", sans-serif;
        font-size: 1.2rem;
        font-weight: bold;
        color: #003333;
        border-radius: 0.5rem;
        cursor: pointer;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        position: relative;
        overflow: hidden;
        transition: all 0.2s;
        margin-top: auto;
        text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
        clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0% 50%);
    }
    .start-game-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.7);
    }
    .start-game-btn::before {
        content: "";
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.3) 0%,
            transparent 70%
        );
        animation: pulse 2s infinite;
        pointer-events: none;
    }
    @keyframes pulse {
        0% {
            transform: scale(0.9);
            opacity: 0.7;
        }
        50% {
            transform: scale(1);
            opacity: 1;
        }
        100% {
            transform: scale(0.9);
            opacity: 0.7;
        }
    }

    /* RIGHT PANEL */
    .tab-header {
        display: flex;
        padding: 0;
        border-bottom: none;
    }
    .tab-header button {
        flex: 1;
        background: transparent;
        border: none;
        padding: 1rem;
        font-family: "Orbitron", sans-serif;
        font-size: 1.1rem;
        color: #00aaaa;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
    }
    .tab-header button:hover {
        color: #00ffff;
        background: rgba(0, 255, 255, 0.05);
    }
    .tab-header button.active {
        color: #00ffff;
        border-bottom-color: #00ffff;
        text-shadow: 0 0 10px #00ffff;
    }

    /* AI OPPONENTS */
    .ai-config-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid rgba(0, 255, 255, 0.1);
    }
    .ai-id {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: bold;
        min-width: 50px;
    }
    .color-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: 0 0 5px currentColor;
    }
    .ai-settings {
        flex-grow: 1;
        display: flex;
        gap: 1rem;
        align-items: center;
    }
    .setting-group {
        display: flex;
        flex-direction: column;
    }
    .setting-group label {
        font-size: 0.7rem;
        margin-bottom: 0.2rem;
    }
    .glow-select {
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid #00aaaa;
        color: #00ffff;
        padding: 0.3rem 0.5rem;
        border-radius: 0.3rem;
        font-family: "Orbitron", sans-serif;
        outline: none;
        cursor: pointer;
    }
    .advanced-toggle {
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        gap: 0.3rem;
        cursor: pointer;
    }

    /* SAVED MAPS */
    .saved-maps-container {
        display: flex;
        gap: 1rem;
    }
    .saved-map-list {
        flex-grow: 1;
        height: 100px;
    }
    .saved-map-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .action-btn {
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid #00aaaa;
        color: #00ffff;
        padding: 0.3rem 0.8rem;
        border-radius: 0.3rem;
        cursor: pointer;
        font-family: "Orbitron", sans-serif;
        transition: all 0.2s;
    }
    .action-btn:hover {
        background: rgba(0, 255, 255, 0.2);
        border-color: #00ffff;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
    }

    /* AUDIO */
    .audio-control {
        gap: 0.5rem;
    }
    .mute-btn,
    .settings-btn {
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid #00aaaa;
        color: #00ffff;
        padding: 0.3rem 0.5rem;
        border-radius: 0.3rem;
        cursor: pointer;
    }
    .mute-btn.muted {
        opacity: 0.6;
    }

    /* TICK DURATION */
    .tick-control {
        gap: 0.5rem;
    }
    .tick-label {
        font-size: 0.7rem;
        color: #00aaaa;
    }

    /* MULTIPLAYER */
    .mp-actions {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    .glow-btn {
        flex: 1;
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid #00aaaa;
        color: #00ffff;
        padding: 0.8rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-family: "Orbitron", sans-serif;
        transition: all 0.2s;
    }
    .glow-btn:hover {
        background: rgba(0, 255, 255, 0.2);
        border-color: #00ffff;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
    }
    .room-id-input {
        margin-bottom: 1rem;
    }
    .browse-list {
        width: 100%;
        height: 150px;
    }
</style>
