<script lang="ts">
    import { onMount, tick } from "svelte";
    import { DEFAULT_GAME_CONFIG, GAME_CONFIG } from "$lib/config/game.config";
    import type { MapDefinition } from "$lib/types/map.types";
    import {
        registerCategoryPresetApplyCallback,
        type CategoryPreset,
    } from "$lib/config/categoryThemes";
    import { themeStore } from "$lib/stores/themeStore.svelte";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { selectedStarStore } from "$lib/stores/selectedStarStore.svelte";
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import { animationStore } from "$lib/stores/animationStore.svelte";
    import { patchTouchesLaneTopology } from "$lib/lanes/laneMargin";
    import { log, logFlags } from "$lib/utils/logger";
    import { normalizeBgImagePath } from "$lib/config/bgManifest";
    import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
    import {
        LOG_CATEGORIES,
    } from "./settingsDefs";
    import { nudgeSliders } from "./settings/nudgeSliders";
    import {
        setSetting,
        setSettingsFromConfigPatch,
        syncPanelFromConfigPatch,
        warnOnMissingTerritorySchemaCoverage,
    } from "./settingsState";
    import {
        STORAGE_KEY,
        PANEL_STORAGE_KEY,
        VISUALS_STORAGE_KEY,
        ANIM_LOCK_STORAGE_KEY,
        loadVisuals,
        saveVisuals,
        applyVisuals,
        loadPanelSettings,
        panelDefaultsFromConfig,
        savePanelSettings,
        applyPanelToConfig,
        loadAnimLockRatios,
        saveAnimLockRatios,
        loadAnimLockModes,
        saveAnimLockModes,
        saveTier,
        exportConfigJSON as exportConfigJSONBase,
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
    import ControlsSectionFrontierFx from "./settings/ControlsSection-FrontierFx.svelte";
    import TerritoryPhaseFieldSettings from "./settings/TerritoryPhaseFieldSettings.svelte";
    import TerritoryGeometrySourceTuning from "./settings/TerritoryGeometrySourceTuning.svelte";
    import TerritoryTopologyTuning from "./settings/TerritoryTopologyTuning.svelte";
    import ControlsSectionShips from "./settings/ControlsSection-Ships.svelte";
    import ControlsSectionPlayers from "./settings/ControlsSection-Players.svelte";
    import ControlsSectionVisuals from "./settings/ControlsSection-Visuals.svelte";
    import ControlsSectionLogging from "./settings/ControlsSection-Logging.svelte";
    import ControlsSectionAudio from "./settings/ControlsSection-Audio.svelte";
    import ControlsSectionDiagnostics from "./settings/ControlsSection-Diagnostics.svelte";
    import {
        ANIM_SLIDERS,
        CONFIG_TO_PANEL_KEY,
        type AnimSliderDef,
        type SettingsTier,
        TIER_LABELS,
        MD_EXPORT_SECTIONS,
        formatAnimValue,
    } from "./settingsDefs";
    import {
        enhanceSettingMetadata,
    } from "./settings/settingMetadata";
    import {
        SETTINGS_SECTIONS,
        normalizeSettingsSectionId,
        type SettingsSectionId,
        type SettingsSectionDefinition,
    } from "./settings/settingsRegistry";
    import {
        searchSettings,
        type SettingsSearchResult,
    } from "./settings/settingsSearch";
    import {
        canAccessAudience,
        resolveAudienceAccess,
        type AudienceAccess,
    } from "$lib/shell/audience";

    // Aliases for the imported arrays (matches existing template references)
    const logCategories = LOG_CATEGORIES;

    const PRISTINE_CONFIG_PATCH = Object.fromEntries(
        Object.entries(DEFAULT_GAME_CONFIG).filter(
            ([key]) => !key.startsWith("_"),
        ),
    ) as Record<string, unknown>;

    onMount(() => {
        const handleExternalConfigSync = () => {
            syncAllFromConfig();
        };

        warnOnMissingTerritorySchemaCoverage();
        // Restore saved panel values INTO GAME_CONFIG before syncAllFromConfig
        // reads GAME_CONFIG back into panel. Without this, compile-time defaults
        // overwrite user-saved slider values (Chaikin, resampleN, etc.).
        applyPanelToConfig(panel);
        applyTimingBindingsAndLocks();
        syncAllFromConfig();
        themeStore.registerApplyCallback(applyThemeValues);
        registerCategoryPresetApplyCallback(applyCategoryPresetValues);
        if (typeof window !== "undefined") {
            window.addEventListener(
                "pax-settings-config-sync-requested",
                handleExternalConfigSync,
            );
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener(
                    "pax-settings-config-sync-requested",
                    handleExternalConfigSync,
                );
            }
            themeStore.registerApplyCallback(null);
            registerCategoryPresetApplyCallback(null);
        };
    });

    function getCurrentSearchParams(): URLSearchParams | null {
        if (typeof window === "undefined") return null;
        try {
            return new URL(window.location.href).searchParams;
        } catch {
            return null;
        }
    }

    function audienceToTier(access: AudienceAccess): SettingsTier {
        if (canAccessAudience("internal", access)) return "developer";
        if (canAccessAudience("advanced", access)) return "advanced";
        return "basic";
    }

    const fallbackAudienceAccess = resolveAudienceAccess({
        isDev: import.meta.env.DEV,
        searchParams: getCurrentSearchParams(),
    });
    let tickInterval = $state(GAME_CONFIG.BASE_TICK_MS);
    let activeTier = $state<SettingsTier>(audienceToTier(fallbackAudienceAccess));

    // Panel settings (persisted via panelSync)
    let panel = $state(loadPanelSettings(panelDefaultsFromConfig()));
    // Visuals state (persisted via panelSync)
    let vis = $state(loadVisuals());
    // Animation lock state (persisted via panelSync)
    let animLockRatios = $state(loadAnimLockRatios());
    let animLockModes = $state(loadAnimLockModes());

    function isTickRelativeSlider(def?: AnimSliderDef): boolean {
        return def?.unit === "×tick" || def?.unit === "ticks";
    }

    function applyTimingBindingsAndLocks() {
        const nextTick = panel.tickInterval ?? GAME_CONFIG.BASE_TICK_MS;
        GAME_CONFIG.BASE_TICK_MS = nextTick;

        if (panel.bindAnimToTick) {
            GAME_CONFIG.ANIMATION_SPEED_MS = nextTick;
            panel = { ...panel, animSpeed: nextTick };
        }

        if (panel.territoryTransitionBindToTick) {
            GAME_CONFIG.TERRITORY_TRANSITION_MS = nextTick;
            panel = { ...panel, territoryTransitionMs: nextTick };
        }

        if (panel.surgePulseBindToTick ?? GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK ?? true) {
            GAME_CONFIG.SURGE_PULSE_DURATION_MS = nextTick;
            panel = { ...panel, surgePulseDurationMs: nextTick };
        }

        const tickUpdates = recalcAnimLocksOnTickChange(nextTick) ?? {};
        if (Object.keys(tickUpdates).length > 0) {
            const patch: Record<string, number> = {};
            for (const [configKey, value] of Object.entries(tickUpdates)) {
                const panelKey = CONFIG_TO_PANEL_KEY[configKey];
                if (panelKey) patch[panelKey] = value;
            }
            panel = { ...panel, ...patch };
        }

        const animSpeed = panel.bindAnimToTick
            ? nextTick
            : (GAME_CONFIG.ANIMATION_SPEED_MS ?? animationStore.speedMs);
        const animUpdates = recalcAnimLocksOnAnimSpeedChange(animSpeed) ?? {};
        if (Object.keys(animUpdates).length > 0) {
            const patch: Record<string, number> = {};
            for (const [configKey, value] of Object.entries(animUpdates)) {
                const panelKey = CONFIG_TO_PANEL_KEY[configKey];
                if (panelKey) patch[panelKey] = value;
            }
            panel = { ...panel, ...patch };
        }

        savePanelSettings(panel);
        tickInterval = nextTick;
        activeGameStore.updateTickInterval(nextTick);
        animationStore.setAnimationSpeed(GAME_CONFIG.ANIMATION_SPEED_MS);
        syncAnimValuesFromConfig();
    }

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
        // All combat/AI values now flow through panel state → child components.
        // Only transferRate display-state needs sync here.
        transferRate = Math.round(
            ((configSource.TRANSFER_RATE ?? 0.1) as number) * 100,
        );
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
        panel = syncPanelFromConfigPatch(
            panel,
            configSource,
            savePanelSettings,
        );
        applyTimingBindingsAndLocks();
        syncRuntimeViewsFromConfig(configSource);
    }

    function applyConfigPatch(configPatch: Record<string, unknown>) {
        panel = setSettingsFromConfigPatch(
            panel,
            configPatch,
            savePanelSettings,
        );
        applyTimingBindingsAndLocks();
        syncRuntimeViewsFromConfig();
        const affectsLaneTopology = patchTouchesLaneTopology(
            configPatch,
            GAME_CONFIG,
        );
        const affectsLanePaths =
            affectsLaneTopology
            || 'MAPGEN_LANE_MODE' in configPatch;
        const affectsAuthoredConnectivityPolicy =
            'MAPGEN_RECOMPUTE_CONNECTIVITY_ON_AUTHORED_MAPS' in configPatch;
        if (affectsLaneTopology) {
            (gameStore as any).rebuildLaneConstraintsFromConfig?.();
        } else if (affectsLanePaths || affectsAuthoredConnectivityPolicy) {
            (gameStore as any).rebuildLaneConstraintsFromConfig?.();
        }
        if (typeof window !== "undefined" && "BG_IMAGE_URL" in configPatch) {
            window.dispatchEvent(
                new CustomEvent("pax-bg-change", {
                    detail: normalizeBgImagePath(GAME_CONFIG.BG_IMAGE_URL),
                }),
            );
        }
        if (typeof window !== "undefined" && "BG_IMAGE_ALPHA" in configPatch) {
            window.dispatchEvent(
                new CustomEvent("pax-bg-alpha-change", {
                    detail: GAME_CONFIG.BG_IMAGE_ALPHA ?? 0.5,
                }),
            );
        }
        if (
            Object.keys(configPatch).some((key) =>
                key === "BG_IMAGE_URL"
                || key === "BG_IMAGE_ALPHA"
                || key === "MIN_COLOR_LIGHTNESS"
                || key.startsWith("TERRITORY_")
                || key.startsWith("PERIMETER_FIELD_")
                || key.startsWith("METABALL_")
                || key.startsWith("VORONOI_")
                || key.startsWith("MODIFIED_VORONOI_")
                || key.startsWith("DF_"),
            )
        ) {
            bumpTerritoryVisualConfig();
        }
    }

    function applyThemeValues(
        valuesPatch: Record<string, number | string | boolean>,
    ) {
        applyConfigPatch(valuesPatch);
    }

    function applyCategoryPresetValues(preset: CategoryPreset) {
        applyConfigPatch(preset.values as Record<string, unknown>);
    }

    function syncTierFromAudience() {
        const nextTier = audienceToTier(audienceAccess);
        if (activeTier === nextTier) return;
        activeTier = nextTier;
        saveTier(nextTier);
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
        Math.round((GAME_CONFIG.TRANSFER_RATE ?? 0.1) * 100),
    );

    function updateTransferRate(value: number) {
        transferRate = value;
        const decimal = value / 100;
        GAME_CONFIG.TRANSFER_RATE = decimal;
        updatePanel("transferRate", decimal);
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

    // Combat toggle/updateValue removed — all combat/AI/density values now
    // flow through panel state via CONFIG_TO_PANEL_KEY in child components.

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
            const unit = def?.unit ?? "";
            const isTickRelative = unit === "×tick" || unit === "ticks";
            const isMultiplier = isTickRelative || unit === "×";
            const pinnedValue = isMultiplier ? 1.0 : GAME_CONFIG.BASE_TICK_MS;
            const pinnedRatio = isTickRelative
                ? 1.0
                : unit === "×"
                  ? 1.0 / GAME_CONFIG.BASE_TICK_MS
                  : 1;
            animLockModes[key] = "pinned";
            animLockRatios[key] = pinnedRatio;
            setAnimValue(key, pinnedValue);
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
            const def = ANIM_SLIDERS.find((s) => s.key === key);
            animLockModes[key] = "ratio";
            animLockRatios[key] = isTickRelativeSlider(def)
                ? currentVal
                : currentVal / currentTick;
        }
        animLockModes = { ...animLockModes };
        animLockRatios = { ...animLockRatios };
        saveAnimLockRatios(animLockRatios);
        saveAnimLockModes(animLockModes);
    }

    /** Recalculate all locked/pinned animation values when tick interval changes */
