<script lang="ts">
  import { GAME_CONFIG } from "$lib/config/game.config";
  import {
    isTerritoryRenderModeUiHidden,
    getTerritoryRenderModeLabel,
    resolveTerritoryRenderModeOptions,
  } from "$lib/territory/ui/territoryRenderModeCatalog";
  import {
    coerceVsTransitionModeForRenderMode,
    getTransitionModeOptionsForRenderMode,
  } from "$lib/territory/transitions/territoryTransitionModes";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import TerritoryTransitionTuning from "./TerritoryTransitionTuning.svelte";
  import PerimeterFieldTuning from "./PerimeterFieldTuning.svelte";
  import MetaballGridTuning from "./MetaballGridTuning.svelte";
  import GridGradientTuning from "./GridGradientTuning.svelte";
  import {
    metaballGridFamilyConfigDefaults,
    metaballGridPhaseEdgesModeDefaults,
  } from "$lib/territory/families/metaballGrid/config";
  import TerritoryGeometrySourceTuning from "./TerritoryGeometrySourceTuning.svelte";
  import TerritorySurfaceStyleTuning from "./TerritorySurfaceStyleTuning.svelte";
  import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
  import { territoryRenderStatus } from "$lib/stores/territoryRenderStatusStore";
  import {
    beginTerritoryTuningCompile,
    territoryTuningStatus,
  } from "$lib/stores/territoryTuningStatusStore";
  import { TERRITORY_GEOMETRY_LIMITS } from "$lib/territory/geometry/geometryTuning";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

  // ControlsSection-Territory -- Territory Rendering (Voronoi + Metaball)

  interface Props {
    panel: Record<string, any>;
    updatePanel: (key: string, value: any) => void;
    syncFromConfig?: () => void;
    animLockModes: Record<string, any>;
    animLockRatios: Record<string, any>;
    getAnimValue: (key: string) => number;
    setAnimValue: (key: string, val: number) => void;
    formatAnimValue: (val: number, unit: string) => string;
    pinValueToTickDuration: (key: string) => void;
    lockRatioToTick: (key: string) => void;
    lockRatioToAnimSpeed: (key: string) => void;
    view?: "modes" | "tuning" | "styles" | "all";
    activeSubsection?: string;
    showCategoryThemeBar?: boolean;
    hideRenderModeSelector?: boolean;
    systemTitle?: string;
  }

  let {
    panel,
    updatePanel,
    syncFromConfig,
    animLockModes,
    animLockRatios,
    getAnimValue,
    setAnimValue,
    formatAnimValue,
    pinValueToTickDuration,
    lockRatioToTick,
    lockRatioToAnimSpeed,
    view = "all",
    activeSubsection = "all",
    showCategoryThemeBar = false,
    hideRenderModeSelector = false,
    systemTitle = "Territory System",
  }: Props = $props();

  const showModesView = $derived(view === "all" || view === "modes");
  const showTuningView = $derived(view === "all" || view === "tuning");
  const showStylesView = $derived(view === "all" || view === "styles");
  type TerritoryStyleSubsectionId = "all" | "fill" | "border" | "finish";

  function resolveActiveStyleSubsection(): TerritoryStyleSubsectionId {
    if (
      activeSubsection === "fill" ||
      activeSubsection === "border" ||
      activeSubsection === "finish"
    ) {
      return activeSubsection;
    }
    return "all";
  }

  /** CX/DX sub-sliders stay visible when off; these drive disabled + dim styling. */
  let cxOn = $derived(
    panel.corridorEnabled ??
      GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
      true,
  );
  let dxOn = $derived(
    panel.disconnectEnabled ??
      GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
      false,
  );
  const topologyLimits = TERRITORY_GEOMETRY_LIMITS;

  type TerritorySystemModuleId =
    | "all"
    | "none"
    | "render-mode";
  type TerritoryRendererModuleId =
    | "all"
    | "none"
    | "metaball"
    | "perimeter-field"
    | "metaball-grid"
    | "grid-gradient"
    | "topology"
    | "surface";

  interface TerritoryModuleDef<T extends string> {
    id: T;
    label: string;
    icon: string;
  }

  type TerritorySystemViewId = Exclude<TerritorySystemModuleId, "all" | "none">;
  type TerritoryRendererViewId = Exclude<
    TerritoryRendererModuleId,
    "all" | "none"
  >;

  const TERRITORY_SYSTEM_MODULES: Array<
    TerritoryModuleDef<TerritorySystemViewId>
  > = [
    { id: "render-mode", label: "Mode", icon: "draw-polygon" },
  ];

  const TERRITORY_SYSTEM_MODULE_PANEL_KEY = "territorySystemModuleVisibility";
  const TERRITORY_RENDERER_MODULE_PANEL_KEY =
    "territoryRendererModuleVisibility";

  let activeSystemModule = $derived(
    (panel[TERRITORY_SYSTEM_MODULE_PANEL_KEY] ??
      "all") as TerritorySystemModuleId,
  );
  let activeRendererModule = $derived(
    (panel[TERRITORY_RENDERER_MODULE_PANEL_KEY] ??
      "all") as TerritoryRendererModuleId,
  );

  function visibleSystemModules(): Array<
    TerritoryModuleDef<TerritorySystemViewId>
  > {
    return TERRITORY_SYSTEM_MODULES.map((module) =>
      hideRenderModeSelector && module.id === "render-mode"
        ? { ...module, label: "Transition" }
        : module,
    );
  }

  function supportsRuntimeSurfaceStyleCard(): boolean {
    const activeStyle = resolveActiveStyleId();
    return (
      activeStyle === "territory_engine" ||
      activeStyle === "territory_runtime" ||
      activeStyle === "power_voronoi_runtime"
    );
  }

  function supportsSharedSurfaceStyleCard(): boolean {
    const activeStyle = resolveActiveStyleId();
    return activeStyle === "perimeter_field" || isMetaballGridStyle();
  }

  function supportsGridGradientStyleCard(): boolean {
    return resolveActiveStyleId() === "grid_gradient";
  }

  function hasTerritoryStyleControls(): boolean {
    return (
      supportsRuntimeSurfaceStyleCard() ||
      supportsSharedSurfaceStyleCard() ||
      supportsGridGradientStyleCard()
    );
  }

  function resolvedStyleSubsection():
    | "all"
    | "fill"
    | "border"
    | "finish" {
    if (isEdgeForwardMetaballGridStyle() && activeSubsection === "finish") {
      return "all";
    }
    return activeSubsection === "fill" ||
      activeSubsection === "border" ||
      activeSubsection === "finish"
      ? activeSubsection
      : "all";
  }

  function showStyleSection(id: "fill" | "border" | "finish"): boolean {
    const active = resolvedStyleSubsection();
    return active === "all" || active === id;
  }

  function sharedSurfaceStyleHeading(): string {
    if (isEmberLatticeStyle()) {
      return "Ember Lattice Surface";
    }
    if (isMetaballGridPhaseEdgesStyle()) {
      return "Phase Edges Surface";
    }
    if (isMetaballGridStyle()) {
      return "Metaball Grid Surface";
    }
    return "Perimeter Field Surface";
  }

  function sharedSurfaceStyleIntro(): string {
    if (isEmberLatticeStyle()) {
      return "Visible fill, border, and inward seam presentation for Ember Lattice. The contour-derived frontier technique, border-geometry path, and seam FX stay local to this mode; the shared surface shape knobs live here.";
    }
    if (isMetaballGridPhaseEdgesStyle()) {
      return "Visible fill and border presentation for the simpler Phase Edges mode. It keeps the edge-forward conquest read without Ember Lattice's contour/frontier comparison surface.";
    }
    if (isMetaballGridStyle()) {
      return "Visible fill and border presentation for Metaball Grid. Source geometry and topology live in Territory Tuning & Constraints; cell paint and border rendering live here.";
    }
    return "Visible fill, border, and finish presentation for Perimeter Field. Source geometry and topology live in Territory Tuning & Constraints.";
  }

  $effect(() => {
    if (activeSystemModule === "all" || activeSystemModule === "none") return;
    if (!visibleSystemModules().some((module) => module.id === activeSystemModule)) {
      updatePanel(TERRITORY_SYSTEM_MODULE_PANEL_KEY, "all");
    }
  });

  const METABALL_FALLOFF_OPTIONS = [
    {
      id: "inverse-square" as const,
      label: "Inverse square — organic, lower CPU",
    },
    {
      id: "gaussian" as const,
      label: "Gaussian — fluid look, heavier CPU",
    },
    {
      id: "smoothstep" as const,
      label: "Smoothstep — crisp falloff band",
    },
  ];

  function resolveMetaballFalloffId():
    | "inverse-square"
    | "gaussian"
    | "smoothstep" {
    const raw =
      panel.metaballFalloff ?? GAME_CONFIG.METABALL_FALLOFF ?? "gaussian";
    const hit = METABALL_FALLOFF_OPTIONS.find((o) => o.id === raw);
    return hit ? hit.id : "gaussian";
  }

  // Bridge compatibility: writes to both GAME_CONFIG (for runtime reads) and panel state (for UI reactivity).
  function debouncedConfigUpdate(
    configKey: string,
    panelKey: string,
    value: any,
    _delayMs = 100,
  ) {
    (GAME_CONFIG as any)[configKey] = value;
    updatePanel(panelKey, value);
    bumpTerritoryVisualConfig();
  }

  const topologyCommitFrames = new Map<string, number>();
  const topologyCommitTimeouts = new Map<string, number>();

  function clearScheduledTopologyCommit(configKey: string): void {
    const pendingFrame = topologyCommitFrames.get(configKey);
    if (
      pendingFrame !== undefined &&
      typeof cancelAnimationFrame === "function"
    ) {
      cancelAnimationFrame(pendingFrame);
    }
    topologyCommitFrames.delete(configKey);

    const pendingTimeout = topologyCommitTimeouts.get(configKey);
    if (pendingTimeout !== undefined) {
      clearTimeout(pendingTimeout);
    }
    topologyCommitTimeouts.delete(configKey);
  }

  function queueTopologyToggleUpdate(
    configKey: string,
    panelKey: string,
    value: any,
    label: string,
  ): void {
    clearScheduledTopologyCommit(configKey);
    updatePanel(panelKey, value);
    beginTerritoryTuningCompile(label);

    if (typeof requestAnimationFrame === "function") {
      const frameId = requestAnimationFrame(() => {
        topologyCommitFrames.delete(configKey);
        (GAME_CONFIG as any)[configKey] = value;
        bumpTerritoryVisualConfig();
      });
      topologyCommitFrames.set(configKey, frameId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      topologyCommitTimeouts.delete(configKey);
      (GAME_CONFIG as any)[configKey] = value;
      bumpTerritoryVisualConfig();
    }, 0);
    topologyCommitTimeouts.set(configKey, timeoutId);
  }

  function queueTopologySliderUpdate(
    configKey: string,
    panelKey: string,
    value: any,
    label: string,
    delayMs = 120,
  ): void {
    clearScheduledTopologyCommit(configKey);
    updatePanel(panelKey, value);
    beginTerritoryTuningCompile(label);

    const timeoutId = window.setTimeout(() => {
      topologyCommitTimeouts.delete(configKey);
      (GAME_CONFIG as any)[configKey] = value;
      bumpTerritoryVisualConfig();
    }, delayMs);
    topologyCommitTimeouts.set(configKey, timeoutId);
  }

  const TERRITORY_KEYS = [
    "territoryVoronoi",
    "territoryModifiedVoronoi",
    "territoryPowerVoronoi",
    "territoryPVV3",
    "territoryEngine",
    "territoryMetaball",
    "territoryPixel",
    "territoryGraph",
    "territoryContour",
    "territoryDistanceField",
  ] as const;
  function selectTerritory(
    chosen: (typeof TERRITORY_KEYS)[number],
    enabled: boolean,
  ) {
    if (enabled) {
      // Turn all off, then enable chosen exclusively
      for (let i = 0; i < TERRITORY_KEYS.length; i++) {
        const isChosen = TERRITORY_KEYS[i] === chosen;
        updatePanel(TERRITORY_KEYS[i], isChosen);
      }
    } else {
      // Allow turning off without forcing another on
      updatePanel(chosen, false);
    }
  }
  const MORPH_EASING_OPTIONS = [
    { id: "linear", label: "Linear" },
    { id: "smoothstep", label: "Smooth" },
    { id: "easeInOutQuad", label: "Quad" },
    { id: "easeInOutCubic", label: "Cubic" },
  ] as const;
  /* ── V3.1 Three-Concern Architecture ── */

  function getRenderModeOptions() {
    return resolveTerritoryRenderModeOptions();
  }

  /** Map style IDs to old boolean flag panel keys (backward compat) */
  const STYLE_TO_BOOLEAN: Record<string, string> = {
    vs_pvv3: "territoryPVV3",
    power_voronoi: "territoryPowerVoronoi",
    modified_voronoi: "territoryModifiedVoronoi",
    distance_field: "territoryDistanceField",
    voronoi: "territoryVoronoi",
    metaball: "territoryMetaball",
    pixel: "territoryPixel",
    graph: "territoryGraph",
    contour: "territoryContour",
    territory_engine: "territoryEngine",
  };

  const PHASE_EDGES_PRIMED_TUNABLES = [
    {
      configKey: "TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE",
      panelKey: "territoryFrontierBorderGeometryMode",
      familyDefault: "shared_edge",
      phaseEdgesDefault:
        metaballGridPhaseEdgesModeDefaults.TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE,
    },
    {
      configKey: "METABALL_GRID_WAVE_GEOMETRY",
      panelKey: "metaballGridWaveGeometry",
      familyDefault: metaballGridFamilyConfigDefaults.METABALL_GRID_WAVE_GEOMETRY,
      phaseEdgesDefault:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_WAVE_GEOMETRY,
    },
    {
      configKey: "METABALL_GRID_BORDER_MODE",
      panelKey: "metaballGridBorderMode",
      familyDefault: metaballGridFamilyConfigDefaults.METABALL_GRID_BORDER_MODE,
      phaseEdgesDefault:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_MODE,
    },
    {
      configKey: "METABALL_GRID_BORDER_BLEND",
      panelKey: "metaballGridBorderBlend",
      familyDefault: metaballGridFamilyConfigDefaults.METABALL_GRID_BORDER_BLEND,
      phaseEdgesDefault:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_BLEND,
    },
    {
      configKey: "METABALL_GRID_EDGE_SMOOTHING_PASSES",
      panelKey: "metaballGridEdgeSmoothingPasses",
      familyDefault:
        metaballGridFamilyConfigDefaults.METABALL_GRID_EDGE_SMOOTHING_PASSES,
      phaseEdgesDefault:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_SMOOTHING_PASSES,
    },
    {
      configKey: "METABALL_GRID_EDGE_TRIM_PX",
      panelKey: "metaballGridEdgeTrimPx",
      familyDefault: metaballGridFamilyConfigDefaults.METABALL_GRID_EDGE_TRIM_PX,
      phaseEdgesDefault:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_TRIM_PX,
    },
    {
      configKey: "METABALL_GRID_BORDER_CHAIKIN_PASSES",
      panelKey: "metaballGridBorderChaikinPasses",
      familyDefault:
        metaballGridFamilyConfigDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES,
      phaseEdgesDefault:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES,
    },
  ] as const;

  function primeMetaballGridPhaseEdgesTunables(): void {
    for (const entry of PHASE_EDGES_PRIMED_TUNABLES) {
      const panelValue = panel[entry.panelKey];
      const configValue = (GAME_CONFIG as any)[entry.configKey];
      const panelHasExplicitValue = panelValue !== undefined;
      const shouldPrime =
        !panelHasExplicitValue &&
        (configValue === undefined || configValue === entry.familyDefault);
      if (shouldPrime) {
        debouncedConfigUpdate(
          entry.configKey,
          entry.panelKey,
          entry.phaseEdgesDefault,
        );
      }
    }
  }

  function selectTerritoryStyle(styleId: string) {
    debouncedConfigUpdate(
      "TERRITORY_RENDER_MODE",
      "territoryRenderMode",
      styleId,
    );
    if (styleId === "power_voronoi_runtime") {
      selectFrontierTransition("pv_frontline");
    } else if (resolveActiveFillTransitionId() === "pv_frontline") {
      selectFrontierTransition("active_front");
    }
    if (styleId === "metaball_grid_ember_lattice") {
      primeMetaballGridPhaseEdgesTunables();
    }
    setActiveRendererModule("all");
    // Reset diagnostic so it logs on next render frame
    (globalThis as any).__RENDER_MODE_LOGGED = false;
    // Sync compatibility booleans to panel; setSetting applies GAME_CONFIG via RESOLVED map.
    for (const [mode, panelKey] of Object.entries(STYLE_TO_BOOLEAN)) {
      updatePanel(panelKey, styleId !== "none" && mode === styleId);
    }
  }

  function resolveActiveStyleId(): string {
    return (
      panel.territoryRenderMode ??
      GAME_CONFIG.TERRITORY_RENDER_MODE ??
      "territory_runtime"
    );
  }

  function resolveSelectedGeometryModeId(): string {
    if (resolveActiveStyleId() === "power_voronoi_runtime") {
      return "resolved_power_voronoi";
    }
    return (
      panel.territoryGeometryMode ??
      GAME_CONFIG.TERRITORY_GEOMETRY_MODE ??
      "unified_vector"
    ) as string;
  }

  function usesResolvedPvGeometry(): boolean {
    return resolveSelectedGeometryModeId() === "resolved_power_voronoi";
  }

  function resolveActiveFillTransitionId(): string {
    if (usesResolvedPvGeometry()) {
      return "pv_frontline";
    }
    const raw =
      panel.territoryFillTransitionMode ??
      panel.territoryFillTransition ??
      GAME_CONFIG.TERRITORY_FILL_TRANSITION_MODE ??
      GAME_CONFIG.TERRITORY_FILL_MODE ??
      "active_front";
    if (raw === "frontier" || raw === "frontier_morph") return "active_front";
    if (raw === "none") return "off";
    return raw;
  }

  function selectFrontierTransition(transitionId: string) {
    debouncedConfigUpdate(
      "TERRITORY_FILL_TRANSITION_MODE",
      "territoryFillTransitionMode",
      transitionId,
    );
    if (transitionId === "pv_frontline") {
      debouncedConfigUpdate(
        "TERRITORY_BORDER_TRANSITION_MODE",
        "territoryBorderTransitionMode",
        "off",
      );
      debouncedConfigUpdate(
        "TERRITORY_BORDER_TRANSITION",
        "territoryBorderTransition",
        "none",
      );
    }
  }

  function isPowerVoronoi0427Mode(): boolean {
    return resolveActiveStyleId() === "power_voronoi_runtime";
  }

  function isMetaballGridStyle(): boolean {
    const activeStyle = resolveActiveStyleId();
    return (
      activeStyle === "metaball_grid" ||
      activeStyle === "metaball_grid_phase_edges" ||
      activeStyle === "metaball_grid_ember_lattice" ||
      activeStyle === "metaball_grid_phase_field"
    );
  }

  function isGridGradientStyle(): boolean {
    return resolveActiveStyleId() === "grid_gradient";
  }

  function isMetaballGridPhaseEdgesStyle(): boolean {
    return resolveActiveStyleId() === "metaball_grid_phase_edges";
  }

  function isEmberLatticeStyle(): boolean {
    return resolveActiveStyleId() === "metaball_grid_ember_lattice";
  }

  function isEdgeForwardMetaballGridStyle(): boolean {
    return isMetaballGridPhaseEdgesStyle() || isEmberLatticeStyle();
  }

  $effect(() => {
    if (isEmberLatticeStyle()) {
      primeMetaballGridPhaseEdgesTunables();
    }
  });

  function showsDerivedGeometryInput(): boolean {
    return isMetaballGridStyle();
  }
  function resolveActiveTransitionModeId(): string {
    return coerceVsTransitionModeForRenderMode(
      resolveActiveStyleId(),
      (panel.vsTransitionMode ?? GAME_CONFIG.VS_TRANSITION_MODE ?? null) as
        | string
        | null,
    );
  }

  function showReferenceVsTransitionModeSelector(): boolean {
    const activeStyle = resolveActiveStyleId();
    return (
      activeStyle === "power_voronoi" ||
      activeStyle === "pvv2_dy4" ||
      activeStyle === "metaball"
    );
  }

  function rendererModules(): Array<
    TerritoryModuleDef<TerritoryRendererViewId>
  > {
    const modules: Array<
      TerritoryModuleDef<TerritoryRendererViewId>
    > = [{ id: "topology", label: "Topology", icon: "circle-nodes" }];

    if (resolveActiveStyleId() === "metaball") {
      modules.unshift({ id: "metaball", label: "Metaball", icon: "arrows-to-circle" });
    }

    if (resolveActiveStyleId() === "perimeter_field") {
      modules.unshift({
        id: "perimeter-field",
        label: "Perimeter Field",
        icon: "border-all",
      });
    }

    if (isMetaballGridStyle()) {
      modules.unshift({
        id: "metaball-grid",
        label: "Grid",
        icon: "quick-access",
      });
    }

    if (isGridGradientStyle()) {
      modules.unshift({
        id: "grid-gradient",
        label: "Gradient",
        icon: "GG",
      });
    }

    if (
      resolveActiveStyleId() === "territory_engine" ||
      resolveActiveStyleId() === "territory_runtime" ||
      resolveActiveStyleId() === "power_voronoi_runtime"
    ) {
      modules.push({ id: "surface", label: "Surface", icon: "draw-polygon" });
    }

    if (view === "tuning") {
      return modules.filter((module) => module.id === "topology");
    }

    if (view === "styles") {
      return modules.filter((module) => module.id !== "topology");
    }

    return modules;
  }

  $effect(() => {
    if (activeRendererModule === "all" || activeRendererModule === "none") return;
    if (!rendererModules().some((module) => module.id === activeRendererModule)) {
      updatePanel(TERRITORY_RENDERER_MODULE_PANEL_KEY, "all");
    }
  });

  function showSystemModule(id: TerritorySystemViewId) {
    return activeSystemModule === "all" || activeSystemModule === id;
  }

  function showRendererModule(id: TerritoryRendererViewId) {
    return activeRendererModule === "all" || activeRendererModule === id;
  }

  function setActiveSystemModule(value: TerritorySystemModuleId) {
    updatePanel(TERRITORY_SYSTEM_MODULE_PANEL_KEY, value);
  }

  function setActiveRendererModule(value: TerritoryRendererModuleId) {
    updatePanel(TERRITORY_RENDERER_MODULE_PANEL_KEY, value);
  }

  $effect(() => {
    if (
      activeRendererModule !== "all" &&
      activeRendererModule !== "none" &&
      !rendererModules().some((module) => module.id === activeRendererModule)
    ) {
      setActiveRendererModule("all");
    }
  });

