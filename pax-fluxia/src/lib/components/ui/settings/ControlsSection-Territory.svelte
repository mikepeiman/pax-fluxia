<script lang="ts">
  import "./panel-shared.css";
    import { settingsStore } from "../settingsStore.svelte";
  import { GAME_CONFIG } from "$lib/config/game.config";
  import {
    normalizeTerritoryRenderModeId,
    resolveTerritoryRenderModeOptions,
  } from "$lib/territory/ui/territoryRenderModeCatalog";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import CellGridTuning from "./CellGridTuning.svelte";
  import GridGradientTuning from "./GridGradientTuning.svelte";
  import {
    cellGridFamilyConfigDefaults,
    cellGridPhaseEdgesModeDefaults,
  } from "$lib/territory/families/cellGrid/config";
  import TerritorySurfaceStyleTuning from "./TerritorySurfaceStyleTuning.svelte";
  import { untrack } from 'svelte';
  import { log } from "$lib/utils/logger";
  import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
  import { territoryRenderStatus } from "$lib/stores/territoryRenderStatusStore";
  import {
    beginTerritoryTuningCompile,
    territoryTuningStatus,
  } from "$lib/stores/territoryTuningStatusStore";
  import { TERRITORY_GEOMETRY_LIMITS } from "$lib/territory/geometry/geometryTuning";
  import {
    PaxHudButton,
    PaxHudSelect,
    PaxSettingsRangeRow,
    PaxSettingsSegmentedRow,
    PaxSettingsToggleRow,
    type PaxHudSegmentedOption,
  } from "$lib/design-system";

  // ControlsSection-Territory -- Territory Rendering (Voronoi + Metaball)

  // Structural props (how the parent renders this section) stay props; the
  // settings data + anim-lock helpers come from the store (2026-07-15 phase 2b).
  interface Props {
    view?: "modes" | "tuning" | "styles" | "all";
    activeSubsection?: string;
    showCategoryThemeBar?: boolean;
    hideRenderModeSelector?: boolean;
    systemTitle?: string;
  }

  let {
    view = "all",
    activeSubsection = "all",
    showCategoryThemeBar = false,
    hideRenderModeSelector = false,
    systemTitle = "Territory System",
  }: Props = $props();

  const panel = $derived(settingsStore.panel);
  const updatePanel = settingsStore.set;
  const syncFromConfig = settingsStore.syncFromConfig;
  const animLockModes = $derived(settingsStore.animLockModes);
  const animLockRatios = $derived(settingsStore.animLockRatios);
  const getAnimValue = settingsStore.getAnimValue;
  const setAnimValue = settingsStore.setAnimValue;
  const formatAnimValue = settingsStore.formatAnimValue;
  const pinValueToTickDuration = settingsStore.pinValueToTickDuration;
  const lockRatioToTick = settingsStore.lockRatioToTick;
  const lockRatioToAnimSpeed = settingsStore.lockRatioToAnimSpeed;

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

  type TerritoryRendererModuleId =
    | "all"
    | "none"
    | "cell-grid"
    | "grid-gradient"
    | "topology";

  interface TerritoryModuleDef<T extends string> {
    id: T;
    label: string;
    icon: string;
  }

  type TerritoryRendererViewId = Exclude<
    TerritoryRendererModuleId,
    "all" | "none"
  >;

  const TERRITORY_RENDERER_MODULE_PANEL_KEY =
    "territoryRendererModuleVisibility";

  let activeRendererModule = $derived(
    (panel[TERRITORY_RENDERER_MODULE_PANEL_KEY] ??
      "all") as TerritoryRendererModuleId,
  );

  function renderModeOptions(): PaxHudSegmentedOption[] {
    return getRenderModeOptions().map((option) => ({
      value: option.id,
      label: option.label,
      title: option.disabledReason ?? option.shortDescription ?? option.label,
      disabled: !option.selectable,
    }));
  }

  function supportsSharedSurfaceStyleCard(): boolean {
    const activeStyle = resolveActiveStyleId();
    // perimeter_field quarantined (Stage A) — no longer renders a settings card.
    return activeStyle === "power_vector" || isCellGridStyle();
  }

  function supportsGridGradientStyleCard(): boolean {
    return resolveActiveStyleId() === "grid_gradient";
  }

  function hasTerritoryStyleControls(): boolean {
    return supportsSharedSurfaceStyleCard() || supportsGridGradientStyleCard();
  }

  function resolvedStyleSubsection():
    | "all"
    | "fill"
    | "border"
    | "finish" {
    if (isEdgeForwardCellGridStyle() && activeSubsection === "finish") {
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
    if (isEmberLatticeStyle()) return "Ember Lattice Surface";
    if (isCellGridPhaseEdgesStyle()) return "Phase Edges Surface";
    if (isCellGridStyle()) return "Phase Field Surface";
    return "Power Vector Surface";
  }

  // Immediate bridge write: sets GAME_CONFIG (for runtime reads) AND panel state (for UI
  // reactivity), then bumps the territory visual config. NOT debounced — the deferred/topology
  // path is queueTopologySliderUpdate / queueTopologyToggleUpdate below.
  function applyConfigUpdate(
    configKey: string,
    panelKey: string,
    value: any,
  ) {
    const prev = (GAME_CONFIG as any)[configKey];
    (GAME_CONFIG as any)[configKey] = value;
    updatePanel(panelKey, value);
    bumpTerritoryVisualConfig();
    // PAUSE-EXEMPT so it surfaces even though the open settings panel pauses the game.
    log.ui(
      "territory",
      `${configKey} = ${JSON.stringify(value)} (was ${JSON.stringify(prev)}) [mode=${(GAME_CONFIG as any).TERRITORY_RENDER_MODE}]`,
    );
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
    log.ui(
      "territory",
      `${configKey} = ${JSON.stringify(value)} (topology, deferred) [mode=${(GAME_CONFIG as any).TERRITORY_RENDER_MODE}]`,
    );

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
    log.ui(
      "territory",
      `${configKey} = ${JSON.stringify(value)} (topology slider) [mode=${(GAME_CONFIG as any).TERRITORY_RENDER_MODE}]`,
    );

    const timeoutId = window.setTimeout(() => {
      topologyCommitTimeouts.delete(configKey);
      (GAME_CONFIG as any)[configKey] = value;
      bumpTerritoryVisualConfig();
    }, delayMs);
    topologyCommitTimeouts.set(configKey, timeoutId);
  }

  /* ── V3.1 Three-Concern Architecture ── */

  function getRenderModeOptions() {
    return resolveTerritoryRenderModeOptions();
  }

  const PHASE_EDGES_PRIMED_TUNABLES = [
    {
      configKey: "TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE",
      panelKey: "territoryFrontierBorderGeometryMode",
      familyDefault: "shared_edge",
      phaseEdgesDefault:
        cellGridPhaseEdgesModeDefaults.TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE,
    },
    {
      configKey: "CELL_GRID_WAVE_GEOMETRY",
      panelKey: "cellGridWaveGeometry",
      familyDefault: cellGridFamilyConfigDefaults.CELL_GRID_WAVE_GEOMETRY,
      phaseEdgesDefault:
        cellGridPhaseEdgesModeDefaults.CELL_GRID_WAVE_GEOMETRY,
    },
    {
      configKey: "CELL_GRID_BORDER_MODE",
      panelKey: "cellGridBorderMode",
      familyDefault: cellGridFamilyConfigDefaults.CELL_GRID_BORDER_MODE,
      phaseEdgesDefault:
        cellGridPhaseEdgesModeDefaults.CELL_GRID_BORDER_MODE,
    },
    {
      configKey: "CELL_GRID_BORDER_BLEND",
      panelKey: "cellGridBorderBlend",
      familyDefault: cellGridFamilyConfigDefaults.CELL_GRID_BORDER_BLEND,
      phaseEdgesDefault:
        cellGridPhaseEdgesModeDefaults.CELL_GRID_BORDER_BLEND,
    },
    {
      configKey: "CELL_GRID_EDGE_SMOOTHING_PASSES",
      panelKey: "cellGridEdgeSmoothingPasses",
      familyDefault:
        cellGridFamilyConfigDefaults.CELL_GRID_EDGE_SMOOTHING_PASSES,
      phaseEdgesDefault:
        cellGridPhaseEdgesModeDefaults.CELL_GRID_EDGE_SMOOTHING_PASSES,
    },
    {
      configKey: "CELL_GRID_EDGE_TRIM_PX",
      panelKey: "cellGridEdgeTrimPx",
      familyDefault: cellGridFamilyConfigDefaults.CELL_GRID_EDGE_TRIM_PX,
      phaseEdgesDefault:
        cellGridPhaseEdgesModeDefaults.CELL_GRID_EDGE_TRIM_PX,
    },
    {
      configKey: "CELL_GRID_BORDER_CHAIKIN_PASSES",
      panelKey: "cellGridBorderChaikinPasses",
      familyDefault:
        cellGridFamilyConfigDefaults.CELL_GRID_BORDER_CHAIKIN_PASSES,
      phaseEdgesDefault:
        cellGridPhaseEdgesModeDefaults.CELL_GRID_BORDER_CHAIKIN_PASSES,
    },
  ] as const;

  function primeCellGridPhaseEdgesTunables(): void {
    for (const entry of PHASE_EDGES_PRIMED_TUNABLES) {
      const panelValue = panel[entry.panelKey];
      const configValue = (GAME_CONFIG as any)[entry.configKey];
      const panelHasExplicitValue = panelValue !== undefined;
      const shouldPrime =
        !panelHasExplicitValue &&
        (configValue === undefined || configValue === entry.familyDefault);
      if (shouldPrime) {
        applyConfigUpdate(
          entry.configKey,
          entry.panelKey,
          entry.phaseEdgesDefault,
        );
      }
    }
  }

  function selectTerritoryStyle(styleId: string) {
    applyConfigUpdate(
      "TERRITORY_RENDER_MODE",
      "territoryRenderMode",
      styleId,
    );
    // Persisted-panel migration: pv_frontline belonged to the quarantined
    // PVV4 runtime; no kept mode can play it.
    if (resolveActiveFillTransitionId() === "pv_frontline") {
      selectFrontierTransition("active_front");
    }
    if (styleId === "ember_lattice") {
      primeCellGridPhaseEdgesTunables();
    }
    setActiveRendererModule("all");
    // Reset diagnostic so it logs on next render frame
    (globalThis as any).__RENDER_MODE_LOGGED = false;
  }

  // Render modes surfaced as subsection chips inside the unified Render section.
  // When the styles view is filtered to one of these, that mode's card renders —
  // letting the user view/tune ANY mode's controls independent of the live
  // (topbar-selected) render mode.
  const RENDER_MODE_SUBSECTION_IDS = new Set<string>([
    "power_vector",
    "phase_edges",
    "ember_lattice",
    "phase_field",
    "grid_gradient",
  ]);

  function resolveActiveStyleId(): string {
    if (
      view === "styles" &&
      activeSubsection !== "all" &&
      RENDER_MODE_SUBSECTION_IDS.has(activeSubsection)
    ) {
      return normalizeTerritoryRenderModeId(activeSubsection) as string;
    }
    return normalizeTerritoryRenderModeId(
      panel.territoryRenderMode ??
        GAME_CONFIG.TERRITORY_RENDER_MODE ??
        "power_vector",
    ) as string;
  }

  function resolveActiveFillTransitionId(): string {
    const raw =
      panel.territoryFillTransitionMode ??
      GAME_CONFIG.TERRITORY_FILL_TRANSITION_MODE ??
      GAME_CONFIG.TERRITORY_FILL_MODE ??
      "active_front";
    if (raw === "frontier" || raw === "frontier_morph") return "active_front";
    if (raw === "none") return "off";
    return raw;
  }

  function selectFrontierTransition(transitionId: string) {
    applyConfigUpdate(
      "TERRITORY_FILL_TRANSITION_MODE",
      "territoryFillTransitionMode",
      transitionId,
    );
  }

  function isCellGridStyle(): boolean {
    const activeStyle = resolveActiveStyleId();
    return (
      activeStyle === "cell_grid" ||
      activeStyle === "phase_edges" ||
      activeStyle === "ember_lattice" ||
      activeStyle === "phase_field"
    );
  }

  function isGridGradientStyle(): boolean {
    return resolveActiveStyleId() === "grid_gradient";
  }

  function isCellGridPhaseEdgesStyle(): boolean {
    return resolveActiveStyleId() === "phase_edges";
  }

  function isEmberLatticeStyle(): boolean {
    return resolveActiveStyleId() === "ember_lattice";
  }

  function isEdgeForwardCellGridStyle(): boolean {
    return isCellGridPhaseEdgesStyle() || isEmberLatticeStyle();
  }

  $effect(() => {
    if (isEmberLatticeStyle()) {
      untrack(() => primeCellGridPhaseEdgesTunables());
    }
  });

  function rendererModules(): Array<
    TerritoryModuleDef<TerritoryRendererViewId>
  > {
    const modules: Array<
      TerritoryModuleDef<TerritoryRendererViewId>
    > = [{ id: "topology", label: "Topology", icon: "circle-nodes" }];

    if (isCellGridStyle()) {
      modules.unshift({
        id: "cell-grid",
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

  function setActiveRendererModule(value: TerritoryRendererModuleId) {
    updatePanel(TERRITORY_RENDERER_MODULE_PANEL_KEY, value);
  }

</script>

{#if showCategoryThemeBar && !showStylesView}
  <CategoryThemeBar category="territory" onApply={() => syncFromConfig?.()} />
{/if}

{#if showModesView}
<div class="territory-section-shell territory-section-shell--system">
  <div class="territory-section-head">
    <h4 class="sub-heading territory-section-title">{systemTitle}</h4>
  </div>
  <div class="territory-module-grid">
      <div class="axis-card territory-module-card">
        <div class="territory-card__header">
      <h4 class="axis-card-title">{hideRenderModeSelector ? "Transition" : "Mode"}</h4>
        </div>
        {#if !hideRenderModeSelector}
          <div class="axis-row territory-axis territory-axis--render-mode">
            <PaxHudSelect
              label="Render mode"
              hint="The active renderer family for territory fills/borders. Switch to compare render styles; each family exposes its own tuning below."
              value={resolveActiveStyleId()}
              options={renderModeOptions()}
              ariaLabel="Territory render mode"
              onValueChange={selectTerritoryStyle}
            />
          </div>
        {/if}

        {#if $territoryRenderStatus.lastRenderFailure}
          <div class="axis-note axis-note--warning">
            <strong>Render failure:</strong>
            <span class="axis-note__danger">{$territoryRenderStatus.lastRenderFailure}</span>
          </div>
        {/if}

          <h5 class="territory-inline-heading">Conquest Transition</h5>
          <div class="var-row">
            <PaxSettingsSegmentedRow
              label="Front Shape"
              hint="Shape of the conquest split applied in the geometry. Radial (default) = curved front advancing from the attack origin. Linear = straight sweep."
              value={panel.territoryConquestFrontMode ??
                GAME_CONFIG.TERRITORY_CONQUEST_FRONT_MODE ??
                "radial"}
              options={[
                { value: "radial", label: "Radial" },
                { value: "linear", label: "Linear" },
              ]}
              settingConfigKey="TERRITORY_CONQUEST_FRONT_MODE"
              onValueChange={(value) =>
                applyConfigUpdate(
                  "TERRITORY_CONQUEST_FRONT_MODE",
                  "territoryConquestFrontMode",
                  value,
                )} />
          </div>
          <div class="var-row">
            <PaxSettingsRangeRow
              label="Border Rounding (Chaikin passes)"
              value={panel.voronoiBorderSmooth ??
                GAME_CONFIG.VORONOI_BORDER_SMOOTH}
              min={0}
              max={5}
              step={1}
              settingConfigKey="VORONOI_BORDER_SMOOTH"
              onInput={(value) =>
                applyConfigUpdate(
                  "VORONOI_BORDER_SMOOTH",
                  "voronoiBorderSmooth",
                  value,
                )} />
          </div>
          <div class="var-row">
            <PaxSettingsRangeRow
              label="Motion Completion (% of window)"
              value={panel.territoryMorphCompletePct ??
                GAME_CONFIG.TERRITORY_MORPH_COMPLETE_PCT ??
                92}
              min={50}
              max={100}
              step={1}
              format="percent"
              settingConfigKey="TERRITORY_MORPH_COMPLETE_PCT"
              onInput={(value) =>
                applyConfigUpdate(
                  "TERRITORY_MORPH_COMPLETE_PCT",
                  "territoryMorphCompletePct",
                  value,
                )} />
          </div>
          <div class="var-row">
            <PaxSettingsRangeRow
              label="Transition Duration"
              value={panel.territoryTransitionMs ??
                GAME_CONFIG.TERRITORY_TRANSITION_MS}
              min={0}
              max={3000}
              step={50}
              suffix="ms"
              settingConfigKey="TERRITORY_TRANSITION_MS"
              onInput={(value) =>
                applyConfigUpdate(
                  "TERRITORY_TRANSITION_MS",
                  "territoryTransitionMs",
                  value,
                )} />
          </div>
          <div class="var-row">
            <PaxSettingsToggleRow
              label="Bind duration to tick"
              checked={panel.territoryTransitionBindToTick ??
                GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK}
              settingConfigKey="TERRITORY_TRANSITION_BIND_TO_TICK"
              onChange={(value) =>
                applyConfigUpdate(
                  "TERRITORY_TRANSITION_BIND_TO_TICK",
                  "territoryTransitionBindToTick",
                  value,
                )} />
          </div>
      </div>

  </div>
</div>
{/if}

{#if showTuningView}
<div class="territory-section-shell territory-section-shell--renderer">
  <div class="territory-section-head">
    <h4 class="sub-heading territory-section-title">
      {showStylesView ? "Render Families" : "Frontier Topology"}
    </h4>
  </div>
  <div class="territory-module-grid">

{#if showStylesView && rendererModules().length === 0}
  <div class="axis-note">
    This territory mode does not expose dedicated render-family controls.
  </div>
{/if}

{#if showTuningView}
<div class="territory-module-card territory-module-stack">
<h5 class="territory-inline-heading">Frontier Topology</h5>
<!-- Territory Topology Rules (MSR / CX / DX) -->
<div class="engine-control-group">
  <div class="territory-card__header">
    <h4 class="axis-card-title">Topology Rules</h4>
  </div>

  <h5 class="territory-inline-heading">Minimum Footprint</h5>

  <!-- MSR — Minimum Star Region -->
  <div
    class="var-row territory-range-note"
    title="Sets the target minimum frontier distance around owned stars. This value shapes territory geometry only; lane margin is a separate map-layout/editor control.">
    <PaxSettingsRangeRow
      label="Minimum Star Margin"
      value={panel.starMargin ?? GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45}
      min={topologyLimits.starMargin.min}
      max={topologyLimits.starMargin.max}
      step={5}
      suffix="px"
      settingConfigKey="MODIFIED_VORONOI_STAR_MARGIN"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "MODIFIED_VORONOI_STAR_MARGIN",
          "starMargin",
          value,
          "Minimum Star Margin",
        )} />
  </div>

  <h5 class="territory-inline-heading">MSR as star power</h5>

  <div
    class="var-row territory-range-note"
    title="Optional advanced solve-time star resistance against corridor, lane-pair, and disconnect shaping. 0 keeps MSR as pure local frontier clearance.">
    <PaxSettingsRangeRow
      label="Star Bias"
      value={panel.msrStarBias ??
        (GAME_CONFIG as any).TERRITORY_MSR_STAR_BIAS ??
        0}
      min={topologyLimits.msrStarBias.min}
      max={topologyLimits.msrStarBias.max}
      step={0.05}
      format="fixed2"
      settingConfigKey="TERRITORY_MSR_STAR_BIAS"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "TERRITORY_MSR_STAR_BIAS",
          "msrStarBias",
          value,
          "Star Bias",
        )} />
  </div>

  <h5 class="territory-inline-heading">Frontier Sampling</h5>

  <div class="var-row territory-range-note">
    <PaxSettingsRangeRow
      label="Frontier Resolution"
      value={panel.frontierResolution ?? GAME_CONFIG.FRONTIER_RESOLUTION ?? 5}
      min={topologyLimits.frontierResolution.min}
      max={topologyLimits.frontierResolution.max}
      step={1}
      suffix="px"
      settingConfigKey="FRONTIER_RESOLUTION"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "FRONTIER_RESOLUTION",
          "frontierResolution",
          value,
          "Frontier Resolution",
        )} />
  </div>

  <h5 class="territory-inline-heading">World Boundary</h5>

  <div
    class="var-row territory-range-note"
    title="How far the territory fill AND its world-edge border extend past the map rectangle. Fill and border share this boundary, so they extend together. 0 = territory stops exactly at the map edge.">
    <PaxSettingsRangeRow
      label="Extent Beyond Map"
      value={panel.worldExtentPx ?? GAME_CONFIG.CHAIKIN_BOUNDARY_PAD ?? 50}
      min={0}
      max={300}
      step={5}
      suffix="px"
      settingConfigKey="CHAIKIN_BOUNDARY_PAD"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "CHAIKIN_BOUNDARY_PAD",
          "worldExtentPx",
          value,
          "Extent Beyond Map",
        )} />
  </div>

  <h5 class="territory-inline-heading">Corridors</h5>

  <!-- CX — Corridor Connection -->
  <PaxSettingsToggleRow
    label="Corridor Virtual Sites (CX)"
    checked={panel.corridorEnabled ??
      GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
      true}
    meta={(panel.corridorEnabled ??
      GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
      true)
      ? "On"
      : "Off"}
    settingConfigKey="MODIFIED_VORONOI_CORRIDOR_ENABLED"
    onChange={(value) =>
      queueTopologyToggleUpdate(
        "MODIFIED_VORONOI_CORRIDOR_ENABLED",
        "corridorEnabled",
        value,
        "Corridor Virtual Sites (CX)",
      )} />
  <div class="territory-indent">
    <PaxSettingsToggleRow
      label="Lane Midpoint Pairs"
      checked={panel.cxContestMidpointVstars ??
        GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ??
        true}
      meta={(panel.cxContestMidpointVstars ??
        GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ??
        true)
        ? "On"
        : "Off"}
      settingConfigKey="TERRITORY_CX_CONTEST_MIDPOINT_VSTARS"
      onChange={(value) =>
        queueTopologyToggleUpdate(
          "TERRITORY_CX_CONTEST_MIDPOINT_VSTARS",
          "cxContestMidpointVstars",
          value,
          "Lane Midpoint Pairs",
        )} />
  </div>
  <div
    class="var-row indent territory-range-note"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <PaxSettingsRangeRow
      label="Lane Midpoint Pair Count"
      value={panel.cxContestPairCount ??
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ??
        1}
      min={topologyLimits.cxContestPairCount.min}
      max={topologyLimits.cxContestPairCount.max}
      step={1}
      disabled={!cxOn}
      settingConfigKey="TERRITORY_CX_CONTEST_PAIR_COUNT"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "TERRITORY_CX_CONTEST_PAIR_COUNT",
          "cxContestPairCount",
          value,
          "Lane Midpoint Pair Count",
        )} />
  </div>
  <div
    class="var-row indent territory-range-note"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <PaxSettingsRangeRow
      label="Lane Midpoint Pair Spacing"
      value={panel.cxContestPairSpacing ??
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_SPACING ??
        75}
      min={topologyLimits.cxContestPairSpacing.min}
      max={topologyLimits.cxContestPairSpacing.max}
      step={5}
      disabled={!cxOn}
      settingConfigKey="TERRITORY_CX_CONTEST_PAIR_SPACING"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "TERRITORY_CX_CONTEST_PAIR_SPACING",
          "cxContestPairSpacing",
          value,
          "Lane Midpoint Pair Spacing",
        )} />
  </div>
  <div
    class="var-row indent territory-range-note"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <PaxSettingsRangeRow
      label="Lane Midpoint Pair Weight"
      value={panel.cxContestPairWeight ??
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ??
        0.5}
      min={topologyLimits.cxContestPairWeight.min}
      max={topologyLimits.cxContestPairWeight.max}
      step={0.05}
      disabled={!cxOn}
      format="fixed2"
      settingConfigKey="TERRITORY_CX_CONTEST_PAIR_WEIGHT"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "TERRITORY_CX_CONTEST_PAIR_WEIGHT",
          "cxContestPairWeight",
          value,
          "Lane Midpoint Pair Weight",
        )} />
  </div>
  <div
    class="var-row indent territory-range-note"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <PaxSettingsRangeRow
      label="Corridor Sample Count"
      value={panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0}
      min={topologyLimits.corridorCount.min}
      max={topologyLimits.corridorCount.max}
      step={1}
      disabled={!cxOn}
      output={(panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0) === 0
        ? "Auto"
        : `${panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT}`}
      settingConfigKey="TERRITORY_CX_COUNT"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "TERRITORY_CX_COUNT",
          "cxCount",
          value,
          "Corridor Sample Count",
        )} />
  </div>
  <div
    class="var-row indent territory-range-note"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <PaxSettingsRangeRow
      label="Corridor Weight"
      value={panel.cxWeight ?? GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5}
      min={topologyLimits.corridorWeight.min}
      max={topologyLimits.corridorWeight.max}
      step={0.05}
      disabled={!cxOn}
      format="fixed2"
      settingConfigKey="TERRITORY_CX_WEIGHT"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "TERRITORY_CX_WEIGHT",
          "cxWeight",
          value,
          "Corridor Weight",
        )} />
  </div>
  <div
    class="var-row indent territory-range-note"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn Corridor Virtual Sites on to edit these values." : ""}>
    <PaxSettingsRangeRow
      label="Corridor Spacing"
      value={panel.corridorSpacing ??
        GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ??
        60}
      min={topologyLimits.corridorSpacing.min}
      max={topologyLimits.corridorSpacing.max}
      step={5}
      disabled={!cxOn}
      suffix="px"
      settingConfigKey="MODIFIED_VORONOI_CORRIDOR_SPACING"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "MODIFIED_VORONOI_CORRIDOR_SPACING",
          "corridorSpacing",
          value,
          "Corridor Spacing",
        )} />
  </div>

  <h5 class="territory-inline-heading">Disconnects</h5>

  <!-- DX — Disconnection Zones -->
  <PaxSettingsToggleRow
    label="Disconnect Gaps (DX)"
    checked={panel.disconnectEnabled ??
      GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
      false}
    meta={(panel.disconnectEnabled ??
      GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
      false)
      ? "On"
      : "Off"}
    settingConfigKey="MODIFIED_VORONOI_DISCONNECT_ENABLED"
    onChange={(value) =>
      queueTopologyToggleUpdate(
        "MODIFIED_VORONOI_DISCONNECT_ENABLED",
        "disconnectEnabled",
        value,
        "Disconnect Gaps (DX)",
      )} />
  <div
    class="var-row indent territory-range-note"
    class:disabled={!dxOn}
    title={!dxOn ? "Turn Disconnect Gaps on to edit these values." : ""}>
    <PaxSettingsRangeRow
      label="Disconnect Weight"
      value={panel.dxWeight ?? GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3}
      min={topologyLimits.disconnectWeight.min}
      max={topologyLimits.disconnectWeight.max}
      step={0.05}
      disabled={!dxOn}
      format="fixed2"
      settingConfigKey="TERRITORY_DX_WEIGHT"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "TERRITORY_DX_WEIGHT",
          "dxWeight",
          value,
          "Disconnect Weight",
        )} />
  </div>
  <div
    class="var-row indent territory-range-note"
    class:disabled={!dxOn}
    title={!dxOn ? "Turn Disconnect Gaps on to edit these values." : ""}>
    <PaxSettingsRangeRow
      label="Disconnect Distance"
      value={panel.disconnectDistance ??
        GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ??
        400}
      min={topologyLimits.disconnectDistance.min}
      max={topologyLimits.disconnectDistance.max}
      step={25}
      disabled={!dxOn}
      suffix="px"
      settingConfigKey="MODIFIED_VORONOI_DISCONNECT_DISTANCE"
      onInput={(value) =>
        queueTopologySliderUpdate(
          "MODIFIED_VORONOI_DISCONNECT_DISTANCE",
          "disconnectDistance",
          value,
          "Disconnect Distance",
        )} />
  </div>
