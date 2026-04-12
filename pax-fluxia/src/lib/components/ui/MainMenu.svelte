<script lang="ts">
    import { onMount } from "svelte";
    import { generateMapThumbnail } from '$lib/utils/mapThumbnail';
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        loadPanelSettings,
        savePanelSettings,
        panelDefaultsFromConfig,
    } from "$lib/components/ui/panelSync";
    import { fade, fly } from "svelte/transition";
    import type { GameSettings } from "$lib/types/game.types";
    import { multiplayerStore } from "$lib/stores/multiplayerStore.svelte";
    import type { RoomListing } from "$lib/stores/multiplayerStore.svelte";
    import { loadVisuals, saveVisuals } from "$lib/components/ui/panelSync";
    import { audioManager } from "$lib/services/audioManager.svelte";
    import AudioSettings from "$lib/components/ui/AudioSettings.svelte";
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
    import {
        PLAYER_PALETTE_SIZE,
        generatePlayerPaletteHues,
        loadPlayerPaletteSettings,
        savePlayerPaletteSettings,
    } from "$lib/utils/playerPalette";
    import RangeDual from "./RangeDual.svelte";

    let visible = $state(true);

    import { BG_IMAGES } from "$lib/config/bgManifest";
    let bgOpen = $state(false);

    // Load initial visual defaults (which includes bgImage)
    let visuals = loadVisuals();
    let bgImage = $state(visuals.bgImage);

    $effect(() => {
        // Sync back to visuals block when changed in MainMenu
        visuals.bgImage = bgImage;
        GAME_CONFIG.BG_IMAGE_URL = bgImage;
        saveVisuals(visuals);
    });
    // BG images are a static manifest — no fetch needed
    let bgImages = $state<string[]>(BG_IMAGES);

    // Chat UI state
    let chatOpen = $state(false);
    let chatInput = $state("");
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
    let showAudioSettings = $state(false);

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

    const storedPaletteSettings = loadPlayerPaletteSettings();

    // Config state
    let showMobileOptions = $state(false);
    let gameSetupOpen = $state(false);
    let mapMode = $state<"random" | "classic">(
        loadSetting("mapMode", "random"),
    );
    let mapType = $state(loadSetting("mapType", "standard"));
    let selectedClassicMap = $state<string | null>(
        loadSetting("selectedClassicMap", null),
    );
    let showHowToPlay = $state(false);
    let showControls = $state(false);
    let playerCount = $state<GameSettings["playerCount"]>(
        loadSetting("playerCount", 6),
    );
    let difficulty = $state(loadSetting("difficulty", "Normal"));
    let starsPerPlayer = $state(loadSetting("starsPerPlayer", 5));
    let shipsPerStar = $state(loadSetting("shipsPerStar", 40));
    let minLinks = $state(loadSetting("minLinks", 1));
    let maxLinks = $state(loadSetting("maxLinks", 6));
    let starSpacing = $state(loadSetting("starSpacing", 1.0));
    let mapBoardFit = $state(loadSetting("mapBoardFit", 0.55));
    let retainOrderOnConquest = $state(
        loadSetting("retainOrderOnConquest", true),
    );
    let allowOpposingOrders = $state(loadSetting("allowOpposingOrders", false));
    let neutralStarCount = $state(loadSetting("neutralStarCount", 0));
    let neutralShipsPerStar = $state(loadSetting("neutralShipsPerStar", 10));
    let specialStarPercentage = $state(loadSetting("specialStarPercentage", 20));

    /** Lane preview + new game — synced with Map & Grid panel (localStorage). */
    function readLaneKnobsFromPanel() {
        const p = loadPanelSettings(panelDefaultsFromConfig());
        const modeRaw = p.mapgenLaneMode;
        const mode: "straight" | "curved" =
            modeRaw === "straight" || modeRaw === "curved"
                ? modeRaw
                : (GAME_CONFIG.MAPGEN_LANE_MODE ?? "curved");
        return {
            msr: Math.round(
                p.starMargin ?? GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45,
            ),
            laneMargin: Math.round(
                p.mapgenLaneMarginPx ?? GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ?? 75,
            ),
            curveVsPruneBias: Math.min(
                1,
                Math.max(
                    0,
                    p.mapgenLaneCurveVsPruneBias ??
                        GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ??
                        0.55,
                ),
            ),
            mode,
        };
    }

    let menuStarMargin = $state(45);
    let menuLaneMargin = $state(75);
    let menuCurveVsPruneBias = $state(0.55);
    let menuLaneMode = $state<"straight" | "curved">("curved");

    onMount(() => {
        const k = readLaneKnobsFromPanel();
        menuStarMargin = k.msr;
        menuLaneMargin = k.laneMargin;
        menuCurveVsPruneBias = k.curveVsPruneBias;
        menuLaneMode = k.mode;
    });

    function persistMenuLaneKnobs() {
        const full = loadPanelSettings(panelDefaultsFromConfig());
        full.starMargin = menuStarMargin;
        full.mapgenLaneMarginPx = menuLaneMargin;
        full.mapgenLaneCurveVsPruneBias = menuCurveVsPruneBias;
        full.mapgenLaneMode = menuLaneMode;
        savePanelSettings(full);
        GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN = menuStarMargin;
        GAME_CONFIG.MAPGEN_LANE_MARGIN_PX = menuLaneMargin;
        GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS = menuCurveVsPruneBias;
        GAME_CONFIG.MAPGEN_LANE_MODE = menuLaneMode;
    }

    let playerConfigs = $state(
        loadSetting(
            "playerConfigs",
            makeDefaultPlayerConfigs(loadSetting("playerCount", 6)),
        ),
    );
    let tickDuration = $state(
        loadSetting("tickDuration", GAME_CONFIG.BASE_TICK_MS),
    );

    // Player identity (persisted)
    let playerName = $state(loadSetting("playerName", "Commander"));

    // Global color palette controls (persisted)
    let colorSat = $state(
        loadSetting("colorSat", storedPaletteSettings.saturation),
    );
    let colorLig = $state(
        loadSetting("colorLig", storedPaletteSettings.lightness),
    );
    let hueOffset = $state(
        loadSetting("hueOffset", storedPaletteSettings.anchorHue),
    );

    let showAIDetails = $state(false);
    let showColorPalette = $state(false);
    let showPlayerPaletteAdvanced = $state(false);

    // F-168: Random map preview thumbnail — uses real generateMap() engine via gameStore
    let thumbnailUrl = $state('');
    let previewSeed = $state(0); // incremented to trigger reshuffle

    function generatePreview() {
        GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN = menuStarMargin;
        GAME_CONFIG.MAPGEN_LANE_MARGIN_PX = menuLaneMargin;
        GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS = menuCurveVsPruneBias;
        GAME_CONFIG.MAPGEN_LANE_MODE = menuLaneMode;
        const { stars, connections } = gameStore.generateMapPreview({
            playerCount,
            starsPerPlayer,
            minLinksPerStar: minLinks,
            maxLinksPerStar: maxLinks,
            starSpacing,
            mapBoardFit,
            neutralStarCount,
            specialStarPercentage,
        });
        thumbnailUrl = generateMapThumbnail(stars, connections, { width: 240, height: 135 });
    }

    $effect(() => {
        // Regenerate when settings change or reshuffle is clicked
        void playerCount; void starsPerPlayer; void minLinks; void maxLinks; void starSpacing; void mapBoardFit; void previewSeed;
        void neutralStarCount; void specialStarPercentage;
        void menuStarMargin; void menuLaneMargin; void menuCurveVsPruneBias; void menuLaneMode;
        generatePreview();
    });

    const playerPaletteHues = $derived(
        generatePlayerPaletteHues(
            hueOffset,
            PLAYER_PALETTE_SIZE,
            colorSat / 100,
            colorLig / 100,
        ),
    );

    $effect(() => {
        if (playerConfigs.length !== PLAYER_PALETTE_SIZE) {
            const normalized = makeDefaultPlayerConfigs(
                PLAYER_PALETTE_SIZE,
                hueOffset,
            );
            for (let i = 0; i < Math.min(playerConfigs.length, normalized.length); i++) {
                normalized[i] = {
                    ...normalized[i],
                    difficulty:
                        playerConfigs[i]?.difficulty ?? normalized[i].difficulty,
                    strategy: playerConfigs[i]?.strategy ?? normalized[i].strategy,
                };
            }
            playerConfigs = normalized;
        }

        for (let i = 0; i < PLAYER_PALETTE_SIZE; i++) {
            const nextHue = playerPaletteHues[i] ?? playerConfigs[i]?.hue ?? 0;
            if (playerConfigs[i].hue !== nextHue) {
                playerConfigs[i].hue = nextHue;
            }
            playerConfigs[i].isAI = i > 0;
        }

        savePlayerPaletteSettings({
            anchorHue: hueOffset,
            saturation: colorSat,
            lightness: colorLig,
        });
    });

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
        saveSetting("mapMode", mapMode);
        saveSetting("mapType", mapType);
        saveSetting("selectedClassicMap", selectedClassicMap);
        saveSetting("playerCount", playerCount);
        saveSetting("difficulty", difficulty);
        saveSetting("starsPerPlayer", starsPerPlayer);
        saveSetting("shipsPerStar", shipsPerStar);
        saveSetting("minLinks", minLinks);
        saveSetting("maxLinks", maxLinks);
        saveSetting("starSpacing", starSpacing);
        saveSetting("mapBoardFit", mapBoardFit);
        saveSetting("retainOrderOnConquest", retainOrderOnConquest);
        saveSetting("allowOpposingOrders", allowOpposingOrders);
        saveSetting("neutralStarCount", neutralStarCount);
        saveSetting("neutralShipsPerStar", neutralShipsPerStar);
        saveSetting("specialStarPercentage", specialStarPercentage);
        saveSetting("playerConfigs", playerConfigs);
        saveSetting("hueOffset", hueOffset);
        saveSetting("tickDuration", tickDuration);
        saveSetting("playerName", playerName);
        saveSetting("colorSat", colorSat);
        saveSetting("colorLig", colorLig);
        persistMenuLaneKnobs();
    }

    function applyConfig() {
        GAME_CONFIG.STARS_PER_PLAYER = starsPerPlayer;
        GAME_CONFIG.STARTING_SHIPS = shipsPerStar;
        GAME_CONFIG.MIN_LINKS_PER_STAR = minLinks;
        GAME_CONFIG.MAX_LINKS_PER_STAR = maxLinks;
        GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST = retainOrderOnConquest;
        GAME_CONFIG.ALLOW_OPPOSING_ORDERS = allowOpposingOrders;
        GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN = menuStarMargin;
        GAME_CONFIG.MAPGEN_LANE_MARGIN_PX = menuLaneMargin;
        GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS = menuCurveVsPruneBias;
        GAME_CONFIG.MAPGEN_LANE_MODE = menuLaneMode;

        const selectedMap =
            MAP_DEFS.find((m) => m.id === mapType) ?? MAP_DEFS[0];

        gameStore.updateSettings({
            playerCount,
            mapType: selectedMap.mapType,
            minLinksPerStar: minLinks,
            maxLinksPerStar: maxLinks,
            starSpacing: starSpacing,
            mapBoardFit,
            gameSpeed: tickDuration,
            playerColors: playerConfigs.map((cfg) => hslToHex(cfg.hue)),
            neutralStarCount,
            neutralShipsPerStar,
            specialStarPercentage,
        });

        GAME_CONFIG.CONQUEST_SLOWMO_ENABLED = selectedMap.mapType === "debug-b";
    }

    function startSPGame() {
        saveAllSettings();
        // If classic map selected, load it first
        if (mapMode === "classic" && selectedClassicMap) {
            const allMaps = gameStore.savedMaps;
            const classicMap = allMaps.find(
                (m) => m.metadata.name === selectedClassicMap,
            );
            if (classicMap) {
                applyConfig();
                gameStore.loadSavedMap(classicMap);
                gameStore.restart();
                visible = false;
                return;
            }
        }
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
            mapBoardFit,
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

            <!-- Quick-start (visible without scrolling on mobile) -->
            <button
                class="start-btn quick-start"
                onclick={() => {
                    audioManager.play("click");
                    startSPGame();
                }}
            >
                <span class="btn-glow"></span>
                ▶ QUICK START
            </button>

            <!-- ═══ Two-Column Grid ═══ -->
            <div class="menu-columns">
                <!-- ── Shared Game Setup (always visible) ── -->
                <section class="col-setup panel">
                    <h2 class="section-heading">GAME SETUP</h2>

                    <!-- Map Mode Tabs -->
                    <div class="control-group">
                        <label>MAP</label>
                        <div class="map-mode-tabs">
                            <button
                                class="map-tab"
                                class:active={mapMode === "random"}
                                onclick={() => {
                                    mapMode = "random";
                                    mapType = "standard";
                                }}>🎲 RANDOM</button
                            >
                            <button
                                class="map-tab"
                                class:active={mapMode === "classic"}
                                onclick={() => {
                                    mapMode = "classic";
                                }}>🗺️ CLASSIC</button
                            >
                        </div>
                    </div>

                    <!-- Map Columns -->
                    <div class="map-columns">
                        {#if mapMode === "random"}
                            <!-- Random Map Settings -->
                            <div class="map-col-content">
                                <div class="config-row-3">
                                    <div class="config-item">
                                        <label>Stars per player</label>
                                        <div class="slider-container">
                                            <input
                                                type="range"
                                                min="1"
                                                max="20"
                                                bind:value={starsPerPlayer}
                                            />
                                            <span class="value"
                                                >{starsPerPlayer}</span
                                            >
                                        </div>
                                    </div>
                                    <div class="config-item">
                                        <label
                                            >Links <span
                                                >[{minLinks}-{maxLinks}]</span
                                            ></label
                                        >
                                        <div
                                            class="slider-container"
                                            style="padding: 0 4px;"
                                        >
                                            <RangeDual
                                                bind:min={minLinks}
                                                bind:max={maxLinks}
                                                minLimit={1}
                                                maxLimit={8}
                                            />
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
                                <div
                                    class="config-row-3"
                                    style="grid-template-columns: 1fr;"
                                >
                                    <div class="config-item">
                                        <label title="Loose: natural cluster. Tight: stars scaled to fill the padded map area."
                                            >Board fill</label
                                        >
                                        <div class="slider-container">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                bind:value={mapBoardFit}
                                            />
                                            <span class="value"
                                                >{Math.round(mapBoardFit * 100)}%</span
                                            >
                                        </div>
                                    </div>
                                </div>
                                <div class="config-row-3">
                                    <div class="config-item">
                                        <label title="Matches Map & Grid → Lane clearance">Lane path</label>
                                        <div
                                            class="map-lane-mode-segment"
                                            role="group"
                                            aria-label="Lane path: straight or curved"
                                        >
                                            <button
                                                type="button"
                                                class="map-lane-mode-segment__btn"
                                                class:map-lane-mode-segment__btn--active={menuLaneMode ===
                                                    "straight"}
                                                aria-pressed={menuLaneMode === "straight"}
                                                onclick={() => {
                                                    menuLaneMode = "straight";
                                                    persistMenuLaneKnobs();
                                                }}>Straight</button
                                            >
                                            <button
                                                type="button"
                                                class="map-lane-mode-segment__btn"
                                                class:map-lane-mode-segment__btn--active={menuLaneMode ===
                                                    "curved"}
                                                aria-pressed={menuLaneMode === "curved"}
                                                onclick={() => {
                                                    menuLaneMode = "curved";
                                                    persistMenuLaneKnobs();
                                                }}>Curve if needed</button
                                            >
                                        </div>
                                    </div>
                                    <div class="config-item">
                                        <label title="Territory / ownership boundary margin">MSR (px)</label>
                                        <div class="slider-container">
                                            <input
                                                type="range"
                                                min="0"
                                                max="500"
                                                step="5"
                                                bind:value={menuStarMargin}
                                                oninput={() => persistMenuLaneKnobs()}
                                            />
                                            <span class="value">{menuStarMargin}</span>
                                        </div>
                                    </div>
                                    <div class="config-item">
                                        <label title="Lane chords & centerlines vs other stars (mapgen)">Lane margin (px)</label>
                                        <div class="slider-container">
                                            <input
                                                type="range"
                                                min="0"
                                                max="250"
                                                step="5"
                                                bind:value={menuLaneMargin}
                                                oninput={() => persistMenuLaneKnobs()}
                                            />
                                            <span class="value">{menuLaneMargin}</span>
                                        </div>
                                    </div>
                                    <div class="config-item">
                                        <label title="0 = prune tight chords; 1 = keep edges for curves">Curve vs prune</label>
                                        <div class="slider-container">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                bind:value={menuCurveVsPruneBias}
                                                oninput={() => persistMenuLaneKnobs()}
                                            />
                                            <span class="value">{menuCurveVsPruneBias.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="config-row-3">
                                    <div class="config-item">
                                        <label>Special Stars</label>
                                        <div class="slider-container">
                                            <input type="range" min="0" max="100" step="5" bind:value={specialStarPercentage} />
                                            <span class="value">{specialStarPercentage}%</span>
                                        </div>
                                    </div>
                                    <div class="config-item">
                                        <label>Neutral Stars</label>
                                        <div class="slider-container">
                                            <input type="range" min="0" max="50" step="1" bind:value={neutralStarCount} />
                                            <span class="value">{neutralStarCount}</span>
                                        </div>
                                    </div>
                                    <div class="config-item" style={neutralStarCount === 0 ? "opacity:0.4; pointer-events:none;" : ""}>
                                        <label>Neutral Ships</label>
                                        <div class="slider-container">
                                            <input type="range" min="0" max="100" step="5" bind:value={neutralShipsPerStar} />
                                            <span class="value">{neutralShipsPerStar}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="random-map-preview">
                                    {#if thumbnailUrl}
                                        <img src={thumbnailUrl} alt="Map preview" class="map-thumb-img" />
                                    {:else}
                                        <div class="map-thumb-placeholder">Generating…</div>
                                    {/if}
                                    <button
                                        class="reshuffle-btn"
                                        onclick={() => { previewSeed += 1; }}
                                        title="Generate new random layout"
                                    >🔀 Reshuffle</button>
                                </div>
                            </div>
                        {:else}
                            <!-- Classic Map Cards -->
                            <div class="classic-map-grid">
                                {#each gameStore.savedMaps as m}
                                    {@const xs = m.stars.map((s) => s.x)}
                                    {@const ys = m.stars.map((s) => s.y)}
                                    {@const pad = 20}
                                    {@const minX = Math.min(...xs) - pad}
                                    {@const minY = Math.min(...ys) - pad}
                                    {@const maxX = Math.max(...xs) + pad}
                                    {@const maxY = Math.max(...ys) + pad}
                                    {@const vw = maxX - minX || 100}
                                    {@const vh = maxY - minY || 100}
                                    {@const starMap = Object.fromEntries(
                                        m.stars.map((s) => [s.id, s]),
                                    )}
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <div
                                        class="classic-map-card"
                                        class:selected={selectedClassicMap ===
                                            m.metadata.name}
                                        onclick={() => {
                                            selectedClassicMap =
                                                m.metadata.name;
                                        }}
                                    >
                                        <svg
                                            class="classic-map-thumb"
                                            viewBox="{minX} {minY} {vw} {vh}"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            {#each m.connections as conn}
                                                {@const src =
                                                    starMap[conn.sourceId]}
                                                {@const tgt =
                                                    starMap[conn.targetId]}
                                                {#if src && tgt}
                                                    <line
                                                        x1={src.x}
                                                        y1={src.y}
                                                        x2={tgt.x}
                                                        y2={tgt.y}
                                                        stroke={selectedClassicMap ===
                                                        m.metadata.name
                                                            ? "#4488ff55"
                                                            : "#334466"}
                                                        stroke-width={Math.max(
                                                            1,
                                                            vw * 0.006,
                                                        )}
                                                    />
                                                {/if}
                                            {/each}
                                            {#each m.stars as star}
                                                <circle
                                                    cx={star.x}
                                                    cy={star.y}
                                                    r={Math.max(2, vw * 0.015)}
                                                    fill={star.ownerId ===
                                                    "neutral"
                                                        ? "#666"
                                                        : `hsl(${(m.stars.indexOf(star) * 60) % 360}, 70%, 60%)`}
                                                    opacity={selectedClassicMap ===
                                                    m.metadata.name
                                                        ? 1
                                                        : 0.7}
                                                />
                                            {/each}
                                        </svg>
                                        <span class="classic-card-label"
                                            >{m.metadata.name}</span
                                        >
                                        <span class="classic-card-info"
                                            >{m.stars.length}★</span
                                        >
                                    </div>
                                {/each}
                                {#if gameStore.savedMaps.length === 0}
                                    <div class="no-maps-msg">
                                        No maps loaded yet
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>

                    <div class="section-divider"></div>

                    <!-- Shared Settings -->
                    <div class="config-row-3">
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
                        <div class="config-item">
                            <label>Tick Duration</label>
                            <div class="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="3000"
                                    step="250"
                                    bind:value={tickDuration}
                                />
                                <span class="value"
                                    >{(tickDuration / 1000).toFixed(1)}s</span
                                >
                            </div>
                        </div>
                    </div>

                    <div class="section-divider"></div>

                    <!-- Commander Identity + Audio (compact row) -->
                    <div class="identity-audio-row">
                        <div class="identity-widget">
                            <div class="identity-palette-stack">
                                <span
                                    class="identity-swatch"
                                    style="background: {hslToHex(
                                        playerPaletteHues[0] ?? hueOffset,
                                    )}"
                                ></span>
                                <div class="identity-palette-preview">
                                    {#each playerPaletteHues.slice(0, playerCount) as hue, index}
                                        <span
                                            class="identity-palette-chip"
                                            style="background: {hslToHex(hue)}"
                                            title={"Player " + (index + 1)}
                                        ></span>
                                    {/each}
                                </div>
                            </div>
                            <input
                                type="text"
                                class="identity-name-input"
                                bind:value={playerName}
                                placeholder="Commander..."
                                maxlength="20"
                            />
                        </div>
                        <div class="audio-compact">
                            <button
                                class="mute-btn"
                                class:muted={audioManager.muted}
                                onclick={() => audioManager.toggleMute()}
                                title={audioManager.muted ? "Unmute" : "Mute"}
                            >
                                {audioManager.muted ? "🔇" : "🔊"}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                disabled={audioManager.muted}
                                value={audioManager.masterVolume}
                                oninput={(e) =>
                                    audioManager.setMasterVolume(
                                        +(e.target as HTMLInputElement).value,
                                    )}
                            />
                        </div>
                    </div>

                    <div class="player-colors-card">
                        <div class="player-colors-card__header">
                            <span class="player-colors-card__title"
                                >PLAYER COLORS</span
                            >
                            <button
                                class="toggle-details-btn"
                                onclick={() =>
                                    (showPlayerPaletteAdvanced =
                                        !showPlayerPaletteAdvanced)}
                                title="Advanced palette controls"
                            >
                                {showPlayerPaletteAdvanced ? "▾" : "▸"}
                            </button>
                        </div>

                        <div class="player-colors-card__row">
                            <label class="player-colors-card__label"
                                >Anchor Hue</label
                            >
                            <input
                                class="hue-slider player-colors-card__slider"
                                type="range"
                                min="0"
                                max="359"
                                step="1"
                                bind:value={hueOffset}
                                style="--hue: {hueOffset}"
                            />
                            <span class="value"
                                >{Math.round(hueOffset)}°</span
                            >
                        </div>

                        <div class="menu-palette-preview">
                            {#each playerPaletteHues as hue, index}
                                <div class="menu-palette-preview__slot">
                                    <span
                                        class="menu-palette-preview__swatch"
                                        style="background: {hslToHex(hue)}"
                                    ></span>
                                    <span class="menu-palette-preview__label"
                                        >P{index + 1}</span
                                    >
                                </div>
                            {/each}
                        </div>

                        {#if showPlayerPaletteAdvanced}
                            <div
                                class="color-palette-row"
                                transition:fly={{ y: -8, duration: 150 }}
                            >
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
                    </div>

                    <div class="start-actions-row">
                        <button
                            class="start-btn start-btn-primary"
                            onclick={() => {
                                audioManager.play("click");
                                startSPGame();
                            }}
                        >
                            <span class="btn-glow"></span>
                            ▶ START
                        </button>
                        <button
                            class="start-btn mp-create-btn-main"
                            onclick={() => {
                                audioManager.play("click");
                                handleCreateRoom();
                            }}
                        >
                            <span class="btn-glow"></span>
                            🌐 CREATE LOBBY
                        </button>
                    </div>
                </section>

                <!-- ── RIGHT: Opponents + Multiplayer ── -->
                <section class="col-right panel compact-right">
                    <!-- AI Opponents (condensed) -->
                    <div class="ai-section-compact">
                        <div class="ai-header-row">
                            <span class="section-heading-inline">AI</span>
                            <button
                                class="toggle-details-btn"
                                onclick={() =>
                                    (showColorPalette = !showColorPalette)}
                                title="Player palette">👥</button
                            >
                            <button
                                class="toggle-details-btn"
                                onclick={() => (showAIDetails = !showAIDetails)}
                                >{showAIDetails ? "▾" : "▸"}</button
                            >
                        </div>

                        {#if showColorPalette}
                            <div
                                class="color-palette-row"
                                transition:fly={{ y: -8, duration: 150 }}
                            >
                                <div class="hue-offset-inline">
                                    <span class="mini-label">ANCHOR</span>
                                    <input
                                        class="hue-slider"
                                        type="range"
                                        min="0"
                                        max="359"
                                        step="1"
                                        bind:value={hueOffset}
                                        style="--hue: {hueOffset}"
                                    />
                                    <span class="value">{Math.round(hueOffset)}°</span>
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
                            <div class="menu-palette-preview" transition:fly={{ y: -8, duration: 150 }}>
                                {#each playerPaletteHues as hue, index}
                                    <div class="menu-palette-preview__slot">
                                        <span
                                            class="menu-palette-preview__swatch"
                                            style="background: {hslToHex(hue)}"
                                        ></span>
                                        <span class="menu-palette-preview__label">P{index + 1}</span>
                                    </div>
                                {/each}
                            </div>
                        {/if}

                        <div class="ai-grid">
                            {#each playerConfigs as cfg, i}
                                {#if i > 0}
                                    <div class="ai-row">
                                        <span
                                            class="ai-color-dot"
                                            style="background: {hslToHex(
                                                playerConfigs[i].hue,
                                            )}"
                                            title={"Player " + (i + 1)}
                                        ></span>
                                        <select
                                            class="ai-select-mini"
                                            bind:value={
                                                playerConfigs[i].difficulty
                                            }
                                        >
                                            {#each DIFFICULTIES as d}<option
                                                    value={d}>{d}</option
                                                >{/each}
                                        </select>
                                        {#if showAIDetails}
                                            <select
                                                class="ai-select-mini"
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
                    </div>

                    <!-- Multiplayer -->
                    <div class="mp-section-compact">
                        <h3 class="section-heading">MULTIPLAYER</h3>

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

                            <!-- Numbered Slot Grid -->
                            <div class="slot-grid">
                                {#each multiplayerStore.players as player, i}
                                    <div
                                        class="slot-row"
                                        class:slot-you={player.sessionId ===
                                            multiplayerStore.localSessionId}
                                    >
                                        <span class="slot-index">{i + 1}</span>
                                        <span
                                            class="player-dot"
                                            style:background-color={player.color}
                                        ></span>
                                        <span class="player-name">
                                            {player.name}
                                        </span>
                                        <span class="slot-badges">
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
                                    </div>
                                {/each}
                                {#if multiplayerStore.players.length === 0}
                                    <p class="waiting-text">
                                        Waiting for players...
                                    </p>
                                {/if}
                            </div>

                            <!-- Lobby Actions -->
                            <div class="lobby-actions">
                                {#if multiplayerStore.isHost}
                                    <button
                                        class="start-btn"
                                        onclick={handleStartGame}
                                        ><span class="btn-glow"></span>START
                                        GAME</button
                                    >
                                {:else}
                                    <button
                                        class="start-btn vote-btn"
                                        onclick={() =>
                                            multiplayerStore.voteToStart()}
                                        ><span class="btn-glow"></span>VOTE TO
                                        START</button
                                    >
                                    {#if multiplayerStore.startVoteInfo}
                                        <span class="vote-progress">
                                            {multiplayerStore.startVoteInfo
                                                .votes}/{multiplayerStore
                                                .startVoteInfo.needed} votes
                                        </span>
                                    {/if}
                                {/if}
                                <button
                                    class="leave-btn"
                                    onclick={handleLeaveRoom}>Leave Room</button
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

                            <!-- Chat (collapsible) -->
                            <div class="lobby-chat-section">
                                <button
                                    class="chat-toggle"
                                    onclick={() => (chatOpen = !chatOpen)}
                                >
                                    💬 {chatOpen ? "Hide" : "Chat"}
                                    {#if multiplayerStore.chatMessages.length > 0}<span
                                            class="chat-count"
                                            >{multiplayerStore.chatMessages
                                                .length}</span
                                        >{/if}
                                </button>
                                {#if chatOpen}
                                    <div
                                        class="chat-messages"
                                        transition:fly={{
                                            y: -8,
                                            duration: 150,
                                        }}
                                    >
                                        {#if multiplayerStore.chatMessages.length === 0}
                                            <p class="waiting-text">
                                                No messages yet
                                            </p>
                                        {:else}
                                            {#each multiplayerStore.chatMessages as msg}
                                                <div class="chat-msg">
                                                    <span
                                                        class="chat-sender"
                                                        style:color={msg.senderColor}
                                                        >{msg.senderName}</span
                                                    >
                                                    <span class="chat-text"
                                                        >{msg.text}</span
                                                    >
                                                </div>
                                            {/each}
                                        {/if}
                                    </div>
                                    <div class="chat-input-bar">
                                        <input
                                            type="text"
                                            class="chat-input"
                                            placeholder="Type a message..."
                                            bind:value={chatInput}
                                            onkeydown={(e) => {
                                                if (
                                                    e.key === "Enter" &&
                                                    chatInput.trim()
                                                ) {
                                                    multiplayerStore.sendChat(
                                                        chatInput,
                                                    );
                                                    chatInput = "";
                                                }
                                            }}
                                        />
                                        <button
                                            class="chat-send-btn"
                                            onclick={() => {
                                                if (chatInput.trim()) {
                                                    multiplayerStore.sendChat(
                                                        chatInput,
                                                    );
                                                    chatInput = "";
                                                }
                                            }}>Send</button
                                        >
                                    </div>
                                {/if}
                            </div>
                        {:else if multiplayerStore.isConnecting}
                            <div class="mp-loading">
                                <div class="spinner"></div>
                                <p>Connecting...</p>
                            </div>
                        {:else}
                            <div class="mp-actions-compact">
                                <button
                                    class="mp-action-btn mp-create-btn"
                                    onclick={handleCreateRoom}
                                    >CREATE ROOM</button
                                >
                                <div class="join-inline">
                                    <input
                                        type="text"
                                        placeholder="Room ID..."
                                        bind:value={joinRoomId}
                                        class="room-input"
                                    />
                                    <button
                                        class="mp-action-btn mp-join-btn"
                                        onclick={handleJoinRoom}
                                        disabled={!joinRoomId.trim()}
                                        >JOIN</button
                                    >
                                </div>
                            </div>
                            <div class="mp-section room-browser">
                                <div class="browser-header">
                                    <span class="mini-label">BROWSE</span>
                                    <button
                                        class="refresh-btn"
                                        onclick={() =>
                                            multiplayerStore.fetchRooms()}
                                        disabled={multiplayerStore.isFetchingRooms}
                                        >Refresh</button
                                    >
                                </div>
                                {#if multiplayerStore.isFetchingRooms}
                                    <p class="waiting-text">Scanning...</p>
                                {:else if multiplayerStore.availableRooms.length === 0}
                                    <p class="waiting-text">
                                        No rooms available
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
                                                        >{room.metadata
                                                            ?.phase ||
                                                            "lobby"}</span
                                                    >
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
                    </div>
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

<AudioSettings
    visible={showAudioSettings}
    onClose={() => {
        showAudioSettings = false;
    }}
/>

<style>
    /* ═══════════════════════════════════════════════════════════════ */
    /*  MAIN MENU — TWO-COLUMN LAYOUT (F-128)                       */
    /* ═══════════════════════════════════════════════════════════════ */

    :global(body) {
        margin: 0;
        background: #050510;
    }

    .map-lane-mode-segment {
        display: flex;
        width: 100%;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(0, 0, 0, 0.35);
    }
    .map-lane-mode-segment__btn {
        margin: 0;
        flex: 1 1 0;
        min-width: 0;
        min-height: 30px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 500;
        color: #9aa;
        background: transparent;
        border: none;
        cursor: pointer;
        transition:
            background 0.12s,
            color 0.12s;
    }
    .map-lane-mode-segment__btn:hover {
        color: #e2e8f0;
        background: rgba(255, 255, 255, 0.06);
    }
    .map-lane-mode-segment__btn--active {
        color: #ecfdf5;
        background: rgba(74, 222, 128, 0.22);
    }
    .map-lane-mode-segment__btn + .map-lane-mode-segment__btn {
        border-left: 1px solid rgba(255, 255, 255, 0.1);
    }

    .menu-fullscreen {
        position: fixed;
        inset: 0;
        width: 100vw;
        min-height: 100vh;
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
            #050510;
        background-size: cover;
        background-position: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding-top: 5vh;
        overflow-y: auto;
        z-index: 100;
        font-family: "Montserrat", "Segoe UI", system-ui, sans-serif;
        color: #e0e0e0;
    }

    .hex-grid-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        color: rgba(100, 200, 255, 0.04);
        z-index: 0;
    }

    /* ── Background Picker (top-right action bar) ── */
    .bg-picker {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 120;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .bg-picker-toggle {
        background: rgba(10, 20, 40, 0.7);
        border: 1px solid rgba(100, 200, 255, 0.2);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 1.2rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .bg-picker-toggle:hover {
        border-color: rgba(100, 200, 255, 0.5);
        background: rgba(10, 20, 40, 0.9);
    }
    .bg-picker-dropdown {
        position: absolute;
        right: 0;
        top: calc(100% + 6px);
        background: rgba(10, 15, 30, 0.95);
        border: 1px solid rgba(100, 200, 255, 0.15);
        border-radius: 10px;
        padding: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        max-width: 280px;
        backdrop-filter: blur(12px);
    }
    .bg-thumb-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background: transparent;
        border: 2px solid transparent;
        border-radius: 8px;
        padding: 4px;
        cursor: pointer;
        transition: all 0.15s;
        width: 70px;
    }
    .bg-thumb-btn:hover,
    .bg-thumb-btn.active {
        border-color: rgba(0, 255, 255, 0.5);
    }
    .bg-thumb-img {
        width: 60px;
        height: 40px;
        object-fit: cover;
        border-radius: 4px;
    }
    .bg-thumb-none {
        font-size: 1.5rem;
        line-height: 40px;
        color: #666;
    }
    .bg-thumb-label {
        font-size: 0.6rem;
        color: #888;
        text-align: center;
        word-break: break-all;
    }

    /* ── Menu Container ── */
    .menu-container {
        position: relative;
        z-index: 1;
        width: 70%;
        max-width: none;
        padding: 0 48px 40px;
    }

    /* ── Title ── */
    .title-block {
        text-align: center;
        margin-bottom: 16px;
    }
    .title {
        margin: 0;
        line-height: 1;
    }
    .pax {
        display: block;
        font-size: clamp(2.4rem, 5vw, 3.5rem);
        font-weight: 300;
        letter-spacing: 0.5em;
        color: #ddeeff;
        text-shadow: 0 0 20px rgba(100, 180, 255, 0.3);
    }
    .fluxia {
        display: block;
        font-size: clamp(3.5rem, 7vw, 5rem);
        font-weight: 800;
        letter-spacing: 0.15em;
        background: linear-gradient(180deg, #00ffff, #0099ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 12px rgba(0, 220, 255, 0.4));
    }

    /* ═══ Two-Column Grid ═══ */
    .menu-columns {
        display: grid;
        grid-template-columns: 1.5fr 1fr;
        gap: 24px;
        align-items: stretch;
    }

    .panel {
        background: rgba(8, 16, 32, 0.85);
        border: 1px solid rgba(100, 200, 255, 0.12);
        border-radius: 12px;
        padding: 24px;
        backdrop-filter: blur(12px);
        display: flex;
        flex-direction: column;
    }

    .section-heading {
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        color: #00cccc;
        margin: 0 0 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(0, 200, 200, 0.15);
        text-transform: uppercase;
    }

    .section-divider {
        height: 1px;
        background: rgba(100, 200, 255, 0.08);
        margin: 16px 0;
    }

    /* ── Labels ── */
    .control-group label,
    .config-item label {
        display: block;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        color: rgba(200, 220, 255, 0.5);
        margin-bottom: 8px;
        text-transform: uppercase;
    }
    .control-group label span,
    .config-item label span {
        color: rgba(0, 220, 220, 0.7);
        font-weight: 400;
    }

    /* ── Map Mode Tabs ── */
    .map-mode-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
    }
    .map-tab {
        flex: 1;
        padding: 12px 16px;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        background: rgba(10, 20, 40, 0.6);
        color: rgba(200, 220, 255, 0.5);
        border: 1px solid rgba(100, 200, 255, 0.1);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        text-transform: uppercase;
    }
    .map-tab:hover {
        border-color: rgba(100, 200, 255, 0.3);
        color: #fff;
    }
    .map-tab.active {
        background: rgba(0, 100, 200, 0.2);
        border-color: #00ccff;
        color: #00eeff;
        box-shadow: 0 0 12px rgba(0, 200, 255, 0.15);
    }

    /* ── Map Columns Content ── */
    .map-columns {
        min-height: 100px;
    }
    .map-col-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .random-map-preview {
        background: rgba(10, 20, 40, 0.4);
        border: 1px solid rgba(100, 200, 255, 0.08);
        border-radius: 8px;
        padding: 8px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
    }
    .map-thumb-img {
        width: 100%;
        max-width: 240px;
        height: auto;
        border-radius: 4px;
        border: 1px solid rgba(100, 200, 255, 0.12);
        display: block;
    }
    .map-thumb-placeholder {
        width: 240px;
        height: 135px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.3);
        font-size: 0.75rem;
        font-style: italic;
    }
    .reshuffle-btn {
        padding: 4px 12px;
        background: rgba(100, 160, 255, 0.1);
        border: 1px solid rgba(100, 160, 255, 0.2);
        border-radius: 4px;
        color: rgba(160, 200, 255, 0.8);
        font-size: 0.72rem;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
    }
    .reshuffle-btn:hover {
        background: rgba(100, 160, 255, 0.2);
        border-color: rgba(100, 160, 255, 0.4);
        color: #93c5fd;
    }

    /* ── Classic Map Cards ── */
    .classic-map-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        max-height: 400px;
        overflow-y: auto;
        padding-right: 8px;
    }
    .classic-map-grid::-webkit-scrollbar {
        width: 4px;
    }
    .classic-map-grid::-webkit-scrollbar-track {
        background: rgba(10, 20, 40, 0.3);
        border-radius: 2px;
    }
    .classic-map-grid::-webkit-scrollbar-thumb {
        background: rgba(100, 200, 255, 0.2);
        border-radius: 2px;
    }
    .classic-map-card {
        width: calc(50% - 6px);
        background: rgba(10, 20, 40, 0.5);
        border: 1px solid rgba(100, 200, 255, 0.08);
        border-radius: 8px;
        padding: 10px;
        cursor: pointer;
        transition: all 0.15s;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
    }
    .classic-map-card:hover {
        border-color: rgba(100, 200, 255, 0.3);
        background: rgba(10, 20, 40, 0.7);
    }
    .classic-map-card.selected {
        border-color: #00ccff;
        background: rgba(0, 100, 200, 0.15);
        box-shadow: 0 0 12px rgba(0, 200, 255, 0.15);
    }
    .classic-map-thumb {
        width: 100%;
        height: 100px;
        display: block;
        background: rgba(5, 10, 20, 0.4);
        border-radius: 4px;
    }
    .classic-card-label {
        display: block;
        font-size: 0.85rem;
        color: rgba(200, 220, 255, 0.6);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }
    .classic-map-card.selected .classic-card-label {
        color: #00eeff;
    }
    .classic-card-info {
        font-size: 0.75rem;
        color: rgba(200, 220, 255, 0.35);
    }
    .no-maps-msg {
        font-size: 1rem;
        color: rgba(200, 220, 255, 0.3);
        text-align: center;
        padding: 24px;
        width: 100%;
    }

    /* ── Config rows (3-across) ── */
    .config-row-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-top: 16px;
    }

    .slider-container {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .slider-container input[type="range"] {
        flex: 1;
        height: 8px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(100, 200, 255, 0.15);
        border-radius: 4px;
        outline: none;
    }
    .slider-container input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #00ccff;
        cursor: pointer;
        box-shadow: 0 0 6px rgba(0, 200, 255, 0.4);
    }
    .value {
        font-size: 0.95rem;
        color: #00cccc;
        font-weight: 600;
        min-width: 40px;
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    .mini-label {
        font-size: 0.75rem;
        color: rgba(200, 220, 255, 0.4);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    /* Button row (players) */
    .button-row {
        display: flex;
        gap: 4px;
    }
    .button-row button {
        flex: 1;
        padding: 8px 0;
        font-size: 0.95rem;
        font-weight: 600;
        background: rgba(10, 20, 40, 0.6);
        color: rgba(200, 220, 255, 0.5);
        border: 1px solid rgba(100, 200, 255, 0.1);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
    }
    .button-row button:hover {
        border-color: rgba(100, 200, 255, 0.3);
        color: #fff;
    }
    .button-row button.active {
        background: rgba(0, 100, 200, 0.2);
        border-color: #00ccff;
        color: #00eeff;
    }

    /* ── Identity + Audio ── */
    .identity-audio-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 4px;
    }
    .identity-widget {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
    }
    .identity-palette-stack {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }
    .identity-swatch {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.45);
        flex-shrink: 0;
    }
    .identity-palette-preview {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .identity-palette-chip {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 0 6px rgba(0, 0, 0, 0.35);
    }
    .identity-name-input {
        flex: 1;
        background: rgba(10, 20, 40, 0.6);
        border: 1px solid rgba(100, 200, 255, 0.15);
        border-radius: 6px;
        padding: 10px 14px;
        color: #e0e0e0;
        font-family: inherit;
        font-size: 0.95rem;
        outline: none;
    }
    .identity-name-input:focus {
        border-color: #00ccff;
    }
    .identity-name-input::placeholder {
        color: rgba(200, 220, 255, 0.25);
    }

    .audio-compact {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }
    .audio-compact input[type="range"] {
        width: 80px;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(100, 200, 255, 0.15);
        border-radius: 3px;
        outline: none;
    }
    .audio-compact input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #00ccff;
        cursor: pointer;
    }
    .mute-btn {
        background: transparent;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
    }
    .mute-btn.muted {
        opacity: 0.4;
    }
    .audio-open-btn {
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid rgba(0, 170, 170, 0.4);
        border-radius: 4px;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 4px 8px;
        transition: all 0.15s;
    }
    .audio-open-btn:hover {
        background: rgba(0, 255, 255, 0.2);
    }

    /* ── Options ── */
    .options-row {
        display: flex;
        gap: 20px;
        margin-top: 12px;
        flex-wrap: wrap;
    }
    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        color: rgba(200, 220, 255, 0.5);
        cursor: pointer;
    }
    .checkbox-label input[type="checkbox"] {
        accent-color: #00ccff;
        width: 18px;
        height: 18px;
    }

    /* ── Saved Maps ── */
    .saved-maps-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .saved-map-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(10, 20, 40, 0.4);
    }
    .saved-map-name {
        flex: 1;
        font-size: 0.7rem;
        color: #aaccff;
    }
    .saved-map-info {
        font-size: 0.65rem;
        color: rgba(200, 220, 255, 0.4);
    }
    .saved-map-btn {
        background: transparent;
        border: 1px solid rgba(100, 200, 255, 0.15);
        border-radius: 4px;
        color: #aaccff;
        cursor: pointer;
        font-size: 0.7rem;
        padding: 2px 6px;
        transition: all 0.15s;
    }
    .saved-map-btn:hover {
        border-color: rgba(100, 200, 255, 0.4);
    }
    .saved-map-btn.del:hover {
        border-color: rgba(255, 80, 80, 0.4);
        color: #fca5a5;
    }
    .saved-map-btn.default {
        font-size: 0.85rem;
        padding: 1px 4px;
    }
    .saved-map-btn.default.active {
        color: #fbbf24;
        border-color: rgba(251, 191, 36, 0.4);
    }
    .saved-map-row.is-default {
        border-left: 2px solid rgba(251, 191, 36, 0.5);
        padding-left: 4px;
    }
    .default-map-badge {
        font-size: 0.6rem;
        color: #fbbf24;
        margin-left: 6px;
    }
    .clear-default-btn {
        background: transparent;
        border: none;
        color: rgba(255, 100, 100, 0.6);
        cursor: pointer;
        font-size: 0.6rem;
        padding: 0 2px;
    }
    .clear-default-btn:hover {
        color: #fca5a5;
    }

    /* ── START GAME ── */
    .start-btn {
        position: relative;
        width: 100%;
        height: 100%;
        align-self: end;
        padding: 18px;
        margin-top: 16px;
        font-family: inherit;
        font-size: 1.2rem;
        font-weight: 800;
        letter-spacing: 0.15em;
        color: #fff;
        background: linear-gradient(135deg, #0066cc, #00cccc);
        border: none;
        border-radius: 8px;
        cursor: pointer;
        overflow: hidden;
        transition: all 0.2s;
        text-transform: uppercase;
    }
    .start-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 20px rgba(0, 200, 255, 0.3);
    }
    .btn-glow {
        position: absolute;
        inset: -2px;
        border-radius: 10px;
        background: linear-gradient(
            135deg,
            rgba(0, 200, 255, 0.3),
            rgba(0, 100, 200, 0.1)
        );
        z-index: -1;
        opacity: 0;
        transition: opacity 0.3s;
    }
    .start-btn:hover .btn-glow {
        opacity: 1;
    }
    .start-btn-primary {
        font-size: 1.4rem;
        padding: 24px;
        margin-top: auto;
        padding-top: 24px;
    }

    /* ═══ RIGHT COLUMN ═══ */
    .ai-section {
        margin-bottom: 4px;
    }
    .player-config-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
    }
    .player-config-header label {
        flex: 1;
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        color: rgba(200, 220, 255, 0.5);
        text-transform: uppercase;
        margin: 0;
    }
    .toggle-details-btn {
        background: rgba(10, 20, 40, 0.6);
        border: 1px solid rgba(100, 200, 255, 0.15);
        border-radius: 4px;
        color: rgba(200, 220, 255, 0.5);
        cursor: pointer;
        font-size: 0.85rem;
        padding: 4px 10px;
        font-family: inherit;
        transition: all 0.15s;
    }
    .toggle-details-btn:hover {
        border-color: rgba(100, 200, 255, 0.3);
        color: #fff;
    }

    .color-palette-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 8px;
        background: rgba(10, 20, 40, 0.4);
        border-radius: 6px;
        margin-bottom: 6px;
    }
    .hue-offset-inline {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
        min-width: 100px;
    }
    .hue-offset-inline input[type="range"] {
        flex: 1;
        height: 3px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(100, 200, 255, 0.15);
        border-radius: 2px;
    }
    .hue-offset-inline .hue-slider {
        background: linear-gradient(
            to right,
            hsl(0, 82%, 56%),
            hsl(30, 82%, 56%),
            hsl(60, 82%, 56%),
            hsl(120, 82%, 56%),
            hsl(180, 82%, 56%),
            hsl(210, 82%, 56%),
            hsl(270, 82%, 56%),
            hsl(330, 82%, 56%),
            hsl(360, 82%, 56%)
        );
        height: 6px;
        border-radius: 999px;
    }
    .hue-offset-inline input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #00ccff;
        cursor: pointer;
    }
    .hue-offset-inline .hue-slider::-webkit-slider-thumb {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.9);
        background: hsl(var(--hue, 210), 82%, 56%);
        box-shadow: 0 0 6px rgba(0, 0, 0, 0.45);
    }
    .hue-offset-inline .hue-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.9);
        background: hsl(var(--hue, 210), 82%, 56%);
        box-shadow: 0 0 6px rgba(0, 0, 0, 0.45);
        cursor: pointer;
    }
    .menu-palette-preview {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 6px;
        padding: 0 2px 8px;
    }
    .menu-palette-preview__slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 6px 4px;
        border-radius: 6px;
        background: rgba(10, 20, 40, 0.26);
    }
    .menu-palette-preview__swatch {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.35);
    }
    .menu-palette-preview__label {
        font-size: 0.58rem;
        letter-spacing: 0.08em;
        color: rgba(200, 220, 255, 0.72);
    }

    .player-config-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .player-config-row.inline-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border-radius: 6px;
        background: rgba(10, 20, 40, 0.4);
    }
    .player-label-inline {
        font-size: 0.85rem;
        font-weight: 600;
        color: rgba(200, 220, 255, 0.6);
        min-width: 30px;
    }
    .inline-select {
        flex: 1;
        padding: 10px 12px;
        font-size: 0.95rem;
        font-family: inherit;
        background: rgba(10, 30, 60, 0.6);
        color: #aaccff;
        border: 1px solid rgba(100, 200, 255, 0.2);
        border-radius: 6px;
        outline: none;
    }
    .inline-select:focus {
        border-color: #00ccff;
        box-shadow: 0 0 8px rgba(0, 200, 255, 0.2);
    }

    /* ── Multiplayer ── */
    .mp-label {
        display: block;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        color: rgba(200, 220, 255, 0.5);
        text-transform: uppercase;
        margin-bottom: 12px;
    }
    .mp-actions-compact {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 12px;
    }
    .mp-action-btn {
        padding: 12px 16px;
        font-family: inherit;
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        border: 1px solid rgba(0, 200, 200, 0.3);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
        text-transform: uppercase;
    }
    .mp-create-btn {
        background: rgba(0, 100, 200, 0.15);
        color: #00ccff;
    }
    .mp-create-btn:hover {
        background: rgba(0, 100, 200, 0.25);
        border-color: #00ccff;
    }
    .mp-join-btn {
        background: rgba(0, 100, 200, 0.1);
        color: #00ccaa;
        flex-shrink: 0;
    }
    .mp-join-btn:hover {
        background: rgba(0, 100, 200, 0.2);
    }
    .mp-join-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .join-inline {
        display: flex;
        gap: 6px;
    }
    .room-input {
        flex: 1;
        padding: 10px 14px;
        font-size: 0.95rem;
        font-family: inherit;
        background: rgba(10, 20, 40, 0.6);
        border: 1px solid rgba(100, 200, 255, 0.15);
        border-radius: 6px;
        color: #e0e0e0;
        outline: none;
    }
    .room-input:focus {
        border-color: #00ccff;
    }
    .room-input::placeholder {
        color: rgba(200, 220, 255, 0.25);
    }

    .room-browser {
        margin-top: 4px;
    }
    .browser-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
    }
    .refresh-btn {
        background: rgba(10, 20, 40, 0.6);
        border: 1px solid rgba(100, 200, 255, 0.15);
        border-radius: 4px;
        color: rgba(200, 220, 255, 0.5);
        cursor: pointer;
        font-size: 0.6rem;
        padding: 3px 8px;
        font-family: inherit;
    }
    .refresh-btn:hover {
        border-color: rgba(100, 200, 255, 0.3);
        color: #fff;
    }
    .room-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 150px;
        overflow-y: auto;
    }
    .room-card {
        padding: 8px;
        border-radius: 6px;
        background: rgba(10, 20, 40, 0.5);
        border: 1px solid rgba(100, 200, 255, 0.08);
        cursor: pointer;
        transition: all 0.15s;
    }
    .room-card:hover {
        border-color: rgba(100, 200, 255, 0.25);
    }
    .room-card-top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 2px;
    }
    .room-host {
        font-size: 0.7rem;
        font-weight: 600;
        color: #aaccff;
    }
    .room-card-mid {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
    .room-map {
        font-size: 0.6rem;
        color: #00ccaa;
        font-weight: 600;
    }
    .room-detail {
        font-size: 0.6rem;
        color: rgba(200, 220, 255, 0.4);
    }
    .room-card-bottom {
        margin-top: 2px;
    }
    .room-slots {
        font-size: 0.6rem;
        color: rgba(200, 220, 255, 0.4);
    }
    .room-players {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
    }
    .player-chip {
        font-size: 0.55rem;
        padding: 1px 6px;
        border-radius: 3px;
        background: rgba(100, 200, 255, 0.08);
        color: rgba(200, 220, 255, 0.5);
    }
    .tick-badge {
        color: #ffcc00;
        font-weight: 600;
    }

    .room-info-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        background: rgba(10, 20, 40, 0.4);
        border-radius: 6px;
        margin-bottom: 6px;
    }
    .room-id-block {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .room-label {
        font-size: 0.55rem;
        color: rgba(200, 220, 255, 0.4);
        letter-spacing: 0.1em;
    }
    .room-code {
        font-size: 0.65rem;
        color: #00ccff;
        font-family: monospace;
        background: rgba(0, 200, 255, 0.08);
        padding: 2px 6px;
        border-radius: 3px;
    }
    .copy-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 0.7rem;
        color: rgba(200, 220, 255, 0.4);
        padding: 0;
    }
    .copy-btn::after {
        content: "📋";
    }
    .player-count-badge {
        font-size: 0.65rem;
        font-weight: 600;
        color: #00ccaa;
    }
    .players-list ul {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    .player-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 3px 0;
        font-size: 0.7rem;
    }
    .player-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .player-name {
        color: #e0e0e0;
    }

    .badge {
        display: inline-block;
        font-size: 0.5rem;
        font-weight: 700;
        padding: 1px 4px;
        border-radius: 3px;
        margin-left: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .badge.host {
        background: rgba(255, 200, 0, 0.2);
        color: #ffcc00;
    }
    .badge.you {
        background: rgba(0, 200, 255, 0.15);
        color: #00ccff;
    }
    .badge.ai {
        background: rgba(200, 200, 200, 0.1);
        color: #888;
    }
    .badge.lobby {
        background: rgba(0, 200, 200, 0.1);
        color: #00ccaa;
    }
    .badge.playing {
        background: rgba(0, 255, 100, 0.1);
        color: #00ff66;
    }

    .lobby-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 8px;
    }
    .leave-btn {
        padding: 6px 12px;
        font-family: inherit;
        font-size: 0.65rem;
        background: rgba(255, 80, 80, 0.08);
        border: 1px solid rgba(255, 80, 80, 0.2);
        border-radius: 6px;
        color: #fca5a5;
        cursor: pointer;
        transition: all 0.15s;
    }
    .leave-btn:hover {
        background: rgba(255, 80, 80, 0.15);
        border-color: rgba(255, 80, 80, 0.4);
    }
    .dispose-btn {
        opacity: 0.6;
    }

    .waiting-text {
        font-size: 0.65rem;
        color: rgba(200, 220, 255, 0.3);
        font-style: italic;
    }
    .error-msg {
        font-size: 0.65rem;
        color: #f87171;
        margin-top: 4px;
    }
    .lobby-status-msg {
        font-size: 0.65rem;
        color: #ffcc00;
        margin-top: 4px;
    }
    .connected-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #00ff66;
        margin-left: 6px;
        vertical-align: middle;
    }
    .mp-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 16px;
        color: rgba(200, 220, 255, 0.5);
    }
    .spinner {
        width: 24px;
        height: 24px;
        border: 2px solid rgba(0, 200, 255, 0.2);
        border-top-color: #00ccff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* ═══ Join Modal ═══ */
    .confirm-overlay {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .confirm-dialog {
        background: rgba(10, 15, 30, 0.95);
        border: 1px solid rgba(100, 200, 255, 0.2);
        border-radius: 12px;
        padding: 20px;
        max-width: 380px;
        width: 90%;
    }
    .confirm-dialog h3 {
        margin: 0 0 8px;
        color: #00ccff;
        font-size: 1rem;
        letter-spacing: 0.05em;
    }
    .confirm-dialog p {
        margin: 4px 0;
        font-size: 0.75rem;
        color: rgba(200, 220, 255, 0.6);
    }
    .confirm-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
    }
    .confirm-actions .start-btn {
        flex: 1;
        padding: 10px;
        font-size: 0.8rem;
        margin: 0;
    }
    .confirm-actions .leave-btn {
        flex-shrink: 0;
    }

    .ai-select {
        margin-top: 8px;
    }
    .ai-label {
        font-size: 0.7rem;
        color: rgba(200, 220, 255, 0.5);
        margin: 0 0 6px;
    }
    .ai-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }
    .ai-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(10, 20, 40, 0.5);
        border: 1px solid rgba(100, 200, 255, 0.1);
        cursor: pointer;
        font-size: 0.65rem;
        color: #aaccff;
        transition: all 0.15s;
    }
    .ai-chip:hover {
        border-color: rgba(100, 200, 255, 0.3);
    }
    .ai-chip.selected {
        border-color: #00ccff;
        background: rgba(0, 100, 200, 0.15);
    }
    .ai-color {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    /* ═══ Mobile ═══ */
    /* ── Subtitle ── */
    .subtitle {
        font-size: 0.9rem;
        letter-spacing: 0.4em;
        color: rgba(180, 210, 255, 0.7);
        margin-top: 8px;
        text-transform: uppercase;
        text-shadow: 0 0 10px rgba(0, 150, 255, 0.2);
    }

    /* ── Quick Start ── */
    .quick-start {
        margin-top: 8px;
        margin-bottom: 8px;
        padding: 10px;
        font-size: 0.85rem;
        letter-spacing: 0.2em;
    }

    /* ═══ Condensed Right Column ═══ */
    /* ═══ Condensed Right Column ═══ */
    .compact-right {
        padding: 24px;
        border: 2px solid rgba(120, 0, 255, 0.5);
    }

    .section-heading-inline {
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        color: #00cccc;
        text-transform: uppercase;
        margin-right: auto;
    }

    .ai-section-compact {
        margin-bottom: 16px;
    }
    .ai-header-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
    }

    .ai-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .ai-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 6px;
        background: rgba(10, 20, 40, 0.4);
    }
    .ai-color-dot {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.22);
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.35);
        flex-shrink: 0;
    }
    .ai-select-mini {
        flex: 1;
        padding: 10px 12px;
        font-size: 0.95rem;
        font-family: inherit;
        background: rgba(10, 30, 60, 0.6);
        color: #aaccff;
        border: 1px solid rgba(100, 200, 255, 0.2);
        border-radius: 6px;
        outline: none;
    }
    .ai-select-mini:focus {
        border-color: #00ccff;
        box-shadow: 0 0 8px rgba(0, 200, 255, 0.2);
    }

    .mp-section-compact {
        margin-top: 4px;
    }

    /* ═══ Mobile ═══ */
    @media (max-width: 768px) {
        .menu-fullscreen {
            justify-content: flex-start;
            padding-top: 16px;
        }
        .menu-columns {
            grid-template-columns: 1fr;
        }
        .config-row-3 {
            grid-template-columns: 1fr 1fr;
        }
        .menu-container {
            width: 100%;
            padding: 16px;
        }
        .identity-audio-row {
            flex-direction: column;
            align-items: stretch;
        }
        .audio-compact {
            justify-content: center;
        }
        .quick-start {
            display: block;
        }
    }
    @media (min-width: 769px) {
        .quick-start {
            display: none;
        }
    }
    @media (max-width: 480px) {
        .config-row-3 {
            grid-template-columns: 1fr;
        }
        .options-row {
            flex-direction: column;
            gap: 8px;
        }
    }

    /* ── Dual action buttons ───────────────────────────────────────── */
    .start-actions-row {
        display: flex;
        gap: 8px;
        margin-top: 8px;
    }
    .start-actions-row .start-btn {
        flex: 1;
    }
    .mp-create-btn-main {
        background: linear-gradient(
            -45deg,
            rgba(200, 80, 255, 0.5),
            rgba(120, 0, 255, 0.5)
        ) !important;
        border-color: rgba(80, 180, 255, 0.3) !important;
    }
    .mp-create-btn-main:hover {
        border-color: rgba(80, 180, 255, 0.5) !important;
        background: linear-gradient(
            135deg,
            rgba(200, 80, 255, 0.5),
            rgba(120, 0, 255, 0.5)
        ) !important;
    }

    /* ── Numbered Slot Grid ──────────────────────────────────────── */
    .slot-grid {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 8px 0 4px;
    }
    .slot-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.02);
        transition: background 0.15s;
    }
    .slot-row:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    .slot-you {
        background: rgba(100, 200, 255, 0.06);
        border: 1px solid rgba(100, 200, 255, 0.15);
    }
    .slot-index {
        font-size: 0.6rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.3);
        min-width: 14px;
        text-align: center;
    }
    .slot-badges {
        margin-left: auto;
        display: flex;
        gap: 4px;
    }

    /* ── Vote to start ──────────────────────────────────────────── */
    .vote-btn {
        background: linear-gradient(
            135deg,
            rgba(255, 200, 0, 0.12),
            rgba(255, 200, 0, 0.04)
        ) !important;
        border-color: rgba(255, 200, 0, 0.25) !important;
    }
    .vote-btn:hover {
        border-color: rgba(255, 200, 0, 0.45) !important;
    }
    .vote-progress {
        font-size: 0.6rem;
        color: rgba(255, 200, 0, 0.7);
        padding: 2px 8px;
    }

    /* ── Lobby Chat ─────────────────────────────────────────────── */
    .lobby-chat-section {
        margin-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        padding-top: 6px;
    }
    .chat-toggle {
        font-family: inherit;
        font-size: 0.65rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.5);
        padding: 4px 10px;
        cursor: pointer;
        transition: all 0.15s;
        width: 100%;
        text-align: left;
    }
    .chat-toggle:hover {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.7);
    }
    .chat-count {
        display: inline-block;
        background: rgba(80, 180, 255, 0.2);
        color: #7dd3fc;
        font-size: 0.55rem;
        padding: 0 5px;
        border-radius: 8px;
        margin-left: 4px;
    }
    .chat-messages {
        max-height: 120px;
        overflow-y: auto;
        padding: 6px 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .chat-msg {
        font-size: 0.6rem;
        line-height: 1.3;
        padding: 2px 6px;
    }
    .chat-sender {
        font-weight: 600;
        margin-right: 4px;
    }
    .chat-sender::after {
        content: ":";
    }
    .chat-text {
        color: rgba(255, 255, 255, 0.7);
    }
    .chat-input-bar {
        display: flex;
        gap: 4px;
        margin-top: 4px;
    }
    .chat-input {
        flex: 1;
        padding: 4px 8px;
        font-family: inherit;
        font-size: 0.6rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: #e2e8f0;
        outline: none;
    }
    .chat-input:focus {
        border-color: rgba(100, 200, 255, 0.3);
    }
    .chat-send-btn {
        padding: 4px 10px;
        font-family: inherit;
        font-size: 0.6rem;
        background: rgba(80, 180, 255, 0.1);
        border: 1px solid rgba(80, 180, 255, 0.2);
        border-radius: 4px;
        color: #7dd3fc;
        cursor: pointer;
        transition: all 0.15s;
    }
    .chat-send-btn:hover {
        background: rgba(80, 180, 255, 0.2);
    }
</style>
