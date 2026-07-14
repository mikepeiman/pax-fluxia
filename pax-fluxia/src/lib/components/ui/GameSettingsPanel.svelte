<script lang="ts">
    import { onMount, tick } from "svelte";
    import { fade } from "svelte/transition";
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
        TICK_INTERVAL_CHANGED_EVENT,
        type AnimLockMode,
    } from "./panelSync";
    import {
        togglePin,
        toggleTickRatio,
        toggleAnimSpeedRatio,
        recalcOnTickChange,
        recalcOnAnimSpeedChange,
        type AnimLockTransition,
    } from "./animLockMath";
    import {
        buildConfigMarkdown,
        parseConfigImport,
    } from "./configTransfer";
    import ControlsSectionTiming from "./settings/ControlsSection-Timing.svelte";
    import ControlsSectionBattle from "./settings/ControlsSection-Battle.svelte";
    import ControlsSectionEconomy from "./settings/ControlsSection-Economy.svelte";
    import ControlsSectionAI from "./settings/ControlsSection-AI.svelte";
    import ControlsSectionTravel from "./settings/ControlsSection-Travel.svelte";
    import ControlsSectionSurge from "./settings/ControlsSection-Surge.svelte";
    import ControlsSectionConquest from "./settings/ControlsSection-Conquest.svelte";
    import ControlsSectionTerritory from "./settings/ControlsSection-Territory.svelte";
    import ControlsSectionFrontierFx from "./settings/ControlsSection-FrontierFx.svelte";
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

    // Lock math lives in animLockMath.ts (pure transitions over
    // {modes, ratios}); this component owns the $state and persistence.
    function applyLockTransition(transition: AnimLockTransition) {
        animLockModes = transition.modes;
        animLockRatios = transition.ratios;
        if (transition.set) setAnimValue(transition.set.key, transition.set.value);
        saveAnimLockRatios(animLockRatios);
        saveAnimLockModes(animLockModes);
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

        // Surge pulse tick-binding is resolved live in ShipRenderer — no
        // config/panel write here (writing clobbered the saved free-run value).

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
        notifyTickIntervalChanged(nextTick);
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
        notifyTickIntervalChanged(value);
    }

    /** Let tick displays outside this panel (HUD Game Speed widget) refresh. */
    function notifyTickIntervalChanged(valueMs: number) {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
            new CustomEvent(TICK_INTERVAL_CHANGED_EVENT, {
                detail: { valueMs },
            }),
        );
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
        const md = buildConfigMarkdown(GAME_CONFIG as unknown as Record<string, unknown>);
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
                const result = parseConfigImport(
                    reader.result as string,
                    GAME_CONFIG as unknown as Record<string, unknown>,
                );
                if (!result.ok) {
                    configStatus = result.error;
                    configStatusColor = "#f87171";
                    input.value = "";
                    return;
                }

                if (result.applied > 0) {
                    applyConfigPatch(result.patch);
                }

                const parts = [`${result.applied} applied`];
                if (result.skipped) parts.push(`${result.skipped} unknown`);
                if (result.typeErrors)
                    parts.push(`${result.typeErrors} type mismatches`);
                configStatus = parts.join(", ");
                configStatusColor =
                    result.typeErrors > 0 ? "#fbbf24" : "#4ade80";
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
        applyLockTransition(
            togglePin(
                { modes: animLockModes, ratios: animLockRatios },
                key,
                ANIM_SLIDERS.find((s) => s.key === key),
                GAME_CONFIG.BASE_TICK_MS,
            ),
        );
    }

    /** Lock current ratio relative to tick (value scales proportionally when tick changes) */
    function lockRatioToTick(key: string) {
        applyLockTransition(
            toggleTickRatio(
                { modes: animLockModes, ratios: animLockRatios },
                key,
                ANIM_SLIDERS.find((s) => s.key === key),
                (GAME_CONFIG as any)[key] as number,
                GAME_CONFIG.BASE_TICK_MS,
            ),
        );
    }

    /** Recalculate all locked/pinned animation values when tick interval changes */
    function recalcAnimLocksOnTickChange(newTickMs: number) {
        const updates = recalcOnTickChange(
            { modes: animLockModes, ratios: animLockRatios },
            ANIM_SLIDERS,
            newTickMs,
        );
        for (const [key, value] of Object.entries(updates)) {
            setAnimValue(key, value);
        }
        return updates;
    }

    /** Lock current ratio relative to animation speed (value scales when anim speed changes) */
    function lockRatioToAnimSpeed(key: string) {
        applyLockTransition(
            toggleAnimSpeedRatio(
                { modes: animLockModes, ratios: animLockRatios },
                key,
                (GAME_CONFIG as any)[key] as number,
                animationStore.speedMs,
            ),
        );
    }

    /** Recalculate animSpeed-locked values when animation speed changes */
    function recalcAnimLocksOnAnimSpeedChange(newAnimMs: number) {
        const updates = recalcOnAnimSpeedChange(
            { modes: animLockModes, ratios: animLockRatios },
            ANIM_SLIDERS,
            newAnimMs,
        );
        for (const [key, value] of Object.entries(updates)) {
            setAnimValue(key, value);
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
    const SHOW_ALL_KEY = "pax-fluxia-settings-show-all";
    const ACTIVE_SUBSECTIONS_KEY = "pax-fluxia-settings-subsections";
    // Per-category memory of the last selected section, so switching
    // categories and coming back restores the section you were on (e.g.
    // Timing) instead of snapping to the category's first chip. null = the
    // user had deliberately collapsed the section body.
    const SECTION_BY_CATEGORY_KEY = "pax-fluxia-settings-section-by-category";

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

    function loadShowAllSections(): boolean {
        if (typeof window === "undefined") return false;
        return localStorage.getItem(SHOW_ALL_KEY) === "1";
    }

    function loadActiveSubsections(): Record<string, string> {
        if (typeof window === "undefined") return {};
        try {
            const parsed = JSON.parse(
                localStorage.getItem(ACTIVE_SUBSECTIONS_KEY) ?? "{}",
            );
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }

    let activeSectionId = $state<ActiveSectionId | null>(loadActiveSection());

    // Which category panel is open — tracked INDEPENDENTLY of the selected
    // section so that deselecting a section just hides its sub-content (body)
    // while the category chrome + section chips stay visible. Persisted.
    const OPEN_CATEGORY_KEY = "pax-fluxia-settings-open-category";

    function categoryOf(id: ActiveSectionId | null): SettingsCategoryId | null {
        if (id === null) return null;
        return isUtilityPanelId(id)
            ? UTILITY_PANEL_CATEGORY[id]
            : (CATEGORY_BY_SECTION[id] ?? null);
    }

    function loadOpenCategory(): SettingsCategoryId | null {
        if (typeof window === "undefined") return categoryOf(loadActiveSection());
        const stored = localStorage.getItem(
            OPEN_CATEGORY_KEY,
        ) as SettingsCategoryId | null;
        if (stored && SETTINGS_CATEGORIES.some((c) => c.id === stored)) {
            return stored;
        }
        return categoryOf(loadActiveSection());
    }

    let openCategoryId = $state<SettingsCategoryId | null>(loadOpenCategory());

    function loadSectionMemory(): Partial<
        Record<SettingsCategoryId, ActiveSectionId | null>
    > {
        if (typeof window === "undefined") return {};
        try {
            const parsed = JSON.parse(
                localStorage.getItem(SECTION_BY_CATEGORY_KEY) ?? "{}",
            );
            if (!parsed || typeof parsed !== "object") return {};
            const memory: Partial<
                Record<SettingsCategoryId, ActiveSectionId | null>
            > = {};
            for (const [cat, value] of Object.entries(parsed)) {
                if (!SETTINGS_CATEGORIES.some((c) => c.id === cat)) continue;
                if (value === null) {
                    memory[cat as SettingsCategoryId] = null;
                    continue;
                }
                if (typeof value !== "string") continue;
                const section = isUtilityPanelId(value)
                    ? value
                    : normalizeSettingsSectionId(value);
                if (section) memory[cat as SettingsCategoryId] = section;
            }
            return memory;
        } catch {
            return {};
        }
    }

    let sectionMemoryByCategory = $state(loadSectionMemory());

    function rememberSectionForCategory(
        category: SettingsCategoryId,
        sectionId: ActiveSectionId | null,
    ) {
        sectionMemoryByCategory = {
            ...sectionMemoryByCategory,
            [category]: sectionId,
        };
    }

    $effect(() => {
        if (typeof window === "undefined") return;
        localStorage.setItem(
            SECTION_BY_CATEGORY_KEY,
            JSON.stringify(sectionMemoryByCategory),
        );
    });

    // The panel chrome is open whenever a category is open (even with no section
    // selected), so layout/activity tracks the category, not the section.
    let activeToolHasPanel = $derived(openCategoryId !== null);
    // "All" view: stack every section of the active category in one scroll.
    // activeSectionId is kept (so the category + chips stay resolved); this just
    // overlays the all-sections render. Persisted so the chosen view survives reload.
    let showAllSections = $state(loadShowAllSections());

    function persistActiveSection() {
        if (typeof window === "undefined") return;
        if (activeSectionId) {
            localStorage.setItem(ACTIVE_SECTION_KEY, activeSectionId);
        } else {
            localStorage.removeItem(ACTIVE_SECTION_KEY);
        }
    }

    // Persist the "All" toggle + per-section subsection chip selection so the
    // whole settings view (which section/subsection/All) is restored on reload.
    $effect(() => {
        if (typeof window === "undefined") return;
        localStorage.setItem(SHOW_ALL_KEY, showAllSections ? "1" : "0");
    });
    $effect(() => {
        if (typeof window === "undefined") return;
        localStorage.setItem(
            ACTIVE_SUBSECTIONS_KEY,
            JSON.stringify(activeSubsections),
        );
    });

    $effect(() => {
        if (typeof window === "undefined") return;
        if (openCategoryId) {
            localStorage.setItem(OPEN_CATEGORY_KEY, openCategoryId);
        } else {
            localStorage.removeItem(OPEN_CATEGORY_KEY);
        }
    });

    function selectSection(id: ActiveSectionId | null) {
        // Selecting or closing any single section always exits the "All" view.
        showAllSections = false;
        if (id === null) {
            // Deselect: hide the sub-content only — keep the category panel +
            // chips open (do NOT clear openCategoryId).
            activeSectionId = null;
            if (openCategoryId) {
                rememberSectionForCategory(openCategoryId, null);
            }
        } else {
            // Toggling the active chip deselects it (hides body); otherwise open it.
            activeSectionId = activeSectionId === id ? null : id;
            const category = categoryOf(id);
            if (category) {
                openCategoryId = category;
                rememberSectionForCategory(category, activeSectionId);
            }
        }
        persistActiveSection();
    }

    /** Fully close the open category panel (chrome + body). */
    function closeCategoryPanel() {
        showAllSections = false;
        activeSectionId = null;
        openCategoryId = null;
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
    // UNIFIED SURFACE: territory section chips are a STABLE set that never
    // changes with the active render mode. The per-mode swap (showing only the
    // section matching TERRITORY_RENDER_MODE) is removed — every territory
    // subsection chip (Render Mode, Topology, Styles, the per-mode style
    // sections, Frontier FX) is always available; selecting a chip shows those
    // controls whether or not they match the live render mode. isSectionVisible
    // now filters by TIER only.
    function isSectionVisible(section: SettingsSectionDefinition): boolean {
        return TIER_RANK[section.tier] <= TIER_RANK[activeTier];
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

    // The open category is its own state now (see openCategoryId) so the panel
    // chrome persists when no section is selected.
    let activeCategoryId = $derived<SettingsCategoryId | null>(openCategoryId);
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
        if (openCategoryId === catId) {
            // Clicking the open category again closes the whole panel.
            closeCategoryPanel();
            return;
        }
        openCategoryId = catId;
        showAllSections = false;
        // Restore this category's remembered section (the one the user was on
        // last time — e.g. Timing), not blindly the first chip. Set directly
        // instead of via selectSection: its toggle semantics could deselect
        // the remembered section instead of opening it.
        const chips = chipsForCategory(catId);
        const remembered = sectionMemoryByCategory[catId];
        activeSectionId =
            remembered === null
                ? null
                : remembered && chips.some((chip) => chip.id === remembered)
                  ? remembered
                  : (chips[0]?.id ?? null);
        persistActiveSection();
    }

    // Selecting a render mode (or any reactive change) can hide the open
    // section; if so, fall back to the first chip of its category so the panel
    // never blanks out. This is a DISPLAY fallback only — it must NOT call
    // persistActiveSection(), or a transient mount-time mismatch (e.g. the
    // restored section belongs to a render mode that isn't the active one yet)
    // would permanently erase the user's saved section choice. We leave the
    // persisted preference intact so it restores the next time it's visible.
    $effect(() => {
        if (
            activeSectionId !== null &&
            !isUtilityPanelId(activeSectionId) &&
            !visibleSections.some((s) => s.id === activeSectionId)
        ) {
            const fallback = activeCategoryId
                ? chipsForCategory(activeCategoryId)[0]?.id ?? null
                : null;
            // PAUSE-EXEMPT collapse trace: if a setting toggle (e.g. Show fill)
            // makes the active section leave visibleSections, the panel jumps/
            // collapses. This logs the exact section + render-mode that triggered it.
            log.ui(
                "settings-fallback",
                `section "${activeSectionId}" left visibleSections -> "${fallback}" [mode=${activeTerritoryRenderMode}]`,
            );
            activeSectionId = fallback;
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
        const category = categoryOf(activeSectionId);
        if (category) {
            openCategoryId = category;
            rememberSectionForCategory(category, activeSectionId);
        }
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

    // Subsection chips come straight from the registry (territory_styles'
    // are catalog-derived there); the old Finish-chip filter died with the
    // metaball quarantine.
    let sectionSubsections = $derived.by(() =>
        Object.fromEntries(
            sections.map((section) => [
                section.id,
                [...((section.subsections ?? []) as SubsectionChip[])],
            ]),
        ) as Record<string, SubsectionChip[]>,
    );
    let activeSubsections = $state<Record<string, string>>(loadActiveSubsections());
    let settingsSearchQuery = $state("");
    const sectionBodyNodes = new Map<ActiveSectionId, HTMLElement>();
    let settingsSearchResults = $derived.by(() =>
        searchSettings(settingsSearchQuery, 24, activeTerritoryRenderMode),
    );
    // GLOBAL search: a non-empty query switches the panel to a flat results
    // LIST (every match, ranked); clicking a result opens its native location.
    let searchActive = $derived(settingsSearchQuery.trim().length > 0);

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

    function resolveSearchTargetElement(
        node: HTMLElement,
        result: SettingsSearchResult,
    ): HTMLElement | null {
        // Reliable path first: an EXACT match on the stable config key. Fuzzy
        // text matching (below) silently mis-hits (one label is a substring of
        // another) or misses entirely when a row's visible label differs from
        // the search anchor — the cause of "search doesn't take me to / doesn't
        // highlight the setting" on rows the fuzzy pass can't resolve.
        if (result.configKey) {
            const exact = node.querySelector<HTMLElement>(
                `[data-setting-config-key="${CSS.escape(result.configKey)}"]`,
            );
            if (exact) return exact;
        }
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
        setTimeout(() => target.classList.remove("settings-search-hit"), 1500);
    }

    async function navigateToSearchResult(result: SettingsSearchResult) {
        // Open the native location: tier → category → section → subsection.
        const section = getSectionDefinition(result.sectionId);
        if (TIER_RANK[section.tier] > TIER_RANK[activeTier]) setTier(section.tier);
        const category = categoryOf(result.sectionId);
        if (category) openCategoryId = category;
        activeSectionId = result.sectionId;
        showAllSections = false;
        if (result.subsectionId) {
            activeSubsections = {
                ...activeSubsections,
                [result.sectionId]: result.subsectionId,
            };
        }
        persistActiveSection();
        // Leave the search view so the native panel renders, then scroll+flash.
        clearSettingsSearch();
        await tick();
        await tick();
        const sectionNode = sectionBodyNodes.get(result.sectionId);
        if (!sectionNode) return;
        const target =
            resolveSearchTargetElement(sectionNode, result) ?? sectionNode;
        const scrollTarget =
            target.closest(
                "[data-setting-config-key], .var-row, .toggle-row, .engine-control-group, .theme-card, section",
            ) ?? target;
        // Bring the matched control to the TOP of the panel view (not centered)
        // so it lands where the eye expects it, then flash it for ~1.5s.
        (scrollTarget as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "start",
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

    // TEMP DIAGNOSTIC (panel-collapse hunt): logs the pixel height of every link
    // in the settings height chain whenever it changes, so a toggle that shrinks
    // the panel reveals exactly which element resized and by how much. Visible in
    // the log panel under the "canvas" channel. Remove once the cause is found.
    function probePanelHeights(node: HTMLElement) {
        const selectors = [
            ".controls-panel",
            ".settings-shell",
            ".settings-content",
            ".section-panel",
            ".section-body",
            ".icon-toolbar",
        ];
        const observed = new WeakSet<Element>();
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const el = entry.target as HTMLElement;
                const label =
                    selectors.find((s) => el.matches(s)) ?? el.className;
                // log.ui = PAUSE-EXEMPT: the panel pauses the game, which mutes
                // log.canvas — so this probe never surfaced before. See logger.ts.
                log.ui(
                    "settings-probe",
                    `${label} h=${Math.round(entry.contentRect.height)}`,
                );
            }
        });
        const scan = () => {
            for (const sel of selectors) {
                const els = node.matches(sel)
                    ? [node]
                    : Array.from(node.querySelectorAll<HTMLElement>(sel));
                for (const el of els) {
                    if (!observed.has(el)) {
                        observed.add(el);
                        ro.observe(el);
                    }
                }
            }
        };
        scan();
        const mo = new MutationObserver(() => scan());
        mo.observe(node, { childList: true, subtree: true });
        return {
            destroy() {
                ro.disconnect();
                mo.disconnect();
            },
        };
    }
</script>

<div
    class="controls-panel"
    class:controls-panel--ribbon-expanded={ribbonExpanded}
    class:controls-panel--dock-left={dockSide === "left"}
    use:probePanelHeights>

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
    </div>
    {#if searchActive}
        <div class="section-panel section-panel--search" transition:fade={{ duration: 120 }}>
            <div class="search-results">
                {#if settingsSearchResults.length === 0}
                    <p class="section-empty-hint">No settings match &ldquo;{settingsSearchQuery.trim()}&rdquo;.</p>
                {:else}
                    <div class="search-results__count">
                        {settingsSearchResults.length} result{settingsSearchResults.length === 1 ? "" : "s"}
                    </div>
                    {#each settingsSearchResults as result (result.id)}
                        <button
                            type="button"
                            class="search-result-row"
                            onclick={() => void navigateToSearchResult(result)}
                            title={`Open in ${result.sectionLabel}`}
                        >
                            <span class="search-result-row__title">{result.title}</span>
                            <span class="search-result-row__crumb">{result.sectionLabel}</span>
                            <span class="search-result-row__go" aria-hidden="true">→</span>
                        </button>
                    {/each}
                {/if}
            </div>
        </div>
    {:else if openCategoryId}
        <div class="section-panel" data-accent-id={activeCategoryId} transition:fade={{ duration: 120 }}>
            <div class="section-head-wrap">
                <PaxHudButton class="section-head" onclick={closeCategoryPanel} title={`Close ${activeCategory?.label ?? "settings"}`}>
                    <span class="head-icon"><HudIcon name={activeCategory?.icon ?? "settings"} /></span>
                    <span class="head-label">{activeCategory?.label ?? ""}</span>
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
                {#if !showAllSections && activePanel && !isUtilityPanelId(activePanel.id) && (sectionSubsections[activePanel.id]?.length ?? 0) > 1}
                    {@const sec = activePanel}
                    {@const isRenderSection = sec?.id === "territory_styles"}
                    {@const effectiveSub =
                        activeSubsections[sec?.id] ??
                        (isRenderSection ? (activeTerritoryRenderMode ?? "all") : "all")}
                    <div class="section-subnav section-subnav--secondary">
                        {#if !isRenderSection}
                        <PaxHudButton
                            class="subsection-chip"
                            active={effectiveSub === "all"}
                            onclick={() => toggleSubsection(sec?.id, "all")}
                            title="Show all"
                        >
                            <span class="subsection-chip__icon"><HudIcon name="phase-field" size={14} /></span>
                            <span>All</span>
                        </PaxHudButton>
                        {/if}
                        {#each sectionSubsections[sec?.id] ?? [] as subsection}
                            {@const isLive =
                                isRenderSection &&
                                subsection.id === activeTerritoryRenderMode}
                            <PaxHudButton
                                class={"subsection-chip" +
                                    (isLive ? " subsection-chip--live" : "")}
                                active={effectiveSub === subsection.id}
                                onclick={() => toggleSubsection(sec?.id, subsection.id)}
                                title={isLive
                                    ? subsection.label + " (live render mode)"
                                    : subsection.label}
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
            {:else if activePanel}
                {@const sec = activePanel}
                <div
                    class="section-body"
                    use:registerSectionBody={{
                        sectionId: sec?.id,
                        activeSubsection: activeSubsections[sec?.id] ?? "all",
                    }}
                    use:enhanceSettingMetadata={{
                        scope: isUtilityPanelId(sec?.id) ? null : getSectionDefinition(sec?.id).scope,
                    }}
                >
                    {@render sectionContent(sec)}
                </div>
            {:else}
                <!-- Category open but no section selected (deselected). Keep the
                     panel + chips; show a quiet hint instead of collapsing. -->
                <div class="section-body section-body--empty">
                    <p class="section-empty-hint">
                        Select a section above to edit its settings.
                    </p>
                </div>
            {/if}
        </div>
    {/if}

{#snippet sectionContent(sec: NavChip)}
                {#if sec?.id === "ui_appearance"}
                    <HudThemePanel />
                    <ControlsSectionVisuals
                        {panel}
                        {updatePanel}
                        {vis}
                        {updateVisual}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "ui_typography"}
                    <TypographyTokenPanel />
                {:else if sec?.id === "ui_themes"}
                    <ThemeLibraryPanel />
                {:else if sec?.id === "ui_savegame"}
                    <SaveLoadGamePanel />
                {:else if sec?.id === "ui_stats"}
                    <PaxSettingsInfoRow label="Tick" value={activeGameStore.currentTick ?? 0} />
                    <PaxSettingsInfoRow label="Players" value={activeGameStore.players.length} />
                    <PaxSettingsInfoRow label="Stars" value={activeGameStore.stars.length} />
                    <PaxSettingsInfoRow label="Selected" value={selectedStarStore.id ?? "None"} />
                {:else if sec?.id === "ui_hotkeys"}
                    <PaxSettingsInfoRow label="F" value="Fit the map to the viewport." valueAlign="left" />
                    <PaxSettingsInfoRow label="Esc" value="Close active overlays or clear search focus." valueAlign="left" />
                    <PaxSettingsInfoRow label="Click star" value="Select and inspect a star." valueAlign="left" />
                    <PaxSettingsInfoRow label="Drag lane" value="Issue a route from an owned star." valueAlign="left" />
                {:else if sec?.id === "ui_help"}
                    <p>Select owned stars, assign routes across connected lanes, and watch active ships transfer control through the network.</p>
                {:else if sec?.id === "match_flow"}
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
                {:else if sec?.id === "combat_tuning"}
                    <ControlsSectionBattle
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "economy"}
                    <ControlsSectionEconomy
                        {panel}
                        {updatePanel}
                        {transferRate}
                        {updateTransferRate}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "ai"}
                    <ControlsSectionAI
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "travel_orders"}
                    <ControlsSectionTravel
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "conquest"}
                    <ControlsSectionConquest
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "effects"}
                    <ControlsSectionSurge
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "transition"}
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
                        systemTitle="Transition"
                    />
                {:else if sec?.id === "territory_tuning"}
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
                    <!-- Geometry Source selector RETIRED (2026-07-08): geometry is
                         unified on PowerCore; all saved values auto-migrate. -->
                {:else if sec?.id === "territory_styles"}
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
                        activeSubsection={activeSubsections[sec?.id] ??
                            (activeTerritoryRenderMode ?? "all")}
                    />
                {:else if sec?.id === "frontier_fx"}
                    <ControlsSectionFrontierFx
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "fleet_star_visuals"}
                    <ControlsSectionShips
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "players"}
                    <ControlsSectionPlayers
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "map_options"}
                    <ControlsSectionVisuals
                        {panel}
                        {updatePanel}
                        {vis}
                        {updateVisual}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "logging"}
                    <ControlsSectionLogging
                        {logCategories}
                        {logRefresh}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "audio"}
                    <ControlsSectionAudio
                        {panel}
                        {updatePanel}
                        syncFromConfig={syncAllFromConfig}
                    />
                {:else if sec?.id === "diagnostics"}
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
        /* Definite single row that fills the shell (min 0 so it never grows with
           content). Without this the implicit row is `auto` = content-sized, and
           .settings-content's height:100% resolves against a content-sized track
           — a feedback loop the browser re-resolves on reflow, which is the
           intermittent ~25% "collapse" seen when certain toggles force a relayout. */
        grid-template-rows: minmax(0, 1fr);
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
        animation: settings-search-hit-flash 1.5s ease-out;
        border-radius: var(--pax-radius-sm, 6px);
    }
    /* Flat search results list — every match as a clickable row (setting +
       breadcrumb → opens its native location). */
    .search-results {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--pax-space-2);
        overflow-y: auto;
    }
    .search-results__count {
        padding: 2px 6px var(--pax-gap-sm);
        color: var(--pax-ui-text-dim, #9aa4b2);
        font-size: var(--pax-type-3xs, 0.68rem);
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .search-result-row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: baseline;
        gap: var(--pax-gap-sm);
        width: 100%;
        padding: 8px 10px;
        border: 0;
        border-radius: var(--pax-ui-radius-xs, 5px);
        background: color-mix(in srgb, var(--pax-ui-panel-bg-strong, #0b1120) 55%, transparent);
        color: var(--pax-ui-text, #dbe3ef);
        font-family: var(--pax-ui-font-ui, inherit);
        text-align: left;
        cursor: pointer;
        transition: background 0.1s ease;
    }
    .search-result-row:hover,
    .search-result-row:focus-visible {
        background: color-mix(in srgb, var(--pax-ui-accent-warm, #e0b062) 16%, transparent);
        outline: none;
    }
    .search-result-row__title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--pax-type-sm, 0.86rem);
        font-weight: var(--pax-weight-medium, 500);
    }
    .search-result-row__crumb {
        color: var(--pax-ui-text-dim, #9aa4b2);
        font-size: var(--pax-type-2xs, 0.72rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        white-space: nowrap;
    }
    .search-result-row__go {
        color: var(--pax-ui-accent-warm, #e0b062);
        opacity: 0.65;
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
            background: color-mix(in srgb, var(--accent) 32%, transparent);
            box-shadow:
                0 0 0 3px color-mix(in srgb, var(--accent) 60%, transparent),
                0 0 20px 5px color-mix(in srgb, var(--accent) 45%, transparent);
        }
        45% {
            background: color-mix(in srgb, var(--accent) 18%, transparent);
            box-shadow:
                0 0 0 2px color-mix(in srgb, var(--accent) 42%, transparent),
                0 0 14px 3px color-mix(in srgb, var(--accent) 30%, transparent);
        }
        100% {
            background: transparent;
            box-shadow: 0 0 0 0 transparent;
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
    /* Category open but no section selected — quiet placeholder. */
    .section-body--empty {
        align-items: center;
        justify-content: center;
    }
    .section-empty-hint {
        margin: 0;
        padding: var(--pax-space-4);
        color: var(--pax-ui-text-dim);
        font-family: var(--pax-ui-font-copy);
        font-size: var(--pax-type-2xs);
        text-align: center;
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
        /* Per-chip hue (assigned by position below) gives each chip in a row its
           own colour; active state fills with that hue. */
        --chip-hue: 200;
        display: inline-flex;
        align-items: center;
        gap: var(--pax-gap-xs);
        min-height: 24px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid hsl(var(--chip-hue) 55% 60% / 0.4);
        background: hsl(var(--chip-hue) 45% 14% / 0.45);
        color: hsl(var(--chip-hue) 35% 82%);
        font-family: var(--pax-ui-font-ui);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease,
            box-shadow 0.15s ease,
            transform 0.15s ease;
    }
    :global(.subsection-chip:hover) {
        border-color: hsl(var(--chip-hue) 75% 62% / 0.85);
        background: hsl(var(--chip-hue) 55% 22% / 0.7);
        color: hsl(var(--chip-hue) 60% 92%);
        transform: translateY(-1px);
    }
    :global(.subsection-chip.active) {
        border-color: hsl(var(--chip-hue) 85% 64%);
        /* Vivid active fill in the chip's own hue. */
        background: linear-gradient(
            180deg,
            hsl(var(--chip-hue) 72% 52%),
            hsl(var(--chip-hue) 70% 44%)
        );
        color: hsl(var(--chip-hue) 95% 97%);
        box-shadow:
            0 0 0 1px hsl(var(--chip-hue) 80% 60% / 0.5),
            0 2px 12px hsl(var(--chip-hue) 75% 50% / 0.45);
    }
    :global(.subsection-chip.active:hover) {
        transform: translateY(-1px);
    }
    /* Spread the row across a colour range by chip position. */
    :global(.section-subnav .subsection-chip:nth-child(1)) { --chip-hue: 190; }
    :global(.section-subnav .subsection-chip:nth-child(2)) { --chip-hue: 235; }
    :global(.section-subnav .subsection-chip:nth-child(3)) { --chip-hue: 280; }
    :global(.section-subnav .subsection-chip:nth-child(4)) { --chip-hue: 325; }
    :global(.section-subnav .subsection-chip:nth-child(5)) { --chip-hue: 18; }
    :global(.section-subnav .subsection-chip:nth-child(6)) { --chip-hue: 48; }
    :global(.section-subnav .subsection-chip:nth-child(7)) { --chip-hue: 90; }
    :global(.section-subnav .subsection-chip:nth-child(8)) { --chip-hue: 150; }
    /* Live render-mode marker: the chip whose mode is the active TERRITORY_RENDER_MODE. */
    :global(.subsection-chip--live) {
        position: relative;
    }
    :global(.subsection-chip--live)::after {
        content: "";
        position: absolute;
        top: 3px;
        right: 3px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--pax-color-player-green, #4ade80);
        box-shadow: 0 0 6px 1px
            color-mix(in srgb, var(--pax-color-player-green, #4ade80) 60%, transparent);
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
        /* Fill the allocated column with a DEFINITE height so the section body
           scrolls internally — content-sizing here makes the whole panel shrink
           to its content (the ~25% "collapse" on toggles). */
        height: 100%;
        min-height: 0;
        overflow: hidden;
    }

    .settings-shell {
        grid-template-columns: var(--settings-ribbon-width) minmax(0, 1fr);
        /* Definite single row (see base rule) so the content column has a real
           height to scroll inside, independent of how tall its content is. */
        grid-template-rows: minmax(0, 1fr);
        gap: var(--pax-gap-sm);
        flex: 1;
        min-height: 0;
        /* Stretch the content column to full height; the rail stays compact via
           its own align-self below. */
        align-items: stretch;
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
        /* Keep the category rail compact (top-aligned) now that the shell
           stretches its items to full height. */
        align-self: start;
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
        /* Fill the stretched shell column; the open section-panel (flex:1) then
           owns a definite height and its body scrolls internally. */
        min-height: 0;
        height: 100%;
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

    /* Per-category preset toolbar — fixed category CHROME, not section content.
       Anchored as a full-bleed bar across the top of the section panel (negative
       margins reach the panel edges; flat bottom edge butts against the first
       content heading) so it reads as the category's toolbar instead of an
       orphan content card floating above the chips. This is the SINGLE source
       of its framing — it is intentionally excluded from the shared
       .icon-toolbar/.section-panel content-card rule below. */
    .section-body :global(.category-theme-bar) {
        margin: calc(-1 * var(--pax-gap-md)) calc(-1 * var(--pax-gap-md)) var(--pax-gap-md);
        padding: var(--pax-space-2) var(--pax-gap-md);
        border: 0;
        border-bottom: 1px solid color-mix(in srgb, var(--pax-ui-accent-warm) 30%, transparent);
        border-radius: 0;
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 94%, transparent), color-mix(in srgb, var(--pax-color-void) 86%, transparent)),
            radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--pax-ui-accent) 10%, transparent), transparent 46%);
        clip-path: none;
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
    .section-panel {
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
        /* Rail fills the available content-box rather than demanding exactly
           var(--settings-ribbon-width). At an exact fit any border/scrollbar/
           sub-pixel rounding overflowed by ~1px and got clipped on the right
           ("menu slightly cut off"). minmax(0,1fr) can never overflow. */
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: "rail";
        gap: var(--pax-gap-sm);
        align-items: stretch;
        transition:
            grid-template-columns 0.22s ease,
            width 0.22s ease;
    }

    .settings-shell--with-panel {
        /* Content column must be minmax(0, 1fr), NOT minmax(360px, …): a hard
           360px floor + the rail (68–216px) + padding exceeds the panel at/near
           its min width (420px), so the grid overflowed and .area-controls
           (overflow:hidden) clipped the right edge in both ribbon states. With
           min 0 the content column shrinks to fit; its inner body scrolls. */
        grid-template-columns: minmax(0, 1fr) var(--settings-ribbon-width);
        grid-template-areas: "content rail";
    }

    .controls-panel--dock-left .settings-shell--with-panel {
        grid-template-columns: var(--settings-ribbon-width) minmax(0, 1fr);
        grid-template-areas: "rail content";
    }

    .icon-toolbar {
        width: 100%;
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
