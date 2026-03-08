<script lang="ts">
    import { onMount } from "svelte";
    import { DEFAULT_GAME_CONFIG, GAME_CONFIG } from "$lib/config/game.config";
    import { type GameTheme } from "$lib/config/themes";
    import {
        registerCategoryPresetApplyCallback,
        type CategoryPreset,
    } from "$lib/config/categoryThemes";
    import { themeStore } from "$lib/stores/themeStore.svelte";
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
    import { nudgeSliders } from "./settings/nudgeSliders";
    import { setSetting, setSettingsFromConfigPatch, syncPanelFromConfigPatch } from "./settingsState";
    import {
        STORAGE_KEY,
        PANEL_STORAGE_KEY,
        VISUALS_STORAGE_KEY,
        ANIM_LOCK_STORAGE_KEY,
        TIER_STORAGE_KEY,
        loadCombatTuning,
        saveCombatTuning,
        loadVisuals,
        saveVisuals,
        applyVisuals,
        loadPanelSettings,
        panelDefaultsFromConfig,
        savePanelSettings,
        loadAnimLockRatios,
        saveAnimLockRatios,
        loadAnimLockModes,
        saveAnimLockModes,
        loadTier,
        saveTier,
        type AnimLockMode,
    } from "./panelSync";
    import ControlsSectionTiming from "./settings/ControlsSection-Timing.svelte";
    import ControlsSectionBattle from "./settings/ControlsSection-Battle.svelte";
    import ControlsSectionEconomy from "./settings/ControlsSection-Economy.svelte";
    import ControlsSectionAI from "./settings/ControlsSection-AI.svelte";
    import ControlsSectionTravel from "./settings/ControlsSection-Travel.svelte";
    import ControlsSectionSurge from "./settings/ControlsSection-Surge.svelte";
    import ControlsSectionConquest from "./settings/ControlsSection-Conquest.svelte";
    import ControlsSectionTerritory from "./settings/ControlsSection-Territory.svelte";
    import ControlsSectionShips from "./settings/ControlsSection-Ships.svelte";
    import ControlsSectionVisuals from "./settings/ControlsSection-Visuals.svelte";
    import ControlsSectionRules from "./settings/ControlsSection-Rules.svelte";
    import ControlsSectionLogging from "./settings/ControlsSection-Logging.svelte";
    import {
        ANIM_SLIDERS,
        type AnimSliderDef,
        type SettingsTier,
        TIER_LABELS,
        MD_EXPORT_SECTIONS,
        formatAnimValue,
    } from "./settingsDefs";

    // Aliases for the imported arrays (matches existing template references)
    const variables = COMBAT_VARIABLES;
    const aiVariables = AI_VARIABLES;
    const densityVariables = DENSITY_VARIABLES;
    const logCategories = LOG_CATEGORIES;

    // ── Combat tuning defaults — derived from GAME_CONFIG at load time (single source of truth)
    const defaultValues = {
        TRANSFER_RATE: GAME_CONFIG.TRANSFER_RATE,
        AGGRESSOR_ADVANTAGE: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
        GLOBAL_DAMAGE_MODIFIER: GAME_CONFIG.GLOBAL_DAMAGE_MODIFIER,
        LETHALITY: GAME_CONFIG.LETHALITY,
        FORCE_RATIO_EFFECT: GAME_CONFIG.FORCE_RATIO_EFFECT,
        CONQUEST_THRESHOLD: GAME_CONFIG.CONQUEST_THRESHOLD,
        CONQUEST_TRANSFER_PERCENTAGE: GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE,
        RETREAT_CAPTURE_RATE: GAME_CONFIG.RETREAT_CAPTURE_RATE,
        SCATTER_CAPTURE_RATE: GAME_CONFIG.SCATTER_CAPTURE_RATE,
        SCATTER_DESTROY_RATE: GAME_CONFIG.SCATTER_DESTROY_RATE,
        RETREAT_DAMAGED_ACTIVATION_RATE:
            GAME_CONFIG.RETREAT_DAMAGED_ACTIVATION_RATE,
        DAMAGED_SHIP_EFFECTIVENESS: GAME_CONFIG.DAMAGED_SHIP_EFFECTIVENESS,
        REPAIR_RATE: GAME_CONFIG.REPAIR_RATE,
        AI_MUST_ATTACK_RATIO: GAME_CONFIG.AI_MUST_ATTACK_RATIO,
        AI_ATTACK_UPPER_BOUNDS: GAME_CONFIG.AI_ATTACK_UPPER_BOUNDS,
        AI_ATTACK_STICKINESS: GAME_CONFIG.AI_ATTACK_STICKINESS,
        AI_EVALUATION_FREQUENCY: GAME_CONFIG.AI_EVALUATION_FREQUENCY,
        AI_TACTICAL_AGGRESSION: GAME_CONFIG.AI_TACTICAL_AGGRESSION,
        AI_RANDOM_AGGRESSION: GAME_CONFIG.AI_RANDOM_AGGRESSION,
        DENSITY_HUE_STEP: GAME_CONFIG.DENSITY_HUE_STEP,
        DENSITY_SAT_STEP: GAME_CONFIG.DENSITY_SAT_STEP,
        DENSITY_LIGHT_STEP: GAME_CONFIG.DENSITY_LIGHT_STEP,
        DENSITY_TIERS: GAME_CONFIG.DENSITY_TIERS,
    };

    const PRISTINE_CONFIG_PATCH = Object.fromEntries(
        Object.entries(DEFAULT_GAME_CONFIG).filter(([key]) => !key.startsWith("_")),
    ) as Record<string, unknown>;

    // Default values — single source of truth for reset + disabled toggle state

    let enabled = $state({
        TRANSFER_RATE: true,
        AGGRESSOR_ADVANTAGE: true,
        GLOBAL_DAMAGE_MODIFIER: true,
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
        syncAllFromConfig();
        themeStore.registerApplyCallback(applyThemeValues);
        registerCategoryPresetApplyCallback(applyCategoryPresetValues);

        return () => {
            themeStore.registerApplyCallback(null);
            registerCategoryPresetApplyCallback(null);
        };
    });

    let tickInterval = $state(GAME_CONFIG.BASE_TICK_MS);
    let activeTier = $state<SettingsTier>(loadTier());

    // Panel settings (persisted via panelSync)
    let panel = $state(loadPanelSettings(panelDefaultsFromConfig()));
    // Visuals state (persisted via panelSync)
    let vis = $state(loadVisuals());
    // Animation lock state (persisted via panelSync)
    let animLockRatios = $state(loadAnimLockRatios());
    let animLockModes = $state(loadAnimLockModes());

    function updatePanel(key: string, value: any) {
        panel = setSetting(panel, key, value, savePanelSettings);
    }

    function updateVisual(key: string, value: any) {
        (vis as any)[key] = value;
        saveVisuals(vis);
        applyVisuals(vis);
    }

    function syncVisualsFromConfig(
        configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
    ) {
        const nextVis = {
            ...vis,
            laneWidth: configSource.CONNECTION_WIDTH,
            laneAlpha: configSource.CONNECTION_ALPHA,
            shadowWidth: configSource.CONNECTION_SHADOW_WIDTH,
            shadowAlpha: configSource.CONNECTION_SHADOW_ALPHA,
            bgImage: configSource.BG_IMAGE_URL,
        };
        vis = nextVis;
        saveVisuals(nextVis);
        applyVisuals(nextVis);
    }

    function syncCombatValuesFromConfig(
        configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
    ) {
        const freshValues = { ...values };
        for (const k of Object.keys(freshValues)) {
            if (k in configSource) {
                (freshValues as any)[k] = configSource[k];
            }
        }
        values = freshValues;
        savedValues = { ...freshValues };
        transferRate = Math.round(((freshValues.TRANSFER_RATE ?? 0) as number) * 100);
        saveCombatTuning(freshValues);
    }

    function syncAnimValuesFromConfig(
        configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
    ) {
        const nextAnimValues = { ...animValues };
        for (const slider of ANIM_SLIDERS) {
            if (configSource[slider.key] !== undefined) {
                nextAnimValues[slider.key] = configSource[slider.key] as number;
            }
        }
        animValues = nextAnimValues;
    }

    function syncRuntimeViewsFromConfig(
        configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
    ) {
        syncVisualsFromConfig(configSource);
        syncCombatValuesFromConfig(configSource);
        syncAnimValuesFromConfig(configSource);
        tickInterval = configSource.BASE_TICK_MS;
        activeGameStore.updateTickInterval(configSource.BASE_TICK_MS);
        animationStore.setAnimationSpeed(configSource.ANIMATION_SPEED_MS);
    }

    function syncAllFromConfig(
        configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
    ) {
        panel = syncPanelFromConfigPatch(panel, configSource, savePanelSettings);
        syncRuntimeViewsFromConfig(configSource);
    }

    function applyConfigPatch(configPatch: Record<string, unknown>) {
        panel = setSettingsFromConfigPatch(panel, configPatch, savePanelSettings);
        syncRuntimeViewsFromConfig();
    }

    function applyThemeValues(valuesPatch: Record<string, number | string | boolean>) {
        applyConfigPatch(valuesPatch);
    }

    function applyCategoryPresetValues(preset: CategoryPreset) {
        applyConfigPatch(preset.values as Record<string, unknown>);
    }

    function setTier(tier: SettingsTier) {
        activeTier = tier;
        saveTier(tier);
    }

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
                const acceptedPatch: Record<string, unknown> = {};

                for (const [k, v] of Object.entries(incoming)) {
                    if (!(k in cfg)) {
                        skipped++;
                        continue;
                    }

                    const existing = cfg[k];
                    if (
                        typeof existing === "number" &&
                        typeof v === "number" &&
                        isFinite(v)
                    ) {
                        acceptedPatch[k] = v;
                        applied++;
                    } else if (
                        typeof existing === "boolean" &&
                        typeof v === "boolean"
                    ) {
                        acceptedPatch[k] = v;
                        applied++;
                    } else if (
                        typeof existing === "string" &&
                        typeof v === "string"
                    ) {
                        acceptedPatch[k] = v;
                        applied++;
                    } else {
                        typeErrors++;
                    }
                }

                if (applied > 0) {
                    applyConfigPatch(acceptedPatch);
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
            input.value = "";
        };
        reader.readAsText(file);
    }



    // =========================================================================
    // Tick-Ratio Locking — bind animation durations proportionally to tick
    // =========================================================================

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
            CONQUEST_COLOR_DELAY_TICKS: "conquestColorDelayTicks",
            CONQUEST_FLASH_TICKS: "conquestFlashTicks",
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

    function resetToDefaults() {
        localStorage.removeItem(PANEL_STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(VISUALS_STORAGE_KEY);
        localStorage.removeItem(ANIM_LOCK_STORAGE_KEY);
        localStorage.removeItem(ANIM_LOCK_STORAGE_KEY + "-modes");

        enabled = Object.fromEntries(
            Object.keys(enabled).map((key) => [key, true]),
        ) as typeof enabled;
        animLockRatios = {};
        animLockModes = {};

        panel = setSettingsFromConfigPatch(
            panel,
            PRISTINE_CONFIG_PATCH,
            savePanelSettings,
        );
        syncAllFromConfig(DEFAULT_GAME_CONFIG as Record<string, any>);
    }

    // =========================================================================

    // =========================================================================
    // Theme System — now uses shared themeStore
    // =========================================================================
    let showFullSaveInput = $state(false);
    let fullSaveName = $state("");
    let fullSaveFlash = $state(false);


    function handleApplyTheme(name: string) {
        themeStore.applyTheme(name);
        configStatus = `\u2705 Theme \"${name}\" applied`;
        configStatusColor = "#4ade80";
    }
    function handleSaveTheme() {
        const name = fullSaveName.trim();
        if (!name) return;
        themeStore.saveTheme(name);
        fullSaveName = "";
        showFullSaveInput = false;
        configStatus = `\u2705 Theme \"${name}\" saved`;
        configStatusColor = "#4ade80";
        fullSaveFlash = true;
        setTimeout(() => (fullSaveFlash = false), 600);
        // Download theme JSON
        themeStore.exportTheme(name);
    }

    function handleUpdateTheme() {
        const name = themeStore.selectedThemeName;
        if (!name || !themeStore.isUserTheme(name)) return;
        themeStore.saveTheme(name);
        configStatus = `\u2705 Theme \"${name}\" updated`;
        configStatusColor = "#4ade80";
        fullSaveFlash = true;
        setTimeout(() => (fullSaveFlash = false), 600);
    }

    function handleExportTheme() {
        themeStore.exportTheme(themeStore.selectedThemeName || undefined);
    }

    function handleDeleteFullTheme(name: string) {
        themeStore.deleteTheme(name);
    }

    function handleImportTheme() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const theme = JSON.parse(text) as GameTheme;
                if (themeStore.importTheme(theme)) {
                    configStatus = `\u2705 Theme \"${theme.name}\" imported`;
                    configStatusColor = "#4ade80";
                } else {
                    configStatus = "\u274C Invalid theme file";
                    configStatusColor = "#f87171";
                }
            } catch {
                configStatus = "\u274C Failed to parse theme file";
                configStatusColor = "#f87171";
            }
        };
        input.click();
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
        | "territory"
        | "ships"
        | "visuals"
        | "logging";

    const ACTIVE_SECTION_KEY = "pax-fluxia-open-sections";
    function loadOpenSections(): SectionId[] {
        if (typeof window === "undefined") return [];
        try {
            const s = localStorage.getItem(ACTIVE_SECTION_KEY);
            if (s) return JSON.parse(s) as SectionId[];
        } catch {
            /* ignore */
        }
        return [];
    }

    // Ordered array: last element = most recently opened (shown first in render)
    let sectionOrder = $state<SectionId[]>(loadOpenSections());
    // Set for O(1) membership checks
    let openSections = $derived(new Set(sectionOrder));

    function toggleSection(id: SectionId) {
        const idx = sectionOrder.indexOf(id);
        if (idx >= 0) {
            // Already open — close it
            sectionOrder = sectionOrder.filter((s) => s !== id);
        } else {
            // Open — add to end (most recent = rendered first)
            sectionOrder = [...sectionOrder, id];
        }
        if (typeof window !== "undefined") {
            localStorage.setItem(
                ACTIVE_SECTION_KEY,
                JSON.stringify(sectionOrder),
            );
        }
    }

    // Most recently opened sections first
    let orderedOpenSections = $derived(
        [...sectionOrder]
            .reverse()
            .map((id) => sections.find((s) => s.id === id))
            .filter(Boolean) as typeof sections,
    );

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
            label: "Stars & Ships",
            color: "#88ccff",
            tier: "advanced",
        },
        {
            id: "travel",
            icon: "🚀",
            label: "Ship travel",
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
            id: "territory",
            icon: "🌍",
            label: "Territory",
            color: "#66ccaa",
            tier: "basic",
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

<div class="controls-panel" use:nudgeSliders>
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

    <!-- Theme Picker (always visible — full-theme-bar with drawer) -->
    <div class="full-theme-bar">
        <div class="full-top-row">
            <div class="full-action-buttons" class:hidden={showFullSaveInput}>
                <select
                    class="full-theme-select full-action-half"
                    value={themeStore.selectedThemeName}
                    onchange={(e) => {
                        const v = (e.target as HTMLSelectElement).value;
                        if (v) handleApplyTheme(v);
                    }}
                >
                    <option value="">🎨 Select theme…</option>
                    {#each themeStore.allThemes as theme}
                        <option value={theme.name}>
                            {theme.name}
                        </option>
                    {/each}
                </select>
                {#if themeStore.selectedThemeName && themeStore.isUserTheme(themeStore.selectedThemeName)}
                    <button
                        class="full-action-btn full-update-btn"
                        class:flash={fullSaveFlash}
                        onclick={handleUpdateTheme}
                        title="Update ‘{themeStore.selectedThemeName}’ with current settings"
                    >
                        💾 Update
                    </button>
                {/if}
                <button
                    class="full-action-btn full-create-btn"
                    onclick={() => {
                        showFullSaveInput = true;
                    }}
                    title="Save current settings as a new theme"
                >
                    <span class="full-plus-icon">+</span> New
                </button>
            </div>
            <div class="full-save-drawer" class:open={showFullSaveInput}>
                <input
                    class="full-save-input"
                    type="text"
                    placeholder="Theme name…"
                    bind:value={fullSaveName}
                    onkeydown={(e) => {
                        if (e.key === "Enter") handleSaveTheme();
                        if (e.key === "Escape") {
                            showFullSaveInput = false;
                            fullSaveName = "";
                        }
                    }}
                />
                <button
                    class="full-drawer-btn cancel"
                    onclick={() => {
                        showFullSaveInput = false;
                        fullSaveName = "";
                    }}
                    title="Cancel">✕</button
                >
                <button
                    class="full-drawer-btn confirm"
                    class:flash={fullSaveFlash}
                    onclick={handleSaveTheme}
                    title="Save theme">✓</button
                >
            </div>
        </div>
        {#if themeStore.allThemes.length > 0}
            <div class="full-chips-row">
                {#each themeStore.allThemes as t}
                    <button
                        class="full-chip"
                        class:active={themeStore.selectedThemeName === t.name}
                        onclick={() => handleApplyTheme(t.name)}
                    >
                        {t.name}
                        {#if themeStore.isUserTheme(t.name)}
                            <span
                                class="full-chip-delete"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFullTheme(t.name);
                                }}>×</span
                            >
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
        <div class="full-io-row">
            <button
                class="full-io-btn"
                onclick={handleExportTheme}
                title="Export selected theme as JSON"
            >
                📤 Export
            </button>
            <button
                class="full-io-btn"
                onclick={handleImportTheme}
                title="Import theme from JSON file"
            >
                📥 Import
            </button>
        </div>
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
    {#each orderedOpenSections as sec (sec.id)}
        <div class="section-panel" style="--accent: {sec.color}">
            <button class="section-head" onclick={() => toggleSection(sec.id)}>
                <span class="head-icon">{sec.icon}</span>
                <span class="head-label">{sec.label}</span>
                <span class="head-close">✕</span>
            </button>

            <div class="section-body">
                <!-- ⚡ TIMING -->
                {#if sec.id === "speed"}
                    <ControlsSectionTiming
                        {panel}
                        {updatePanel}
                        {tickInterval}
                        {updateTickInterval}
                        {animLockModes}
                        {animLockRatios}
                        {animValues}
                        {getAnimValue}
                        {setAnimValue}
                        {formatAnimValue}
                        {pinValueToTickDuration}
                        {lockRatioToTick}
                        {lockRatioToAnimSpeed}
                        syncFromConfig={syncAllFromConfig}
                    />

                    <!-- ⚔️ BATTLE -->
                {:else if sec.id === "battle"}
                    <ControlsSectionBattle
                        {panel}
                        {updatePanel}
                        {values}
                        {enabled}
                        {updateValue}
                        {toggle}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "economy"}
                    <ControlsSectionEconomy
                        {panel}
                        {updatePanel}
                        {transferRate}
                        {updateTransferRate}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "ai"}
                    <ControlsSectionAI
                        {panel}
                        {updatePanel}
                        {values}
                        {enabled}
                        {updateValue}
                        {toggle}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "travel"}
                    <ControlsSectionTravel
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "surge"}
                    <ControlsSectionSurge
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "conquest"}
                    <ControlsSectionConquest
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "territory"}
                    <ControlsSectionTerritory
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "ships"}
                    <ControlsSectionShips
                        {panel}
                        {updatePanel}
                        {values}
                        {enabled}
                        {updateValue}
                        {toggle}
                        {exportConfigMD}
                        {importConfigJSON}
                        {configStatus}
                        {configStatusColor}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "visuals"}
                    <ControlsSectionVisuals
                        {panel}
                        {updatePanel}
                        {vis}
                        {updateVisual}
                        {densityVariables}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "rules"}
                    <ControlsSectionRules
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "logging"}
                    <ControlsSectionLogging
                        {panel}
                        {updatePanel}
                        {logCategories}
                        {logRefresh}
                        {exportConfigMD}
                        {importConfigJSON}
                        {configStatus}
                        {configStatusColor}
                        syncFromConfig={syncAllFromConfig}
                    />
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

    /* ── Full Theme Picker (large) ── */
    .full-theme-bar {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 6px 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .full-top-row {
        position: relative;
        height: 36px;
        overflow: hidden;
    }
    .full-action-buttons {
        position: absolute;
        inset: 0;
        display: flex;
        gap: 5px;
        transition:
            transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
            opacity 0.25s;
    }
    .full-action-buttons.hidden {
        transform: translateX(-100%);
        opacity: 0;
        pointer-events: none;
    }
    .full-action-half {
        flex: 1;
        height: 100%;
    }
    .full-theme-select {
        background: rgba(255, 255, 255, 0.06);
        color: #ccc;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 0 28px 0 12px;
        font-size: 13px;
        font-family: inherit;
        cursor: pointer;
        outline: none;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        transition:
            border-color 0.2s,
            background 0.2s;
    }
    .full-theme-select:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.25);
    }
    .full-theme-select:focus {
        border-color: #4ade80;
    }
    .full-theme-select option {
        background: #151a25;
        color: #eee;
    }
    .full-action-btn {
        background: rgba(255, 255, 255, 0.04);
        color: #aaa;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
    }
    .full-action-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.25);
    }
    .full-plus-icon {
        font-size: 16px;
        font-weight: bold;
        color: #888;
        transition: color 0.2s;
    }
    .full-action-btn:hover .full-plus-icon {
        color: #4ade80;
    }
    .full-save-drawer {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        gap: 5px;
        transform: translateX(100%);
        opacity: 0;
        transition:
            transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
            opacity 0.25s;
        pointer-events: none;
        background: #111520;
        z-index: 2;
    }
    .full-save-drawer.open {
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
    }
    .full-save-input {
        flex: 1;
        background: rgba(0, 0, 0, 0.2);
        color: #fff;
        border: 1px solid rgba(74, 222, 128, 0.3);
        border-radius: 6px;
        padding: 0 12px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
    }
    .full-save-input:focus {
        border-color: #4ade80;
        box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.2) inset;
    }
    .full-save-input::placeholder {
        color: #666;
    }
    .full-drawer-btn {
        width: 36px;
        height: 100%;
        border: 1px solid;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .full-drawer-btn.cancel {
        background: rgba(255, 255, 255, 0.05);
        color: #999;
        border-color: rgba(255, 255, 255, 0.15);
    }
    .full-drawer-btn.cancel:hover {
        background: rgba(255, 55, 55, 0.15);
        color: #ff5555;
        border-color: rgba(255, 55, 55, 0.4);
    }
    .full-drawer-btn.confirm {
        background: rgba(74, 222, 128, 0.1);
        color: #4ade80;
        border-color: rgba(74, 222, 128, 0.3);
    }
    .full-drawer-btn.confirm:hover {
        background: rgba(74, 222, 128, 0.2);
        color: #4ade80;
        border-color: #4ade80;
    }
    .full-drawer-btn.confirm.flash {
        background: #4ade80;
        color: #000;
        transform: scale(0.95);
    }
    .full-chips-row {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        width: 100%;
    }
    .full-chip {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 4px 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        color: #bbb;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .full-chip:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.25);
        color: #fff;
    }
    .full-chip.active {
        background: rgba(74, 222, 128, 0.12);
        border-color: rgba(74, 222, 128, 0.4);
        color: #4ade80;
    }
    .full-chip-delete {
        font-size: 14px;
        line-height: 1;
        opacity: 0.3;
        cursor: pointer;
        padding-left: 2px;
    }
    .full-chip-delete:hover {
        opacity: 1;
        color: #ff5555;
    }
    .full-io-row {
        display: flex;
        gap: 6px;
        width: 100%;
        margin-top: 4px;
    }
    .full-io-btn {
        flex: 1;
        padding: 3px 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.04);
        color: #aaa;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
    }
    .full-io-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
        color: #fff;
    }

    /* ── Nudge slider buttons (injected via nudgeSliders action) ── */
    :global(.nudge-slider-wrap) {
        display: flex;
        align-items: center;
        gap: 4px;
        width: 100%;
    }
    :global(.nudge-slider-wrap) input[type="range"] {
        flex: 1;
        min-width: 0;
    }
    :global(.slider-nudge-btn) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        transition:
            background 0.12s,
            border-color 0.12s;
        padding: 0;
        line-height: 1;
    }
    :global(.slider-nudge-btn:hover) {
        background: rgba(74, 222, 128, 0.12);
        border-color: rgba(74, 222, 128, 0.4);
        color: #4ade80;
    }
    :global(.slider-nudge-btn:active) {
        background: rgba(74, 222, 128, 0.25);
        border-color: rgba(74, 222, 128, 0.6);
    }
</style>
















