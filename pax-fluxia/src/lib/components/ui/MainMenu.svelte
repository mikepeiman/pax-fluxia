<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { fade, fly } from "svelte/transition";
    import type { GameSettings } from "$lib/types/game.types";
    import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";
    import type { RoomListing } from "$lib/stores/multiplayerStore.svelte";
    import { log } from "$lib/utils/logger";

    let visible = $state(true);

    // ── Game Mode ──────────────────────────────────────────────────────────
    // Auto-switch to MP when connected
    let gameMode = $state<"sp" | "mp">(
        multiplayerStore.isConnected ? "mp" : "sp",
    );

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

    // Auto-switch to MP mode when connected (e.g. after restart)
    $effect(() => {
        if (multiplayerStore.isConnected) {
            gameMode = "mp";
        }
    });

    // ── Settings (localStorage-persisted) ──────────────────────────────────
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

    // Config state
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

    // MP Join state
    let joinRoomId = $state("");

    // Room browser state
    let confirmJoinTarget = $state<RoomListing | null>(null);

    // Auto-fetch rooms when switching to MP mode
    $effect(() => {
        if (gameMode === "mp" && !multiplayerStore.isConnected) {
            multiplayerStore.fetchRooms();
        }
    });

    // ── Per-Player Settings ───────────────────────────────────────────────
    const AI_STRATEGIES = [
        { id: "default", label: "Default" },
        { id: "frontline", label: "Frontline Forces" },
        { id: "mirror", label: "Mirror Match" },
        { id: "spread", label: "Even Spread" },
        { id: "ambush", label: "Backline Ambush" },
        { id: "surround", label: "Tactical Surround" },
        { id: "staraware", label: "Star Hunter" },
        { id: "retreat", label: "Ghost Retreat" },
    ];

    interface PlayerConfig {
        hue: number; // 0-360 HSL hue
        isAI: boolean;
        difficulty: string;
        strategy: string;
    }

    const DEFAULT_HUES = [210, 0, 120, 45, 280, 170]; // blue, red, green, orange, purple, teal

    function makeDefaultPlayerConfigs(count: number): PlayerConfig[] {
        return Array.from({ length: count }, (_, i) => ({
            hue: DEFAULT_HUES[i % DEFAULT_HUES.length],
            isAI: i > 0,
            difficulty: "Normal",
            strategy: "default",
        }));
    }

    let playerConfigs = $state<PlayerConfig[]>(
        loadSetting("playerConfigs", makeDefaultPlayerConfigs(6)),
    );

    // Sync player count changes to config array
    $effect(() => {
        if (playerConfigs.length !== playerCount) {
            const newConfigs = makeDefaultPlayerConfigs(playerCount);
            // Preserve existing configs where possible
            for (
                let i = 0;
                i < Math.min(playerConfigs.length, playerCount);
                i++
            ) {
                newConfigs[i] = playerConfigs[i];
            }
            playerConfigs = newConfigs;
        }
    });

    let expandedPlayer = $state<number | null>(null);

    // ── Map Definitions ────────────────────────────────────────────────────
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

    // ── Actions ────────────────────────────────────────────────────────────
    function saveAllSettings() {
        saveSetting("mapType", mapType);
        saveSetting("playerCount", playerCount);
        saveSetting("difficulty", difficulty);
        saveSetting("starsPerPlayer", starsPerPlayer);
        saveSetting("shipsPerStar", shipsPerStar);
        saveSetting("minLinks", minLinks);
        saveSetting("maxLinks", maxLinks);
        saveSetting("starSpacing", starSpacing);
        saveSetting("retainOrderOnConquest", retainOrderOnConquest);
        saveSetting("playerConfigs", playerConfigs);
    }

    function applyConfig() {
        GAME_CONFIG.STARS_PER_PLAYER = starsPerPlayer;
        GAME_CONFIG.STARTING_SHIPS = shipsPerStar;
        GAME_CONFIG.MIN_LINKS_PER_STAR = minLinks;
        GAME_CONFIG.MAX_LINKS_PER_STAR = maxLinks;
        GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST = retainOrderOnConquest;

        const selectedMap =
            MAP_DEFS.find((m) => m.id === mapType) ?? MAP_DEFS[0];

        gameStore.updateSettings({
            playerCount,
            mapType: selectedMap.mapType,
            minLinksPerStar: minLinks,
            maxLinksPerStar: maxLinks,
            starSpacing: starSpacing,
        });

        if (selectedMap.mapType === "debug-b") {
            GAME_CONFIG.CONQUEST_SLOWMO_ENABLED = true;
        }
    }

    function startSPGame() {
        saveAllSettings();
        applyConfig();
        gameStore.restart();
        visible = false;
    }

    // ── MP handlers ────────────────────────────────────────────────────────
    import { buildEngineConfig } from "$lib/config/game.config";

    async function handleCreateRoom() {
        saveAllSettings();
        applyConfig();

        const selectedMap =
            MAP_DEFS.find((m) => m.id === mapType) ?? MAP_DEFS[0];

        const gameplayConfig = buildEngineConfig();

        await multiplayerStore.createRoom({
            playerCount,
            mapType: selectedMap.mapType,
            gameplayConfig,
        });
    }

    async function handleJoinRoom() {
        if (!joinRoomId.trim()) return;
        await multiplayerStore.joinRoom(joinRoomId.trim());
    }

    function handleLeaveRoom() {
        multiplayerStore.leaveRoom();
    }

    function handleStartGame() {
        multiplayerStore.startGame();
    }

    function copyRoomId() {
        if (multiplayerStore.roomId) {
            navigator.clipboard.writeText(multiplayerStore.roomId);
        }
    }

    async function handleConfirmJoin() {
        if (!confirmJoinTarget) return;
        await multiplayerStore.joinRoomById(confirmJoinTarget.roomId);
        confirmJoinTarget = null;
    }
