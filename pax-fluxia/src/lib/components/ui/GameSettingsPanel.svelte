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
    import { log, logFlags } from "$lib/utils/logger";
    import { normalizeBgImagePath } from "$lib/config/bgManifest";
    import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
    import {
        LOG_CATEGORIES,
    } from "./settingsDefs";
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
    import ControlsSectionShips from "./settings/ControlsSection-Ships.svelte";
    import ControlsSectionPlayers from "./settings/ControlsSection-Players.svelte";
    import ControlsSectionVisuals from "./settings/ControlsSection-Visuals.svelte";
    import ControlsSectionLogging from "./settings/ControlsSection-Logging.svelte";
    import ControlsSectionAudio from "./settings/ControlsSection-Audio.svelte";
    import ControlsSectionDiagnostics from "./settings/ControlsSection-Diagnostics.svelte";
    import SaveLoadGamePanel from "./settings/SaveLoadGamePanel.svelte";
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
        SETTINGS_CATEGORIES,
        CATEGORY_BY_SECTION,
        type SettingsCategoryId,
    } from "./settings/settingsTaxonomy";
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

    // ── Settings navigation — single source of truth: SETTINGS_CATEGORIES ──
    // The rail = the 7 categories + Restart/Quit actions. Selecting a category
    // shows its sections as top chips; one section is open at a time. The
    // Interface category surfaces UI utility panels (not config sections).
    const INTERFACE_PANELS = [
        { id: "ui_appearance", icon: "gem", label: "Appearance" },
        { id: "ui_themes", icon: "library", label: "Themes" },
        { id: "ui_savegame", icon: "save-game", label: "Save / Load" },
        { id: "ui_stats", icon: "ranking-star", label: "Stats" },
        { id: "ui_hotkeys", icon: "keyboard", label: "Hotkeys" },
        { id: "ui_help", icon: "help", label: "Help" },
    ] as const;
    // Typography is its own top-level category, but renders a bespoke drawer
    // (not a SETTINGS_SECTION) just like the Interface utility panels.
    const TYPOGRAPHY_PANELS = [
        { id: "ui_typography", icon: "font", label: "Typography" },
    ] as const;
    const UTILITY_PANELS = [...INTERFACE_PANELS, ...TYPOGRAPHY_PANELS] as const;
    type UtilityPanelId = (typeof UTILITY_PANELS)[number]["id"];
    type ActiveSectionId = SectionId | UtilityPanelId;

    // Which top-level category each bespoke utility panel belongs to.
    const UTILITY_PANEL_CATEGORY: Record<UtilityPanelId, SettingsCategoryId> = {
        ui_appearance: "interface",
        ui_themes: "interface",
        ui_savegame: "interface",
        ui_stats: "interface",
        ui_hotkeys: "interface",
        ui_help: "interface",
        ui_typography: "typography",
    };

    const ACTION_TOOLS = [
        { id: "restart", icon: "restart", label: "Restart", run: () => onRestartGame?.() },
        { id: "quit", icon: "quit", label: "Quit", run: () => onQuitGame?.() },
    ] as const;

    const ACTIVE_SECTION_KEY = "pax-fluxia-active-section";

    function isUtilityPanelId(value: string | null): value is UtilityPanelId {
        return UTILITY_PANELS.some((panel) => panel.id === value);
    }

    function loadActiveSection(): ActiveSectionId | null {
        if (typeof window === "undefined") return null;
        const value = localStorage.getItem(ACTIVE_SECTION_KEY);
        if (!value) return null;
        return isUtilityPanelId(value)
            ? value
            : normalizeSettingsSectionId(value);
    }

    let activeSectionId = $state<ActiveSectionId | null>(loadActiveSection());
    let activeToolHasPanel = $derived(activeSectionId !== null);
    // "All" view: stack every section of the active category in one scroll.
    // activeSectionId is kept (so the category + chips stay resolved); this just
    // overlays the all-sections render.
    let showAllSections = $state(false);

    function persistActiveSection() {
        if (typeof window === "undefined") return;
        if (activeSectionId) {
            localStorage.setItem(ACTIVE_SECTION_KEY, activeSectionId);
        } else {
            localStorage.removeItem(ACTIVE_SECTION_KEY);
        }
    }

    function selectSection(id: ActiveSectionId | null) {
        // Selecting or closing any single section always exits the "All" view.
        showAllSections = false;
        activeSectionId = activeSectionId === id ? null : id;
        persistActiveSection();
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
        phase_field: "territory_phase_field",
        phase_edges: "territory_phase_edges",
        ember_lattice: "territory_ember_lattice",
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
                activeTerritoryRenderMode === "phase_edges" ||
                activeTerritoryRenderMode === "ember_lattice"
            );
        }
        return true;
    }
    let visibleSections = $derived(
        sections.filter((section) => isSectionVisible(section)),
    );

    interface NavChip {
        id: ActiveSectionId;
        label: string;
        icon: string;
    }

    function chipsForCategory(catId: SettingsCategoryId): NavChip[] {
        if (catId === "interface") {
            return INTERFACE_PANELS.map((panel) => ({
                id: panel.id,
                label: panel.label,
                icon: panel.icon,
            }));
        }
        if (catId === "typography") {
            return TYPOGRAPHY_PANELS.map((panel) => ({
                id: panel.id,
                label: panel.label,
                icon: panel.icon,
            }));
        }
        const category = SETTINGS_CATEGORIES.find((c) => c.id === catId);
        return (category?.sections ?? [])
            .map((sid) => visibleSections.find((s) => s.id === sid))
            .filter(Boolean)
            .map((s) => ({ id: s!.id, label: s!.label, icon: s!.icon }));
    }

    // A category appears in the rail only if it has something to show.
    let visibleCategories = $derived(
        SETTINGS_CATEGORIES.filter((cat) => chipsForCategory(cat.id).length > 0),
    );

    let activeCategoryId = $derived<SettingsCategoryId | null>(
        activeSectionId === null
            ? null
            : isUtilityPanelId(activeSectionId)
              ? UTILITY_PANEL_CATEGORY[activeSectionId]
              : (CATEGORY_BY_SECTION[activeSectionId] ?? null),
    );
    let activeCategory = $derived(
        SETTINGS_CATEGORIES.find((c) => c.id === activeCategoryId) ?? null,
    );
    let activeCategoryChips = $derived(
        activeCategoryId ? chipsForCategory(activeCategoryId) : [],
    );

    // The single open panel (a config section definition, or an interface panel).
    let activePanel = $derived.by<NavChip | null>(() => {
        if (activeSectionId === null) return null;
        if (isUtilityPanelId(activeSectionId)) {
            const panel = UTILITY_PANELS.find((p) => p.id === activeSectionId)!;
            return { id: panel.id, label: panel.label, icon: panel.icon };
        }
        const section = sections.find((s) => s.id === activeSectionId);
        return section
            ? { id: section.id, label: section.label, icon: section.icon }
            : null;
    });

    function selectCategory(catId: SettingsCategoryId) {
        if (activeCategoryId === catId) {
            selectSection(null);
            return;
        }
        selectSection(chipsForCategory(catId)[0]?.id ?? null);
    }

    // Selecting a render mode (or any reactive change) can hide the open
    // section; if so, fall back to the first chip of its category so the panel
    // never blanks out.
    $effect(() => {
        if (
            activeSectionId !== null &&
            !isUtilityPanelId(activeSectionId) &&
            !visibleSections.some((s) => s.id === activeSectionId)
        ) {
            const fallback = activeCategoryId
                ? chipsForCategory(activeCategoryId)[0]?.id ?? null
                : null;
            activeSectionId = fallback;
            persistActiveSection();
        }
    });

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
        activeSectionId = normalizeSettingsSectionId(forceOpenSection) ?? forceOpenSection;
        persistActiveSection();
    });

    interface SubsectionChip {
        id: string;
        label: string;
        icon: string;
    }

    interface SectionBodyParams {
        sectionId: ActiveSectionId;
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
            activeTerritoryRenderMode === "cell_grid" ||
            activeTerritoryRenderMode === "phase_edges"
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
    const sectionBodyNodes = new Map<ActiveSectionId, HTMLElement>();
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
        activeSectionId = sectionId;
        persistActiveSection();
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
        sectionId: ActiveSectionId,
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

    function toggleSubsection(sectionId: ActiveSectionId, subsectionId: string) {
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
    class:controls-panel--dock-left={dockSide === "left"}>

    <div class="settings-shell" class:settings-shell--with-panel={activeToolHasPanel}>
    <!-- Icon Toolbar -->
    <div class="icon-toolbar" class:has-active={activeToolHasPanel}>
        <div class="icon-toolbar__controls">
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
        {#each visibleCategories as cat, i (cat.id)}
            <PaxHudButton
                class="icon-btn"
                active={activeCategoryId === cat.id}
                accentId={cat.id}
                onclick={() => selectCategory(cat.id)}
                title={cat.label}
            >
                <span
                    class="icon-symbol icon-symbol--spectrum"
                    style:--rail-hue={Math.round((visibleCategories.length > 1 ? i / (visibleCategories.length - 1) : 0) * 290)}
                ><HudIcon name={cat.icon} /></span>
                <span class="icon-label">{cat.label}</span>
            </PaxHudButton>
        {/each}
        <div class="icon-toolbar__spacer"></div>
        {#each ACTION_TOOLS as action}
            <PaxHudButton
                class={`icon-btn settings-tool-action ${action.id === "quit" ? "settings-tool-danger" : ""}`}
                danger={action.id === "quit"}
                accentId={action.id}
                onclick={action.run}
                title={action.label}
            >
                <span class="icon-symbol"><HudIcon name={action.icon} /></span>
                <span class="icon-label">{action.label}</span>
            </PaxHudButton>
        {/each}
    </div>

    <div class="settings-content">
    <div class="settings-search">
        <span class="settings-search__icon"><HudIcon name="search" size={13} /></span>
        <input
            class="settings-search__input"
            type="text"
            placeholder="Search settings…"
            bind:value={settingsSearchQuery}
            onkeydown={(event) => {
                if (event.key === "Enter") handleSearchSubmit();
                else if (event.key === "Escape") clearSettingsSearch();
            }}
        />
        {#if settingsSearchQuery}
            <button class="settings-search__clear" type="button" title="Clear search" onclick={clearSettingsSearch}>
                <HudIcon name="close" size={11} />
            </button>
        {/if}
        {#if settingsSearchQuery.trim()}
            <div class="settings-search__dropdown">
                {#if settingsSearchResults.length === 0}
                    <p class="settings-search__empty">No matching settings.</p>
                {:else}
                    {#each settingsSearchResults as result (result.id)}
                        <button
                            class="settings-search__result"
                            type="button"
                            onclick={() => { void navigateToSearchResult(result); clearSettingsSearch(); }}
                        >
                            <span class="settings-search__result-title">{result.title}</span>
                            <span class="settings-search__result-section">{result.sectionLabel}</span>
                        </button>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
    {#if activePanel}
        {@const sec = activePanel}
        <div class="section-panel" data-accent-id={activeCategoryId}>
            <div class="section-head-wrap">
                <PaxHudButton class="section-head" onclick={() => selectSection(null)} title={`Close ${activeCategory?.label ?? sec.label}`}>
                    <span class="head-icon"><HudIcon name={activeCategory?.icon ?? sec.icon} /></span>
                    <span class="head-label">{activeCategory?.label ?? sec.label}</span>
                    <span class="head-close"><HudIcon name="close" size={14} /></span>
                </PaxHudButton>
                {#if activeCategoryChips.length > 1}
                    <div class="section-subnav">
                        <PaxHudButton
                            class="subsection-chip"
                            active={showAllSections}
                            onclick={() => (showAllSections = true)}
                            title="Show all sections in this category"
                        >
                            <span class="subsection-chip__icon"><HudIcon name="phase-field" size={14} /></span>
                            <span>All</span>
                        </PaxHudButton>
                        {#each activeCategoryChips as chip}
                            <PaxHudButton
                                class="subsection-chip"
                                active={!showAllSections && activeSectionId === chip.id}
                                onclick={() => selectSection(chip.id)}
                                title={chip.label}
                            >
                                <span class="subsection-chip__icon"><HudIcon name={chip.icon} size={14} /></span>
                                <span>{chip.label}</span>
                            </PaxHudButton>
                        {/each}
                    </div>
                {/if}
                {#if !showAllSections && !isUtilityPanelId(sec.id) && (sectionSubsections[sec.id]?.length ?? 0) > 0}
                    <div class="section-subnav section-subnav--secondary">
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

            {#if showAllSections}
                <div class="section-body section-body--all">
                    {#each activeCategoryChips as chip (chip.id)}
                        <div
                            class="section-all-group"
                            use:registerSectionBody={{
                                sectionId: chip.id,
                                activeSubsection: "all",
                            }}
                            use:enhanceSettingMetadata={{
                                scope: isUtilityPanelId(chip.id) ? null : getSectionDefinition(chip.id).scope,
                            }}
                        >
                            <div class="section-all-group__title">
                                <span class="subsection-chip__icon"><HudIcon name={chip.icon} size={13} /></span>
                                <span>{chip.label}</span>
                            </div>
                            {@render sectionContent(chip)}
                        </div>
                    {/each}
                </div>
            {:else}
                <div
                    class="section-body"
                    use:registerSectionBody={{
                        sectionId: sec.id,
                        activeSubsection: activeSubsections[sec.id] ?? "all",
                    }}
                    use:enhanceSettingMetadata={{
                        scope: isUtilityPanelId(sec.id) ? null : getSectionDefinition(sec.id).scope,
                    }}
                >
                    {@render sectionContent(sec)}
                </div>
            {/if}
        </div>
    {/if}

{#snippet sectionContent(sec: NavChip)}
                {#if sec.id === "ui_appearance"}
                    <HudThemePanel />
                    <ControlsSectionVisuals
                        {panel}
                        {updatePanel}
                        {vis}
                        {updateVisual}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec.id === "ui_typography"}
                    <TypographyTokenPanel />
                {:else if sec.id === "ui_themes"}
                    <ThemeLibraryPanel />
                {:else if sec.id === "ui_savegame"}
                    <SaveLoadGamePanel />
                {:else if sec.id === "ui_stats"}
                    <PaxSettingsInfoRow label="Tick" value={activeGameStore.currentTick ?? 0} />
                    <PaxSettingsInfoRow label="Players" value={activeGameStore.players.length} />
                    <PaxSettingsInfoRow label="Stars" value={activeGameStore.stars.length} />
                    <PaxSettingsInfoRow label="Selected" value={selectedStarStore.id ?? "None"} />
                {:else if sec.id === "ui_hotkeys"}
                    <PaxSettingsInfoRow label="F" value="Fit the map to the viewport." valueAlign="left" />
                    <PaxSettingsInfoRow label="Esc" value="Close active overlays or clear search focus." valueAlign="left" />
                    <PaxSettingsInfoRow label="Click star" value="Select and inspect a star." valueAlign="left" />
                    <PaxSettingsInfoRow label="Drag lane" value="Issue a route from an owned star." valueAlign="left" />
                {:else if sec.id === "ui_help"}
                    <p>Select owned stars, assign routes across connected lanes, and watch active ships transfer control through the network.</p>
                {:else if sec.id === "match_flow"}
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
                {:else if sec.id === "render"}
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
                        systemTitle="Render Mode"
                    />
                {:else if sec.id === "territory_tuning"}
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
                        view="tuning"
                    />
                    <TerritoryGeometrySourceTuning
                        {panel}
                        {updatePanel}
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
{/snippet}
    </div>
    </div>
</div>

<style>
    .controls-panel {
        --settings-ribbon-width: 68px;
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
        color: var(--pax-ui-text);
        font-family: var(--pax-ui-font-ui);
        height: 100%;
        min-height: 0;
    }

    .controls-panel--ribbon-expanded {
        --settings-ribbon-width: 216px;
    }

    .settings-shell {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: var(--settings-ribbon-width) minmax(0, 1fr);
        grid-template-areas: "rail content";
        gap: var(--pax-gap-md);
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
        gap: var(--pax-space-3);
        min-height: 0;
        /* Single scroll surface per panel: the open .section-panel is flex:1
           and its .section-body owns the scroll (header + subnav stay fixed).
           This wrapper must NOT add a second, nesting scrollbar. */
        overflow-y: hidden;
        padding-right: 2px;
    }

    .settings-search {
        position: relative;
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: var(--pax-space-2);
        min-height: 34px;
        padding: 0 var(--pax-gap-sm);
        border: 1px solid var(--pax-ui-border);
        border-radius: var(--pax-ui-radius-sm);
        background: var(--pax-ui-button-bg);
    }
    .settings-search:focus-within {
        border-color: var(--pax-ui-accent);
    }
    .settings-search__icon {
        display: inline-flex;
        color: var(--pax-ui-text-dim);
    }
    .settings-search__input {
        flex: 1;
        min-width: 0;
        border: 0;
        background: transparent;
        color: var(--pax-ui-text);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-xs);
    }
    .settings-search__input:focus {
        outline: none;
    }
    .settings-search__clear {
        display: inline-flex;
        padding: 3px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--pax-ui-text-dim);
        cursor: pointer;
    }
    .settings-search__clear:hover {
        color: var(--pax-ui-text);
    }
    .settings-search__dropdown {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        z-index: 40;
        max-height: 320px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        padding: var(--pax-space-1);
        border: 1px solid var(--pax-ui-border);
        border-radius: var(--pax-ui-radius-sm);
        background: var(--pax-ui-panel-bg-strong, var(--pax-color-void-mid));
        box-shadow: var(--pax-ui-shadow-soft, 0 12px 32px color-mix(in srgb, var(--pax-color-void) 50%, transparent));
    }
    .settings-search__empty {
        margin: 0;
        padding: var(--pax-space-2);
        color: var(--pax-ui-text-dim);
        font-size: var(--pax-type-xs);
    }
    .settings-search__result {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--pax-gap-sm);
        padding: 7px 9px;
        border: 0;
        border-radius: var(--pax-ui-radius-xs);
        background: transparent;
        color: var(--pax-ui-text);
        font-family: var(--pax-ui-font-ui);
        text-align: left;
        cursor: pointer;
    }
    .settings-search__result:hover {
        background: color-mix(in srgb, var(--pax-ui-accent-warm) 10%, transparent);
    }
    .settings-search__result-title {
        min-width: 0;
        overflow: hidden;
        font-size: var(--pax-type-xs);
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .settings-search__result-section {
        flex: 0 0 auto;
        color: var(--pax-ui-text-dim);
        font-size: var(--pax-type-3xs);
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    /* Category rail icons read as a full-spectrum gradient top → bottom. */
    :global(.icon-toolbar .icon-btn .icon-symbol--spectrum) {
        color: hsl(var(--rail-hue, 200) 80% 66%);
    }
    :global(.icon-toolbar .icon-btn.active .icon-symbol--spectrum) {
        color: hsl(var(--rail-hue, 200) 92% 74%);
    }

    /* ── Icon Toolbar ── */
    .icon-toolbar {
        grid-area: rail;
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-2);
        padding: var(--pax-space-1) var(--pax-space-1) var(--pax-space-1) 0;
        min-height: 0;
        overflow-y: auto;
    }

    /* Panel chrome (collapse / dock) — sits in a row, visually distinct from
       the stacked category buttons below. */
    .icon-toolbar__controls {
        display: flex;
        flex-direction: row;
        gap: var(--pax-gap-xs);
    }

    /* Pushes Restart/Quit actions to the bottom of the rail, away from categories. */
    .icon-toolbar__spacer {
        margin-top: auto;
        min-height: 8px;
    }

    :global(.icon-toolbar-control) {
        width: 100%;
        min-height: 38px;
        border: 1px solid var(--pax-ui-border);
        border-radius: 12px;
        background: var(--pax-ui-button-bg);
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-label);
        font-weight: var(--pax-weight-bold);
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
        background: var(--pax-ui-button-bg-hover);
        border-color: var(--pax-ui-border-strong);
        color: var(--pax-ui-text-strong);
        transform: translateY(-1px);
    }

    .icon-toolbar.has-active {
        gap: var(--pax-space-2);
    }
    :global(.icon-btn) {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--pax-gap-sm);
        width: 100%;
        min-height: 46px;
        padding: var(--pax-gap-sm) 0;
        background: color-mix(in srgb, var(--pax-color-void) 78%, transparent);
        border: 1px solid var(--pax-ui-border);
        border-radius: 14px;
        cursor: pointer;
        color: var(--pax-ui-text-soft);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: left;
    }
    :global(.icon-toolbar.has-active .icon-btn) {
        padding: var(--pax-gap-sm) 0;
        border-radius: 12px;
    }
    :global(.controls-panel--ribbon-expanded .icon-btn),
    :global(.controls-panel--ribbon-expanded .icon-toolbar.has-active .icon-btn) {
        justify-content: flex-start;
        padding: var(--pax-gap-sm) var(--pax-space-3);
    }
    :global(.icon-btn:hover) {
        background: color-mix(in srgb, var(--pax-color-void) 92%, transparent);
        border-color: color-mix(in srgb, var(--accent) 55%, var(--pax-ui-border));
        color: var(--pax-ui-text-strong);
        transform: translateY(-1px);
        box-shadow: 0 10px 24px
            color-mix(in srgb, var(--accent) 20%, transparent);
    }
    :global(.icon-btn.active) {
        background: color-mix(in srgb, var(--accent) 13%, rgba(8, 12, 24, 0.9));
        border-color: color-mix(in srgb, var(--accent) 75%, rgba(255, 255, 255, 0.12));
        color: var(--pax-ui-text-strong);
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
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-bold);
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
        background: var(--pax-ui-panel-bg);
        border: 1px solid var(--pax-ui-border);
        border-radius: var(--pax-ui-radius-md);
        box-shadow: var(--pax-ui-shadow-soft);
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
        border-bottom: 1px solid var(--pax-ui-divider);
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
            background: color-mix(in srgb, var(--pax-color-player-blue) 12%, transparent);
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--pax-color-player-blue) 35%, transparent);
        }
        40% {
            background: color-mix(in srgb, var(--pax-color-player-blue) 20%, transparent);
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--pax-color-player-blue) 28%, transparent);
        }
        100% {
            background: transparent;
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--pax-color-player-blue) 0%, transparent);
        }
    }

    :global(.section-head) {
        display: flex;
        align-items: center;
        gap: var(--pax-space-2);
        width: 100%;
        padding: var(--pax-space-3) var(--pax-gap-md) var(--pax-gap-sm);
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--accent);
        font-family: var(--pax-ui-font-ui);
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
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-bold);
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
        padding: var(--pax-space-3);
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
        flex: 1;
        overflow-y: auto;
        min-height: 0;
    }
    /* "All" view: one scroll surface; each section becomes a labelled group. */
    .section-body--all {
        gap: var(--pax-space-4);
    }
    .section-all-group {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
    }
    .section-all-group__title {
        display: flex;
        align-items: center;
        gap: var(--pax-space-2);
        padding-bottom: var(--pax-gap-xs);
        border-bottom: 1px solid var(--pax-ui-divider);
        color: color-mix(in srgb, var(--accent, var(--pax-ui-accent)) 86%, var(--pax-ui-text-strong));
        font-family: var(--pax-ui-font-display);
        font-size: var(--pax-type-label);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    .section-subnav {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pax-space-2);
        padding: 0 var(--pax-space-3) var(--pax-space-3);
    }
    :global(.subsection-chip) {
        display: inline-flex;
        align-items: center;
        gap: var(--pax-gap-xs);
        min-height: 24px;
        padding: 0 9px;
        border-radius: 7px;
        border: 1px solid var(--pax-ui-border);
        background: color-mix(in srgb, var(--pax-color-void) 62%, transparent);
        color: var(--pax-ui-text);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-bold);
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
        color: color-mix(in srgb, var(--pax-ui-text-strong) 96%, transparent);
        transform: translateY(-1px);
    }
    :global(.subsection-chip.active) {
        border-color: color-mix(
            in srgb,
            var(--accent) 76%,
            rgba(255, 255, 255, 0.12)
        );
        background: color-mix(in srgb, var(--accent) 18%, rgba(7, 12, 24, 0.6));
        color: color-mix(in srgb, var(--pax-ui-text-strong) 98%, transparent);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent);
    }
    .subsection-chip__icon {
        display: inline-grid;
        place-items: center;
        width: 14px;
        font-size: var(--pax-type-2xs);
        line-height: 1;
        opacity: 0.92;
    }
    :global(.is-hidden-by-subsection) {
        display: none !important;
    }

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
            padding: var(--pax-gap-sm) var(--pax-space-3);
        }

        .icon-label {
            display: block;
        }

        .settings-content {
            overflow: visible;
            padding-right: 0;
        }
    }

    /* Aurelia Drift correction layer: this turns the settings surface into
       a real command ribbon plus drawer instead of a text-heavy empty panel. */
    .controls-panel {
        gap: var(--pax-space-3);
        height: auto;
        max-height: 100%;
        overflow: visible;
    }

    .settings-shell {
        grid-template-columns: var(--settings-ribbon-width) minmax(0, 1fr);
        gap: var(--pax-gap-sm);
        flex: 0 1 auto;
        align-items: start;
    }

    .icon-toolbar {
        gap: 7px;
        padding: var(--pax-space-2) var(--pax-gap-xs);
        border: 1px solid color-mix(in srgb, var(--pax-ui-accent-warm) 32%, transparent);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 92%, transparent), color-mix(in srgb, var(--pax-color-void) 96%, transparent)),
            radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--pax-ui-accent-warm) 12%, transparent), transparent 38%);
        clip-path: var(--pax-ui-cut-corner-sm);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pax-ui-accent-warm-strong) 5%, transparent);
        overflow-x: hidden;
        max-height: min(52vh, calc(100vh - var(--pax-ui-topbar-height) - 330px));
    }

    .icon-toolbar__controls {
        gap: 7px;
        padding-bottom: 7px;
        border-bottom: 1px solid color-mix(in srgb, var(--pax-ui-accent-warm) 18%, transparent);
    }

    :global(.icon-toolbar-control),
    :global(.icon-btn) {
        min-height: 42px;
        border-radius: 0;
        border-color: color-mix(in srgb, var(--pax-ui-accent-warm) 22%, transparent);
        background: color-mix(in srgb, var(--pax-color-void) 72%, transparent);
        color: color-mix(in srgb, var(--pax-ui-accent-warm) 82%, transparent);
        clip-path: var(--pax-ui-cut-corner-xs);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pax-ui-accent) 3%, transparent);
    }

    :global(.icon-toolbar-control) {
        font-size: 0;
    }

    /* Chrome controls (collapse/dock) read as compact, rounded utility buttons —
       NOT the tall, angular cut-corner category cards. Selector is intentionally
       specific (0,3,0) to win over the theme blocks below that group them with
       .icon-btn / left-align them when the ribbon is expanded. */
    .icon-toolbar .icon-toolbar__controls :global(.icon-toolbar-control) {
        min-width: 0;
        min-height: 30px;
        padding: 0;
        justify-content: center;
        border-radius: 999px;
        clip-path: none;
        border-color: color-mix(in srgb, var(--pax-color-player-blue) 30%, transparent);
        background: color-mix(in srgb, var(--pax-color-player-blue) 6%, transparent);
        box-shadow: none;
    }

    .icon-toolbar .icon-toolbar__controls :global(.icon-toolbar-control:hover) {
        clip-path: none;
        border-radius: 999px;
        border-color: color-mix(in srgb, var(--pax-color-player-blue) 60%, transparent);
        background: color-mix(in srgb, var(--pax-color-player-blue) 12%, transparent);
        transform: none;
    }

    :global(.icon-btn) {
        padding: 0;
    }

    :global(.controls-panel--ribbon-expanded .icon-btn),
    :global(.controls-panel--ribbon-expanded .icon-toolbar.has-active .icon-btn) {
        min-height: 42px;
        padding: 0 var(--pax-gap-sm);
        gap: var(--pax-space-2);
    }

    :global(.icon-btn:hover),
    :global(.icon-toolbar-control:hover) {
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 92%, transparent), color-mix(in srgb, var(--pax-color-void) 94%, transparent)),
            color-mix(in srgb, var(--pax-ui-accent-warm) 4%, transparent);
        color: var(--pax-ui-accent-warm-strong);
        border-color: color-mix(in srgb, var(--pax-ui-accent-warm) 62%, transparent);
        transform: none;
    }

    :global(.icon-btn.active) {
        background:
            linear-gradient(180deg, rgba(97, 72, 25, 0.92), color-mix(in srgb, var(--pax-color-void) 96%, transparent));
        color: var(--pax-ui-accent-warm-strong);
        border-color: color-mix(in srgb, var(--pax-ui-accent-warm-strong) 78%, transparent);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pax-ui-accent-warm-strong) 13%, transparent), 0 0 18px color-mix(in srgb, var(--pax-ui-accent-warm) 18%, transparent);
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
        font-size: var(--pax-type-3xs);
        line-height: 1;
    }

    .settings-content {
        gap: var(--pax-gap-sm);
        padding: 0 2px 0 0;
        max-height: calc(100vh - var(--pax-ui-topbar-height) - 24px);
    }

    .section-panel {
        border-radius: 0;
        border-color: color-mix(in srgb, var(--pax-ui-accent-warm) 35%, transparent);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 97%, transparent), color-mix(in srgb, var(--pax-color-void) 99%, transparent)),
            radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--pax-ui-accent) 8%, transparent), transparent 42%),
            radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--pax-ui-accent-warm) 12%, transparent), transparent 44%);
        clip-path: var(--pax-ui-cut-corner-md);
    }

    :global(.section-head) {
        min-height: 42px;
        padding: 0 var(--pax-space-3);
        color: var(--pax-ui-accent-warm-strong);
        border-bottom-color: color-mix(in srgb, var(--pax-ui-accent-warm) 20%, transparent);
        background: color-mix(in srgb, var(--pax-color-void) 72%, transparent);
    }

    .head-icon {
        color: var(--pax-ui-accent-warm);
    }

    .head-label,
    :global(.subsection-chip) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .section-body {
        padding: var(--pax-gap-sm);
    }

    .section-body :global(.category-theme-bar) {
        margin: -2px -2px var(--pax-gap-sm);
        padding: var(--pax-space-2);
        border: 1px solid color-mix(in srgb, var(--pax-ui-accent-warm) 26%, transparent);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 90%, transparent), color-mix(in srgb, var(--pax-color-void) 94%, transparent)),
            radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--pax-ui-accent) 8%, transparent), transparent 42%);
        clip-path: var(--pax-ui-cut-corner-sm);
    }

    .section-body :global(.theme-select),
    .section-body :global(.action-btn),
    .section-body :global(.drawer-btn),
    .section-body :global(.chip),
    .section-body :global(.modal-chip),
    .section-body :global(.modal-chip button) {
        border-radius: 0;
        border-color: color-mix(in srgb, var(--pax-ui-accent-warm) 28%, transparent);
        background: color-mix(in srgb, var(--pax-color-void) 78%, transparent);
        color: color-mix(in srgb, var(--pax-ui-accent-warm) 90%, transparent);
        clip-path: var(--pax-ui-cut-corner-xs);
        font-family: var(--pax-ui-font-ui);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.06em;
    }

    .section-body :global(.theme-select:focus),
    .section-body :global(.action-btn:hover),
    .section-body :global(.drawer-btn:hover),
    .section-body :global(.chip:hover),
    .section-body :global(.chip.active) {
        border-color: color-mix(in srgb, var(--pax-ui-accent-warm-strong) 72%, transparent);
        background: linear-gradient(180deg, rgba(58, 48, 22, 0.9), rgba(3, 31, 32, 0.94));
        color: var(--pax-ui-accent-warm-strong);
    }

    .section-body :global(.sub-heading) {
        margin: var(--pax-gap-sm) 0 var(--pax-space-2);
        padding-top: 0;
        border-top: none;
        color: var(--pax-ui-accent-warm);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-black);
        letter-spacing: 0.16em;
    }

    /* .var-row / .toggle-row are intentionally FLAT (see panel-shared.css).
       No per-row border/box here — grouping comes from .sub-heading dividers. */

    .section-body :global(.var-name) {
        color: color-mix(in srgb, var(--pax-ui-accent-warm) 90%, transparent);
        font-family: var(--pax-ui-font-ui);
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.04em;
    }

    .section-body :global(.val) {
        color: var(--pax-ui-accent);
        font-family: var(--pax-ui-font-data);
        font-variant-numeric: tabular-nums;
    }

    .section-body :global(input[type="range"]) {
        accent-color: var(--pax-ui-accent);
    }

    .icon-toolbar,
    .section-panel,
    .section-body :global(.category-theme-bar) {
        border-color: transparent;
        border-radius: var(--pax-ui-radius-md);
        clip-path: var(--pax-ui-rounded-corner-md);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 97%, transparent), color-mix(in srgb, var(--pax-color-void) 99%, transparent)) padding-box,
            var(--pax-ui-border-gradient) border-box;
    }

    :global(.icon-toolbar-control),
    :global(.icon-btn),
    .section-body :global(.theme-select),
    .section-body :global(.action-btn),
    .section-body :global(.drawer-btn),
    .section-body :global(.chip),
    .section-body :global(.modal-chip),
    .section-body :global(.modal-chip button) {
        border-color: transparent;
        border-radius: var(--pax-ui-radius-xs);
        clip-path: var(--pax-ui-rounded-corner-xs);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 86%, transparent), color-mix(in srgb, var(--pax-color-void) 94%, transparent)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
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
            var(--pax-ui-border-gradient) border-box;
    }

    :global(.icon-btn.active) {
        border-color: transparent;
        background:
            linear-gradient(180deg, rgba(97, 72, 25, 0.92), rgba(4, 29, 29, 0.96)) padding-box,
            var(--pax-ui-border-gradient) border-box;
    }

    /* Settings ownership correction: the rail is the master component. */
    .controls-panel {
        --settings-ribbon-width: 68px;
        height: 100%;
        max-height: 100%;
        gap: 0;
    }

    .controls-panel--ribbon-expanded {
        --settings-ribbon-width: 216px;
    }

    .settings-shell,
    .controls-panel--dock-left .settings-shell {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: var(--settings-ribbon-width);
        grid-template-areas: "rail";
        gap: var(--pax-gap-sm);
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
        padding: var(--pax-space-2);
        overflow-x: hidden;
        overflow-y: auto;
        transition:
            width 0.22s ease,
            border-color 0.18s ease,
            background 0.18s ease;
    }

    .icon-toolbar__controls {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--pax-gap-xs);
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
        padding: 0 var(--pax-gap-sm);
    }

    :global(.settings-tool-danger) {
        --accent: var(--pax-ui-danger);
    }

    :global(.icon-btn[data-accent-id="theme_library"]),
    :global(.icon-btn[data-accent-id="stats"]),
    :global(.icon-btn[data-accent-id="restart"]) {
        --accent: var(--pax-ui-accent-warm);
    }

    :global(.icon-btn[data-accent-id="appearance"]) {
        --accent: var(--pax-ui-accent);
    }

    :global(.icon-btn[data-accent-id="combat_tuning"]) {
        --accent: var(--pax-ui-danger);
    }

    :global(.icon-btn[data-accent-id="audio"]) {
        --accent: var(--pax-ui-accent);
    }

    :global(.icon-btn[data-accent-id="video_graphics"]) {
        --accent: var(--pax-color-player-blue);
    }

    :global(.icon-btn[data-accent-id="diagnostics"]) {
        --accent: var(--pax-ui-warning);
    }

    :global(.icon-btn[data-accent-id="hotkeys"]) {
        --accent: var(--pax-color-player-blue);
    }

    :global(.icon-btn[data-accent-id="help"]) {
        --accent: var(--pax-ui-text-soft);
    }

    :global(.icon-btn[data-accent-id="quit"]) {
        --accent: var(--pax-ui-danger);
    }

    .section-panel[data-accent-id="players"] {
        --accent: var(--pax-ui-accent);
    }

    .section-panel[data-accent-id="match_flow"] {
        --accent: var(--pax-color-player-yellow);
    }

    .section-panel[data-accent-id="combat_tuning"] {
        --accent: var(--pax-ui-danger);
    }

    .section-panel[data-accent-id="economy"] {
        --accent: var(--pax-ui-success);
    }

    .section-panel[data-accent-id="travel_orders"] {
        --accent: var(--pax-color-player-blue);
    }

    .section-panel[data-accent-id="conquest"] {
        --accent: var(--pax-ui-danger);
    }

    .section-panel[data-accent-id="effects"] {
        --accent: var(--pax-ui-danger);
    }

    .section-panel[data-accent-id="map_options"] {
        --accent: var(--pax-color-player-purple);
    }

    .section-panel[data-accent-id="territory_phase_field"] {
        --accent: var(--pax-color-player-blue);
    }

    .section-panel[data-accent-id="territory_phase_edges"] {
        --accent: var(--pax-ui-danger);
    }

    .section-panel[data-accent-id="territory_ember_lattice"] {
        --accent: var(--pax-color-player-orange);
    }

    .section-panel[data-accent-id="frontier_fx"] {
        --accent: var(--pax-color-player-orange);
    }

    .section-panel[data-accent-id="territory_tuning"] {
        --accent: var(--pax-ui-success);
    }

    .section-panel[data-accent-id="territory_styles"] {
        --accent: var(--pax-color-player-blue);
    }

    .section-panel[data-accent-id="fleet_star_visuals"] {
        --accent: var(--pax-color-player-blue);
    }

    .section-panel[data-accent-id="audio"] {
        --accent: var(--pax-ui-accent);
    }

    .section-panel[data-accent-id="diagnostics"] {
        --accent: var(--pax-ui-warning);
    }

    .section-panel[data-accent-id="logging"] {
        --accent: var(--pax-ui-text-soft);
    }

    .section-panel[data-accent-id="ai"] {
        --accent: var(--pax-color-player-orange);
    }

    .settings-content {
        grid-area: content;
        min-width: 0;
        height: 100%;
        max-height: calc(100vh - var(--pax-ui-topbar-height) - 24px);
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
        gap: var(--pax-space-2);
        padding: var(--pax-gap-sm);
    }

    .icon-toolbar__controls {
        gap: var(--pax-space-2);
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
        padding: 0 var(--pax-space-3);
        gap: var(--pax-gap-sm);
    }

    .icon-symbol {
        width: 21px;
        height: 21px;
    }

    .icon-symbol :global(svg) {
        width: calc(19px * var(--pax-ui-icon-scale, 1));
        height: calc(19px * var(--pax-ui-icon-scale, 1));
    }

    .icon-label {
        font-size: calc(0.64rem * var(--pax-ui-label-scale, 1));
        letter-spacing: 0.1em;
        line-height: 1.1;
    }

    .settings-content {
        gap: var(--pax-space-3);
    }

    :global(.section-head) {
        min-height: 48px;
        padding: 0 var(--pax-gap-md);
    }

    .head-label {
        font-size: calc(0.86rem * var(--pax-ui-title-scale, 1));
        line-height: 1.1;
    }

    .section-body {
        gap: var(--pax-space-3);
        padding: var(--pax-gap-md);
    }

</style>