</div>
</div>
{/if}

<!-- Active Layers toggles removed — V3 architecture uses Render Mode dropdown above -->

<!-- Per-module style cards (Perimeter / Cell Grid / Grid Gradient) removed:
     they only rendered in the unused view="all" path and exactly duplicated the
     single style-card system in block D below (supports* cards). Block D is the
     subsection-aware, finish-aware, richer surface and is the sole style home. -->

</div>
</div>
{/if}

{#if showStylesView}
  {#if !hasTerritoryStyleControls()}
    <div class="axis-note">
      This render mode does not expose a separate style surface.
    </div>
  {:else}
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
        </div>
        {#if isCellGridStyle()}
          <CellGridTuning {panel} {updatePanel} />
        {/if}
        <TerritorySurfaceStyleTuning
          {panel}
          onUpdate={applyConfigUpdate}
          sectionHeading={null}
          activeSection={resolvedStyleSubsection()}
          styleFamily={isEmberLatticeStyle()
            ? "ember_lattice"
            : isCellGridPhaseEdgesStyle()
              ? "phase_edges"
              : isCellGridStyle()
                ? "cell_grid"
                : "power_vector"}
          fillHelp={isCellGridStyle()
            ? isEmberLatticeStyle()
              ? "Fill visibility, color energy, cell paint, and boundary inset for the Ember Lattice surface."
              : isCellGridPhaseEdgesStyle()
                ? "Fill visibility, color energy, cell paint, and boundary inset for the Phase Edges surface."
                : "Fill visibility, color energy, cell paint, and boundary inset for the Phase Field surface."
            : "Fill visibility, color energy, and alpha for the Power Vector surface (hue stays player-owned)."}
          borderHelp={isCellGridStyle()
            ? isEmberLatticeStyle()
              ? "Border visibility, width, color energy, geometry family, contour seam, smoothing, and trim for the Ember Lattice surface."
              : isCellGridPhaseEdgesStyle()
                ? "Border visibility, width, color energy, and paint strategy for the Phase Edges surface."
                : "Border visibility, width, color energy, and paint strategy for the Phase Field surface."
            : "Border visibility, width, color energy, alpha, and rounding (Chaikin smooth passes) for the Power Vector surface."} />
      </div>
    {/if}
  {/if}
{/if}

<!-- Per-renderer settings removed — V3.1 uses three-concern architecture (Style + Fill Transition + Border Transition) -->

<style>
  .territory-section-shell {
    display: flex;
    flex-direction: column;
    gap: var(--pax-gap-sm);
    margin: 0 0 var(--pax-space-4);
  }
  .territory-section-head {
    display: flex;
    align-items: center;
    gap: var(--pax-gap-sm);
  }
  .territory-section-title {
    flex: 1;
    margin: 0;
  }
  .territory-module-grid {
    display: flex;
    flex-direction: column;
    gap: var(--pax-space-3);
  }
  .territory-module-card {
    height: auto;
  }
  .territory-module-stack {
    display: flex;
    flex-direction: column;
    gap: var(--pax-gap-sm);
  }
  .territory-card__header {
    display: flex;
    flex-direction: column;
    gap: var(--pax-gap-xs);
  }
  .territory-inline-heading {
    margin: 2px 0 0;
    font-size: var(--pax-type-3xs);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--pax-ui-text-soft) 78%, transparent);
  }
  .engine-control-group {
    display: flex;
    flex-direction: column;
    gap: var(--pax-gap-sm);
    padding: var(--pax-space-3);
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 8%, transparent);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--pax-ui-text-strong) 5%, transparent), color-mix(in srgb, var(--pax-ui-text-strong) 2.5%, transparent)),
      color-mix(in srgb, var(--pax-color-void) 70%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--pax-ui-text-strong) 4%, transparent);
  }
  @media (max-width: 900px) {
    .territory-module-grid {
      grid-template-columns: 1fr;
    }
  }
  /* ── V3.2 Axis Card Layout ── */
  .axis-card {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--pax-ui-text-strong) 5%, transparent), color-mix(in srgb, var(--pax-ui-text-strong) 2.5%, transparent)),
      color-mix(in srgb, var(--pax-color-void) 70%, transparent);
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 8%, transparent);
    border-radius: 14px;
    padding: var(--pax-space-3);
  }
  .axis-card-title {
    font-size: var(--pax-type-xs);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: color-mix(in srgb, var(--pax-ui-text-strong) 92%, transparent);
    margin: 0;
    padding-bottom: var(--pax-gap-xs);
    border-bottom: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 6%, transparent);
  }
  .axis-row {
    display: flex;
    align-items: flex-start;
    gap: var(--pax-space-2);
    padding: 5px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 4%, transparent);
  }
  .axis-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .territory-axis {
    align-items: stretch;
  }
  .territory-axis--render-mode {
    --accent: var(--pax-color-player-purple);
    --accent-bg: color-mix(in srgb, var(--pax-color-player-purple) 15%, transparent);
  }
  .territory-indent {
    margin-left: var(--pax-gap-md);
  }
  .axis-note--warning {
    margin: var(--pax-space-1) 0 var(--pax-space-2);
    padding: var(--pax-space-2) var(--pax-gap-sm);
    border-left: 3px solid var(--pax-ui-warning);
    background: color-mix(in srgb, var(--pax-ui-warning) 8%, transparent);
  }
  .axis-note__danger {
    color: var(--pax-ui-danger);
  }
</style>