</script>

{#if visible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="menu-fullscreen" transition:fade>
        <div class="menu-container" transition:fly={{ y: 20, duration: 400 }}>
            <!-- ═══ Title ═══ -->
            <header class="title-block">
                <h1 class="title">
                    <span class="pax">PAX</span>
                    <span class="fluxia">FLUXIA</span>
                </h1>
                <div class="subtitle">TERRITORY CONTROL STRATEGY</div>
            </header>

            <!-- ═══ Mode Toggle ═══ -->
            <div class="mode-toggle">
                <button
                    class="mode-btn"
                    class:active={gameMode === "sp"}
                    onclick={() => (gameMode = "sp")}
                >
                    <span class="mode-icon">🎮</span>
                    SOLO
                </button>
                <button
                    class="mode-btn"
                    class:active={gameMode === "mp"}
                    onclick={() => (gameMode = "mp")}
                >
                    <span class="mode-icon">🌐</span>
                    MULTIPLAYER
                    {#if multiplayerStore.isConnected}
                        <span class="connected-dot"></span>
                    {/if}
                </button>
            </div>

            <!-- ═══ Main Content: Two columns ═══ -->
            <div class="content-grid">
                <!-- ── Left: Game Config ── -->
                <section class="panel config-panel">
                    <h2 class="panel-title">GAME SETUP</h2>

                    <!-- Map Selection -->
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

                    <!-- Stars/Ships Config -->
                    <div class="control-group">
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

                    <!-- Link Connectivity -->
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

                    <!-- Per-Player Configuration -->
                    <div class="control-group player-config-section">
                        <label>PLAYERS</label>
                        <div class="player-config-list">
                            {#each playerConfigs as cfg, i}
                                <div class="player-config-row">
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <div
                                        class="player-header"
                                        onclick={() =>
                                            (expandedPlayer =
                                                expandedPlayer === i
                                                    ? null
                                                    : i)}
                                    >
                                        <span
                                            class="player-swatch"
                                            style:background-color="hsl({cfg.hue},
                                            70%, 55%)"
                                        ></span>
                                        <span class="player-label">
                                            {i === 0 ? "YOU" : `P${i + 1}`}
                                            {#if cfg.isAI}
                                                <span class="badge ai">AI</span>
                                            {/if}
                                        </span>
                                        <span class="player-expand"
                                            >{expandedPlayer === i
                                                ? "▾"
                                                : "▸"}</span
                                        >
                                    </div>
                                    {#if expandedPlayer === i}
                                        <div class="player-details">
                                            <!-- Hue Wheel -->
                                            <div class="hue-control">
                                                <label>Color</label>
                                                <input
                                                    type="range"
                                                    class="hue-slider"
                                                    min="0"
                                                    max="360"
                                                    bind:value={
                                                        playerConfigs[i].hue
                                                    }
                                                    style:--hue={cfg.hue}
                                                />
                                                <span
                                                    class="hue-preview"
                                                    style:background-color="hsl({cfg.hue},
                                                    70%, 55%)"
                                                ></span>
                                            </div>
                                            {#if i > 0}
                                                <!-- AI settings -->
                                                <div class="ai-setting">
                                                    <label>Difficulty</label>
                                                    <select
                                                        bind:value={
                                                            playerConfigs[i]
                                                                .difficulty
                                                        }
                                                    >
                                                        {#each DIFFICULTIES as d}
                                                            <option value={d}
                                                                >{d}</option
                                                            >
                                                        {/each}
                                                    </select>
                                                </div>
                                                <div class="ai-setting">
                                                    <label>Strategy</label>
                                                    <select
                                                        bind:value={
                                                            playerConfigs[i]
                                                                .strategy
                                                        }
                                                    >
                                                        {#each AI_STRATEGIES as s}
                                                            <option value={s.id}
                                                                >{s.label}</option
                                                            >
                                                        {/each}
                                                    </select>
                                                </div>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </section>

                <!-- ── Right: Mode-specific panel ── -->
                <section class="panel mode-panel">
                    {#if gameMode === "sp"}
                        <!-- ══ Single Player ══ -->
                        <h2 class="panel-title">SINGLE PLAYER</h2>

                        <div class="control-group">
                            <label>AI DIFFICULTY</label>
                            <div class="button-row">
                                {#each DIFFICULTIES as d}
                                    <button
                                        class:active={difficulty === d}
                                        onclick={() => (difficulty = d)}
                                        >{d}</button
                                    >
                                {/each}
                            </div>
                        </div>

                        <div class="spacer"></div>

                        <button class="start-btn" onclick={startSPGame}>
                            <span class="btn-glow"></span>
                            START GAME
                        </button>
                    {:else if !multiplayerStore.isConnected}
                        <!-- ══ Multiplayer: Not Connected ══ -->
                        <h2 class="panel-title">MULTIPLAYER</h2>

                        {#if multiplayerStore.isConnecting}
                            <div class="mp-loading">
                                <div class="spinner"></div>
                                <p>Connecting...</p>
                            </div>
                        {:else}
                            <!-- Create Room -->
                            <div class="mp-section">
                                <h3>Create Game</h3>
                                <p class="mp-desc">
                                    Host a new room with your game settings.
                                    Share the Room ID with friends.
                                </p>
                                <button
                                    class="start-btn"
                                    onclick={handleCreateRoom}
                                >
                                    <span class="btn-glow"></span>
                                    CREATE ROOM
                                </button>
                            </div>

                            <div class="divider">
                                <span>OR</span>
                            </div>

                            <!-- Join Room -->
                            <div class="mp-section">
                                <h3>Join Game</h3>
                                <div class="join-row">
                                    <input
                                        type="text"
                                        placeholder="Room ID"
                                        bind:value={joinRoomId}
                                        class="room-input"
                                    />
                                    <button
                                        class="join-btn"
                                        onclick={handleJoinRoom}
                                        disabled={!joinRoomId.trim()}
                                    >
                                        JOIN
                                    </button>
                                </div>
                            </div>

                            <!-- Room Browser -->
                            <div class="mp-section room-browser">
                                <div class="browser-header">
                                    <h3>Browse Games</h3>
                                    <button
                                        class="refresh-btn"
                                        onclick={() =>
                                            multiplayerStore.fetchRooms()}
                                        disabled={multiplayerStore.isFetchingRooms}
                                    >
                                        {multiplayerStore.isFetchingRooms
                                            ? "⟳"
                                            : "↻"} Refresh
                                    </button>
                                </div>
                                {#if multiplayerStore.isFetchingRooms}
                                    <p class="waiting-text">
                                        Scanning for rooms...
                                    </p>
                                {:else if multiplayerStore.availableRooms.length === 0}
                                    <p class="waiting-text">
                                        No public rooms available
                                    </p>
                                {:else}
                                    <div class="room-list">
                                        {#each multiplayerStore.availableRooms as room}
                                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div
                                                class="room-card"
                                                onclick={() =>
                                                    (confirmJoinTarget = room)}
                                            >
                                                <div class="room-card-top">
                                                    <span class="room-host"
                                                        >{room.metadata
                                                            ?.hostName ||
                                                            "Unknown"}</span
                                                    >
                                                    <span
                                                        class="room-phase badge {room
                                                            .metadata?.phase ||
                                                            'lobby'}"
                                                    >
                                                        {room.metadata?.phase ||
                                                            "lobby"}
                                                    </span>
                                                </div>
                                                <div class="room-card-bottom">
                                                    <span class="room-map"
                                                        >{room.metadata
                                                            ?.mapType ||
                                                            "?"}</span
                                                    >
                                                    <span class="room-slots">
                                                        {room.clients}/{room.maxClients}
                                                        players
                                                    </span>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>

                            {#if multiplayerStore.connectionError}
                                <div class="error-msg">
                                    {multiplayerStore.connectionError}
                                </div>
                            {/if}
                        {/if}
                    {:else}
                        <!-- ══ Multiplayer: Connected (Lobby) ══ -->
                        <h2 class="panel-title">GAME LOBBY</h2>

                        <!-- Room Info -->
                        <div class="room-info-bar">
                            <div class="room-id-block">
                                <span class="room-label">ROOM</span>
                                <code class="room-code"
                                    >{multiplayerStore.roomId}</code
                                >
                                <button
                                    class="copy-btn"
                                    onclick={copyRoomId}
                                    title="Copy Room ID"
                                >
                                    📋
                                </button>
                            </div>
                            <div class="player-count-badge">
                                {multiplayerStore.playerCount} / {multiplayerStore.maxPlayers}
                            </div>
                        </div>

                        <!-- Players List -->
                        <div class="players-list">
                            <h3>
                                Players ({multiplayerStore.players.length})
                            </h3>
                            {#if multiplayerStore.players.length === 0}
                                <p class="waiting-text">
                                    Waiting for players...
                                </p>
                            {/if}
                            <ul>
                                {#each multiplayerStore.players as player}
                                    <li class="player-row">
                                        <span
                                            class="player-dot"
                                            style:background-color={player.color}
                                        ></span>
                                        <span class="player-name">
                                            {player.name}
                                            {#if player.sessionId === multiplayerStore.hostSessionId}
                                                <span class="badge host"
                                                    >HOST</span
                                                >
                                            {/if}
                                            {#if player.sessionId === multiplayerStore.localSessionId}
                                                <span class="badge you"
                                                    >YOU</span
                                                >
                                            {/if}
                                            {#if player.isAI}
                                                <span class="badge ai">AI</span>
                                            {/if}
                                        </span>
                                    </li>
                                {/each}
                            </ul>
                        </div>

                        <div class="spacer"></div>

                        <!-- Lobby Actions -->
                        <div class="lobby-actions">
                            {#if multiplayerStore.isHost}
                                <button
                                    class="start-btn"
                                    onclick={handleStartGame}
                                >
                                    <span class="btn-glow"></span>
                                    🚀 START GAME
                                </button>
                            {:else}
                                <p class="waiting-text">
                                    Waiting for host to start...
                                </p>
                            {/if}
                            <button class="leave-btn" onclick={handleLeaveRoom}>
                                Leave Room
                            </button>
                        </div>
                    {/if}
                </section>
            </div>
        </div>
    </div>
{/if}

<!-- Join Confirmation Modal -->
{#if confirmJoinTarget}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="confirm-overlay"
        transition:fade
        onclick={() => (confirmJoinTarget = null)}
    >
        <div class="confirm-dialog" onclick={(e) => e.stopPropagation()}>
            <h3>Join Room?</h3>
            <p>
                Host: <strong
                    >{confirmJoinTarget.metadata?.hostName || "Unknown"}</strong
                >
            </p>
            <p>
                {confirmJoinTarget.clients}/{confirmJoinTarget.maxClients} players
                • {confirmJoinTarget.metadata?.mapType || "standard"}
            </p>
            <div class="confirm-actions">
                <button class="start-btn" onclick={handleConfirmJoin}>
                    <span class="btn-glow"></span>
                    JOIN
                </button>
                <button
                    class="leave-btn"
                    onclick={() => (confirmJoinTarget = null)}>Cancel</button
                >
            </div>
        </div>
    </div>
{/if}

<style>
    /* ═══════════════════════════════════════════════════════════════ */
    /*  UNIFIED FULL-PAGE MENU                                        */
    /* ═══════════════════════════════════════════════════════════════ */

    :global(body) {
        margin: 0;
        background: #050510;
        overflow: hidden;
    }

    .menu-fullscreen {
        position: absolute;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(
            ellipse at 50% 20%,
            rgba(0, 40, 60, 0.3) 0%,
            #050510 70%
        );
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: "Orbitron", sans-serif;
    }

    .menu-container {
        width: 90vw;
        max-width: 820px;
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 28px;
        padding: 32px 0;
    }

    /* Scrollbar */
    .menu-container::-webkit-scrollbar {
        width: 4px;
    }
    .menu-container::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 255, 0.15);
        border-radius: 2px;
    }

    /* ── Title ────────────────────────────────────── */
    .title-block {
        text-align: center;
    }

    .title {
        font-size: 3.2rem;
        margin: 0;
        line-height: 1.1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-shadow: 0 0 30px rgba(0, 255, 255, 0.4);
    }

    .pax {
        color: #00ffff;
        letter-spacing: 6px;
        font-weight: 300;
    }
    .fluxia {
        color: #00ffff;
        letter-spacing: 10px;
        font-weight: 900;
    }

    .subtitle {
        color: #4a5a6a;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.65rem;
        letter-spacing: 4px;
        margin-top: 6px;
    }

    /* ── Mode Toggle ─────────────────────────────── */
    .mode-toggle {
        display: flex;
        gap: 2px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 4px;
        align-self: center;
    }

    .mode-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 32px;
        border: none;
        background: transparent;
        color: #556677;
        font-family: "Orbitron", sans-serif;
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 2px;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.25s;
        position: relative;
    }

    .mode-btn:hover {
        color: #8899aa;
        background: rgba(255, 255, 255, 0.03);
    }

    .mode-btn.active {
        color: #00ffff;
        background: rgba(0, 255, 255, 0.06);
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.06);
    }

    .mode-icon {
        font-size: 1rem;
    }

    .connected-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #22cc66;
        box-shadow: 0 0 6px #22cc66;
        animation: pulse-dot 2s infinite;
    }

    @keyframes pulse-dot {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.4;
        }
    }

    /* ── Content Grid ────────────────────────────── */
    .content-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    @media (max-width: 700px) {
        .content-grid {
            grid-template-columns: 1fr;
        }
    }

    /* ── Panels ──────────────────────────────────── */
    .panel {
        background: rgba(8, 12, 24, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .panel-title {
        font-size: 0.75rem;
        color: #556677;
        letter-spacing: 3px;
        margin: 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    /* ── Controls ─────────────────────────────────── */
    .control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    label {
        font-size: 0.65rem;
        color: #667788;
        letter-spacing: 1.5px;
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
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .map-card:hover {
        border-color: rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
    }

    .map-card.active {
        border-color: #00cccc;
        background: rgba(0, 204, 204, 0.06);
        box-shadow: 0 0 12px rgba(0, 204, 204, 0.15);
    }

    .map-card.debug {
        border-color: rgba(255, 170, 51, 0.15);
    }

    .map-card.debug.active {
        border-color: #ffaa33;
        background: rgba(255, 170, 51, 0.06);
        box-shadow: 0 0 12px rgba(255, 170, 51, 0.15);
    }

    .map-thumb {
        width: 56px;
        height: 42px;
    }

    .map-card-label {
        font-size: 0.5rem;
        letter-spacing: 1.5px;
        color: #667788;
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
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        overflow: hidden;
    }

    .button-row button {
        flex: 1;
        background: transparent;
        border: none;
        color: #556677;
        padding: 8px;
        cursor: pointer;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.75rem;
        transition: all 0.2s;
        border-right: 1px solid rgba(255, 255, 255, 0.06);
    }

    .button-row button:last-child {
        border-right: none;
    }

    .button-row button:hover {
        background: rgba(255, 255, 255, 0.04);
        color: #aabbcc;
    }

    .button-row button.active {
        background: rgba(0, 255, 255, 0.12);
        color: #00ffff;
        font-weight: bold;
        box-shadow: inset 0 0 12px rgba(0, 255, 255, 0.08);
    }

    /* Config Sliders */
    .config-dual-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    .config-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .mini-label {
        font-size: 0.55rem;
        color: #445566;
        letter-spacing: 1px;
    }

    .slider-container {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    input[type="range"] {
        flex: 1;
        accent-color: #00ffff;
        height: 4px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 2px;
        appearance: none;
    }

    input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 14px;
        height: 14px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
    }

    .value {
        color: #00ffff;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8rem;
        width: 28px;
        text-align: right;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.75rem;
        color: #8899aa;
        position: relative;
    }

    .checkbox-label input[type="checkbox"] {
        width: 14px;
        height: 14px;
        accent-color: #00ffff;
        cursor: pointer;
    }

    .checkbox-label .tooltip {
        display: none;
        position: absolute;
        bottom: 100%;
        left: 0;
        background: rgba(0, 20, 40, 0.95);
        color: #667788;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 0.65rem;
        white-space: nowrap;
        border: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 4px;
    }

    .checkbox-label:hover .tooltip {
        display: block;
    }

    /* ── Start Button ─────────────────────────────── */
    .start-btn {
        position: relative;
        background: linear-gradient(
            135deg,
            rgba(0, 204, 204, 0.9),
            rgba(0, 136, 170, 0.9)
        );
        border: none;
        padding: 16px;
        color: #001a1a;
        font-family: "Orbitron", sans-serif;
        font-size: 1.1rem;
        font-weight: 900;
        letter-spacing: 2px;
        cursor: pointer;
        border-radius: 8px;
        box-shadow: 0 4px 24px rgba(0, 200, 200, 0.2);
        transition:
            transform 0.15s,
            box-shadow 0.15s;
        overflow: hidden;
        width: 100%;
    }

    .start-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 36px rgba(0, 200, 200, 0.35);
    }

    .start-btn:active {
        transform: translateY(1px);
    }

    .btn-glow {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.15),
            transparent
        );
        transform: translateX(-100%);
        animation: shimmer 3s infinite;
    }

    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        50% {
            transform: translateX(100%);
        }
        100% {
            transform: translateX(100%);
        }
    }

    .spacer {
        flex: 1;
    }

    /* ── MP Specific ──────────────────────────────── */
    .mp-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .mp-section h3 {
        font-size: 0.7rem;
        color: #8899aa;
        letter-spacing: 2px;
        margin: 0;
    }

    .mp-desc {
        font-size: 0.7rem;
        color: #445566;
        font-family: "JetBrains Mono", monospace;
        margin: 0;
        line-height: 1.4;
    }

    .mp-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 40px 0;
    }

    .mp-loading p {
        color: #556677;
        font-size: 0.8rem;
        margin: 0;
    }

    .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(0, 255, 255, 0.1);
        border-top-color: #00ffff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .divider {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #334455;
        font-size: 0.65rem;
        letter-spacing: 2px;
    }

    .divider::before,
    .divider::after {
        content: "";
        flex: 1;
        height: 1px;
        background: rgba(255, 255, 255, 0.04);
    }

    .join-row {
        display: flex;
        gap: 8px;
    }

    .room-input {
        flex: 1;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        color: #ddeeff;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.85rem;
        outline: none;
        transition: border-color 0.2s;
    }

    .room-input:focus {
        border-color: rgba(0, 255, 255, 0.3);
    }

    .room-input::placeholder {
        color: #334455;
    }

    .join-btn {
        padding: 10px 20px;
        background: transparent;
        border: 1px solid #00aaaa;
        color: #00aaaa;
        font-family: "Orbitron", sans-serif;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 1px;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
    }

    .join-btn:hover:not(:disabled) {
        background: rgba(0, 170, 170, 0.1);
        color: #00ffff;
        border-color: #00ffff;
    }

    .join-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .error-msg {
        padding: 10px 14px;
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 6px;
        color: #ff6666;
        font-size: 0.75rem;
        font-family: "JetBrains Mono", monospace;
    }

    /* ── Lobby (Connected) ───────────────────────── */
    .room-info-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: rgba(0, 255, 255, 0.03);
        border: 1px solid rgba(0, 255, 255, 0.08);
        border-radius: 8px;
    }

    .room-id-block {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .room-label {
        font-size: 0.55rem;
        color: #556677;
        letter-spacing: 2px;
    }

    .room-code {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.85rem;
        color: #00ffff;
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 8px;
        border-radius: 4px;
    }

    .copy-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.85rem;
        opacity: 0.5;
        transition: opacity 0.2s;
    }

    .copy-btn:hover {
        opacity: 1;
    }

    .player-count-badge {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8rem;
        color: #667788;
    }

    .players-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .players-list h3 {
        font-size: 0.65rem;
        color: #556677;
        letter-spacing: 2px;
        margin: 0;
    }

    .players-list ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .player-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 6px;
        transition: background 0.2s;
    }

    .player-row:hover {
        background: rgba(255, 255, 255, 0.04);
    }

    .player-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .player-name {
        font-size: 0.8rem;
        color: #bbccdd;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .badge {
        font-size: 0.5rem;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 700;
        letter-spacing: 1px;
    }

    .badge.host {
        background: rgba(255, 170, 0, 0.15);
        color: #ffaa00;
        border: 1px solid rgba(255, 170, 0, 0.3);
    }

    .badge.you {
        background: rgba(0, 255, 255, 0.1);
        color: #00ffff;
        border: 1px solid rgba(0, 255, 255, 0.2);
    }

    .badge.ai {
        background: rgba(128, 128, 128, 0.15);
        color: #888;
        border: 1px solid rgba(128, 128, 128, 0.3);
    }

    .waiting-text {
        color: #445566;
        font-size: 0.75rem;
        font-family: "JetBrains Mono", monospace;
        text-align: center;
        margin: 0;
    }

    .lobby-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .leave-btn {
        background: transparent;
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #aa5555;
        padding: 10px;
        font-family: "Orbitron", sans-serif;
        font-size: 0.7rem;
        letter-spacing: 1px;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
    }

    .leave-btn:hover {
        background: rgba(239, 68, 68, 0.08);
        color: #ff6666;
        border-color: rgba(239, 68, 68, 0.5);
    }

    /* ============================================================ */
    /*  ROOM BROWSER                                                 */
    /* ============================================================ */

    .room-browser {
        border-top: 1px solid rgba(100, 220, 255, 0.1);
        padding-top: 1rem;
        margin-top: 0.5rem;
    }

    .browser-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .browser-header h3 {
        margin: 0;
    }

    .refresh-btn {
        background: rgba(100, 220, 255, 0.08);
        border: 1px solid rgba(100, 220, 255, 0.2);
        color: #8be5ff;
        padding: 0.25rem 0.75rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.75rem;
        transition: all 0.2s;
    }

    .refresh-btn:hover:not(:disabled) {
        background: rgba(100, 220, 255, 0.15);
        border-color: rgba(100, 220, 255, 0.4);
    }

    .refresh-btn:disabled {
        opacity: 0.5;
        cursor: default;
    }

    .room-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        max-height: 180px;
        overflow-y: auto;
    }

    .room-card {
        background: rgba(100, 220, 255, 0.04);
        border: 1px solid rgba(100, 220, 255, 0.12);
        border-radius: 8px;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .room-card:hover {
        background: rgba(100, 220, 255, 0.1);
        border-color: rgba(100, 220, 255, 0.3);
        transform: translateY(-1px);
    }

    .room-card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.2rem;
    }

    .room-host {
        font-weight: 600;
        color: #cce8ff;
        font-size: 0.85rem;
    }

    .room-phase {
        font-size: 0.65rem;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .room-phase.lobby {
        background: rgba(100, 220, 255, 0.15);
        color: #8be5ff;
    }

    .room-phase.playing {
        background: rgba(239, 68, 68, 0.15);
        color: #ff8888;
    }

    .room-card-bottom {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #88a0b8;
    }

    .room-map {
        text-transform: capitalize;
    }

    /* ============================================================ */
    /*  JOIN CONFIRMATION MODAL                                      */
    /* ============================================================ */

    .confirm-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
    }

    .confirm-dialog {
        background: linear-gradient(145deg, #0a1628, #0d1f38);
        border: 1px solid rgba(100, 220, 255, 0.25);
        border-radius: 12px;
        padding: 1.5rem 2rem;
        max-width: 340px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .confirm-dialog h3 {
        margin: 0 0 0.75rem;
        color: #cce8ff;
        font-size: 1.2rem;
    }

    .confirm-dialog p {
        margin: 0.3rem 0;
        color: #88a0b8;
        font-size: 0.85rem;
    }

    .confirm-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1.25rem;
        justify-content: center;
    }

    /* ============================================================ */
    /*  PER-PLAYER CONFIG                                            */
    /* ============================================================ */

    .player-config-section {
        border-top: 1px solid rgba(100, 220, 255, 0.08);
        padding-top: 0.75rem;
    }

    .player-config-list {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .player-config-row {
        background: rgba(100, 220, 255, 0.03);
        border: 1px solid rgba(100, 220, 255, 0.08);
        border-radius: 6px;
        overflow: hidden;
    }

    .player-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.6rem;
        cursor: pointer;
        transition: background 0.15s;
    }

    .player-header:hover {
        background: rgba(100, 220, 255, 0.06);
    }

    .player-swatch {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 6px rgba(100, 220, 255, 0.2);
    }

    .player-label {
        flex: 1;
        font-size: 0.8rem;
        font-weight: 600;
        color: #cce8ff;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .player-expand {
        color: #5a7a96;
        font-size: 0.7rem;
    }

    .player-details {
        padding: 0.5rem 0.6rem 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-top: 1px solid rgba(100, 220, 255, 0.06);
        background: rgba(0, 0, 0, 0.15);
    }

    .hue-control {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .hue-control label {
        font-size: 0.7rem;
        color: #5a7a96;
        min-width: 36px;
    }

    .hue-slider {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        height: 8px;
        border-radius: 4px;
        background: linear-gradient(
            to right,
            hsl(0, 70%, 55%),
            hsl(60, 70%, 55%),
            hsl(120, 70%, 55%),
            hsl(180, 70%, 55%),
            hsl(240, 70%, 55%),
            hsl(300, 70%, 55%),
            hsl(360, 70%, 55%)
        );
        outline: none;
        cursor: pointer;
    }

    .hue-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: hsl(var(--hue, 210), 70%, 55%);
        border: 2px solid #fff;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
        cursor: pointer;
    }

    .hue-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: hsl(var(--hue, 210), 70%, 55%);
        border: 2px solid #fff;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
        cursor: pointer;
    }

    .hue-preview {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .ai-setting {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .ai-setting label {
        font-size: 0.7rem;
        color: #5a7a96;
        min-width: 56px;
    }

    .ai-setting select {
        flex: 1;
        background: rgba(5, 15, 30, 0.6);
        border: 1px solid rgba(100, 220, 255, 0.15);
        color: #cce8ff;
        padding: 0.25rem 0.4rem;
        border-radius: 4px;
        font-size: 0.75rem;
        cursor: pointer;
    }

    .ai-setting select:focus {
        outline: 1px solid rgba(100, 220, 255, 0.4);
    }
</style>
