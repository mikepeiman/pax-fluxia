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
    import {
        AI_STRATEGIES,
        type PlayerConfig,
        makeDefaultPlayerConfigs,
        MAP_DEFS,
        PLAYERS,
        DIFFICULTIES,
        hslToHex as hslToHexBase,
    } from "./menuDefs";

    let visible = $state(true);

    // ── Background Switcher ──
    let bgImages = $state<string[]>([]);
    let bgOpen = $state(false);
    let bgImage = $state(
        typeof localStorage !== "undefined"
            ? localStorage.getItem("pax_bgImage") || "pax-fluxia-bg-4.jpg"
            : "pax-fluxia-bg-4.jpg",
    );
    $effect(() => {
        localStorage.setItem("pax_bgImage", bgImage);
    });
    $effect(() => {
        fetch("/api/backgrounds")
            .then((r) => r.json())
            .then((imgs: string[]) => {
                bgImages = imgs;
            })
            .catch(() => {});
    });

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

    /** HSL hue → hex using current palette sat/lig settings */
    function hslToHex(hue: number): string {
        return hslToHexBase(hue, colorSat / 100, colorLig / 100);
    }

    // Config state
    let showMobileOptions = $state(false);
    let gameSetupOpen = $state(false);
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
    let tickDuration = $state(loadSetting("tickDuration", 1250));

    // Player identity (persisted)
    let playerName = $state(loadSetting("playerName", "Commander"));

    // Global color palette controls (persisted)
    let colorSat = $state(loadSetting("colorSat", 70)); // 40-100
    let colorLig = $state(loadSetting("colorLig", 55)); // 30-70

    let showAIDetails = $state(false);
    let showColorPalette = $state(false);
    let showPlayerHuePicker = $state(false);

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
    <div
        class="menu-fullscreen"
        transition:fade
        style:background-image={bgImage ? `url(/assets/${bgImage})` : "none"}
        style:background-size={bgImage ? "cover" : "auto"}
        style:background-position={bgImage ? "center" : "auto"}
    >
        <!-- Hex grid overlay — inline SVG with pattern -->
        <svg
            class="hex-grid-overlay"
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
        >
            <defs>
                <pattern
                    id="hexPattern"
                    width="56"
                    height="100"
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.0"
                    />
                    <path
                        d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.0"
                    />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexPattern)" />
        </svg>

        <!-- Background picker (floating top-right) -->
        <div class="bg-picker">
            <button
                class="bg-picker-toggle"
                onclick={() => (bgOpen = !bgOpen)}
                title="Change background"
            >
                🖼️
            </button>
            {#if bgOpen}
                <div
                    class="bg-picker-dropdown"
                    transition:fly={{ y: -8, duration: 150 }}
                >
                    <button
                        class="bg-thumb-btn"
                        class:active={!bgImage}
                        onclick={() => {
                            bgImage = "";
                            bgOpen = false;
                        }}
                    >
                        <span class="bg-thumb-none">∅</span>
                        <span class="bg-thumb-label">Default</span>
                    </button>
                    {#each bgImages as img}
                        <button
                            class="bg-thumb-btn"
                            class:active={bgImage === img}
                            onclick={() => {
                                bgImage = img;
                                bgOpen = false;
                            }}
                        >
                            <img
                                src="/assets/{img}"
                                alt={img}
                                class="bg-thumb-img"
                                loading="lazy"
                            />
                            <span class="bg-thumb-label"
                                >{img
                                    .replace(/\.(png|jpe?g|webp|avif)$/i, "")
                                    .replace(/^pax-fluxia-/, "")}</span
                            >
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
        <div class="menu-container" transition:fly={{ y: 20, duration: 400 }}>
            <!-- ═══ Title ═══ -->
            <header class="title-block">
                <h1 class="title">
                    <span class="pax">PAX</span>
                    <span class="fluxia">FLUXIA</span>
                </h1>
                <div class="subtitle">TERRITORY CONTROL STRATEGY</div>
            </header>

            <!-- M6: Slide-up options sheet (mobile only) -->
            {#if showMobileOptions}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="options-sheet-backdrop"
                    onclick={() => (showMobileOptions = false)}
                ></div>
                <div class="options-sheet">
                    <div class="options-sheet-header">
                        <h3
                            class="panel-title"
                            style="margin:0; border:none; padding:0;"
                        >
                            OPTIONS
                        </h3>
                        <button
                            class="options-sheet-close"
                            onclick={() => (showMobileOptions = false)}
                            >✕</button
                        >
                    </div>
                    <div class="options-list">
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                bind:checked={retainOrderOnConquest}
                            />
                            <span>Retain orders after conquest</span>
                        </label>
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                bind:checked={allowOpposingOrders}
                            />
                            <span>Allow opposing orders</span>
                        </label>
                        <label class="checkbox-label"
                            ><input type="checkbox" checked disabled />
                            <span>Auto-select new conquests</span></label
                        >
                        <label class="checkbox-label"
                            ><input type="checkbox" disabled />
                            <span>Fog of war</span></label
                        >
                        <label class="checkbox-label"
                            ><input type="checkbox" disabled />
                            <span>Show production rates</span></label
                        >
                        <label class="checkbox-label"
                            ><input type="checkbox" disabled />
                            <span>Show movement trails</span></label
                        >
                        <label class="checkbox-label"
                            ><input type="checkbox" disabled />
                            <span>Auto-pause on combat</span></label
                        >
                        <label class="checkbox-label"
                            ><input type="checkbox" disabled />
                            <span>Surrender when hopeless</span></label
                        >
                    </div>
                </div>
            {/if}

            <!-- ═══ SP / MP Tabs ═══ -->
            <nav class="responsive-tabs" role="tablist">
                <button
                    class="tab-btn"
                    role="tab"
                    aria-selected={gameMode === "sp"}
                    class:active={gameMode === "sp"}
                    onclick={() => (gameMode = "sp")}
                >
                    <span class="tab-icon">🎮</span>
                    <span class="tab-label">SINGLE PLAYER</span>
                </button>
                <button
                    class="tab-btn"
                    role="tab"
                    aria-selected={gameMode === "mp"}
                    class:active={gameMode === "mp"}
                    onclick={() => (gameMode = "mp")}
                >
                    <span class="tab-icon">🌐</span>
                    <span class="tab-label">MULTIPLAYER</span>
                    {#if multiplayerStore.isConnected}
                        <span class="connected-dot"></span>
                    {/if}
                </button>
            </nav>

            <!-- ═══ Main Content ═══ -->
            <div class="menu-content">
                <!-- ── Shared Game Setup (always visible) ── -->
                <section class="panel shared-setup">
                    <h2 class="section-heading">GAME SETUP</h2>

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
                                            {#if m.stars[a] && m.stars[b]}
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
                                            {/if}
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

                    <!-- Links + Spacing -->
                    <div class="config-triple-row">
                        <div class="config-item">
                            <label>Links min</label>
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
                            <label>Links max</label>
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
                        <div class="config-item">
                            <label>Spacing</label>
                            <div class="slider-container">
                                <input
                                    type="range"
                                    min="0.5"
                                    max="5.0"
                                    step="0.1"
                                    bind:value={starSpacing}
                                />
                                <span class="value"
                                    >{starSpacing.toFixed(1)}x</span
                                >
                            </div>
                        </div>
                    </div>

                    <div class="section-divider"></div>

                    <!-- Players + Stars + Ships -->
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
                            <label>Stars per player</label>
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
                            <label>Ships per star</label>
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

                    <div class="section-divider"></div>

                    <!-- Commander Identity -->
                    <div class="control-group">
                        <div class="identity-widget">
                            <div class="identity-swatch-wrap">
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <span
                                    class="identity-swatch"
                                    style:background-color="hsl({playerConfigs[0]
                                        ?.hue ?? 210}, {colorSat}%, {colorLig}%)"
                                    onclick={() =>
                                        (showPlayerHuePicker =
                                            !showPlayerHuePicker)}
                                    role="button"
                                    tabindex="0"
                                    title="Click to pick color"
                                ></span>
                                {#if showPlayerHuePicker}
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <div class="hue-popup">
                                        <input
                                            type="range"
                                            class="hue-slider hue-popup-slider"
                                            min="0"
                                            max="360"
                                            bind:value={playerConfigs[0].hue}
                                            style:--hue={playerConfigs[0]
                                                ?.hue ?? 210}
                                        />
                                    </div>
                                {/if}
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
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ═══ SP Tab Panel (keep-mounted, toggle with hidden) ═══ -->
                <section
                    class="panel sp-panel"
                    role="tabpanel"
                    hidden={gameMode !== "sp"}
                >
                    <h2 class="section-heading">SINGLE PLAYER</h2>

                    <div class="player-config-header">
                        <label>AI OPPONENTS</label>
                        <button
                            class="toggle-details-btn"
                            onclick={() =>
                                (showColorPalette = !showColorPalette)}
                            title="Color palette">🎨</button
                        >
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
                                <span class="mini-label">MIN OFFSET</span>
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
                                        style:background-color="hsl({cfg.hue}, {colorSat}%,
                                        {colorLig}%)"
                                    ></span>
                                    <span class="player-label-inline"
                                        >P{i + 1}</span
                                    >
                                    <select
                                        class="inline-select"
                                        bind:value={playerConfigs[i].difficulty}
                                    >
                                        {#each DIFFICULTIES as d}<option
                                                value={d}>{d}</option
                                            >{/each}
                                    </select>
                                    {#if showAIDetails}
                                        <input
                                            type="range"
                                            class="hue-slider compact"
                                            min="0"
                                            max="360"
                                            bind:value={playerConfigs[i].hue}
                                            style:--hue={cfg.hue}
                                        />
                                        <select
                                            class="inline-select"
                                            bind:value={
                                                playerConfigs[i].strategy
                                            }
                                        >
                                            {#each AI_STRATEGIES as s}<option
                                                    value={s.id}
                                                    >{s.label}</option
                                                >{/each}
                                        </select>
                                    {/if}
                                </div>
                            {/if}
                        {/each}
                    </div>

                    {#if gameStore.savedMaps.length > 0}
                        <div class="section-divider"></div>
                        <div class="config-item">
                            <label>SAVED MAPS</label>
                            <div class="saved-maps-list">
                                {#each gameStore.savedMaps as m}
                                    <div class="saved-map-row">
                                        <span class="saved-map-name"
                                            >{m.metadata.name}</span
                                        >
                                        <span class="saved-map-info"
                                            >{m.stars.length}★</span
                                        >
                                        <button
                                            class="saved-map-btn load"
                                            onclick={() => {
                                                gameStore.loadSavedMap(m);
                                                startSPGame();
                                            }}>▶</button
                                        >
                                        <button
                                            class="saved-map-btn del"
                                            onclick={() =>
                                                gameStore.deleteSavedMap(
                                                    m.metadata.name,
                                                )}>✕</button
                                        >
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <div class="section-divider"></div>
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
                    </div>

                    <button
                        class="start-btn start-btn-primary"
                        onclick={startSPGame}
                    >
                        <span class="btn-glow"></span>
                        START GAME
                    </button>
                </section>

                <!-- ═══ MP Tab Panel (keep-mounted, toggle with hidden) ═══ -->
                <section
                    class="panel mp-panel"
                    role="tabpanel"
                    hidden={gameMode !== "mp"}
                >
                    <h2 class="section-heading">
                        MULTIPLAYER
                        {#if multiplayerStore.isConnected}<span
                                class="connected-dot"
                            ></span>{/if}
                    </h2>

                    {#if multiplayerStore.isConnected}
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
                                ></button>
                            </div>
                            <div class="player-count-badge">
                                {multiplayerStore.playerCount} / {multiplayerStore.maxPlayers}
                            </div>
                        </div>
                        <div class="players-list">
                            <h3>Players ({multiplayerStore.players.length})</h3>
                            {#if multiplayerStore.players.length === 0}<p
                                    class="waiting-text"
                                >
                                    Waiting for players...
                                </p>{/if}
                            <ul>
                                {#each multiplayerStore.players as player}
                                    <li class="player-row">
                                        <span
                                            class="player-dot"
                                            style:background-color={player.color}
                                        ></span>
                                        <span class="player-name">
                                            {player.name}
                                            {#if player.sessionId === multiplayerStore.hostSessionId}<span
                                                    class="badge host"
                                                    >HOST</span
                                                >{/if}
                                            {#if player.sessionId === multiplayerStore.localSessionId}<span
                                                    class="badge you">YOU</span
                                                >{/if}
                                            {#if player.isAI}<span
                                                    class="badge ai">AI</span
                                                >{/if}
                                        </span>
                                    </li>
                                {/each}
                            </ul>
                        </div>
                        <div class="spacer"></div>
                        <div class="lobby-actions">
                            {#if multiplayerStore.isHost}
                                <button
                                    class="start-btn"
                                    onclick={handleStartGame}
                                    ><span class="btn-glow"></span>START GAME</button
                                >
                            {:else}
                                <p class="waiting-text">
                                    Waiting for host to start...
                                </p>
                            {/if}
                            <button class="leave-btn" onclick={handleLeaveRoom}
                                >Leave Room</button
                            >
                            {#if multiplayerStore.isHost}
                                <button
                                    class="leave-btn dispose-btn"
                                    onclick={() =>
                                        multiplayerStore.disposeRoom()}
                                    >Dispose Room</button
                                >
                            {/if}
                        </div>
                    {:else if multiplayerStore.isConnecting}
                        <div class="mp-loading">
                            <div class="spinner"></div>
                            <p>Connecting...</p>
                        </div>
                    {:else}
                        <div class="mp-section">
                            <h3>Create Game</h3>
                            <p class="mp-desc">
                                Host a new room with your game settings.
                            </p>
                            <button
                                class="mp-action-btn mp-create-btn"
                                onclick={handleCreateRoom}>CREATE ROOM</button
                            >
                        </div>
                        <div class="divider"><span>OR</span></div>
                        <div class="mp-section">
                            <h3>Join Game</h3>
                            <div class="join-col">
                                <input
                                    type="text"
                                    placeholder="Enter Room ID..."
                                    bind:value={joinRoomId}
                                    class="room-input"
                                />
                                <button
                                    class="mp-action-btn mp-join-btn"
                                    onclick={handleJoinRoom}
                                    disabled={!joinRoomId.trim()}
                                    >JOIN ROOM</button
                                >
                            </div>
                        </div>
                        <div class="mp-section room-browser">
                            <div class="browser-header">
                                <h3>Browse Games</h3>
                                <button
                                    class="refresh-btn"
                                    onclick={() =>
                                        multiplayerStore.fetchRooms()}
                                    disabled={multiplayerStore.isFetchingRooms}
                                >
                                    {multiplayerStore.isFetchingRooms ? "" : ""}
                                    Refresh
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
                                                    >{room.metadata?.hostName ||
                                                        "Unknown"}</span
                                                >
                                                <span
                                                    class="room-phase badge {room
                                                        .metadata?.phase ||
                                                        'lobby'}"
                                                    >{room.metadata?.phase ||
                                                        "lobby"}</span
                                                >
                                            </div>
                                            <div class="room-card-mid">
                                                <span class="room-map"
                                                    >{room.metadata?.mapType ||
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
                                                <span class="room-slots"
                                                    >{room.clients}/{room.maxClients}
                                                    players</span
                                                >
                                            </div>
                                            {#if room.metadata?.playerNames?.length}
                                                <div class="room-players">
                                                    {#each room.metadata.playerNames as pname}<span
                                                            class="player-chip"
                                                            >{pname}</span
                                                        >{/each}
                                                </div>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                        {#if multiplayerStore.lobbyStatus}<div
                                class="lobby-status-msg"
                            >
                                ⏳ {multiplayerStore.lobbyStatus}
                            </div>{/if}
                        {#if multiplayerStore.connectionError}<div
                                class="error-msg"
                            >
                                {multiplayerStore.connectionError}
                            </div>{/if}
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
    }

    .menu-fullscreen {
        position: fixed;
        inset: 0;
        width: 100vw;
        min-height: 100vh;
        /* Subtle nebula gradient as deepest layer */
        background: radial-gradient(
                ellipse at 30% 25%,
                rgba(40, 10, 60, 0.15) 0%,
                transparent 50%
            ),
            radial-gradient(
                ellipse at 70% 75%,
                rgba(10, 30, 60, 0.15) 0%,
                transparent 50%
            ),
            radial-gradient(
                ellipse at 50% 20%,
                rgba(0, 40, 60, 0.35) 0%,
                rgba(5, 10, 25, 0.95) 60%,
                #050510 100%
            );
        display: flex;
        align-items: flex-start;
        justify-content: center;
        overflow-y: auto;
        z-index: 9999;
        font-family: "Orbitron", sans-serif;
    }

    /* Hex grid overlay — inline SVG element */
    .hex-grid-overlay {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        color: rgba(0, 255, 255, 0.12);
        animation: hex-shift 12s ease-in-out infinite;
        mask-image: radial-gradient(
            ellipse 70% 65% at 50% 50%,
            rgba(0, 0, 0, 1) 20%,
            rgba(0, 0, 0, 0) 100%
        );
        -webkit-mask-image: radial-gradient(
            ellipse 70% 65% at 50% 50%,
            rgba(0, 0, 0, 1) 20%,
            rgba(0, 0, 0, 0) 100%
        );
        pointer-events: none;
        z-index: 0;
    }

    @keyframes hex-shift {
        0%,
        100% {
            filter: hue-rotate(0deg) brightness(0.8);
            opacity: 0.6;
        }
        25% {
            filter: hue-rotate(50deg) brightness(1.1);
            opacity: 0.9;
        }
        50% {
            filter: hue-rotate(140deg) brightness(0.9);
            opacity: 0.7;
        }
        75% {
            filter: hue-rotate(220deg) brightness(1.2);
            opacity: 1;
        }
    }

    /* ── Background Picker ── */
    .bg-picker {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 10002;
    }
    .bg-picker-toggle {
        width: 40px;
        height: 40px;
        border: 1px solid rgba(0, 255, 255, 0.15);
        border-radius: 10px;
        background: rgba(5, 10, 25, 0.8);
        backdrop-filter: blur(8px);
        font-size: 1.2rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }
    .bg-picker-toggle:hover {
        border-color: rgba(0, 255, 255, 0.35);
        background: rgba(0, 255, 255, 0.08);
    }
    .bg-picker-dropdown {
        position: absolute;
        top: 48px;
        right: 0;
        width: 260px;
        max-height: 380px;
        overflow-y: auto;
        background: rgba(5, 10, 25, 0.95);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 255, 255, 0.12);
        border-radius: 12px;
        padding: 6px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
    }
    .bg-picker-dropdown::-webkit-scrollbar {
        width: 3px;
    }
    .bg-picker-dropdown::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 255, 0.15);
        border-radius: 2px;
    }
    .bg-thumb-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 6px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s;
    }
    .bg-thumb-btn:hover {
        background: rgba(0, 255, 255, 0.06);
        border-color: rgba(0, 255, 255, 0.15);
    }
    .bg-thumb-btn.active {
        border-color: rgba(0, 255, 255, 0.4);
        background: rgba(0, 255, 255, 0.1);
    }
    .bg-thumb-img {
        width: 100%;
        height: 55px;
        object-fit: cover;
        border-radius: 6px;
    }
    .bg-thumb-none {
        width: 100%;
        height: 55px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(
            ellipse at 50% 40%,
            rgba(0, 40, 60, 0.5),
            rgba(5, 10, 25, 0.9)
        );
        border-radius: 6px;
        font-size: 1.4rem;
        color: rgba(0, 255, 255, 0.3);
    }
    .bg-thumb-label {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.55rem;
        color: rgba(136, 170, 204, 0.6);
        letter-spacing: 0.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }

    /* Ensure content sits above the hex overlay */
    .menu-container {
        position: relative;
        z-index: 1;
        width: 98vw;
        max-width: 1400px;
        box-sizing: border-box;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--panel-gap, 24px);
        padding: 24px 0;
    }

    /* Scrollbar */
    .menu-container::-webkit-scrollbar {
        width: 4px;
    }
    .menu-container::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 255, 0.15);
        border-radius: 2px;
    }

    /* â”€â”€ Title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .title-block {
        text-align: center;
    }

    .title {
        font-size: clamp(1.6rem, 5vw, 3.2rem);
        margin: 0;
        line-height: 1.1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-shadow: 0 0 30px rgba(0, 255, 255, 0.4);
    }

    .pax {
        color: #00ffff;
        letter-spacing: clamp(2px, 0.5vw, 6px);
        font-weight: 300;
    }
    .fluxia {
        color: #00ffff;
        letter-spacing: clamp(3px, 0.8vw, 10px);
        font-weight: 900;
    }

    .subtitle {
        color: #4a5a6a;
        font-family: "JetBrains Mono", monospace;
        font-size: clamp(0.5rem, 1.2vw, 0.65rem);
        letter-spacing: clamp(1px, 0.3vw, 4px);
        margin-top: 6px;
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    /*  TABS                                          */
    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

    /* Hidden on desktop, shown on mobile */
    .responsive-tabs {
        display: none;
        gap: 4px;
        background: rgba(0, 255, 255, 0.04);
        border: 1px solid rgba(0, 255, 255, 0.12);
        border-radius: 14px;
        padding: 5px;
        width: 100%;
        box-sizing: border-box;
    }

    .tab-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex: 1;
        padding: 16px 20px;
        border: none;
        background: transparent;
        color: rgba(136, 170, 204, 0.5);
        font-family: "Orbitron", sans-serif;
        font-size: 1.05rem;
        font-weight: 700;
        letter-spacing: 3px;
        cursor: pointer;
        border-radius: 10px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        min-height: 52px;
    }
    .tab-icon {
        font-size: 1.2rem;
    }
    .tab-label {
        white-space: nowrap;
    }

    .tab-btn:hover {
        color: #aaccdd;
        background: rgba(0, 255, 255, 0.04);
    }

    .tab-btn.active {
        color: #00ffff;
        background: rgba(0, 255, 255, 0.12);
        box-shadow:
            0 0 24px rgba(0, 255, 255, 0.08),
            inset 0 1px 0 rgba(0, 255, 255, 0.15);
        text-shadow: 0 0 14px rgba(0, 255, 255, 0.35);
    }

    .connected-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #22cc66;
        box-shadow: 0 0 8px #22cc66;
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

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    /*  CONTENT LAYOUT                                */
    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

    .section-heading {
        font-family: "Orbitron", sans-serif;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 5px;
        color: rgba(0, 255, 255, 0.55);
        text-transform: uppercase;
        margin: 0 0 16px 0;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(0, 255, 255, 0.08);
    }

    .section-divider {
        height: 1px;
        margin: 14px 0;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 255, 0.12) 30%,
            rgba(0, 255, 255, 0.12) 70%,
            transparent
        );
    }

    /* Desktop: 2-column grid, both panels visible */
    .menu-content {
        display: grid;
        grid-template-columns: 1fr clamp(280px, 22vw, 380px);
        grid-template-areas:
            "setup setup"
            "sp    mp";
        gap: 20px;
        width: 100%;
    }
    .shared-setup {
        grid-area: setup;
    }
    .sp-panel {
        grid-area: sp;
    }
    .mp-panel {
        grid-area: mp;
    }

    /* Desktop: override hidden so BOTH panels show side-by-side */
    .menu-content [hidden] {
        display: flex !important;
        flex-direction: column;
    }

    /* Mobile: single column, tabs visible, hidden attr works normally */
    @media (max-width: 900px) {
        .responsive-tabs {
            display: flex;
        }

        .menu-content {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }
        .menu-content [hidden] {
            display: none !important;
        }
        .sp-panel,
        .mp-panel {
            width: 100%;
        }

        /* ══ GLOBAL OVERFLOW FIX ══ */
        .menu-container {
            width: 100vw;
            max-width: 100vw;
            padding: 16px 10px;
            gap: 14px;
            box-sizing: border-box;
            overflow-x: hidden;
        }

        /* Every panel: constrain to parent */
        .panel,
        .mp-panel {
            max-width: 100%;
            box-sizing: border-box;
            padding: 14px 12px;
            gap: 12px;
            overflow: hidden;
        }

        /* Every control-group, row, and container */
        .control-group,
        .config-dual-row,
        .config-triple-row,
        .speed-start-row,
        .map-card-row,
        .inline-row,
        .button-row,
        .identity-widget,
        .color-palette-row,
        .player-config-list,
        .player-config-row,
        .saved-maps-list,
        .lobby-list {
            max-width: 100%;
            box-sizing: border-box;
            min-width: 0;
        }

        /* Grid children must shrink */
        .config-dual-row {
            grid-template-columns: minmax(0, auto) minmax(0, 1fr);
            gap: 8px;
        }
        .config-triple-row {
            grid-template-columns: minmax(0, auto) minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px;
        }

        /* Map cards wrap */
        .map-card-row {
            flex-wrap: wrap;
            gap: 8px;
        }
        .map-card {
            min-width: 70px;
            flex: 1 1 70px;
        }

        /* Player inline rows fit */
        .inline-row {
            grid-template-columns: 18px 30px 1fr auto auto;
            gap: 6px;
            padding: 6px 8px;
        }
        .inline-select {
            min-width: 0;
            width: auto;
            max-width: 100%;
            font-size: 0.6rem;
        }

        /* Inputs, selects, sliders constrained */
        input[type="text"],
        input[type="number"],
        input[type="range"],
        select,
        .room-input {
            max-width: 100%;
            box-sizing: border-box;
            min-width: 0;
        }

        /* Mp-panel clip-path causes overflow on mobile */
        .mp-panel {
            clip-path: none;
            border-radius: 8px;
            padding: 14px 12px;
        }

        /* Touch targets */
        .button-row button {
            min-height: 44px;
            min-width: 44px;
        }

        /* Subtitle readable */
        .subtitle {
            color: #5a7a8a;
            font-size: 0.55rem;
        }

        /* Color palette wraps */
        .color-palette-row {
            flex-wrap: wrap;
        }

        /* Lobby items */
        .lobby-item,
        .lobby-row {
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Speed/start row stacks */
        .speed-start-row {
            grid-template-columns: 1fr;
        }

        /* Tab buttons shrink */
        .tab-btn {
            padding: 10px 16px;
            font-size: 0.7rem;
            letter-spacing: 1px;
            flex: 1;
        }
    }

    @media (max-width: 480px) {
        .menu-container {
            gap: 12px;
            padding: 12px 6px;
        }
        .panel {
            padding: 12px;
            gap: 10px;
            clip-path: none;
            border-radius: 8px;
        }
        .mp-panel {
            clip-path: none;
            border-radius: 8px;
        }
        .tab-btn {
            padding: 10px 12px;
            font-size: 0.65rem;
            letter-spacing: 1px;
        }
        .config-triple-row {
            grid-template-columns: 1fr;
        }
        .inline-row {
            grid-template-columns: 20px 28px 1fr;
            gap: 4px;
            padding: 4px 6px;
        }
        .color-palette-row {
            flex-direction: column;
        }
        .identity-widget {
            flex-direction: column;
            align-items: flex-start;
        }
        .hue-popup {
            left: 0;
            top: calc(100% + 8px);
            transform: none;
        }
        .speed-start-row {
            grid-template-columns: 1fr;
        }
    }

    /* M6: Slide-up options sheet (mobile) */
    .options-gear {
        display: none;
    }
    @media (max-width: 900px) {
        .options-gear {
            display: flex;
            padding: 12px 16px;
        }
    }

    .options-sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 100;
    }
    .options-sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 101;
        background: rgba(8, 12, 24, 0.97);
        border-top: 1px solid rgba(0, 255, 255, 0.15);
        border-radius: 16px 16px 0 0;
        padding: 16px 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 60vh;
        overflow-y: auto;
    }
    .options-sheet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .options-sheet-close {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #667788;
        font-size: 1rem;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .options-sheet-close:hover {
        color: #ff6666;
        border-color: rgba(255, 80, 80, 0.3);
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
        background: rgba(12, 8, 24, 0.9);
        border: 1px solid rgba(200, 80, 255, 0.18);
        border-left: 3px solid rgba(200, 80, 255, 0.3);
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
            -4px 0 20px rgba(200, 80, 255, 0.04),
            inset 0 0 30px rgba(200, 80, 255, 0.02);
    }

    .mp-panel .panel-title {
        color: #cc66ff;
        border-bottom-color: rgba(200, 80, 255, 0.15);
        text-shadow: 0 0 8px rgba(200, 80, 255, 0.15);
    }

    .mp-btn {
        font-size: 0.85rem;
        padding: 12px;
    }

    /* MP Action Buttons — equal emphasis, fuchsia palette */
    .mp-action-btn {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid rgba(200, 80, 255, 0.25);
        border-radius: 4px;
        background: rgba(200, 80, 255, 0.08);
        color: #cc88ff;
        font-family: "Orbitron", sans-serif;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 2px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .mp-action-btn:hover:not(:disabled) {
        background: rgba(200, 80, 255, 0.18);
        color: #dd99ff;
        box-shadow: 0 0 16px rgba(200, 80, 255, 0.15);
    }
    .mp-action-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    /* ── Saved Maps (F-70) ── */
    .saved-maps-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 6px;
    }
    .saved-map-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        border: 1px solid rgba(0, 255, 255, 0.08);
        border-radius: 4px;
        font-size: 0.7rem;
    }
    .saved-map-name {
        flex: 1;
        color: #b0c4de;
        font-family: "Orbitron", sans-serif;
        letter-spacing: 0.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .saved-map-info {
        color: rgba(0, 255, 255, 0.4);
        font-size: 0.65rem;
    }
    .saved-map-btn {
        background: transparent;
        border: 1px solid rgba(0, 255, 255, 0.15);
        color: #77aacc;
        padding: 2px 6px;
        font-size: 0.65rem;
        cursor: pointer;
        border-radius: 3px;
        transition: all 0.15s;
    }
    .saved-map-btn.load:hover {
        background: rgba(0, 255, 255, 0.08);
        color: #88ffcc;
    }
    .saved-map-btn.del:hover {
        background: rgba(255, 80, 80, 0.08);
        color: #ff6666;
        border-color: rgba(255, 80, 80, 0.3);
    }

    .join-col {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .join-col .room-input {
        width: 100%;
        box-sizing: border-box;
    }

    /* Start button primary emphasis */
    .start-btn-primary {
        width: 100%;
        padding: 16px 24px;
        font-size: 1rem;
        letter-spacing: 3px;
        margin-top: 4px;
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

    /* â”€â”€ Panels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
        align-items: start;
    }

    .config-dual-row.compact {
        gap: 8px;
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
        position: relative;
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
        cursor: pointer;
        transition:
            transform 0.15s,
            box-shadow 0.15s;
    }
    .identity-swatch:hover {
        transform: scale(1.1);
        box-shadow:
            0 0 18px rgba(0, 255, 255, 0.2),
            inset 0 0 6px rgba(255, 255, 255, 0.15);
    }

    .hue-popup {
        position: absolute;
        top: 50%;
        left: calc(100% + 12px);
        transform: translateY(-50%);
        background: rgba(8, 12, 24, 0.95);
        border: 1px solid rgba(0, 255, 255, 0.15);
        border-radius: 6px;
        padding: 8px 12px;
        z-index: 10;
        min-width: 200px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .hue-popup-slider {
        width: 100%;
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

    .dispose-btn {
        border-color: rgba(255, 100, 50, 0.3);
        color: #aa6644;
    }
    .dispose-btn:hover {
        background: rgba(255, 100, 50, 0.08);
        color: #ff8855;
        border-color: rgba(255, 100, 50, 0.5);
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