</script>

{#if showCategoryThemeBar && !showStylesView}
  <CategoryThemeBar category="territory" onApply={() => syncFromConfig?.()} />
{/if}

{#if showModesView}
<div class="territory-section-shell territory-section-shell--system">
  <div class="territory-section-head">
    <h4 class="sub-heading territory-section-title">{systemTitle}</h4>
    <div
      class="territory-scope-toggle"
      role="group"
      aria-label="Territory system subsection visibility">
      <button
        type="button"
        class="territory-all-toggle"
        class:active={activeSystemModule === "all"}
        aria-label="Show all territory system modules"
        onclick={() => {
          setActiveSystemModule("all");
        }}>All</button>
      <button
        type="button"
        class="territory-all-toggle"
        class:active={activeSystemModule === "none"}
        aria-label="Hide all territory system modules"
        onclick={() => {
          setActiveSystemModule("none");
        }}>None</button>
    </div>
  </div>
  <div class="territory-module-nav">
    {#each visibleSystemModules() as module}
      <button
        type="button"
        class="territory-module-chip"
        class:active={activeSystemModule === module.id}
        onclick={() => {
          setActiveSystemModule(
            activeSystemModule === module.id ? "all" : module.id,
          );
        }}>
        <span class="territory-module-chip__icon"><HudIcon name={module.icon} size={16} /></span>
        <span>{module.label}</span>
      </button>
    {/each}
  </div>
  <div class="territory-module-grid">
    {#if showSystemModule("render-mode")}
      <div class="axis-card territory-module-card">
        <div class="territory-card__header">
      <h4 class="axis-card-title">{hideRenderModeSelector ? "Transition" : "Mode"}</h4>
          <p class="territory-card__intro">
            {#if hideRenderModeSelector}
              Runtime transition controls for the render mode currently selected
              from the topbar.
            {:else}
              Choose the active renderer family and expose deprecated modes only
              when you intentionally need to compare against them.
            {/if}
          </p>
        </div>
        {#if !hideRenderModeSelector}
          <div
            class="axis-row"
            style="--accent: #a78bfa; --accent-bg: rgba(167,139,250,0.15)">
            <span class="axis-label">Render mode</span>
            <div class="axis-buttons axis-buttons-wrap">
              {#each getRenderModeOptions() as opt}
                <button
                  type="button"
                  class="axis-btn"
                  class:active={resolveActiveStyleId() === opt.id}
                  disabled={!opt.selectable}
                  title={opt.disabledReason ?? opt.shortDescription ?? opt.label}
                  onclick={() => {
                    if (opt.selectable) selectTerritoryStyle(opt.id);
                  }}>{opt.label}</button>
              {/each}
            </div>
          </div>
        {/if}

        {#if !hideRenderModeSelector && isTerritoryRenderModeUiHidden(resolveActiveStyleId())}
          <div
            class="axis-note"
            style="border-left: 3px solid #f59e0b; padding: 8px 10px; margin: 4px 0 8px; background: rgba(245,158,11,0.08);">
            <strong>Deprecated mode active:</strong>
            <code>{resolveActiveStyleId()}</code>
            — hidden from the list above. Prefer PVV3 or PVV2 for maintained
            seams.
            <span
              style="display: inline-flex; gap: 6px; margin-left: 8px; flex-wrap: wrap;">
              <button
                type="button"
                class="axis-btn"
                onclick={() => selectTerritoryStyle("vs_pvv3")}
                >Switch to PVV3</button>
              <button
                type="button"
                class="axis-btn"
                onclick={() => selectTerritoryStyle("power_voronoi")}
                >Switch to PVV2</button>
            </span>
          </div>
        {/if}

        {#if $territoryRenderStatus.updatedAtMs > 0}
          <div class="axis-note">
            <strong>Live render:</strong>
            <code>{getTerritoryRenderModeLabel(
              $territoryRenderStatus.territoryMode,
            )}</code>
            {#if $territoryRenderStatus.geometryReady !== null}
              · geometry {$territoryRenderStatus.geometryReady
                ? "ready"
                : "missing"}
            {/if}
            · arrows <code>{$territoryRenderStatus.arrowRenderer}</code>
            {#if $territoryRenderStatus.lastRenderFailure}
              <br />
              <span style="color: #fca5a5;"
                >Failure: {$territoryRenderStatus.lastRenderFailure}</span>
            {/if}
          </div>
        {/if}

        {#if showReferenceVsTransitionModeSelector()}
          <div
            class="axis-row"
            style="--accent: #22d3ee; --accent-bg: rgba(34,211,238,0.15)">
            <span class="axis-label">Transition</span>
            <div style="display:flex; flex-direction:column; gap:6px; flex:1; min-width:0;">
              <select
                class="mode-select"
                value={resolveActiveTransitionModeId()}
                onchange={(event) => {
                  const value = (event.target as HTMLSelectElement).value;
                  debouncedConfigUpdate(
                    "VS_TRANSITION_MODE",
                    "vsTransitionMode",
                    value,
                  );
                }}>
                {#each getTransitionModeOptionsForRenderMode(resolveActiveStyleId()) as option}
                  <option value={option.id}>{option.label}</option>
                {/each}
              </select>
              <div class="axis-note">
                Conquest transition mode for the active render family.
              </div>
            </div>
          </div>
          <TerritoryTransitionTuning
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
            activeRenderMode={resolveActiveStyleId()}
            helperText="Timing and influence tuning for the active conquest transition mode."
          />
        {/if}
      </div>
    {/if}

  </div>
</div>
{/if}

{#if showTuningView}
<div class="territory-section-shell territory-section-shell--renderer">
  <div class="territory-section-head">
    <h4 class="sub-heading territory-section-title">
      {showStylesView ? "Render Families" : "Frontier Topology"}
    </h4>
    {#if showStylesView}
      <div
        class="territory-scope-toggle"
        role="group"
        aria-label="Territory rendering subsection visibility">
        <button
          type="button"
          class="territory-all-toggle"
          class:active={activeRendererModule === "all"}
          aria-label="Show all territory rendering modules"
          onclick={() => {
            setActiveRendererModule("all");
          }}>All</button>
        <button
          type="button"
          class="territory-all-toggle"
          class:active={activeRendererModule === "none"}
          aria-label="Hide all territory rendering modules"
          onclick={() => {
            setActiveRendererModule("none");
          }}>None</button>
      </div>
    {/if}
  </div>
  {#if showStylesView}
    <div class="territory-module-nav">
      {#each rendererModules() as module}
        <button
          type="button"
          class="territory-module-chip"
          class:active={activeRendererModule === module.id}
          onclick={() => {
            setActiveRendererModule(
              activeRendererModule === module.id ? "all" : module.id,
            );
          }}>
          <span class="territory-module-chip__icon"><HudIcon name={module.icon} size={16} /></span>
          <span>{module.label}</span>
        </button>
      {/each}
    </div>
  {/if}
  <div class="territory-module-grid">

{#if showStylesView && rendererModules().length === 0}
  <div class="axis-note">
    This territory mode does not expose dedicated render-family controls.
  </div>
{/if}

{#if activeRendererModule !== "none" && showsDerivedGeometryInput()}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
      <h4 class="axis-card-title">Geometry Source</h4>
      <p class="territory-card__intro">
        Select which compiled upstream territory geometry feeds the active
        derived renderer. Topology ownership rules are defined separately.
      </p>
    </div>
    <TerritoryGeometrySourceTuning {panel} {updatePanel} />
  </div>
{/if}

{#if showStylesView && showRendererModule("metaball") && resolveActiveStyleId() === "metaball"}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
      <h4 class="axis-card-title">Metaball (CPU grid)</h4>
      <p class="territory-card__intro">
        Tune field cost, influence shape, and border behavior for the active
        metaball renderer.
      </p>
    </div>
    <div
      class="row-bottom"
      style="font-size:11px;opacity:0.75;margin-bottom:10px;">
      Larger <strong>Cell size</strong> means fewer grid cells and better FPS.
      Frontier rules live in <strong>Frontier Topology</strong>. Transition
      timing lives in <strong>Territory System</strong>.
    </div>
    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Cell size (px)</span><span class="val"
          >{Math.round(
            panel.metaballCellSize ?? GAME_CONFIG.METABALL_CELL_SIZE ?? 10,
          )}</span>
      </div>
      <input
        type="range"
        min="4"
        max="32"
        step="1"
        value={panel.metaballCellSize ?? GAME_CONFIG.METABALL_CELL_SIZE ?? 10}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate("METABALL_CELL_SIZE", "metaballCellSize", v);
        }} />
    </div>
    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Influence radius</span><span class="val"
          >{Math.round(
            panel.metaballInfluenceRadius ??
              GAME_CONFIG.METABALL_INFLUENCE_RADIUS ??
              90,
          )}px</span>
      </div>
      <input
        type="range"
        min="0"
        max="220"
        step="5"
        value={panel.metaballInfluenceRadius ??
          GAME_CONFIG.METABALL_INFLUENCE_RADIUS ??
          90}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate(
            "METABALL_INFLUENCE_RADIUS",
            "metaballInfluenceRadius",
            v,
          );
        }} />
    </div>
    <div
      class="var-row"
      title="How star influence decays with distance in the CPU grid. Gaussian uses Math.exp per sample (slower); inverse-square is cheaper and often looks fine for gameplay.">
      <div class="row-top">
        <span class="var-name">Influence falloff</span>
      </div>
      <select
        class="mode-select"
        value={resolveMetaballFalloffId()}
        onchange={(e) => {
          const v = (e.target as HTMLSelectElement).value as
            | "inverse-square"
            | "gaussian"
            | "smoothstep";
          debouncedConfigUpdate("METABALL_FALLOFF", "metaballFalloff", v);
        }}>
        {#each METABALL_FALLOFF_OPTIONS as opt}
          <option value={opt.id}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div
      class="var-row"
      title="Per cell: dominance = winner’s influence / (winner + runner-up). 0.0 = tied; 1.0 = no runner-up. The slider is 0→1 like any other. Values from 0.00 through 0.50 leave the contested-cell filter OFF (every cell the field favors can fill). Above 0.50, cells with dominance below your setting stay empty—hides mushy 50/50 bands between empires.">
      <div class="row-top">
        <span class="var-name">Min dominance (winner / top-2)</span><span
          class="val"
          >{(() => {
            const v =
              panel.metaballThreshold ?? GAME_CONFIG.METABALL_THRESHOLD ?? 0.5;
            const clamped = Math.max(0, Math.min(1, v));
            return `${clamped.toFixed(2)}${clamped <= 0.5 ? " · off" : ""}`;
          })()}</span>
      </div>
      <input
        type="range"
        min="0.5"
        max="1"
        step="0.01"
        value={Math.max(
          0,
          Math.min(
            1,
            panel.metaballThreshold ?? GAME_CONFIG.METABALL_THRESHOLD ?? 0.5,
          ),
        )}
        oninput={(e) => {
          const v = Math.max(
            0,
            Math.min(1, +(e.target as HTMLInputElement).value),
          );
          debouncedConfigUpdate("METABALL_THRESHOLD", "metaballThreshold", v);
        }} />
    </div>
    <label
      class="toggle-row"
      title="When on, metaball fill uses the geometry ownership field so the fill footprint stays aligned with the actual claimed region and border shape.">
      <input
        type="checkbox"
        checked={panel.metaballFillFollowsGeom ??
          GAME_CONFIG.METABALL_FILL_FOLLOWS_GEOM ??
          false}
        onchange={(e) => {
          const v = (e.target as HTMLInputElement).checked;
          debouncedConfigUpdate(
            "METABALL_FILL_FOLLOWS_GEOM",
            "metaballFillFollowsGeom",
            v,
          );
        }} />
      <span class="var-name">Fill follows geometry ownership</span><span
        class="val"
        >{(panel.metaballFillFollowsGeom ??
          GAME_CONFIG.METABALL_FILL_FOLLOWS_GEOM ??
          false)
          ? "On"
          : "Off"}</span>
    </label>
    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Strength multiplier</span><span class="val"
          >{(
            panel.metaballStrengthMult ??
            GAME_CONFIG.METABALL_STRENGTH_MULT ??
            1
          ).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0.5"
        max="8"
        step="0.1"
        value={panel.metaballStrengthMult ??
          GAME_CONFIG.METABALL_STRENGTH_MULT ??
          1}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate(
            "METABALL_STRENGTH_MULT",
            "metaballStrengthMult",
            v,
          );
        }} />
    </div>
    <div
      class="var-row"
      title="Extra grid extent beyond the map (0 = tight). Higher helps when zoomed out.">
      <div class="row-top">
        <span class="var-name">Coverage padding</span><span class="val"
          >{(
            panel.metaballCoverage ??
            GAME_CONFIG.METABALL_COVERAGE ??
            0
          ).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="0.45"
        step="0.05"
        value={panel.metaballCoverage ?? GAME_CONFIG.METABALL_COVERAGE ?? 0}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate("METABALL_COVERAGE", "metaballCoverage", v);
        }} />
    </div>
    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Faction blend sharpness</span><span class="val"
          >{(
            panel.metaballSharpness ??
            GAME_CONFIG.METABALL_BLEND_SHARPNESS ??
            3
          ).toFixed(1)}</span>
      </div>
      <input
        type="range"
        min="1"
        max="40"
        step="0.5"
        value={panel.metaballSharpness ??
          GAME_CONFIG.METABALL_BLEND_SHARPNESS ??
          3}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate(
            "METABALL_BLEND_SHARPNESS",
            "metaballSharpness",
            v,
          );
        }} />
    </div>

      {panel}
      onUpdate={debouncedConfigUpdate}
      sectionHeading="Style"
      intro="Shared surface controls for metaball territory output. Fill and border visibility are explicit toggles now; alpha is just opacity."
      fillHelp="Hue is fixed per player from the palette; adjust saturation, lightness, alpha, or disable fill entirely."
      borderHelp="Adjust shared border width, saturation, lightness, alpha, or disable borders entirely." />

    <h5 class="territory-inline-heading">Combat &amp; Fleet Pressure</h5>
    <div
      class="row-bottom"
      style="font-size:11px;opacity:0.72;margin-bottom:8px;">
      Width/alpha boosts apply only along border segments that pass near a star
      that recently fought (same tick window). Fleet imbalance still nudges both
      along an edge. Set recency to 0 to disable combat highlighting.
    </div>
    <div
      class="var-row"
      title="Max distance in pixels from a border line to a hot star for combat boost. 0 = use Metaball influence radius (same tuning as the field). Raise this if boosts never trigger along fronts that sit far from star centers.">
      <div class="row-top">
        <span class="var-name">Combat border proximity (px)</span><span
          class="val"
          >{(() => {
            const v =
              panel.metaballCombatBorderProximityPx ??
              GAME_CONFIG.METABALL_COMBAT_BORDER_PROXIMITY_PX ??
              0;
            return v <= 0
              ? `0 (→ ${GAME_CONFIG.METABALL_INFLUENCE_RADIUS ?? 0}px)`
              : `${Math.round(v)}`;
          })()}</span>
      </div>
      <input
        type="range"
        min="0"
        max="600"
        step="10"
        value={panel.metaballCombatBorderProximityPx ??
          GAME_CONFIG.METABALL_COMBAT_BORDER_PROXIMITY_PX ??
          0}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate(
            "METABALL_COMBAT_BORDER_PROXIMITY_PX",
            "metaballCombatBorderProximityPx",
            v,
          );
        }} />
    </div>
    <div
      class="var-row"
      title="If currentTick − lastCombatTick (or lastAttackTick) is under this window for a star on one side of a border segment, that segment gets the combat width/alpha boost—only near that star, not for the whole faction.">
      <div class="row-top">
        <span class="var-name">Combat recency (ticks)</span><span class="val"
          >{Math.round(
            panel.metaballCombatBorderTicks ??
              GAME_CONFIG.METABALL_COMBAT_BORDER_TICKS ??
              0,
          )}</span>
      </div>
      <input
        type="range"
        min="0"
        max="30"
        step="1"
        value={panel.metaballCombatBorderTicks ??
          GAME_CONFIG.METABALL_COMBAT_BORDER_TICKS ??
          0}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate(
            "METABALL_COMBAT_BORDER_TICKS",
            "metaballCombatBorderTicks",
            v,
          );
        }} />
    </div>
    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Combat width boost</span><span class="val"
          >{(
            panel.metaballCombatBorderWidthBoost ??
            GAME_CONFIG.METABALL_COMBAT_BORDER_WIDTH_BOOST ??
            0
          ).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="6"
        step="0.25"
        value={panel.metaballCombatBorderWidthBoost ??
          GAME_CONFIG.METABALL_COMBAT_BORDER_WIDTH_BOOST ??
          0}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate(
            "METABALL_COMBAT_BORDER_WIDTH_BOOST",
            "metaballCombatBorderWidthBoost",
            v,
          );
        }} />
    </div>
    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Combat alpha boost</span><span class="val"
          >{(
            panel.metaballCombatBorderAlphaBoost ??
            GAME_CONFIG.METABALL_COMBAT_BORDER_ALPHA_BOOST ??
            0
          ).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={panel.metaballCombatBorderAlphaBoost ??
          GAME_CONFIG.METABALL_COMBAT_BORDER_ALPHA_BOOST ??
          0}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate(
            "METABALL_COMBAT_BORDER_ALPHA_BOOST",
            "metaballCombatBorderAlphaBoost",
            v,
          );
        }} />
    </div>
    <div
      class="var-row"
      title="Scales border emphasis by fleet imbalance across the edge (proxy until conquest metrics exist).">
      <div class="row-top">
        <span class="var-name">Fleet pressure on borders</span><span class="val"
          >{(
            panel.metaballBorderForceRatio ??
            GAME_CONFIG.METABALL_BORDER_FORCE_RATIO ??
            0
          ).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={panel.metaballBorderForceRatio ??
          GAME_CONFIG.METABALL_BORDER_FORCE_RATIO ??
          0}
        oninput={(e) => {
          const v = +(e.target as HTMLInputElement).value;
          debouncedConfigUpdate(
            "METABALL_BORDER_FORCE_RATIO",
            "metaballBorderForceRatio",
            v,
          );
        }} />
    </div>
  </div>
{/if}

{#if showTuningView}
<div class="territory-module-card territory-module-stack">
<h5 class="territory-inline-heading">Frontier Topology</h5>
<!-- Territory Topology Rules (MSR / CX / DX) -->
<div class="engine-control-group">
  <div class="territory-card__header">
    <h4 class="axis-card-title">Topology Rules</h4>
    <p class="territory-card__intro">
      Set the resolved owned footprint, frontier sampling density, and the
      connection rules that determine how fronts stay linked or deliberately
      split apart.
    </p>
  </div>
  <div class="axis-note">
    {#if $territoryTuningStatus.pending}
      <strong>Compiling…</strong>
      {$territoryTuningStatus.label}
    {:else if $territoryTuningStatus.lastDurationMs !== null}
      <strong>Last compile:</strong>
      {$territoryTuningStatus.lastDurationMs} ms
      {#if $territoryTuningStatus.lastCompletedLabel}
        · {$territoryTuningStatus.lastCompletedLabel}
      {/if}
    {/if}
  </div>

  <h5 class="territory-inline-heading">Minimum Footprint</h5>

  <!-- MSR — Minimum Star Region -->
  <div
    class="var-row"
    title="Sets the target minimum frontier distance around owned stars. This value shapes territory geometry only; lane margin is a separate map-layout/editor control.">
    <div class="row-top">
      <span class="var-name">Minimum Star Margin</span><span class="val"
        >{panel.starMargin ??
          GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ??
          0}px</span>
    </div>
    <input
      type="range"
      min={topologyLimits.starMargin.min}
      max={topologyLimits.starMargin.max}
      step="5"
      value={panel.starMargin ?? GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 0}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "MODIFIED_VORONOI_STAR_MARGIN",
          "starMargin",
          v,
          "Minimum Star Margin",
        );
      }} />
  </div>

  <h5 class="territory-inline-heading">MSR as star power</h5>

  <div
    class="var-row"
    title="Optional advanced solve-time star resistance against corridor, lane-pair, and disconnect shaping. 0 keeps MSR as pure local frontier clearance.">
    <div class="row-top">
      <span class="var-name">Star Bias</span><span class="val"
        >{(
          panel.msrStarBias ??
          (GAME_CONFIG as any).TERRITORY_MSR_STAR_BIAS ??
          0
        ).toFixed(2)}</span>
    </div>
    <div class="row-hint">
      Relative star resistance against corridor, lane-pair, and disconnect shaping during the Power Voronoi solve. <strong>0</strong> leaves baseline MSR as pure post-solve local clearance.
    </div>
    <input
      type="range"
      min={topologyLimits.msrStarBias.min}
      max={topologyLimits.msrStarBias.max}
      step="0.05"
      value={panel.msrStarBias ?? (GAME_CONFIG as any).TERRITORY_MSR_STAR_BIAS ?? 0}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "TERRITORY_MSR_STAR_BIAS",
          "msrStarBias",
          v,
          "Star Bias",
        );
      }} />
  </div>

  <h5 class="territory-inline-heading">Frontier Sampling</h5>

  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Frontier Resolution</span><span class="val"
        >{panel.frontierResolution ??
          GAME_CONFIG.FRONTIER_RESOLUTION ??
          5}px</span>
    </div>
    <div class="row-hint">
      Vertex spacing for real frontier geometry that still feeds maintained
      compiler paths. Lower values produce denser frontiers.
    </div>
    <input
      type="range"
      min={topologyLimits.frontierResolution.min}
      max={topologyLimits.frontierResolution.max}
      step="1"
      value={panel.frontierResolution ?? GAME_CONFIG.FRONTIER_RESOLUTION ?? 5}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "FRONTIER_RESOLUTION",
          "frontierResolution",
          v,
          "Frontier Resolution",
        );
      }} />
  </div>

  <h5 class="territory-inline-heading">Corridors</h5>

  <!-- CX — Corridor Connection -->
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Corridor Virtual Sites (CX)</span>
      <label class="lock-toggle">
        <input
          type="checkbox"
          checked={panel.corridorEnabled ??
            GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
            true}
          onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            queueTopologyToggleUpdate(
              "MODIFIED_VORONOI_CORRIDOR_ENABLED",
              "corridorEnabled",
              v,
              "Corridor Virtual Sites (CX)",
            );
          }} />
        {(panel.corridorEnabled ??
        GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
        true)
          ? "On"
          : "Off"}
      </label>
    </div>
  </div>
  <div class="var-row indent">
    <div class="row-top">
      <span class="var-name">Lane Midpoint Pairs</span>
      <label class="lock-toggle">
        <input
          type="checkbox"
          checked={panel.cxContestMidpointVstars ??
            GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ??
            true}
          onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            queueTopologyToggleUpdate(
              "TERRITORY_CX_CONTEST_MIDPOINT_VSTARS",
              "cxContestMidpointVstars",
              v,
              "Lane Midpoint Pairs",
            );
          }} />
        {(panel.cxContestMidpointVstars ??
          GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ??
          true)
          ? "On"
          : "Off"}
      </label>
    </div>
  </div>
  <div
    class="var-row indent"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">Lane Midpoint Pair Count</span><span class="val"
        >{panel.cxContestPairCount ??
          GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ??
          1}</span>
    </div>
    <input
      type="range"
      min={topologyLimits.cxContestPairCount.min}
      max={topologyLimits.cxContestPairCount.max}
      step="1"
      disabled={!cxOn}
      value={panel.cxContestPairCount ??
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ??
        1}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "TERRITORY_CX_CONTEST_PAIR_COUNT",
          "cxContestPairCount",
          v,
          "Lane Midpoint Pair Count",
        );
      }} />
  </div>
  <div
    class="var-row indent"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">Lane Midpoint Pair Spacing</span><span class="val"
        >{panel.cxContestPairSpacing ??
          GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_SPACING ??
          75}</span>
    </div>
    <input
      type="range"
      min={topologyLimits.cxContestPairSpacing.min}
      max={topologyLimits.cxContestPairSpacing.max}
      step="5"
      disabled={!cxOn}
      value={panel.cxContestPairSpacing ??
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_SPACING ??
        75}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "TERRITORY_CX_CONTEST_PAIR_SPACING",
          "cxContestPairSpacing",
          v,
          "Lane Midpoint Pair Spacing",
        );
      }} />
  </div>
  <div
    class="var-row indent"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">Lane Midpoint Pair Weight</span><span class="val"
        >{(
          panel.cxContestPairWeight ??
          GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ??
          0.5
        ).toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={topologyLimits.cxContestPairWeight.min}
      max={topologyLimits.cxContestPairWeight.max}
      step="0.05"
      disabled={!cxOn}
      value={panel.cxContestPairWeight ??
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ??
        0.5}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "TERRITORY_CX_CONTEST_PAIR_WEIGHT",
          "cxContestPairWeight",
          v,
          "Lane Midpoint Pair Weight",
        );
      }} />
  </div>
  <div
    class="var-row indent"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">Corridor Sample Count</span><span class="val"
        >{(panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0) === 0
          ? "Auto"
          : (panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT)}</span>
    </div>
    <input
      type="range"
      min={topologyLimits.corridorCount.min}
      max={topologyLimits.corridorCount.max}
      step="1"
      disabled={!cxOn}
      value={panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "TERRITORY_CX_COUNT",
          "cxCount",
          v,
          "Corridor Sample Count",
        );
      }} />
  </div>
  <div
    class="var-row indent"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">Corridor Weight</span><span class="val"
        >{(panel.cxWeight ?? GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5).toFixed(
          2,
        )}</span>
    </div>
    <input
      type="range"
      min={topologyLimits.corridorWeight.min}
      max={topologyLimits.corridorWeight.max}
      step="0.05"
      disabled={!cxOn}
      value={panel.cxWeight ?? GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "TERRITORY_CX_WEIGHT",
          "cxWeight",
          v,
          "Corridor Weight",
        );
      }} />
  </div>
  <div
    class="var-row indent"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">Corridor Spacing</span><span class="val"
        >{panel.corridorSpacing ??
          GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ??
          60}px</span>
    </div>
    <input
      type="range"
      min={topologyLimits.corridorSpacing.min}
      max={topologyLimits.corridorSpacing.max}
      step="5"
      disabled={!cxOn}
      value={panel.corridorSpacing ??
        GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ??
        60}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "MODIFIED_VORONOI_CORRIDOR_SPACING",
          "corridorSpacing",
          v,
          "Corridor Spacing",
        );
      }} />
  </div>

  <h5 class="territory-inline-heading">Disconnects</h5>

  <!-- DX — Disconnection Zones -->
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Disconnect Gaps (DX)</span>
      <label class="lock-toggle">
        <input
          type="checkbox"
          checked={panel.disconnectEnabled ??
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
            false}
          onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            queueTopologyToggleUpdate(
              "MODIFIED_VORONOI_DISCONNECT_ENABLED",
              "disconnectEnabled",
              v,
              "Disconnect Gaps (DX)",
            );
          }} />
        {(panel.disconnectEnabled ??
        GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
        false)
          ? "On"
          : "Off"}
      </label>
    </div>
  </div>
  <div
    class="var-row indent"
    class:disabled={!dxOn}
    title={!dxOn ? "Turn Disconnect Gaps on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">Disconnect Weight</span><span class="val"
        >{(panel.dxWeight ?? GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3).toFixed(
          2,
        )}</span>
    </div>
    <input
      type="range"
      min={topologyLimits.disconnectWeight.min}
      max={topologyLimits.disconnectWeight.max}
      step="0.05"
      disabled={!dxOn}
      value={panel.dxWeight ?? GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "TERRITORY_DX_WEIGHT",
          "dxWeight",
          v,
          "Disconnect Weight",
        );
      }} />
  </div>
  <div
    class="var-row indent"
    class:disabled={!dxOn}
    title={!dxOn ? "Turn Disconnect Gaps on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">Disconnect Distance</span><span class="val"
        >{panel.disconnectDistance ??
          GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ??
          400}px</span>
    </div>
    <input
      type="range"
      min={topologyLimits.disconnectDistance.min}
      max={topologyLimits.disconnectDistance.max}
      step="25"
      disabled={!dxOn}
      value={panel.disconnectDistance ??
        GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ??
        400}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        queueTopologySliderUpdate(
          "MODIFIED_VORONOI_DISCONNECT_DISTANCE",
          "disconnectDistance",
          v,
          "Disconnect Distance",
        );
      }} />
  </div>
