<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { fade, fly } from "svelte/transition";
    import type { GameSettings } from "$lib/types/game.types";
    import {
        enforcePerceptualSpacing,
        MIN_DELTA_E,
    } from "$lib/utils/colorDistance";
    import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";
    import type { RoomListing } from "$lib/stores/multiplayerStore.svelte";
    import { log } from "$lib/utils/logger";

    let visible = $state(true);

    // â”€â”€ Game Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Auto-switch to MP when connected
    let gameMode = $state<"sp" | "mp">(
        multiplayerStore.isConnected
            ? "mp"
            : typeof localStorage !== "undefined" &&
                localStorage.getItem("pax_gameMode") === "mp"
              ? "mp"
              : "sp",
    );

    // Persist gameMode so MP tab survives reload
    $effect(() => {
        localStorage.setItem("pax_gameMode", gameMode);
    });

    // Auto-save player identity and sync to multiplayerStore
    $effect(() => {
        saveSetting("playerName", playerName);
        multiplayerStore.playerName = playerName || "Commander";
    });
    $effect(() => {
        const hex = hslToHex(playerConfigs[0]?.hue ?? 210);
        multiplayerStore.playerColor = hex;
    });

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

    // â”€â”€ Settings (localStorage-persisted) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    /** Convert HSL hue (0-360) with configurable S/L to hex string */
    function hslToHex(
        hue: number,
        s = colorSat / 100,
        l = colorLig / 100,
    ): string {
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + hue / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color)
                .toString(16)
                .padStart(2, "0");
        };
        return `#${f(0)}${f(8)}${f(4)}`;
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
    let allowOpposingOrders = $state(loadSetting("allowOpposingOrders", false));
    let tickDuration = $state(loadSetting("tickDuration", 500));

    // Player identity (persisted)
    let playerName = $state(loadSetting("playerName", "Commander"));

    // Global color palette controls (persisted)
    let colorSat = $state(loadSetting("colorSat", 70)); // 40-100
    let colorLig = $state(loadSetting("colorLig", 55)); // 30-70

    // AI details toggle
    let showAIDetails = $state(false);
    let showColorPalette = $state(false);

    // MP Join state
    let joinRoomId = $state("");

    // Room browser state
    let confirmJoinTarget = $state<RoomListing | null>(null);
    let selectedTakeOverId = $state<string | null>(null);

    // Auto-refresh room list when MP tab is visible
    $effect(() => {
        if (gameMode === "mp" && !multiplayerStore.isConnected) {
            multiplayerStore.startRoomPolling();
            return () => multiplayerStore.stopRoomPolling();
        } else {
            multiplayerStore.stopRoomPolling();
        }
    });

    // â”€â”€ Per-Player Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    let hueOffset = $state(loadSetting("hueOffset", 45));

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

    // Auto-distribute hues from P1's hue in SP mode
    $effect(() => {
        if (gameMode === "sp" && playerConfigs.length > 1) {
            const baseHue = playerConfigs[0].hue;
            for (let i = 1; i < playerConfigs.length; i++) {
                playerConfigs[i].hue = (baseHue + hueOffset * i) % 360;
            }
        }
    });

    let expandedPlayer = $state<number | null>(null);

    // â”€â”€ Map Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const MAP_DEFS: {
        id: string;
        label: string;
        mapType: "standard" | "debug" | "debug-b";
        stars: { x: number; y: number; color: string }[];
        connections: [number, number][];
    }[] = [
        {
            id: "standard",
            label: "RANDOMIZED",
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

    // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        saveSetting("allowOpposingOrders", allowOpposingOrders);
        saveSetting("playerConfigs", playerConfigs);
        saveSetting("hueOffset", hueOffset);
        saveSetting("tickDuration", tickDuration);
        saveSetting("playerName", playerName);
        saveSetting("colorSat", colorSat);
        saveSetting("colorLig", colorLig);
    }

    /** Enforce perceptual color spacing (CIEDE2000) between all players */
    function enforceHueSpacing() {
        const hues = playerConfigs.map((c) => c.hue);
        const corrected = enforcePerceptualSpacing(hues);
        for (let i = 0; i < corrected.length; i++) {
            playerConfigs[i].hue = corrected[i];
        }
    }

    function applyConfig() {
        // Enforce min hue spacing before applying colors
        enforceHueSpacing();

        GAME_CONFIG.STARS_PER_PLAYER = starsPerPlayer;
        GAME_CONFIG.STARTING_SHIPS = shipsPerStar;
        GAME_CONFIG.MIN_LINKS_PER_STAR = minLinks;
        GAME_CONFIG.MAX_LINKS_PER_STAR = maxLinks;
        GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST = retainOrderOnConquest;
        GAME_CONFIG.ALLOW_OPPOSING_ORDERS = allowOpposingOrders;

        const selectedMap =
            MAP_DEFS.find((m) => m.id === mapType) ?? MAP_DEFS[0];

        gameStore.updateSettings({
            playerCount,
            mapType: selectedMap.mapType,
            minLinksPerStar: minLinks,
            maxLinksPerStar: maxLinks,
            starSpacing: starSpacing,
            gameSpeed: tickDuration,
            playerColors: playerConfigs.map((cfg) => hslToHex(cfg.hue)),
        });

        GAME_CONFIG.CONQUEST_SLOWMO_ENABLED = selectedMap.mapType === "debug-b";
    }

    function startSPGame() {
        saveAllSettings();
        applyConfig();
        gameStore.restart();
        visible = false;
    }

    // â”€â”€ MP handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    import { buildEngineConfig } from "$lib/config/game.config";

    async function handleCreateRoom() {
        saveAllSettings();
        applyConfig();

        const selectedMap =
            MAP_DEFS.find((m) => m.id === mapType) ?? MAP_DEFS[0];

        const gameplayConfig = buildEngineConfig();

        // Wire ALL setup variables to MP room (F-65)
        await multiplayerStore.createRoom({
            playerCount,
            mapType: selectedMap.mapType,
            starsPerPlayer,
            shipsPerStar,
            starSpacing,
            minLinks,
            maxLinks,
            retainOrderOnConquest,
            gameplayConfig,
        });

        // Also set player identity on the store
        multiplayerStore.playerName = playerName || "Commander";
        multiplayerStore.playerColor = hslToHex(playerConfigs[0]?.hue ?? 210);
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
        // Pass takeOverId for in-progress games (AI takeover)
        const takeOver =
            confirmJoinTarget.metadata?.phase === "playing"
                ? selectedTakeOverId || undefined
                : undefined;
        await multiplayerStore.joinRoomById(confirmJoinTarget.roomId, takeOver);
        confirmJoinTarget = null;
        selectedTakeOverId = null;
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

            <!-- ═══ Responsive tabs (small screens only)  -->
            <div class="responsive-tabs">
                <button
                    class="tab-btn"
                    class:active={gameMode === "sp"}
                    onclick={() => (gameMode = "sp")}
                >
                    🎮 GAME
                </button>
                <button
                    class="tab-btn"
                    class:active={gameMode === "mp"}
                    onclick={() => (gameMode = "mp")}
                >
                    🌐 MULTIPLAYER
                    {#if multiplayerStore.isConnected}
                        <span class="connected-dot"></span>
                    {/if}
                </button>
            </div>

            <!--  3-Column Layout  -->
            <div class="content-grid-3col">
                <!--  Col 1: Options  -->
                <section
                    class="panel menu-sidebar"
                    class:panel-dimmed={gameMode === "mp"}
                >
                    <h2 class="panel-title">OPTIONS</h2>

                    <div class="options-list">
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                bind:checked={retainOrderOnConquest}
                            />
                            <span>Retain orders after conquest</span>
                            <span class="tooltip"
                                >Attack orders become movement orders when
                                target is captured</span
                            >
                        </label>
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                bind:checked={allowOpposingOrders}
                            />
                            <span>Allow opposing orders</span>
                            <span class="tooltip"
                                >A→B and B→A movement orders can coexist
                                (default: off = opposing cancels)</span
                            >
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" checked disabled />
                            <span>Auto-select new conquests</span>
                            <span class="tooltip"
                                >Automatically select newly captured stars</span
                            >
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Fog of war</span>
                            <span class="tooltip"
                                >Only see stars within sensor range (coming
                                soon)</span
                            >
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Show production rates</span>
                            <span class="tooltip"
                                >Display ship production numbers on each star</span
                            >
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Show movement trails</span>
                            <span class="tooltip"
                                >Visualize ship movement paths between stars</span
                            >
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Auto-pause on combat</span>
                            <span class="tooltip"
                                >Pause game speed when battles occur</span
                            >
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Surrender when hopeless</span>
                            <span class="tooltip"
                                >AI declares surrender when defeat is certain
                                (coming soon)</span
                            >
                        </label>
                    </div>
                </section>

                <!--  Col 2: Game Setup  -->
                <section
                    class="panel config-panel"
                    class:panel-dimmed={gameMode === "mp"}
                >
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

                    <!-- Links + Spacing (side by side) -->
                    <div class="config-dual-row">
                        <div class="control-group">
                            <label>LINKS</label>
                            <div class="config-dual-row compact">
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
                        <div class="control-group">
                            <label>SPACING</label>
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
                                <span class="value"
                                    >{starSpacing.toFixed(1)}x</span
                                >
                            </div>
                        </div>
                    </div>

                    <!-- ─── Section: Match Rules ─── -->
                    <div class="section-divider"></div>

                    <!-- Players + Stars + Ships (one row) -->
                    <div class="config-triple-row">
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
                        <div class="config-item">
                            <label>STARS/P</label>
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
                            <label>SHIPS/S</label>
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

                    <!-- Tick Duration + Start -->
                    <div class="speed-start-row">
                        <div class="config-item speed-control">
                            <label>TICK DURATION</label>
                            <div class="slider-container">
                                <span class="mini-label">FAST</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="3000"
                                    step="250"
                                    bind:value={tickDuration}
                                />
                                <span class="mini-label">SLOW</span>
                                <span class="value"
                                    >{(tickDuration / 1000).toFixed(2)}s</span
                                >
                            </div>
                        </div>
                        <button class="start-btn" onclick={startSPGame}>
                            <span class="btn-glow"></span>
                            START GAME
                        </button>
                    </div>

                    <!-- ─── Section: Forces ─── -->
                    <div class="section-divider"></div>

                    <!-- Player Configuration -->
                    <div class="control-group player-config-section">
                        <!-- YOUR COMMANDER identity widget -->
                        <div class="identity-widget">
                            <div class="identity-swatch-wrap">
                                <span
                                    class="identity-swatch"
                                    style:background-color="hsl({playerConfigs[0]
                                        ?.hue ?? 210}, {colorSat}%, {colorLig}%)"
                                ></span>
                            </div>
                            <div class="identity-fields">
                                <label class="identity-label"
                                    >YOUR COMMANDER</label
                                >
                                <input
                                    type="text"
                                    class="identity-name-input"
                                    bind:value={playerName}
                                    placeholder="Enter name..."
                                    maxlength="20"
                                />
                                <div class="identity-hue-row">
                                    <span class="mini-label">COLOR</span>
                                    <input
                                        type="range"
                                        class="hue-slider identity-hue"
                                        min="0"
                                        max="360"
                                        bind:value={playerConfigs[0].hue}
                                        style:--hue={playerConfigs[0]?.hue ??
                                            210}
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- AI Players -->
                        <div class="player-config-header">
                            <label>AI OPPONENTS</label>
                            <button
                                class="toggle-details-btn"
                                onclick={() =>
                                    (showColorPalette = !showColorPalette)}
                                title="Color palette"
                            >
                                🎨
                            </button>
                            <button
                                class="toggle-details-btn"
                                onclick={() => (showAIDetails = !showAIDetails)}
                                title={showAIDetails
                                    ? "Hide advanced"
                                    : "Show advanced"}
                            >
                                {showAIDetails ? "▾ Advanced" : "▸ Advanced"}
                            </button>
                        </div>

                        {#if showColorPalette}
                            <div
                                class="color-palette-row"
                                transition:fly={{ y: -8, duration: 150 }}
                            >
                                <div class="hue-offset-inline">
                                    <span class="mini-label">HUE</span>
                                    <input
                                        type="range"
                                        min="10"
                                        max="120"
                                        bind:value={hueOffset}
                                    />
                                    <span class="value">{hueOffset}</span>
                                </div>
                                <div class="hue-offset-inline">
                                    <span class="mini-label">SAT</span>
                                    <input
                                        type="range"
                                        min="40"
                                        max="100"
                                        bind:value={colorSat}
                                    />
                                    <span class="value">{colorSat}%</span>
                                </div>
                                <div class="hue-offset-inline">
                                    <span class="mini-label">LUM</span>
                                    <input
                                        type="range"
                                        min="30"
                                        max="70"
                                        bind:value={colorLig}
                                    />
                                    <span class="value">{colorLig}%</span>
                                </div>
                            </div>
                        {/if}

                        <div class="player-config-list">
                            {#each playerConfigs as cfg, i}
                                {#if i > 0}
                                    <div class="player-config-row inline-row">
                                        <span
                                            class="player-swatch"
                                            style:background-color="hsl({cfg.hue},
                                            {colorSat}%, {colorLig}%)"
                                        ></span>
                                        <span class="player-label-inline">
                                            P{i + 1}
                                        </span>
                                        <select
                                            class="inline-select"
                                            bind:value={
                                                playerConfigs[i].difficulty
                                            }
                                        >
                                            {#each DIFFICULTIES as d}
                                                <option value={d}>{d}</option>
                                            {/each}
                                        </select>
                                        {#if showAIDetails}
                                            <input
                                                type="range"
                                                class="hue-slider compact"
                                                min="0"
                                                max="360"
                                                bind:value={
                                                    playerConfigs[i].hue
                                                }
                                                style:--hue={cfg.hue}
                                            />
                                            <select
                                                class="inline-select"
                                                bind:value={
                                                    playerConfigs[i].strategy
                                                }
                                            >
                                                {#each AI_STRATEGIES as s}
                                                    <option value={s.id}
                                                        >{s.label}</option
                                                    >
                                                {/each}
                                            </select>
                                        {/if}
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    </div>
                </section>

                <!--  Col 3: Multiplayer (visually distinct)  -->
                <section class="panel mp-panel">
                    <h2 class="panel-title">
                        🌐 MULTIPLAYER
                        {#if multiplayerStore.isConnected}
                            <span class="connected-dot"></span>
                        {/if}
                    </h2>

                    {#if multiplayerStore.isConnected}
                        <!--  Connected Lobby  -->
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
                                    START GAME
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
                    {:else}
                        <!--  Not Connected  -->
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
                                </p>
                                <button
                                    class="start-btn mp-btn"
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
                                            ? ""
                                            : ""} Refresh
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
                                                <div class="room-card-mid">
                                                    <span class="room-map"
                                                        >{room.metadata
                                                            ?.mapType ||
                                                            "?"}</span
                                                    >
                                                    <span class="room-detail"
                                                        >⭐ {room.metadata
                                                            ?.starsPerPlayer ||
                                                            "?"}/p</span
                                                    >
                                                    <span class="room-detail"
                                                        >🚀 {room.metadata
                                                            ?.shipsPerStar ||
                                                            "?"}/star</span
                                                    >
                                                    {#if room.metadata?.phase === "playing" && room.metadata?.tick}
                                                        <span
                                                            class="room-detail tick-badge"
                                                            >T{room.metadata
                                                                .tick}</span
                                                        >
                                                    {/if}
                                                </div>
                                                <div class="room-card-bottom">
                                                    <span class="room-slots">
                                                        {room.clients}/{room.maxClients}
                                                        players
                                                    </span>
                                                </div>
                                                {#if room.metadata?.playerNames?.length}
                                                    <div class="room-players">
                                                        {#each room.metadata.playerNames as pname}
                                                            <span
                                                                class="player-chip"
                                                                >{pname}</span
                                                            >
                                                        {/each}
                                                    </div>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>

                            {#if multiplayerStore.lobbyStatus}
                                <div class="lobby-status-msg">
                                    ⏳ {multiplayerStore.lobbyStatus}
                                </div>
                            {/if}
                            {#if multiplayerStore.connectionError}
                                <div class="error-msg">
                                    {multiplayerStore.connectionError}
                                </div>
                            {/if}
                        {/if}
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
        onclick={() => {
            confirmJoinTarget = null;
            selectedTakeOverId = null;
        }}
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

            {#if confirmJoinTarget.metadata?.phase === "playing" && confirmJoinTarget.metadata?.aiPlayers?.length}
                <div class="ai-select">
                    <p class="ai-label">Take over an AI player:</p>
                    <div class="ai-list">
                        {#each confirmJoinTarget.metadata.aiPlayers as ai}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="ai-chip"
                                class:selected={selectedTakeOverId ===
                                    ai.sessionId}
                                onclick={() =>
                                    (selectedTakeOverId = ai.sessionId)}
                            >
                                <span
                                    class="ai-color"
                                    style="background: {ai.color}"
                                ></span>
                                {ai.name}
                            </div>
                        {/each}
                    </div>
                </div>
            {:else if confirmJoinTarget.metadata?.phase === "playing"}
                <p class="error-msg" style="margin-top:0.5rem;">
                    No AI players available to take over
                </p>
            {/if}

            <div class="confirm-actions">
                <button
                    class="start-btn"
                    onclick={handleConfirmJoin}
                    disabled={confirmJoinTarget.metadata?.phase === "playing" &&
                        !confirmJoinTarget.metadata?.aiPlayers?.length}
                >
                    <span class="btn-glow"></span>
                    {confirmJoinTarget.metadata?.phase === "playing"
                        ? "TAKE OVER"
                        : "JOIN"}
                </button>
                <button
                    class="leave-btn"
                    onclick={() => {
                        confirmJoinTarget = null;
                        selectedTakeOverId = null;
                    }}>Cancel</button
                >
            </div>
        </div>
    </div>
{/if}

<style>
    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    /*  UNIFIED FULL-PAGE MENU                                        */
    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
        background:
            /* Hex grid overlay */
            repeating-linear-gradient(
                0deg,
                transparent,
                transparent 40px,
                rgba(0, 255, 255, 0.015) 40px,
                rgba(0, 255, 255, 0.015) 41px
            ),
            repeating-linear-gradient(
                90deg,
                transparent,
                transparent 40px,
                rgba(0, 255, 255, 0.015) 40px,
                rgba(0, 255, 255, 0.015) 41px
            ),
            /* Main radial gradient */
                radial-gradient(
                    ellipse at 50% 20%,
                    rgba(0, 40, 60, 0.35) 0%,
                    rgba(5, 10, 25, 0.95) 60%,
                    #050510 100%
                );
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: "Orbitron", sans-serif;
    }

    .menu-container {
        width: 95vw;
        max-width: 1200px;
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

    /* â”€â”€ Title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Mode Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    /* -- Responsive Tabs (small screens only) -- */
    .responsive-tabs {
        display: none;
        gap: 2px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 4px;
        align-self: center;
    }

    .tab-btn {
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
    }

    .tab-btn:hover {
        color: #8899aa;
        background: rgba(255, 255, 255, 0.03);
    }

    .tab-btn.active {
        color: #00ffff;
        background: rgba(0, 255, 255, 0.06);
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.06);
    }

    .connected-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #22cc66;
        box-shadow: 0 0 6px #22cc66;
        display: inline-block;
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

    /* -- 3-Column Grid (Named Areas) -- */
    .content-grid-3col {
        display: grid;
        grid-template-columns: 180px 1fr 280px;
        grid-template-areas: "menu config multiplayer";
        gap: 20px;
    }

    .menu-sidebar {
        grid-area: menu;
    }
    .config-panel {
        grid-area: config;
    }
    .mp-panel {
        grid-area: multiplayer;
    }

    @media (max-width: 900px) {
        .responsive-tabs {
            display: flex;
        }
        .content-grid-3col {
            grid-template-columns: 1fr;
            grid-template-areas: "menu" "config" "multiplayer";
        }
    }

    /* -- Menu Sidebar -- */
    .menu-nav {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border: none;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        color: #8899aa;
        font-family: "Orbitron", sans-serif;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        width: 100%;
    }

    .menu-item:hover:not(:disabled) {
        background: rgba(0, 255, 255, 0.06);
        color: #00ffff;
    }

    .menu-item:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .menu-item.quit-item:hover {
        background: rgba(239, 68, 68, 0.08);
        color: #ff6666;
    }

    .menu-icon {
        font-size: 1rem;
        width: 24px;
        text-align: center;
    }

    .button-row.compact {
        flex-direction: column;
    }

    .button-row.compact button {
        border-right: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .button-row.compact button:last-child {
        border-bottom: none;
    }

    /* -- MP Panel (visually distinct) -- */
    .mp-panel {
        background: rgba(8, 16, 32, 0.9);
        border: 1px solid rgba(100, 220, 255, 0.15);
        border-left: 3px solid rgba(100, 220, 255, 0.25);
        border-radius: 12px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        box-shadow:
            -4px 0 20px rgba(100, 220, 255, 0.04),
            inset 0 0 30px rgba(100, 220, 255, 0.02);
    }

    .mp-panel .panel-title {
        color: #64dcff;
        border-bottom-color: rgba(100, 220, 255, 0.12);
    }

    .mp-btn {
        font-size: 0.85rem;
        padding: 12px;
    }

    /* ── Phase B: Section Dividers ──────── */
    .section-divider {
        height: 1px;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 255, 0.12),
            transparent
        );
        margin: 4px 0;
    }

    .panel-dimmed {
        opacity: 0.35;
        pointer-events: none;
        filter: saturate(0.3);
        transition:
            opacity 0.3s,
            filter 0.3s;
    }

    .toggle-details-btn {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        color: #667788;
        font-size: 0.6rem;
        padding: 2px 8px;
        cursor: pointer;
        transition: all 0.15s;
        font-family: "Exo", sans-serif;
        letter-spacing: 0.5px;
    }
    .toggle-details-btn:hover {
        background: rgba(0, 255, 255, 0.06);
        color: #00cccc;
        border-color: rgba(0, 255, 255, 0.15);
    }

    .color-palette-row {
        display: flex;
        gap: 12px;
        padding: 8px 10px;
        background: rgba(0, 255, 255, 0.02);
        border: 1px solid rgba(0, 255, 255, 0.06);
        border-radius: 6px;
    }

    /* â”€â”€ Panels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .panel {
        background: linear-gradient(
            165deg,
            rgba(10, 18, 35, 0.92) 0%,
            rgba(6, 10, 22, 0.88) 100%
        );
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        clip-path: polygon(
            12px 0%,
            calc(100% - 12px) 0%,
            100% 12px,
            100% calc(100% - 12px),
            calc(100% - 12px) 100%,
            12px 100%,
            0% calc(100% - 12px),
            0% 12px
        );
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        box-shadow:
            inset 0 1px 0 rgba(0, 255, 255, 0.04),
            inset 0 0 40px rgba(0, 20, 40, 0.3);
    }

    .panel-title {
        font-size: 0.75rem;
        color: #668899;
        letter-spacing: 3px;
        margin: 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(0, 255, 255, 0.06);
        text-shadow: 0 0 8px rgba(0, 255, 255, 0.1);
    }

    /* â”€â”€ Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    label {
        font-size: 0.65rem;
        color: #778899;
        letter-spacing: 1.5px;
        font-weight: 700;
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
        color: #334455;
        letter-spacing: 1px;
        text-transform: uppercase;
    }

    .slider-container {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 28px;
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

    /* Rainbow hue slider track */
    .hue-slider {
        background: linear-gradient(
            to right,
            hsl(0, 80%, 55%),
            hsl(30, 80%, 55%),
            hsl(60, 80%, 55%),
            hsl(120, 80%, 55%),
            hsl(180, 80%, 55%),
            hsl(210, 80%, 55%),
            hsl(270, 80%, 55%),
            hsl(330, 80%, 55%),
            hsl(360, 80%, 55%)
        ) !important;
        height: 6px !important;
        border-radius: 3px !important;
    }

    .value {
        color: #00ffff;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.75rem;
        min-width: 32px;
        text-align: right;
        white-space: nowrap;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 500;
        color: #99aabb;
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

    /* â”€â”€ Start Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* ── Identity Widget ──────────────────── */
    .identity-widget {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 10px 12px;
        background: rgba(0, 255, 255, 0.03);
        border: 1px solid rgba(0, 255, 255, 0.12);
        border-radius: 8px;
        margin-bottom: 10px;
    }

    .identity-swatch-wrap {
        flex-shrink: 0;
    }

    .identity-swatch {
        display: block;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        box-shadow:
            0 0 12px rgba(0, 0, 0, 0.4),
            inset 0 0 6px rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.15);
    }

    .identity-fields {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .identity-label {
        font-family: "Exo", sans-serif;
        font-size: 0.6rem;
        font-weight: 800;
        letter-spacing: 0.15em;
        color: rgba(0, 255, 255, 0.6);
        text-transform: uppercase;
    }

    .identity-name-input {
        width: 100%;
        padding: 5px 8px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: #ddeeff;
        font-family: "Montserrat", sans-serif;
        font-size: 0.85rem;
        font-weight: 600;
        outline: none;
        transition: border-color 0.15s;
    }
    .identity-name-input:focus {
        border-color: rgba(0, 255, 255, 0.3);
    }
    .identity-name-input::placeholder {
        color: #334455;
    }

    .identity-hue-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .identity-hue {
        flex: 1;
    }

    .spacer {
        flex: 1;
    }

    /* â”€â”€ MP Specific â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    .lobby-status-msg {
        padding: 10px 14px;
        background: rgba(255, 180, 40, 0.08);
        border: 1px solid rgba(255, 180, 40, 0.2);
        border-radius: 6px;
        color: #ffb428;
        font-size: 0.75rem;
        font-family: "JetBrains Mono", monospace;
        animation: pulse-status 2s ease-in-out infinite;
    }

    @keyframes pulse-status {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.6;
        }
    }

    /* â”€â”€ Lobby (Connected) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* Player identity inputs */
    .player-identity {
        margin-bottom: 0.25rem;
    }
    .identity-row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    .mp-input {
        flex: 1;
        background: rgba(100, 220, 255, 0.06);
        border: 1px solid rgba(100, 220, 255, 0.15);
        border-radius: 6px;
        padding: 0.4rem 0.6rem;
        color: #cce8ff;
        font-size: 0.85rem;
        outline: none;
        transition: border-color 0.2s;
    }
    .mp-input:focus {
        border-color: rgba(100, 220, 255, 0.4);
    }
    .mp-input::placeholder {
        color: #5a7a90;
    }
    .color-picker {
        width: 36px;
        height: 36px;
        border: 1px solid rgba(100, 220, 255, 0.15);
        border-radius: 6px;
        background: transparent;
        cursor: pointer;
        padding: 2px;
    }

    /* Room card - mid row with details */
    .room-card-mid {
        display: flex;
        gap: 0.5rem;
        font-size: 0.7rem;
        color: #7a9ab8;
        margin-bottom: 0.25rem;
        flex-wrap: wrap;
    }
    .room-detail {
        opacity: 0.8;
    }
    .tick-badge {
        color: #ff8888;
        font-weight: 600;
    }

    /* Player name chips */
    .room-players {
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
        margin-top: 0.25rem;
    }
    .player-chip {
        font-size: 0.6rem;
        background: rgba(100, 220, 255, 0.08);
        border: 1px solid rgba(100, 220, 255, 0.1);
        border-radius: 3px;
        padding: 1px 5px;
        color: #8aafcc;
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
        z-index: 10000;
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

    /* AI takeover selection */
    .ai-select {
        margin-top: 0.75rem;
    }
    .ai-label {
        font-size: 0.75rem;
        color: #8a9db0;
        margin-bottom: 0.4rem;
    }
    .ai-list {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
    }
    .ai-chip {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        font-size: 0.75rem;
        background: rgba(100, 220, 255, 0.06);
        border: 1px solid rgba(100, 220, 255, 0.12);
        color: #8aafcc;
        cursor: pointer;
        transition: all 0.15s;
    }
    .ai-chip:hover {
        border-color: rgba(100, 220, 255, 0.3);
        background: rgba(100, 220, 255, 0.1);
    }
    .ai-chip.selected {
        border-color: rgba(100, 220, 255, 0.5);
        background: rgba(100, 220, 255, 0.15);
        color: #cce8ff;
    }
    .ai-color {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
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

    /* -- Options List (left column) -- */
    .options-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .options-list .checkbox-label {
        font-size: 0.65rem;
        padding: 4px 0;
    }

    /* -- Triple Row (Players | Stars | Ships) -- */
    .config-triple-row {
        display: grid;
        grid-template-columns: auto 1fr 1fr;
        gap: 12px;
        align-items: end;
    }

    .config-dual-row.compact {
        gap: 8px;
    }

    /* -- Player Config Inline -- */
    .player-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .hue-offset-inline {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .hue-offset-inline input[type="range"] {
        width: 60px;
    }

    .inline-row {
        display: grid;
        grid-template-columns: 20px 36px 1fr auto auto;
        grid-template-areas: "swatch name slider diff strat";
        gap: 8px;
        align-items: center;
        padding: 6px 10px;
    }

    .player-label-inline {
        font-size: 0.7rem;
        font-weight: 600;
        color: #cce8ff;
        white-space: nowrap;
    }

    .hue-slider.compact {
        height: 6px;
    }

    .inline-select {
        background: rgba(5, 15, 30, 0.6);
        border: 1px solid rgba(100, 220, 255, 0.15);
        color: #cce8ff;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 0.65rem;
        cursor: pointer;
        min-width: 60px;
    }

    .inline-select:focus {
        outline: 1px solid rgba(100, 220, 255, 0.4);
    }

    .human-badge {
        font-size: 0.5rem;
        padding: 2px 8px;
        border-radius: 3px;
        font-weight: 700;
        letter-spacing: 1px;
        background: rgba(0, 255, 255, 0.1);
        color: #00ffff;
        border: 1px solid rgba(0, 255, 255, 0.2);
    }

    /* -- Speed + Start Row -- */
    .speed-start-row {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-areas: "speed start";
        gap: 16px;
        align-items: end;
    }

    .speed-control {
        grid-area: speed;
    }

    .speed-control .button-row {
        gap: 0;
    }
</style>
