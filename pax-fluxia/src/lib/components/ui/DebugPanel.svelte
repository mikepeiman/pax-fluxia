<script lang="ts">
    import { onDestroy } from "svelte";
    import { Pane } from "tweakpane";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { log } from "$lib/utils/logger";
    import { gameStore } from "$lib/stores/gameStore.svelte";

    // Props
    interface Props {
        visible?: boolean;
        onClose?: () => void;
    }
    let { visible = false }: Props = $props();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pane: any = null;
    let container: HTMLDivElement | null = $state(null);

    // Mirror of GAME_CONFIG for Tweakpane binding
    // Load from localStorage if available
    const SAVED_CONFIG_KEY = "pax_fluxia_config_v1";
    let initialParams = {
        // Timing
        tickRate: GAME_CONFIG.BASE_TICK_MS,

        // Map
        starsPerPlayer: GAME_CONFIG.STARS_PER_PLAYER,

        // Flow
        transferRate: GAME_CONFIG.TRANSFER_RATE * 100,
        minShipsPerTransfer: GAME_CONFIG.MIN_SHIPS_PER_TRANSFER,

        // NOTE: Combat variables moved to CombatPanel.svelte
        // conquestThreshold still here for backward compat
        conquestThreshold: GAME_CONFIG.CONQUEST_THRESHOLD,

        // Production
        baseProduction: GAME_CONFIG.BASE_PRODUCTION,

        // Conquest
        conquestTransfer: GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE * 100,
        clearOrderOnCapture: GAME_CONFIG.CLEAR_ORDER_ON_CAPTURE,

        // Visual
        showConnections: GAME_CONFIG.SHOW_CONNECTIONS,
        showHexGrid: GAME_CONFIG.SHOW_HEX_GRID,
        maxRenderedShips: GAME_CONFIG.MAX_RENDERED_SHIPS,

        // Hex Grid
        hexRadius: GAME_CONFIG.HEX_RADIUS,
        hexPadding: GAME_CONFIG.HEX_PADDING,
        connectionMaxDist: GAME_CONFIG.CONNECTION_MAX_DISTANCE,
        connectionColor: GAME_CONFIG.CONNECTION_COLOR,
        connectionWidth: GAME_CONFIG.CONNECTION_WIDTH,
        connectionAlpha: GAME_CONFIG.CONNECTION_ALPHA,

        // Fleet
        pulseInterval: GAME_CONFIG.TRANSFER_PULSE_INTERVAL,
        fleetSpeed: GAME_CONFIG.FLEET_SPEED,
    };

    // Try load
    try {
        const saved = localStorage.getItem(SAVED_CONFIG_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            initialParams = { ...initialParams, ...parsed };
            log.sys("DebugPanel", "Loaded config from localStorage");
        }
    } catch (e) {
        console.warn("Failed to load config", e);
    }

    const params = $state(initialParams);

    // Sync changes back to GAME_CONFIG
    $effect(() => {
        GAME_CONFIG.BASE_TICK_MS = params.tickRate;
        GAME_CONFIG.STARS_PER_PLAYER = params.starsPerPlayer;
        GAME_CONFIG.TRANSFER_RATE = params.transferRate / 100;
        GAME_CONFIG.MIN_SHIPS_PER_TRANSFER = params.minShipsPerTransfer;
        // NOTE: Combat variables moved to CombatPanel.svelte
        GAME_CONFIG.CONQUEST_THRESHOLD = params.conquestThreshold;
        GAME_CONFIG.BASE_PRODUCTION = params.baseProduction;
        GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE =
            params.conquestTransfer / 100;
        GAME_CONFIG.CLEAR_ORDER_ON_CAPTURE = params.clearOrderOnCapture;
        GAME_CONFIG.SHOW_CONNECTIONS = params.showConnections;
        GAME_CONFIG.SHOW_HEX_GRID = params.showHexGrid;
        GAME_CONFIG.MAX_RENDERED_SHIPS = params.maxRenderedShips;
        GAME_CONFIG.HEX_RADIUS = params.hexRadius;
        GAME_CONFIG.HEX_PADDING = params.hexPadding;
        GAME_CONFIG.CONNECTION_MAX_DISTANCE = params.connectionMaxDist;
        GAME_CONFIG.CONNECTION_MAX_DISTANCE = params.connectionMaxDist;
        GAME_CONFIG.CONNECTION_COLOR = params.connectionColor;
        GAME_CONFIG.CONNECTION_WIDTH = params.connectionWidth;
        GAME_CONFIG.CONNECTION_ALPHA = params.connectionAlpha;
        GAME_CONFIG.TRANSFER_PULSE_INTERVAL = params.pulseInterval;
        GAME_CONFIG.FLEET_SPEED = params.fleetSpeed;

        // Notify engine to pick up changes (especially tick rate)
        if (typeof gameStore.updateConfig === "function") {
            gameStore.updateConfig();
        }

        // Save to localStorage
        try {
            // Need to unwrap proxy for storage? Svelte 5 state is proxy.
            // Using JSON.stringify directly often works with proxies, but safer to copy.
            localStorage.setItem(SAVED_CONFIG_KEY, JSON.stringify(params));
        } catch (e) {
            console.warn("Failed to save config", e);
        }
    });

    // Initialize Tweakpane when container becomes available
    $effect(() => {
        if (visible && container && !pane) {
            initPane();
        } else if (!visible && pane) {
            pane.dispose();
            pane = null;
        }
    });

    function initPane() {
        if (!container) return;

        pane = new Pane({
            container,
            title: "⚙️ Game Config",
        });

        // Timing folder
        const timingFolder = pane.addFolder({ title: "⏱️ Timing" });
        timingFolder.addBinding(params, "tickRate", {
            label: "Tick Rate (ms)",
            min: 200,
            max: 3000,
            step: 100,
        });

        // Transfer folder
        const transferFolder = pane.addFolder({ title: "🚀 Transfer" });
        transferFolder.addBinding(params, "transferRate", {
            label: "Transfer %",
            min: 1,
            max: 50,
            step: 1,
        });
        transferFolder.addBinding(params, "minShipsPerTransfer", {
            label: "Min Ships",
            min: 1,
            max: 10,
            step: 1,
        });
        transferFolder.addBinding(params, "pulseInterval", {
            label: "Pulse Interval",
            min: 1,
            max: 60,
            step: 1,
        });
        transferFolder.addBinding(params, "fleetSpeed", {
            label: "Fleet Speed",
            min: 10,
            max: 500,
            step: 10,
        });

        // Map Folder
        const mapFolder = pane.addFolder({ title: "🗺️ Map" });
        mapFolder.addBinding(params, "starsPerPlayer", {
            label: "Stars/Player",
            min: 1,
            max: 10,
            step: 1,
        });

        // NOTE: Combat folder moved to CombatPanel.svelte
        // Only conquest threshold remains here for legacy compat

        // Conquest folder
        const conquestFolder = pane.addFolder({ title: "🏴 Conquest" });
        conquestFolder.addBinding(params, "conquestTransfer", {
            label: "Transfer %",
            min: 0,
            max: 100,
            step: 10,
        });
        conquestFolder.addBinding(params, "clearOrderOnCapture", {
            label: "Clear Order",
        });

        // Production folder
        const prodFolder = pane.addFolder({ title: "🏭 Production" });
        prodFolder.addBinding(params, "baseProduction", {
            label: "Base Prod",
            min: 0.1,
            max: 2.0,
            step: 0.1,
        });

        // Visual folder
        const visualFolder = pane.addFolder({ title: "👁️ Visual" });
        visualFolder.addBinding(params, "showConnections", {
            label: "Connections",
        });
        visualFolder.addBinding(params, "connectionColor", {
            label: "Line Color",
        });
        visualFolder.addBinding(params, "connectionWidth", {
            label: "Line Width",
            min: 1,
            max: 10,
            step: 1,
        });
        visualFolder.addBinding(params, "connectionAlpha", {
            label: "Line Alpha",
            min: 0.1,
            max: 1.0,
            step: 0.1,
        });
        visualFolder.addBinding(params, "showHexGrid", {
            label: "Hex Grid",
        });
        visualFolder.addBinding(params, "maxRenderedShips", {
            label: "Max Ships",
            min: 50,
            max: 500,
            step: 50,
        });

        // Hex Grid folder (NOTE: changes require new game to take effect)
        const hexFolder = pane.addFolder({ title: "⬡ Hex Grid*" });
        hexFolder.addBinding(params, "hexRadius", {
            label: "Hex Size",
            min: 30,
            max: 120,
            step: 5,
        });
        hexFolder.addBinding(params, "hexPadding", {
            label: "Padding",
            min: 20,
            max: 100,
            step: 10,
        });
        hexFolder.addBinding(params, "connectionMaxDist", {
            label: "Connect Dist",
            min: 100,
            max: 400,
            step: 20,
        });

        log.sys("DebugPanel", "Tweakpane initialized");
    }

    onDestroy(() => {
        if (pane) {
            pane.dispose();
            pane = null;
        }
    });
</script>

<!-- Always render the container, use CSS to hide -->
<div class="debug-panel" class:hidden={!visible} bind:this={container}></div>

<style>
    .debug-panel {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1000;
        font-family: system-ui, sans-serif;
    }

    .debug-panel.hidden {
        display: none;
    }

    /* Tweakpane custom styling */
    .debug-panel :global(.tp-dfwv) {
        min-width: 280px;
    }
</style>