</div>
</div>
{/if}

<!-- Active Layers toggles removed — V3 architecture uses Render Mode dropdown above -->

{#if showStylesView && showRendererModule("surface") &&
  (resolveActiveStyleId() === "territory_engine" ||
    resolveActiveStyleId() === "territory_runtime" ||
    resolveActiveStyleId() === "power_voronoi_runtime")}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
        <h4 class="axis-card-title">
          {resolveActiveStyleId() === "territory_engine"
          ? "Engine Surface"
          : resolveActiveStyleId() === "power_voronoi_runtime"
            ? "Power Voronoi 0427 Surface"
            : "Layered Runtime Surface"}
      </h4>
      <p class="territory-card__intro">
        Runtime diagnostics and geometry-shape controls for the active
        territory renderer. Visible fill and border styling now lives in
        Territory Styles.
      </p>
    </div>

    {#if isPowerVoronoi0427Mode()}
      <div
        class="row-bottom"
        style="font-size: 10px; opacity: 0.7; padding: 2px 4px;">
        This mode always runs exact Power Voronoi geometry with its fixed
        frontline transition path.
      </div>
    {/if}

    {#if resolveActiveStyleId() === "territory_engine"}
      <h5 class="territory-inline-heading">Shape &amp; Motion</h5>

      <div class="var-row">
        <div class="row-top">
          <span class="var-name">Morph Control Points</span><span class="val"
            >{panel.territoryMorphControlPoints ??
              GAME_CONFIG.TERRITORY_MORPH_CONTROL_POINTS}</span>
        </div>
        <input
          type="range"
          min="5"
          max="300"
          step="1"
          value={panel.territoryMorphControlPoints ??
            GAME_CONFIG.TERRITORY_MORPH_CONTROL_POINTS}
          oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            updatePanel("territoryMorphControlPoints", v);
          }} />
      </div>
      <div class="var-row">
        <div class="row-top">
          <span class="var-name">Morph Easing</span>
        </div>
        <div style="display:flex;gap:4px;padding:2px 0;flex-wrap:wrap">
          {#each MORPH_EASING_OPTIONS as easing}
            <button
              class="mini-btn"
              class:active={(panel.dfMorphEasing ??
                GAME_CONFIG.DF_MORPH_EASING ??
                "linear") === easing.id}
              onclick={() => updatePanel("dfMorphEasing", easing.id)}
              >{easing.label}</button>
          {/each}
        </div>
      </div>
      <div class="var-row">
        <div class="row-top">
          <span class="var-name">Boundary Mode</span><span class="val"
            >{panel.territoryBoundaryMode ??
              GAME_CONFIG.TERRITORY_BOUNDARY_MODE ??
              "smooth"}</span>
        </div>
        <div style="display:flex; gap:4px;">
          <button
            class="mini-btn"
            class:active={(panel.territoryBoundaryMode ??
              GAME_CONFIG.TERRITORY_BOUNDARY_MODE) === "segment"}
            onclick={() =>
              debouncedConfigUpdate(
                "TERRITORY_BOUNDARY_MODE",
                "territoryBoundaryMode",
                "segment",
              )}>Segment</button>
          <button
            class="mini-btn"
            class:active={(panel.territoryBoundaryMode ??
              GAME_CONFIG.TERRITORY_BOUNDARY_MODE) === "smooth"}
            onclick={() =>
              debouncedConfigUpdate(
                "TERRITORY_BOUNDARY_MODE",
                "territoryBoundaryMode",
                "smooth",
              )}>Smooth</button>
        </div>
      </div>
    {/if}

    {#if false}
    <h5 class="territory-inline-heading">Fill &amp; Borders</h5>

    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Fill Alpha</span><span class="val"
          >{(panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA).toFixed(2)}</span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("VORONOI_ALPHA", "voronoiAlpha", v);
      }} />
  </div>
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Neutral Transparent</span>
      <label class="toggle-switch">
        <input
          type="checkbox"
          checked={panel.neutralTerritoryTransparent ??
            GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT}
          onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            debouncedConfigUpdate(
              "NEUTRAL_TERRITORY_TRANSPARENT",
              "neutralTerritoryTransparent",
              v,
            );
          }} />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Border Width</span><span class="val"
        >{(
          panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH
        ).toFixed(1)}px</span>
    </div>
    <input
      type="range"
      min="0"
      max="30"
      step="0.5"
      value={panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("VORONOI_BORDER_WIDTH", "voronoiBorderWidth", v);
      }} />
  </div>
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Border Alpha</span><span class="val"
        >{(
          panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA
        ).toFixed(2)}</span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("VORONOI_BORDER_ALPHA", "voronoiBorderAlpha", v);
      }} />
  </div>

  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Geometry Smooth Passes</span><span class="val"
        >{Math.round(
          panel.voronoiBorderSmooth ?? GAME_CONFIG.VORONOI_BORDER_SMOOTH,
        )}</span>
    </div>
    <div class="row-hint">
      Chaikin passes — modifies actual border/fill geometry coordinates.
      0=angular, 2=smooth, 5=very round
    </div>
    <input
      type="range"
      min="0"
      max="5"
      step="1"
      value={panel.voronoiBorderSmooth ?? GAME_CONFIG.VORONOI_BORDER_SMOOTH}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate(
          "VORONOI_BORDER_SMOOTH",
          "voronoiBorderSmooth",
          v,
        );
      }} />
  </div>

  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Saturation</span><span class="val"
        >{(panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION).toFixed(
          2,
        )}</span>
    </div>
    <input
      type="range"
      min="0"
      max="2"
      step="0.05"
      value={panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("VORONOI_SATURATION", "voronoiSaturation", v);
      }} />
  </div>
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Lightness</span><span class="val"
        >{(panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS).toFixed(
          2,
        )}</span>
    </div>
    <input
      type="range"
      min="0"
      max="2"
      step="0.05"
      value={panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("VORONOI_LIGHTNESS", "voronoiLightness", v);
      }} />
  </div>
    {/if}
  </div>
{/if}

