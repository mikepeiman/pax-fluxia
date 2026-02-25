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
    import {
        COMBAT_VARIABLES,
        AI_VARIABLES,
        DENSITY_VARIABLES,
        LOG_CATEGORIES,
    } from "./settingsDefs";
    import {
        STORAGE_KEY,
        PANEL_STORAGE_KEY,
        VISUALS_STORAGE_KEY,
        ANIM_LOCK_STORAGE_KEY,
        TIER_STORAGE_KEY,
        loadCombatTuning,
        saveCombatTuning,
        VISUAL_DEFAULTS,
        loadVisuals,
        saveVisuals,
        applyVisuals,
        loadPanelSettings,
        savePanelSettings,
        applyPanelToConfig,
        syncPanelFromConfig,
        loadAnimLockRatios,
        saveAnimLockRatios,
        loadAnimLockModes,
        saveAnimLockModes,
        recalcAnimLocksOnTickChange,
        recalcAnimLocksOnAnimSpeedChange,
        loadTier,
        saveTier,
        exportConfigJSON as exportConfigJSONBase,
        type AnimLockMode,
    } from './panelSync';
    import {
        ANIM_SLIDERS,
        type AnimSliderDef,
        type SettingsTier,
        TIER_LABELS,
        MD_EXPORT_SECTIONS,
        formatAnimValue,
    } from './settingsDefs';

    // Aliases for the imported arrays (matches existing template references)
    const variables = COMBAT_VARIABLES;
    const aiVariables = AI_VARIABLES;
    const densityVariables = DENSITY_VARIABLES;
    const logCategories = LOG_CATEGORIES;

    // ── Combat tuning defaults (single source of truth for reset + disabled state)
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


    // Default values — single source of truth for reset + disabled toggle state

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

    const initialValues = loadCombatTuning(defaultValues);
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
        saveCombatTuning(values);
    }

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
        saveCombatTuning(values);
    }

    let logRefresh = $state(0);

    // ── Config Import/Export ──
    let configStatus = $state("");
    let configStatusColor = $state("#4ade80");


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
                const stored = loadCombatTuning(defaultValues);
                for (const k of Object.keys(stored)) {
                    if (
                        k in incoming &&
                        typeof incoming[k] === typeof (stored as any)[k]
                    ) {
                        (stored as any)[k] = incoming[k];
                    }
                }
                saveCombatTuning(stored);
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
    onMount(() => {
        GAME_CONFIG.CONNECTION_WIDTH = vis.laneWidth;
        GAME_CONFIG.CONNECTION_ALPHA = vis.laneAlpha;
        GAME_CONFIG.CONNECTION_SHADOW_WIDTH = vis.shadowWidth;
        GAME_CONFIG.CONNECTION_SHADOW_ALPHA = vis.shadowAlpha;
        applyPanelToConfig(panel);
        tickInterval = panel.tickInterval;
        activeGameStore.updateTickInterval(panel.tickInterval);
    });

    // Unified Panel Settings
    const PANEL_STORAGE_KEY = "pax-fluxia-panel-settings";


    // =========================================================================
    // Tick-Ratio Locking — bind animation durations proportionally to tick
    // =========================================================================
            /* ignore */
        }
    }

    /** 📌 Pin value exactly to tick duration (ms → BASE_TICK_MS, multipliers → 1.0) */
    function pinValueToTickDuration(key: string) {
        const currentMode = animLockModes[key];
        if (currentMode === "pinned") {
            // Unpin
            animLockModes[key] = null;
            animLockRatios[key] = null;
        } else {
            // Pin: ms values → BASE_TICK_MS, multipliers → 1.0
            const def = ANIM_SLIDERS.find((s) => s.key === key);
            const isMultiplier = def?.unit === "×tick" || def?.unit === "×";
            const pinnedValue = isMultiplier ? 1.0 : GAME_CONFIG.BASE_TICK_MS;
            const pinnedRatio = isMultiplier
                ? 1.0 / GAME_CONFIG.BASE_TICK_MS
                : 1;
            animLockModes[key] = "pinned";
            animLockRatios[key] = pinnedRatio;
            (GAME_CONFIG as any)[key] = pinnedValue;
            syncPanelKey(key, pinnedValue);
        }
        animLockModes = { ...animLockModes };
        animLockRatios = { ...animLockRatios };
        saveAnimLockRatios(animLockRatios);
        saveAnimLockModes(animLockModes);
    }

    /** 🔗 Lock current ratio relative to tick (value scales proportionally when tick changes) */
    function lockRatioToTick(key: string) {
        const currentMode = animLockModes[key];
        if (currentMode === "ratio") {
            // Unlock
            animLockModes[key] = null;
            animLockRatios[key] = null;
        } else {
            // Lock ratio: capture current value / tickDuration
            const currentVal = (GAME_CONFIG as any)[key] as number;
            const currentTick = GAME_CONFIG.BASE_TICK_MS;
            animLockModes[key] = "ratio";
            animLockRatios[key] = currentVal / currentTick;
        }
        animLockModes = { ...animLockModes };
        animLockRatios = { ...animLockRatios };
        saveAnimLockRatios(animLockRatios);
        saveAnimLockModes(animLockModes);
    }

    /** Recalculate all locked/pinned animation values when tick interval changes */
    function recalcAnimLocksOnTickChange(newTickMs: number) {
        for (const [key, mode] of Object.entries(animLockModes)) {
            if (mode === "pinned" || mode === "ratio") {
                const ratio = animLockRatios[key];
                if (ratio != null) {
                    const def = ANIM_SLIDERS.find((s) => s.key === key);
                    let newVal = ratio * newTickMs;
                    if (def && def.min != null && def.max != null) {
                        newVal = Math.max(def.min, Math.min(def.max, newVal));
                    }
                    newVal =
                        def?.unit === "ms"
                            ? Math.round(newVal)
                            : Math.round(newVal * 100) / 100;
                    (GAME_CONFIG as any)[key] = newVal;
                    syncPanelKey(key, newVal);
                }
            }
        }
    }

    /** 🎚️ Lock current ratio relative to animation speed (value scales when anim speed changes) */
    function lockRatioToAnimSpeed(key: string) {
        const currentMode = animLockModes[key];
        if (currentMode === "animSpeed") {
            // Unlock
            animLockModes[key] = null;
            animLockRatios[key] = null;
        } else {
            const currentVal = (GAME_CONFIG as any)[key] as number;
            const animSpeed = animationStore.speedMs;
            animLockModes[key] = "animSpeed";
            animLockRatios[key] = currentVal / animSpeed;
        }
        animLockModes = { ...animLockModes };
        animLockRatios = { ...animLockRatios };
        saveAnimLockRatios(animLockRatios);
        saveAnimLockModes(animLockModes);
    }

    /** Recalculate animSpeed-locked values when animation speed changes */
    function recalcAnimLocksOnAnimSpeedChange(newAnimMs: number) {
        for (const [key, mode] of Object.entries(animLockModes)) {
            if (mode === "animSpeed") {
                const ratio = animLockRatios[key];
                if (ratio != null) {
                    const def = ANIM_SLIDERS.find((s) => s.key === key);
                    let newVal = ratio * newAnimMs;
                    if (def && def.min != null && def.max != null) {
                        newVal = Math.max(def.min, Math.min(def.max, newVal));
                    }
                    newVal =
                        def?.unit === "ms"
                            ? Math.round(newVal)
                            : Math.round(newVal * 100) / 100;
                    (GAME_CONFIG as any)[key] = newVal;
                    syncPanelKey(key, newVal);
                }
            }
        }
    }

    // Map GAME_CONFIG keys to panel keys (many already exist)
    function animSliderToPanelKey(configKey: string): string | null {
        const map: Record<string, string> = {
            SETTLE_DURATION_MS: "settleDuration",
            ARRIVAL_SPREAD: "arrivalSpread",
            TRAVEL_DURATION_MULT: "travelDurationMult",
            DEPART_JITTER_MS: "departJitter",
            ATTACK_SURGE_RAMP_MS: "attackSurgeRampMs",
            CONQUEST_TRAVEL_SPEED: "conquestTravelSpeed",
            CONQUEST_LERP_DELAY_MS: "conquestLerpDelayMs",
            CONQUEST_COLOR_DELAY_MS: "conquestColorDelayMs",
            CONQUEST_FLASH_DURATION_MS: "conquestFlashDurationMs",
            ARROW_SPEED: "arrowSpeed",
        };
        return map[configKey] ?? null;
    }

    // Reactive mirror of animation slider values — GAME_CONFIG is not $state,
    // so we maintain a reactive copy that triggers Svelte 5 re-renders.
    function initAnimValues(): Record<string, number> {
        const vals: Record<string, number> = {};
        for (const s of ANIM_SLIDERS) {
            vals[s.key] = (GAME_CONFIG as any)[s.key] as number;
        }
        return vals;
    }
    let animValues = $state<Record<string, number>>(initAnimValues());

    function getAnimValue(key: string): number {
        return animValues[key] ?? ((GAME_CONFIG as any)[key] as number);
    }

    function syncPanelKey(configKey: string, val: number) {
        const panelKey = animSliderToPanelKey(configKey);
        if (panelKey && panelKey in panel) {
            panel = { ...panel, [panelKey]: val };
            savePanelSettings(panel);
        }
        // Always update reactive mirror
        animValues = { ...animValues, [configKey]: val };
    }

    function setAnimValue(key: string, val: number) {
        (GAME_CONFIG as any)[key] = val;
        syncPanelKey(key, val);
    }

    function formatAnimValue(val: number, unit: string): string {
        if (unit === "ms") return `${Math.round(val)}${unit}`;
        return `${val.toFixed(2)}${unit}`;
    }

    function resetToDefaults() {
        panel = { ...panelDefaults };
        applyPanelToConfig(panel);
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
        saveCombatTuning(values);
        // Reset timing
        tickInterval = 1200;
        activeGameStore.updateTickInterval(1200);
        animationStore.setAnimationSpeed(1200);
    }

    // =========================================================================

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
        syncAllFromConfig();
        configStatus = `✅ Theme "${name}" applied`;
        configStatusColor = "#4ade80";
    }

    /** After applyTheme writes to GAME_CONFIG, sync all reactive layers back */
    function syncAllFromConfig() {
        // 1. Sync panel (all fields read back from GAME_CONFIG)
        panel = {
            ...panel,
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
            arrowTaper: GAME_CONFIG.ARROW_TAPER,
            arrowWidth: GAME_CONFIG.ARROW_WIDTH,
            arrowSpeed: GAME_CONFIG.ARROW_SPEED,
            arrowEasing: GAME_CONFIG.ARROW_EASING,
            arrowEngulfMode: GAME_CONFIG.ARROW_ENGULF_MODE,
            arrowEngulfRadius: GAME_CONFIG.ARROW_ENGULF_RADIUS,
            arrowSpiralMinDeg: GAME_CONFIG.ARROW_SPIRAL_MIN_DEG,
            arrowSpiralMaxDeg: GAME_CONFIG.ARROW_SPIRAL_MAX_DEG,
            arrowSpiralRandom: GAME_CONFIG.ARROW_SPIRAL_RANDOM,
            arrowSpiralDurationMs: GAME_CONFIG.ARROW_SPIRAL_DURATION_MS,
            arrowStaggerMs: GAME_CONFIG.ARROW_STAGGER_MS,
            arrowStaggerAuto: GAME_CONFIG.ARROW_STAGGER_AUTO,
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
            shipGlowRadius: GAME_CONFIG.SHIP_GLOW_RADIUS,
            minColorLightness: GAME_CONFIG.MIN_COLOR_LIGHTNESS,
            shipScaleMult: GAME_CONFIG.SHIP_SCALE_MULT,
            maxVisualShips: GAME_CONFIG.MAX_VISUAL_SHIPS,
            showStarPower: GAME_CONFIG.SHOW_STAR_POWER,
            starPowerAlpha: GAME_CONFIG.STAR_POWER_ALPHA,
            starPowerRadiusMult: GAME_CONFIG.STAR_POWER_RADIUS_MULT,
            starPowerLayers: GAME_CONFIG.STAR_POWER_LAYERS,
            starPowerBlur: GAME_CONFIG.STAR_POWER_BLUR,
            haloFleetScale: GAME_CONFIG.HALO_FLEET_SCALE,
            haloFleetIntensity: GAME_CONFIG.HALO_FLEET_INTENSITY,
            haloFleetMode: GAME_CONFIG.HALO_FLEET_MODE,
            haloFleetStepSize: GAME_CONFIG.HALO_FLEET_STEP_SIZE,
            haloFleetMaxShips: GAME_CONFIG.HALO_FLEET_MAX_SHIPS,
            showVoronoi: GAME_CONFIG.SHOW_VORONOI,
            voronoiAlpha: GAME_CONFIG.VORONOI_ALPHA,
            voronoiResolution: GAME_CONFIG.VORONOI_RESOLUTION,
            voronoiEdgeBlend: GAME_CONFIG.VORONOI_EDGE_BLEND,
            voronoiBorderWidth: GAME_CONFIG.VORONOI_BORDER_WIDTH,
            voronoiBorderAlpha: GAME_CONFIG.VORONOI_BORDER_ALPHA,
            voronoiBorderBrighten: GAME_CONFIG.VORONOI_BORDER_BRIGHTEN,
            voronoiSaturation: GAME_CONFIG.VORONOI_SATURATION,
            voronoiLightness: GAME_CONFIG.VORONOI_LIGHTNESS,
            voronoiGlowRadius: GAME_CONFIG.VORONOI_GLOW_RADIUS,
            voronoiGlowAlpha: GAME_CONFIG.VORONOI_GLOW_ALPHA,
            voronoiGlowLayers: GAME_CONFIG.VORONOI_GLOW_LAYERS,
            voronoiBlur: GAME_CONFIG.VORONOI_BLUR,
            voronoiSmoothing: GAME_CONFIG.VORONOI_SMOOTHING,
            voronoiGradientBlend: GAME_CONFIG.VORONOI_GRADIENT_BLEND,
            voronoiBlendWidth: GAME_CONFIG.VORONOI_BLEND_WIDTH,
            bindAnimToTick: GAME_CONFIG.BIND_ANIMATION_TO_TICK,
        };
        savePanelSettings(panel);

        // 2. Sync vis (connection visuals)
        vis = {
            ...vis,
            laneWidth: GAME_CONFIG.CONNECTION_WIDTH,
            laneAlpha: GAME_CONFIG.CONNECTION_ALPHA,
            shadowWidth: GAME_CONFIG.CONNECTION_SHADOW_WIDTH,
            shadowAlpha: GAME_CONFIG.CONNECTION_SHADOW_ALPHA,
        };
        saveVisuals(vis);

        // 3. Sync values (combat tuning state)
        const freshValues = { ...values };
        for (const k of Object.keys(freshValues)) {
            if (k in GAME_CONFIG) {
                (freshValues as any)[k] = (GAME_CONFIG as any)[k];
            }
        }
        values = freshValues;
        saveCombatTuning(values);

        // 4. Sync tick interval display
        tickInterval = GAME_CONFIG.BASE_TICK_MS;
        activeGameStore.updateTickInterval(GAME_CONFIG.BASE_TICK_MS);
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
        | "rules"
        | "battle"
        | "economy"
        | "ai"
        | "travel"
        | "surge"
        | "conquest"
        | "ships"
        | "visuals"
        | "logging";

    const ACTIVE_SECTION_KEY = "pax-fluxia-open-sections";
    function loadOpenSections(): Set<SectionId> {
        if (typeof window === "undefined") return new Set();
        try {
            const s = localStorage.getItem(ACTIVE_SECTION_KEY);
            if (s) {
                const arr = JSON.parse(s) as SectionId[];
                return new Set(arr);
            }
        } catch {
            /* ignore */
        }
        return new Set();
    }

    let openSections = $state<Set<SectionId>>(loadOpenSections());

    function toggleSection(id: SectionId) {
        const next = new Set(openSections);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        openSections = next;
        if (typeof window !== "undefined") {
            localStorage.setItem(
                ACTIVE_SECTION_KEY,
                JSON.stringify([...openSections]),
            );
        }
    }

    function isSectionOpen(id: SectionId): boolean {
        return openSections.has(id);
    }

    // Backwards compat: activeSection as derived for places that still read it
    let activeSection = $derived<SectionId | null>(
        openSections.size > 0 ? [...openSections][openSections.size - 1] : null,
    );

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
            id: "rules",
            icon: "📜",
            label: "Rules",
            color: "#88ddff",
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
    <div class="icon-toolbar" class:has-active={openSections.size > 0}>
        {#each visibleSections as s}
            <button
                class="icon-btn"
                class:active={openSections.has(s.id)}
                style="--accent: {s.color}"
                onclick={() => toggleSection(s.id)}
                title={s.label}
            >
                <span class="icon-emoji">{s.icon}</span>
                {#if openSections.size === 0}
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
            {#if openSections.size === 0}
                <span class="icon-label">Reset</span>
            {/if}
        </button>
    </div>

    <!-- Stacked Section Panels -->
    {#each visibleSections.filter( (s) => openSections.has(s.id), ) as sec (sec.id)}
        <div class="section-panel" style="--accent: {sec.color}">
            <button class="section-head" onclick={() => toggleSection(sec.id)}>
                <span class="head-icon">{sec.icon}</span>
                <span class="head-label">{sec.label}</span>
                <span class="head-close">✕</span>
            </button>

            <div class="section-body">
                <!-- ⚡ TIMING -->
                {#if sec.id === "speed"}
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
                                Object.assign(animValues, recalcAnimLocksOnTickChange(v, animLockModes, animLockRatios, ANIM_SLIDERS));
                                // Auto-sync animation speed when bound
                                if (panel.bindAnimToTick) {
                                    animationStore.setAnimationSpeed(v);
                                    GAME_CONFIG.ANIMATION_SPEED_MS = v;
                                    updatePanel("animSpeed", v);
                                }
                            }}
                        />
                    </div>
                    <!-- Bind Animation to Tick Toggle -->
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Bind Anim → Tick</span>
                            <label class="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={panel.bindAnimToTick}
                                    onchange={(e) => {
                                        const v = (e.target as HTMLInputElement)
                                            .checked;
                                        GAME_CONFIG.BIND_ANIMATION_TO_TICK = v;
                                        updatePanel("bindAnimToTick", v);
                                        if (v) {
                                            // Immediately sync animation speed to current tick interval
                                            const tick =
                                                GAME_CONFIG.BASE_TICK_MS;
                                            animationStore.setAnimationSpeed(
                                                tick,
                                            );
                                            GAME_CONFIG.ANIMATION_SPEED_MS =
                                                tick;
                                            updatePanel("animSpeed", tick);
                                        }
                                    }}
                                />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
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
                            disabled={panel.bindAnimToTick as boolean}
                            oninput={(e) => {
                                const v = parseInt(
                                    (e.target as HTMLInputElement).value,
                                );
                                animationStore.setAnimationSpeed(v);
                                updatePanel("animSpeed", v);
                                recalcAnimLocksOnAnimSpeedChange(v);
                            }}
                        />
                    </div>

                    <!-- Animation Duration Sliders with Tick-Lock -->
                    {#each ANIM_SLIDERS as slider, i}
                        {#if i === 0 || ANIM_SLIDERS[i - 1].group !== slider.group}
                            <div
                                class="var-row grayed"
                                style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
                            >
                                🎬 {slider.group}
                            </div>
                        {/if}
                        {#if slider.type === "toggle"}
                            <label class="toggle-row">
                                <input
                                    type="checkbox"
                                    checked={(GAME_CONFIG as any)[slider.key]}
                                    onchange={() => {
                                        (GAME_CONFIG as any)[slider.key] = !(
                                            GAME_CONFIG as any
                                        )[slider.key];
                                    }}
                                />
                                <span class="var-name">{slider.label}</span>
                            </label>
                            {#if slider.desc}
                                <div
                                    class="var-row grayed"
                                    style="font-size: 9px; padding: 0 4px 4px; margin-top: -6px; opacity: 0.6;"
                                >
                                    {slider.desc}
                                </div>
                            {/if}
                        {:else}
                            <div
                                class="var-row"
                                class:locked={animLockModes[slider.key] != null}
                            >
                                <div class="row-top">
                                    <span class="var-name">{slider.label}</span>
                                    <span class="val-group">
                                        <span class="val"
                                            >{formatAnimValue(
                                                getAnimValue(slider.key),
                                                slider.unit ?? "",
                                            )}</span
                                        >
                                        <button
                                            class="lock-btn"
                                            class:active={animLockModes[
                                                slider.key
                                            ] === "pinned"}
                                            title={animLockModes[slider.key] ===
                                            "pinned"
                                                ? "Pinned to tick duration — click to unpin"
                                                : "Pin value = tick duration"}
                                            onclick={() =>
                                                pinValueToTickDuration(
                                                    slider.key,
                                                )}>🕐</button
                                        >
                                        <button
                                            class="lock-btn"
                                            class:active={animLockModes[
                                                slider.key
                                            ] === "ratio"}
                                            title={animLockModes[slider.key] ===
                                            "ratio"
                                                ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}×tick — click to unlock`
                                                : "Lock current ratio to tick"}
                                            onclick={() =>
                                                lockRatioToTick(slider.key)}
                                            >◆</button
                                        >
                                        <button
                                            class="lock-btn"
                                            class:active={animLockModes[
                                                slider.key
                                            ] === "animSpeed"}
                                            title={animLockModes[slider.key] ===
                                            "animSpeed"
                                                ? `Locked at ${(animLockRatios[slider.key] ?? 0).toFixed(3)}×anim — click to unlock`
                                                : "Lock current ratio to animation speed"}
                                            onclick={() =>
                                                lockRatioToAnimSpeed(
                                                    slider.key,
                                                )}>⚡</button
                                        >
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={slider.min}
                                    max={slider.max}
                                    step={slider.step}
                                    value={getAnimValue(slider.key)}
                                    disabled={animLockModes[slider.key] != null}
                                    oninput={(e) => {
                                        const v = parseFloat(
                                            (e.target as HTMLInputElement)
                                                .value,
                                        );
                                        setAnimValue(slider.key, v);
                                    }}
                                />
                            </div>
                        {/if}
                    {/each}

                    <!-- ⚔️ BATTLE -->
                {:else if sec.id === "battle"}
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
                {:else if sec.id === "economy"}
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
                {:else if sec.id === "ai"}
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
                {:else if sec.id === "travel"}
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
                {:else if sec.id === "surge"}
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
                {:else if sec.id === "conquest"}
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
                                    .value as
                                    | "immediate"
                                    | "surge"
                                    | "travel"
                                    | "arrowhead";
                                GAME_CONFIG.CONQUEST_ANIMATION_MODE = v;
                                updatePanel("conquestAnimMode", v);
                            }}
                        >
                            <option value="immediate">Immediate</option>
                            <option value="surge">Surge</option>
                            <option value="travel">Travel</option>
                            <option value="arrowhead">Arrowhead</option>
                        </select>
                    </div>

                    {#if panel.conquestAnimMode === "arrowhead"}
                        <h4 class="sub-heading">Arrowhead Formation</h4>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Taper</span><span
                                    class="val"
                                    >{(panel.arrowTaper as number).toFixed(
                                        2,
                                    )}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={panel.arrowTaper}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.ARROW_TAPER = v;
                                    updatePanel("arrowTaper", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Width</span><span
                                    class="val"
                                    >{panel.arrowWidth === 0
                                        ? "auto"
                                        : `${panel.arrowWidth}px`}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                step="5"
                                value={panel.arrowWidth}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.ARROW_WIDTH = v;
                                    updatePanel("arrowWidth", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Speed</span><span
                                    class="val"
                                    >{(panel.arrowSpeed as number).toFixed(
                                        2,
                                    )}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="3"
                                step="0.1"
                                value={panel.arrowSpeed}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.ARROW_SPEED = v;
                                    updatePanel("arrowSpeed", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Easing</span><span
                                    class="val">{panel.arrowEasing}</span
                                >
                            </div>
                            <select
                                class="mode-select"
                                value={panel.arrowEasing}
                                onchange={(e) => {
                                    const v = (e.target as HTMLSelectElement)
                                        .value as
                                        | "easeIn"
                                        | "easeInOut"
                                        | "linear";
                                    GAME_CONFIG.ARROW_EASING = v;
                                    updatePanel("arrowEasing", v);
                                }}
                            >
                                <option value="easeIn"
                                    >Ease In (accelerate)</option
                                >
                                <option value="easeInOut">Ease In/Out</option>
                                <option value="linear">Linear</option>
                            </select>
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Tick-Bound</span>
                                <label class="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={panel.arrowStaggerAuto}
                                        onchange={(e) => {
                                            const v = (
                                                e.target as HTMLInputElement
                                            ).checked;
                                            GAME_CONFIG.ARROW_STAGGER_AUTO = v;
                                            updatePanel("arrowStaggerAuto", v);
                                        }}
                                    />
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Stagger</span><span
                                    class="val"
                                    >{panel.arrowStaggerAuto
                                        ? "auto"
                                        : `${panel.arrowStaggerMs}ms`}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={panel.arrowStaggerMs}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.ARROW_STAGGER_MS = v;
                                    updatePanel("arrowStaggerMs", v);
                                }}
                            />
                        </div>
                    {/if}

                    <h4 class="sub-heading">Engulf</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Engulf Mode</span><span
                                class="val">{panel.arrowEngulfMode}</span
                            >
                        </div>
                        <select
                            class="mode-select"
                            value={panel.arrowEngulfMode}
                            onchange={(e) => {
                                const v = (e.target as HTMLSelectElement)
                                    .value as
                                    | "fan"
                                    | "collapse"
                                    | "ring"
                                    | "swarm";
                                GAME_CONFIG.ARROW_ENGULF_MODE = v;
                                updatePanel("arrowEngulfMode", v);
                            }}
                        >
                            <option value="fan">Fan (surround)</option>
                            <option value="collapse">Collapse (pile on)</option>
                            <option value="ring">Ring (encircle)</option>
                            <option value="swarm">Swarm (scatter)</option>
                        </select>
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Engulf Radius</span><span
                                class="val">{panel.arrowEngulfRadius}px</span
                            >
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="200"
                            step="5"
                            value={panel.arrowEngulfRadius}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ARROW_ENGULF_RADIUS = v;
                                updatePanel("arrowEngulfRadius", v);
                            }}
                        />
                    </div>

                    <h4 class="sub-heading">Spiral Settle</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Min Degrees</span><span
                                class="val">{panel.arrowSpiralMinDeg}°</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1080"
                            step="30"
                            value={panel.arrowSpiralMinDeg}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ARROW_SPIRAL_MIN_DEG = v;
                                updatePanel("arrowSpiralMinDeg", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Max Degrees</span><span
                                class="val">{panel.arrowSpiralMaxDeg}°</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1080"
                            step="30"
                            value={panel.arrowSpiralMaxDeg}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ARROW_SPIRAL_MAX_DEG = v;
                                updatePanel("arrowSpiralMaxDeg", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Random Spiral</span><span
                                class="val"
                                >{panel.arrowSpiralRandom ? "On" : "Off"}</span
                            >
                        </div>
                        <input
                            type="checkbox"
                            checked={panel.arrowSpiralRandom as boolean}
                            onchange={(e) => {
                                const v = (e.target as HTMLInputElement)
                                    .checked;
                                GAME_CONFIG.ARROW_SPIRAL_RANDOM = v;
                                updatePanel("arrowSpiralRandom", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Spiral Duration</span><span
                                class="val"
                                >{panel.arrowSpiralDurationMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="3000"
                            step="50"
                            value={panel.arrowSpiralDurationMs}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.ARROW_SPIRAL_DURATION_MS = v;
                                updatePanel("arrowSpiralDurationMs", v);
                            }}
                        />
                    </div>

                    <!-- ── Conquest Timing ── -->
                    <h4 class="sub-heading">Timing</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Color Delay</span><span
                                class="val">{panel.conquestColorDelayMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5000"
                            step="10"
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
                            max="5000"
                            step="10"
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
                            <span class="var-name">Lerp Delay</span><span
                                class="val">{panel.conquestLerpDelayMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5000"
                            step="10"
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
                            <span class="var-name">Travel Speed</span><span
                                class="val"
                                >{(panel.conquestTravelSpeed as number).toFixed(
                                    2,
                                )}×</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0.01"
                            max="2"
                            step="0.01"
                            value={panel.conquestTravelSpeed}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.CONQUEST_TRAVEL_SPEED = v;
                                updatePanel("conquestTravelSpeed", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Settle Duration</span><span
                                class="val">{panel.conquestSettleMs}ms</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5000"
                            step="10"
                            value={panel.conquestSettleMs}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.CONQUEST_SETTLE_MS = v;
                                updatePanel("conquestSettleMs", v);
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

                    <!-- 🎨 SHIP APPEARANCE -->
                {:else if sec.id === "ships"}
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
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Glow Radius</span><span
                                class="val"
                                >{(panel.shipGlowRadius as number).toFixed(
                                    1,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="15"
                            step="0.5"
                            value={panel.shipGlowRadius}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.SHIP_GLOW_RADIUS = v;
                                updatePanel("shipGlowRadius", v);
                            }}
                        />
                    </div>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Min Contrast</span><span
                                class="val"
                                >{(panel.minColorLightness as number).toFixed(
                                    2,
                                )}</span
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="0.6"
                            step="0.01"
                            value={panel.minColorLightness}
                            oninput={(e) => {
                                const v = +(e.target as HTMLInputElement).value;
                                GAME_CONFIG.MIN_COLOR_LIGHTNESS = v;
                                updatePanel("minColorLightness", v);
                            }}
                        />
                    </div>

                    <!-- ── Star Halos (F-47) ── -->
                    <h4 class="sub-heading">Star Halos</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Show Halos</span>
                            <label class="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={panel.showStarPower}
                                    onchange={(e) => {
                                        const v = (e.target as HTMLInputElement)
                                            .checked;
                                        GAME_CONFIG.SHOW_STAR_POWER = v;
                                        updatePanel("showStarPower", v);
                                    }}
                                />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    {#if panel.showStarPower}
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Halo Alpha</span><span
                                    class="val"
                                    >{(panel.starPowerAlpha as number).toFixed(
                                        2,
                                    )}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="0.3"
                                step="0.005"
                                value={panel.starPowerAlpha}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.STAR_POWER_ALPHA = v;
                                    updatePanel("starPowerAlpha", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Halo Radius</span><span
                                    class="val"
                                    >{(
                                        panel.starPowerRadiusMult as number
                                    ).toFixed(1)}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="8"
                                step="0.5"
                                value={panel.starPowerRadiusMult}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.STAR_POWER_RADIUS_MULT = v;
                                    updatePanel("starPowerRadiusMult", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Halo Layers</span><span
                                    class="val">{panel.starPowerLayers}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="12"
                                step="1"
                                value={panel.starPowerLayers}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.STAR_POWER_LAYERS = v;
                                    updatePanel("starPowerLayers", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Halo Blur</span><span
                                    class="val"
                                    >{(panel.starPowerBlur as number).toFixed(
                                        0,
                                    )}px</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="20"
                                step="1"
                                value={panel.starPowerBlur}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.STAR_POWER_BLUR = v;
                                    updatePanel("starPowerBlur", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Fleet Glow</span>
                                <label class="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={panel.haloFleetScale}
                                        onchange={(e) => {
                                            const v = (
                                                e.target as HTMLInputElement
                                            ).checked;
                                            GAME_CONFIG.HALO_FLEET_SCALE = v;
                                            updatePanel("haloFleetScale", v);
                                        }}
                                    />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        {#if panel.haloFleetScale}
                            <div class="var-row">
                                <div class="row-top">
                                    <span class="var-name">Fleet Intensity</span
                                    ><span class="val"
                                        >{(
                                            panel.haloFleetIntensity as number
                                        ).toFixed(1)}×</span
                                    >
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={panel.haloFleetIntensity}
                                    oninput={(e) => {
                                        const v = +(
                                            e.target as HTMLInputElement
                                        ).value;
                                        GAME_CONFIG.HALO_FLEET_INTENSITY = v;
                                        updatePanel("haloFleetIntensity", v);
                                    }}
                                />
                            </div>
                            <div class="var-row">
                                <div class="row-top">
                                    <span class="var-name">Fleet Mode</span>
                                    <div style="display: flex; gap: 4px;">
                                        <button
                                            class="mode-btn"
                                            class:active={panel.haloFleetMode ===
                                                "stepped"}
                                            onclick={() => {
                                                GAME_CONFIG.HALO_FLEET_MODE =
                                                    "stepped";
                                                updatePanel(
                                                    "haloFleetMode",
                                                    "stepped",
                                                );
                                            }}>Stepped</button
                                        >
                                        <button
                                            class="mode-btn"
                                            class:active={panel.haloFleetMode ===
                                                "linear"}
                                            onclick={() => {
                                                GAME_CONFIG.HALO_FLEET_MODE =
                                                    "linear";
                                                updatePanel(
                                                    "haloFleetMode",
                                                    "linear",
                                                );
                                            }}>Linear</button
                                        >
                                    </div>
                                </div>
                            </div>
                            {#if panel.haloFleetMode === "stepped"}
                                <div class="var-row">
                                    <div class="row-top">
                                        <span class="var-name">Step Size</span
                                        ><span class="val"
                                            >{panel.haloFleetStepSize} ships</span
                                        >
                                    </div>
                                    <input
                                        type="range"
                                        min="100"
                                        max="2000"
                                        step="100"
                                        value={panel.haloFleetStepSize}
                                        oninput={(e) => {
                                            const v = +(
                                                e.target as HTMLInputElement
                                            ).value;
                                            GAME_CONFIG.HALO_FLEET_STEP_SIZE =
                                                v;
                                            updatePanel("haloFleetStepSize", v);
                                        }}
                                    />
                                </div>
                            {/if}
                            {#if panel.haloFleetMode === "linear"}
                                <div class="var-row">
                                    <div class="row-top">
                                        <span class="var-name">Max Ships</span
                                        ><span class="val"
                                            >{panel.haloFleetMaxShips}</span
                                        >
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="5000"
                                        step="50"
                                        value={panel.haloFleetMaxShips}
                                        oninput={(e) => {
                                            const v = +(
                                                e.target as HTMLInputElement
                                            ).value;
                                            GAME_CONFIG.HALO_FLEET_MAX_SHIPS =
                                                v;
                                            updatePanel("haloFleetMaxShips", v);
                                        }}
                                    />
                                </div>
                            {/if}
                        {/if}
                    {/if}

                    <!-- ── Voronoi Territory ── -->
                    <h4 class="sub-heading">Voronoi Territory</h4>
                    <div class="var-row">
                        <div class="row-top">
                            <span class="var-name">Show Voronoi</span>
                            <label class="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={panel.showVoronoi}
                                    onchange={(e) => {
                                        const v = (e.target as HTMLInputElement)
                                            .checked;
                                        GAME_CONFIG.SHOW_VORONOI = v;
                                        updatePanel("showVoronoi", v);
                                    }}
                                />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    {#if panel.showVoronoi}
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Voronoi Alpha</span><span
                                    class="val"
                                    >{(panel.voronoiAlpha as number).toFixed(
                                        2,
                                    )}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0.02"
                                max="0.4"
                                step="0.01"
                                value={panel.voronoiAlpha}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.VORONOI_ALPHA = v;
                                    updatePanel("voronoiAlpha", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Edge Blur</span><span
                                    class="val"
                                    >{(panel.voronoiBlur as number).toFixed(
                                        0,
                                    )}px</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="30"
                                step="1"
                                value={panel.voronoiBlur}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.VORONOI_BLUR = v;
                                    updatePanel("voronoiBlur", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Smoothing</span><span
                                    class="val">{panel.voronoiSmoothing}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                step="1"
                                value={panel.voronoiSmoothing}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.VORONOI_SMOOTHING = v;
                                    updatePanel("voronoiSmoothing", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Gradient Blend</span>
                                <label class="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={panel.voronoiGradientBlend}
                                        onchange={(e) => {
                                            const v = (
                                                e.target as HTMLInputElement
                                            ).checked;
                                            GAME_CONFIG.VORONOI_GRADIENT_BLEND =
                                                v;
                                            updatePanel(
                                                "voronoiGradientBlend",
                                                v,
                                            );
                                        }}
                                    />
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Blend Width</span><span
                                    class="val"
                                    >{panel.voronoiBlendWidth}px</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="80"
                                step="5"
                                value={panel.voronoiBlendWidth}
                                disabled={!panel.voronoiGradientBlend}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.VORONOI_BLEND_WIDTH = v;
                                    updatePanel("voronoiBlendWidth", v);
                                }}
                            />
                        </div>
                        <!-- Territory Borders -->
                        <div
                            class="var-row grayed"
                            style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
                        >
                            🔲 Borders
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Border Width</span><span
                                    class="val"
                                    >{panel.voronoiBorderWidth}px</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="8"
                                step="0.5"
                                value={panel.voronoiBorderWidth}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.VORONOI_BORDER_WIDTH = v;
                                    updatePanel("voronoiBorderWidth", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Border Alpha</span><span
                                    class="val"
                                    >{(
                                        panel.voronoiBorderAlpha as number
                                    ).toFixed(2)}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={panel.voronoiBorderAlpha}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.VORONOI_BORDER_ALPHA = v;
                                    updatePanel("voronoiBorderAlpha", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Border Brighten</span
                                ><span class="val"
                                    >{panel.voronoiBorderBrighten}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="255"
                                step="5"
                                value={panel.voronoiBorderBrighten}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.VORONOI_BORDER_BRIGHTEN = v;
                                    updatePanel("voronoiBorderBrighten", v);
                                }}
                            />
                        </div>
                        <!-- Color -->
                        <div
                            class="var-row grayed"
                            style="font-size: 10px; padding: 4px 4px 2px; margin-top: 6px; opacity: 0.7;"
                        >
                            🎨 Color
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Saturation</span><span
                                    class="val"
                                    >{(
                                        panel.voronoiSaturation as number
                                    ).toFixed(2)}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.05"
                                value={panel.voronoiSaturation}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.VORONOI_SATURATION = v;
                                    updatePanel("voronoiSaturation", v);
                                }}
                            />
                        </div>
                        <div class="var-row">
                            <div class="row-top">
                                <span class="var-name">Lightness</span><span
                                    class="val"
                                    >{(
                                        panel.voronoiLightness as number
                                    ).toFixed(2)}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.05"
                                value={panel.voronoiLightness}
                                oninput={(e) => {
                                    const v = +(e.target as HTMLInputElement)
                                        .value;
                                    GAME_CONFIG.VORONOI_LIGHTNESS = v;
                                    updatePanel("voronoiLightness", v);
                                }}
                            />
                        </div>
                    {/if}

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
                {:else if sec.id === "visuals"}
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
                    <label class="toggle-row"
                        ><input
                            type="checkbox"
                            checked={GAME_CONFIG.SHOW_SELECTION_HEX}
                            onchange={(e) => {
                                GAME_CONFIG.SHOW_SELECTION_HEX = (
                                    e.target as HTMLInputElement
                                ).checked;
                            }}
                        />
                        <span class="var-name">⬡ Selection Hex</span><span
                            class="val"
                            style="font-size:9px;opacity:0.6"
                            >Hex border on active star</span
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

                    <!-- 📜 RULES -->
                {:else if sec.id === "rules"}
                    <label class="toggle-row">
                        <input
                            type="checkbox"
                            checked={GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST}
                            onchange={() => {
                                GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST =
                                    !GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST;
                            }}
                        />
                        <span class="var-name"
                            >Retain orders after conquest</span
                        >
                    </label>
                    <div
                        class="var-row grayed"
                        style="font-size: 9px; padding: 0 4px 4px; margin-top: -6px; opacity: 0.6;"
                    >
                        Attack orders become movement orders when target is
                        captured
                    </div>
                    <label class="toggle-row">
                        <input
                            type="checkbox"
                            checked={GAME_CONFIG.ALLOW_OPPOSING_ORDERS}
                            onchange={() => {
                                GAME_CONFIG.ALLOW_OPPOSING_ORDERS =
                                    !GAME_CONFIG.ALLOW_OPPOSING_ORDERS;
                            }}
                        />
                        <span class="var-name">Allow opposing orders</span>
                    </label>
                    <div
                        class="var-row grayed"
                        style="font-size: 9px; padding: 0 4px 4px; margin-top: -6px; opacity: 0.6;"
                    >
                        A→B and B→A movement orders can coexist (default: off =
                        opposing cancels)
                    </div>

                    <!-- 📋 LOGGING -->
                {:else if sec.id === "logging"}
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
                            onclick={() => exportConfigJSONBase(); configStatus = ` Exported ${Object.keys(GAME_CONFIG).length} settings`; configStatusColor = "#4ade80"}
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
    {/each}
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
        font-size: 10px;
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
        font-size: 13px;
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
        gap: 5px;
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
        padding: 4px 8px;
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
        font-size: 12px;
        font-weight: 600;
        color: #eee;
    }
    .val {
        font-family: "Exo", sans-serif;
        font-size: 12px;
        color: var(--accent, #00e0ff);
    }
    .toggle-label {
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: #eee;
    }
    input[type="range"] {
        width: 100%;
        accent-color: var(--accent, #00e0ff);
        height: 6px;
        background: #334;
        border-radius: 3px;
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
        color: var(--accent, #aabbcc);
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
    /* Lock buttons for tick-ratio locking */
    .val-group {
        display: flex;
        align-items: center;
        gap: 3px;
    }
    .lock-btn {
        background: none;
        border: 1px solid rgba(100, 120, 160, 0.2);
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        padding: 1px 4px;
        line-height: 1.2;
        opacity: 0.5;
        transition:
            opacity 0.15s,
            background 0.15s;
    }
    .lock-btn:hover {
        opacity: 0.8;
        background: rgba(100, 120, 160, 0.15);
    }
    .lock-btn.active {
        opacity: 1;
        background: rgba(80, 180, 255, 0.2);
        border-color: rgba(80, 180, 255, 0.5);
    }
    .var-row.locked input[type="range"] {
        opacity: 0.35;
        pointer-events: none;
    }
    .var-row.locked .var-name {
        color: rgba(120, 180, 255, 0.9);
    }
    .toggle-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 4px;
        cursor: pointer;
        font-size: 12px;
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
        color: #aabbcc;
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
        font-size: 10px;
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

