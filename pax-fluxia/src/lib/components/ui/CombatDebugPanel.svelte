<script lang="ts">
    import { onMount } from "svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { log, logFlags } from "$lib/utils/logger";

    const STORAGE_KEY = "pax-fluxia-combat-tuning";

    // Default values — single source of truth for reset + disabled toggle state
    // All values in raw units as used by GAME_CONFIG (decimals, not percentages)
    const defaultValues = {
        TRANSFER_RATE: 0.1, // 10% transfer rate
        AGGRESSOR_ADVANTAGE: 0.7, // defense is stronger
        DAMAGE_PER_SHIP: 0.05, // base damage per ship per tick
        LETHALITY: 0.1, // kill vs disable ratio
        FORCE_RATIO_EFFECT: 0, // no force ratio bonus
        CONQUEST_THRESHOLD: 12, // ratio: attacker force / defender force
        CONQUEST_TRANSFER_PERCENTAGE: 0.3, // transfer on conquest
        RETREAT_CAPTURE_RATE: 0.25, // capture rate on retreat
        SCATTER_CAPTURE_RATE: 0.4, // capture rate on scatter
        SCATTER_DESTROY_RATE: 0.5, // destruction rate on scatter
        RETREAT_DAMAGED_ACTIVATION_RATE: 0, // % of damaged ships activated on retreat/scatter
        DAMAGED_SHIP_EFFECTIVENESS: 0.1, // small defensive contribution
        REPAIR_RATE: 0.1, // 10% repair per tick
        AI_ATTACK_THRESHOLD: 1.33, // AI attack threshold ratio
        AI_DESIST_THRESHOLD: 1.0, // AI retreat threshold ratio
        AI_RANDOM_AGGRESSION: 0.05, // random attack chance per tick
        AI_TACTICAL_AGGRESSION: 0.1, // tactical attack chance
    };

    // Load from localStorage or use defaults
    function loadFromStorage(): typeof defaultValues {
        if (typeof window === "undefined") return { ...defaultValues };
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to handle new keys
                return { ...defaultValues, ...parsed };
            }
        } catch (e) {
            log.error(
                "CombatDebugPanel",
                "Failed to load combat tuning from localStorage",
                e,
            );
        }
        return { ...defaultValues };
    }

    function saveToStorage(vals: typeof defaultValues) {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(vals));
        } catch (e) {
            log.error(
                "CombatDebugPanel",
                "Failed to save combat tuning to localStorage",
                e,
            );
        }
    }

    // Track which variables are enabled (true = active, false = use neutral value)
    let enabled = $state({
        TRANSFER_RATE: true,
        AGGRESSOR_ADVANTAGE: true,
        DAMAGE_PER_SHIP: true,
        LETHALITY: true,
        FORCE_RATIO_EFFECT: true,
        CONQUEST_THRESHOLD: true,
        CONQUEST_TRANSFER_PERCENTAGE: true,
        RETREAT_CAPTURE_RATE: true,
        SCATTER_CAPTURE_RATE: true,
        SCATTER_DESTROY_RATE: true,
        RETREAT_DAMAGED_ACTIVATION_RATE: true,
        DAMAGED_SHIP_EFFECTIVENESS: true,
        REPAIR_RATE: true,
        AI_ATTACK_THRESHOLD: true,
        AI_DESIST_THRESHOLD: true,
        AI_RANDOM_AGGRESSION: true,
        AI_TACTICAL_AGGRESSION: true,
    });

    // Load initial values from localStorage
    const initialValues = loadFromStorage();

    // REACTIVE values state - this drives the UI and syncs TO GAME_CONFIG
    let values = $state({ ...initialValues });

    // Store original values for when re-enabled
    let savedValues = $state({ ...initialValues });

    // Apply loaded values to GAME_CONFIG on mount
    onMount(() => {
        Object.entries(values).forEach(([key, val]) => {
            (GAME_CONFIG as any)[key] = val;
        });
    });

    // Timing variables
    let tickInterval = $state(GAME_CONFIG.BASE_TICK_MS);
    let animationSpeed = $state(GAME_CONFIG.ANIMATION_SPEED_MS);

    function updateTickInterval(value: number) {
        tickInterval = value;
        activeGameStore.updateTickInterval(value);
    }

    function updateAnimationSpeed(value: number) {
        animationSpeed = value;
        GAME_CONFIG.ANIMATION_SPEED_MS = value;
    }

    // Transfer Rate control — stored as decimal in defaultValues, displayed as % in UI
    let transferRate = $state(
        Math.round((initialValues.TRANSFER_RATE ?? 0.1) * 100),
    );

    function updateTransferRate(value: number) {
        transferRate = value;
        const decimal = value / 100;
        values = { ...values, TRANSFER_RATE: decimal };
        GAME_CONFIG.TRANSFER_RATE = decimal;
        saveToStorage(values as typeof defaultValues);
    }

    // Variable metadata for UI display
    const variables = [
        {
            key: "AGGRESSOR_ADVANTAGE",
            label: "Aggressor Advantage",
            desc: "Damage multiplier for attacking side",
            min: 0,
            max: 3,
            step: 0.1,
        },
        {
            key: "DAMAGE_PER_SHIP",
            label: "Damage Per Ship",
            desc: "Base damage output per ship per tick",
            min: 0,
            max: 1,
            step: 0.01,
        },
        {
            key: "LETHALITY",
            label: "Lethality",
            desc: "% of damage that kills (vs disables)",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "FORCE_RATIO_EFFECT",
            label: "Force Ratio Effect",
            desc: "How much numbers matter",
            min: 0,
            max: 1,
            step: 0.1,
        },
        {
            key: "CONQUEST_THRESHOLD",
            label: "Conquest Threshold",
            desc: "Defender:Attacker ratio for capture",
            min: 1,
            max: 20,
            step: 1,
        },
        {
            key: "CONQUEST_TRANSFER_PERCENTAGE",
            label: "Transfer %",
            desc: "% of attacker ships transferred on conquest",
            min: 0,
            max: 100,
            step: 10,
        },
        {
            key: "RETREAT_CAPTURE_RATE",
            label: "Retreat Capture",
            desc: "% captured when defender retreats",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "SCATTER_CAPTURE_RATE",
            label: "Scatter Capture",
            desc: "% captured when defender scatters",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "SCATTER_DESTROY_RATE",
            label: "Scatter Destroy",
            desc: "% of escapees destroyed",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "RETREAT_DAMAGED_ACTIVATION_RATE",
            label: "🔄 Damaged Activation",
            desc: "% of damaged ships activated on retreat/scatter (0=stay damaged)",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "DAMAGED_SHIP_EFFECTIVENESS",
            label: "Damaged Ship Defense",
            desc: "Fraction of damaged ships counting as defenders",
            min: 0,
            max: 1,
            step: 0.01,
        },
        {
            key: "REPAIR_RATE",
            label: "🔧 Repair Rate",
            desc: "% of damaged ships repaired per tick (Purple 2x)",
            min: 0,
            max: 1,
            step: 0.01,
        },
    ] as const;

    // AI-specific variables (separate array for UI grouping)
    const aiVariables = [
        {
            key: "AI_ATTACK_THRESHOLD",
            label: "Attack Threshold",
            desc: "Min ratio to initiate attack (1.33 = need 33% advantage)",
            min: 0.5,
            max: 3,
            step: 0.1,
        },
        {
            key: "AI_DESIST_THRESHOLD",
            label: "Desist Threshold",
            desc: "Ratio at which AI retreats (1.0 = parity)",
            min: 0.1,
            max: 2,
            step: 0.1,
        },
        {
            key: "AI_RANDOM_AGGRESSION",
            label: "Random Aggression",
            desc: "Chance per tick to attack randomly",
            min: 0,
            max: 0.5,
            step: 0.01,
        },
        {
            key: "AI_TACTICAL_AGGRESSION",
            label: "Tactical Aggression",
            desc: "Chance to attack weak target to bait others",
            min: 0,
            max: 0.5,
            step: 0.01,
        },
    ] as const;

    type VarKey = keyof typeof values;

    // Toggle a variable on/off
    function toggle(key: VarKey) {
        const wasEnabled = enabled[key];
        enabled = { ...enabled, [key]: !wasEnabled };

        if (!wasEnabled) {
            // Was disabled, now enabling: restore saved value
            values = { ...values, [key]: savedValues[key] };
            (GAME_CONFIG as any)[key] = savedValues[key];
        } else {
            // Was enabled, now disabling: save current value, apply neutral
            savedValues = { ...savedValues, [key]: values[key] };
            values = { ...values, [key]: defaultValues[key] };
            (GAME_CONFIG as any)[key] = defaultValues[key];
        }
    }

    // Update a value in real-time (called from slider or number input)
    function updateValue(key: VarKey, newValue: number) {
        if (isNaN(newValue)) return;
        // Force reactivity by creating new object (Svelte 5 deep reactivity quirk with dynamic keys)
        values = { ...values, [key]: newValue };
        savedValues = { ...savedValues, [key]: newValue };
        (GAME_CONFIG as any)[key] = newValue;
        // Persist to localStorage
        saveToStorage(values as typeof defaultValues);
    }

    // Collapsible sections state with localStorage persistence
    const COLLAPSE_KEYS = {
        timing: "pax-fluxia-collapse-timing",
        transfer: "pax-fluxia-collapse-transfer",
        combat: "pax-fluxia-collapse-combat",
        ai: "pax-fluxia-collapse-ai",
        visuals: "pax-fluxia-collapse-visuals",
        animation: "pax-fluxia-collapse-animation",
        logging: "pax-fluxia-collapse-logging",
        globals: "pax-fluxia-collapse-globals",
    };

    function getCollapsedState(key: string): boolean {
        if (typeof window === "undefined") return false;
        return localStorage.getItem(key) === "true";
    }

    function setCollapsedState(key: string, value: boolean) {
        if (typeof window === "undefined") return;
        localStorage.setItem(key, String(value));
    }

    let timingCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.timing));
    let transferCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.transfer));
    let combatCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.combat));
    let aiCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.ai));
    let visualsCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.visuals));
    let animationCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.animation));
    let loggingCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.logging));
    let globalsCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.globals));
    let sizeCollapsed = $state(true); // Start collapsed

    // Log toggle categories
    const logCategories = [
        { key: "sys", label: "🔵 System", desc: "Lifecycle, init" },
        { key: "state", label: "🟣 State", desc: "Logic, transitions" },
        { key: "data", label: "🟢 Data", desc: "Data flow" },
        { key: "net", label: "🟡 Network", desc: "API, IO" },
        { key: "error", label: "🔴 Error", desc: "Errors (keep ON)" },
        { key: "success", label: "✅ Success", desc: "Verifications" },
        { key: "combat", label: "⚔️ Combat", desc: "Battle events" },
        { key: "input", label: "🖱️ Input", desc: "User clicks" },
        { key: "repair", label: "🔧 Repair", desc: "Ship repair" },
    ] as const;
    let logRefresh = $state(0); // triggers reactivity

    // Visuals state
    const VISUALS_STORAGE_KEY = "pax-fluxia-visuals";
    const visualDefaults = {
        laneWidth: GAME_CONFIG.CONNECTION_WIDTH,
        laneAlpha: GAME_CONFIG.CONNECTION_ALPHA,
        shadowWidth: GAME_CONFIG.CONNECTION_SHADOW_WIDTH,
        shadowAlpha: GAME_CONFIG.CONNECTION_SHADOW_ALPHA,
    };
    function loadVisuals() {
        if (typeof window === "undefined") return { ...visualDefaults };
        try {
            const s = localStorage.getItem(VISUALS_STORAGE_KEY);
            if (s) return { ...visualDefaults, ...JSON.parse(s) };
        } catch {
            /* ignore */
        }
        return { ...visualDefaults };
    }
    let vis = $state(loadVisuals());
    function saveVisuals() {
        if (typeof window === "undefined") return;
        localStorage.setItem(VISUALS_STORAGE_KEY, JSON.stringify(vis));
    }
    function updateVisual(key: keyof typeof vis, value: number) {
        vis = { ...vis, [key]: value };
        GAME_CONFIG.CONNECTION_WIDTH = vis.laneWidth;
        GAME_CONFIG.CONNECTION_ALPHA = vis.laneAlpha;
        GAME_CONFIG.CONNECTION_SHADOW_WIDTH = vis.shadowWidth;
        GAME_CONFIG.CONNECTION_SHADOW_ALPHA = vis.shadowAlpha;
        saveVisuals();
    }
    // Apply from storage on mount
    onMount(() => {
        GAME_CONFIG.CONNECTION_WIDTH = vis.laneWidth;
        GAME_CONFIG.CONNECTION_ALPHA = vis.laneAlpha;
        GAME_CONFIG.CONNECTION_SHADOW_WIDTH = vis.shadowWidth;
        GAME_CONFIG.CONNECTION_SHADOW_ALPHA = vis.shadowAlpha;
        applyPanelToConfig();
        // Also update local timing vars for old controls that still use them
        tickInterval = panel.tickInterval;
        animationSpeed = panel.animSpeed;
        activeGameStore.updateTickInterval(panel.tickInterval);
    });

    // =========================================================================
    // Unified Panel Settings Persistence (timing, globals, orders, animation, orb)
    // =========================================================================
    const PANEL_STORAGE_KEY = "pax-fluxia-panel-settings";

    const panelDefaults = {
        tickInterval: GAME_CONFIG.BASE_TICK_MS,
        animSpeed: GAME_CONFIG.ANIMATION_SPEED_MS,
        production: GAME_CONFIG.BASE_PRODUCTION,
        repair: GAME_CONFIG.REPAIR_RATE,
        defense: 1 / GAME_CONFIG.AGGRESSOR_ADVANTAGE,
        attack: GAME_CONFIG.DAMAGE_PER_SHIP,
        arrowLength: GAME_CONFIG.ARROW_LENGTH_FRACTION,
        departMode: GAME_CONFIG.DEPART_MODE,
        settleDuration: GAME_CONFIG.SETTLE_DURATION_MS,
        arrivalSpread: GAME_CONFIG.ARRIVAL_SPREAD,
        wobbleAmp: GAME_CONFIG.WOBBLE_AMP,
        orbTravel: GAME_CONFIG.ORB_TRAVEL,
        orbitBias: GAME_CONFIG.ORBIT_BIAS_STRENGTH,
        oscillate: GAME_CONFIG.ORBIT_BIAS_OSCILLATE,
        oscMin: GAME_CONFIG.ORBIT_BIAS_MIN,
        oscMax: GAME_CONFIG.ORBIT_BIAS_MAX,
        oscFreq: GAME_CONFIG.ORBIT_BIAS_FREQ,
        departFraction: GAME_CONFIG.DEPART_FRACTION,
        departJitter: GAME_CONFIG.DEPART_JITTER_MS,
        orbBaseRadius: GAME_CONFIG.ORB_BASE_RADIUS,
        orbRadiusScale: GAME_CONFIG.ORB_RADIUS_SCALE,
        orbGlowMult: GAME_CONFIG.ORB_GLOW_MULT,
        orbOuterAlpha: GAME_CONFIG.ORB_OUTER_ALPHA,
        orbMidAlpha: GAME_CONFIG.ORB_MID_ALPHA,
        orbCoreAlpha: GAME_CONFIG.ORB_CORE_ALPHA,
        orbCenterAlpha: GAME_CONFIG.ORB_CENTER_ALPHA,
        orbOuterScale: GAME_CONFIG.ORB_OUTER_SCALE,
        orbMidScale: GAME_CONFIG.ORB_MID_SCALE,
        orbCoreScale: GAME_CONFIG.ORB_CORE_SCALE,
        // Size controls
        shipBaseSize: GAME_CONFIG.SHIP_BASE_SIZE,
        starRenderRadius: GAME_CONFIG.STAR_RENDER_RADIUS,
        orbitRingMult: GAME_CONFIG.ORBIT_RING_MULT,
    };

    function loadPanelSettings(): typeof panelDefaults {
        if (typeof window === "undefined") return { ...panelDefaults };
        try {
            const s = localStorage.getItem(PANEL_STORAGE_KEY);
            if (s) return { ...panelDefaults, ...JSON.parse(s) };
        } catch {
            /* ignore */
        }
        return { ...panelDefaults };
    }

    let panel = $state(loadPanelSettings());

    function savePanelSettings() {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panel));
        } catch {
            /* ignore */
        }
    }

    function updatePanel(key: keyof typeof panel, value: number | boolean) {
        panel = { ...panel, [key]: value };
        applyPanelToConfig();
        savePanelSettings();
    }

    function applyPanelToConfig() {
        GAME_CONFIG.BASE_TICK_MS = panel.tickInterval as number;
        GAME_CONFIG.ANIMATION_SPEED_MS = panel.animSpeed as number;
        GAME_CONFIG.BASE_PRODUCTION = panel.production as number;
        GAME_CONFIG.REPAIR_RATE = panel.repair as number;
        GAME_CONFIG.AGGRESSOR_ADVANTAGE = 1 / (panel.defense as number);
        GAME_CONFIG.DAMAGE_PER_SHIP = panel.attack as number;
        GAME_CONFIG.ARROW_LENGTH_FRACTION = panel.arrowLength as number;
        GAME_CONFIG.DEPART_MODE = panel.departMode as
            | "lifo"
            | "fifo"
            | "nearside";
        GAME_CONFIG.SETTLE_DURATION_MS = panel.settleDuration as number;
        GAME_CONFIG.ARRIVAL_SPREAD = panel.arrivalSpread as number;
        GAME_CONFIG.WOBBLE_AMP = panel.wobbleAmp as number;
        GAME_CONFIG.ORB_TRAVEL = panel.orbTravel as boolean;
        GAME_CONFIG.ORBIT_BIAS_STRENGTH = panel.orbitBias as number;
        GAME_CONFIG.ORBIT_BIAS_OSCILLATE = panel.oscillate as boolean;
        GAME_CONFIG.ORBIT_BIAS_MIN = panel.oscMin as number;
        GAME_CONFIG.ORBIT_BIAS_MAX = panel.oscMax as number;
        GAME_CONFIG.ORBIT_BIAS_FREQ = panel.oscFreq as number;
        GAME_CONFIG.DEPART_FRACTION = panel.departFraction as number;
        GAME_CONFIG.DEPART_JITTER_MS = panel.departJitter as number;
        GAME_CONFIG.ORB_BASE_RADIUS = panel.orbBaseRadius as number;
        GAME_CONFIG.ORB_RADIUS_SCALE = panel.orbRadiusScale as number;
        GAME_CONFIG.ORB_GLOW_MULT = panel.orbGlowMult as number;
        GAME_CONFIG.ORB_OUTER_ALPHA = panel.orbOuterAlpha as number;
        GAME_CONFIG.ORB_MID_ALPHA = panel.orbMidAlpha as number;
        GAME_CONFIG.ORB_CORE_ALPHA = panel.orbCoreAlpha as number;
        GAME_CONFIG.ORB_CENTER_ALPHA = panel.orbCenterAlpha as number;
        GAME_CONFIG.ORB_OUTER_SCALE = panel.orbOuterScale as number;
        GAME_CONFIG.ORB_MID_SCALE = panel.orbMidScale as number;
        GAME_CONFIG.ORB_CORE_SCALE = panel.orbCoreScale as number;
        // Size controls
        GAME_CONFIG.SHIP_BASE_SIZE = panel.shipBaseSize as number;
        GAME_CONFIG.STAR_RENDER_RADIUS = panel.starRenderRadius as number;
        GAME_CONFIG.ORBIT_RING_MULT = panel.orbitRingMult as number;
    }
