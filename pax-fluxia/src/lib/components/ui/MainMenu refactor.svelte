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
    import { buildEngineConfig } from "$lib/config/game.config";

    let visible = $state(true);

    // ─── Game Mode ──────────────────────────────────────────────────────────────
    let gameMode = $state<"sp" | "mp">(
        multiplayerStore.isConnected
            ? "mp"
            : typeof localStorage !== "undefined" &&
                localStorage.getItem("pax_gameMode") === "mp"
              ? "mp"
              : "sp",
    );

    $effect(() => {
        localStorage.setItem("pax_gameMode", gameMode);
    });

    $effect(() => {
        saveSetting("playerName", playerName);
        multiplayerStore.playerName = playerName || "Commander";
    });

    $effect(() => {
        const hex = hslToHex(playerConfigs[0]?.hue ?? 210);
        multiplayerStore.playerColor = hex;
    });

    $effect(() => {
        if (multiplayerStore.phase === "playing") {
            log.sys("MainMenu", "Multiplayer game started, transitioning");
            visible = false;
            gameStore.setView("game");
        }
    });

    $effect(() => {
        if (multiplayerStore.isConnected) {
            gameMode = "mp";
        }
    });

    // ─── Settings ───────────────────────────────────────────────────────────────
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
    let tickDuration = $state(
        loadSetting("tickDuration", GAME_CONFIG.BASE_TICK_MS),
    );
    let playerName = $state(loadSetting("playerName", "Commander"));
    let colorSat = $state(loadSetting("colorSat", 70));
    let colorLig = $state(loadSetting("colorLig", 55));
    let showAIDetails = $state(false);
    let showColorPalette = $state(false);
    let showPlayerHuePicker = $state(false);
    let joinRoomId = $state("");
    let confirmJoinTarget = $state<RoomListing | null>(null);
    let selectedTakeOverId = $state<string | null>(null);

    // Auto-refresh room list
    $effect(() => {
        if (gameMode === "mp" && !multiplayerStore.isConnected) {
            multiplayerStore.startRoomPolling();
            return () => multiplayerStore.stopRoomPolling();
        } else {
            multiplayerStore.stopRoomPolling();
        }
    });

    // ─── Player Configs ─────────────────────────────────────────────────────────
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
        hue: number;
        isAI: boolean;
        difficulty: string;
        strategy: string;
    }

    const DEFAULT_HUES = [210, 0, 120, 45, 280, 170];

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

    $effect(() => {
        if (playerConfigs.length !== playerCount) {
            const newConfigs = makeDefaultPlayerConfigs(playerCount);
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

    $effect(() => {
        if (gameMode === "sp" && playerConfigs.length > 1) {
            const baseHue = playerConfigs[0].hue;
            for (let i = 1; i < playerConfigs.length; i++) {
                playerConfigs[i].hue = (baseHue + hueOffset * i) % 360;
            }
        }
    });

    // ─── Map Definitions ────────────────────────────────────────────────────────
    interface MapPreviewStar {
        x: number;
        y: number;
        color: string;
    }

    type MapPreviewConnection = readonly [number, number];

    interface MapPreviewDef {
        id: string;
        label: string;
        mapType: string;
        stars: readonly MapPreviewStar[];
        connections: readonly MapPreviewConnection[];
    }

    interface MapPreviewLine {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }

    function getMapConnectionLine(
        map: MapPreviewDef,
        [a, b]: MapPreviewConnection,
    ): MapPreviewLine | null {
        const from = map.stars[a];
        const to = map.stars[b];
        if (!from || !to) return null;
        return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
    }

    const MAP_DEFS: readonly MapPreviewDef[] = [
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
    ] as const;

    const PLAYERS = [2, 3, 4, 5, 6];
    const DIFFICULTIES = ["Easy", "Normal", "Hard", "Expert"];

    // ─── Actions ────────────────────────────────────────────────────────────────
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

    function enforceHueSpacing() {
        const hues = playerConfigs.map((c) => c.hue);
        const corrected = enforcePerceptualSpacing(hues);
        for (let i = 0; i < corrected.length; i++) {
            playerConfigs[i].hue = corrected[i];
        }
    }

    function applyConfig() {
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
            mapType: selectedMap.mapType as any,
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

    async function handleCreateRoom() {
        saveAllSettings();
        applyConfig();
        const selectedMap =
            MAP_DEFS.find((m) => m.id === mapType) ?? MAP_DEFS[0];
        const gameplayConfig = buildEngineConfig();
        await multiplayerStore.createRoom({
            playerCount,
            mapType: selectedMap.mapType as any,
            starsPerPlayer,
            shipsPerStar,
            starSpacing,
            minLinks,
            maxLinks,
            retainOrderOnConquest,
            gameplayConfig,
        });
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
        if (multiplayerStore.roomId)
            navigator.clipboard.writeText(multiplayerStore.roomId);
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
</script>

{#if visible}
    <!-- Fullscreen Container -->
    <div
        class="fixed inset-0 z-[9999] flex w-screen min-h-screen justify-center overflow-y-auto font-['Orbitron'] text-slate-400 bg-[#050510] deep-space-bg"
        transition:fade
    >
        <!-- Hex Grid Overlay -->
        <svg
            class="absolute inset-0 size-full pointer-events-none z-0 text-cyan-400/10 hex-animate"
            xmlns="http://www.w3.org/2000/svg"
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

        <!-- Main Content -->
        <div
            class="relative z-10 w-[98vw] max-w-[1400px] flex flex-col gap-6 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20"
            transition:fly={{ y: 20, duration: 400 }}
        >
            <!-- Header -->
            <header
                class="text-center drop-shadow-[0_0_30px_rgba(0,255,255,0.4)]"
            >
                <h1
                    class="text-5xl md:text-7xl lg:text-8xl m-0 leading-none flex flex-col items-center"
                >
                    <span
                        class="text-cyan-400 font-light tracking-[4px] md:tracking-[6px]"
                        >PAX</span
                    >
                    <span
                        class="text-cyan-400 font-black tracking-[6px] md:tracking-[10px]"
                        >FLUXIA</span
                    >
                </h1>
                <div
                    class="mt-2 text-[#4a5a6a] font-mono text-[0.5rem] md:text-xs tracking-[2px] md:tracking-[4px]"
                >
                    TERRITORY CONTROL STRATEGY
                </div>
            </header>

            <!-- Mobile Options Sheet -->
            {#if showMobileOptions}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div
                    class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
                    onclick={() => (showMobileOptions = false)}
                ></div>
                <div
                    class="fixed bottom-0 left-0 right-0 z-[101] bg-[#080c18]/95 border-t border-cyan-400/15 rounded-t-2xl p-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto"
                >
                    <div class="flex justify-between items-center">
                        <h3 class="text-xs tracking-widest text-[#668899]">
                            OPTIONS
                        </h3>
                        <button
                            class="size-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-400 hover:border-red-400/30"
                            onclick={() => (showMobileOptions = false)}
                            >✕</button
                        >
                    </div>
                    <div class="flex flex-col gap-2">
                        <label
                            class="flex items-center gap-2 text-sm font-medium text-[#99aabb]"
                        >
                            <input
                                type="checkbox"
                                bind:checked={retainOrderOnConquest}
                                class="accent-cyan-400 size-3.5"
                            /> <span>Retain orders</span>
                        </label>
                        <label
                            class="flex items-center gap-2 text-sm font-medium text-[#99aabb]"
                        >
                            <input
                                type="checkbox"
                                bind:checked={allowOpposingOrders}
                                class="accent-cyan-400 size-3.5"
                            /> <span>Allow opposing</span>
                        </label>
                    </div>
                </div>
            {/if}

            <!-- 2-Column Layout -->
            <div class="flex flex-col lg:flex-row gap-5">
                <!-- Col 1: Desktop Sidebar Options -->
                <section
                    class="hidden lg:flex sci-fi-panel min-w-[280px] w-full lg:w-auto"
                >
                    <h2 class="panel-title">OPTIONS</h2>
                    <div class="flex flex-col gap-1.5">
                        <label class="checkbox-label"
                            ><input
                                type="checkbox"
                                bind:checked={retainOrderOnConquest}
                            /> <span>Retain orders after conquest</span></label
                        >
                        <label class="checkbox-label"
                            ><input
                                type="checkbox"
                                bind:checked={allowOpposingOrders}
                            /> <span>Allow opposing orders</span></label
                        >
                        <label class="checkbox-label opacity-50"
                            ><input type="checkbox" checked disabled />
                            <span>Auto-select new conquests</span></label
                        >
                        <label class="checkbox-label opacity-50"
                            ><input type="checkbox" disabled />
                            <span>Fog of war</span></label
                        >
                        <label class="checkbox-label opacity-50"
                            ><input type="checkbox" disabled />
                            <span>Show production rates</span></label
                        >
                        <label class="checkbox-label opacity-50"
                            ><input type="checkbox" disabled />
                            <span>Show movement trails</span></label
                        >
                        <label class="checkbox-label opacity-50"
                            ><input type="checkbox" disabled />
                            <span>Auto-pause on combat</span></label
                        >
                        <label class="checkbox-label opacity-50"
                            ><input type="checkbox" disabled />
                            <span>Surrender when hopeless</span></label
                        >
                    </div>
                </section>

                <!-- Col 2: Game Setup -->
                <section class="sci-fi-panel flex-1">
                    <!-- Mobile Accordion Toggle -->
                    <button
                        class="lg:hidden flex justify-between items-center w-full py-3"
                        onclick={() => (gameSetupOpen = !gameSetupOpen)}
                    >
                        <h2
                            class="m-0 border-0 p-0 text-xs tracking-[3px] text-[#668899]"
                        >
                            GAME SETUP
                        </h2>
                        <span
                            class="text-slate-400 transition-transform duration-200 {gameSetupOpen
                                ? 'rotate-90'
                                : ''}">▸</span
                        >
                    </button>

                    <div
                        class="flex flex-col gap-4 overflow-hidden transition-all duration-300 {gameSetupOpen
                            ? 'max-h-[1000px] opacity-100'
                            : 'max-md:max-h-0 max-md:opacity-0'}"
                    >
                        <!-- Map Selection -->
                        <div class="flex flex-col gap-2">
                            <label
                                class="text-[0.65rem] text-[#778899] font-bold tracking-[1.5px]"
                                >MAP</label
                            >
                            <div class="flex flex-wrap gap-2">
                                {#each MAP_DEFS as m}
                                    <button
                                        class="flex-1 min-w-[70px] flex flex-col items-center gap-1 p-1.5 rounded-md border transition-all duration-200
                                        {mapType === m.id
                                            ? m.id.startsWith('debug')
                                                ? 'border-[#ffaa33] bg-[#ffaa33]/5 shadow-[0_0_12px_rgba(255,170,51,0.15)]'
                                                : 'border-cyan-400 bg-cyan-400/5 shadow-[0_0_12px_rgba(0,204,204,0.15)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/5 hover:border-white/10'}"
                                        onclick={() => (mapType = m.id)}
                                    >
                                        <svg
                                            class="w-14 h-10"
                                            viewBox="0 0 64 48"
                                        >
                                            {#each m.connections as connection}
                                                {@const line = getMapConnectionLine(m, connection)}
                                                {#if line}
                                                    <line
                                                        x1={line.x1}
                                                        y1={line.y1}
                                                        x2={line.x2}
                                                        y2={line.y2}
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
                                        <span
                                            class="text-[0.5rem] font-semibold tracking-widest {mapType ===
                                            m.id
                                                ? m.id.startsWith('debug')
                                                    ? 'text-[#ffcc66]'
                                                    : 'text-cyan-400'
                                                : 'text-[#667788]'}"
                                            >{m.label}</span
                                        >
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- Links & Spacing Grid -->
                        <div
                            class="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-end"
                        >
                            <div class="config-col">
                                <label>LINKS MIN</label>
                                <div class="slider-row">
                                    <input
                                        type="range"
                                        min="1"
                                        max="4"
                                        bind:value={minLinks}
                                    /><span class="mono-val">{minLinks}</span>
                                </div>
                            </div>
                            <div class="config-col">
                                <label>LINKS MAX</label>
                                <div class="slider-row">
                                    <input
                                        type="range"
                                        min="2"
                                        max="8"
                                        bind:value={maxLinks}
                                    /><span class="mono-val">{maxLinks}</span>
                                </div>
                            </div>
                            <div class="config-col">
                                <label>SPACING</label>
                                <div class="slider-row">
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="5.0"
                                        step="0.1"
                                        bind:value={starSpacing}
                                    /><span class="mono-val"
                                        >{starSpacing.toFixed(1)}x</span
                                    >
                                </div>
                            </div>
                        </div>

                        <div
                            class="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent my-1"
                        ></div>

                        <!-- Players & Ships -->
                        <div
                            class="grid grid-cols-1 md:grid-cols-auto-1fr-1fr gap-2 md:gap-4 items-end"
                        >
                            <div class="config-col">
                                <label>PLAYERS</label>
                                <div
                                    class="flex border border-white/10 rounded-md overflow-hidden"
                                >
                                    {#each PLAYERS as p}
                                        <button
                                            class="flex-1 px-3 py-2 bg-transparent text-slate-500 text-xs font-mono hover:bg-white/5 transition-colors border-r border-white/5 last:border-0 {playerCount ===
                                            p
                                                ? '!bg-cyan-400/10 !text-cyan-400 font-bold shadow-inner'
                                                : ''}"
                                            onclick={() => (playerCount = p)}
                                            >{p}</button
                                        >
                                    {/each}
                                </div>
                            </div>
                            <div class="config-col">
                                <label>STARS / PLAYER</label>
                                <div class="slider-row">
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        bind:value={starsPerPlayer}
                                    /><span class="mono-val"
                                        >{starsPerPlayer}</span
                                    >
                                </div>
                            </div>
                            <div class="config-col">
                                <label>SHIPS / STAR</label>
                                <div class="slider-row">
                                    <input
                                        type="range"
                                        min="10"
                                        max="200"
                                        step="10"
                                        bind:value={shipsPerStar}
                                    /><span class="mono-val"
                                        >{shipsPerStar}</span
                                    >
                                </div>
                            </div>
                        </div>

                        <div
                            class="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent my-1"
                        ></div>

                        <!-- Player Identity -->
                        <div class="flex flex-col gap-2">
                            <div
                                class="flex max-sm:flex-col gap-3 items-center p-2.5 bg-cyan-400/5 border border-cyan-400/10 rounded-lg"
                            >
                                <div class="relative shrink-0">
                                    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
                                    <span
                                        class="block size-10 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.4)_inset_0_0_6px_rgba(255,255,255,0.1)] border-2 border-white/15 cursor-pointer hover:scale-110 transition-transform"
                                        style:background-color="hsl({playerConfigs[0]
                                            ?.hue ?? 210}, {colorSat}%, {colorLig}%)"
                                        onclick={() =>
                                            (showPlayerHuePicker =
                                                !showPlayerHuePicker)}
                                    ></span>
                                    {#if showPlayerHuePicker}
                                        <div
                                            class="absolute top-1/2 left-[calc(100%+12px)] -translate-y-1/2 bg-[#080c18]/95 border border-cyan-400/15 rounded p-2 z-20 min-w-[200px] shadow-xl"
                                        >
                                            <input
                                                type="range"
                                                class="hue-slider w-full"
                                                min="0"
                                                max="360"
                                                bind:value={
                                                    playerConfigs[0].hue
                                                }
                                                style:--hue={playerConfigs[0]
                                                    ?.hue ?? 210}
                                            />
                                        </div>
                                    {/if}
                                </div>
                                <div class="flex-1 w-full flex flex-col gap-1">
                                    <label
                                        class="font-['Exo'] text-[0.6rem] font-extrabold tracking-[0.15em] text-cyan-400/60 uppercase"
                                        >YOUR COMMANDER</label
                                    >
                                    <input
                                        type="text"
                                        class="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-[#ddeeff] font-['Montserrat'] text-sm font-semibold focus:border-cyan-400/30 outline-none"
                                        bind:value={playerName}
                                        placeholder="Enter name..."
                                        maxlength="20"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SP/MP Tabs (Mobile) -->
                    <div
                        class="flex md:hidden gap-0.5 bg-white/5 p-1 rounded-lg border border-white/5 mt-2"
                    >
                        <button
                            class="flex-1 py-2.5 text-[0.7rem] font-bold tracking-widest rounded transition-colors {gameMode ===
                            'sp'
                                ? 'text-cyan-400 bg-cyan-400/5'
                                : 'text-slate-500'}"
                            onclick={() => (gameMode = "sp")}>🎮 SINGLE</button
                        >
                        <button
                            class="flex-1 py-2.5 flex items-center justify-center gap-2 text-[0.7rem] font-bold tracking-widest rounded transition-colors {gameMode ===
                            'mp'
                                ? 'text-cyan-400 bg-cyan-400/5'
                                : 'text-slate-500'}"
                            onclick={() => (gameMode = "mp")}
                        >
                            🌐 MULTI
                            {#if multiplayerStore.isConnected}
                                <span
                                    class="size-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_lime]"
                                ></span>
                            {/if}
                        </button>
                    </div>

                    <!-- SP Content (AI Opponents) -->
                    <div
                        class="{gameMode === 'mp'
                            ? 'hidden md:block'
                            : 'block'} mt-2 flex flex-col gap-4"
                    >
                        <div class="flex justify-between items-center">
                            <label
                                class="text-[0.65rem] text-[#778899] font-bold tracking-[1.5px]"
                                >AI OPPONENTS</label
                            >
                            <div class="flex gap-2">
                                <button
                                    class="detail-toggle"
                                    onclick={() =>
                                        (showColorPalette = !showColorPalette)}
                                    >🎨</button
                                >
                                <button
                                    class="detail-toggle"
                                    onclick={() =>
                                        (showAIDetails = !showAIDetails)}
                                    >{showAIDetails
                                        ? "▾ Advanced"
                                        : "▸ Advanced"}</button
                                >
                            </div>
                        </div>

                        {#if showColorPalette}
                            <div
                                class="flex flex-wrap gap-3 p-2 bg-cyan-400/5 border border-cyan-400/5 rounded"
                                transition:fly={{ y: -8, duration: 150 }}
                            >
                                <div class="flex items-center gap-2">
                                    <span
                                        class="text-[0.55rem] uppercase tracking-wider text-slate-700"
                                        >Offset</span
                                    >
                                    <input
                                        type="range"
                                        class="w-16"
                                        min="10"
                                        max="120"
                                        bind:value={hueOffset}
                                    /> <span class="mono-val">{hueOffset}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span
                                        class="text-[0.55rem] uppercase tracking-wider text-slate-700"
                                        >Sat</span
                                    >
                                    <input
                                        type="range"
                                        class="w-16"
                                        min="40"
                                        max="100"
                                        bind:value={colorSat}
                                    /> <span class="mono-val">{colorSat}%</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span
                                        class="text-[0.55rem] uppercase tracking-wider text-slate-700"
                                        >Lum</span
                                    >
                                    <input
                                        type="range"
                                        class="w-16"
                                        min="30"
                                        max="70"
                                        bind:value={colorLig}
                                    /> <span class="mono-val">{colorLig}%</span>
                                </div>
                            </div>
                        {/if}

                        <div class="flex flex-col gap-1">
                            {#each playerConfigs as cfg, i}
                                {#if i > 0}
                                    <div
                                        class="grid grid-cols-[18px_30px_1fr_auto_auto] gap-2 items-center p-1.5 bg-cyan-400/5 border border-cyan-400/10 rounded"
                                    >
                                        <span
                                            class="size-3.5 rounded-full shadow-[0_0_6px_rgba(100,220,255,0.2)]"
                                            style:background-color="hsl({cfg.hue},
                                            {colorSat}%, {colorLig}%)"
                                        ></span>
                                        <span
                                            class="text-[0.7rem] font-semibold text-[#cce8ff]"
                                            >P{i + 1}</span
                                        >
                                        <select
                                            class="bg-[#050f1e]/60 border border-cyan-400/15 text-[#cce8ff] rounded text-[0.65rem] py-0.5 px-1 min-w-[60px]"
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
                                                class="hue-slider h-1.5 w-20"
                                                min="0"
                                                max="360"
                                                bind:value={
                                                    playerConfigs[i].hue
                                                }
                                                style:--hue={cfg.hue}
                                            />
                                            <select
                                                class="bg-[#050f1e]/60 border border-cyan-400/15 text-[#cce8ff] rounded text-[0.65rem] py-0.5 px-1"
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

                        {#if gameStore.savedMaps.length > 0}
                            <div
                                class="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent my-1"
                            ></div>
                            <div>
                                <label
                                    class="text-[0.65rem] text-[#778899] font-bold tracking-[1.5px]"
                                    >SAVED MAPS</label
                                >
                                <div class="flex flex-col gap-1 mt-1.5">
                                    {#each gameStore.savedMaps as m}
                                        <div
                                            class="flex items-center gap-2 p-1 border border-cyan-400/10 rounded text-[0.7rem]"
                                        >
                                            <span
                                                class="flex-1 text-[#b0c4de] truncate tracking-wide font-['Orbitron']"
                                                >{m.metadata.name}</span
                                            >
                                            <span
                                                class="text-cyan-400/40 text-[0.65rem]"
                                                >{m.stars.length}★</span
                                            >
                                            <button
                                                class="bg-transparent border border-cyan-400/15 text-[#77aacc] px-1.5 py-0.5 rounded text-[0.65rem] hover:bg-cyan-400/10 hover:text-cyan-200"
                                                onclick={() => {
                                                    gameStore.loadSavedMap(m);
                                                    startSPGame();
                                                }}>▶</button
                                            >
                                            <button
                                                class="bg-transparent border border-cyan-400/15 text-[#77aacc] px-1.5 py-0.5 rounded text-[0.65rem] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
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

                        <div
                            class="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent my-1"
                        ></div>

                        <div class="grid grid-cols-1 gap-4">
                            <div class="config-col">
                                <label>TICK DURATION</label>
                                <div class="slider-row">
                                    <span
                                        class="text-[0.55rem] text-[#345] tracking-widest"
                                        >FAST</span
                                    >
                                    <input
                                        type="range"
                                        min="0"
                                        max="3000"
                                        step="250"
                                        bind:value={tickDuration}
                                    />
                                    <span
                                        class="text-[0.55rem] text-[#345] tracking-widest"
                                        >SLOW</span
                                    >
                                    <span class="mono-val"
                                        >{(tickDuration / 1000).toFixed(
                                            2,
                                        )}s</span
                                    >
                                </div>
                            </div>
                        </div>

                        <button
                            class="group relative w-full p-4 mt-1 bg-gradient-to-br from-[#0cc]/90 to-[#08a]/90 border-0 rounded-lg text-[#001a1a] font-black text-lg tracking-[3px] shadow-[0_4px_24px_rgba(0,200,200,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_36px_rgba(0,200,200,0.35)] active:translate-y-px transition-all overflow-hidden"
                            onclick={startSPGame}
                        >
                            <span
                                class="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"
                            ></span>
                            START GAME
                        </button>
                    </div>
                </section>

                <!-- Col 3: Multiplayer Panel -->
                <section
                    class="mp-panel-scifi flex-none w-full lg:w-[clamp(280px,22vw,380px)] {gameMode ===
                    'sp'
                        ? 'max-md:hidden'
                        : ''}"
                >
                    <h2
                        class="panel-title text-fuchsia-400 border-fuchsia-400/15 drop-shadow-[0_0_8px_rgba(200,80,255,0.15)]"
                    >
                        🌐 MULTIPLAYER
                        {#if multiplayerStore.isConnected}
                            <span
                                class="inline-block size-1.5 rounded-full bg-green-500 shadow-[0_0_6px_lime] animate-pulse ml-2"
                            ></span>
                        {/if}
                    </h2>

                    {#if multiplayerStore.isConnected}
                        <!-- Connected Lobby -->
                        <div
                            class="flex items-center justify-between p-2.5 bg-cyan-400/5 border border-cyan-400/10 rounded-lg"
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="text-[0.55rem] text-[#567] tracking-widest"
                                    >ROOM</span
                                >
                                <code
                                    class="font-mono text-sm text-cyan-400 bg-black/30 px-2 py-0.5 rounded"
                                    >{multiplayerStore.roomId}</code
                                >
                                <button
                                    class="size-4 opacity-50 hover:opacity-100 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSJ3aGl0ZSI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik04IDE2SDZDOC44OTU0MyAxNiA4IDE1LjEwNDYgOCAxNHYtNGMwLTEuMTA0Ni44OTU0My0yIDItMmgybS0yIDRoNHY0SDh6Ii8+PC9zdmc+')] bg-contain"
                                    onclick={copyRoomId}
                                ></button>
                            </div>
                            <div class="font-mono text-xs text-[#678]">
                                {multiplayerStore.playerCount} / {multiplayerStore.maxPlayers}
                            </div>
                        </div>

                        <div class="flex flex-col gap-2">
                            <h3
                                class="text-[0.65rem] text-[#567] tracking-widest m-0"
                            >
                                PLAYERS ({multiplayerStore.players.length})
                            </h3>
                            {#if multiplayerStore.players.length === 0}
                                <p
                                    class="text-xs font-mono text-[#456] text-center"
                                >
                                    Waiting for players...
                                </p>
                            {/if}
                            <ul class="flex flex-col gap-1">
                                {#each multiplayerStore.players as player}
                                    <li
                                        class="flex items-center gap-2.5 p-2 bg-white/5 rounded-md hover:bg-white/10 transition-colors"
                                    >
                                        <span
                                            class="size-2.5 rounded-full shrink-0"
                                            style:background-color={player.color}
                                        ></span>
                                        <span
                                            class="text-xs text-[#bcd] flex items-center gap-2"
                                        >
                                            {player.name}
                                            {#if player.sessionId === multiplayerStore.hostSessionId}
                                                <span
                                                    class="badge bg-orange-500/15 text-orange-400 border-orange-500/30"
                                                    >HOST</span
                                                >
                                            {/if}
                                            {#if player.sessionId === multiplayerStore.localSessionId}
                                                <span
                                                    class="badge bg-cyan-400/10 text-cyan-400 border-cyan-400/20"
                                                    >YOU</span
                                                >
                                            {/if}
                                            {#if player.isAI}
                                                <span
                                                    class="badge bg-gray-500/15 text-gray-400 border-gray-500/30"
                                                    >AI</span
                                                >
                                            {/if}
                                        </span>
                                    </li>
                                {/each}
                            </ul>
                        </div>

                        <div class="flex-1"></div>

                        <div class="flex flex-col gap-2.5">
                            {#if multiplayerStore.isHost}
                                <button
                                    class="mp-action-btn bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 hover:bg-fuchsia-500/30 hover:shadow-[0_0_16px_rgba(200,80,255,0.2)]"
                                    onclick={handleStartGame}>START GAME</button
                                >
                            {:else}
                                <p
                                    class="text-xs font-mono text-[#456] text-center"
                                >
                                    Waiting for host to start...
                                </p>
                            {/if}
                            <button
                                class="p-2.5 bg-transparent border border-red-500/30 text-[#a55] text-xs font-['Orbitron'] rounded hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-colors"
                                onclick={handleLeaveRoom}>Leave Room</button
                            >
                            {#if multiplayerStore.isHost}
                                <button
                                    class="p-2.5 bg-transparent border border-orange-500/30 text-[#a64] text-xs font-['Orbitron'] rounded hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/50 transition-colors"
                                    onclick={() =>
                                        multiplayerStore.disposeRoom()}
                                    >Dispose Room</button
                                >
                            {/if}
                        </div>
                    {:else}
                        <!-- Not Connected -->
                        {#if multiplayerStore.isConnecting}
                            <div class="flex flex-col items-center gap-3 py-10">
                                <div
                                    class="size-8 border-[3px] border-cyan-400/10 border-t-cyan-400 rounded-full animate-spin"
                                ></div>
                                <p class="text-xs text-[#567]">Connecting...</p>
                            </div>
                        {:else}
                            <div class="flex flex-col gap-2.5">
                                <h3
                                    class="text-[0.7rem] text-[#89a] tracking-widest m-0"
                                >
                                    Create Game
                                </h3>
                                <p
                                    class="text-[0.7rem] text-[#456] font-mono leading-relaxed m-0"
                                >
                                    Host a new room with your game settings.
                                </p>
                                <button
                                    class="mp-action-btn"
                                    onclick={handleCreateRoom}
                                    >CREATE ROOM</button
                                >
                            </div>

                            <div
                                class="flex items-center gap-3 text-[#345] text-[0.65rem] tracking-widest before:flex-1 before:h-px before:bg-white/5 after:flex-1 after:h-px after:bg-white/5"
                            >
                                OR
                            </div>

                            <div class="flex flex-col gap-2.5">
                                <h3
                                    class="text-[0.7rem] text-[#89a] tracking-widest m-0"
                                >
                                    Join Game
                                </h3>
                                <div class="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter Room ID..."
                                        bind:value={joinRoomId}
                                        class="w-full p-2.5 bg-white/5 border border-white/10 rounded-md text-[#def] font-mono text-sm outline-none focus:border-cyan-400/30 placeholder:text-[#345]"
                                    />
                                    <button
                                        class="mp-action-btn"
                                        onclick={handleJoinRoom}
                                        disabled={!joinRoomId.trim()}
                                        >JOIN ROOM</button
                                    >
                                </div>
                            </div>

                            <!-- Room Browser -->
                            <div class="border-t border-cyan-400/10 pt-4 mt-2">
                                <div
                                    class="flex justify-between items-center mb-2"
                                >
                                    <h3
                                        class="m-0 text-[0.7rem] text-[#89a] tracking-widest"
                                    >
                                        Browse Games
                                    </h3>
                                    <button
                                        class="bg-cyan-400/10 border border-cyan-400/20 text-cyan-200 px-3 py-1 rounded text-xs hover:bg-cyan-400/15 disabled:opacity-50"
                                        onclick={() =>
                                            multiplayerStore.fetchRooms()}
                                        disabled={multiplayerStore.isFetchingRooms}
                                        >Refresh</button
                                    >
                                </div>
                                {#if multiplayerStore.isFetchingRooms}
                                    <p
                                        class="text-center text-xs text-[#456] font-mono"
                                    >
                                        Scanning for rooms...
                                    </p>
                                {:else if multiplayerStore.availableRooms.length === 0}
                                    <p
                                        class="text-center text-xs text-[#456] font-mono"
                                    >
                                        No public rooms available
                                    </p>
                                {:else}
                                    <div
                                        class="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20"
                                    >
                                        {#each multiplayerStore.availableRooms as room}
                                            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                                            <div
                                                class="bg-cyan-400/5 border border-cyan-400/10 rounded-lg p-2 cursor-pointer hover:bg-cyan-400/10 hover:-translate-y-px transition-all"
                                                onclick={() =>
                                                    (confirmJoinTarget = room)}
                                            >
                                                <div
                                                    class="flex justify-between items-center mb-1"
                                                >
                                                    <span
                                                        class="font-semibold text-[#cce8ff] text-sm"
                                                        >{room.metadata
                                                            ?.hostName ||
                                                            "Unknown"}</span
                                                    >
                                                    <span
                                                        class="text-[0.65rem] px-1.5 py-0.5 rounded uppercase tracking-wide {room
                                                            .metadata?.phase ===
                                                        'playing'
                                                            ? 'bg-red-500/15 text-red-300'
                                                            : 'bg-cyan-400/15 text-cyan-200'}"
                                                        >{room.metadata
                                                            ?.phase ||
                                                            "lobby"}</span
                                                    >
                                                </div>
                                                <div
                                                    class="flex flex-wrap gap-2 text-[0.7rem] text-[#79b] mb-1"
                                                >
                                                    <span
                                                        class="opacity-80 capitalize"
                                                        >{room.metadata
                                                            ?.mapType ||
                                                            "?"}</span
                                                    >
                                                    <span class="opacity-80"
                                                        >⭐ {room.metadata
                                                            ?.starsPerPlayer ||
                                                            "?"}/p</span
                                                    >
                                                    <span class="opacity-80"
                                                        >🚀 {room.metadata
                                                            ?.shipsPerStar ||
                                                            "?"}/star</span
                                                    >
                                                    {#if room.metadata?.phase === "playing" && room.metadata?.tick}
                                                        <span
                                                            class="text-red-300 font-semibold"
                                                            >T{room.metadata
                                                                .tick}</span
                                                        >
                                                    {/if}
                                                </div>
                                                <div
                                                    class="flex justify-between text-xs text-[#8ab]"
                                                >
                                                    <span
                                                        >{room.clients}/{room.maxClients}
                                                        players</span
                                                    >
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>

                            {#if multiplayerStore.lobbyStatus}
                                <div
                                    class="p-2.5 bg-orange-400/10 border border-orange-400/20 rounded-md text-orange-300 text-xs font-mono animate-pulse"
                                >
                                    ⏳ {multiplayerStore.lobbyStatus}
                                </div>
                            {/if}
                            {#if multiplayerStore.connectionError}
                                <div
                                    class="p-2.5 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs font-mono"
                                >
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
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000]"
        transition:fade
        onclick={() => {
            confirmJoinTarget = null;
            selectedTakeOverId = null;
        }}
    >
        <div
            class="bg-[#0a1628] border border-cyan-400/25 rounded-xl p-8 max-w-[340px] text-center shadow-2xl"
            onclick={(e) => e.stopPropagation()}
        >
            <h3 class="m-0 mb-3 text-[#cce8ff] text-xl">Join Room?</h3>
            <p class="my-1 text-[#8ab] text-sm">
                Host: <strong
                    >{confirmJoinTarget.metadata?.hostName || "Unknown"}</strong
                >
            </p>
            <p class="my-1 text-[#8ab] text-sm">
                {confirmJoinTarget.clients}/{confirmJoinTarget.maxClients} players
                • {confirmJoinTarget.metadata?.mapType || "standard"}
            </p>

            {#if confirmJoinTarget.metadata?.phase === "playing" && confirmJoinTarget.metadata?.aiPlayers?.length}
                <div class="mt-3 text-left">
                    <p class="text-xs text-[#8ab] mb-1.5">
                        Take over an AI player:
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                        {#each confirmJoinTarget.metadata.aiPlayers as ai}
                            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                            <div
                                class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-400/5 border border-cyan-400/10 text-[#8ac] text-xs cursor-pointer hover:bg-cyan-400/10 hover:border-cyan-400/30 {selectedTakeOverId ===
                                ai.sessionId
                                    ? 'border-cyan-400/50 bg-cyan-400/15 text-[#cef]'
                                    : ''}"
                                onclick={() =>
                                    (selectedTakeOverId = ai.sessionId)}
                            >
                                <span
                                    class="size-2.5 rounded-full"
                                    style="background: {ai.color}"
                                ></span>
                                {ai.name}
                            </div>
                        {/each}
                    </div>
                </div>
            {:else if confirmJoinTarget.metadata?.phase === "playing"}
                <p
                    class="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs mt-2"
                >
                    No AI players available to take over
                </p>
            {/if}

            <div class="flex gap-3 mt-5 justify-center">
                <button
                    class="bg-cyan-600/80 text-white font-bold py-2 px-4 rounded hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    onclick={handleConfirmJoin}
                    disabled={confirmJoinTarget.metadata?.phase === "playing" &&
                        !confirmJoinTarget.metadata?.aiPlayers?.length}
                >
                    {confirmJoinTarget.metadata?.phase === "playing"
                        ? "TAKE OVER"
                        : "JOIN"}
                </button>
                <button
                    class="bg-transparent border border-red-500/30 text-red-400 py-2 px-4 rounded hover:bg-red-500/10"
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
    /* Complex Gradients & Shapes maintained in CSS for readability/maintainability */

    .deep-space-bg {
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
    }

    /* Hex Grid Animation */
    .hex-animate {
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
        animation: hex-shift 12s ease-in-out infinite;
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

    /* Sci-Fi Panel Shape - Difficult to do with utilities alone */
    .sci-fi-panel,
    .mp-panel-scifi {
        background: linear-gradient(
            165deg,
            rgba(10, 18, 35, 0.92) 0%,
            rgba(6, 10, 22, 0.88) 100%
        );
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        /* The signature corner cut */
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
        box-shadow:
            inset 0 1px 0 rgba(0, 255, 255, 0.04),
            inset 0 0 40px rgba(0, 20, 40, 0.3);
    }

    .mp-panel-scifi {
        background: rgba(12, 8, 24, 0.9);
        border: 1px solid rgba(200, 80, 255, 0.18);
        border-left: 3px solid rgba(200, 80, 255, 0.3);
        box-shadow:
            -4px 0 20px rgba(200, 80, 255, 0.04),
            inset 0 0 30px rgba(200, 80, 255, 0.02);
    }

    @media (max-width: 900px) {
        /* Remove clip path on mobile to prevent overflow issues */
        .sci-fi-panel,
        .mp-panel-scifi {
            clip-path: none;
            border-radius: 8px;
            padding: 16px;
        }
    }

    /* Range Sliders - Keeping CSS because cross-browser styling via Utility classes is extremely verbose/messy */
    input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        flex: 1;
        height: 4px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 2px;
        width: 100%;
    }
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
    }
    input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: #00ffff;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
    }

    /* Specific Gradient Slider for Hues */
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
    .hue-slider::-webkit-slider-thumb {
        background: hsl(var(--hue, 210), 70%, 55%);
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        width: 16px;
        height: 16px;
    }
    .hue-slider::-moz-range-thumb {
        background: hsl(var(--hue, 210), 70%, 55%);
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        width: 16px;
        height: 16px;
    }

    /* Utility Helpers used in Markup */
    .panel-title {
        @apply text-xs text-[#668899] tracking-[3px] m-0 pb-2 border-b border-white/5 drop-shadow-[0_0_8px_rgba(0,255,255,0.1)];
    }
    .checkbox-label {
        @apply flex items-center gap-2 cursor-pointer text-[0.8rem] font-medium text-[#99aabb] py-1;
    }
    .checkbox-label input {
        @apply w-3.5 h-3.5 accent-cyan-400 cursor-pointer;
    }
    .config-col {
        @apply flex flex-col gap-1;
    }
    .config-col label {
        @apply text-[0.65rem] text-[#778899] font-bold tracking-[1.5px] uppercase;
    }
    .slider-row {
        @apply flex items-center gap-2 min-h-[28px];
    }
    .mono-val {
        @apply text-cyan-400 font-mono text-xs min-w-[32px] text-right whitespace-nowrap;
    }
    .badge {
        @apply text-[0.5rem] px-1.5 py-0.5 rounded border font-bold tracking-widest;
    }
    .mp-action-btn {
        @apply w-full py-3 px-4 border border-[rgba(200,80,255,0.25)] rounded bg-[rgba(200,80,255,0.08)] text-[#cc88ff] text-[0.8rem] font-bold tracking-[2px] hover:bg-[rgba(200,80,255,0.18)] hover:text-[#dd99ff] hover:shadow-[0_0_16px_rgba(200,80,255,0.15)] disabled:opacity-35 disabled:cursor-not-allowed transition-all duration-200;
    }
    .detail-toggle {
        @apply bg-white/5 border border-white/10 rounded text-[#678] text-[0.6rem] px-2 py-0.5 cursor-pointer font-['Exo'] tracking-wide hover:bg-cyan-400/5 hover:text-cyan-600 hover:border-cyan-400/15 transition-colors;
    }
</style>
