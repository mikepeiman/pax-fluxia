<script lang="ts">
    import { onDestroy } from "svelte";
    import { Pane } from "tweakpane";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { log } from "$lib/utils/logger";

    // Props
    interface Props {
        visible?: boolean;
    }
    let { visible = false }: Props = $props();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pane: any = null;
    let container: HTMLDivElement | null = $state(null);

    // Mirror of GAME_CONFIG for Tweakpane binding
    const params = $state({
        // Timing
        tickRate: GAME_CONFIG.BASE_TICK_MS,

        // Flow
        flowPercentage: GAME_CONFIG.FLOW_PERCENTAGE * 100,
        minFlowShips: GAME_CONFIG.MIN_FLOW_SHIPS,

        // Combat
        defenseMultiplier: GAME_CONFIG.DEFENSE_MULTIPLIER,
        damageRate: GAME_CONFIG.DAMAGE_RATE * 100,
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
    });

    // Sync changes back to GAME_CONFIG
    $effect(() => {
        GAME_CONFIG.BASE_TICK_MS = params.tickRate;
        GAME_CONFIG.FLOW_PERCENTAGE = params.flowPercentage / 100;
        GAME_CONFIG.MIN_FLOW_SHIPS = params.minFlowShips;
        GAME_CONFIG.DEFENSE_MULTIPLIER = params.defenseMultiplier;
        GAME_CONFIG.DAMAGE_RATE = params.damageRate / 100;
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

        // Flow folder
        const flowFolder = pane.addFolder({ title: "🌊 Flow" });
        flowFolder.addBinding(params, "flowPercentage", {
            label: "Flow %",
            min: 1,
            max: 50,
            step: 1,
        });
        flowFolder.addBinding(params, "minFlowShips", {
            label: "Min Ships",
            min: 1,
            max: 10,
            step: 1,
        });

        // Combat folder
        const combatFolder = pane.addFolder({ title: "⚔️ Combat" });
        combatFolder.addBinding(params, "defenseMultiplier", {
            label: "Defense Mult",
            min: 1.0,
            max: 5.0,
            step: 0.1,
        });
        combatFolder.addBinding(params, "damageRate", {
            label: "Damage %",
            min: 5,
            max: 100,
            step: 5,
        });
        combatFolder.addBinding(params, "conquestThreshold", {
            label: "Conquer Ratio",
            min: 1,
            max: 10,
            step: 1,
        });

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