{#if showStylesView && showRendererModule("perimeter-field") && resolveActiveStyleId() === "perimeter_field"}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
      <h4 class="axis-card-title">Perimeter Field (Experimental)</h4>
      <p class="territory-card__intro">
        Build displayed territory from ownership-derived perimeter samples, then
        animate conquest with a conquest-local radial override instead of
        moving interior star influence.
      </p>
    </div>
    <div
      class="row-bottom"
      style="font-size:11px;opacity:0.75;margin-bottom:10px;">
      Real star ownership still generates the base geometry. The displayed field
      is then driven only by derived perimeter samples.
    </div>
    <PerimeterFieldTuning {panel} {updatePanel} />
    <TerritorySurfaceStyleTuning
      {panel}
      onUpdate={debouncedConfigUpdate}
      sectionHeading="Style"
      intro="Shared surface styling for perimeter-field output. These controls affect the displayed fill and border only; they do not change the ownership geometry source."
      fillHelp="Perimeter Field uses the shared territory surface controls for fill color energy. Hue stays player-owned; adjust saturation, lightness, alpha, or disable fill entirely."
      borderHelp="Perimeter Field borders are rendered through the shared territory border surface. Use this for width, saturation, lightness, alpha, or disable borders entirely."
      activeSection={resolveActiveStyleSubsection()} />
  </div>
{/if}

{#if showStylesView && showRendererModule("metaball-grid") && isMetaballGridStyle()}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
      <h4 class="axis-card-title">
        {isEmberLatticeStyle()
          ? "Ember Lattice"
          : isMetaballGridPhaseEdgesStyle()
            ? "Phase Edges"
          : "Metaball Grid (Experimental)"}
      </h4>
      <p class="territory-card__intro">
        {#if isEmberLatticeStyle()}
          Dense square-lattice territory renderer with contour-derived,
          faction-blended frontiers and inward heat grading.
        {:else if isMetaballGridPhaseEdgesStyle()}
          Simpler edge-forward metaball-grid mode. It keeps the tactical grid
          read without Ember Lattice's contour-derived seam pipeline.
        {:else}
          Ownership-geometry underlayer plus a world-anchored grid of
          metaball cells. Conquest transitions flip cells cell-by-cell in a
          wave seeded from the winner's footprint.
        {/if}
      </p>
    </div>
    <div
      class="row-bottom"
      style="font-size:11px;opacity:0.75;margin-bottom:10px;">
      {#if isEmberLatticeStyle()}
        Ember Lattice keeps crisp square territory mass while deriving a softer
        centered-blended frontier seam from the contour/frontier layer. This is
        the branch renderer split out as its own public mode.
      {:else if isMetaballGridPhaseEdgesStyle()}
        Phase Edges keeps the simpler edge-forward conquest family separate
        from Ember Lattice so both modes can now evolve independently.
      {:else}
        Two-layer family: ownership geometry stays truth; the visible grid
        layer is re-composited per frame as the wave crosses each cell's
        flipTime.
      {/if}
    </div>
    <MetaballGridTuning {panel} {updatePanel} />
    <div
      class="row-bottom"
      style="font-size:11px;opacity:0.75;margin:10px 0 2px;">
      <strong>Geometry input lives above.</strong> Corridor virtual sites along
      lanes, contested midpoint pairs, disconnect virtual sites, and minimum
      star margin belong to Territory Tuning &amp; Constraints, not Territory
      Styles.
    </div>
    <TerritorySurfaceStyleTuning
      {panel}
      onUpdate={debouncedConfigUpdate}
      sectionHeading="Style"
      intro="Shared surface styling for metaball-grid output. These controls affect the visible fill and border layer while the underlying ownership geometry remains authoritative."
      fillHelp="Metaball Grid uses the shared territory surface controls for fill color energy. Hue stays player-owned; adjust saturation, lightness, alpha, or disable fill entirely."
      borderHelp="Metaball Grid borders are rendered through the shared territory border surface. Use this for width, saturation, lightness, alpha, or disable borders entirely."
      activeSection={resolveActiveStyleSubsection()}
      styleFamily={isEmberLatticeStyle()
        ? "metaball_grid_ember_lattice"
        : isMetaballGridPhaseEdgesStyle()
          ? "metaball_grid_phase_edges"
          : "metaball_grid"} />
  </div>
{/if}

{#if showStylesView && showRendererModule("grid-gradient") && isGridGradientStyle()}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
      <h4 class="axis-card-title">Grid Gradient (Experimental)</h4>
    </div>
    <GridGradientTuning {panel} {updatePanel} />
  </div>
{/if}

</div>
</div>
{/if}

{#if showStylesView}
  {#if !hasTerritoryStyleControls()}
    <div class="axis-note">
      This render mode does not expose a separate style surface.
    </div>
  {:else}
    {#if supportsRuntimeSurfaceStyleCard() && resolvedStyleSubsection() === "finish"}
      <div class="axis-note">
        Finish controls are not exposed for this runtime surface mode. Use
        `Fill` or `Border`, or switch to a shared-surface family such as
        Metaball Grid or Perimeter Field for finish controls.
      </div>
    {/if}

    {#if supportsRuntimeSurfaceStyleCard() && showStyleSection("fill")}
      <div class="engine-control-group territory-module-card" data-subsection-id="fill">
        <div class="territory-card__header">
          <h4 class="axis-card-title">
            {resolveActiveStyleId() === "territory_engine"
              ? "Engine Surface"
              : resolveActiveStyleId() === "power_voronoi_runtime"
                ? "Power Voronoi 0427 Surface"
                : "Layered Runtime Surface"}
          </h4>
          <p class="territory-card__intro">
            Visible fill and border styling for the active territory surface.
            Runtime shape, diagnostics, and topology live elsewhere.
          </p>
        </div>

        <h5 class="territory-inline-heading">Territory Fill</h5>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Fill Alpha</span><span class="val"
              >{(panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_ALPHA", "voronoiAlpha", v);
            }} />
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Neutral Transparent</span>
            <label class="toggle-switch">
              <input
                type="checkbox"
                checked={panel.neutralTerritoryTransparent ??
                  GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT}
                onchange={(e) => {
                  const v = (e.target as HTMLInputElement).checked;
                  debouncedConfigUpdate(
                    "NEUTRAL_TERRITORY_TRANSPARENT",
                    "neutralTerritoryTransparent",
                    v,
                  );
                }} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
              >{(panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION).toFixed(
                2,
              )}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_SATURATION", "voronoiSaturation", v);
            }} />
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
              >{(panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS).toFixed(
                2,
              )}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_LIGHTNESS", "voronoiLightness", v);
            }} />
        </div>
      </div>
    {/if}

    {#if supportsRuntimeSurfaceStyleCard() && showStyleSection("border")}
      <div class="engine-control-group territory-module-card" data-subsection-id="border">
        <div class="territory-card__header">
          <h4 class="axis-card-title">
            {resolveActiveStyleId() === "territory_engine"
              ? "Engine Surface"
              : resolveActiveStyleId() === "power_voronoi_runtime"
                ? "Power Voronoi 0427 Surface"
                : "Layered Runtime Surface"}
          </h4>
          <p class="territory-card__intro">
            Visible fill and border styling for the active territory surface.
            Runtime shape, diagnostics, and topology live elsewhere.
          </p>
        </div>

        <h5 class="territory-inline-heading">Territory Border</h5>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
              >{(
                panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH
              ).toFixed(1)}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_BORDER_WIDTH", "voronoiBorderWidth", v);
            }} />
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
              >{(
                panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA
              ).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_BORDER_ALPHA", "voronoiBorderAlpha", v);
            }} />
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Geometry Smooth Passes</span><span
              class="val"
              >{Math.round(
                panel.voronoiBorderSmooth ?? GAME_CONFIG.VORONOI_BORDER_SMOOTH,
              )}</span>
          </div>
          <div class="row-hint">
            Chaikin passes - modifies actual border and fill geometry coordinates.
            0 = angular, 2 = smooth, 5 = very round.
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={panel.voronoiBorderSmooth ?? GAME_CONFIG.VORONOI_BORDER_SMOOTH}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate(
                "VORONOI_BORDER_SMOOTH",
                "voronoiBorderSmooth",
                v,
              );
            }} />
        </div>
      </div>
    {/if}

    {#if supportsGridGradientStyleCard() && !showTuningView}
      <div class="engine-control-group territory-module-card">
        <div class="territory-card__header">
          <h4 class="axis-card-title">Grid Gradient (Experimental)</h4>
        </div>
        <GridGradientTuning {panel} {updatePanel} />
      </div>
    {/if}

    {#if supportsSharedSurfaceStyleCard()}
      <div class="engine-control-group territory-module-card">
        <div class="territory-card__header">
          <h4 class="axis-card-title">{sharedSurfaceStyleHeading()}</h4>
          <p class="territory-card__intro">{sharedSurfaceStyleIntro()}</p>
        </div>
        <TerritorySurfaceStyleTuning
          {panel}
          onUpdate={debouncedConfigUpdate}
          sectionHeading={null}
          intro=""
          activeSection={resolvedStyleSubsection()}
          showFinishSection={resolveActiveStyleId() === "perimeter_field"}
          styleFamily={isEmberLatticeStyle()
            ? "metaball_grid_ember_lattice"
            : isMetaballGridPhaseEdgesStyle()
              ? "metaball_grid_phase_edges"
              : isMetaballGridStyle()
                ? "metaball_grid"
                : "perimeter_field"}
          fillHelp={isMetaballGridStyle()
            ? isEmberLatticeStyle()
              ? "Fill visibility, color energy, cell paint, and boundary inset for the Ember Lattice surface."
              : isMetaballGridPhaseEdgesStyle()
                ? "Fill visibility, color energy, cell paint, and boundary inset for the Phase Edges surface."
                : "Fill visibility, color energy, cell paint, and boundary inset for the Metaball Grid surface."
            : "Fill visibility, color energy, and perimeter placement for the Perimeter Field surface."}
          borderHelp={isMetaballGridStyle()
            ? isEmberLatticeStyle()
              ? "Border visibility, width, color energy, geometry family, contour seam, smoothing, and trim for the Ember Lattice surface."
              : isMetaballGridPhaseEdgesStyle()
                ? "Border visibility, width, color energy, and paint strategy for the Phase Edges surface."
                : "Border visibility, width, color energy, and paint strategy for the Metaball Grid surface."
            : "Border visibility, width, color energy, and finish for the Perimeter Field surface."} />
      </div>
    {/if}
  {/if}
{/if}

<!-- Per-renderer settings removed — V3.1 uses three-concern architecture (Style + Fill Transition + Border Transition) -->

<style>
  @import "./panel-shared.css";
  .territory-section-shell {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 16px;
  }
  .territory-section-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .territory-scope-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .territory-section-title {
    flex: 1;
    margin: 0;
  }
  .territory-all-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(7, 12, 24, 0.5);
    color: rgba(240, 244, 248, 0.9);
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .territory-all-toggle:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.22);
    background: rgba(16, 24, 40, 0.72);
  }
  .territory-all-toggle.active {
    border-color: rgba(95, 211, 255, 0.42);
    background: rgba(49, 105, 164, 0.26);
    box-shadow: 0 0 0 1px rgba(95, 211, 255, 0.16);
  }
  .territory-module-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .territory-module-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: 100%;
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
      border-color 0.15s ease,
      background 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;
  }
  .territory-module-chip:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.22);
    background: rgba(16, 24, 40, 0.72);
    color: rgba(241, 245, 249, 0.98);
  }
  .territory-module-chip.active {
    border-color: rgba(95, 211, 255, 0.42);
    background: rgba(49, 105, 164, 0.26);
    box-shadow: 0 0 0 1px rgba(95, 211, 255, 0.16);
    color: rgba(248, 250, 252, 0.98);
  }
  .territory-module-chip__icon {
    display: inline-grid;
    place-items: center;
    width: 18px;
    font-size: 13px;
    line-height: 1;
  }
  .territory-module-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .territory-module-card {
    height: auto;
  }
  .territory-module-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .territory-card__header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .territory-card__intro {
    margin: 0;
    font-size: 11px;
    line-height: 1.45;
    color: rgba(188, 207, 224, 0.72);
  }
  .territory-inline-heading {
    margin: 2px 0 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(168, 208, 239, 0.78);
  }
  .engine-control-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
      rgba(16, 22, 34, 0.7);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }
  .row-bottom {
    font-size: 11px;
    line-height: 1.45;
    color: rgba(197, 214, 229, 0.68);
  }
  .lock-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(149, 211, 177, 0.9);
  }
  .lock-toggle input {
    margin: 0;
  }
  @media (max-width: 900px) {
    .territory-module-grid {
      grid-template-columns: 1fr;
    }
  }
  /* ── V3.2 Axis Card Layout ── */
  .axis-card {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
      rgba(16, 22, 34, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 12px;
  }
  .axis-card-title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(236, 242, 249, 0.92);
    margin: 0;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .axis-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .axis-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .axis-label {
    flex-shrink: 0;
    width: 80px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--accent, #888);
    padding-top: 4px;
    font-weight: 600;
  }
  .axis-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }
  .axis-btn {
    padding: 3px 8px;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-radius: 10px;
    color: var(--accent, #888);
    font-size: 9px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    line-height: 1.3;
  }
  .axis-btn:hover {
    background: var(--accent-bg, rgba(255, 255, 255, 0.06));
    border-color: var(--accent, #888);
  }
  .axis-btn.active {
    background: var(--accent, #888);
    border-color: var(--accent, #888);
    color: #111;
    font-weight: 600;
  }
  .axis-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }
  .axis-buttons-wrap {
    max-height: 120px;
    overflow-y: auto;
  }
  .mini-btn {
    padding: 3px 10px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
  }
  .mini-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.8);
    border-color: rgba(255, 255, 255, 0.25);
  }
  .mini-btn.active {
    background: rgba(74, 222, 128, 0.2);
    border-color: #4ade80;
    color: #4ade80;
    box-shadow: 0 0 6px rgba(74, 222, 128, 0.25);
  }
  .mini-btn:disabled {
    cursor: not-allowed;
    opacity: 0.42;
    box-shadow: none;
  }
  .mini-btn:disabled:hover {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.15);
  }
</style>