</script>

<div class="combat-tuning-list">
    <!-- Timing Section -->
    <div class="timing-section">
        <button
            class="section-header"
            onclick={() => {
                timingCollapsed = !timingCollapsed;
                setCollapsedState(COLLAPSE_KEYS.timing, timingCollapsed);
            }}
        >
            <span class="section-title">⏱️ Timing</span>
            <span class="collapse-icon">{timingCollapsed ? "▶" : "▼"}</span>
        </button>
        {#if !timingCollapsed}
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Tick Interval</span>
                    <span class="current-val">{tickInterval}ms</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="200"
                        max="3000"
                        step="100"
                        value={tickInterval}
                        oninput={(e) => {
                            const v = parseInt(
                                (e.target as HTMLInputElement).value,
                            );
                            updateTickInterval(v);
                            updatePanel("tickInterval", v);
                        }}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Animation Speed</span>
                    <span class="current-val">{animationSpeed}ms</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="200"
                        max="3000"
                        step="100"
                        value={animationSpeed}
                        oninput={(e) => {
                            const v = parseInt(
                                (e.target as HTMLInputElement).value,
                            );
                            updateAnimationSpeed(v);
                            updatePanel("animSpeed", v);
                        }}
                    />
                </div>
            </div>
        {/if}
    </div>

    <!-- Global Bonuses Section -->
    <div class="transfer-section">
        <button
            class="section-header"
            onclick={() => {
                globalsCollapsed = !globalsCollapsed;
                setCollapsedState(COLLAPSE_KEYS.globals, globalsCollapsed);
            }}
        >
            <span class="section-title">🌐 Global Bonuses</span>
            <span class="collapse-icon">{globalsCollapsed ? "▶" : "▼"}</span>
        </button>
        {#if !globalsCollapsed}
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">⚙️ Production</span>
                    <span class="current-val"
                        >{(panel.production as number).toFixed(2)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.05"
                        value={panel.production}
                        oninput={(e) => {
                            const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.BASE_PRODUCTION = v;
                            updatePanel("production", v);
                        }}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">🚀 Transfer Rate</span>
                    <span class="current-val">{transferRate}%</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={transferRate}
                        oninput={(e) =>
                            updateTransferRate(
                                parseInt((e.target as HTMLInputElement).value),
                            )}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">🔧 Repair</span>
                    <span class="current-val"
                        >{(panel.repair as number).toFixed(2)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={panel.repair}
                        oninput={(e) => {
                            const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.REPAIR_RATE = v;
                            updatePanel("repair", v);
                        }}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">🛡️ Defense</span>
                    <span class="current-val"
                        >{(panel.defense as number).toFixed(2)}×</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.05"
                        value={panel.defense}
                        oninput={(e) => {
                            const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.AGGRESSOR_ADVANTAGE = 1 / v;
                            updatePanel("defense", v);
                        }}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">⚔️ Attack</span>
                    <span class="current-val"
                        >{(panel.attack as number).toFixed(3)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.005"
                        value={panel.attack}
                        oninput={(e) => {
                            const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.DAMAGE_PER_SHIP = v;
                            updatePanel("attack", v);
                        }}
                    />
                </div>
            </div>
        {/if}
    </div>

    <!-- Arrow Controls Section -->
    <div class="transfer-section">
        <button
            class="section-header"
            onclick={() => {
                transferCollapsed = !transferCollapsed;
                setCollapsedState(COLLAPSE_KEYS.transfer, transferCollapsed);
            }}
        >
            <span class="section-title">➡️ Orders</span>
            <span class="collapse-icon">{transferCollapsed ? "▶" : "▼"}</span>
        </button>
        {#if !transferCollapsed}
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Arrow Length</span>
                    <span class="current-val"
                        >{Math.round(
                            GAME_CONFIG.ARROW_LENGTH_FRACTION * 100,
                        )}%</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="10"
                        max="100"
                        step="1"
                        value={Math.round(
                            GAME_CONFIG.ARROW_LENGTH_FRACTION * 100,
                        )}
                        oninput={(e) => {
                            GAME_CONFIG.ARROW_LENGTH_FRACTION =
                                parseInt((e.target as HTMLInputElement).value) /
                                100;
                        }}
                    />
                </div>
            </div>
        {/if}
    </div>

    <!-- Combat Tuning Section -->
    <div class="sidebar-header">
        <h3
            onclick={() => {
                combatCollapsed = !combatCollapsed;
                setCollapsedState(COLLAPSE_KEYS.combat, combatCollapsed);
            }}
            style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1;"
        >
            ⚔️ Combat Tuning
            <span class="collapse-icon">{combatCollapsed ? "▶" : "▼"}</span>
        </h3>
        <button
            class="reset-btn"
            onclick={() => {
                // Reset timing
                tickInterval = 1200;
                activeGameStore.updateTickInterval(1200);
                animationSpeed = 1200;
                GAME_CONFIG.ANIMATION_SPEED_MS = 1200;
                // Reset combat vars
                variables.forEach((v) => {
                    const key = v.key as VarKey;
                    enabled = { ...enabled, [key]: true };
                    values = { ...values, [key]: defaultValues[key] };
                    savedValues = {
                        ...savedValues,
                        [key]: defaultValues[key],
                    };
                    if (key === "TRANSFER_RATE") {
                        GAME_CONFIG.TRANSFER_RATE =
                            (defaultValues[key] as number) / 100;
                    } else {
                        (GAME_CONFIG as any)[key] = defaultValues[key];
                    }
                });
                // Reset transfer rate slider too
                transferRate = defaultValues.TRANSFER_RATE;
                GAME_CONFIG.TRANSFER_RATE = defaultValues.TRANSFER_RATE / 100;
                // Reset AI vars
                aiVariables.forEach((v) => {
                    const key = v.key as VarKey;
                    enabled = { ...enabled, [key]: true };
                    values = { ...values, [key]: defaultValues[key] };
                    savedValues = {
                        ...savedValues,
                        [key]: defaultValues[key],
                    };
                    (GAME_CONFIG as any)[key] = defaultValues[key];
                });
                // Save to localStorage
                saveToStorage(values as typeof defaultValues);
            }}>Reset</button
        >
    </div>

    {#if !combatCollapsed}
        <div class="content-list">
            {#each variables as v}
                <div
                    class="variable-row"
                    class:disabled={!enabled[v.key as keyof typeof enabled]}
                >
                    <div class="row-top">
                        <label class="toggle-label">
                            <input
                                type="checkbox"
                                checked={enabled[v.key as keyof typeof enabled]}
                                onchange={() =>
                                    toggle(v.key as keyof typeof enabled)}
                            />
                            <span class="var-name">{v.label}</span>
                        </label>
                        <span class="current-val"
                            >{values[v.key as VarKey].toFixed(2)}</span
                        >
                    </div>

                    <div class="row-controls">
                        <input
                            type="range"
                            min={v.min}
                            max={v.max}
                            step={v.step}
                            value={values[v.key as VarKey]}
                            oninput={(e) =>
                                updateValue(
                                    v.key as VarKey,
                                    parseFloat(
                                        (e.target as HTMLInputElement).value,
                                    ),
                                )}
                            disabled={!enabled[v.key as keyof typeof enabled]}
                        />
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <!-- AI Behavior Section -->
    <button
        class="section-header ai-section"
        onclick={() => {
            aiCollapsed = !aiCollapsed;
            setCollapsedState(COLLAPSE_KEYS.ai, aiCollapsed);
        }}
    >
        <span class="section-title">🤖 AI Behavior</span>
        <span class="collapse-icon">{aiCollapsed ? "▶" : "▼"}</span>
    </button>

    {#if !aiCollapsed}
        <div class="content-list">
            {#each aiVariables as v}
                <div
                    class="variable-row"
                    class:disabled={!enabled[v.key as keyof typeof enabled]}
                >
                    <div class="row-top">
                        <label class="toggle-label">
                            <input
                                type="checkbox"
                                checked={enabled[v.key as keyof typeof enabled]}
                                onchange={() =>
                                    toggle(v.key as keyof typeof enabled)}
                            />
                            <span class="var-name">{v.label}</span>
                        </label>
                        <span class="current-val"
                            >{values[v.key as VarKey].toFixed(2)}</span
                        >
                    </div>

                    <div class="row-controls">
                        <input
                            type="range"
                            min={v.min}
                            max={v.max}
                            step={v.step}
                            value={values[v.key as VarKey]}
                            oninput={(e) =>
                                updateValue(
                                    v.key as VarKey,
                                    parseFloat(
                                        (e.target as HTMLInputElement).value,
                                    ),
                                )}
                            disabled={!enabled[v.key as keyof typeof enabled]}
                        />
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Animation Tuning Section -->
    <button
        class="section-header"
        onclick={() => {
            animationCollapsed = !animationCollapsed;
            setCollapsedState(COLLAPSE_KEYS.animation, animationCollapsed);
        }}
    >
        <span class="section-title">🎬 Animation Tuning</span>
        <span class="collapse-icon">{animationCollapsed ? "▶" : "▼"}</span>
    </button>

    {#if !animationCollapsed}
        <div class="content-list">
            <!-- Facing Departure toggle -->
            <div class="variable-row">
                <div class="row-top">
                    <label class="toggle-label">
                        <span class="var-name">Depart Mode</span>
                        <select
                            value={panel.departMode}
                            onchange={(e) => {
                                const val = (e.target as HTMLSelectElement)
                                    .value;
                                GAME_CONFIG.DEPART_MODE = val as
                                    | "lifo"
                                    | "fifo"
                                    | "nearside";
                                updatePanel("departMode", val as any);
                            }}
                            style="margin-left:8px; background:#222; color:#fff; border:1px solid #555; padding:2px 4px; font-size:0.75rem;"
                        >
                            <option value="nearside">Nearside</option>
                            <option value="lifo">LIFO (newest)</option>
                            <option value="fifo">FIFO (oldest)</option>
                        </select>
                    </label>
                    <span
                        class="current-val"
                        style="font-size: 10px; opacity: 0.6">orbit dance</span
                    >
                </div>
            </div>

            <!-- Settle Duration slider -->
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Settle Time</span>
                    <span class="current-val">{panel.settleDuration}ms</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="2000"
                    step="10"
                    value={panel.settleDuration}
                    oninput={(e) => {
                        const val = +(e.target as HTMLInputElement).value;
                        GAME_CONFIG.SETTLE_DURATION_MS = val;
                        updatePanel("settleDuration", val);
                    }}
                />
            </div>

            <!-- Arrival Spread slider -->
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Arrival Spread</span>
                    <span class="current-val"
                        >{(panel.arrivalSpread as number).toFixed(1)}x</span
                    >
                </div>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={panel.arrivalSpread}
                    oninput={(e) => {
                        const val = +(e.target as HTMLInputElement).value;
                        GAME_CONFIG.ARRIVAL_SPREAD = val;
                        updatePanel("arrivalSpread", val);
                    }}
                />
            </div>

            <!-- Wobble Amplitude slider -->
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Wobble Amp</span>
                    <span class="current-val">{panel.wobbleAmp}px</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={panel.wobbleAmp}
                    oninput={(e) => {
                        const val = +(e.target as HTMLInputElement).value;
                        GAME_CONFIG.WOBBLE_AMP = val;
                        updatePanel("wobbleAmp", val);
                    }}
                />
            </div>

            <!-- Orb Travel toggle -->
            <div class="variable-row">
                <div class="row-top">
                    <label class="toggle-label">
                        <input
                            type="checkbox"
                            checked={panel.orbTravel}
                            onchange={() => {
                                GAME_CONFIG.ORB_TRAVEL =
                                    !GAME_CONFIG.ORB_TRAVEL;
                                updatePanel(
                                    "orbTravel",
                                    GAME_CONFIG.ORB_TRAVEL,
                                );
                            }}
                        />
                        <span class="var-name">Orb Travel</span>
                    </label>
                    <span
                        class="current-val"
                        style="font-size: 10px; opacity: 0.6"
                        >ships merge into orb</span
                    >
                </div>
            </div>

            <!-- Orbit Bias Strength -->
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Orbit Bias</span>
                    <span class="current-val"
                        >{(panel.orbitBias as number).toFixed(2)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={panel.orbitBias}
                        oninput={(e) => {
                            const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.ORBIT_BIAS_STRENGTH = v;
                            updatePanel("orbitBias", v);
                        }}
                    />
                </div>
            </div>

            <!-- Orbit Bias Oscillation toggle -->
            <div class="variable-row">
                <div class="row-top">
                    <label class="toggle-label">
                        <input
                            type="checkbox"
                            checked={panel.oscillate}
                            onchange={() => {
                                GAME_CONFIG.ORBIT_BIAS_OSCILLATE =
                                    !GAME_CONFIG.ORBIT_BIAS_OSCILLATE;
                                updatePanel(
                                    "oscillate",
                                    GAME_CONFIG.ORBIT_BIAS_OSCILLATE,
                                );
                            }}
                        />
                        <span class="var-name">Oscillate Bias</span>
                    </label>
                </div>
            </div>

            <div class="variable-row" style="padding-left: 12px;">
                <div class="row-top">
                    <span class="var-name">Min</span>
                    <span class="current-val"
                        >{(panel.oscMin as number).toFixed(2)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={panel.oscMin}
                        oninput={(e) => {
                            const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.ORBIT_BIAS_MIN = v;
                            updatePanel("oscMin", v);
                        }}
                    />
                </div>
            </div>
            <div class="variable-row" style="padding-left: 12px;">
                <div class="row-top">
                    <span class="var-name">Max</span>
                    <span class="current-val"
                        >{(panel.oscMax as number).toFixed(2)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={panel.oscMax}
                        oninput={(e) => {
                            const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.ORBIT_BIAS_MAX = v;
                            updatePanel("oscMax", v);
                        }}
                    />
                </div>
            </div>
            <div class="variable-row" style="padding-left: 12px;">
                <div class="row-top">
                    <span class="var-name">Freq (×tick)</span>
                    <span class="current-val"
                        >{(panel.oscFreq as number).toFixed(2)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0.25"
                        max="5"
                        step="0.25"
                        value={panel.oscFreq}
                        oninput={(e) => {
                            const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.ORBIT_BIAS_FREQ = v;
                            updatePanel("oscFreq", v);
                        }}
                    />
                </div>
            </div>

            <!-- Depart Fraction -->
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Depart Fraction</span>
                    <span class="current-val"
                        >{(panel.departFraction as number).toFixed(2)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0.1"
                        max="0.6"
                        step="0.05"
                        value={panel.departFraction}
                        oninput={(e) => {
                            const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.DEPART_FRACTION = v;
                            updatePanel("departFraction", v);
                        }}
                    />
                </div>
            </div>

            <!-- Depart Jitter -->
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Depart Jitter (ms)</span>
                    <span class="current-val">{panel.departJitter}</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0"
                        max="200"
                        step="5"
                        value={panel.departJitter}
                        oninput={(e) => {
                            const v = parseInt(
                                (e.target as HTMLInputElement).value,
                            );
                            GAME_CONFIG.DEPART_JITTER_MS = v;
                            updatePanel("departJitter", v);
                        }}
                    />
                </div>
            </div>

            <!-- Orb Visual Tuning (only shown when orb travel is on) -->
            {#if panel.orbTravel}
                <div
                    class="variable-row"
                    style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; margin-top: 4px;"
                >
                    <div class="row-top">
                        <span class="var-name" style="color: #ffcc44;"
                            >✨ Orb Visuals</span
                        >
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Base Radius</span>
                        <span class="current-val"
                            >{(panel.orbBaseRadius as number).toFixed(1)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="1"
                            max="12"
                            step="0.5"
                            value={panel.orbBaseRadius}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_BASE_RADIUS = v;
                                updatePanel("orbBaseRadius", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Radius Scale</span>
                        <span class="current-val"
                            >{(panel.orbRadiusScale as number).toFixed(2)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="0.2"
                            max="5"
                            step="0.1"
                            value={panel.orbRadiusScale}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_RADIUS_SCALE = v;
                                updatePanel("orbRadiusScale", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Glow Mult</span>
                        <span class="current-val"
                            >{(panel.orbGlowMult as number).toFixed(2)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="0"
                            max="3"
                            step="0.1"
                            value={panel.orbGlowMult}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_GLOW_MULT = v;
                                updatePanel("orbGlowMult", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Outer α</span>
                        <span class="current-val"
                            >{(panel.orbOuterAlpha as number).toFixed(2)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.02"
                            value={panel.orbOuterAlpha}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_OUTER_ALPHA = v;
                                updatePanel("orbOuterAlpha", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Mid α</span>
                        <span class="current-val"
                            >{(panel.orbMidAlpha as number).toFixed(2)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.02"
                            value={panel.orbMidAlpha}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_MID_ALPHA = v;
                                updatePanel("orbMidAlpha", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Core α</span>
                        <span class="current-val"
                            >{(panel.orbCoreAlpha as number).toFixed(2)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.02"
                            value={panel.orbCoreAlpha}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_CORE_ALPHA = v;
                                updatePanel("orbCoreAlpha", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Center α</span>
                        <span class="current-val"
                            >{(panel.orbCenterAlpha as number).toFixed(2)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={panel.orbCenterAlpha}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_CENTER_ALPHA = v;
                                updatePanel("orbCenterAlpha", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Outer Scale</span>
                        <span class="current-val"
                            >{(panel.orbOuterScale as number).toFixed(1)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="1"
                            max="5"
                            step="0.1"
                            value={panel.orbOuterScale}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_OUTER_SCALE = v;
                                updatePanel("orbOuterScale", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Mid Scale</span>
                        <span class="current-val"
                            >{(panel.orbMidScale as number).toFixed(1)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="0.5"
                            max="4"
                            step="0.1"
                            value={panel.orbMidScale}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_MID_SCALE = v;
                                updatePanel("orbMidScale", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row" style="padding-left: 12px;">
                    <div class="row-top">
                        <span class="var-name">Core Scale</span>
                        <span class="current-val"
                            >{(panel.orbCoreScale as number).toFixed(2)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="0.1"
                            max="1.5"
                            step="0.05"
                            value={panel.orbCoreScale}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORB_CORE_SCALE = v;
                                updatePanel("orbCoreScale", v);
                            }}
                        />
                    </div>
                </div>
            {/if}

            <!-- Lane Offset -->
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Lane Offset (px)</span>
                    <span class="current-val"
                        >{GAME_CONFIG.LANE_OFFSET_PX ?? 8}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={GAME_CONFIG.LANE_OFFSET_PX ?? 8}
                        oninput={(e) => {
                            GAME_CONFIG.LANE_OFFSET_PX = parseInt(
                                (e.target as HTMLInputElement).value,
                            );
                        }}
                    />
                </div>
            </div>
        </div>
    {/if}

    <!-- Size Controls Section -->
    <div class="transfer-section">
        <button
            class="section-header"
            onclick={() => {
                sizeCollapsed = !sizeCollapsed;
            }}
        >
            <span class="section-title">📐 Size Controls</span>
            <span class="collapse-icon">{sizeCollapsed ? "▶" : "▼"}</span>
        </button>
        {#if !sizeCollapsed}
            <div class="section-content">
                <div class="variable-row">
                    <div class="row-top">
                        <span class="var-name">Ship Size</span>
                        <span class="current-val"
                            >{(panel.shipBaseSize as number).toFixed(1)}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="1"
                            max="12"
                            step="0.5"
                            value={panel.shipBaseSize}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.SHIP_BASE_SIZE = v;
                                updatePanel("shipBaseSize", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row">
                    <div class="row-top">
                        <span class="var-name">Star Radius</span>
                        <span class="current-val"
                            >{(panel.starRenderRadius as number).toFixed(
                                0,
                            )}</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="5"
                            max="50"
                            step="1"
                            value={panel.starRenderRadius}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.STAR_RENDER_RADIUS = v;
                                updatePanel("starRenderRadius", v);
                            }}
                        />
                    </div>
                </div>
                <div class="variable-row">
                    <div class="row-top">
                        <span class="var-name">Orbit Spacing</span>
                        <span class="current-val"
                            >{(panel.orbitRingMult as number).toFixed(1)}×</span
                        >
                    </div>
                    <div class="row-controls">
                        <input
                            type="range"
                            min="0.5"
                            max="4"
                            step="0.1"
                            value={panel.orbitRingMult}
                            oninput={(e) => {
                                const v = parseFloat(
                                    (e.target as HTMLInputElement).value,
                                );
                                GAME_CONFIG.ORBIT_RING_MULT = v;
                                updatePanel("orbitRingMult", v);
                            }}
                        />
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Visuals Section -->
    <button
        class="section-header visuals-section"
        onclick={() => {
            visualsCollapsed = !visualsCollapsed;
            setCollapsedState(COLLAPSE_KEYS.visuals, visualsCollapsed);
        }}
    >
        <span class="section-title">🎨 Lane Visuals</span>
        <span class="collapse-icon">{visualsCollapsed ? "▶" : "▼"}</span>
    </button>

    {#if !visualsCollapsed}
        <div class="content-list">
            <label class="log-toggle-row">
                <input
                    type="checkbox"
                    checked={GAME_CONFIG.STATIC_ORBITS}
                    onchange={(e) => {
                        GAME_CONFIG.STATIC_ORBITS = (
                            e.target as HTMLInputElement
                        ).checked;
                    }}
                />
                <span class="log-label">🛑 Static Orbits</span>
                <span class="log-desc">No rotation (performance)</span>
            </label>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Lane Width</span>
                    <span class="current-val">{vis.laneWidth.toFixed(1)}</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min={0.5}
                        max={8}
                        step={0.5}
                        value={vis.laneWidth}
                        oninput={(e) =>
                            updateVisual(
                                "laneWidth",
                                parseFloat(
                                    (e.target as HTMLInputElement).value,
                                ),
                            )}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Lane Opacity</span>
                    <span class="current-val">{vis.laneAlpha.toFixed(2)}</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={vis.laneAlpha}
                        oninput={(e) =>
                            updateVisual(
                                "laneAlpha",
                                parseFloat(
                                    (e.target as HTMLInputElement).value,
                                ),
                            )}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Shadow Width</span>
                    <span class="current-val">{vis.shadowWidth.toFixed(1)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={vis.shadowWidth}
                        oninput={(e) =>
                            updateVisual(
                                "shadowWidth",
                                parseFloat(
                                    (e.target as HTMLInputElement).value,
                                ),
                            )}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Shadow Opacity</span>
                    <span class="current-val">{vis.shadowAlpha.toFixed(2)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={vis.shadowAlpha}
                        oninput={(e) =>
                            updateVisual(
                                "shadowAlpha",
                                parseFloat(
                                    (e.target as HTMLInputElement).value,
                                ),
                            )}
                    />
                </div>
            </div>
        </div>
    {/if}

    <!-- Logging Section -->
    <button
        class="section-header"
        onclick={() => {
            loggingCollapsed = !loggingCollapsed;
            setCollapsedState(COLLAPSE_KEYS.logging, loggingCollapsed);
        }}
    >
        <span class="section-title">📋 Logging</span>
        <span class="collapse-icon">{loggingCollapsed ? "▶" : "▼"}</span>
    </button>

    {#if !loggingCollapsed}
        <div class="content-list">
            <div class="log-quick-actions">
                <button
                    class="btn btn--ghost btn--xs"
                    onclick={() => {
                        Object.keys(logFlags).forEach(
                            (k) => ((logFlags as any)[k] = true),
                        );
                        logRefresh++;
                    }}>All On</button
                >
                <button
                    class="btn btn--ghost btn--xs"
                    onclick={() => {
                        Object.keys(logFlags).forEach((k) => {
                            if (k !== "error") (logFlags as any)[k] = false;
                        });
                        logRefresh++;
                    }}>All Off</button
                >
            </div>
            {#each logCategories as cat}
                {#key logRefresh}
                    <label class="log-toggle-row">
                        <input
                            type="checkbox"
                            checked={(logFlags as any)[cat.key]}
                            onchange={(e) => {
                                (logFlags as any)[cat.key] = (
                                    e.target as HTMLInputElement
                                ).checked;
                                logRefresh++;
                            }}
                        />
                        <span class="log-label">{cat.label}</span>
                        <span class="log-desc">{cat.desc}</span>
                    </label>
                {/key}
            {/each}
        </div>
    {/if}
</div>

<style>
    .combat-tuning-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: #ccc;
        font-family: inherit;
    }

    .timing-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 8px;
        border-bottom: 1px solid #223;
    }

    .transfer-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 8px;
        border-bottom: 1px solid #223;
    }

    .transfer-section .section-title {
        color: #00e0ff;
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        color: inherit;
        text-align: left;
    }

    .section-header:hover .section-title {
        color: #fff;
    }

    .collapse-icon {
        font-size: 10px;
        color: #888;
        margin-left: 6px;
    }

    .section-title {
        font-size: 11px;
        font-weight: bold;
        color: #88aaff;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .ai-section {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #223;
    }

    .ai-section .section-title {
        color: #ff8844;
    }

    .var-name {
        font-size: 11px;
        font-weight: 600;
        color: #eee;
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 5px;
        border-bottom: 1px solid #334;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 12px;
        font-weight: bold;
        color: #88aaff;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .sidebar-header h3:hover .collapse-icon {
        color: #fff;
    }

    .reset-btn {
        background: transparent;
        border: 1px solid #445;
        color: #888;
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
    }
    .reset-btn:hover {
        color: #fff;
        border-color: #667;
    }

    .content-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .variable-row {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05); /* Subtle border */
        border-radius: 4px;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .variable-row.disabled {
        opacity: 0.5;
    }

    .row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .toggle-label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        color: #eee;
    }

    .current-val {
        font-family: "Exo", sans-serif;
        font-size: 11px;
        color: #00e0ff;
    }

    .row-controls input[type="range"] {
        width: 100%;
        accent-color: #00e0ff;
        height: 4px;
        background: #334;
        border-radius: 2px;
        cursor: pointer;
    }

    /* ── Logging Section ── */
    .log-quick-actions {
        display: flex;
        gap: 6px;
        margin-bottom: 4px;
    }
    .log-toggle-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 4px;
        cursor: pointer;
        font-size: 11px;
        border-radius: 3px;
    }
    .log-toggle-row:hover {
        background: rgba(100, 120, 160, 0.1);
    }
    .log-toggle-row input[type="checkbox"] {
        accent-color: #00e0ff;
        width: 14px;
        height: 14px;
    }
    .log-label {
        font-weight: 600;
        white-space: nowrap;
    }
    .log-desc {
        font-size: 9px;
        color: #556;
        margin-left: auto;
    }
</style>