function recalcAnimLocksOnTickChange(newTickMs: number) {
        const updates: Record<string, number> = {};
        for (const [key, mode] of Object.entries(animLockModes)) {
            if (mode === "pinned" || mode === "ratio") {
                const ratio = animLockRatios[key];
                if (ratio != null) {
                    const def = ANIM_SLIDERS.find((s) => s.key === key);
                    let newVal = isTickRelativeSlider(def)
                        ? ratio
                        : ratio * newTickMs;
                    if (def && def.min != null && def.max != null) {
                        newVal = Math.max(def.min, Math.min(def.max, newVal));
                    }
                    newVal =
                        def?.unit === "ms"
                            ? Math.round(newVal)
                            : Math.round(newVal * 100) / 100;
                    setAnimValue(key, newVal);
                    updates[key] = newVal;
                }
            }
        }
        return updates;
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
        const updates: Record<string, number> = {};
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
                    updates[key] = newVal;
                    syncPanelKey(key, newVal);
                }
            }
        }
        return updates;
    }

    /** Map GAME_CONFIG keys to panel keys — full coverage via PANEL_CONFIG_MAP (settingsDefs). */
    function animSliderToPanelKey(configKey: string): string | null {
        return CONFIG_TO_PANEL_KEY[configKey] ?? null;
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
        if (panelKey) {
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

    /** Nuclear reset: clear ALL pax-* localStorage keys and reload into factory defaults. */
    function resetToDefaults() {
        // Clear all pax localStorage keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("pax") || k.startsWith("PAX")))
                keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        // Also clear known non-prefixed keys
        localStorage.removeItem(PANEL_STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(VISUALS_STORAGE_KEY);
        localStorage.removeItem(ANIM_LOCK_STORAGE_KEY);
        localStorage.removeItem(ANIM_LOCK_STORAGE_KEY + "-modes");

        // Reload to fully reinitialize from clean state
        window.location.reload();
    }
    let showSaveMapDrawer = $state(false);
    let showLoadMapDrawer = $state(false);
    let showSaveGameDrawer = $state(false);
    let showLoadGameDrawer = $state(false);
    let saveMapName = $state("");
    let saveGameName = $state("");

    function closeUtilityDrawers() {
        showSaveMapDrawer = false;
        showLoadMapDrawer = false;
        showSaveGameDrawer = false;
        showLoadGameDrawer = false;
    }

    function toggleUtilityDrawer(
        drawer: "saveMap" | "loadMap" | "saveGame" | "loadGame",
    ) {
        const nextSaveMap = drawer === "saveMap" ? !showSaveMapDrawer : false;
        const nextLoadMap = drawer === "loadMap" ? !showLoadMapDrawer : false;
        const nextSaveGame = drawer === "saveGame" ? !showSaveGameDrawer : false;
        const nextLoadGame = drawer === "loadGame" ? !showLoadGameDrawer : false;

        showSaveMapDrawer = nextSaveMap;
        showLoadMapDrawer = nextLoadMap;
        showSaveGameDrawer = nextSaveGame;
        showLoadGameDrawer = nextLoadGame;

        if (nextSaveGame && !saveGameName.trim()) {
            saveGameName = `Session ${new Date().toISOString().slice(0, 10)}`;
        }
    }

    function getLoadableMaps(): MapDefinition[] {
        return [...gameStore.savedMaps].sort((left, right) => {
            const leftBuiltIn = Boolean((left as any).builtIn);
            const rightBuiltIn = Boolean((right as any).builtIn);
            if (leftBuiltIn !== rightBuiltIn) {
                return leftBuiltIn ? -1 : 1;
            }
            return left.metadata.name.localeCompare(right.metadata.name);
        });
    }

    async function handleLoadMapFromSettings(savedMap: MapDefinition) {
        showLoadMapDrawer = false;
        gameStore.loadSavedMap(savedMap);
        await gameStore.startGame();
        configStatus = `✅ Map "${savedMap.metadata.name}" loaded`;
        configStatusColor = "#4ade80";
    }

    function getSavedGames() {
        return [...gameStore.savedGames].sort(
            (left, right) =>
                Date.parse(right.createdAt) - Date.parse(left.createdAt),
        );
    }

    function handleSaveMapFromSettings() {
        const name = saveMapName.trim();
        if (!name) return;
        gameStore.saveCurrentMap(name);
        saveMapName = "";
        showSaveMapDrawer = false;
        configStatus = `Saved map "${name}"`;
        configStatusColor = "#4ade80";
    }

    function handleSaveGameFromSettings() {
        const name = saveGameName.trim();
        if (!name) return;
        gameStore.saveCurrentGame(name);
        saveGameName = "";
        showSaveGameDrawer = false;
        configStatus = `Saved game "${name}"`;
        configStatusColor = "#4ade80";
    }

    async function handleLoadSavedGameFromSettings(game: any) {
        showLoadGameDrawer = false;
        gameStore.loadSavedGame(game, false);
        await gameStore.startGame();
        configStatus = `Loaded game "${game.name}"`;
        configStatusColor = "#4ade80";
    }

    function handleRestartFromSettings() {
        closeUtilityDrawers();
        activeGameStore.playAgain();
    }

    function handleQuitFromSettings() {
        closeUtilityDrawers();
        activeGameStore.returnToMenu();
    }

    function handleDeleteSavedGameFromSettings(id: string) {
        gameStore.deleteSavedGame(id);
        configStatus = "Deleted saved game";
        configStatusColor = "#4ade80";
    }

    // =========================================================================
    // Icon Toolbar — sections definition
    // =========================================================================
    type SectionId = SettingsSectionId;

    interface Props {
        forceOpenSection?: SectionId | null;
        forceOpenSectionNonce?: number;
        audienceAccess?: AudienceAccess;
        onRequestShowAdvanced?: () => void;
        onRequestInternalTools?: () => void;
    }

    let {
        forceOpenSection = null,
        forceOpenSectionNonce = 0,
        audienceAccess = fallbackAudienceAccess,
        onRequestShowAdvanced,
        onRequestInternalTools,
    }: Props = $props();

    $effect(() => {
        syncTierFromAudience();
    });

    const ACTIVE_SECTION_KEY = "pax-fluxia-open-sections";
    function loadOpenSections(): SectionId[] {
        if (typeof window === "undefined") return [];
        try {
            const s = localStorage.getItem(ACTIVE_SECTION_KEY);
            if (s) {
                return (JSON.parse(s) as string[])
                    .map((value) => normalizeSettingsSectionId(value))
                    .filter(Boolean) as SectionId[];
            }
        } catch {
            /* ignore */
        }
        return [];
    }

    // Ordered array: last element = most recently opened (shown first in render)
    let sectionOrder = $state<SectionId[]>(loadOpenSections());
    // Set for O(1) membership checks
    let openSections = $derived(new Set(sectionOrder));
    let advancedSectionsVisible = $derived(
        canAccessAudience("advanced", audienceAccess),
    );
    let internalSectionsVisible = $derived(
        canAccessAudience("internal", audienceAccess),
    );

    function persistSectionOrder() {
        if (typeof window !== "undefined") {
            localStorage.setItem(
                ACTIVE_SECTION_KEY,
                JSON.stringify(sectionOrder),
            );
        }
    }

    function openSection(id: SectionId) {
        sectionOrder = [...sectionOrder.filter((s) => s !== id), id];
        persistSectionOrder();
    }

    function toggleSection(id: SectionId) {
        const idx = sectionOrder.indexOf(id);
        if (idx >= 0) {
            // Already open — close it
            sectionOrder = sectionOrder.filter((s) => s !== id);
        } else {
            openSection(id);
            return;
        }
        persistSectionOrder();
    }

    const sections = SETTINGS_SECTIONS;

    // Filter sections by active tier (basic shows basic, advanced shows basic+advanced, developer shows all)
    const TIER_RANK: Record<SettingsTier, number> = {
        basic: 0,
        advanced: 1,
        developer: 2,
    };
    let activeTerritoryRenderMode = $derived(
        (panel.territoryRenderMode ?? GAME_CONFIG.TERRITORY_RENDER_MODE ?? null) as
            | string
            | null,
    );
    const TERRITORY_MODE_SECTION_BY_RENDER_MODE: Partial<
        Record<string, SectionId>
    > = {
        metaball_grid_phase_field: "territory_phase_field",
        metaball_grid_phase_edges: "territory_phase_edges",
        metaball_grid_ember_lattice: "territory_ember_lattice",
    };

    const TERRITORY_MODE_SECTION_IDS = new Set<SectionId>([
        "territory_phase_field",
        "territory_phase_edges",
        "territory_ember_lattice",
    ]);

    let activeTerritoryModeSectionId = $derived(
        activeTerritoryRenderMode
            ? (TERRITORY_MODE_SECTION_BY_RENDER_MODE[
                  activeTerritoryRenderMode
              ] ?? null)
            : null,
    );

    function isSectionVisible(section: SettingsSectionDefinition): boolean {
        if (!canAccessAudience(section.audience, audienceAccess)) return false;
        if (TIER_RANK[section.tier] > TIER_RANK[activeTier]) return false;
        if (TERRITORY_MODE_SECTION_IDS.has(section.id as SectionId)) {
            return section.id === activeTerritoryModeSectionId;
        }
        if (section.id === "frontier_fx") {
            return (
                activeTerritoryRenderMode === "metaball_grid_phase_edges" ||
                activeTerritoryRenderMode === "metaball_grid_ember_lattice"
            );
        }
        return true;
    }
    let visibleSections = $derived(
        sections.filter((section) => isSectionVisible(section)),
    );

    // Most recently opened visible sections first.
    let orderedOpenSections = $derived(
        [...sectionOrder]
            .reverse()
            .map((id) => visibleSections.find((section) => section.id === id))
            .filter(Boolean) as typeof sections,
    );
    let hasVisibleOpenSections = $derived(orderedOpenSections.length > 0);

    let lastForceOpenSectionNonce = $state(-1);
    $effect(() => {
        if (!forceOpenSection) return;
        if (forceOpenSectionNonce === lastForceOpenSectionNonce) return;
        lastForceOpenSectionNonce = forceOpenSectionNonce;
        ensureSectionAudience(getSectionDefinition(forceOpenSection));
        openSection(forceOpenSection);
    });

    interface SubsectionChip {
        id: string;
        label: string;
        icon: string;
    }

    interface SectionBodyParams {
        sectionId: SectionId;
        activeSubsection: string;
    }

    const SEARCH_TARGET_SELECTOR =
        ".var-name, .toggle-label, .offset-label, .capture-label, .slider-label, .log-label, [data-setting-config-key]";

    function resolveSectionSubsections(
        section: SettingsSectionDefinition,
    ): SubsectionChip[] {
        const subsections = [...((section.subsections ?? []) as SubsectionChip[])];
        if (section.id !== "territory_styles") return subsections;
        if (
            activeTerritoryRenderMode === "metaball_grid" ||
            activeTerritoryRenderMode === "metaball_grid_phase_edges"
        ) {
            return subsections.filter((subsection) => subsection.id !== "finish");
        }
        return subsections;
    }

    let sectionSubsections = $derived.by(() =>
        Object.fromEntries(
            sections.map((section) => [
                section.id,
                resolveSectionSubsections(section),
            ]),
        ) as Record<string, SubsectionChip[]>,
    );
    let activeSubsections = $state<Record<string, string>>({});
    let settingsSearchQuery = $state("");
    const sectionBodyNodes = new Map<SectionId, HTMLElement>();
    let settingsSearchResults = $derived.by(() =>
        searchSettings(settingsSearchQuery, 24, activeTerritoryRenderMode).filter(
            (result) =>
                canAccessAudience(
                    getSectionDefinition(result.sectionId).audience,
                    audienceAccess,
                ),
        ),
    );
    let matchedSectionIds = $derived.by(() =>
        settingsSearchQuery.trim()
            ? new Set(settingsSearchResults.map((result) => result.sectionId))
            : null,
    );

    $effect(() => {
        let next = activeSubsections;
        let changed = false;
        for (const section of sections) {
            const active = activeSubsections[section.id] ?? "all";
            if (active === "all") continue;
            const allowed = sectionSubsections[section.id] ?? [];
            if (allowed.some((subsection) => subsection.id === active)) continue;
            next = { ...next, [section.id]: "all" };
            changed = true;
        }
        if (changed) {
            activeSubsections = next;
        }
    });

    function getSectionDefinition(sectionId: SectionId): SettingsSectionDefinition {
        return sections.find((section) => section.id === sectionId) ?? sections[0];
    }

    function normalizeSearchLookup(value: string): string {
        return value
            .toLowerCase()
            .replace(/[_-]+/g, " ")
            .replace(/[^\p{L}\p{N}\s.]/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function ensureSectionAudience(section: SettingsSectionDefinition) {
        if (section.audience === "advanced" && !advancedSectionsVisible) {
            onRequestShowAdvanced?.();
        }
        if (section.audience === "internal" && !internalSectionsVisible) {
            onRequestInternalTools?.();
        }
    }

    function revealSearchSection(sectionId: SectionId) {
        const section = getSectionDefinition(sectionId);
        ensureSectionAudience(section);
        openSection(sectionId);
    }

    function resolveSearchTargetElement(
        node: HTMLElement,
        result: SettingsSearchResult,
    ): HTMLElement | null {
        const anchorNeedle = normalizeSearchLookup(
            `${result.anchorText ?? ""} ${result.configKey ?? ""}`,
        );
        if (!anchorNeedle) return null;
        const candidates = Array.from(
            node.querySelectorAll<HTMLElement>(SEARCH_TARGET_SELECTOR),
        );
        return (
            candidates.find((candidate) => {
                const candidateText = normalizeSearchLookup(
                    [
                        candidate.textContent ?? "",
                        candidate.dataset.settingLabel ?? "",
                        candidate.dataset.settingConfigKey ?? "",
                        candidate.dataset.settingDescription ?? "",
                    ].join(" "),
                );
                return (
                    candidateText.includes(anchorNeedle) ||
                    anchorNeedle.includes(candidateText)
                );
            }) ?? null
        );
    }

    function flashSearchTarget(target: HTMLElement) {
        target.classList.add("settings-search-hit");
        setTimeout(() => target.classList.remove("settings-search-hit"), 1800);
    }

    async function navigateToSearchResult(result: SettingsSearchResult) {
        revealSearchSection(result.sectionId);
        if (result.subsectionId) {
            activeSubsections = {
                ...activeSubsections,
                [result.sectionId]: result.subsectionId,
            };
        }
        await tick();
        await tick();
        const sectionNode = sectionBodyNodes.get(result.sectionId);
        if (!sectionNode) return;
        const target =
            resolveSearchTargetElement(sectionNode, result) ?? sectionNode;
        const scrollTarget =
            target.closest(
                ".var-row, .toggle-row, .engine-control-group, .theme-card, section",
            ) ?? target;
        (scrollTarget as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
        flashSearchTarget(scrollTarget as HTMLElement);
    }

    async function handleSearchSubmit() {
        const firstResult = settingsSearchResults[0];
        if (!firstResult) return;
        await navigateToSearchResult(firstResult);
    }

    function clearSettingsSearch() {
        settingsSearchQuery = "";
    }

    function applySubsectionFilter(
        node: HTMLElement,
        sectionId: SectionId,
        activeSubsection: string,
    ) {
        const active = activeSubsections[sectionId] ?? activeSubsection ?? "all";
        for (const child of Array.from(node.children) as HTMLElement[]) {
            const subsectionId = child.dataset.subsectionId;
            const hidden =
                active !== "all" &&
                subsectionId != null &&
                subsectionId !== active;
            child.classList.toggle("is-hidden-by-subsection", hidden);
        }
    }

    function registerSectionBody(node: HTMLElement, params: SectionBodyParams) {
        let current = params;
        sectionBodyNodes.set(params.sectionId, node);
        const refresh = () =>
            queueMicrotask(() =>
                applySubsectionFilter(
                    node,
                    current.sectionId,
                    current.activeSubsection,
                ),
            );

        refresh();

        return {
            update(next: SectionBodyParams) {
                if (current.sectionId !== next.sectionId) {
                    sectionBodyNodes.delete(current.sectionId);
                    sectionBodyNodes.set(next.sectionId, node);
                }
                current = next;
                refresh();
            },
            destroy() {
                if (sectionBodyNodes.get(current.sectionId) === node) {
                    sectionBodyNodes.delete(current.sectionId);
                }
            },
        };
    }

    function toggleSubsection(sectionId: SectionId, subsectionId: string) {
        const current = activeSubsections[sectionId] ?? "all";
        activeSubsections = {
            ...activeSubsections,
            [sectionId]: current === subsectionId ? "all" : subsectionId,
        };
    }
</script>

<div class="controls-panel" use:nudgeSliders>
    <!-- Tier Toggle (hidden — F-164: show all sections by default) -->
    <div class="tier-bar" style="display: none;">
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

    <div class="settings-header-tools">
        <label class="settings-search-label" for="settings-search-input">
            Search Settings
        </label>
        <div class="settings-search-row">
            <input
                id="settings-search-input"
                class="settings-search-input"
                type="search"
                placeholder="Search labels, panel copy, config keys, variables..."
                bind:value={settingsSearchQuery}
                onkeydown={async (event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        await handleSearchSubmit();
                    } else if (event.key === "Escape" && settingsSearchQuery.trim()) {
                        event.preventDefault();
                        clearSettingsSearch();
                    }
                }}
            />
            {#if settingsSearchQuery.trim()}
                <button
                    class="settings-search-clear"
                    type="button"
                    onclick={clearSettingsSearch}
                    title="Clear search"
                >
                    ✕
                </button>
            {/if}
        </div>

        {#if settingsSearchQuery.trim()}
            <div class="settings-search-results">
                <div class="settings-search-summary">
                    {settingsSearchResults.length} match{settingsSearchResults.length === 1 ? "" : "es"}
                </div>
                {#if settingsSearchResults.length === 0}
                    <div class="settings-search-empty">
                        No matches. Try a control label, helper phrase, config key, or variable name.
                    </div>
                {:else}
                    {#each settingsSearchResults as result}
                        <button
                            type="button"
                            class="settings-search-result"
                            onclick={() => void navigateToSearchResult(result)}
                        >
                            <span class="settings-search-result__title">{result.title}</span>
                            <span class="settings-search-result__meta">
                                {result.sectionLabel}
                                {#if result.configKey}
                                    · {result.configKey}
                                {/if}
                            </span>
                            <span class="settings-search-result__snippet">{result.snippet}</span>
                        </button>
                    {/each}
                {/if}
            </div>
        {/if}

        {#if false}
        <div class="settings-utility-groups">
            <div class="settings-utility-card">
                <div class="settings-utility-card__label">Map</div>
                <div class="settings-utility-card__actions">
                    <button
                        class="full-io-btn full-load-map-btn"
                        onclick={() => toggleUtilityDrawer("loadMap")}
                        title="Load a saved map and restart the current game"
                    >
                        Load
                    </button>
                    <button
                        class="full-io-btn"
                        onclick={() => toggleUtilityDrawer("saveMap")}
                        title="Save the current map topology"
                    >
                        Save
                    </button>
                </div>
            </div>
            <div class="settings-utility-card">
                <div class="settings-utility-card__label">Game + Map</div>
                <div class="settings-utility-card__actions">
                    <button
                        class="full-io-btn full-load-map-btn"
                        onclick={() => toggleUtilityDrawer("loadGame")}
                        title="Load a saved game and resume the full session"
                    >
                        Load
                    </button>
                    <button
                        class="full-io-btn"
                        onclick={() => toggleUtilityDrawer("saveGame")}
                        title="Save the current game state and map"
                    >
                        Save
                    </button>
                </div>
            </div>
            <div class="settings-utility-card">
                <div class="settings-utility-card__label">Session</div>
                <div class="settings-utility-card__actions">
                    <button
                        class="full-io-btn"
                        onclick={handleQuitFromSettings}
                        title="Exit to the main menu"
                    >
                        Quit
                    </button>
                    <button
                        class="full-io-btn"
                        onclick={handleRestartFromSettings}
                        title="Restart using the current match setup"
                    >
                        Restart
                    </button>
                </div>
            </div>
        </div>
        {#if showSaveMapDrawer}
            <div class="full-load-map-drawer">
                <div class="settings-inline-row">
                    <input
                        class="settings-inline-input"
                        type="text"
                        placeholder="Map name"
                        bind:value={saveMapName}
                        onkeydown={(event) => {
                            if (event.key === "Enter") handleSaveMapFromSettings();
                            if (event.key === "Escape") showSaveMapDrawer = false;
                        }}
                    />
                    <button
                        class="full-io-btn"
                        onclick={handleSaveMapFromSettings}
                        disabled={!saveMapName.trim()}
                    >
                        Save
                    </button>
                </div>
            </div>
        {/if}
        {#if showLoadMapDrawer}
            <div class="full-load-map-drawer">
                {#if gameStore.savedMaps.length === 0}
                    <div class="full-load-map-empty">No saved maps available.</div>
                {:else}
                    <div class="full-load-map-list">
                        {#each getLoadableMaps() as map}
                            <button
                                class="full-load-map-item"
                                onclick={() => void handleLoadMapFromSettings(map)}
                                title={`Load ${map.metadata.name}`}
                            >
                                <span class="full-load-map-item__name">{map.metadata.name}</span>
                                <span class="full-load-map-item__meta">
                                    {Boolean((map as any).builtIn) ? "Classic" : "Custom"} · {map.stars.length} stars · {map.connections.length} links
                                </span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
        {#if showSaveGameDrawer}
            <div class="full-load-map-drawer">
                <div class="settings-inline-row">
                    <input
                        class="settings-inline-input"
                        type="text"
                        placeholder="Save name"
                        bind:value={saveGameName}
                        onkeydown={(event) => {
                            if (event.key === "Enter") handleSaveGameFromSettings();
                            if (event.key === "Escape") showSaveGameDrawer = false;
                        }}
                    />
                    <button
                        class="full-io-btn"
                        onclick={handleSaveGameFromSettings}
                        disabled={!saveGameName.trim()}
                    >
                        Save
                    </button>
                </div>
            </div>
        {/if}
        {#if showLoadGameDrawer}
            <div class="full-load-map-drawer">
                {#if gameStore.savedGames.length === 0}
                    <div class="full-load-map-empty">No saved games available.</div>
                {:else}
                    <div class="full-load-map-list">
                        {#each getSavedGames() as game}
                            <div class="full-load-map-item full-load-map-item--saved-game">
                                <button
                                    class="full-load-map-item__button"
                                    onclick={() => void handleLoadSavedGameFromSettings(game)}
                                    title={`Load ${game.name}`}
                                >
                                    <span class="full-load-map-item__name">{game.name}</span>
                                    <span class="full-load-map-item__meta">
                                        Tick {game.tick} · {new Date(game.createdAt).toLocaleDateString()}
                                    </span>
                                </button>
                                <button
                                    class="full-io-btn full-reset-btn full-delete-btn"
                                    onclick={() => handleDeleteSavedGameFromSettings(game.id)}
                                    title="Delete saved game"
                                >
                                    ✕
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
        {/if}
        {#if internalSectionsVisible}
            <div class="settings-utility-row settings-utility-row--internal">
                <button
                    class="full-io-btn full-export-btn"
                    onclick={() => {
                        exportConfigJSONBase();
                        configStatus = "Exported JSON";
                        configStatusColor = "#4ade80";
                    }}
                    title="Export the current game config as JSON"
                >
                    JSON
                </button>
                <button
                    class="full-io-btn full-export-btn"
                    onclick={exportConfigMD}
                    title="Export the current game config as Markdown"
                >
                    Markdown
                </button>
                <button
                    class="full-io-btn full-import-btn"
                    onclick={() => {
                        const input = document.getElementById(
                            "settings-config-import-input",
                        ) as HTMLInputElement | null;
                        input?.click();
                    }}
                    title="Import a saved game config from JSON"
                >
                    Import
                </button>
                {#if advancedSectionsVisible}
                    <button
                        class="full-io-btn full-reset-btn"
                        onclick={resetToDefaults}
                        title="Clear all localStorage and reset to factory defaults (Phase Field Default)"
                    >
                        Clear All
                    </button>
                {/if}
            </div>
            <input
                id="settings-config-import-input"
                type="file"
                accept=".json"
                style="display:none;"
                onchange={importConfigJSON}
            />
        {/if}
        {#if configStatus}
            <div class="settings-utility-status" style={`color:${configStatusColor};`}>
                {configStatus}
            </div>
        {/if}

        {#if false}
        <div class="settings-utility-row">
            {#if internalSectionsVisible}
                <button
                    class="full-io-btn full-export-btn"
                    onclick={() => {
                        exportConfigJSONBase();
                        configStatus = "✅ Exported JSON";
                        configStatusColor = "#4ade80";
                    }}
                    title="Export the current game config as JSON"
                >
                    📥 Export JSON
                </button>
                <button
                    class="full-io-btn full-export-btn"
                    onclick={exportConfigMD}
                    title="Export the current game config as Markdown"
                >
                    📄 Export MD
                </button>
                <button
                    class="full-io-btn full-import-btn"
                    onclick={() => {
                        const input = document.getElementById(
                            "settings-config-import-input",
                        ) as HTMLInputElement | null;
                        input?.click();
                    }}
                    title="Import a saved game config from JSON"
                >
                    📤 Import JSON
                </button>
            {/if}
            <button
                class="full-io-btn full-load-map-btn"
                onclick={() => {
                    showLoadMapDrawer = !showLoadMapDrawer;
                }}
                title="Load a saved map and restart the current game"
            >
                🗺 Load Map
            </button>
            {#if advancedSectionsVisible}
                <button
                    class="full-io-btn full-reset-btn"
                    onclick={resetToDefaults}
                    title="Clear all localStorage and reset to factory defaults (Phase Field Default)"
                >
                    🗑️ Clear All
                </button>
            {/if}
        </div>
        <input
            id="settings-config-import-input"
            type="file"
            accept=".json"
            style="display:none;"
            onchange={importConfigJSON}
        />
        {#if configStatus}
            <div class="settings-utility-status" style={`color:${configStatusColor};`}>
                {configStatus}
            </div>
        {/if}

        {#if showLoadMapDrawer}
            <div class="full-load-map-drawer">
                {#if gameStore.savedMaps.length === 0}
                    <div class="full-load-map-empty">No saved maps available.</div>
                {:else}
                    <div class="full-load-map-list">
                        {#each getLoadableMaps() as map}
                            <button
                                class="full-load-map-item"
                                onclick={() => void handleLoadMapFromSettings(map)}
                                title={`Load ${map.metadata.name}`}
                            >
                                <span class="full-load-map-item__name">{map.metadata.name}</span>
                                <span class="full-load-map-item__meta">
                                    {Boolean((map as any).builtIn) ? "Classic" : "Custom"} · {map.stars.length} stars · {map.connections.length} links
                                </span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
        {/if}
    </div>

    <!-- Icon Toolbar -->
    <div class="icon-toolbar" class:has-active={hasVisibleOpenSections}>
        {#each visibleSections as s}
            <button
                class="icon-btn"
                class:active={openSections.has(s.id)}
                class:search-hit={matchedSectionIds?.has(s.id)}
                class:search-dim={matchedSectionIds && !matchedSectionIds.has(s.id)}
                style="--accent: {s.color}"
                onclick={() => toggleSection(s.id)}
                title={s.label}
            >
                <span class="icon-emoji">{s.icon}</span>
                {#if !hasVisibleOpenSections}
                    <span class="icon-label">{s.label}</span>
                {/if}
            </button>
        {/each}
        {#if advancedSectionsVisible}
            <button
                class="icon-btn reset-icon"
                title="Reset All"
                onclick={resetToDefaults}
            >
                <span class="icon-emoji">↺</span>
                {#if !hasVisibleOpenSections}
                    <span class="icon-label">Reset</span>
                {/if}
            </button>
        {/if}
    </div>

    <!-- Stacked Section Panels -->
    {#each orderedOpenSections as sec (sec.id)}
        <div class="section-panel" style="--accent: {sec.color}">
            <div class="section-head-wrap">
                <button class="section-head" onclick={() => toggleSection(sec.id)}>
                    <span class="head-icon">{sec.icon}</span>
                    <span class="head-label">{sec.label}</span>
                    <span class="head-close">✕</span>
                </button>
                {#if (sectionSubsections[sec.id]?.length ?? 0) > 0}
                    <div class="section-subnav">
                        <button
                            class="subsection-chip"
                            class:active={(activeSubsections[sec.id] ?? "all") === "all"}
                            type="button"
                            onclick={() => toggleSubsection(sec.id, "all")}
                        >
                            <span class="subsection-chip__icon">◌</span>
                            <span>All</span>
                        </button>
                        {#each sectionSubsections[sec.id] ?? [] as subsection}
                            <button
                                class="subsection-chip"
                                class:active={(activeSubsections[sec.id] ?? "all") === subsection.id}
                                type="button"
                                onclick={() => toggleSubsection(sec.id, subsection.id)}
                                title={subsection.label}
                            >
                                <span class="subsection-chip__icon">{subsection.icon}</span>
                                <span>{subsection.label}</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <div
                class="section-body"
                use:registerSectionBody={{
                    sectionId: sec.id,
                    activeSubsection: activeSubsections[sec.id] ?? "all",
                }}
                use:enhanceSettingMetadata={{
                    scope: getSectionDefinition(sec.id).scope,
                }}
            >
                {#if sec.id === "match_flow"}
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
                {:else if sec.id === "combat_tuning"}
                    <ControlsSectionBattle
                        {panel}
                        {updatePanel}
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
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "travel_orders"}
                    <ControlsSectionTravel
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
                {:else if sec.id === "effects"}
                    <ControlsSectionSurge
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "territory_tuning"}
                    <TerritoryTopologyTuning
                        {panel}
                        {updatePanel}
                    />
                    <TerritoryGeometrySourceTuning
                        {panel}
                        {updatePanel}
                    />
                    <ControlsSectionTerritory
                        {panel}
                        {updatePanel}
                        {animLockModes}
                        {animLockRatios}
                        {getAnimValue}
                        {setAnimValue}
                        {formatAnimValue}
                        {pinValueToTickDuration}
                        {lockRatioToTick}
                        {lockRatioToAnimSpeed}
                        syncFromConfig={syncAllFromConfig}
                        view="modes"
                        hideRenderModeSelector={true}
                        systemTitle="Territory Runtime"
                    />
                {:else if sec.id === "territory_phase_field"}
                    <TerritoryPhaseFieldSettings
                        {panel}
                        {updatePanel}
                    />
                {:else if sec.id === "territory_phase_edges"}
                    <ControlsSectionTerritory
                        {panel}
                        {updatePanel}
                        {animLockModes}
                        {animLockRatios}
                        {getAnimValue}
                        {setAnimValue}
                        {formatAnimValue}
                        {pinValueToTickDuration}
                        {lockRatioToTick}
                        {lockRatioToAnimSpeed}
                        syncFromConfig={syncAllFromConfig}
                        view="styles"
                        activeSubsection={activeSubsections[sec.id] ?? "all"}
                    />
                {:else if sec.id === "territory_ember_lattice"}
                    <ControlsSectionTerritory
                        {panel}
                        {updatePanel}
                        {animLockModes}
                        {animLockRatios}
                        {getAnimValue}
                        {setAnimValue}
                        {formatAnimValue}
                        {pinValueToTickDuration}
                        {lockRatioToTick}
                        {lockRatioToAnimSpeed}
                        syncFromConfig={syncAllFromConfig}
                        view="styles"
                        activeSubsection={activeSubsections[sec.id] ?? "all"}
                    />
                {:else if sec.id === "territory_styles"}
                    <ControlsSectionTerritory
                        {panel}
                        {updatePanel}
                        {animLockModes}
                        {animLockRatios}
                        {getAnimValue}
                        {setAnimValue}
                        {formatAnimValue}
                        {pinValueToTickDuration}
                        {lockRatioToTick}
                        {lockRatioToAnimSpeed}
                        syncFromConfig={syncAllFromConfig}
                        view="styles"
                        showCategoryThemeBar={true}
                        activeSubsection={activeSubsections[sec.id] ?? "all"}
                    />
                {:else if sec.id === "frontier_fx"}
                    <ControlsSectionFrontierFx
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "fleet_star_visuals"}
                    <ControlsSectionShips
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "players"}
                    <ControlsSectionPlayers
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "map_options"}
                    <ControlsSectionVisuals
                        {panel}
                        {updatePanel}
                        {vis}
                        {updateVisual}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "logging"}
                    <ControlsSectionLogging
                        {logCategories}
                        {logRefresh}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "audio"}
                    <ControlsSectionAudio
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "diagnostics"}
                    <ControlsSectionDiagnostics
                        {panel}
                        {updatePanel}
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
    .icon-btn.search-hit {
        border-color: color-mix(in srgb, var(--accent) 58%, rgba(255, 255, 255, 0.18));
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
    }
    .icon-btn.search-dim {
        opacity: 0.46;
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
    :global(.settings-search-hit) {
        animation: settings-search-hit-flash 1.8s ease;
    }
    .section-head-wrap {
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        background: color-mix(in srgb, var(--accent) 9%, transparent);
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
    @keyframes settings-search-hit-flash {
        0% {
            background: rgba(37, 99, 235, 0.12);
            box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.35);
        }
        40% {
            background: rgba(37, 99, 235, 0.2);
            box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.28);
        }
        100% {
            background: transparent;
            box-shadow: 0 0 0 0 rgba(96, 165, 250, 0);
        }
    }

    .section-head {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 10px 12px 8px;
        background: transparent;
        border: none;
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
        font-size: 15px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.1px;
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
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
        overflow-y: auto;
        min-height: 0;
    }
    .section-subnav {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 0 12px 12px;
    }
    .subsection-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(7, 12, 24, 0.45);
        color: rgba(226, 232, 240, 0.84);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s,
            background 0.15s,
            color 0.15s,
            transform 0.15s;
    }
    .subsection-chip:hover {
        border-color: color-mix(
            in srgb,
            var(--accent) 60%,
            rgba(255, 255, 255, 0.12)
        );
        background: color-mix(in srgb, var(--accent) 10%, rgba(7, 12, 24, 0.5));
        color: rgba(241, 245, 249, 0.96);
        transform: translateY(-1px);
    }
    .subsection-chip.active {
        border-color: color-mix(
            in srgb,
            var(--accent) 76%,
            rgba(255, 255, 255, 0.12)
        );
        background: color-mix(in srgb, var(--accent) 18%, rgba(7, 12, 24, 0.6));
        color: rgba(248, 250, 252, 0.98);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent);
    }
    .subsection-chip__icon {
        display: inline-grid;
        place-items: center;
        width: 14px;
        font-size: 11px;
        line-height: 1;
        opacity: 0.92;
    }
    :global(.is-hidden-by-subsection) {
        display: none !important;
    }
    /* ── Controls ── */
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
        font-size: 11px;
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

    .settings-header-tools {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px 10px 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .settings-search-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(226, 232, 240, 0.74);
    }

    .settings-search-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .settings-search-input {
        flex: 1;
        min-width: 0;
        padding: 10px 12px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.66);
        color: #f8fafc;
        font-size: 13px;
    }

    .settings-search-input:focus {
        outline: none;
        border-color: rgba(96, 165, 250, 0.68);
        box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.18);
    }

    .settings-search-input::placeholder {
        color: rgba(148, 163, 184, 0.74);
    }

    .settings-search-clear {
        width: 34px;
        height: 34px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(226, 232, 240, 0.74);
        cursor: pointer;
        transition:
            background 0.18s,
            border-color 0.18s,
            color 0.18s;
    }

    .settings-search-clear:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.24);
        color: #fff;
    }

    .settings-search-results {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 260px;
        overflow-y: auto;
        padding: 4px 2px 0;
    }

    .settings-search-summary {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(148, 163, 184, 0.88);
    }

    .settings-search-empty {
        padding: 10px 12px;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.42);
        color: rgba(203, 213, 225, 0.78);
        font-size: 12px;
        line-height: 1.45;
    }

    .settings-search-result {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        width: 100%;
        padding: 10px 12px;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.46);
        color: #e2e8f0;
        cursor: pointer;
        text-align: left;
        transition:
            background 0.18s,
            border-color 0.18s,
            transform 0.18s;
    }

    .settings-search-result:hover {
        background: rgba(30, 41, 59, 0.8);
        border-color: rgba(96, 165, 250, 0.34);
        transform: translateY(-1px);
    }

    .settings-search-result__title {
        font-size: 12px;
        font-weight: 700;
        color: #f8fafc;
    }

    .settings-search-result__meta {
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #93c5fd;
    }

    .settings-search-result__snippet {
        font-size: 11px;
        line-height: 1.4;
        color: rgba(203, 213, 225, 0.8);
    }

    .settings-utility-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }
    .settings-utility-row--internal {
        padding-top: 2px;
    }
    .settings-utility-groups {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
    }
    .settings-utility-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(15, 23, 42, 0.46);
        min-width: 0;
    }
    .settings-utility-card__label {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(226, 232, 240, 0.78);
    }
    .settings-utility-card__actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
    }
    .full-io-btn {
        flex: 1 1 120px;
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
    .settings-utility-status {
        margin-top: 4px;
        font-size: 10px;
        line-height: 1.35;
    }
    .full-export-btn {
        border-color: rgba(74, 222, 128, 0.22);
        color: #b8f5c8;
    }
    .full-export-btn:hover {
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.15);
    }
    .full-import-btn {
        border-color: rgba(250, 204, 21, 0.22);
        color: #fce588;
    }
    .full-import-btn:hover {
        box-shadow: 0 0 8px rgba(250, 204, 21, 0.15);
    }
    .full-reset-btn {
        border-color: rgba(255, 68, 68, 0.35);
        color: #ff8888;
    }
    .full-reset-btn:hover {
        background: rgba(255, 68, 68, 0.1);
        border-color: #ff4444;
        color: #ff4444;
        box-shadow: 0 0 8px rgba(255, 68, 68, 0.25);
    }
    .full-delete-btn {
        flex: 0 0 auto;
        min-width: 42px;
        padding-inline: 0;
    }
    .full-load-map-btn {
        border-color: rgba(125, 211, 252, 0.28);
        color: #c7e7ff;
    }
    .full-load-map-btn:hover {
        border-color: rgba(125, 211, 252, 0.45);
        box-shadow: 0 0 8px rgba(125, 211, 252, 0.18);
    }
    .full-load-map-drawer {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 6px;
        border-radius: 8px;
        border: 1px solid rgba(125, 211, 252, 0.15);
        background: rgba(9, 14, 24, 0.78);
    }
    .full-load-map-empty {
        padding: 10px 12px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
        color: #8993a4;
        font-size: 11px;
    }
    .full-load-map-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
        max-height: 220px;
        overflow-y: auto;
    }
    .full-load-map-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        width: 100%;
        padding: 8px 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.04);
        color: #d7e2f0;
        cursor: pointer;
        text-align: left;
        transition:
            border-color 0.15s,
            background 0.15s,
            transform 0.15s;
    }
    .full-load-map-item--saved-game {
        flex-direction: row;
        align-items: center;
        gap: 6px;
    }
    .full-load-map-item__button {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        width: 100%;
        padding: 8px 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.04);
        color: #d7e2f0;
        cursor: pointer;
        text-align: left;
        transition:
            border-color 0.15s,
            background 0.15s,
            transform 0.15s;
    }
    .full-load-map-item:hover {
        border-color: rgba(125, 211, 252, 0.32);
        background: rgba(125, 211, 252, 0.08);
        transform: translateY(-1px);
    }
    .full-load-map-item__button:hover {
        border-color: rgba(125, 211, 252, 0.32);
        background: rgba(125, 211, 252, 0.08);
        transform: translateY(-1px);
    }
    .full-load-map-item__name {
        font-size: 12px;
        font-weight: 700;
        color: #eef6ff;
    }
    .full-load-map-item__meta {
        font-size: 10px;
        letter-spacing: 0.03em;
        color: #8ea3bc;
    }
    .settings-inline-row {
        display: flex;
        gap: 8px;
        align-items: stretch;
    }
    .settings-inline-input {
        flex: 1;
        min-width: 0;
        padding: 9px 12px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.72);
        color: #f8fafc;
        font-size: 13px;
    }
    .settings-inline-input:focus {
        outline: none;
        border-color: rgba(96, 165, 250, 0.68);
        box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.18);
    }

    @media (max-width: 860px) {
        .settings-utility-groups {
            grid-template-columns: 1fr;
        }
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
