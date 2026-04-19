<script lang="ts">
  import { GAME_CONFIG } from "$lib/config/game.config";
  import {
    TERRITORY_PIPELINE_STAGE_ORDER,
    type TerritoryPipelineArtifacts,
    type TerritoryPipelineStageId,
  } from "$lib/territory/orchestrator";
  import { territoryTraceRun } from "$lib/territory/orchestrator/traceStore";
  import {
    isTerritoryRenderModeUiHidden,
    resolveTerritoryRenderModeOptions,
  } from "$lib/territory/ui/territoryRenderModeCatalog";
  import {
    familyRegistryEpoch,
    getRegisteredFamilyAdapterModeIds,
  } from "$lib/territory/families/renderFamilyRegistry";
  import {
    coerceVsTransitionModeForRenderMode,
    getTransitionModeOptionsForRenderMode,
  } from "$lib/territory/transitions/territoryTransitionModes";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import TerritoryTransitionTuning from "./TerritoryTransitionTuning.svelte";
  import PerimeterFieldTuning from "./PerimeterFieldTuning.svelte";
  import MetaballGridTuning from "./MetaballGridTuning.svelte";
  import TerritoryGeometrySourceTuning from "./TerritoryGeometrySourceTuning.svelte";
  import TerritorySurfaceStyleTuning from "./TerritorySurfaceStyleTuning.svelte";
  import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";

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
  }: Props = $props();

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

  type TerritorySystemModuleId =
    | "all"
    | "none"
    | "geometry"
    | "render-mode"
    | "architecture"
    | "fill-transition";
  type TerritoryRendererModuleId =
    | "all"
    | "none"
    | "metaball"
    | "perimeter-field"
    | "metaball-grid"
    | "topology"
    | "border-transition"
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
    { id: "geometry", label: "Geometry", icon: "◫" },
    { id: "render-mode", label: "Mode", icon: "◎" },
    { id: "architecture", label: "Architecture", icon: "⬢" },
    { id: "fill-transition", label: "Fill", icon: "◌" },
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

  function formatTraceValue(value: unknown): string {
    if (Array.isArray(value)) return `[${value.length}]`;
    if (typeof value === "number")
      return Number.isInteger(value) ? `${value}` : value.toFixed(2);
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      return `{${Object.keys(value as Record<string, unknown>).length}}`;
    }
    return String(value ?? "null");
  }

  function summarizeTraceRecord(
    record: Record<string, unknown> | undefined,
    limit = 6,
  ): string[] {
    if (!record) return [];
    return Object.entries(record)
      .filter(([, value]) => value !== undefined)
      .slice(0, limit)
      .map(([key, value]) => `${key}=${formatTraceValue(value)}`);
  }

  function getTraceArtifactEntries(
    artifacts: TerritoryPipelineArtifacts | undefined,
  ): Array<{
    stageId: TerritoryPipelineStageId;
    artifact: Record<string, unknown>;
  }> {
    if (!artifacts) return [];
    return TERRITORY_PIPELINE_STAGE_ORDER.flatMap((stageId) => {
      const artifact = artifacts[stageId];
      if (!artifact) return [];
      return [{ stageId, artifact: artifact as Record<string, unknown> }];
    });
  }

  function getNextTraceStageLabel(stepCount: number): string {
    return TERRITORY_PIPELINE_STAGE_ORDER[stepCount] ?? "complete";
  }

  function getOwnerRegionLoopPreviewEntries(
    artifacts: TerritoryPipelineArtifacts | undefined,
  ): Array<{ id: string; summary: string }> {
    const ownerRegionLoops = ((
      artifacts?.loop as
        | { ownerRegionLoops?: Array<Record<string, unknown>> }
        | undefined
    )?.ownerRegionLoops ?? []) as Array<Record<string, unknown>>;
    return ownerRegionLoops.slice(0, 4).map((loop, index) => {
      const ownerId = typeof loop.ownerId === "string" ? loop.ownerId : "?";
      const opposingOwnerId =
        typeof loop.opposingOwnerId === "string" ? loop.opposingOwnerId : "?";
      return {
        id:
          typeof loop.regionLoopId === "string"
            ? loop.regionLoopId
            : `owner-region-${index}`,
        summary:
          `${ownerId} vs ${opposingOwnerId} | ` +
          `area=${formatTraceValue(loop.absArea)} | ` +
          `conf=${formatTraceValue(loop.confidence)}`,
      };
    });
  }

  function getOwnerShellPreviewEntries(
    artifacts: TerritoryPipelineArtifacts | undefined,
  ): Array<{ id: string; summary: string }> {
    const ownerShells = ((
      artifacts?.loop as
        | { ownerShells?: Array<Record<string, unknown>> }
        | undefined
    )?.ownerShells ?? []) as Array<Record<string, unknown>>;
    return ownerShells.slice(0, 4).map((shell, index) => {
      const ownerId = typeof shell.ownerId === "string" ? shell.ownerId : "?";
      const holeCount = Array.isArray(shell.holeLoopIds)
        ? shell.holeLoopIds.length
        : 0;
      return {
        id:
          typeof shell.shellId === "string"
            ? shell.shellId
            : `owner-shell-${index}`,
        summary:
          `${ownerId} | ` +
          `area=${formatTraceValue(shell.absArea)} | ` +
          `holes=${formatTraceValue(holeCount)} | ` +
          `conf=${formatTraceValue(shell.confidence)}`,
      };
    });
  }

  function getOwnerHoldingTransitionSummary(
    artifacts: TerritoryPipelineArtifacts | undefined,
  ): string[] {
    const animation = (artifacts?.animation ?? undefined) as
      | Record<string, unknown>
      | undefined;
    if (!animation) return [];

    return [
      `transitions=${formatTraceValue(animation.ownerShellTransitionCount)}`,
      `matched=${formatTraceValue(animation.matchedOwnerShellCount)}`,
      `spawn=${formatTraceValue(animation.spawnedOwnerShellCount)}`,
      `vanish=${formatTraceValue(animation.vanishedOwnerShellCount)}`,
      `grow=${formatTraceValue(animation.grewOwnerShellCount)}`,
      `shrink=${formatTraceValue(animation.shrankOwnerShellCount)}`,
      `split=${formatTraceValue(animation.splitAnchoredSpawnCount)}`,
      `merge=${formatTraceValue(animation.mergeAnchoredVanishCount)}`,
      `fallback=${formatTraceValue(animation.ownerShellGeometryFallbackCount)}`,
      `holeTransitions=${formatTraceValue(animation.ownerShellHoleTransitionCount)}`,
    ];
  }

  function getOwnerHoldingTransitionPreviewEntries(
    artifacts: TerritoryPipelineArtifacts | undefined,
  ): Array<{ id: string; summary: string }> {
    const transitions = ((
      artifacts?.animation as
        | { ownerShellTransitions?: Array<Record<string, unknown>> }
        | undefined
    )?.ownerShellTransitions ?? []) as Array<Record<string, unknown>>;
    return transitions.slice(0, 6).map((transition, index) => {
      const ownerId =
        typeof transition.ownerId === "string" ? transition.ownerId : "?";
      const kind = typeof transition.kind === "string" ? transition.kind : "?";
      const anchorRelation =
        typeof transition.anchorRelation === "string"
          ? transition.anchorRelation
          : "none";
      const relationLabel =
        anchorRelation !== "none" ? `/${anchorRelation}` : "";
      return {
        id:
          typeof transition.transitionId === "string"
            ? transition.transitionId
            : `owner-shell-transition-${index}`,
        summary:
          `${ownerId} | ${kind}${relationLabel} | ` +
          `conf=${formatTraceValue(transition.confidence)} | ` +
          `contour=${formatTraceValue(transition.meanContourDistance)}/${formatTraceValue(transition.maxContourDistance)} | ` +
          `holes=${formatTraceValue(transition.previousHoleCount)}->${formatTraceValue(transition.currentHoleCount)}`,
      };
    });
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
  const BORDER_ENGINE_OPTIONS = [
    { id: "mesh", label: "Mesh (Clean)" },
    { id: "legacy_field", label: "Legacy Field (Reference)" },
    { id: "legacy_grid", label: "Legacy Grid (Reference)" },
  ] as const;
  const CANONICAL_FRONTIER_MODE_OPTIONS = [
    { id: "disabled", label: "Disabled" },
    { id: "diagnostic", label: "Diagnostic" },
    { id: "production", label: "Production" },
  ] as const;
  const MORPH_EASING_OPTIONS = [
    { id: "linear", label: "Linear" },
    { id: "smoothstep", label: "Smooth" },
    { id: "easeInOutQuad", label: "Quad" },
    { id: "easeInOutCubic", label: "Cubic" },
  ] as const;

  let activeBorderEngine = $derived(
    (panel.dfBorderEngine ?? GAME_CONFIG.DF_BORDER_ENGINE ?? "mesh") as
      | "mesh"
      | "legacy_field"
      | "legacy_grid",
  );
  let activeCanonicalFrontierRuntimeMode = $derived(
    (panel.dfCanonicalFrontierRuntimeMode ??
      GAME_CONFIG.DF_CANONICAL_FRONTIER_RUNTIME_MODE ??
      "production") as "disabled" | "diagnostic" | "production",
  );
  let canonicalFrontierDiagnosticShow = $derived(
    Boolean(
      panel.dfCanonicalFrontierDiagnosticShow ??
        GAME_CONFIG.DF_CANONICAL_FRONTIER_DIAGNOSTIC_SHOW ??
        false,
    ),
  );
  let isLegacyFieldEngine = $derived(activeBorderEngine === "legacy_field");
  let isLegacyGridEngine = $derived(activeBorderEngine === "legacy_grid");
  /* ── V3.1 Three-Concern Architecture ── */

  function getRenderModeOptions() {
    return resolveTerritoryRenderModeOptions(
      Boolean(panel.useRenderFamilies ?? GAME_CONFIG.USE_RENDER_FAMILIES),
      getRegisteredFamilyAdapterModeIds(),
    );
  }

  const TERRITORY_ARCHITECTURE_PATH_OPTIONS = [
    { id: "clean", label: "Clean Architecture" },
    { id: "legacy", label: "Legacy Architecture" },
  ] as const;

  const FILL_TRANSITION_OPTIONS = [
    { id: "off", label: "Off" },
    { id: "unified_topology", label: "Unified Topology" },
    { id: "active_front", label: "Active Front Interpolation" },
    { id: "frontier_morph", label: "Frontier Topology Morph (legacy)" },
    { id: "crossfade", label: "Alpha Crossfade Fill" },
  ] as const;

  const GEOMETRY_OPTIONS = [
    { id: "unified_vector", label: "Unified Vector Geometry" },
  ] as const;

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

  function selectTerritoryStyle(styleId: string) {
    debouncedConfigUpdate(
      "TERRITORY_RENDER_MODE",
      "territoryRenderMode",
      styleId,
    );
    setActiveRendererModule("all");
    // Reset diagnostic so it logs on next render frame
    (globalThis as any).__RENDER_MODE_LOGGED = false;
    // Sync legacy renderer booleans to panel; setSetting applies GAME_CONFIG via RESOLVED map.
    for (const [mode, panelKey] of Object.entries(STYLE_TO_BOOLEAN)) {
      updatePanel(panelKey, styleId !== "none" && mode === styleId);
    }
  }

  function selectFillTransition(transitionId: string) {
    updatePanel("territoryFillTransitionMode", transitionId);
  }

  function resolveActiveStyleId(): string {
    return (
      panel.territoryRenderMode ??
      GAME_CONFIG.TERRITORY_RENDER_MODE ??
      "territory_canonical"
    );
  }

  function resolveActiveFillTransitionId(): string {
    const raw =
      panel.territoryFillTransitionMode ??
      panel.territoryFillTransition ??
      GAME_CONFIG.TERRITORY_FILL_TRANSITION_MODE ??
      GAME_CONFIG.TERRITORY_FILL_MODE ??
      "frontier_morph";
    if (raw === "frontier") return "frontier_morph";
    if (raw === "none") return "off";
    return raw;
  }

  function resolveActiveTransitionModeId(): string {
    return coerceVsTransitionModeForRenderMode(
      resolveActiveStyleId(),
      (panel.vsTransitionMode ?? GAME_CONFIG.VS_TRANSITION_MODE ?? null) as
        | string
        | null,
    );
  }

  function showLegacyVsTransitionModeSelector(): boolean {
    const activeStyle = resolveActiveStyleId();
    return activeStyle === "power_voronoi" || activeStyle === "pvv2_dy4";
  }

  function rendererModules(): Array<
    TerritoryModuleDef<TerritoryRendererViewId>
  > {
    const modules: Array<
      TerritoryModuleDef<TerritoryRendererViewId>
    > = [{ id: "topology", label: "Topology", icon: "⬡" }];

    if (resolveActiveStyleId() === "metaball") {
      modules.unshift({ id: "metaball", label: "Metaball", icon: "◉" });
    }

    if (resolveActiveStyleId() === "perimeter_field") {
      modules.unshift({
        id: "perimeter-field",
        label: "Perimeter",
        icon: "◎",
      });
    }

    if (resolveActiveStyleId() === "metaball_grid") {
      modules.unshift({
        id: "metaball-grid",
        label: "Grid",
        icon: "▦",
      });
    }

    modules.push({
      id: "border-transition",
      label: "Borders",
      icon: "◇",
    });

    if (
      resolveActiveStyleId() === "territory_engine" ||
      resolveActiveStyleId() === "territory_canonical"
    ) {
      modules.push({ id: "surface", label: "Surface", icon: "✦" });
    }

    return modules;
  }

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

  /**
   * Handle geometry mode button clicks.
   * Since the architecture now has a single canonical mode, this simply
   * sets the config key and bumps the refresh token.
   */
  function selectGeometryMode(modeId: string) {
    debouncedConfigUpdate(
      "TERRITORY_GEOMETRY_MODE",
      "territoryGeometryMode",
      modeId,
    );
    // Bump refresh token on every click — even re-clicking same mode forces recompute
    (GAME_CONFIG as any).__GEOMETRY_REFRESH_TOKEN =
      ((GAME_CONFIG as any).__GEOMETRY_REFRESH_TOKEN ?? 0) + 1;
    // Single mode: always set engine method to match
    debouncedConfigUpdate(
      "TERRITORY_ENGINE_METHOD",
      "territoryEngineMethod",
      "new_frontiers_0319",
    );
  }
</script>

<CategoryThemeBar category="territory" onApply={() => syncFromConfig?.()} />

<div class="territory-section-shell territory-section-shell--system">
  <div class="territory-section-head">
    <h4 class="sub-heading territory-section-title">Territory System</h4>
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
    {#each TERRITORY_SYSTEM_MODULES as module}
      <button
        type="button"
        class="territory-module-chip"
        class:active={activeSystemModule === module.id}
        onclick={() => {
          setActiveSystemModule(
            activeSystemModule === module.id ? "all" : module.id,
          );
        }}>
        <span class="territory-module-chip__icon">{module.icon}</span>
        <span>{module.label}</span>
      </button>
    {/each}
  </div>
  <div class="territory-module-grid">
    {#if showSystemModule("geometry")}
      <div class="axis-card territory-module-card">
        <div class="territory-card__header">
          <h4 class="axis-card-title">Geometry</h4>
          <p class="territory-card__intro">
            Select the geometry pipeline that all maintained territory visuals
            route through.
          </p>
        </div>
        <div
          class="axis-row"
          style="--accent: #2dd4bf; --accent-bg: rgba(45,212,191,0.15)">
          <span class="axis-label">Geometry</span>
          <div class="axis-buttons">
            {#each GEOMETRY_OPTIONS as opt}
              <button
                class="axis-btn"
                class:active={(panel.territoryGeometryMode ??
                  GAME_CONFIG.TERRITORY_GEOMETRY_MODE ??
                  "unified_vector") === opt.id}
                onclick={() => selectGeometryMode(opt.id)}>{opt.label}</button>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    {#if showSystemModule("render-mode")}
      <div class="axis-card territory-module-card">
        <div class="territory-card__header">
          <h4 class="axis-card-title">Render Mode</h4>
          <p class="territory-card__intro">
            Choose the active renderer family and expose deprecated modes only
            when you intentionally need to compare against them.
          </p>
        </div>
        <div
          class="axis-row"
          style="--accent: #a78bfa; --accent-bg: rgba(167,139,250,0.15)">
          <span class="axis-label">Render mode</span>
          <div class="axis-buttons axis-buttons-wrap">
            {#key $familyRegistryEpoch}
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
            {/key}
          </div>
        </div>

        {#if isTerritoryRenderModeUiHidden(resolveActiveStyleId())}
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

        <div class="axis-row axis-row-compact">
          <label class="render-family-gate">
            <input
              type="checkbox"
              checked={panel.useRenderFamilies ??
                GAME_CONFIG.USE_RENDER_FAMILIES ??
                false}
              onchange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                debouncedConfigUpdate(
                  "USE_RENDER_FAMILIES",
                  "useRenderFamilies",
                  v,
                );
              }} />
            <span
              title="When on, only modes with a registered RenderFamily adapter stay selectable (exempt: Off, Canonical). Metaball registers in-game."
              >USE_RENDER_FAMILIES (family gate)</span>
          </label>
        </div>

        {#if showLegacyVsTransitionModeSelector()}
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
                Legacy VS transition mode for the active Voronoi renderer.
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
            helperText="Timing and influence tuning for the active legacy Voronoi transition mode."
          />
        {/if}
      </div>
    {/if}

    {#if showSystemModule("architecture")}
      <div class="axis-card territory-module-card">
        <div class="territory-card__header">
          <h4 class="axis-card-title">Architecture</h4>
          <p class="territory-card__intro">
            Control whether canonical rendering follows the clean route or the
            legacy comparison path.
          </p>
        </div>
        <div
          class="axis-row"
          style="--accent: #60a5fa; --accent-bg: rgba(96,165,250,0.15)">
          <span class="axis-label">Architecture</span>
          <div class="axis-buttons">
            {#each TERRITORY_ARCHITECTURE_PATH_OPTIONS as opt}
              <button
                class="axis-btn"
                class:active={(panel.territoryArchitecturePath ??
                  GAME_CONFIG.TERRITORY_ARCHITECTURE_PATH ??
                  "clean") === opt.id}
                onclick={() => updatePanel("territoryArchitecturePath", opt.id)}
                >{opt.label}</button>
            {/each}
          </div>
        </div>
        <div class="axis-note">
          Architecture toggle applies when Style is "Canonical Layered Runtime".
        </div>
        {#if resolveActiveStyleId() !== "territory_canonical" && resolveActiveStyleId() !== "none"}
          <div class="axis-note">
            Non-canonical render mode bypasses clean-layer routing for that path.
          </div>
        {/if}
      </div>
    {/if}

    {#if showSystemModule("fill-transition")}
      <div class="axis-card territory-module-card">
        <div class="territory-card__header">
          <h4 class="axis-card-title">Fill Transition</h4>
          <p class="territory-card__intro">
            Decide how ownership fills interpolate through conquest and front
            changes.
          </p>
        </div>
        <div
          class="axis-row"
          style="--accent: #fbbf24; --accent-bg: rgba(251,191,36,0.15)">
          <span class="axis-label">Fill Transition</span>
          <div class="axis-buttons">
            {#each FILL_TRANSITION_OPTIONS as opt}
              <button
                class="axis-btn"
                class:active={resolveActiveFillTransitionId() === opt.id}
                onclick={() => selectFillTransition(opt.id)}>{opt.label}</button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<div class="territory-section-shell territory-section-shell--renderer">
  <div class="territory-section-head">
    <h4 class="sub-heading territory-section-title">
      Rendering &amp; Topology
    </h4>
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
  </div>
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
        <span class="territory-module-chip__icon">{module.icon}</span>
        <span>{module.label}</span>
      </button>
    {/each}
  </div>
  <div class="territory-module-grid">

{#if showRendererModule("metaball") && resolveActiveStyleId() === "metaball"}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
      <h4 class="axis-card-title">Metaball (CPU grid)</h4>
      <p class="territory-card__intro">
        Tune field cost, influence shape, and border behavior for the active
        metaball renderer.
      </p>
    </div>
    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Transition Mode</span>
        <span class="val">{resolveActiveTransitionModeId()}</span>
      </div>
      <select
        class="mode-select"
        value={resolveActiveTransitionModeId()}
        onchange={(event) => {
          const value = (event.target as HTMLSelectElement).value;
          debouncedConfigUpdate("VS_TRANSITION_MODE", "vsTransitionMode", value);
        }}>
        {#each getTransitionModeOptionsForRenderMode("metaball") as option}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
    </div>
    <div
      class="row-bottom"
      style="font-size:11px;opacity:0.75;margin-bottom:10px;">
      Larger <strong>Cell size</strong> → fewer grid cells, better FPS (typical
      8–16). <strong>Territory Invariants</strong> below:
      <strong>CX Corridors</strong>
      adds lane influence for Metaball; <strong>DX Disconnect</strong> inserts
      paired enemy virtuals around the Euclidean midpoint of disconnected same-owner
      stars.
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
      activeRenderMode="metaball"
      helperText="Conquest transition timing and influence tuning for the active Metaball mode."
    />
    <div
      class="row-bottom"
      style="font-size:11px;opacity:0.75;margin-top:2px;margin-bottom:2px;">
      Metaball now reads the shared render-family geometry source. Use these controls to choose the underlying geometry path and tune its MSR, CX lane pairs, and DX behavior.
    </div>
    <TerritoryGeometrySourceTuning {panel} {updatePanel} />
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

{#if showRendererModule("topology")}
<div class="territory-module-card territory-module-stack">
<h5 class="territory-inline-heading">Ownership &amp; Topology</h5>
<!-- ── Territory Invariants (MSR / CX / DX) ── -->
<div class="engine-control-group">
  <div class="territory-card__header">
    <h4 class="axis-card-title">Territory Invariants</h4>
    <p class="territory-card__intro">
      Set the minimum owned footprint and the connection rules that determine
      how fronts stay linked or deliberately split apart.
    </p>
  </div>

  <h5 class="territory-inline-heading">Minimum Footprint</h5>

  <!-- MSR — Minimum Star Region -->
  <div
    class="var-row"
    title="Metaball: each cell inside this radius of a real star is assigned to that star’s cluster (nearest star wins), so every owned star keeps a disc of territory. Voronoi/engine paths use the same value for geometric margins.">
    <div class="row-top">
      <span class="var-name">MSR (Star Margin)</span><span class="val"
        >{panel.starMargin ??
          GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ??
          45}px</span>
    </div>
    <input
      type="range"
      min="0"
      max="500"
      step="5"
      value={panel.starMargin ?? GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("MODIFIED_VORONOI_STAR_MARGIN", "starMargin", v);
      }} />
  </div>

  <h5 class="territory-inline-heading">Corridors</h5>

  <!-- CX — Corridor Connection -->
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">CX Corridors</span>
      <label class="lock-toggle">
        <input
          type="checkbox"
          checked={panel.corridorEnabled ??
            GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
            true}
          onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            debouncedConfigUpdate(
              "MODIFIED_VORONOI_CORRIDOR_ENABLED",
              "corridorEnabled",
              v,
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
      <span class="var-name">Contest midpoint pair</span>
      <label class="lock-toggle">
        <input
          type="checkbox"
          checked={panel.cxContestMidpointVstars ??
            GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ??
            true}
          onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            debouncedConfigUpdate(
              "TERRITORY_CX_CONTEST_MIDPOINT_VSTARS",
              "cxContestMidpointVstars",
              v,
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
    title={!cxOn ? "Turn CX Corridors on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">CX Count</span><span class="val"
        >{(panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0) === 0
          ? "Auto"
          : (panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT)}</span>
    </div>
    <input
      type="range"
      min="0"
      max="20"
      step="1"
      disabled={!cxOn}
      value={panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("TERRITORY_CX_COUNT", "cxCount", v);
      }} />
  </div>
  <div
    class="var-row indent"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn CX Corridors on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">CX Weight</span><span class="val"
        >{(panel.cxWeight ?? GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5).toFixed(
          2,
        )}</span>
    </div>
    <input
      type="range"
      min="0"
      max="2"
      step="0.05"
      disabled={!cxOn}
      value={panel.cxWeight ?? GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("TERRITORY_CX_WEIGHT", "cxWeight", v);
      }} />
  </div>
  <div
    class="var-row indent"
    class:disabled={!cxOn}
    title={!cxOn ? "Turn CX Corridors on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">CX Spacing</span><span class="val"
        >{panel.corridorSpacing ??
          GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ??
          60}px</span>
    </div>
    <input
      type="range"
      min="10"
      max="200"
      step="5"
      disabled={!cxOn}
      value={panel.corridorSpacing ??
        GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ??
        60}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate(
          "MODIFIED_VORONOI_CORRIDOR_SPACING",
          "corridorSpacing",
          v,
        );
      }} />
  </div>

  <h5 class="territory-inline-heading">Disconnects</h5>

  <!-- DX — Disconnection Zones -->
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">DX Disconnect</span>
      <label class="lock-toggle">
        <input
          type="checkbox"
          checked={panel.disconnectEnabled ??
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
            false}
          onchange={(e) => {
            const v = (e.target as HTMLInputElement).checked;
            debouncedConfigUpdate(
              "MODIFIED_VORONOI_DISCONNECT_ENABLED",
              "disconnectEnabled",
              v,
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
    title={!dxOn ? "Turn DX Disconnect on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">DX Weight</span><span class="val"
        >{(panel.dxWeight ?? GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3).toFixed(
          2,
        )}</span>
    </div>
    <input
      type="range"
      min="0"
      max="2"
      step="0.05"
      disabled={!dxOn}
      value={panel.dxWeight ?? GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("TERRITORY_DX_WEIGHT", "dxWeight", v);
      }} />
  </div>
  <div
    class="var-row indent"
    class:disabled={!dxOn}
    title={!dxOn ? "Turn DX Disconnect on to edit these values." : ""}>
    <div class="row-top">
      <span class="var-name">DX Distance</span><span class="val"
        >{panel.disconnectDistance ??
          GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ??
          400}px</span>
    </div>
    <input
      type="range"
      min="50"
      max="1000"
      step="25"
      disabled={!dxOn}
      value={panel.disconnectDistance ??
        GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ??
        400}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate(
          "MODIFIED_VORONOI_DISCONNECT_DISTANCE",
          "disconnectDistance",
          v,
        );
      }} />
  </div>
</div>
</div>
{/if}

<!-- Border Transition Tuning -->
{#if showRendererModule("border-transition")}
<div class="engine-control-group territory-module-card">
  <div class="territory-card__header">
    <h4 class="axis-card-title">Border Transition</h4>
    <p class="territory-card__intro">
      Control how frontiers resample, ease, and overshoot while borders react
      to ownership changes.
    </p>
  </div>
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Transition Easing</span>
    </div>
    <select
      class="mode-select"
      value={panel.borderTransEasing ??
        GAME_CONFIG.BORDER_TRANS_EASING ??
        "linear"}
      onchange={(e) => {
        debouncedConfigUpdate(
          "BORDER_TRANS_EASING",
          "borderTransEasing",
          (e.target as HTMLSelectElement).value,
        );
      }}>
      <option value="linear">1. Linear (constant speed)</option>
      <option value="cubic">2. Cubic (smooth, no overshoot)</option>
      <option value="ease-out">3. Ease-out (decelerate)</option>
      <option value="ease-out-quad">4. Ease-out Quad (lighter)</option>
      <option value="sine">5. Sine (gentle S-curve)</option>
      <option value="back">6. Back (overshoot)</option>
      <option value="elastic">7. Elastic (bouncy)</option>
    </select>
  </div>
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Resample Points</span><span class="val"
        >{panel.borderTransResampleN ??
          GAME_CONFIG.BORDER_TRANS_RESAMPLE_N ??
          32}</span>
    </div>
    <input
      type="range"
      min="8"
      max="64"
      step="4"
      value={panel.borderTransResampleN ??
        GAME_CONFIG.BORDER_TRANS_RESAMPLE_N ??
        32}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate(
          "BORDER_TRANS_RESAMPLE_N",
          "borderTransResampleN",
          v,
        );
      }} />
  </div>
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Frontier Resolution</span><span class="val"
        >{panel.frontierResolution ??
          GAME_CONFIG.FRONTIER_RESOLUTION ??
          5}px</span>
    </div>
    <input
      type="range"
      min="1"
      max="20"
      step="1"
      value={panel.frontierResolution ?? GAME_CONFIG.FRONTIER_RESOLUTION ?? 5}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate("FRONTIER_RESOLUTION", "frontierResolution", v);
      }} />
  </div>
  <div class="var-row">
    <div class="row-top">
      <span class="var-name">Back Overshoot</span><span class="val"
        >{(
          panel.borderTransOvershoot ??
          GAME_CONFIG.BORDER_TRANS_OVERSHOOT ??
          0
        ).toFixed(2)}</span>
    </div>
    <input
      type="range"
      min="0"
      max="5"
      step="0.1"
      value={panel.borderTransOvershoot ??
        GAME_CONFIG.BORDER_TRANS_OVERSHOOT ??
        0}
      oninput={(e) => {
        const v = +(e.target as HTMLInputElement).value;
        debouncedConfigUpdate(
          "BORDER_TRANS_OVERSHOOT",
          "borderTransOvershoot",
          v,
        );
      }} />
  </div>
</div>
{/if}

<!-- Active Layers toggles removed — V3 architecture uses Render Mode dropdown above -->

{#if showRendererModule("surface") &&
  (resolveActiveStyleId() === "territory_engine" ||
    resolveActiveStyleId() === "territory_canonical")}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
      <h4 class="axis-card-title">
        {resolveActiveStyleId() === "territory_engine"
          ? "Canonical / Engine Surface"
          : "Canonical Surface"}
      </h4>
      <p class="territory-card__intro">
        Refine fill, border, and diagnostic behavior for the canonical
        territory surface.
      </p>
    </div>

    {#if resolveActiveStyleId() === "territory_engine"}
      <h5 class="territory-inline-heading">Legacy Engine Diagnostics</h5>
      <div
        class="row-bottom"
        style="font-size: 10px; opacity: 0.6; padding: 2px 4px;">
        Geometry engine computes territory boundaries from game state. All visual
        styles consume its output.
      </div>

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
    {#if resolveActiveStyleId() === "territory_engine"}
      <h5 class="territory-inline-heading">Trace Inspector</h5>

    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Trace Mode</span>
        <label class="toggle-switch">
          <input
            type="checkbox"
            checked={panel.territoryEngineTraceMode ??
              GAME_CONFIG.TERRITORY_ENGINE_TRACE_MODE}
            onchange={(e) => {
              const v = (e.target as HTMLInputElement).checked;
              updatePanel("territoryEngineTraceMode", v);
            }} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
    <div class="var-row">
      <div class="row-top">
        <span class="var-name">Step Mode</span>
        <label class="toggle-switch">
          <input
            type="checkbox"
            checked={panel.territoryEngineStepMode ??
              GAME_CONFIG.TERRITORY_ENGINE_STEP_MODE}
            onchange={(e) => {
              const v = (e.target as HTMLInputElement).checked;
              updatePanel("territoryEngineStepMode", v);
            }} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
    {#if panel.territoryEngineStepMode ?? GAME_CONFIG.TERRITORY_ENGINE_STEP_MODE}
      <div class="var-row compact">
        <div class="row-top">
          <span class="var-name">Advance Stage</span>
          <span class="val"
            >{panel.territoryEngineStepAdvanceToken ??
              GAME_CONFIG.TERRITORY_ENGINE_STEP_ADVANCE_TOKEN}</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button
            class="mini-btn"
            onclick={() => {
              const nextToken =
                (panel.territoryEngineStepAdvanceToken ??
                  GAME_CONFIG.TERRITORY_ENGINE_STEP_ADVANCE_TOKEN) + 1;
              updatePanel("territoryEngineStepAdvanceToken", nextToken);
            }}>Advance</button>
          <button
            class="mini-btn"
            onclick={() => {
              updatePanel("territoryEngineStepAdvanceToken", 0);
            }}>Reset</button>
        </div>
      </div>
      {/if}
      <div class="trace-panel">
      <div class="row-top">
        <span class="var-name">Trace Inspector</span>
        {#if $territoryTraceRun}
          <span class="val">run {$territoryTraceRun.runId}</span>
        {:else}
          <span class="val">no trace</span>
        {/if}
      </div>
      {#if $territoryTraceRun}
        <div class="trace-chip-row">
          <span class="trace-chip"
            >steps {$territoryTraceRun.steps
              .length}/{TERRITORY_PIPELINE_STAGE_ORDER.length}</span>
          <span class="trace-chip"
            >next {getNextTraceStageLabel(
              $territoryTraceRun.steps.length,
            )}</span>
          <span class="trace-chip"
            >mode {$territoryTraceRun.selection.mode}</span>
          <span class="trace-chip"
            >static {$territoryTraceRun.selection.staticMethodId}</span>
          <span class="trace-chip">{$territoryTraceRun.totalDurationMs}ms</span>
        </div>

        <div class="trace-section">
          <div class="trace-section-title">Meta</div>
          <div class="trace-summary">
            {summarizeTraceRecord($territoryTraceRun.meta, 8).join(" | ")}
          </div>
        </div>

        <div class="trace-section">
          <div class="trace-section-title">Owner Region Loops</div>
          {#each getOwnerRegionLoopPreviewEntries($territoryTraceRun.artifacts) as entry}
            <div class="trace-detail-line">{entry.summary}</div>
          {/each}
        </div>

        <div class="trace-section">
          <div class="trace-section-title">Owner Shells</div>
          {#each getOwnerShellPreviewEntries($territoryTraceRun.artifacts) as entry}
            <div class="trace-detail-line">{entry.summary}</div>
          {/each}
        </div>

        <div class="trace-section">
          <div class="trace-section-title">Holding Transitions</div>
          <div class="trace-summary">
            {getOwnerHoldingTransitionSummary(
              $territoryTraceRun.artifacts,
            ).join(" | ")}
          </div>
          {#each getOwnerHoldingTransitionPreviewEntries($territoryTraceRun.artifacts) as entry}
            <div class="trace-detail-line">{entry.summary}</div>
          {/each}
        </div>
        <div class="trace-section">
          <div class="trace-section-title">Artifacts</div>
          {#each getTraceArtifactEntries($territoryTraceRun.artifacts) as entry}
            <div class="trace-entry">
              <div class="trace-entry-head">
                <span class="trace-badge">{entry.stageId}</span>
                <span class="val"
                  >{Object.keys(entry.artifact).length} keys</span>
              </div>
              <div class="trace-summary">
                {summarizeTraceRecord(entry.artifact, 8).join(" | ")}
              </div>
            </div>
          {/each}
        </div>

        <div class="trace-section">
          <div class="trace-section-title">Steps</div>
          {#each $territoryTraceRun.steps as step}
            <div class="trace-entry">
              <div class="trace-entry-head">
                <span class="trace-badge">{step.stageId}</span>
                <span class="val">{step.durationMs}ms</span>
              </div>
              <div class="trace-summary">
                {summarizeTraceRecord(step.summary, 8).join(" | ")}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="trace-empty">
          Enable Trace Mode or Step Mode to capture a territory-engine run here.
        </div>
      {/if}
      </div>
    {/if}
  </div>
{/if}

{#if showRendererModule("perimeter-field") && resolveActiveStyleId() === "perimeter_field"}
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
    <PerimeterFieldTuning {panel} {updatePanel} showDiagnosticsSection={false} />
    <TerritorySurfaceStyleTuning
      {panel}
      onUpdate={debouncedConfigUpdate}
      sectionHeading="Style"
      intro="Shared surface styling for perimeter-field output. These controls affect the displayed fill and border only; they do not change the ownership geometry source."
      fillHelp="Perimeter Field uses the shared territory surface controls for fill color energy. Hue stays player-owned; adjust saturation, lightness, alpha, or disable fill entirely."
      borderHelp="Perimeter Field borders are rendered through the shared territory border surface. Use this for width, saturation, lightness, alpha, or disable borders entirely." />
  </div>
{/if}

{#if showRendererModule("metaball-grid") && resolveActiveStyleId() === "metaball_grid"}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
      <h4 class="axis-card-title">Metaball Grid (Experimental)</h4>
      <p class="territory-card__intro">
        Ownership-geometry underlayer plus a world-anchored grid of
        metaball cells. Conquest transitions flip cells cell-by-cell in a
        wave seeded from the winner's footprint.
      </p>
    </div>
    <div
      class="row-bottom"
      style="font-size:11px;opacity:0.75;margin-bottom:10px;">
      Two-layer family: ownership geometry stays truth; the visible grid
      layer is re-composited per frame as the wave crosses each cell's
      flipTime.
    </div>
    <MetaballGridTuning {panel} {updatePanel} />
    <div
      class="row-bottom"
      style="font-size:11px;opacity:0.75;margin:10px 0 2px;">
      <strong>Source geometry constraints</strong> — CX corridor virtuals along lanes, CP contested-lane midpoint pairs, DX disconnect virtuals between same-owner components, and MSR (Minimum Star Range, power-diagram site weight). These shape the underlying territoryRegions that metaball-grid classifies cells against.
    </div>
    <TerritoryGeometrySourceTuning {panel} {updatePanel} />
    <TerritorySurfaceStyleTuning
      {panel}
      onUpdate={debouncedConfigUpdate}
      sectionHeading="Style"
      intro="Shared surface styling for metaball-grid output. These controls affect the visible fill and border layer while the underlying ownership geometry remains authoritative."
      fillHelp="Metaball Grid uses the shared territory surface controls for fill color energy. Hue stays player-owned; adjust saturation, lightness, alpha, or disable fill entirely."
      borderHelp="Metaball Grid borders are rendered through the shared territory border surface. Use this for width, saturation, lightness, alpha, or disable borders entirely." />
  </div>
{/if}

</div>
</div>

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
    width: 14px;
    font-size: 11px;
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
  .territory-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0 0 14px;
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
  .axis-row-compact {
    padding: 2px 0 6px;
  }
  .render-family-gate {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    user-select: none;
  }
  .render-family-gate input {
    cursor: pointer;
  }
  /* Legacy compat — keep old selectors but not used by card */
  .triple-select-row {
    display: flex;
    gap: 6px;
    padding: 2px 4px;
  }
  .triple-select-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .triple-select-col .mode-select {
    width: 100%;
  }
  .triple-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #888;
  }
  .mode-btn {
    flex: 1;
    padding: 3px 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .mode-btn:hover {
    border-color: rgba(100, 200, 255, 0.3);
    color: #93c5fd;
  }
  .mode-btn.active {
    background: rgba(100, 200, 255, 0.15);
    border-color: rgba(100, 200, 255, 0.4);
    color: #93c5fd;
    font-weight: 600;
  }
  .grayed {
    color: #888;
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
  .mini-btn.reference-only,
  .mini-btn:disabled {
    cursor: not-allowed;
    opacity: 0.42;
    box-shadow: none;
  }
  .mini-btn.reference-only:hover,
  .mini-btn:disabled:hover {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.15);
  }
  .engine-control-group.reference-only {
    opacity: 0.78;
  }
  .engine-route-hint {
    font-size: 10px;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.58);
    padding: 1px 0 4px;
  }
  .trace-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 8px 4px 0;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
  }
  .trace-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .trace-chip {
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(74, 222, 128, 0.12);
    border: 1px solid rgba(74, 222, 128, 0.2);
    color: #9ae6b4;
    font-size: 10px;
    font-family: monospace;
  }
  .trace-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .trace-section-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #8fb7ff;
  }
  .trace-entry {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.04);
  }
  .trace-entry-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .trace-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(147, 197, 253, 0.12);
    color: #bfdbfe;
    font-size: 10px;
    font-family: monospace;
  }
  .trace-summary {
    font-size: 10px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.72);
    font-family: monospace;
    word-break: break-word;
  }
  .trace-detail-line {
    font-size: 10px;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.68);
    font-family: monospace;
  }
  .trace-empty {
    font-size: 10px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.58);
  }
</style>
