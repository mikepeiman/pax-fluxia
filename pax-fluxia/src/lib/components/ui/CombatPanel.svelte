<script lang="ts">
    import { onDestroy } from "svelte";
    import { Pane } from "tweakpane";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { log } from "$lib/utils/logger";
    import { gameStore } from "$lib/stores/gameStore.svelte";

    // ========================================================================
    // COMPONENT: CombatPanel
    // PURPOSE: Real-time combat tuning interface for balancing gameplay.
    //          Exposes 5 core combat variables via Tweakpane UI.
    // ========================================================================
    //
    // COMBAT V4 - SYMMETRIC DAMAGE MODEL
    //
    // 1. AGGRESSOR ADVANTAGE (0.5-2.0):
    //    Tilts damage toward attacker (>1) or defender (<1).
    //    1.0 = symmetric damage. Both attacking = both get bonus.
    //
    // 2. DAMAGE PER SHIP (0.05-2.0):
    //    Base damage output per engaged ship per tick.
    //    Higher = faster kills, shorter battles.
    //
    // 3. LETHALITY (0-1.0):
    //    % of damage that destroys ships (rest disables for repair).
    //    High = decisive battles. Low = attrition + repair matters.
    //
    // 4. FORCE RATIO EFFECT (0-1.0):
    //    How much numerical superiority matters (log2 scaling).
    //    0 = force size irrelevant, 1 = overwhelming force dominates.
    //
    // 5. REPAIR RATE (0-1.0):
    //    % of disabled ships healed per tick.
    //    Works alongside lethality to create attrition dynamics.
    // ========================================================================

    interface Props {
        visible?: boolean;
    }
    let { visible = true }: Props = $props();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pane: any = null;
    let container: HTMLDivElement | null = $state(null);

    const SAVED_COMBAT_KEY = "pax_fluxia_combat_v2"; // Bumped version for new schema

    let initialParams = {
        // 1. Tilts damage toward attacker (>1) or defender (<1)
        aggressorAdvantage: GAME_CONFIG.AGGRESSOR_ADVANTAGE,

        // 2. Base damage output per engaged ship per tick
        damagePerShip: GAME_CONFIG.DAMAGE_PER_SHIP,

        // 3. Fraction of damage that destroys ships (0-1)
        lethality: GAME_CONFIG.LETHALITY,

        // 4. How much numerical superiority matters (0-1)
        forceRatioEffect: GAME_CONFIG.FORCE_RATIO_EFFECT,

        // 5. % of disabled ships repaired per tick
        repairRate: GAME_CONFIG.REPAIR_RATE,
    };

    // Attempt to load saved settings from localStorage
    try {
        const saved = localStorage.getItem(SAVED_COMBAT_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            initialParams = { ...initialParams, ...parsed };
            log.sys("CombatPanel", "Loaded combat config V2 from localStorage");
        }
    } catch (e) {
        console.warn("Failed to load combat config", e);
    }

    const params = $state(initialParams);

    // Sync UI changes back to GAME_CONFIG (reactive effect)
    $effect(() => {
        GAME_CONFIG.AGGRESSOR_ADVANTAGE = params.aggressorAdvantage;
        GAME_CONFIG.DAMAGE_PER_SHIP = params.damagePerShip;
        GAME_CONFIG.LETHALITY = params.lethality;
        GAME_CONFIG.FORCE_RATIO_EFFECT = params.forceRatioEffect;
        GAME_CONFIG.REPAIR_RATE = params.repairRate;

        // Notify engine to pick up configuration changes
        if (typeof gameStore.updateConfig === "function") {
            gameStore.updateConfig();
        }

        // Persist to localStorage for session continuity
        try {
            localStorage.setItem(SAVED_COMBAT_KEY, JSON.stringify(params));
        } catch (e) {
            console.warn("Failed to save combat config", e);
        }
    });

    // Initialize/destroy Tweakpane based on visibility
    $effect(() => {
        if (visible && container && !pane) {
            initPane();
        } else if (!visible && pane) {
            pane.dispose();
            pane = null;
        }
    });

    /**
     * Initialize Tweakpane UI with 5 combat variables.
     */
    function initPane() {
        if (!container) return;

        pane = new Pane({
            container,
            title: "⚔️ Combat V4",
        });

        // --------------------------------------------------------------------
        // AGGRESSOR ADVANTAGE: Tilts damage toward attacker or defender
        // --------------------------------------------------------------------
        pane.addBinding(params, "aggressorAdvantage", {
            label: "⚔️ Aggressor Adv",
            min: 0.5,
            max: 2.0,
            step: 0.1,
        });

        // --------------------------------------------------------------------
        // DAMAGE PER SHIP: Base damage output per engaged ship
        // --------------------------------------------------------------------
        pane.addBinding(params, "damagePerShip", {
            label: "� Damage/Ship",
            min: 0.05,
            max: 2.0,
            step: 0.05,
        });

        // --------------------------------------------------------------------
        // LETHALITY: % that destroys vs. disables
        // --------------------------------------------------------------------
        pane.addBinding(params, "lethality", {
            label: "� Lethality",
            min: 0,
            max: 1.0,
            step: 0.05,
        });

        // --------------------------------------------------------------------
        // FORCE RATIO EFFECT: Numerical superiority bonus
        // --------------------------------------------------------------------
        pane.addBinding(params, "forceRatioEffect", {
            label: "📊 Force Ratio",
            min: 0,
            max: 1.0,
            step: 0.05,
        });

        // --------------------------------------------------------------------
        // REPAIR RATE: Recovery of disabled ships
        // --------------------------------------------------------------------
        pane.addBinding(params, "repairRate", {
            label: "🔧 Repair Rate",
            min: 0,
            max: 1.0,
            step: 0.05,
        });

        log.sys(
            "CombatPanel",
            "Combat V4 Tweakpane initialized with 5 variables",
        );
    }

    onDestroy(() => {
        if (pane) {
            pane.dispose();
            pane = null;
        }
    });
</script>

<!-- Combat Panel: Always-visible tuning interface, positioned top-left -->
<div class="combat-panel" class:hidden={!visible} bind:this={container}></div>

<style>
    .combat-panel {
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 1000;
        font-family: system-ui, sans-serif;
    }

    .combat-panel.hidden {
        display: none;
    }

    /* Tweakpane custom styling */
    .combat-panel :global(.tp-dfwv) {
        min-width: 240px;
    }
</style>
