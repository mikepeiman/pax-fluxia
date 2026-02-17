<script lang="ts">
    import { onMount } from "svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        applyTheme,
        extractTheme,
        saveTheme,
        loadThemes,
        exportThemeJSON,
        type GameTheme,
    } from "$lib/config/themes";
    import { BUILTIN_THEMES } from "$lib/config/builtinThemes";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { animationStore } from "$lib/stores/animationStore.svelte";
    import { log, logFlags } from "$lib/utils/logger";

    const STORAGE_KEY = "pax-fluxia-combat-tuning";

    // Default values — single source of truth for reset + disabled toggle state
    const defaultValues = {
        TRANSFER_RATE: 0.1,
        AGGRESSOR_ADVANTAGE: 0.7,
        DAMAGE_PER_SHIP: 0.05,
        LETHALITY: 0.1,
        FORCE_RATIO_EFFECT: 0,
        CONQUEST_THRESHOLD: 12,
        CONQUEST_TRANSFER_PERCENTAGE: 0.3,
        RETREAT_CAPTURE_RATE: 0.25,
        SCATTER_CAPTURE_RATE: 0.4,
        SCATTER_DESTROY_RATE: 0.5,
        RETREAT_DAMAGED_ACTIVATION_RATE: 0,
        DAMAGED_SHIP_EFFECTIVENESS: 0.1,
        REPAIR_RATE: 10,
        AI_MUST_ATTACK_RATIO: 1.25,
        AI_ATTACK_UPPER_BOUNDS: 0.8,
        AI_ATTACK_STICKINESS: 0.5,
        AI_EVALUATION_FREQUENCY: 0.5,
        AI_TACTICAL_AGGRESSION: 0.1,
        AI_RANDOM_AGGRESSION: 0.05,
        DENSITY_HUE_STEP: 4,
        DENSITY_SAT_STEP: 0.05,
        DENSITY_LIGHT_STEP: 0.05,
        DENSITY_TIERS: 3,
    };

    function loadFromStorage(): typeof defaultValues {
        if (typeof window === "undefined") return { ...defaultValues };
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return { ...defaultValues, ...JSON.parse(stored) };
        } catch (e) {
            log.error("GameSettingsPanel", "Failed to load combat tuning", e);
        }
        return { ...defaultValues };
    }

    function saveToStorage(vals: typeof defaultValues) {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(vals));
        } catch {
            /* ignore */
        }
    }

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
        AI_MUST_ATTACK_RATIO: true,
        AI_ATTACK_UPPER_BOUNDS: true,
        AI_ATTACK_STICKINESS: true,
        AI_EVALUATION_FREQUENCY: true,
        AI_TACTICAL_AGGRESSION: true,
        AI_RANDOM_AGGRESSION: true,
        DENSITY_HUE_STEP: true,
        DENSITY_SAT_STEP: true,
        DENSITY_LIGHT_STEP: true,
        DENSITY_TIERS: true,
    });

    const initialValues = loadFromStorage();
    let values = $state({ ...initialValues });
    let savedValues = $state({ ...initialValues });

    onMount(() => {
        Object.entries(values).forEach(([key, val]) => {
            (GAME_CONFIG as any)[key] = val;
        });
    });

    let tickInterval = $state(GAME_CONFIG.BASE_TICK_MS);

    function updateTickInterval(value: number) {
        tickInterval = value;
        activeGameStore.updateTickInterval(value);
    }

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

    // Combat variable metadata
    const variables = [
        {
            key: "AGGRESSOR_ADVANTAGE",
            label: "Aggressor Advantage",
            min: 0,
            max: 3,
            step: 0.1,
        },
        {
            key: "DAMAGE_PER_SHIP",
            label: "Damage Per Ship",
            min: 0,
            max: 1,
            step: 0.01,
        },
        { key: "LETHALITY", label: "Lethality", min: 0, max: 1, step: 0.05 },
        {
            key: "FORCE_RATIO_EFFECT",
            label: "Force Ratio Effect",
            min: 0,
            max: 1,
            step: 0.1,
        },
        {
            key: "CONQUEST_THRESHOLD",
            label: "Conquest Threshold",
            min: 1,
            max: 50,
            step: 1,
        },
        {
            key: "CONQUEST_TRANSFER_PERCENTAGE",
            label: "Transfer %",
            min: 0,
            max: 100,
            step: 10,
        },
        {
            key: "RETREAT_CAPTURE_RATE",
            label: "Retreat Capture",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "SCATTER_CAPTURE_RATE",
            label: "Scatter Capture",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "SCATTER_DESTROY_RATE",
            label: "Scatter Destroy",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "RETREAT_DAMAGED_ACTIVATION_RATE",
            label: "🔄 Damaged Activation",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "DAMAGED_SHIP_EFFECTIVENESS",
            label: "Damaged Ship Defense",
            min: 0,
            max: 1,
            step: 0.01,
        },
    ] as const;

    const aiVariables = [
        {
            key: "AI_MUST_ATTACK_RATIO",
            label: "Must-Attack Ratio",
            min: 0.5,
            max: 3,
            step: 0.05,
        },
        {
            key: "AI_ATTACK_UPPER_BOUNDS",
            label: "May-Attack Bounds",
            min: 0.3,
            max: 2,
            step: 0.05,
        },
        {
            key: "AI_ATTACK_STICKINESS",
            label: "Attack Stickiness",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "AI_EVALUATION_FREQUENCY",
            label: "Eval Frequency",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "AI_TACTICAL_AGGRESSION",
            label: "Tactical Aggression",
            min: 0,
            max: 0.5,
            step: 0.01,
        },
        {
            key: "AI_RANDOM_AGGRESSION",
            label: "Random Aggression",
            min: 0,
            max: 0.5,
            step: 0.01,
        },
    ] as const;

    const densityVariables = [
        {
            key: "DENSITY_HUE_STEP",
            label: "Hue Step (°)",
            min: 0,
            max: 20,
            step: 1,
        },
        {
            key: "DENSITY_SAT_STEP",
            label: "Saturation Step",
            min: 0,
            max: 0.2,
            step: 0.01,
        },
        {
            key: "DENSITY_LIGHT_STEP",
            label: "Lightness Step",
            min: 0,
            max: 0.2,
            step: 0.01,
        },
        {
            key: "DENSITY_TIERS",
            label: "Max Tiers",
            min: 1,
            max: 6,
            step: 1,
        },
    ] as const;

    // Debug ship count slider — direct engine manipulation
    let debugShipCount = $state(0);
    let lastDebugStarId = $state<string | null>(null);

    function updateDebugShipCount(count: number) {
        const starId = selectedStarStore.id;
        if (!starId) return;
        debugShipCount = count;
        // Use the store's debugSetStarShips method (works on internal GameRoomState)
        gameStore.debugSetStarShips(starId, count);
    }

    // Sync debug slider with selected star
    $effect(() => {
        const starId = selectedStarStore.id;
        if (starId !== lastDebugStarId) {
            lastDebugStarId = starId;
            if (starId) {
                const stars = activeGameStore.stars;
                const star = stars.find((s: any) => s.id === starId);
                debugShipCount = star ? star.activeShips : 0;
            }
        }
    });

    type VarKey = keyof typeof values;

    function toggle(key: VarKey) {
        const wasEnabled = enabled[key];
        enabled = { ...enabled, [key]: !wasEnabled };
        if (!wasEnabled) {
            values = { ...values, [key]: savedValues[key] };
            (GAME_CONFIG as any)[key] = savedValues[key];
        } else {
            savedValues = { ...savedValues, [key]: values[key] };
            values = { ...values, [key]: defaultValues[key] };
            (GAME_CONFIG as any)[key] = defaultValues[key];
        }
    }

    function updateValue(key: VarKey, newValue: number) {
        if (isNaN(newValue)) return;
        values = { ...values, [key]: newValue };
        savedValues = { ...savedValues, [key]: newValue };
        (GAME_CONFIG as any)[key] = newValue;
        saveToStorage(values as typeof defaultValues);
    }

    const logCategories = [
        { key: "sys", label: "🔵 System", desc: "Lifecycle, init" },
        { key: "state", label: "🟣 State", desc: "Logic, transitions" },
        { key: "data", label: "🟢 Data", desc: "Data flow" },
        { key: "net", label: "🟡 Network", desc: "API, IO" },
        { key: "error", label: "🔴 Error", desc: "Errors (keep ON)" },
        { key: "success", label: "✅ Success", desc: "Verifications" },
        { key: "combat", label: "⚔️ Combat", desc: "Battle events" },
        { key: "conquest", label: "🏰 Conquest", desc: "Capture details" },
        { key: "input", label: "🖱️ Input", desc: "User clicks" },
        { key: "repair", label: "🔧 Repair", desc: "Ship repair" },
    ] as const;
    let logRefresh = $state(0);

    // ── Config Import/Export ──
    let configStatus = $state("");
    let configStatusColor = $state("#4ade80");

    function exportConfigJSON() {
        const data = JSON.stringify(GAME_CONFIG, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        a.href = url;
        a.download = `pax-config-${ts}.json`;
        a.click();
        URL.revokeObjectURL(url);
        configStatus = `✅ Exported ${Object.keys(GAME_CONFIG).length} settings`;
        configStatusColor = "#4ade80";
    }

    function exportConfigMD() {
        const sections: Record<string, string[]> = {
            Combat: [
                "AGGRESSOR_ADVANTAGE",
                "DAMAGE_PER_SHIP",
                "LETHALITY",
                "FORCE_RATIO_EFFECT",
                "CONQUEST_THRESHOLD",
                "DAMAGED_SHIP_EFFECTIVENESS",
            ],
            "Production & Repair": [
                "BASE_PRODUCTION",
                "REPAIR_RATE",
                "MIN_REPAIR",
                "REPAIR_COMBAT_PENALTY",
            ],
            Transfer: [
                "TRANSFER_RATE",
                "MIN_SHIPS_PER_TRANSFER",
                "MAX_SHIPS_PER_TRANSFER",
                "CONQUEST_TRANSFER_PERCENTAGE",
            ],
            Conquest: [
                "OVERWHELM_THRESHOLD",
                "RETREAT_CAPTURE_RATE",
                "SCATTER_CAPTURE_RATE",
                "SCATTER_DESTROY_RATE",
                "RETREAT_DAMAGED_ACTIVATION_RATE",
                "CONQUEST_DAMAGED_CAPTURE_RATE",
                "CONQUEST_DAMAGED_DESTROY_RATE",
            ],
            AI: [
                "AI_MUST_ATTACK_RATIO",
                "AI_ATTACK_UPPER_BOUNDS",
                "AI_ATTACK_STICKINESS",
                "AI_EVALUATION_FREQUENCY",
                "AI_TACTICAL_AGGRESSION",
                "AI_RANDOM_AGGRESSION",
            ],
            Visual: [
                "SHIP_BASE_SIZE",
                "STAR_RENDER_RADIUS",
                "ORBIT_DENSITY",
                "ATTACK_SURGE_MULT",
                "SETTLE_DURATION_MS",
                "WOBBLE_AMP",
                "ARRIVAL_SPREAD",
            ],
        };

        let md = `# Pax Fluxia Config\n_Exported ${new Date().toISOString()}_\n\n`;
        const cfg = GAME_CONFIG as Record<string, any>;

        for (const [section, keys] of Object.entries(sections)) {
            md += `## ${section}\n| Key | Value |\n|-----|-------|\n`;
            for (const k of keys) {
                if (k in cfg) md += `| \`${k}\` | ${cfg[k]} |\n`;
            }
            md += "\n";
        }

        // Remaining keys
        const listed = new Set(Object.values(sections).flat());
        const remaining = Object.keys(cfg).filter((k) => !listed.has(k));
        if (remaining.length > 0) {
            md += `## Other\n| Key | Value |\n|-----|-------|\n`;
            for (const k of remaining) md += `| \`${k}\` | ${cfg[k]} |\n`;
        }

        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        a.href = url;
        a.download = `pax-config-${ts}.md`;
        a.click();
        URL.revokeObjectURL(url);
        configStatus = `✅ Exported MD`;
        configStatusColor = "#4ade80";
    }

    function importConfigJSON(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const raw = reader.result as string;
                let data: unknown;
                try {
                    data = JSON.parse(raw);
                } catch {
                    configStatus = "❌ Invalid JSON — could not parse file";
                    configStatusColor = "#f87171";
                    input.value = "";
                    return;
                }

                // Must be a plain object
                if (!data || typeof data !== "object" || Array.isArray(data)) {
                    configStatus = "❌ Expected a JSON object with config keys";
                    configStatusColor = "#f87171";
                    input.value = "";
                    return;
                }

                const incoming = data as Record<string, unknown>;
                const cfg = GAME_CONFIG as Record<string, any>;
                let applied = 0;
                let skipped = 0;
                let typeErrors = 0;

                for (const [k, v] of Object.entries(incoming)) {
                    if (!(k in cfg)) {
                        skipped++;
                        continue;
                    }
                    // Type guard: only apply if types match
                    const existing = cfg[k];
                    if (
                        typeof existing === "number" &&
                        typeof v === "number" &&
                        isFinite(v)
                    ) {
                        cfg[k] = v;
                        applied++;
                    } else if (
                        typeof existing === "boolean" &&
                        typeof v === "boolean"
                    ) {
                        cfg[k] = v;
                        applied++;
                    } else if (
                        typeof existing === "string" &&
                        typeof v === "string"
                    ) {
                        cfg[k] = v;
                        applied++;
                    } else {
                        typeErrors++;
                    }
                }

                // Sync combat tuning values to localStorage + reactive state
                const stored = loadFromStorage();
                for (const k of Object.keys(stored)) {
                    if (
                        k in incoming &&
                        typeof incoming[k] === typeof (stored as any)[k]
                    ) {
                        (stored as any)[k] = incoming[k];
                    }
                }
                saveToStorage(stored);
                // Refresh reactive slider values
                Object.assign(values, stored);

                // Also persist visual settings if they exist
                try {
                    const visuals = localStorage.getItem(VISUALS_STORAGE_KEY);
                    if (visuals) {
                        const vObj = JSON.parse(visuals);
                        let changed = false;
                        for (const k of Object.keys(vObj)) {
                            if (
                                k in incoming &&
                                typeof incoming[k] === typeof vObj[k]
                            ) {
                                vObj[k] = incoming[k];
                                changed = true;
                            }
                        }
                        if (changed)
                            localStorage.setItem(
                                VISUALS_STORAGE_KEY,
                                JSON.stringify(vObj),
                            );
                    }
                } catch {
                    /* ignore */
                }

                const parts = [`✅ ${applied} applied`];
                if (skipped) parts.push(`${skipped} unknown`);
                if (typeErrors) parts.push(`${typeErrors} type mismatches`);
                configStatus = parts.join(", ");
                configStatusColor = typeErrors > 0 ? "#fbbf24" : "#4ade80";
            } catch (err) {
                configStatus = `❌ Import failed: ${(err as Error).message}`;
                configStatusColor = "#f87171";
            }
            // Reset input so same file can be re-imported
            input.value = "";
        };
        reader.readAsText(file);
    }

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
    onMount(() => {
        GAME_CONFIG.CONNECTION_WIDTH = vis.laneWidth;
        GAME_CONFIG.CONNECTION_ALPHA = vis.laneAlpha;
        GAME_CONFIG.CONNECTION_SHADOW_WIDTH = vis.shadowWidth;
        GAME_CONFIG.CONNECTION_SHADOW_ALPHA = vis.shadowAlpha;
        applyPanelToConfig();
        tickInterval = panel.tickInterval;
        activeGameStore.updateTickInterval(panel.tickInterval);
    });

    // Unified Panel Settings
    const PANEL_STORAGE_KEY = "pax-fluxia-panel-settings";
    const panelDefaults = {
        tickInterval: GAME_CONFIG.BASE_TICK_MS,
        animSpeed: animationStore.speedMs,
        production: GAME_CONFIG.BASE_PRODUCTION,
        repair: GAME_CONFIG.REPAIR_RATE,
        defense: 1 / GAME_CONFIG.AGGRESSOR_ADVANTAGE,
        attack: GAME_CONFIG.DAMAGE_PER_SHIP,
        arrowLength: GAME_CONFIG.ARROW_LENGTH_FRACTION,
        departMode: GAME_CONFIG.DEPART_MODE,
        settleDuration: GAME_CONFIG.SETTLE_DURATION_MS,
        arrivalSpread: GAME_CONFIG.ARRIVAL_SPREAD,
        wobbleAmp: GAME_CONFIG.WOBBLE_AMP,
        travelEasing: GAME_CONFIG.TRAVEL_EASING,
        travelMode: GAME_CONFIG.TRAVEL_MODE,
        travelEasingPower: GAME_CONFIG.TRAVEL_EASING_POWER,
        travelDurationMult: GAME_CONFIG.TRAVEL_DURATION_MULT,
        travelArcIntensity: GAME_CONFIG.TRAVEL_ARC_INTENSITY,
        departStagger: GAME_CONFIG.DEPART_STAGGER,
        departArcIntensity: GAME_CONFIG.DEPART_ARC_INTENSITY,
        arrivalArcIntensity: GAME_CONFIG.ARRIVAL_ARC_INTENSITY,
        orbitDensity: GAME_CONFIG.ORBIT_DENSITY,
        attackSurgeMult: GAME_CONFIG.ATTACK_SURGE_MULT,
        attackSurgeProportional: GAME_CONFIG.ATTACK_SURGE_PROPORTIONAL,
        attackSurgeForceCofactor: GAME_CONFIG.ATTACK_SURGE_FORCE_COFACTOR,
        attackSurgeRampMs: GAME_CONFIG.ATTACK_SURGE_RAMP_MS,
        attackSurgeShape: GAME_CONFIG.ATTACK_SURGE_SHAPE,
        conquestTravelSpeed: GAME_CONFIG.CONQUEST_TRAVEL_SPEED,
        conquestLerpDelayMs: GAME_CONFIG.CONQUEST_LERP_DELAY_MS,
        conquestColorDelayMs: GAME_CONFIG.CONQUEST_COLOR_DELAY_MS,
        conquestFlashDurationMs: GAME_CONFIG.CONQUEST_FLASH_DURATION_MS,
        conquestAnimMode: GAME_CONFIG.CONQUEST_ANIMATION_MODE,
        conquestSettleMs: GAME_CONFIG.CONQUEST_SETTLE_MS,
        conquestSurgeRadius: GAME_CONFIG.CONQUEST_SURGE_RADIUS,
        conquestSurgeStaggerMs: GAME_CONFIG.CONQUEST_SURGE_STAGGER_MS,
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
        shipBaseSize: GAME_CONFIG.SHIP_BASE_SIZE,
        starRenderRadius: GAME_CONFIG.STAR_RENDER_RADIUS,
        orbitRingMult: GAME_CONFIG.ORBIT_RING_MULT,
        shipOutlineOn: GAME_CONFIG.SHIP_OUTLINE_ON,
        shipOutlinePx: GAME_CONFIG.SHIP_OUTLINE_PX,
        shipGlowIntensity: GAME_CONFIG.SHIP_GLOW_INTENSITY,
        shipScaleMult: GAME_CONFIG.SHIP_SCALE_MULT,
        maxVisualShips: GAME_CONFIG.MAX_VISUAL_SHIPS,
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

    function updatePanel(
        key: keyof typeof panel,
        value: number | boolean | string,
    ) {
        panel = { ...panel, [key]: value };
        applyPanelToConfig();
        savePanelSettings();
    }

    function applyPanelToConfig() {
        GAME_CONFIG.BASE_TICK_MS = panel.tickInterval as number;
        animationStore.setAnimationSpeed(panel.animSpeed as number);
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
        GAME_CONFIG.TRAVEL_EASING = panel.travelEasing as
            | "easeInOut"
            | "easeIn"
            | "easeOut"
            | "linear";
        GAME_CONFIG.TRAVEL_MODE = panel.travelMode as "bezier" | "lane";
        GAME_CONFIG.TRAVEL_EASING_POWER = panel.travelEasingPower as number;
        GAME_CONFIG.TRAVEL_DURATION_MULT = panel.travelDurationMult as number;
        GAME_CONFIG.TRAVEL_ARC_INTENSITY = panel.travelArcIntensity as number;
        GAME_CONFIG.DEPART_STAGGER = panel.departStagger as boolean;
        GAME_CONFIG.DEPART_ARC_INTENSITY = panel.departArcIntensity as number;
        GAME_CONFIG.ARRIVAL_ARC_INTENSITY = panel.arrivalArcIntensity as number;
        GAME_CONFIG.ORBIT_DENSITY = panel.orbitDensity as number;
        GAME_CONFIG.ATTACK_SURGE_MULT = panel.attackSurgeMult as number;
        GAME_CONFIG.ATTACK_SURGE_PROPORTIONAL =
            panel.attackSurgeProportional as boolean;
        GAME_CONFIG.ATTACK_SURGE_FORCE_COFACTOR =
            panel.attackSurgeForceCofactor as number;
        GAME_CONFIG.ATTACK_SURGE_RAMP_MS = panel.attackSurgeRampMs as number;
        GAME_CONFIG.ATTACK_SURGE_SHAPE = panel.attackSurgeShape as number;
        GAME_CONFIG.CONQUEST_TRAVEL_SPEED = panel.conquestTravelSpeed as number;
        GAME_CONFIG.CONQUEST_LERP_DELAY_MS =
            panel.conquestLerpDelayMs as number;
        GAME_CONFIG.CONQUEST_COLOR_DELAY_MS =
            panel.conquestColorDelayMs as number;
        GAME_CONFIG.CONQUEST_FLASH_DURATION_MS =
            panel.conquestFlashDurationMs as number;
        GAME_CONFIG.CONQUEST_ANIMATION_MODE = panel.conquestAnimMode as
            | "immediate"
            | "surge"
            | "travel";
        GAME_CONFIG.CONQUEST_SETTLE_MS = panel.conquestSettleMs as number;
        GAME_CONFIG.CONQUEST_SURGE_RADIUS = panel.conquestSurgeRadius as number;
        GAME_CONFIG.CONQUEST_SURGE_STAGGER_MS =
            panel.conquestSurgeStaggerMs as number;
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
        GAME_CONFIG.SHIP_BASE_SIZE = panel.shipBaseSize as number;
        GAME_CONFIG.STAR_RENDER_RADIUS = panel.starRenderRadius as number;
        GAME_CONFIG.ORBIT_RING_MULT = panel.orbitRingMult as number;
        GAME_CONFIG.SHIP_OUTLINE_ON = panel.shipOutlineOn as boolean;
        GAME_CONFIG.SHIP_OUTLINE_PX = panel.shipOutlinePx as number;
        GAME_CONFIG.SHIP_GLOW_INTENSITY = panel.shipGlowIntensity as number;
        GAME_CONFIG.SHIP_SCALE_MULT = panel.shipScaleMult as number;
        GAME_CONFIG.MAX_VISUAL_SHIPS = panel.maxVisualShips as number;
    }

    function resetToDefaults() {
        panel = { ...panelDefaults };
        applyPanelToConfig();
        localStorage.removeItem(PANEL_STORAGE_KEY);
        // Reset combat vars
        variables.forEach((v) => {
            const key = v.key as VarKey;
            enabled = { ...enabled, [key]: true };
            values = { ...values, [key]: defaultValues[key] };
            savedValues = { ...savedValues, [key]: defaultValues[key] };
            (GAME_CONFIG as any)[key] = defaultValues[key];
        });
        transferRate = defaultValues.TRANSFER_RATE;
        GAME_CONFIG.TRANSFER_RATE = defaultValues.TRANSFER_RATE / 100;
        aiVariables.forEach((v) => {
            const key = v.key as VarKey;
            enabled = { ...enabled, [key]: true };
            values = { ...values, [key]: defaultValues[key] };
            savedValues = { ...savedValues, [key]: defaultValues[key] };
            (GAME_CONFIG as any)[key] = defaultValues[key];
        });
        saveToStorage(values as typeof defaultValues);
        // Reset timing
        tickInterval = 1200;
        activeGameStore.updateTickInterval(1200);
        animationStore.setAnimationSpeed(1200);
    }

    // =========================================================================
    // Settings Tiers — basic / advanced / developer
    // =========================================================================
    type SettingsTier = "basic" | "advanced" | "developer";
    const TIER_STORAGE_KEY = "pax-fluxia-settings-tier";

    function loadTier(): SettingsTier {
        if (typeof window === "undefined") return "basic";
        const s = localStorage.getItem(TIER_STORAGE_KEY);
        if (s === "advanced" || s === "developer") return s;
        return "basic";
    }

    let activeTier = $state<SettingsTier>(loadTier());

    function setTier(tier: SettingsTier) {
        activeTier = tier;
        if (typeof window !== "undefined") {
            localStorage.setItem(TIER_STORAGE_KEY, tier);
        }
    }

    const TIER_LABELS: Record<
        SettingsTier,
        { label: string; icon: string; color: string }
    > = {
        basic: { label: "Basic", icon: "🎮", color: "#4ade80" },
        advanced: { label: "Advanced", icon: "⚙️", color: "#fbbf24" },
        developer: { label: "Developer", icon: "🛠️", color: "#f87171" },
    };

    // =========================================================================
    // Theme System
    // =========================================================================
    let userThemes = $state<GameTheme[]>(
        typeof window !== "undefined" ? loadThemes() : [],
    );
    let allThemes = $derived([...BUILTIN_THEMES, ...userThemes]);
    let selectedThemeName = $state<string>("");

    function handleApplyTheme(name: string) {
        const theme = allThemes.find((t) => t.name === name);
        if (!theme) return;
        applyTheme(theme);
        selectedThemeName = name;
        // Sync panel reactive state from GAME_CONFIG after theme apply
        panel = loadPanelSettings();
        Object.assign(panel, {
            tickInterval: GAME_CONFIG.BASE_TICK_MS,
            animSpeed: GAME_CONFIG.ANIMATION_SPEED_MS,
            production: GAME_CONFIG.BASE_PRODUCTION,
            repair: GAME_CONFIG.REPAIR_RATE,
            defense: 1 / GAME_CONFIG.AGGRESSOR_ADVANTAGE,
            attack: GAME_CONFIG.DAMAGE_PER_SHIP,
        });
        applyPanelToConfig();
        savePanelSettings();
        // Sync combat variables too
        const stored = loadFromStorage();
        for (const k of Object.keys(stored)) {
            if (k in GAME_CONFIG) {
                (stored as any)[k] = (GAME_CONFIG as any)[k];
            }
        }
        saveToStorage(stored);
        Object.assign(values, stored);
        configStatus = `✅ Theme "${name}" applied`;
        configStatusColor = "#4ade80";
    }

    function handleSaveTheme() {
        const name = prompt("Theme name:");
        if (!name) return;
        const desc = prompt("Short description:") || "";
        const theme = extractTheme(name, desc);
        saveTheme(theme);
        userThemes = loadThemes();
        configStatus = `✅ Theme "${name}" saved`;
        configStatusColor = "#4ade80";
    }

    function handleExportTheme() {
        const theme = allThemes.find((t) => t.name === selectedThemeName);
        if (theme) {
            exportThemeJSON(theme);
        } else {
            // Export current as unnamed
            const t = extractTheme("Custom", "Exported settings");
            exportThemeJSON(t);
        }
    }

    // =========================================================================
    // Icon Toolbar — sections definition
    // =========================================================================
    type SectionId =
        | "speed"
        | "battle"
        | "economy"
        | "ai"
        | "travel"
        | "surge"
        | "conquest"
        | "ships"
        | "visuals"
        | "logging";

    const ACTIVE_SECTION_KEY = "pax-fluxia-active-section";
    function loadActiveSection(): SectionId | null {
        if (typeof window === "undefined") return null;
        const s = localStorage.getItem(ACTIVE_SECTION_KEY);
        return s as SectionId | null;
    }

    let activeSection = $state<SectionId | null>(loadActiveSection());

    function toggleSection(id: SectionId) {
        activeSection = activeSection === id ? null : id;
        if (typeof window !== "undefined") {
            if (activeSection)
                localStorage.setItem(ACTIVE_SECTION_KEY, activeSection);
            else localStorage.removeItem(ACTIVE_SECTION_KEY);
        }
    }

    const sections: {
        id: SectionId;
        icon: string;
        label: string;
        color: string;
        tier: SettingsTier;
    }[] = [
        {
            id: "speed",
            icon: "⚡",
            label: "Timing",
            color: "#ffcc00",
            tier: "basic",
        },
        {
            id: "economy",
            icon: "🎛️",
            label: "Core / Global",
            color: "#44ff88",
            tier: "basic",
        },
        {
            id: "battle",
            icon: "⚔️",
            label: "Battle",
            color: "#ff4466",
            tier: "advanced",
        },
        {
            id: "ships",
            icon: "🎨",
            label: "Ship Appearance",
            color: "#88ccff",
            tier: "advanced",
        },
        {
            id: "travel",
            icon: "🚀",
            label: "Path & Easing",
            color: "#44aaff",
            tier: "advanced",
        },
        {
            id: "surge",
            icon: "💥",
            label: "Surge & Orbs",
            color: "#ff6644",
            tier: "advanced",
        },
        {
            id: "conquest",
            icon: "🏰",
            label: "Conquest",
            color: "#ff66aa",
            tier: "advanced",
        },
        {
            id: "visuals",
            icon: "🗺️",
            label: "Map & Grid",
            color: "#cc66ff",
            tier: "basic",
        },
        {
            id: "ai",
            icon: "🤖",
            label: "AI Behavior",
            color: "#ff8844",
            tier: "developer",
        },
        {
            id: "logging",
            icon: "📋",
            label: "Logging",
            color: "#88aacc",
            tier: "developer",
        },
    ];

    // Filter sections by active tier (basic shows basic, advanced shows basic+advanced, developer shows all)
    const TIER_RANK: Record<SettingsTier, number> = {
        basic: 0,
        advanced: 1,
        developer: 2,
    };
    let visibleSections = $derived(
        sections.filter((s) => TIER_RANK[s.tier] <= TIER_RANK[activeTier]),
    );
</script>

<div class="controls-panel">
    <!-- Tier Toggle -->
    <div class="tier-bar">
        {#each ["basic", "advanced", "developer"] as const as tier}
            <button
                class="tier-pill"
                class:active={activeTier === tier}
                style="--tier-color: {TIER_LABELS[tier].color}"
                onclick={() => setTier(tier)}
                title="{TIER_LABELS[tier].label} settings"
            >
                <span class="tier-icon">{TIER_LABELS[tier].icon}</span>
                <span class="tier-label">{TIER_LABELS[tier].label}</span>
            </button>
        {/each}
    </div>

    <!-- Theme Picker (always visible — basic tier feature) -->
    <div class="theme-bar">
        <select
            class="theme-select"
            value={selectedThemeName}
            onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                if (v) handleApplyTheme(v);
            }}
        >
            <option value="">🎨 Select Theme…</option>
            {#each allThemes as theme}
                <option value={theme.name}>
                    {theme.name}
                </option>
            {/each}
        </select>
        <button
            class="theme-btn"
            onclick={handleSaveTheme}
            title="Save current as theme">💾</button
        >
        <button
            class="theme-btn"
            onclick={handleExportTheme}
            title="Export theme JSON">📤</button
        >
    </div>

    <!-- Icon Toolbar -->
    <div class="icon-toolbar" class:has-active={activeSection !== null}>
        {#each visibleSections as s}
            <button
                class="icon-btn"
                class:active={activeSection === s.id}
                style="--accent: {s.color}"
                onclick={() => toggleSection(s.id)}
                title={s.label}
            >
                <span class="icon-emoji">{s.icon}</span>
                {#if activeSection === null}
                    <span class="icon-label">{s.label}</span>
                {/if}
            </button>
        {/each}
        <button
            class="icon-btn reset-icon"
            title="Reset All"
            onclick={resetToDefaults}
        >
            <span class="icon-emoji">↺</span>
            {#if activeSection === null}
                <span class="icon-label">Reset</span>
            {/if}
        </button>
    </div>

    <!-- Active Section Content -->
    {#if activeSection !== null}
        {@const sec = sections.find((s) => s.id === activeSection)}
        <div class="section-panel" style="--accent: {sec?.color ?? '#fff'}">
            <button
                class="section-head"
                onclick={() => toggleSection(activeSection!)}
            >
                <span class="head-icon">{sec?.icon}</span>
                <span class="head-label">{sec?.label}</span>
                <span class="head-close">✕</span>
            </button>

            <div class="section-body">
                <!-- ⚡ TIMING -->
                {#if activeSection === "speed"}
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Tick Interval</span><span
                                class="val">{tickInterval}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="5000"
                            step="50"
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
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Animation Speed</span><span
                                class="val">{animationStore.speedMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="5000"
                            step="50"
                            value={animationStore.speedMs}
                            oninput={(e) => {
                                const v = parseInt(
                                    (e.target as HTMLInputElement).value,
                                );
                                animationStore.setAnimationSpeed(v);
                                updatePanel("animSpeed", v);
                            }}
                        />
                    </div>

                    <!-- ⚔️ BATTLE -->
                {:else if activeSection === "battle"}
                    {#each variables as v}
                        <div
                            class="var-row"
                            class:disabled={!enabled[
                                v.key as keyof typeof enabled
                            ]}
                        >
                            <div class="row-top">
                                <label class="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={enabled[
                                            v.key as keyof typeof enabled
                                        ]}
                                        onchange={() =>
                                            toggle(
                                                v.key as keyof typeof enabled,
                                            )}
                                    />
                                    <span class="var-name">{v.label}</span>
                                </label>
                                <span class="val"
                                    >{values[v.key as VarKey].toFixed(2)}</span
                                >
                            </div>
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
                                            (e.target as HTMLInputElement)
                                                .value,
                                        ),
                                    )}
                                disabled={!enabled[
                                    v.key as keyof typeof enabled
                                ]}
                            />
                        </div>
                    {/each}

                    <!-- 🏭 ECONOMY -->
                {:else if activeSection === "economy"}
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">⚙️ Production</span><span
                                class="val"
                                >{(panel.production as number).toFixed(2)}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
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
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">🚀 Transfer Rate</span><span
                                class="val">{transferRate}%</span
                            >
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={transferRate}
                            oninput={(e) =>
                                updateTransferRate(
                                    parseInt(
                                        (e.target as HTMLInputElement).value,
                                    ),
                                )}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">🔧 Repair</span><span
                                class="val">{panel.repair as number}%</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
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
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">🛡️ Defense</span><span
                                class="val"
                                >{(panel.defense as number).toFixed(2)}×</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.2"
                            max="5"
                            step="0.1"
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
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">⚔️ Attack</span><span
                                class="val"
                                >{(panel.attack as number).toFixed(3)}</span
                            >
                        </div>
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

                    <!-- 🤖 AI BEHAVIOR -->
                {:else if activeSection === "ai"}
                    {#each aiVariables as v}
                        <div
                            class="var-row"
                            class:disabled={!enabled[
                                v.key as keyof typeof enabled
                            ]}
                        >
                            <div class="row-top">
                                <label class="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={enabled[
                                            v.key as keyof typeof enabled
                                        ]}
                                        onchange={() =>
                                            toggle(
                                                v.key as keyof typeof enabled,
                                            )}
                                    />
                                    <span class="var-name">{v.label}</span>
                                </label>
                                <span class="val"
                                    >{values[v.key as VarKey].toFixed(2)}</span
                                >
                            </div>
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
                                            (e.target as HTMLInputElement)
                                                .value,
                                        ),
                                    )}
                                disabled={!enabled[
                                    v.key as keyof typeof enabled
                                ]}
                            />
                        </div>
                    {/each}

                    <h4 class="sub-heading">Future Strategies</h4>
                    <div class="var-row grayed">
                        <div class="row-top">
                            <span class="var-name">🎯 Sniper</span><span
                                class="val">—</span
                            >
                        </div>
                        <span class="future-desc"
                            >Targets weakest stars first</span
                        >
                    </div>
                    <div class="var-row grayed">
                        <div class="row-top">
                            <span class="var-name">🛡️ Turtle</span><span
                                class="val">—</span
                            >
                        </div>
                        <span class="future-desc"
                            >Defensive posture, holds territory</span
                        >
                    </div>
                    <div class="var-row grayed">
                        <div class="row-top">
                            <span class="var-name">🌊 Swarm</span><span
                                class="val">—</span
                            >
                        </div>
                        <span class="future-desc">Mass coordinated attacks</span
                        >
                    </div>
                    <div class="var-row grayed">
                        <div class="row-top">
                            <span class="var-name">🎲 Chaos</span><span
                                class="val">—</span
                            >
                        </div>
                        <span class="future-desc"
                            >Unpredictable, random targets</span
                        >
                    </div>
                    <div class="var-row grayed">
                        <div class="row-top">
                            <span class="var-name">🤝 Diplomat</span><span
                                class="val">—</span
                            >
                        </div>
                        <span class="future-desc"
                            >Avoids conflict, grows economy</span
                        >
                    </div>
                    <div class="var-row grayed">
                        <div class="row-top">
                            <span class="var-name">⚖️ Balanced</span><span
                                class="val">—</span
                            >
                        </div>
                        <span class="future-desc"
                            >Adapts to game state dynamically</span
                        >
                    </div>

                    <!-- 🚀 SHIP TRAVEL -->
                {:else if activeSection === "travel"}
                    <h4 class="sub-heading">Mode & Easing</h4>
                    <!-- Travel Animation Mode -->
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Travel Mode</span><span
                                class="val">{panel.travelMode}</span
                            >
                        </div>
                        <select
                            value={panel.travelMode}
                            onchange={(e) => {
                                const v = (e.target as HTMLSelectElement).value;
                                GAME_CONFIG.TRAVEL_MODE = v as any;
                                updatePanel("travelMode", v);
                            }}
                            style="width:100%;background:#1a1e2a;color:#fff;border:1px solid #333;padding:4px;border-radius:4px;font-size:0.7rem;"
                        >
                            <option value="bezier">Bezier Arc</option>
                            <option value="lane">Lane (Classic)</option>
                        </select>
                    </div>
                    <!-- Travel Easing Controls -->
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Travel Easing</span><span
                                class="val">{panel.travelEasing}</span
                            >
                        </div>
                        <select
                            value={panel.travelEasing}
                            onchange={(e) => {
                                const v = (e.target as HTMLSelectElement).value;
                                GAME_CONFIG.TRAVEL_EASING = v as any;
                                updatePanel("travelEasing", v);
                            }}
                            style="width:100%;background:#1a1e2a;color:#fff;border:1px solid #333;padding:4px;border-radius:4px;font-size:0.7rem;"
                        >
                            <option value="linear">Linear</option>
                            <option value="easeIn">Ease In</option>
                            <option value="easeOut">Ease Out</option>
                            <option value="easeInOut">Ease In-Out</option>
                        </select>
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Easing Power</span><span
                                class="val"
                                >{(panel.travelEasingPower as number).toFixed(
                                    1,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="5"
                            step="0.1"
                            value={panel.travelEasingPower}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.TRAVEL_EASING_POWER = v;
                                updatePanel("travelEasingPower", v);
                            }}
                        />
                    </div>

                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Travel Duration</span><span
                                class="val"
                                >{(panel.travelDurationMult as number).toFixed(
                                    1,
                                )}×</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.2"
                            max="3"
                            step="0.1"
                            value={panel.travelDurationMult}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.TRAVEL_DURATION_MULT = v;
                                updatePanel("travelDurationMult", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Arc Intensity</span><span
                                class="val"
                                >{(panel.travelArcIntensity as number).toFixed(
                                    2,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={panel.travelArcIntensity}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.TRAVEL_ARC_INTENSITY = v;
                                updatePanel("travelArcIntensity", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <label class="toggle-label"
                                ><span class="var-name">Depart Mode</span>
                                <select
                                    value={panel.departMode}
                                    onchange={(e) => {
                                        const val = (
                                            e.target as HTMLSelectElement
                                        ).value;
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
                        </div>
                    </div>
                    <label class="toggle-row" style="margin-top:2px;">
                        <input
                            type="checkbox"
                            checked={panel.departStagger}
                            onchange={(e) => {
                                const v = (e.target as HTMLInputElement)
                                    .checked;
                                GAME_CONFIG.DEPART_STAGGER = v;
                                updatePanel("departStagger", v);
                            }}
                        />
                        <span class="log-label" style="font-size:9px;"
                            >Stream Departure (even spacing)</span
                        >
                    </label>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Settle Time</span><span
                                class="val">{panel.settleDuration}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2000"
                            step="10"
                            value={panel.settleDuration}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.SETTLE_DURATION_MS = v;
                                updatePanel("settleDuration", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Arrival Spread</span><span
                                class="val"
                                >{(panel.arrivalSpread as number).toFixed(
                                    1,
                                )}×</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={panel.arrivalSpread}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ARRIVAL_SPREAD = v;
                                updatePanel("arrivalSpread", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Wobble Amp</span><span
                                class="val">{panel.wobbleAmp}px</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="40"
                            step="1"
                            value={panel.wobbleAmp}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.WOBBLE_AMP = v;
                                updatePanel("wobbleAmp", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Depart Jitter</span><span
                                class="val">{panel.departJitter}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            step="5"
                            value={panel.departJitter}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.DEPART_JITTER_MS = v;
                                updatePanel("departJitter", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Lane Offset</span><span
                                class="val"
                                >{GAME_CONFIG.LANE_OFFSET_PX ?? 8}px</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="30"
                            step="1"
                            value={GAME_CONFIG.LANE_OFFSET_PX ?? 8}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.LANE_OFFSET_PX = v;
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Lane Convergence</span><span
                                class="val"
                                >{Math.round(
                                    (GAME_CONFIG.LANE_CONVERGENCE ?? 1) * 100,
                                )}%</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={GAME_CONFIG.LANE_CONVERGENCE ?? 1}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.LANE_CONVERGENCE = v;
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Convergence Point</span><span
                                class="val"
                                >{GAME_CONFIG.LANE_CONVERGENCE_POINT ??
                                    0}%</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={GAME_CONFIG.LANE_CONVERGENCE_POINT ?? 0}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.LANE_CONVERGENCE_POINT = v;
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Orbit Density</span><span
                                class="val"
                                >{(panel.orbitDensity as number).toFixed(
                                    1,
                                )}×</span
                            >
                        </div>
                        <input
                            type="range"
                            min="1.0"
                            max="4.0"
                            step="0.1"
                            value={panel.orbitDensity}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ORBIT_DENSITY = v;
                                updatePanel("orbitDensity", v);
                            }}
                        />
                    </div>

                    <!-- 💥 SURGE & ORBS -->
                {:else if activeSection === "surge"}
                    <h4 class="sub-heading">Attack Surge</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Attack Surge ×</span><span
                                class="val"
                                >{(panel.attackSurgeMult as number).toFixed(
                                    2,
                                )}×</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1.5"
                            step="0.05"
                            value={panel.attackSurgeMult}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ATTACK_SURGE_MULT = v;
                                updatePanel("attackSurgeMult", v);
                            }}
                        />
                    </div>
                    <label class="toggle-row" style="margin-top:2px;">
                        <input
                            type="checkbox"
                            checked={panel.attackSurgeProportional}
                            onchange={(e) => {
                                const v = (e.target as HTMLInputElement)
                                    .checked;
                                GAME_CONFIG.ATTACK_SURGE_PROPORTIONAL = v;
                                updatePanel("attackSurgeProportional", v);
                            }}
                        />
                        <span class="log-label" style="font-size:9px;"
                            >Proportional to force</span
                        >
                    </label>
                    {#if panel.attackSurgeProportional}
                        <div class="var-row compact" style="margin-top:2px;">
                            <div class="row-top">
                                <span class="var-name">Force Cofactor</span
                                ><span class="val"
                                    >{(
                                        panel.attackSurgeForceCofactor as number
                                    ).toFixed(2)}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="5"
                                step="0.1"
                                value={panel.attackSurgeForceCofactor}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.ATTACK_SURGE_FORCE_COFACTOR = v;
                                    updatePanel("attackSurgeForceCofactor", v);
                                }}
                            />
                        </div>
                    {/if}
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Surge Ramp</span><span
                                class="val">{panel.attackSurgeRampMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1000"
                            step="50"
                            value={panel.attackSurgeRampMs}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ATTACK_SURGE_RAMP_MS = v;
                                updatePanel("attackSurgeRampMs", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Surge Shape</span><span
                                class="val"
                                >{(panel.attackSurgeShape as number).toFixed(
                                    1,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="4"
                            step="0.1"
                            value={panel.attackSurgeShape}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ATTACK_SURGE_SHAPE = v;
                                updatePanel("attackSurgeShape", v);
                            }}
                        />
                    </div>

                    <h4 class="sub-heading">Orb Travel</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <label class="toggle-label"
                                ><input
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
                                <span class="var-name">Orb Travel</span></label
                            >
                            <span class="val" style="font-size:9px;opacity:0.6"
                                >merge into orb</span
                            >
                        </div>
                    </div>
                    {#if panel.orbTravel}
                        <div class="var-row indent compact">
                            <div class="row-top">
                                <span class="var-name">Base R</span><span
                                    class="val"
                                    >{(panel.orbBaseRadius as number).toFixed(
                                        0,
                                    )}px</span
                                >
                            </div>
                            <input
                                type="range"
                                min="2"
                                max="30"
                                step="1"
                                value={panel.orbBaseRadius}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.ORB_BASE_RADIUS = v;
                                    updatePanel("orbBaseRadius", v);
                                }}
                            />
                        </div>
                        <div class="var-row compact">
                            <div class="row-top">
                                <span class="var-name">R Scale</span><span
                                    class="val"
                                    >{(panel.orbRadiusScale as number).toFixed(
                                        2,
                                    )}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0.2"
                                max="5"
                                step="0.1"
                                value={panel.orbRadiusScale}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.ORB_RADIUS_SCALE = v;
                                    updatePanel("orbRadiusScale", v);
                                }}
                            />
                        </div>
                        <!-- Glow -->
                        <div class="var-row indent compact">
                            <div class="row-top">
                                <span class="var-name">Glow Mult</span><span
                                    class="val"
                                    >{(panel.orbGlowMult as number).toFixed(
                                        2,
                                    )}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                step="0.1"
                                value={panel.orbGlowMult}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.ORB_GLOW_MULT = v;
                                    updatePanel("orbGlowMult", v);
                                }}
                            />
                        </div>
                        <div class="orb-pair indent">
                            <div class="var-row compact">
                                <div class="row-top">
                                    <span class="var-name">Outer α</span><span
                                        class="val"
                                        >{(
                                            panel.orbOuterAlpha as number
                                        ).toFixed(2)}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.02"
                                    value={panel.orbOuterAlpha}
                                    oninput={(e) => {
                                        const v = +(
                                            e.target as HTMLInputElement
                                        ).value;
                                        GAME_CONFIG.ORB_OUTER_ALPHA = v;
                                        updatePanel("orbOuterAlpha", v);
                                    }}
                                />
                            </div>
                            <div class="var-row compact">
                                <div class="row-top">
                                    <span class="var-name">Outer ×</span><span
                                        class="val"
                                        >{(
                                            panel.orbOuterScale as number
                                        ).toFixed(1)}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.1"
                                    value={panel.orbOuterScale}
                                    oninput={(e) => {
                                        const v = +(
                                            e.target as HTMLInputElement
                                        ).value;
                                        GAME_CONFIG.ORB_OUTER_SCALE = v;
                                        updatePanel("orbOuterScale", v);
                                    }}
                                />
                            </div>
                        </div>
                        <div class="orb-pair indent">
                            <div class="var-row compact">
                                <div class="row-top">
                                    <span class="var-name">Mid α</span><span
                                        class="val"
                                        >{(panel.orbMidAlpha as number).toFixed(
                                            2,
                                        )}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.02"
                                    value={panel.orbMidAlpha}
                                    oninput={(e) => {
                                        const v = +(
                                            e.target as HTMLInputElement
                                        ).value;
                                        GAME_CONFIG.ORB_MID_ALPHA = v;
                                        updatePanel("orbMidAlpha", v);
                                    }}
                                />
                            </div>
                            <div class="var-row compact">
                                <div class="row-top">
                                    <span class="var-name">Mid ×</span><span
                                        class="val"
                                        >{(panel.orbMidScale as number).toFixed(
                                            1,
                                        )}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.1"
                                    value={panel.orbMidScale}
                                    oninput={(e) => {
                                        const v = +(
                                            e.target as HTMLInputElement
                                        ).value;
                                        GAME_CONFIG.ORB_MID_SCALE = v;
                                        updatePanel("orbMidScale", v);
                                    }}
                                />
                            </div>
                        </div>
                        <div class="orb-pair indent">
                            <div class="var-row compact">
                                <div class="row-top">
                                    <span class="var-name">Core α</span><span
                                        class="val"
                                        >{(
                                            panel.orbCoreAlpha as number
                                        ).toFixed(2)}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.05"
                                    value={panel.orbCoreAlpha}
                                    oninput={(e) => {
                                        const v = +(
                                            e.target as HTMLInputElement
                                        ).value;
                                        GAME_CONFIG.ORB_CORE_ALPHA = v;
                                        updatePanel("orbCoreAlpha", v);
                                    }}
                                />
                            </div>
                            <div class="var-row compact">
                                <div class="row-top">
                                    <span class="var-name">Core ×</span><span
                                        class="val"
                                        >{(
                                            panel.orbCoreScale as number
                                        ).toFixed(1)}</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.1"
                                    value={panel.orbCoreScale}
                                    oninput={(e) => {
                                        const v = +(
                                            e.target as HTMLInputElement
                                        ).value;
                                        GAME_CONFIG.ORB_CORE_SCALE = v;
                                        updatePanel("orbCoreScale", v);
                                    }}
                                />
                            </div>
                        </div>
                        <!-- Center dot -->
                        <div class="var-row indent compact">
                            <div class="row-top">
                                <span class="var-name">Center α</span><span
                                    class="val"
                                    >{(panel.orbCenterAlpha as number).toFixed(
                                        2,
                                    )}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.05"
                                value={panel.orbCenterAlpha}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.ORB_CENTER_ALPHA = v;
                                    updatePanel("orbCenterAlpha", v);
                                }}
                            />
                        </div>
                    {/if}

                    <!-- 🏰 CONQUEST -->
                {:else if activeSection === "conquest"}
                    <h4 class="sub-heading">Animation</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Conquest Mode</span><span
                                class="val">{panel.conquestAnimMode}</span
                            >
                        </div>
                        <select
                            class="mode-select"
                            value={panel.conquestAnimMode}
                            onchange={(e) => {
                                const v = (e.target as HTMLSelectElement)
                                    .value as "immediate" | "surge" | "travel";
                                GAME_CONFIG.CONQUEST_ANIMATION_MODE = v;
                                updatePanel("conquestAnimMode", v);
                            }}
                        >
                            <option value="immediate">Immediate</option>
                            <option value="surge">Surge</option>
                            <option value="travel">Travel</option>
                        </select>
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Surge Radius</span><span
                                class="val">{panel.conquestSurgeRadius}px</span
                            >
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="120"
                            step="5"
                            value={panel.conquestSurgeRadius}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.CONQUEST_SURGE_RADIUS = v;
                                updatePanel("conquestSurgeRadius", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Surge Stagger</span><span
                                class="val"
                                >{panel.conquestSurgeStaggerMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            step="5"
                            value={panel.conquestSurgeStaggerMs}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.CONQUEST_SURGE_STAGGER_MS = v;
                                updatePanel("conquestSurgeStaggerMs", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Conquest Speed</span><span
                                class="val"
                                >{(panel.conquestTravelSpeed as number).toFixed(
                                    2,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={panel.conquestTravelSpeed}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.CONQUEST_TRAVEL_SPEED = v;
                                updatePanel("conquestTravelSpeed", v);
                            }}
                        />
                    </div>
                    <h4 class="sub-heading">Timing</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Conquest Delay</span><span
                                class="val">{panel.conquestLerpDelayMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1000"
                            step="50"
                            value={panel.conquestLerpDelayMs}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.CONQUEST_LERP_DELAY_MS = v;
                                updatePanel("conquestLerpDelayMs", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Color Delay</span><span
                                class="val">{panel.conquestColorDelayMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2000"
                            step="50"
                            value={panel.conquestColorDelayMs}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.CONQUEST_COLOR_DELAY_MS = v;
                                updatePanel("conquestColorDelayMs", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Flash Duration</span><span
                                class="val"
                                >{panel.conquestFlashDurationMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1500"
                            step="50"
                            value={panel.conquestFlashDurationMs}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.CONQUEST_FLASH_DURATION_MS = v;
                                updatePanel("conquestFlashDurationMs", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Conquest Settle</span><span
                                class="val">{panel.conquestSettleMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="2000"
                            step="50"
                            value={panel.conquestSettleMs}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.CONQUEST_SETTLE_MS = v;
                                updatePanel("conquestSettleMs", v);
                            }}
                        />
                    </div>

                    <!-- 🎨 SHIP APPEARANCE -->
                {:else if activeSection === "ships"}
                    <!-- ── Ship Size & Shape ── -->
                    <h4 class="sub-heading">Ship Size & Shape</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Visual Radius</span><span
                                class="val"
                                >{(GAME_CONFIG.SHIP_VISUAL_RADIUS ?? 3).toFixed(
                                    1,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="8"
                            step="0.5"
                            value={GAME_CONFIG.SHIP_VISUAL_RADIUS ?? 3}
                            oninput={(e) => {
                                GAME_CONFIG.SHIP_VISUAL_RADIUS = +(
                                    e.target as HTMLInputElement
                                ).value;
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Scale Multiplier</span><span
                                class="val"
                                >{(panel.shipScaleMult as number).toFixed(
                                    1,
                                )}×</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.3"
                            max="3.0"
                            step="0.1"
                            value={panel.shipScaleMult}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.SHIP_SCALE_MULT = v;
                                updatePanel("shipScaleMult", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <label class="toggle-label"
                                ><input
                                    type="checkbox"
                                    checked={panel.shipOutlineOn}
                                    onchange={() => {
                                        panel.shipOutlineOn =
                                            !panel.shipOutlineOn;
                                        GAME_CONFIG.SHIP_OUTLINE_ON =
                                            panel.shipOutlineOn as boolean;
                                        updatePanel(
                                            "shipOutlineOn",
                                            panel.shipOutlineOn,
                                        );
                                    }}
                                /> Ship Outline</label
                            >
                        </div>
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Outline px</span><span
                                class="val"
                                >{(panel.shipOutlinePx as number).toFixed(
                                    1,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.2"
                            max="3.0"
                            step="0.1"
                            value={panel.shipOutlinePx}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.SHIP_OUTLINE_PX = v;
                                updatePanel("shipOutlinePx", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Glow Intensity</span><span
                                class="val"
                                >{(panel.shipGlowIntensity as number).toFixed(
                                    2,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1.0"
                            step="0.02"
                            value={panel.shipGlowIntensity}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.SHIP_GLOW_INTENSITY = v;
                                updatePanel("shipGlowIntensity", v);
                            }}
                        />
                    </div>

                    <!-- ── Orbit Layout ── -->
                    <h4 class="sub-heading">Orbit Layout</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Orbit Spacing Size</span
                            ><span class="val"
                                >{(panel.shipBaseSize as number).toFixed(
                                    1,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="12"
                            step="0.5"
                            value={panel.shipBaseSize}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.SHIP_BASE_SIZE = v;
                                updatePanel("shipBaseSize", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Ring Spacing</span><span
                                class="val"
                                >{(panel.orbitRingMult as number).toFixed(
                                    1,
                                )}×</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="4"
                            step="0.1"
                            value={panel.orbitRingMult}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ORBIT_RING_MULT = v;
                                updatePanel("orbitRingMult", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Ships Per Ring</span><span
                                class="val"
                                >{(panel.orbitDensity as number).toFixed(
                                    1,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="4"
                            step="0.1"
                            value={panel.orbitDensity}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ORBIT_DENSITY = v;
                                updatePanel("orbitDensity", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Max Ships/Star</span><span
                                class="val">{panel.maxVisualShips}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="500"
                            step="10"
                            value={panel.maxVisualShips}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.MAX_VISUAL_SHIPS = v;
                                updatePanel("maxVisualShips", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Star Radius</span><span
                                class="val"
                                >{(panel.starRenderRadius as number).toFixed(
                                    0,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            step="1"
                            value={panel.starRenderRadius}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.STAR_RENDER_RADIUS = v;
                                updatePanel("starRenderRadius", v);
                            }}
                        />
                    </div>

                    <!-- ── Density Coloring ── -->
                    <h4 class="sub-heading">Density Coloring</h4>
                    {#each densityVariables as v}
                        <div
                            class="var-row"
                            class:disabled={!enabled[
                                v.key as keyof typeof enabled
                            ]}
                        >
                            <div class="row-top">
                                <label class="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={enabled[
                                            v.key as keyof typeof enabled
                                        ]}
                                        onchange={() =>
                                            toggle(
                                                v.key as keyof typeof enabled,
                                            )}
                                    />
                                    <span class="var-name">{v.label}</span>
                                </label>
                                <span class="val"
                                    >{values[v.key as VarKey].toFixed(2)}</span
                                >
                            </div>
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
                                            (e.target as HTMLInputElement)
                                                .value,
                                        ),
                                    )}
                                disabled={!enabled[
                                    v.key as keyof typeof enabled
                                ]}
                            />
                        </div>
                    {/each}
                    <div class="var-row">
                        <div class="row-top">
                            <label class="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={GAME_CONFIG.DENSITY_DARKEN_ALT}
                                    onchange={() => {
                                        GAME_CONFIG.DENSITY_DARKEN_ALT =
                                            !GAME_CONFIG.DENSITY_DARKEN_ALT;
                                    }}
                                />
                                <span class="var-name">Alternate Darkening</span
                                >
                            </label>
                        </div>
                    </div>

                    <!-- ── Star Glow ── -->
                    <h4 class="sub-heading">Star Glow</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <label class="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={GAME_CONFIG.STAR_GLOW_ON}
                                    onchange={() => {
                                        GAME_CONFIG.STAR_GLOW_ON =
                                            !GAME_CONFIG.STAR_GLOW_ON;
                                    }}
                                />
                                <span class="var-name">Glow Enabled</span>
                            </label>
                        </div>
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Glow Radius</span><span
                                class="val"
                                >{(
                                    GAME_CONFIG.STAR_GLOW_RADIUS_MULT ?? 1.3
                                ).toFixed(1)}×</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="3.0"
                            step="0.1"
                            value={GAME_CONFIG.STAR_GLOW_RADIUS_MULT ?? 1.3}
                            oninput={(e) => {
                                GAME_CONFIG.STAR_GLOW_RADIUS_MULT = +(
                                    e.target as HTMLInputElement
                                ).value;
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Glow Intensity</span><span
                                class="val"
                                >{(
                                    GAME_CONFIG.STAR_GLOW_INTENSITY ?? 0.25
                                ).toFixed(2)}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1.0"
                            step="0.02"
                            value={GAME_CONFIG.STAR_GLOW_INTENSITY ?? 0.25}
                            oninput={(e) => {
                                GAME_CONFIG.STAR_GLOW_INTENSITY = +(
                                    e.target as HTMLInputElement
                                ).value;
                            }}
                        />
                    </div>

                    <!-- ── Debug ── -->
                    <h4 class="sub-heading">Debug: Ship Count</h4>
                    {#if selectedStarStore.id}
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Active Ships</span>
                                <span class="val"
                                    >{debugShipCount.toLocaleString()}</span
                                >
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={10000}
                                step={10}
                                value={debugShipCount}
                                oninput={(e) =>
                                    updateDebugShipCount(
                                        parseInt(
                                            (e.target as HTMLInputElement)
                                                .value,
                                        ),
                                    )}
                            />
                        </div>
                    {:else}
                        <div class="var-row grayed">
                            <span class="future-desc"
                                >Select a star to adjust ship count</span
                            >
                        </div>
                    {/if}

                    <!-- 🎨 MAP VISUALS -->
                {:else if activeSection === "visuals"}
                    <h4 class="sub-heading">Overlays</h4>
                    <label class="toggle-row"
                        ><input
                            type="checkbox"
                            checked={GAME_CONFIG.SHOW_HEX_GRID}
                            onchange={(e) => {
                                GAME_CONFIG.SHOW_HEX_GRID = (
                                    e.target as HTMLInputElement
                                ).checked;
                            }}
                        />
                        <span class="var-name">🔷 Show Hex Grid</span></label
                    >
                    <label class="toggle-row"
                        ><input
                            type="checkbox"
                            checked={typeof localStorage !== "undefined" &&
                                localStorage.getItem("pax-show-star-info") ===
                                    "true"}
                            onchange={(e) => {
                                const v = (e.target as HTMLInputElement)
                                    .checked;
                                localStorage.setItem(
                                    "pax-show-star-info",
                                    v ? "true" : "false",
                                );
                                window.dispatchEvent(
                                    new CustomEvent("pax-star-info-toggle", {
                                        detail: v,
                                    }),
                                );
                            }}
                        />
                        <span class="var-name">🔍 Star Inspector</span><span
                            class="val"
                            style="font-size:9px;opacity:0.6"
                            >click star to inspect</span
                        ></label
                    >
                    <h4 class="sub-heading">Connections</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">➡️ Arrow Length</span><span
                                class="val"
                                >{Math.round(
                                    GAME_CONFIG.ARROW_LENGTH_FRACTION * 100,
                                )}%</span
                            >
                        </div>
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
                                    parseInt(
                                        (e.target as HTMLInputElement).value,
                                    ) / 100;
                            }}
                        />
                    </div>
                    <label class="toggle-row"
                        ><input
                            type="checkbox"
                            checked={GAME_CONFIG.STATIC_ORBITS}
                            onchange={(e) => {
                                GAME_CONFIG.STATIC_ORBITS = (
                                    e.target as HTMLInputElement
                                ).checked;
                            }}
                        />
                        <span class="var-name">🛑 Static Orbits</span><span
                            class="val"
                            style="font-size:9px;opacity:0.6">No rotation</span
                        ></label
                    >
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Lane Width</span><span
                                class="val">{vis.laneWidth.toFixed(1)}</span
                            >
                        </div>
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
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Lane Opacity</span><span
                                class="val">{vis.laneAlpha.toFixed(2)}</span
                            >
                        </div>
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
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Shadow Width</span><span
                                class="val">{vis.shadowWidth.toFixed(1)}</span
                            >
                        </div>
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
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Shadow Opacity</span><span
                                class="val">{vis.shadowAlpha.toFixed(2)}</span
                            >
                        </div>
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

                    <!-- 📋 LOGGING -->
                {:else if activeSection === "logging"}
                    <div class="log-actions">
                        <button
                            class="btn-xs"
                            onclick={() => {
                                Object.keys(logFlags).forEach(
                                    (k) => ((logFlags as any)[k] = true),
                                );
                                logRefresh++;
                            }}>All On</button
                        >
                        <button
                            class="btn-xs"
                            onclick={() => {
                                Object.keys(logFlags).forEach((k) => {
                                    if (k !== "error")
                                        (logFlags as any)[k] = false;
                                });
                                logRefresh++;
                            }}>All Off</button
                        >
                    </div>
                    {#each logCategories as cat}
                        {#key logRefresh}
                            <label class="toggle-row">
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

                    <!-- ── Config Import/Export ── -->
                    <h4 class="sub-heading" style="margin-top: 10px;">
                        ⚙️ Config
                    </h4>
                    <div class="log-actions" style="flex-wrap: wrap;">
                        <button
                            class="btn-xs btn-export"
                            onclick={() => exportConfigJSON()}
                            >📥 Export JSON</button
                        >
                        <button
                            class="btn-xs btn-export"
                            onclick={() => exportConfigMD()}
                            >📄 Export MD</button
                        >
                        <button
                            class="btn-xs btn-import"
                            onclick={() => {
                                const inp = document.getElementById(
                                    "config-import-input",
                                ) as HTMLInputElement;
                                if (inp) inp.click();
                            }}>📤 Import JSON</button
                        >
                    </div>
                    <input
                        id="config-import-input"
                        type="file"
                        accept=".json"
                        style="display:none;"
                        onchange={(e) => importConfigJSON(e)}
                    />
                    {#if configStatus}
                        <div
                            class="config-status"
                            style="color:{configStatusColor};font-size:9px;padding:2px 4px;margin-top:2px;"
                        >
                            {configStatus}
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .controls-panel {
        display: flex;
        flex-direction: column;
        gap: 8px;
        color: #ccc;
        font-family: inherit;
        height: 100%;
        min-height: 0;
    }

    /* ── Icon Toolbar ── */
    .icon-toolbar {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        padding: 4px;
    }
    .icon-toolbar.has-active {
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
    }
    .icon-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 4px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        cursor: pointer;
        color: #aaa;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .icon-toolbar.has-active .icon-btn {
        padding: 6px 2px;
        border-radius: 6px;
    }
    .icon-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: var(--accent, #555);
        color: var(--accent, #fff);
        transform: translateY(-1px);
        box-shadow: 0 2px 12px
            color-mix(in srgb, var(--accent) 30%, transparent);
    }
    .icon-btn.active {
        background: color-mix(in srgb, var(--accent) 15%, transparent);
        border-color: var(--accent);
        color: var(--accent);
        box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 25%, transparent);
    }
    .icon-emoji {
        font-size: 22px;
        line-height: 1;
        filter: saturate(1.3);
    }
    .icon-toolbar.has-active .icon-emoji {
        font-size: 16px;
    }
    .icon-label {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.7;
        text-align: center;
        line-height: 1.1;
    }
    .reset-icon {
        --accent: #ff5555;
    }
    .reset-icon .icon-emoji {
        filter: none;
    }

    /* ── Section Panel ── */
    .section-panel {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        overflow: hidden;
        animation: slideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .section-head {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px 10px;
        background: color-mix(in srgb, var(--accent) 10%, transparent);
        border: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        cursor: pointer;
        color: var(--accent);
        font-family: inherit;
        transition: background 0.15s;
    }
    .section-head:hover {
        background: color-mix(in srgb, var(--accent) 18%, transparent);
    }
    .head-icon {
        font-size: 18px;
    }
    .head-label {
        flex: 1;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        text-align: left;
    }
    .head-close {
        font-size: 12px;
        opacity: 0.5;
        transition: opacity 0.15s;
    }
    .head-close:hover {
        opacity: 1;
    }

    .section-body {
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
        overflow-y: auto;
        min-height: 0;
    }
    /* Paired orb controls side-by-side */
    .orb-pair {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
    }
    .var-row.compact {
        padding: 3px 5px;
        gap: 2px;
    }
    .var-row.compact .row-top {
        gap: 2px;
    }
    .var-row.compact .var-name {
        font-size: 9px;
    }
    .var-row.compact .val {
        font-size: 9px;
    }

    /* ── Controls ── */
    .var-row {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        padding: 5px 6px;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .var-row.disabled {
        opacity: 0.45;
    }
    .var-row.indent {
        margin-left: 12px;
    }
    .row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .var-name {
        font-size: 10.5px;
        font-weight: 600;
        color: #ddd;
    }
    .val {
        font-family: "Exo", sans-serif;
        font-size: 10.5px;
        color: var(--accent, #00e0ff);
    }
    .toggle-label {
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        font-size: 10.5px;
        font-weight: 600;
        color: #ddd;
    }
    input[type="range"] {
        width: 100%;
        accent-color: var(--accent, #00e0ff);
        height: 3px;
        background: #334;
        border-radius: 2px;
        cursor: pointer;
    }
    input[type="checkbox"] {
        accent-color: var(--accent, #00e0ff);
        width: 13px;
        height: 13px;
    }
    .mode-select {
        width: 100%;
        background: #1a1a2e;
        color: #ddd;
        border: 1px solid #334;
        border-radius: 3px;
        padding: 3px 6px;
        font-size: 10px;
        font-family: inherit;
        accent-color: var(--accent, #00e0ff);
        cursor: pointer;
    }
    .mode-select:focus {
        outline: 1px solid var(--accent, #00e0ff);
    }

    .sub-heading {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--accent, #99bbdd);
        margin: 4px 0 2px;
        padding-top: 4px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-weight: 700;
    }

    /* ── Logging ── */
    .log-actions {
        display: flex;
        gap: 6px;
        margin-bottom: 2px;
    }
    .btn-xs {
        background: transparent;
        border: 1px solid #556;
        color: #889;
        font-size: 9px;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.15s;
    }
    .btn-xs:hover {
        border-color: #fff;
        color: #fff;
    }
    .toggle-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 4px;
        cursor: pointer;
        font-size: 10.5px;
        border-radius: 3px;
    }
    .toggle-row:hover {
        background: rgba(100, 120, 160, 0.1);
    }
    .log-label {
        font-weight: 600;
        white-space: nowrap;
    }
    .log-desc {
        font-size: 8px;
        color: #556;
        margin-left: auto;
    }
    .sub-heading {
        font-size: 10px;
        font-weight: 700;
        color: #8899aa;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        padding-top: 6px;
        margin: 0;
    }
    .btn-export {
        border-color: #4a7;
        color: #6c9;
    }
    .btn-export:hover {
        border-color: #6fb;
        color: #8fe;
        background: rgba(80, 220, 140, 0.08);
    }
    .btn-import {
        border-color: #47a;
        color: #69c;
    }
    .btn-import:hover {
        border-color: #6af;
        color: #8cf;
        background: rgba(80, 140, 220, 0.08);
    }
    /* ── Future AI Strategies ── */
    .var-row.grayed {
        opacity: 0.35;
        pointer-events: none;
        border-style: dashed;
    }
    .future-desc {
        font-size: 8px;
        color: #667;
        padding: 0 6px 2px;
    }

    /* ── Tier Toggle ── */
    .tier-bar {
        display: flex;
        gap: 3px;
        padding: 4px 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .tier-pill {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 4px 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        background: transparent;
        color: #667;
        font-size: 9px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.15s;
    }
    .tier-pill:hover {
        border-color: var(--tier-color);
        color: var(--tier-color);
        background: color-mix(in srgb, var(--tier-color) 8%, transparent);
    }
    .tier-pill.active {
        border-color: var(--tier-color);
        color: var(--tier-color);
        background: color-mix(in srgb, var(--tier-color) 15%, transparent);
        box-shadow: 0 0 8px
            color-mix(in srgb, var(--tier-color) 20%, transparent);
    }
    .tier-icon {
        font-size: 11px;
    }
    .tier-label {
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* ── Theme Picker ── */
    .theme-bar {
        display: flex;
        gap: 4px;
        padding: 4px 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .theme-select {
        flex: 1;
        background: #1a1e2a;
        color: #ccc;
        border: 1px solid #334;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 10px;
        font-family: inherit;
        cursor: pointer;
    }
    .theme-select:focus {
        outline: 1px solid #4ade80;
        border-color: #4ade80;
    }
    .theme-btn {
        background: transparent;
        border: 1px solid #334;
        border-radius: 4px;
        color: #889;
        font-size: 12px;
        width: 28px;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .theme-btn:hover {
        border-color: #4ade80;
        color: #fff;
        background: rgba(74, 222, 128, 0.1);
    }
</style>
