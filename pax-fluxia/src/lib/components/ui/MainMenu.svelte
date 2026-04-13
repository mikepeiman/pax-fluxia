<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { generateMapThumbnail } from "$lib/utils/mapThumbnail";
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { GAME_CONFIG, buildEngineConfig } from "$lib/config/game.config";
    import {
        loadPanelSettings,
        savePanelSettings,
        panelDefaultsFromConfig,
        loadVisuals,
        saveVisuals,
    } from "$lib/components/ui/panelSync";
    import type { GameSettings } from "$lib/types/game.types";
    import { multiplayerStore, type RoomListing } from "$lib/stores/multiplayerStore.svelte";
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
        PLAYER_HUE_NUDGE_LIMIT,
        clampPlayerHueNudge,
        generatePlayerPaletteHues,
        loadPlayerPaletteSettings,
        normalizePlayerPaletteNudges,
        savePlayerPaletteSettings,
    } from "$lib/utils/playerPalette";
    import { BG_IMAGES } from "$lib/config/bgManifest";
    import type { MenuTheme } from "./menuTheme";
    import MenuUtilityTopbar from "./main-menu/MenuUtilityTopbar.svelte";
    import GameMapPanel from "./main-menu/GameMapPanel.svelte";
    import PlayersPanel from "./main-menu/PlayersPanel.svelte";
    import MultiplayerPanel from "./main-menu/MultiplayerPanel.svelte";
    import MenuCommandBar from "./main-menu/MenuCommandBar.svelte";

    type MapMode = "random" | "classic" | "custom";
    type MobileTab = "setup" | "players" | "multiplayer";

    let visible = $state(true);
    let showAudioSettings = $state(false);
    let bgOpen = $state(false);

    const visuals = loadVisuals();
    let bgImage = $state(visuals.bgImage);
    let menuTheme = $state<MenuTheme>(loadSetting<MenuTheme>("menuTheme", "imperial"));
    let activeMobileTab = $state<MobileTab>("setup");

    let mapMode = $state<MapMode>(loadSetting<MapMode>("mapMode", "random"));
    let mapType = $state(loadSetting("mapType", "standard"));
    let selectedClassicMap = $state<string | null>(loadSetting("selectedClassicMap", null));
    let selectedCustomMap = $state<string | null>(loadSetting("selectedCustomMap", null));

    let playerCount = $state<GameSettings["playerCount"]>(loadSetting("playerCount", 6));
    let starsPerPlayer = $state(loadSetting("starsPerPlayer", 5));
    let shipsPerStar = $state(loadSetting("shipsPerStar", 40));
    let minLinks = $state(loadSetting("minLinks", 1));
    let maxLinks = $state(loadSetting("maxLinks", 6));
    let starSpacing = $state(loadSetting("starSpacing", 1.0));
    let mapBoardFit = $state(loadSetting("mapBoardFit", 0.55));
    let retainOrderOnConquest = $state(loadSetting("retainOrderOnConquest", true));
    let allowOpposingOrders = $state(loadSetting("allowOpposingOrders", false));
    let neutralStarCount = $state(loadSetting("neutralStarCount", 0));
    let neutralShipsPerStar = $state(loadSetting("neutralShipsPerStar", 10));
    let specialStarPercentage = $state(loadSetting("specialStarPercentage", 20));
    let tickDuration = $state(loadSetting("tickDuration", GAME_CONFIG.BASE_TICK_MS));

    let menuStarMargin = $state(45);
    let menuLaneMargin = $state(75);
    let menuCurveVsPruneBias = $state(0.55);
    let menuLaneMode = $state<"straight" | "curved">("curved");

    const storedPaletteSettings = loadPlayerPaletteSettings();
    let playerName = $state(loadSetting("playerName", "Commander"));
    let colorSat = $state(loadSetting("colorSat", storedPaletteSettings.saturation));
    let colorLig = $state(loadSetting("colorLig", storedPaletteSettings.lightness));
    let hueOffset = $state(loadSetting("hueOffset", storedPaletteSettings.anchorHue));
    let showAIDetails = $state(false);

    let playerConfigs = $state(
        sanitizePlayerConfigs(
            loadSetting(
                "playerConfigs",
                makeDefaultPlayerConfigs(loadSetting("playerCount", 6)),
            ),
            storedPaletteSettings.anchorHue,
        ),
    );

    let thumbnailUrl = $state("");
    let previewSeed = $state(0);
    let selectedRoomId = $state<string | null>(null);
    let confirmJoinTarget = $state<RoomListing | null>(null);
    let selectedTakeOverId = $state<string | null>(null);

    const selectedRoom = $derived(
        multiplayerStore.availableRooms.find((room) => room.roomId === selectedRoomId) ?? null,
    );

    const fullPaletteNudges = $derived(
        normalizePlayerPaletteNudges(
            Array.from(
                { length: PLAYER_PALETTE_SIZE },
                (_, index) => playerConfigs[index]?.hueNudge ?? 0,
            ),
        ),
    );

    const activePlayerPaletteHues = $derived(
        generatePlayerPaletteHues(
            hueOffset,
            playerCount,
            fullPaletteNudges.slice(0, playerCount),
        ),
    );

    const fullPlayerPaletteHues = $derived(
        generatePlayerPaletteHues(hueOffset, PLAYER_PALETTE_SIZE, fullPaletteNudges),
    );

    const commandSummary = $derived(
        `${getMapSummary()} - ${playerCount} players - ${starsPerPlayer} stars / player - ${shipsPerStar} ships / star - ${(tickDuration / 1000).toFixed(1)}s tick`,
    );

    const selectedRoomLabel = $derived(
        selectedRoom
            ? selectedRoom.metadata?.publicRoomLabel ||
              selectedRoom.metadata?.hostName ||
              selectedRoom.name ||
              selectedRoom.roomId
            : null,
    );

    $effect(() => {
        visuals.bgImage = bgImage;
        GAME_CONFIG.BG_IMAGE_URL = bgImage;
        saveVisuals(visuals);
    });

    $effect(() => {
        saveSetting("menuTheme", menuTheme);
    });

    $effect(() => {
        saveSetting("playerName", playerName);
        multiplayerStore.playerName = playerName || "Commander";
    });

    $effect(() => {
        multiplayerStore.playerColor = getPlayerColorHex(0);
    });

    $effect(() => {
        if (multiplayerStore.phase === "playing") {
            log.sys("MainMenu", "Multiplayer game started, transitioning to game view");
            visible = false;
            gameStore.setView("game");
        }
    });

    $effect(() => {
        if (multiplayerStore.isConnected) {
            activeMobileTab = "multiplayer";
        }
    });

    $effect(() => {
        const rooms = multiplayerStore.availableRooms;
        if (rooms.length === 0) {
            selectedRoomId = null;
            return;
        }
        if (!selectedRoomId || !rooms.some((room) => room.roomId === selectedRoomId)) {
            selectedRoomId = rooms[0].roomId;
        }
    });

    $effect(() => {
        const aiPlayers =
            confirmJoinTarget?.metadata?.phase === "playing"
                ? confirmJoinTarget.metadata.aiPlayers
                : undefined;
        if (!aiPlayers?.length) {
            selectedTakeOverId = null;
            return;
        }
        if (!selectedTakeOverId || !aiPlayers.some((ai) => ai.sessionId === selectedTakeOverId)) {
            selectedTakeOverId = aiPlayers[0].sessionId;
        }
    });

    $effect(() => {
        if (
            playerConfigs.length !== PLAYER_PALETTE_SIZE ||
            playerConfigs.some((config) => typeof config?.hueNudge !== "number")
        ) {
            playerConfigs = sanitizePlayerConfigs(playerConfigs, hueOffset);
        }

        for (let index = 0; index < PLAYER_PALETTE_SIZE; index++) {
            const nextHue =
                (index < playerCount ? activePlayerPaletteHues[index] : fullPlayerPaletteHues[index]) ??
                playerConfigs[index]?.hue ??
                0;
            if (playerConfigs[index].hue !== nextHue) {
                playerConfigs[index].hue = nextHue;
            }
            playerConfigs[index].isAI = index > 0;
        }

        savePlayerPaletteSettings({
            anchorHue: hueOffset,
            saturation: colorSat,
            lightness: colorLig,
            nudges: fullPaletteNudges,
        });
    });

    $effect(() => {
        void playerCount;
        void starsPerPlayer;
        void minLinks;
        void maxLinks;
        void starSpacing;
        void mapBoardFit;
        void neutralStarCount;
        void specialStarPercentage;
        void menuStarMargin;
        void menuLaneMargin;
        void menuCurveVsPruneBias;
        void menuLaneMode;
        void previewSeed;
        generatePreview();
    });

    $effect(() => {
        if (!multiplayerStore.isConnected) {
            multiplayerStore.startRoomPolling();
            return () => multiplayerStore.stopRoomPolling();
        }
        multiplayerStore.stopRoomPolling();
    });

    onMount(() => {
        const laneKnobs = readLaneKnobsFromPanel();
        menuStarMargin = laneKnobs.msr;
        menuLaneMargin = laneKnobs.laneMargin;
        menuCurveVsPruneBias = laneKnobs.curveVsPruneBias;
        menuLaneMode = laneKnobs.mode;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target?.closest(".background-picker")) {
                bgOpen = false;
            }
        };

        document.addEventListener("mousedown", handlePointerDown, true);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown, true);
        };
    });

    function loadSetting<T>(key: string, defaultValue: T): T {
        if (typeof window === "undefined") return defaultValue;
        const stored = localStorage.getItem(`pax-fluxia-${key}`);
        if (!stored) return defaultValue;
        try {
            return JSON.parse(stored) as T;
        } catch {
            return defaultValue;
        }
    }

    function saveSetting(key: string, value: unknown) {
        if (typeof window === "undefined") return;
        localStorage.setItem(`pax-fluxia-${key}`, JSON.stringify(value));
    }

    function hslToHex(hue: number): string {
        return hslToHexBase(hue, colorSat / 100, colorLig / 100);
    }

    function sanitizePlayerConfigs(input: PlayerConfig[], anchorHue: number): PlayerConfig[] {
        const normalized = makeDefaultPlayerConfigs(PLAYER_PALETTE_SIZE, anchorHue);
        const source = Array.isArray(input) ? input : [];
        const storedNudges = normalizePlayerPaletteNudges(storedPaletteSettings.nudges);

        for (let index = 0; index < PLAYER_PALETTE_SIZE; index++) {
            normalized[index] = {
                ...normalized[index],
                hueNudge: clampPlayerHueNudge(
                    source[index]?.hueNudge ??
                        storedNudges[index] ??
                        normalized[index].hueNudge,
                ),
                difficulty: source[index]?.difficulty ?? normalized[index].difficulty,
                strategy: source[index]?.strategy ?? normalized[index].strategy,
                isAI: index > 0,
            };
        }

        return normalized;
    }

    function readLaneKnobsFromPanel() {
        const panelSettings = loadPanelSettings(panelDefaultsFromConfig());
        const modeRaw = panelSettings.mapgenLaneMode;
        const mode: "straight" | "curved" =
            modeRaw === "straight" || modeRaw === "curved"
                ? modeRaw
                : (GAME_CONFIG.MAPGEN_LANE_MODE ?? "curved");

        return {
            msr: Math.round(
                panelSettings.starMargin ??
                    GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ??
                    45,
            ),
            laneMargin: Math.round(
                panelSettings.mapgenLaneMarginPx ??
                    GAME_CONFIG.MAPGEN_LANE_MARGIN_PX ??
                    75,
            ),
            curveVsPruneBias: Math.min(
                1,
                Math.max(
                    0,
                    panelSettings.mapgenLaneCurveVsPruneBias ??
                        GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ??
                        0.55,
                ),
            ),
            mode,
        };
    }

    function persistMenuLaneKnobs() {
        const panelSettings = loadPanelSettings(panelDefaultsFromConfig());
        panelSettings.starMargin = menuStarMargin;
        panelSettings.mapgenLaneMarginPx = menuLaneMargin;
        panelSettings.mapgenLaneCurveVsPruneBias = menuCurveVsPruneBias;
        panelSettings.mapgenLaneMode = menuLaneMode;
        savePanelSettings(panelSettings);

        GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN = menuStarMargin;
        GAME_CONFIG.MAPGEN_LANE_MARGIN_PX = menuLaneMargin;
        GAME_CONFIG.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS = menuCurveVsPruneBias;
        GAME_CONFIG.MAPGEN_LANE_MODE = menuLaneMode;
    }

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

        thumbnailUrl = generateMapThumbnail(stars, connections, {
            width: 240,
            height: 135,
        });
    }

    function saveAllSettings() {
        saveSetting("mapMode", mapMode);
        saveSetting("mapType", mapType);
        saveSetting("selectedClassicMap", selectedClassicMap);
        saveSetting("selectedCustomMap", selectedCustomMap);
        saveSetting("playerCount", playerCount);
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

    function getClassicMaps() {
        return gameStore.savedMaps.filter((map) => Boolean((map as any).builtIn));
    }

    function getCustomMaps() {
        return gameStore.savedMaps.filter((map) => !Boolean((map as any).builtIn));
    }

    function getPlayerHue(index: number): number {
        return (
            (index < playerCount ? activePlayerPaletteHues[index] : fullPlayerPaletteHues[index]) ??
            hueOffset
        );
    }

    function getPlayerColorHex(index: number): string {
        return hslToHex(getPlayerHue(index));
    }

    function getConfiguredPlayerColors(count: number): string[] {
        return Array.from({ length: count }, (_, index) => getPlayerColorHex(index));
    }

    function getMapSummary(): string {
        if (mapMode === "classic") {
            return selectedClassicMap || "Classic map";
        }
        if (mapMode === "custom") {
            return selectedCustomMap || "Custom map";
        }
        return "Random sector";
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

        const selectedMap = MAP_DEFS.find((map) => map.id === mapType) ?? MAP_DEFS[0];

        gameStore.updateSettings({
            playerCount,
            mapType: selectedMap.mapType,
            minLinksPerStar: minLinks,
            maxLinksPerStar: maxLinks,
            starSpacing,
            mapBoardFit,
            gameSpeed: tickDuration,
            playerColors: getConfiguredPlayerColors(playerCount),
            neutralStarCount,
            neutralShipsPerStar,
            specialStarPercentage,
        });

        GAME_CONFIG.CONQUEST_SLOWMO_ENABLED = selectedMap.mapType === "debug-b";
    }

    function startSPGame() {
        saveAllSettings();
        const selectedSavedMapName =
            mapMode === "classic"
                ? selectedClassicMap
                : mapMode === "custom"
                  ? selectedCustomMap
                  : null;

        if (selectedSavedMapName) {
            const savedMap = gameStore.savedMaps.find(
                (map) => map.metadata.name === selectedSavedMapName,
            );
            if (savedMap) {
                applyConfig();
                gameStore.loadSavedMap(savedMap);
                gameStore.restart();
                visible = false;
                return;
            }
        }

        applyConfig();
        gameStore.restart();
        visible = false;
    }

    async function handleCreateRoom() {
        saveAllSettings();
        applyConfig();

        if (mapMode === "custom") {
            multiplayerStore.playerName = playerName || "Commander";
            multiplayerStore.playerColor = getPlayerColorHex(0);
            multiplayerStore.fetchRooms();
            return;
        }

        const selectedMap = MAP_DEFS.find((map) => map.id === mapType) ?? MAP_DEFS[0];
        const gameplayConfig = buildEngineConfig();

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
            playerColors: getConfiguredPlayerColors(playerCount),
        });

        multiplayerStore.playerName = playerName || "Commander";
        multiplayerStore.playerColor = getPlayerColorHex(0);
    }

    async function handleJoinSelectedRoom() {
        if (!selectedRoom) return;
        if (selectedRoom.metadata?.phase === "playing") {
            confirmJoinTarget = selectedRoom;
            return;
        }
        await multiplayerStore.joinRoomById(selectedRoom.roomId);
    }

    async function handleConfirmJoin() {
        if (!confirmJoinTarget) return;
        const takeOver =
            confirmJoinTarget.metadata?.phase === "playing"
                ? selectedTakeOverId || undefined
                : undefined;
        await multiplayerStore.joinRoomById(confirmJoinTarget.roomId, takeOver);
        confirmJoinTarget = null;
        selectedTakeOverId = null;
    }

    function triggerStartAction() {
        audioManager.play("click");
        startSPGame();
    }

    function triggerCreateLobbyAction() {
        audioManager.play("click");
        void handleCreateRoom();
    }

    function triggerJoinSelectedAction() {
        audioManager.play("click");
        void handleJoinSelectedRoom();
    }

    function handleMapModeChange(mode: MapMode) {
        mapMode = mode;
        if (mode === "random") {
            mapType = "standard";
        }
    }

    function updatePlayerName(value: string) {
        playerName = value;
    }

    function updatePlayerDifficulty(index: number, value: string) {
        if (!playerConfigs[index]) return;
        playerConfigs[index].difficulty = value;
    }

    function updatePlayerStrategy(index: number, value: string) {
        if (!playerConfigs[index]) return;
        playerConfigs[index].strategy = value;
    }

    function updatePlayerHueNudge(index: number, value: number) {
        if (!playerConfigs[index]) return;
        playerConfigs[index].hueNudge = clampPlayerHueNudge(value);
    }

    function resetPlayerHueNudge(index: number) {
        updatePlayerHueNudge(index, 0);
    }
