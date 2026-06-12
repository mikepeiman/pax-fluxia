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
        TIER_STORAGE_KEY,
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
        loadTier,
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
    import ThemeLibraryPanel from "$lib/components/game-hud/ThemeLibraryPanel.svelte";
    import HudThemePanel from "$lib/components/game-hud/HudThemePanel.svelte";
    import TypographyTokenPanel from "$lib/components/game-hud/TypographyTokenPanel.svelte";
    import {
        PaxHudButton,
        PaxHudIconButton,
        PaxSettingsDrawer,
        PaxSettingsInfoRow,
    } from "$lib/design-system";
    import HudIcon from "./hud/HudIcon.svelte";

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

    let tickInterval = $state(GAME_CONFIG.BASE_TICK_MS);
    let activeTier = $state<SettingsTier>(loadTier());

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
        configStatus = `Exported MD`;

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
                    configStatus = "Invalid JSON - could not parse file";
                    configStatusColor = "#f87171";
                    input.value = "";
                    return;
                }

                if (!data || typeof data !== "object" || Array.isArray(data)) {
                    configStatus = "Expected a JSON object with config keys";
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

                const parts = [`${applied} applied`];
                if (skipped) parts.push(`${skipped} unknown`);
                if (typeErrors) parts.push(`${typeErrors} type mismatches`);
                configStatus = parts.join(", ");
                configStatusColor = typeErrors > 0 ? "#fbbf24" : "#4ade80";
            } catch (err) {
                configStatus = `Import failed: ${(err as Error).message}`;
                configStatusColor = "#f87171";
            }
            input.value = "";
        };
        reader.readAsText(file);
    }

    // =========================================================================
    // Tick-Ratio Locking — bind animation durations proportionally to tick
    // =========================================================================

    /** Pin value exactly to tick duration (ms -> BASE_TICK_MS, multipliers -> 1.0) */
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

    /** Lock current ratio relative to tick (value scales proportionally when tick changes) */
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

    /** Lock current ratio relative to animation speed (value scales when anim speed changes) */
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

    // =========================================================================
    // Settings header utilities
    // =========================================================================

    // =========================================================================
    // Icon Toolbar — sections definition
    // =========================================================================
    type SectionId = SettingsSectionId;

    interface Props {
        forceOpenSection?: SectionId | null;
        forceOpenSectionNonce?: number;
        ribbonExpanded?: boolean;
        onToggleRibbonExpanded?: () => void;
        dockSide?: "left" | "right";
        onToggleDockSide?: () => void;
        onSectionActivityChange?: (hasOpenSections: boolean) => void;
        onCloseSettings?: () => void;
        onRestartGame?: () => void;
        onQuitGame?: () => void;
    }

    let {
        forceOpenSection = null,
        forceOpenSectionNonce = 0,
        ribbonExpanded = false,
        onToggleRibbonExpanded,
        dockSide = "right",
        onToggleDockSide,
        onSectionActivityChange,
        onCloseSettings,
        onRestartGame,
        onQuitGame,
    }: Props = $props();

    type SettingsToolId =
        | "theme_library"
        | "appearance"
        | "combat_tuning"
        | "audio"
        | "video_graphics"
        | "stats"
        | "diagnostics"
        | "restart"
        | "quit"
        | "hotkeys"
        | "help";

    interface SettingsToolDefinition {
        id: SettingsToolId;
        icon: string;
        label: string;
        color: string;
        sectionId?: SectionId;
        action?: "restart" | "quit";
    }

    const SETTINGS_TOOLS: readonly SettingsToolDefinition[] = [
        { id: "theme_library", icon: "library", label: "Themes", color: "#f6c469" },
        {
            id: "appearance",
            icon: "gem",
            label: "Appearance",
            color: "#5ee6ff",
            sectionId: "map_options",
        },
        {
            id: "combat_tuning",
            icon: "combat",
            label: "Combat Tuning",
            color: "#ff8a94",
            sectionId: "combat_tuning",
        },
        { id: "audio", icon: "audio", label: "Audio", color: "#44ddbb", sectionId: "audio" },
        {
            id: "video_graphics",
            icon: "draw-polygon",
            label: "Video / Graphics",
            color: "#93c5fd",
            sectionId: "fleet_star_visuals",
        },
        { id: "stats", icon: "ranking-star", label: "Stats", color: "#f6c469" },
        {
            id: "diagnostics",
            icon: "diagnostics",
            label: "Diagnostics",
            color: "#f59e0b",
            sectionId: "diagnostics",
        },
        { id: "hotkeys", icon: "keyboard", label: "Hotkeys", color: "#8ab4ff" },
        { id: "help", icon: "help", label: "Help", color: "#a8b6cf" },
        {
            id: "restart",
            icon: "restart",
            label: "Restart",
            color: "#f6c469",
            action: "restart",
        },
        { id: "quit", icon: "quit", label: "Quit", color: "#ff6a7a", action: "quit" },
    ] as const;

    const SECTION_TOOL_BY_ID: Partial<Record<SectionId, SettingsToolId>> = {
        map_options: "appearance",
        territory_styles: "appearance",
        combat_tuning: "combat_tuning",
        audio: "audio",
        fleet_star_visuals: "video_graphics",
        diagnostics: "diagnostics",
    };

    const ACTIVE_SECTION_KEY = "pax-fluxia-open-sections";
    const ACTIVE_TOOL_KEY = "pax-fluxia-active-settings-tool";

    function isSettingsToolId(value: string | null): value is SettingsToolId {
        return SETTINGS_TOOLS.some((tool) => tool.id === value);
    }

    function loadActiveTool(): SettingsToolId | null {
        if (typeof window === "undefined") return null;
        const value = localStorage.getItem(ACTIVE_TOOL_KEY);
        return isSettingsToolId(value) ? value : null;
    }

    const initialActiveToolId = loadActiveTool();
    let activeToolId = $state<SettingsToolId | null>(initialActiveToolId);
    let activeTool = $derived(
        activeToolId
            ? SETTINGS_TOOLS.find((tool) => tool.id === activeToolId) ?? null
            : null,
    );
    let activeToolHasPanel = $derived(Boolean(activeTool && !activeTool.action));

    function persistActiveTool() {
        if (typeof window === "undefined") return;
        if (activeToolId) {
            localStorage.setItem(ACTIVE_TOOL_KEY, activeToolId);
        } else {
            localStorage.removeItem(ACTIVE_TOOL_KEY);
        }
    }

    function setActiveTool(id: SettingsToolId | null) {
        activeToolId = id;
        const tool = id
            ? SETTINGS_TOOLS.find((candidate) => candidate.id === id) ?? null
            : null;
        sectionOrder = tool?.sectionId ? [tool.sectionId] : [];
        persistActiveTool();
        persistSectionOrder();
    }

    function handleToolClick(tool: SettingsToolDefinition) {
        if (tool.action === "restart") {
            onRestartGame?.();
            return;
        }
        if (tool.action === "quit") {
            onQuitGame?.();
            return;
        }
        setActiveTool(activeToolId === tool.id ? null : tool.id);
    }

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
    let sectionOrder = $state<SectionId[]>((() => {
        const loadedSections = loadOpenSections();
        const startupTool = initialActiveToolId
            ? SETTINGS_TOOLS.find((tool) => tool.id === initialActiveToolId)
            : null;
        if (startupTool?.sectionId && loadedSections.length === 0) {
            return [startupTool.sectionId];
        }
        return loadedSections;
    })());
    // Set for O(1) membership checks
    let openSections = $derived(new Set(sectionOrder));

    function persistSectionOrder() {
        if (typeof window !== "undefined") {
            localStorage.setItem(
                ACTIVE_SECTION_KEY,
                JSON.stringify(sectionOrder),
            );
        }
    }

    function openSection(id: SectionId) {
        sectionOrder = [id];
        activeToolId = SECTION_TOOL_BY_ID[id] ?? activeToolId;
        persistActiveTool();
        persistSectionOrder();
    }

    function toggleSection(id: SectionId) {
        if (sectionOrder.includes(id)) {
            setActiveTool(null);
            return;
        }
        openSection(id);
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

    $effect(() => {
        onSectionActivityChange?.(activeToolHasPanel);
    });

    let lastForceOpenSectionNonce = $state(-1);
    $effect(() => {
        if (!forceOpenSection) return;
        if (forceOpenSectionNonce === lastForceOpenSectionNonce) return;
        lastForceOpenSectionNonce = forceOpenSectionNonce;
        if (activeTier !== "developer") {
            setTier("developer");
        }
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
        searchSettings(settingsSearchQuery, 24, activeTerritoryRenderMode),
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

    function revealSearchSection(sectionId: SectionId) {
        const section = getSectionDefinition(sectionId);
        if (TIER_RANK[section.tier] > TIER_RANK[activeTier]) {
            setTier(section.tier);
        }
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

<div
    class="controls-panel"
    class:controls-panel--ribbon-expanded={ribbonExpanded}
    class:controls-panel--dock-left={dockSide === "left"}
    use:nudgeSliders>

    <div class="settings-shell" class:settings-shell--with-panel={activeToolHasPanel}>
    <!-- Icon Toolbar -->
    <div class="icon-toolbar" class:has-active={activeToolHasPanel}>
        <div class="icon-toolbar__controls">
            {#if onCloseSettings}
                <PaxHudIconButton
                    icon="chevron-left"
                    size={15}
                    class="icon-toolbar-control"
                    onclick={onCloseSettings}
                    title="Collapse settings to topbar"
                />
            {/if}
            {#if onToggleRibbonExpanded}
                <PaxHudIconButton
                    icon={ribbonExpanded ? "chevron-left" : "chevron-right"}
                    size={15}
                    class="icon-toolbar-control"
                    onclick={onToggleRibbonExpanded}
                    title={ribbonExpanded ? "Collapse section ribbon" : "Expand section ribbon"}
                />
            {/if}
            {#if onToggleDockSide}
                <PaxHudIconButton
                    icon={dockSide === "right" ? "dock-left" : "dock-right"}
                    size={15}
                    class="icon-toolbar-control"
                    onclick={onToggleDockSide}
                    title={dockSide === "right" ? "Move controls to left side" : "Move controls to right side"}
                />
            {/if}
        </div>
        {#each SETTINGS_TOOLS as tool}
            <PaxHudButton
                class={`icon-btn ${tool.action ? "settings-tool-action" : ""} ${tool.id === "quit" ? "settings-tool-danger" : ""}`}
                active={activeToolId === tool.id}
                danger={tool.id === "quit"}
                style="--accent: {tool.color}"
                onclick={() => handleToolClick(tool)}
                title={tool.label}
            >
                <span class="icon-symbol"><HudIcon name={tool.icon} /></span>
                <span class="icon-label">{tool.label}</span>
            </PaxHudButton>
        {/each}
    </div>

    <div class="settings-content">
    {#if activeToolId === "theme_library"}
        <PaxSettingsDrawer
            title="Theme Select / Library"
            icon="library"
            accent="#f6c469"
            onClose={() => setActiveTool(null)}
        >
            <ThemeLibraryPanel />
        </PaxSettingsDrawer>
    {:else if activeToolId === "appearance"}
        <PaxSettingsDrawer
            title="Theme Tuning / Appearance"
            icon="gem"
            accent="#5ee6ff"
            onClose={() => setActiveTool(null)}
        >
            <HudThemePanel />
            <TypographyTokenPanel />
            <ControlsSectionVisuals
                {panel}
                {updatePanel}
                {vis}
                {updateVisual}
                syncFromConfig={syncAllFromConfig}
            />
        </PaxSettingsDrawer>
    {:else if activeToolId === "stats"}
        <PaxSettingsDrawer
            title="Stats"
            icon="ranking-star"
            accent="#f6c469"
            onClose={() => setActiveTool(null)}
        >
            <PaxSettingsInfoRow label="Tick" value={activeGameStore.currentTick ?? 0} />
            <PaxSettingsInfoRow label="Players" value={activeGameStore.players.length} />
            <PaxSettingsInfoRow label="Stars" value={activeGameStore.stars.length} />
            <PaxSettingsInfoRow label="Selected" value={selectedStarStore.id ?? "None"} />
        </PaxSettingsDrawer>
    {:else if activeToolId === "hotkeys"}
        <PaxSettingsDrawer
            title="Hotkeys"
            icon="keyboard"
            accent="#8ab4ff"
            onClose={() => setActiveTool(null)}
        >
            <PaxSettingsInfoRow label="F" value="Fit the map to the viewport." valueAlign="left" />
            <PaxSettingsInfoRow label="Esc" value="Close active overlays or clear search focus." valueAlign="left" />
            <PaxSettingsInfoRow label="Click star" value="Select and inspect a star." valueAlign="left" />
            <PaxSettingsInfoRow label="Drag lane" value="Issue a route from an owned star." valueAlign="left" />
        </PaxSettingsDrawer>
    {:else if activeToolId === "help"}
        <PaxSettingsDrawer
            title="Help"
            icon="help"
            accent="#a8b6cf"
            onClose={() => setActiveTool(null)}
        >
            <p>Select owned stars, assign routes across connected lanes, and watch active ships transfer control through the network.</p>
            <p>Use the Settings rail for theme, appearance, combat, audio, graphics, diagnostics, hotkeys, restart, and quit.</p>
        </PaxSettingsDrawer>
    {:else}
    <!-- Stacked Section Panels -->
    {#each orderedOpenSections as sec (sec.id)}
        <div class="section-panel" style="--accent: {sec.color}">
            <div class="section-head-wrap">
                <PaxHudButton class="section-head" onclick={() => toggleSection(sec.id)} title={`Close ${sec.label}`}>
                    <span class="head-icon"><HudIcon name={sec.icon} /></span>
                    <span class="head-label">{sec.label}</span>
                    <span class="head-close"><HudIcon name="close" size={14} /></span>
                </PaxHudButton>
                {#if (sectionSubsections[sec.id]?.length ?? 0) > 0}
                    <div class="section-subnav">
                        <PaxHudButton
                            class="subsection-chip"
                            active={(activeSubsections[sec.id] ?? "all") === "all"}
                            onclick={() => toggleSubsection(sec.id, "all")}
                            title="Show all"
                        >
                            <span class="subsection-chip__icon"><HudIcon name="phase-field" size={14} /></span>
                            <span>All</span>
                        </PaxHudButton>
                        {#each sectionSubsections[sec.id] ?? [] as subsection}
                            <PaxHudButton
                                class="subsection-chip"
                                active={(activeSubsections[sec.id] ?? "all") === subsection.id}
                                onclick={() => toggleSubsection(sec.id, subsection.id)}
                                title={subsection.label}
                            >
                                <span class="subsection-chip__icon"><HudIcon name={subsection.icon} size={14} /></span>
                                <span>{subsection.label}</span>
                            </PaxHudButton>
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
    {/if}
    </div>
    </div>
</div>

<style>
    .controls-panel {
        --settings-ribbon-width: 68px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: var(--hud-text);
        font-family: var(--hud-font-ui);
        height: 100%;
        min-height: 0;
    }

    .controls-panel--ribbon-expanded {
        --settings-ribbon-width: 176px;
    }

    .settings-shell {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: var(--settings-ribbon-width) minmax(0, 1fr);
        grid-template-areas: "rail content";
        gap: 14px;
        align-items: stretch;
    }

    .controls-panel--dock-left .settings-shell {
        grid-template-columns: minmax(0, 1fr) var(--settings-ribbon-width);
        grid-template-areas: "content rail";
    }

    .settings-content {
        grid-area: content;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 0;
        overflow-y: auto;
        padding-right: 2px;
    }

    /* ── Icon Toolbar ── */
    .icon-toolbar {
        grid-area: rail;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 4px 4px 4px 0;
        min-height: 0;
        overflow-y: auto;
    }

    .icon-toolbar__controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    :global(.icon-toolbar-control) {
        width: 100%;
        min-height: 38px;
        border: 1px solid var(--hud-border);
        border-radius: 12px;
        background: var(--hud-button-bg);
        color: var(--hud-text-soft);
        font-family: var(--hud-font-ui);
        font-size: 0.64rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            background 0.18s,
            border-color 0.18s,
            color 0.18s,
            transform 0.18s;
    }

    :global(.icon-toolbar-control:hover) {
        background: var(--hud-button-bg-hover);
        border-color: var(--hud-border-strong);
        color: var(--hud-text-strong);
        transform: translateY(-1px);
    }

    .icon-toolbar.has-active {
        gap: 8px;
    }
    :global(.icon-btn) {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        min-height: 46px;
        padding: 10px 0;
        background: rgba(7, 13, 26, 0.78);
        border: 1px solid var(--hud-border);
        border-radius: 14px;
        cursor: pointer;
        color: var(--hud-text-soft);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: left;
    }
    :global(.icon-toolbar.has-active .icon-btn) {
        padding: 10px 0;
        border-radius: 12px;
    }
    :global(.controls-panel--ribbon-expanded .icon-btn),
    :global(.controls-panel--ribbon-expanded .icon-toolbar.has-active .icon-btn) {
        justify-content: flex-start;
        padding: 10px 12px;
    }
    :global(.icon-btn:hover) {
        background: rgba(14, 24, 43, 0.92);
        border-color: color-mix(in srgb, var(--accent) 55%, var(--hud-border));
        color: var(--hud-text-strong);
        transform: translateY(-1px);
        box-shadow: 0 10px 24px
            color-mix(in srgb, var(--accent) 20%, transparent);
    }
    :global(.icon-btn.active) {
        background: color-mix(in srgb, var(--accent) 13%, rgba(8, 12, 24, 0.9));
        border-color: color-mix(in srgb, var(--accent) 75%, rgba(255, 255, 255, 0.12));
        color: var(--hud-text-strong);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
    }
    .icon-symbol {
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .icon-symbol :global(svg) {
        width: 18px;
        height: 18px;
    }

    .icon-label {
        display: none;
        flex: 1;
        font-family: var(--hud-font-ui);
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.11em;
        color: inherit;
        opacity: 0.92;
        line-height: 1.25;
    }
    .controls-panel--ribbon-expanded .icon-label {
        display: block;
    }
    /* ── Section Panel ── */
    .section-panel {
        background: var(--hud-panel-bg);
        border: 1px solid var(--hud-border);
        border-radius: var(--hud-radius-md);
        box-shadow: var(--hud-shadow-soft);
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
        border-bottom: 1px solid var(--hud-divider);
        background: color-mix(in srgb, var(--accent) 8%, rgba(5, 9, 20, 0.45));
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

    :global(.section-head) {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 12px 14px 10px;
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--accent);
        font-family: var(--hud-font-ui);
        transition: background 0.15s;
    }
    :global(.section-head:hover) {
        background: color-mix(in srgb, var(--accent) 18%, transparent);
    }
    .head-icon {
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    .head-label {
        flex: 1;
        font-size: 0.84rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        text-align: left;
    }
    .head-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        opacity: 0.5;
        transition: opacity 0.15s;
    }
    .head-close:hover {
        opacity: 1;
    }

    .section-body {
        padding: 12px;
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
    :global(.subsection-chip) {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid var(--hud-border);
        background: rgba(7, 12, 24, 0.62);
        color: var(--hud-text);
        font-family: var(--hud-font-ui);
        font-size: 0.6rem;
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
    :global(.subsection-chip:hover) {
        border-color: color-mix(
            in srgb,
            var(--accent) 60%,
            rgba(255, 255, 255, 0.12)
        );
        background: color-mix(in srgb, var(--accent) 10%, rgba(7, 12, 24, 0.5));
        color: rgba(241, 245, 249, 0.96);
        transform: translateY(-1px);
    }
    :global(.subsection-chip.active) {
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
    /* ── Nudge slider buttons (injected via nudgeSliders action) ── */
    @media (max-width: 720px) {
        .settings-shell {
            grid-template-columns: 1fr;
            grid-template-areas:
                "rail"
                "content";
        }

        .icon-toolbar {
            flex-direction: row;
            flex-wrap: wrap;
            padding: 0;
        }

        .icon-toolbar__controls {
            flex-direction: row;
            flex: 1 1 100%;
        }

        :global(.icon-btn) {
            flex: 1 1 140px;
            justify-content: flex-start;
            padding: 10px 12px;
        }

        .icon-label {
            display: block;
        }

        .settings-content {
            overflow: visible;
            padding-right: 0;
        }
    }

    :global(.nudge-slider-wrap) {
        display: flex;
        align-items: center;
        gap: 4px;
        width: 100%;
    }
    :global(.nudge-slider-wrap input[type="range"]) {
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
    /* Aurelia Drift correction layer: this turns the settings surface into
       a real command ribbon plus drawer instead of a text-heavy empty panel. */
    .controls-panel {
        gap: 12px;
        height: auto;
        max-height: 100%;
        overflow: visible;
    }

    .settings-shell {
        grid-template-columns: var(--settings-ribbon-width) minmax(0, 1fr);
        gap: 10px;
        flex: 0 1 auto;
        align-items: start;
    }

    .icon-toolbar {
        gap: 7px;
        padding: 8px 6px;
        border: 1px solid rgba(246, 196, 105, 0.32);
        background:
            linear-gradient(180deg, rgba(2, 24, 27, 0.92), rgba(1, 8, 13, 0.96)),
            radial-gradient(circle at 50% 0%, rgba(246, 196, 105, 0.12), transparent 38%);
        clip-path: var(--hud-cut-corner-sm);
        box-shadow: inset 0 0 0 1px rgba(255, 231, 178, 0.05);
        overflow-x: hidden;
        max-height: min(52vh, calc(100vh - var(--hud-topbar-height) - 330px));
    }

    .icon-toolbar__controls {
        gap: 7px;
        padding-bottom: 7px;
        border-bottom: 1px solid rgba(246, 196, 105, 0.18);
    }

    :global(.icon-toolbar-control),
    :global(.icon-btn) {
        min-height: 42px;
        border-radius: 0;
        border-color: rgba(246, 196, 105, 0.22);
        background: rgba(0, 17, 21, 0.72);
        color: rgba(255, 221, 160, 0.82);
        clip-path: var(--hud-cut-corner-xs);
        box-shadow: inset 0 0 0 1px rgba(120, 255, 244, 0.03);
    }

    :global(.icon-toolbar-control) {
        font-size: 0;
    }

    :global(.icon-btn) {
        padding: 0;
    }

    :global(.controls-panel--ribbon-expanded .icon-btn),
    :global(.controls-panel--ribbon-expanded .icon-toolbar.has-active .icon-btn) {
        min-height: 42px;
        padding: 0 10px;
        gap: 8px;
    }

    :global(.icon-btn:hover),
    :global(.icon-toolbar-control:hover) {
        background:
            linear-gradient(180deg, rgba(21, 44, 39, 0.92), rgba(4, 23, 25, 0.94)),
            rgba(246, 196, 105, 0.04);
        color: var(--hud-accent-warm-strong);
        border-color: rgba(246, 196, 105, 0.62);
        transform: none;
    }

    :global(.icon-btn.active) {
        background:
            linear-gradient(180deg, rgba(97, 72, 25, 0.92), rgba(4, 29, 29, 0.96));
        color: #fff1bf;
        border-color: rgba(255, 214, 120, 0.78);
        box-shadow: inset 0 0 0 1px rgba(255, 235, 175, 0.13), 0 0 18px rgba(246, 196, 105, 0.18);
    }

    .icon-symbol {
        width: 18px;
        height: 18px;
    }

    .icon-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.58rem;
        line-height: 1;
    }

    .settings-content {
        gap: 10px;
        padding: 0 2px 0 0;
        max-height: calc(100vh - var(--hud-topbar-height) - 24px);
    }

    .section-panel {
        border-radius: 0;
        border-color: rgba(246, 196, 105, 0.35);
        background:
            linear-gradient(180deg, rgba(3, 23, 26, 0.97), rgba(1, 8, 13, 0.99)),
            radial-gradient(circle at 0% 0%, rgba(90, 245, 235, 0.08), transparent 42%),
            radial-gradient(circle at 100% 0%, rgba(246, 196, 105, 0.12), transparent 44%);
        clip-path: var(--hud-cut-corner-md);
    }

    :global(.section-head) {
        min-height: 42px;
        padding: 0 12px;
        color: var(--hud-accent-warm-strong);
        border-bottom-color: rgba(246, 196, 105, 0.2);
        background: rgba(0, 15, 18, 0.72);
    }

    .head-icon {
        color: var(--hud-accent-warm);
    }

    .head-label,
    :global(.subsection-chip) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .section-body {
        padding: 10px;
    }

    .section-body :global(.category-theme-bar) {
        margin: -2px -2px 10px;
        padding: 8px;
        border: 1px solid rgba(246, 196, 105, 0.26);
        background:
            linear-gradient(180deg, rgba(3, 21, 24, 0.9), rgba(0, 9, 12, 0.94)),
            radial-gradient(circle at 0% 0%, rgba(90, 245, 235, 0.08), transparent 42%);
        clip-path: var(--hud-cut-corner-sm);
    }

    .section-body :global(.theme-select),
    .section-body :global(.action-btn),
    .section-body :global(.drawer-btn),
    .section-body :global(.chip),
    .section-body :global(.modal-chip),
    .section-body :global(.modal-chip button) {
        border-radius: 0;
        border-color: rgba(246, 196, 105, 0.28);
        background: rgba(0, 17, 21, 0.78);
        color: rgba(255, 229, 174, 0.9);
        clip-path: var(--hud-cut-corner-xs);
        font-family: var(--hud-font-ui);
        font-weight: 800;
        letter-spacing: 0.06em;
    }

    .section-body :global(.theme-select:focus),
    .section-body :global(.action-btn:hover),
    .section-body :global(.drawer-btn:hover),
    .section-body :global(.chip:hover),
    .section-body :global(.chip.active) {
        border-color: rgba(255, 218, 132, 0.72);
        background: linear-gradient(180deg, rgba(58, 48, 22, 0.9), rgba(3, 31, 32, 0.94));
        color: #fff0ba;
    }

    .section-body :global(.sub-heading) {
        margin: 10px 0 8px;
        padding-top: 0;
        border-top: none;
        color: var(--hud-accent-warm);
        font-family: var(--hud-font-ui);
        font-size: 0.62rem;
        font-weight: 900;
        letter-spacing: 0.16em;
    }

    .section-body :global(.var-row),
    .section-body :global(.toggle-row) {
        border: 1px solid rgba(246, 196, 105, 0.16);
        background: rgba(0, 15, 19, 0.62);
        border-radius: 0;
        clip-path: var(--hud-cut-corner-xs);
    }

    .section-body :global(.var-name) {
        color: rgba(255, 232, 181, 0.9);
        font-family: var(--hud-font-ui);
        font-weight: 800;
        letter-spacing: 0.04em;
    }

    .section-body :global(.val) {
        color: var(--hud-accent);
        font-family: var(--hud-font-data);
        font-variant-numeric: tabular-nums;
    }

    .section-body :global(input[type="range"]) {
        accent-color: var(--hud-accent);
    }

    .icon-toolbar,
    .section-panel,
    .section-body :global(.category-theme-bar) {
        border-color: transparent;
        border-radius: var(--hud-radius-md);
        clip-path: var(--hud-rounded-corner-md);
        background:
            linear-gradient(180deg, rgba(3, 23, 26, 0.97), rgba(1, 8, 13, 0.99)) padding-box,
            var(--hud-border-gradient) border-box;
    }

    :global(.icon-toolbar-control),
    :global(.icon-btn),
    .section-body :global(.theme-select),
    .section-body :global(.action-btn),
    .section-body :global(.drawer-btn),
    .section-body :global(.chip),
    .section-body :global(.modal-chip),
    .section-body :global(.modal-chip button),
    .section-body :global(.var-row),
    .section-body :global(.toggle-row) {
        border-color: transparent;
        border-radius: var(--hud-radius-xs);
        clip-path: var(--hud-rounded-corner-xs);
        background:
            linear-gradient(180deg, rgba(0, 18, 21, 0.86), rgba(0, 10, 13, 0.94)) padding-box,
            var(--hud-control-border-gradient) border-box;
    }

    :global(.icon-btn:hover),
    :global(.icon-toolbar-control:hover),
    .section-body :global(.theme-select:focus),
    .section-body :global(.action-btn:hover),
    .section-body :global(.drawer-btn:hover),
    .section-body :global(.chip:hover),
    .section-body :global(.chip.active) {
        border-color: transparent;
        background:
            linear-gradient(180deg, rgba(58, 48, 22, 0.9), rgba(3, 31, 32, 0.94)) padding-box,
            var(--hud-border-gradient) border-box;
    }

    :global(.icon-btn.active) {
        border-color: transparent;
        background:
            linear-gradient(180deg, rgba(97, 72, 25, 0.92), rgba(4, 29, 29, 0.96)) padding-box,
            var(--hud-border-gradient) border-box;
    }

    /* Settings ownership correction: the rail is the master component. */
    .controls-panel {
        --settings-ribbon-width: 64px;
        height: 100%;
        max-height: 100%;
        gap: 0;
    }

    .controls-panel--ribbon-expanded {
        --settings-ribbon-width: 168px;
    }

    .settings-shell,
    .controls-panel--dock-left .settings-shell {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: var(--settings-ribbon-width);
        grid-template-areas: "rail";
        gap: 10px;
        align-items: stretch;
        transition:
            grid-template-columns 0.22s ease,
            width 0.22s ease;
    }

    .settings-shell--with-panel {
        grid-template-columns: minmax(360px, 1fr) var(--settings-ribbon-width);
        grid-template-areas: "content rail";
    }

    .controls-panel--dock-left .settings-shell--with-panel {
        grid-template-columns: var(--settings-ribbon-width) minmax(360px, 1fr);
        grid-template-areas: "rail content";
    }

    .icon-toolbar {
        width: var(--settings-ribbon-width);
        height: 100%;
        max-height: none;
        padding: 8px;
        overflow-x: hidden;
        overflow-y: auto;
        transition:
            width 0.22s ease,
            border-color 0.18s ease,
            background 0.18s ease;
    }

    .icon-toolbar__controls {
        display: grid;
        grid-template-columns: 1fr;
    }

    :global(.icon-toolbar-control),
    :global(.icon-btn),
    :global(.icon-toolbar.has-active .icon-btn),
    :global(.settings-tool-action) {
        width: 100%;
        min-height: 44px;
        padding: 0;
        justify-content: center;
    }

    :global(.controls-panel--ribbon-expanded .icon-btn),
    :global(.controls-panel--ribbon-expanded .icon-toolbar.has-active .icon-btn),
    :global(.controls-panel--ribbon-expanded .icon-toolbar-control) {
        justify-content: flex-start;
        padding: 0 10px;
    }

    :global(.settings-tool-danger) {
        --accent: var(--hud-danger);
    }

    .settings-content {
        grid-area: content;
        min-width: 0;
        height: 100%;
        max-height: calc(100vh - var(--hud-topbar-height) - 24px);
        opacity: 1;
        transform: translateX(0);
        transition:
            opacity 0.18s ease,
            transform 0.22s ease;
    }

    .settings-shell:not(.settings-shell--with-panel) .settings-content {
        display: none;
        opacity: 0;
        transform: translateX(-8px);
    }

    .icon-toolbar {
        gap: 8px;
        padding: 10px;
    }

    .icon-toolbar__controls {
        gap: 8px;
        padding-bottom: 9px;
    }

    :global(.icon-toolbar-control),
    :global(.icon-btn),
    :global(.icon-toolbar.has-active .icon-btn),
    :global(.settings-tool-action) {
        min-height: 48px;
    }

    :global(.controls-panel--ribbon-expanded .icon-btn),
    :global(.controls-panel--ribbon-expanded .icon-toolbar.has-active .icon-btn),
    :global(.controls-panel--ribbon-expanded .icon-toolbar-control) {
        min-height: 46px;
        padding: 0 12px;
        gap: 10px;
    }

    .icon-symbol {
        width: 21px;
        height: 21px;
    }

    .icon-symbol :global(svg) {
        width: calc(19px * var(--hud-icon-scale, 1));
        height: calc(19px * var(--hud-icon-scale, 1));
    }

    .icon-label {
        font-size: calc(0.64rem * var(--hud-label-scale, 1));
        letter-spacing: 0.1em;
        line-height: 1.1;
    }

    .settings-content {
        gap: 12px;
    }

    :global(.section-head) {
        min-height: 48px;
        padding: 0 14px;
    }

    .head-label {
        font-size: calc(0.86rem * var(--hud-title-scale, 1));
        line-height: 1.1;
    }

    .section-body {
        gap: 12px;
        padding: 14px;
    }

</style>