</script>

{#if visible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="menu-fullscreen"
        data-theme={menuTheme}
        transition:fade
        style:background-image={bgImage ? `url(/assets/${bgImage})` : "none"}
        style:background-size={bgImage ? "cover" : "auto"}
        style:background-position={bgImage ? "center" : "auto"}
    >
        <svg
            class="hex-grid-overlay"
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
        >
            <defs>
                <pattern id="hexPattern" width="56" height="100" patternUnits="userSpaceOnUse">
                    <path
                        d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                    />
                    <path
                        d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                    />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexPattern)" />
        </svg>

        <div class="menu-shell" transition:fly={{ y: 20, duration: 260 }}>
            <header class="title-block">
                <h1 class="title">
                    <span class="pax">PAX</span>
                    <span class="fluxia">FLUXIA</span>
                </h1>
                <p class="subtitle">Territory Control Strategy</p>
            </header>

            <MenuUtilityTopbar
                bgOpen={bgOpen}
                bgImage={bgImage}
                bgImages={BG_IMAGES}
                muted={audioManager.muted}
                masterVolume={audioManager.masterVolume}
                onToggleBackgrounds={() => (bgOpen = !bgOpen)}
                onSelectBackground={(image) => {
                    bgImage = image;
                    bgOpen = false;
                }}
                onToggleMute={() => (audioManager.muted = !audioManager.muted)}
                onSetVolume={(value) => audioManager.setMasterVolume(value)}
                onOpenSettings={() => (showAudioSettings = true)}
            />

            <div class="mobile-tabs">
                <button
                    type="button"
                    class="mobile-tabs__button"
                    class:is-active={activeMobileTab === "setup"}
                    onclick={() => (activeMobileTab = "setup")}
                >
                    Setup
                </button>
                <button
                    type="button"
                    class="mobile-tabs__button"
                    class:is-active={activeMobileTab === "players"}
                    onclick={() => (activeMobileTab = "players")}
                >
                    Players
                </button>
                <button
                    type="button"
                    class="mobile-tabs__button"
                    class:is-active={activeMobileTab === "multiplayer"}
                    onclick={() => (activeMobileTab = "multiplayer")}
                >
                    Multiplayer
                </button>
            </div>

            <div class="desktop-panels">
                <GameMapPanel
                    mapMode={mapMode}
                    selectedClassicMap={selectedClassicMap}
                    selectedCustomMap={selectedCustomMap}
                    starsPerPlayer={starsPerPlayer}
                    shipsPerStar={shipsPerStar}
                    minLinks={minLinks}
                    maxLinks={maxLinks}
                    starSpacing={starSpacing}
                    mapBoardFit={mapBoardFit}
                    menuStarMargin={menuStarMargin}
                    menuLaneMargin={menuLaneMargin}
                    menuCurveVsPruneBias={menuCurveVsPruneBias}
                    menuLaneMode={menuLaneMode}
                    neutralStarCount={neutralStarCount}
                    neutralShipsPerStar={neutralShipsPerStar}
                    specialStarPercentage={specialStarPercentage}
                    tickDuration={tickDuration}
                    thumbnailUrl={thumbnailUrl}
                    classicMaps={getClassicMaps()}
                    customMaps={getCustomMaps()}
                    onMapModeChange={handleMapModeChange}
                    onClassicMapSelect={(name) => (selectedClassicMap = name)}
                    onCustomMapSelect={(name) => (selectedCustomMap = name)}
                    onStarsPerPlayerChange={(value) => (starsPerPlayer = value)}
                    onShipsPerStarChange={(value) => (shipsPerStar = value)}
                    onMinLinksChange={(value) => (minLinks = value)}
                    onMaxLinksChange={(value) => (maxLinks = value)}
                    onStarSpacingChange={(value) => (starSpacing = value)}
                    onMapBoardFitChange={(value) => (mapBoardFit = value)}
                    onLaneModeChange={(value) => {
                        menuLaneMode = value;
                        persistMenuLaneKnobs();
                    }}
                    onStarMarginChange={(value) => {
                        menuStarMargin = value;
                        persistMenuLaneKnobs();
                    }}
                    onLaneMarginChange={(value) => {
                        menuLaneMargin = value;
                        persistMenuLaneKnobs();
                    }}
                    onCurveVsPruneBiasChange={(value) => {
                        menuCurveVsPruneBias = value;
                        persistMenuLaneKnobs();
                    }}
                    onSpecialStarPercentageChange={(value) => (specialStarPercentage = value)}
                    onNeutralStarCountChange={(value) => (neutralStarCount = value)}
                    onNeutralShipsPerStarChange={(value) => (neutralShipsPerStar = value)}
                    onTickDurationChange={(value) => (tickDuration = value)}
                    onReshuffle={() => (previewSeed += 1)}
                />

                <PlayersPanel
                    playerCount={playerCount}
                    playerOptions={PLAYERS}
                    playerName={playerName}
                    playerConfigs={playerConfigs}
                    difficultyOptions={DIFFICULTIES}
                    strategyOptions={AI_STRATEGIES}
                    showAIDetails={showAIDetails}
                    hueOffset={hueOffset}
                    colorSat={colorSat}
                    colorLig={colorLig}
                    playerHueLimit={PLAYER_HUE_NUDGE_LIMIT}
                    getPlayerColorHex={getPlayerColorHex}
                    getPlayerHue={getPlayerHue}
                    onPlayerCountChange={(count) => (playerCount = count)}
                    onPlayerNameChange={updatePlayerName}
                    onToggleAIDetails={() => (showAIDetails = !showAIDetails)}
                    onHueOffsetChange={(value) => (hueOffset = value)}
                    onColorSatChange={(value) => (colorSat = value)}
                    onColorLigChange={(value) => (colorLig = value)}
                    onPlayerDifficultyChange={updatePlayerDifficulty}
                    onPlayerStrategyChange={updatePlayerStrategy}
                    onPlayerHueNudgeChange={updatePlayerHueNudge}
                    onResetPlayerHueNudge={resetPlayerHueNudge}
                />

                <MultiplayerPanel
                    mapMode={mapMode}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={(roomId) => (selectedRoomId = roomId)}
                />
            </div>

            <div class="mobile-panel">
                {#if activeMobileTab === "setup"}
                    <GameMapPanel
                        mapMode={mapMode}
                        selectedClassicMap={selectedClassicMap}
                        selectedCustomMap={selectedCustomMap}
                        starsPerPlayer={starsPerPlayer}
                        shipsPerStar={shipsPerStar}
                        minLinks={minLinks}
                        maxLinks={maxLinks}
                        starSpacing={starSpacing}
                        mapBoardFit={mapBoardFit}
                        menuStarMargin={menuStarMargin}
                        menuLaneMargin={menuLaneMargin}
                        menuCurveVsPruneBias={menuCurveVsPruneBias}
                        menuLaneMode={menuLaneMode}
                        neutralStarCount={neutralStarCount}
                        neutralShipsPerStar={neutralShipsPerStar}
                        specialStarPercentage={specialStarPercentage}
                        tickDuration={tickDuration}
                        thumbnailUrl={thumbnailUrl}
                        classicMaps={getClassicMaps()}
                        customMaps={getCustomMaps()}
                        onMapModeChange={handleMapModeChange}
                        onClassicMapSelect={(name) => (selectedClassicMap = name)}
                        onCustomMapSelect={(name) => (selectedCustomMap = name)}
                        onStarsPerPlayerChange={(value) => (starsPerPlayer = value)}
                        onShipsPerStarChange={(value) => (shipsPerStar = value)}
                        onMinLinksChange={(value) => (minLinks = value)}
                        onMaxLinksChange={(value) => (maxLinks = value)}
                        onStarSpacingChange={(value) => (starSpacing = value)}
                        onMapBoardFitChange={(value) => (mapBoardFit = value)}
                        onLaneModeChange={(value) => {
                            menuLaneMode = value;
                            persistMenuLaneKnobs();
                        }}
                        onStarMarginChange={(value) => {
                            menuStarMargin = value;
                            persistMenuLaneKnobs();
                        }}
                        onLaneMarginChange={(value) => {
                            menuLaneMargin = value;
                            persistMenuLaneKnobs();
                        }}
                        onCurveVsPruneBiasChange={(value) => {
                            menuCurveVsPruneBias = value;
                            persistMenuLaneKnobs();
                        }}
                        onSpecialStarPercentageChange={(value) => (specialStarPercentage = value)}
                        onNeutralStarCountChange={(value) => (neutralStarCount = value)}
                        onNeutralShipsPerStarChange={(value) => (neutralShipsPerStar = value)}
                        onTickDurationChange={(value) => (tickDuration = value)}
                        onReshuffle={() => (previewSeed += 1)}
                    />
                {:else if activeMobileTab === "players"}
                    <PlayersPanel
                        playerCount={playerCount}
                        playerOptions={PLAYERS}
                        playerName={playerName}
                        playerConfigs={playerConfigs}
                        difficultyOptions={DIFFICULTIES}
                        strategyOptions={AI_STRATEGIES}
                        showAIDetails={showAIDetails}
                        hueOffset={hueOffset}
                        colorSat={colorSat}
                        colorLig={colorLig}
                        playerHueLimit={PLAYER_HUE_NUDGE_LIMIT}
                        getPlayerColorHex={getPlayerColorHex}
                        getPlayerHue={getPlayerHue}
                        onPlayerCountChange={(count) => (playerCount = count)}
                        onPlayerNameChange={updatePlayerName}
                        onToggleAIDetails={() => (showAIDetails = !showAIDetails)}
                        onHueOffsetChange={(value) => (hueOffset = value)}
                        onColorSatChange={(value) => (colorSat = value)}
                        onColorLigChange={(value) => (colorLig = value)}
                        onPlayerDifficultyChange={updatePlayerDifficulty}
                        onPlayerStrategyChange={updatePlayerStrategy}
                        onPlayerHueNudgeChange={updatePlayerHueNudge}
                        onResetPlayerHueNudge={resetPlayerHueNudge}
                    />
                {:else}
                    <MultiplayerPanel
                        mapMode={mapMode}
                        selectedRoomId={selectedRoomId}
                        onSelectRoom={(roomId) => (selectedRoomId = roomId)}
                    />
                {/if}
            </div>

            <MenuCommandBar
                summary={commandSummary}
                selectedRoomLabel={selectedRoomLabel}
                startDisabled={multiplayerStore.isConnected}
                createDisabled={mapMode === "custom" || multiplayerStore.isConnected}
                joinDisabled={!selectedRoom || multiplayerStore.isConnected}
                onStart={triggerStartAction}
                onCreateLobby={triggerCreateLobbyAction}
                onJoinSelected={triggerJoinSelectedAction}
            />
        </div>
    </div>
{/if}

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
        <div class="confirm-dialog" onclick={(event) => event.stopPropagation()}>
            <h3>Join Room?</h3>
            <p>
                Host:
                <strong>
                    {confirmJoinTarget.metadata?.publicRoomLabel ||
                        confirmJoinTarget.metadata?.hostName ||
                        "Unknown"}
                </strong>
            </p>
            <p>
                {confirmJoinTarget.clients}/{confirmJoinTarget.maxClients} players -
                {confirmJoinTarget.metadata?.mapType || "standard"}
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
                                class:selected={selectedTakeOverId === ai.sessionId}
                                onclick={() => (selectedTakeOverId = ai.sessionId)}
                            >
                                <span class="ai-color" style={`background:${ai.color}`}></span>
                                {ai.name}
                            </div>
                        {/each}
                    </div>
                </div>
            {:else if confirmJoinTarget.metadata?.phase === "playing"}
                <p class="error-msg">No AI players available to take over.</p>
            {/if}

            <div class="confirm-actions">
                <button type="button" class="confirm-primary" onclick={handleConfirmJoin}>
                    {confirmJoinTarget.metadata?.phase === "playing" ? "Take Over" : "Join"}
                </button>
                <button
                    type="button"
                    class="confirm-secondary"
                    onclick={() => {
                        confirmJoinTarget = null;
                        selectedTakeOverId = null;
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
{/if}

<AudioSettings
    visible={showAudioSettings}
    menuTheme={menuTheme}
    onMenuThemeChange={(theme) => (menuTheme = theme)}
    onClose={() => {
        showAudioSettings = false;
    }}
/>

<style>
    @import url("https://fonts.googleapis.com/css2?family=Oxanium:wght@300;400;500;600;700;800&family=Rajdhani:wght@400;500;600;700&display=swap");

    :global(body) {
        margin: 0;
        background: #050510;
    }

    .menu-fullscreen {
        --pf-text: #ecf5ff;
        --pf-heading: #9fdfff;
        --pf-muted: rgba(212, 229, 255, 0.64);
        --pf-muted-strong: rgba(232, 241, 255, 0.84);
        --pf-border-soft: rgba(123, 195, 255, 0.18);
        --pf-accent-soft: rgba(109, 212, 255, 0.62);
        --pf-accent-strong: #56d6ff;
        --pf-control-bg: rgba(10, 22, 40, 0.74);
        --pf-cta-start-a: rgba(19, 115, 214, 0.92);
        --pf-cta-start-b: rgba(20, 177, 207, 0.92);
        --pf-panel-pad: 20px;
        --pf-card-pad: 16px;
        --pf-panel-radius: 24px;
        --pf-card-radius: 16px;
        --pf-control-h: 44px;
        --pf-pill-h: 40px;
        position: fixed;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 24px;
        overflow-y: auto;
        background:
            radial-gradient(circle at 18% 20%, rgba(255, 173, 92, 0.18), transparent 30%),
            radial-gradient(circle at 78% 22%, rgba(104, 130, 255, 0.18), transparent 36%),
            radial-gradient(circle at 50% 85%, rgba(87, 190, 255, 0.12), transparent 30%),
            rgba(3, 7, 14, 0.9);
        background-blend-mode: screen, screen, screen, normal;
        color: var(--pf-text);
        font-family: "Rajdhani", sans-serif;
    }

    .menu-fullscreen[data-theme="neon"] {
        --pf-text: #eaf8ff;
        --pf-heading: #8fe9ff;
        --pf-muted: rgba(216, 239, 255, 0.62);
        --pf-muted-strong: rgba(236, 245, 255, 0.88);
        --pf-border-soft: rgba(89, 228, 255, 0.22);
        --pf-accent-soft: rgba(125, 255, 198, 0.66);
        --pf-accent-strong: #7effe6;
        --pf-control-bg: rgba(8, 18, 42, 0.82);
        --pf-cta-start-a: rgba(0, 128, 255, 0.9);
        --pf-cta-start-b: rgba(0, 232, 255, 0.9);
    }

    .menu-fullscreen[data-theme="mythic"] {
        --pf-text: #f6eeff;
        --pf-heading: #e6c0ff;
        --pf-muted: rgba(238, 222, 255, 0.62);
        --pf-muted-strong: rgba(248, 239, 255, 0.88);
        --pf-border-soft: rgba(220, 171, 255, 0.18);
        --pf-accent-soft: rgba(255, 194, 112, 0.52);
        --pf-accent-strong: #ffce83;
        --pf-control-bg: rgba(24, 16, 42, 0.78);
        --pf-cta-start-a: rgba(143, 73, 255, 0.86);
        --pf-cta-start-b: rgba(255, 137, 87, 0.86);
    }

    .hex-grid-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        color: rgba(158, 209, 255, 0.05);
    }

    .menu-shell {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 18px;
        width: min(1640px, 100%);
    }

    .title-block {
        display: grid;
        gap: 6px;
        justify-items: center;
        text-align: center;
        padding-top: 8px;
    }

    .title {
        margin: 0;
        line-height: 0.95;
    }

    .pax,
    .fluxia {
        display: block;
        font-family: "Oxanium", sans-serif;
        text-transform: uppercase;
    }

    .pax {
        font-size: clamp(2.4rem, 4.5vw, 4rem);
        font-weight: 300;
        letter-spacing: 0.5em;
        color: rgba(241, 248, 255, 0.9);
    }

    .fluxia {
        font-size: clamp(3.6rem, 7vw, 5.8rem);
        font-weight: 800;
        letter-spacing: 0.16em;
        background: linear-gradient(180deg, #ffffff, var(--pf-accent-strong));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        filter: drop-shadow(0 0 18px rgba(86, 214, 255, 0.32));
    }

    .subtitle {
        margin: 0;
        font-family: "Rajdhani", sans-serif;
        font-size: 0.88rem;
        font-weight: 700;
        letter-spacing: 0.36em;
        text-transform: uppercase;
        color: var(--pf-muted);
    }

    .desktop-panels {
        display: grid;
        grid-template-columns: minmax(0, 1.56fr) minmax(320px, 0.96fr) minmax(280px, 0.82fr);
        gap: 18px;
        align-items: start;
    }

    .mobile-tabs,
    .mobile-panel {
        display: none;
    }

    :global(.menu-panel) {
        border-radius: var(--pf-panel-radius);
        border: 1px solid var(--pf-border-soft);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 40%),
            rgba(6, 12, 24, 0.84);
        backdrop-filter: blur(18px);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 20px 44px rgba(0, 0, 0, 0.28);
        padding: var(--pf-panel-pad);
    }

    :global(.menu-panel__header) {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
    }

    :global(.menu-panel__eyebrow) {
        margin: 0;
        font-family: "Oxanium", sans-serif;
        font-size: 1.08rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--pf-heading);
    }

    :global(.menu-panel__title) {
        margin: 6px 0 0;
        font-family: "Rajdhani", sans-serif;
        font-size: 1.22rem;
        font-weight: 600;
        color: var(--pf-muted);
    }

    :global(.menu-shell input[type="range"]) {
        accent-color: var(--pf-accent-strong);
    }

    :global(.menu-shell input[type="range"]::-webkit-slider-runnable-track) {
        height: 6px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
    }

    :global(.menu-shell input[type="range"]::-webkit-slider-thumb) {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        margin-top: -5px;
        border-radius: 999px;
        border: 2px solid rgba(255, 255, 255, 0.9);
        background: var(--pf-accent-strong);
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.24);
    }

    :global(.menu-shell input[type="range"]::-moz-range-track) {
        height: 6px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
    }

    :global(.menu-shell input[type="range"]::-moz-range-thumb) {
        width: 16px;
        height: 16px;
        border-radius: 999px;
        border: 2px solid rgba(255, 255, 255, 0.9);
        background: var(--pf-accent-strong);
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.24);
    }

    .confirm-overlay {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(2, 6, 14, 0.76);
        backdrop-filter: blur(10px);
        z-index: 40;
    }

    .confirm-dialog {
        width: min(460px, 100%);
        padding: 24px;
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 38%),
            rgba(5, 12, 24, 0.96);
        color: var(--pf-text);
        box-shadow: 0 24px 44px rgba(0, 0, 0, 0.34);
    }

    .confirm-dialog h3 {
        margin: 0 0 12px;
        font-family: "Oxanium", sans-serif;
        font-size: 1.15rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .confirm-dialog p {
        margin: 10px 0 0;
        font-family: "Rajdhani", sans-serif;
        font-size: 1rem;
        color: var(--pf-muted-strong);
    }

    .ai-select {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .ai-label {
        margin: 0 0 10px;
        font-family: "Rajdhani", sans-serif;
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--pf-muted);
    }

    .ai-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .ai-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--pf-border-soft);
        background: rgba(255, 255, 255, 0.04);
        font-family: "Rajdhani", sans-serif;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
    }

    .ai-chip.selected {
        border-color: var(--pf-accent-soft);
        background: rgba(255, 255, 255, 0.08);
        color: var(--pf-text);
    }

    .ai-color {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .confirm-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
    }

    .confirm-primary,
    .confirm-secondary {
        flex: 1;
        min-height: 44px;
        border-radius: 14px;
        border: 1px solid var(--pf-border-soft);
        font-family: "Rajdhani", sans-serif;
        font-size: 0.98rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
    }

    .confirm-primary {
        background: linear-gradient(135deg, var(--pf-cta-start-a), var(--pf-cta-start-b));
        color: #f8fcff;
    }

    .confirm-secondary {
        background: rgba(255, 255, 255, 0.04);
        color: var(--pf-text);
    }

    .error-msg {
        margin-top: 14px;
        color: #ffcdcd;
        font-family: "Rajdhani", sans-serif;
    }

    @media (max-width: 1199px) {
        .desktop-panels {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }

        .desktop-panels :global(.game-map-panel) {
            grid-column: 1 / -1;
        }
    }

    @media (max-width: 767px) {
        .menu-fullscreen {
            padding: 16px 12px 92px;
        }

        .desktop-panels {
            display: none;
        }

        .mobile-tabs {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
        }

        .mobile-tabs__button {
            min-height: 42px;
            border-radius: 14px;
            border: 1px solid var(--pf-border-soft);
            background: rgba(255, 255, 255, 0.04);
            color: var(--pf-muted-strong);
            font-family: "Rajdhani", sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .mobile-tabs__button.is-active {
            border-color: var(--pf-accent-soft);
            background: rgba(255, 255, 255, 0.08);
            color: var(--pf-text);
        }

        .mobile-panel {
            display: block;
        }
    }
</style>
