<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { mapTranspose } from "$lib/stores/mapTranspose.svelte";
    import { territoryRenderStatus } from "$lib/stores/territoryRenderStatusStore";
    import { territoryTuningStatus } from "$lib/stores/territoryTuningStatusStore";
    import { metaballGridStats } from "$lib/territory/families/metaballGrid/metaballGridStats";
    import { gridGradientStats } from "$lib/territory/families/gridGradient/gridGradientStats";
    import PerimeterFieldDiagnosticsPanel from "$lib/components/ui/PerimeterFieldDiagnosticsPanel.svelte";
    import { overlayConfig } from "$lib/territory/devtools/overlayConfig";
    import {
        authoredMeasurementsUi,
    } from "$lib/territory/devtools/authoredMeasurementsUi";
    import {
        getRulerMeasurement,
        rulerTool,
    } from "$lib/territory/devtools/rulerTool";
    import TerritoryEngineTraceDiagnostics from "./TerritoryEngineTraceDiagnostics.svelte";
    import SettingsDumpDiagnosticsControls from "./SettingsDumpDiagnosticsControls.svelte";
    import {
        transitionSnapshotRecorder,
        transitionSnapshotRecorderStore,
        type TransitionDebugBundle,
    } from "$lib/territory/devtools/TransitionSnapshotRecorder";
    import {
        downloadAllBundles,
        downloadAllDiagnosticPackages,
        downloadBundle,
        downloadDiagnosticPackage,
    } from "$lib/territory/devtools/TransitionBundleSerializer";
    import { getTerritoryRenderModeLabel } from "$lib/territory/ui/territoryRenderModeCatalog";
    import {
        PaxHudButton,
        PaxSettingsRangeRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();

    const hasAuthoredMeasurements = $derived(
        activeGameStore.mapDiagnostics.measurements.length > 0,
    );
    const activeRenderMode = $derived(
        (panel.territoryRenderMode ??
            GAME_CONFIG.TERRITORY_RENDER_MODE ??
            "territory_runtime") as string,
    );
    const liveRenderMode = $derived(
        ($territoryRenderStatus.territoryMode &&
        $territoryRenderStatus.territoryMode !== "none"
            ? $territoryRenderStatus.territoryMode
            : activeRenderMode) as string,
    );
    const showPerimeterFieldDiagnostics = $derived(
        liveRenderMode === "perimeter_field",
    );
    const showMetaballGridDiagnostics = $derived(
        liveRenderMode === "metaball_grid" ||
            liveRenderMode === "metaball_grid_phase_edges" ||
            liveRenderMode === "metaball_grid_ember_lattice" ||
            liveRenderMode === "metaball_grid_phase_field",
    );
    const showGridGradientDiagnostics = $derived(
        liveRenderMode === "grid_gradient",
    );
    const showTerritoryEngineTraceDiagnostics = $derived(
        liveRenderMode === "territory_engine"
        || activeRenderMode === "territory_engine",
    );
    const showUnderlyingGeometrySupported = $derived(
        liveRenderMode === "perimeter_field" ||
            liveRenderMode === "metaball" ||
            liveRenderMode === "metaball_grid" ||
            liveRenderMode === "metaball_grid_phase_edges" ||
            liveRenderMode === "metaball_grid_ember_lattice" ||
            liveRenderMode === "metaball_grid_phase_field" ||
            liveRenderMode === "grid_gradient",
    );
    const bundleList = $derived(
        [...$transitionSnapshotRecorderStore.bundles].reverse(),
    );

    let overlayEnabled = $state(overlayConfig.enabled);
    let overlayShowVertices = $state(overlayConfig.showAllVertices);
    let overlayShowActiveFront = $state(overlayConfig.showActiveFront);
    let overlayPolylineSamples = $state(overlayConfig.showPolylineSamples);
    let downloading = $state<string | null>(null);

    function syncOverlayState(): void {
        overlayEnabled = overlayConfig.enabled;
        overlayShowVertices = overlayConfig.showAllVertices;
        overlayShowActiveFront = overlayConfig.showActiveFront;
        overlayPolylineSamples = overlayConfig.showPolylineSamples;
    }

    function toggleOverlay(): void {
        overlayConfig.enabled = !overlayConfig.enabled;
        syncOverlayState();
    }

    function toggleOverlayVertices(): void {
        overlayConfig.showAllVertices = !overlayConfig.showAllVertices;
        syncOverlayState();
    }

    function toggleOverlayActiveFront(): void {
        overlayConfig.showActiveFront = !overlayConfig.showActiveFront;
        syncOverlayState();
    }

    function togglePolylineSamples(): void {
        overlayConfig.showPolylineSamples = !overlayConfig.showPolylineSamples;
        syncOverlayState();
    }

    function setUnderlyingGeometry(value: boolean): void {
        GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY = value;
        updatePanel("perimeterFieldDebugShowGeometry", value);
        bumpTerritoryVisualConfig();
    }

    function toggleAuthoredMeasurements(): void {
        if (!hasAuthoredMeasurements) return;
        authoredMeasurementsUi.toggle();
    }

    function toggleRuler(): void {
        rulerTool.setEnabled(!$rulerTool.enabled);
    }

    function clearRuler(): void {
        rulerTool.clear();
    }

    function setRulerColor(
        key: "h" | "s" | "l" | "a",
        value: number,
    ): void {
        rulerTool.setColor(key, value);
    }

    function toggleRecorder(): void {
        transitionSnapshotRecorder.setEnabled(
            !$transitionSnapshotRecorderStore.enabled,
        );
    }

    function clearBundles(): void {
        transitionSnapshotRecorder.clear();
    }

    async function downloadOne(bundle: TransitionDebugBundle): Promise<void> {
        downloading = bundle.id;
        try {
            await downloadBundle(bundle, bundle.starPositions);
        } finally {
            downloading = null;
        }
    }

    async function packageOne(bundle: TransitionDebugBundle): Promise<void> {
        downloading = `pkg:${bundle.id}`;
        try {
            await downloadDiagnosticPackage(bundle);
        } finally {
            downloading = null;
        }
    }

    async function downloadAll(): Promise<void> {
        downloading = "__all__";
        try {
            const bundles = [...$transitionSnapshotRecorderStore.bundles];
            await downloadAllBundles(
                bundles,
                bundles[0]?.starPositions ?? new Map(),
            );
        } finally {
            downloading = null;
        }
    }

    async function packageAll(): Promise<void> {
        downloading = "__pkg_all__";
        try {
            await downloadAllDiagnosticPackages(
                $transitionSnapshotRecorderStore.bundles,
            );
        } finally {
            downloading = null;
        }
    }

    function formatPoint(
        point: {
            x: number;
            y: number;
            snapKind: string;
            starId?: string;
            laneLabel?: string;
        } | null,
    ): string {
        if (!point) return "unset";
        const base = `${point.x.toFixed(1)}, ${point.y.toFixed(1)} (${point.snapKind})`;
        if (point.starId) return `${base} • ${point.starId}`;
        if (point.laneLabel) return `${base} • ${point.laneLabel}`;
        return base;
    }

    function conquestLabel(bundle: TransitionDebugBundle): string {
        const event = bundle.conquestEvents[0];
        if (!event) return "?";
        return `★${event.starId} ${event.previousOwner}→${event.newOwner}`;
    }

    function timeLabel(bundle: TransitionDebugBundle): string {
        return bundle.timestamp.slice(11, 19);
    }

    function frameLabel(bundle: TransitionDebugBundle): string {
        if (!bundle.transitionFrames) return "no frames";
        return `${bundle.transitionFrames.length} frame${bundle.transitionFrames.length === 1 ? "" : "s"}`;
    }

    function formatBorderSummary(): string {
        const mode = $metaballGridStats.borderMode;
        const blend = $metaballGridStats.borderBlend ? "blend on" : "blend off";
        return `${mode} · ${blend} · Chaikin ${$metaballGridStats.borderChaikinPasses}`;
    }

    function formatDxSummary(): string {
        return `${$metaballGridStats.disconnectEnabled ? "on" : "off"} · ${$metaballGridStats.disconnectDistance}px · w ${$metaballGridStats.dxWeight.toFixed(2)}`;
    }

    function formatTransitionSummary(): string {
        return `${$metaballGridStats.activeWindowCount} active / ${$metaballGridStats.transitionTotalCount} total`;
    }

    function formatMs(value: number | null, digits = 0): string {
        return value === null ? "n/a" : `${value.toFixed(digits)} ms`;
    }

    function formatProgress(value: number | null): string {
        return value === null ? "n/a" : value.toFixed(3);
    }

    function formatFastPathSummary(): string {
        return $metaballGridStats.fastPathUsed
            ? "retained active-frontier"
            : `fallback / ${$metaballGridStats.fallbackReason ?? "unknown"}`;
    }

    function formatTimingConfigSummary(): string {
        const binding = $metaballGridStats.bindTransitionToTick
            ? "bound to tick"
            : "slider";
        return `${formatMs($metaballGridStats.configuredTransitionMs, 0)} / ${binding} / tick ${formatMs($metaballGridStats.effectiveTickMs, 0)}`;
    }

    function formatHandlerSummary(): string {
        return `${formatMs($metaballGridStats.latestEntryDurationMs, 0)} / start ${$metaballGridStats.latestEntryStartedAtMs === null ? "n/a" : $metaballGridStats.latestEntryStartedAtMs.toFixed(1)}`;
    }

    function formatLifecycleSummary(): string {
        return `${formatMs($metaballGridStats.activeTransitionDurationMs, 0)} / start ${$metaballGridStats.activeTransitionStartedAtMs === null ? "n/a" : $metaballGridStats.activeTransitionStartedAtMs.toFixed(1)}`;
    }

    function formatProgressSummary(): string {
        return `${formatProgress($metaballGridStats.schedulerRawProgress)} sched / ${formatProgress($metaballGridStats.rawProgress)} raw / ${formatProgress($metaballGridStats.easedProgress)} eased`;
    }

    function formatLocalClockSummary(): string {
        return `${$metaballGridStats.visualTransitionActive ? "local active" : "scheduler-owned"} / ${formatMs($metaballGridStats.localVisualTransitionDurationMs, 0)}`;
    }

    function formatFrontierLifetimeSummary(): string {
        return `${formatProgress($metaballGridStats.frontierVisibleStartProgress)} -> ${formatProgress($metaballGridStats.frontierVisibleEndProgress)} / span ${formatProgress($metaballGridStats.frontierVisibleLifetimeProgress)} / ${formatMs($metaballGridStats.frontierVisibleLifetimeMs, 0)}`;
    }

    function formatFlipPercentiles(): string {
        return `min ${formatProgress($metaballGridStats.flipTimeMin)} / p25 ${formatProgress($metaballGridStats.flipTimeP25)} / p50 ${formatProgress($metaballGridStats.flipTimeP50)} / p75 ${formatProgress($metaballGridStats.flipTimeP75)} / p95 ${formatProgress($metaballGridStats.flipTimeP95)} / max ${formatProgress($metaballGridStats.flipTimeMax)}`;
    }

    function formatFlipBins(): string {
        const bins = $metaballGridStats.flipTimeBins;
        return `0-0.1 ${bins["0-0.1"]} / 0.1-0.25 ${bins["0.1-0.25"]} / 0.25-0.5 ${bins["0.25-0.5"]} / 0.5-0.75 ${bins["0.5-0.75"]} / 0.75-1 ${bins["0.75-1"]}`;
    }

    function formatEmberLatticeSemanticsNote(): string {
        return "Ember Lattice is the dedicated session-overlay renderer inside the metaball family. Idle frames can still look close to other grid modes when shared settings align; the meaningful difference is that consecutive conquest sessions preserve their own PRE/NEXT captures, contour-derived blended seams, and frontier timing instead of collapsing into one retained frontier.";
    }

    function formatPhaseFieldSemanticsNote(): string {
        return "Phase Field runs as its own metaball-grid family variant. It keeps the shared deterministic cell classifier and frontier timing, but replaces metaball presentation with conquest-local PRE/POST territory compositing plus a highlighted frontier pass.";
    }

</script>

<section data-subsection-id="overlays">
    <h4 class="sub-heading">Overlays</h4>
    <PaxSettingsToggleRow
        label="Show Hex Grid"
        checked={panel.showHexGrid}
        meta={panel.showHexGrid ? "On" : "Off"}
        settingConfigKey="SHOW_HEX_GRID"
        onChange={(value) => {
            GAME_CONFIG.SHOW_HEX_GRID = value;
            updatePanel("showHexGrid", value);
        }}
    />
    <PaxSettingsToggleRow
        label="Star Inspector"
        checked={typeof localStorage !== "undefined" &&
            localStorage.getItem("pax-show-star-info") === "true"}
        description="Click a star to inspect."
        meta={typeof localStorage !== "undefined" &&
            localStorage.getItem("pax-show-star-info") === "true"
            ? "On"
            : "Off"}
        settingConfigKey="local.ui.starInspectorVisible"
        onChange={(value) => {
            localStorage.setItem("pax-show-star-info", value ? "true" : "false");
            window.dispatchEvent(
                new CustomEvent("pax-star-info-toggle", {
                    detail: value,
                }),
            );
        }}
    />
    <PaxSettingsToggleRow
        label="Rotate Map (Transpose)"
        checked={mapTranspose.active}
        description="Flip X/Y display axes without mutating star data."
        meta={mapTranspose.active ? "On" : "Off"}
        settingConfigKey="local.mapTranspose.active"
        onChange={(value) => {
            mapTranspose.active = value;
            window.dispatchEvent(new Event("resize"));
        }}
    />
    <PaxSettingsToggleRow
        label={overlayEnabled ? "Overlay ON" : "Overlay OFF"}
        checked={overlayEnabled}
        meta={overlayEnabled ? "On" : "Off"}
        onChange={toggleOverlay}
    />
    {#if overlayEnabled}
        <PaxSettingsToggleRow
            class="diagnostics-indent"
            label="Active Front"
            checked={overlayShowActiveFront}
            description="Bridge, anchors, and gold sections."
            meta={overlayShowActiveFront ? "On" : "Off"}
            onChange={toggleOverlayActiveFront}
        />
        <PaxSettingsToggleRow
            class="diagnostics-indent"
            label="Structural Vertices"
            checked={overlayShowVertices}
            meta={overlayShowVertices ? "On" : "Off"}
            onChange={toggleOverlayVertices}
        />
        <PaxSettingsToggleRow
            class="diagnostics-indent"
            label="Polyline Samples"
            checked={overlayPolylineSamples}
            meta={overlayPolylineSamples ? "On" : "Off"}
            onChange={togglePolylineSamples}
        />
    {/if}
    <PaxSettingsToggleRow
        label="Show authored measurements"
        checked={$authoredMeasurementsUi.visible}
        disabled={!hasAuthoredMeasurements}
        meta={hasAuthoredMeasurements
            ? `${activeGameStore.mapDiagnostics.measurements.length} lines`
            : "None"}
        onChange={toggleAuthoredMeasurements}
    />
</section>

<section data-subsection-id="measurements">
    <h4 class="sub-heading">Measurements</h4>
    <div class="row">
        <PaxSettingsToggleRow
            label={$rulerTool.enabled ? "Ruler ON" : "Ruler OFF"}
            checked={$rulerTool.enabled}
            meta={$rulerTool.enabled ? "On" : "Off"}
            onChange={toggleRuler}
        />
        <PaxHudButton
            label="Clear"
            size="sm"
            disabled={!$rulerTool.start && !$rulerTool.end}
            onclick={clearRuler}
        />
    </div>
    <div class="ruler-readout">
        <div><span>Start</span><span>{formatPoint($rulerTool.start)}</span></div>
        <div><span>End</span><span>{formatPoint($rulerTool.end)}</span></div>
        {#if getRulerMeasurement($rulerTool)}
            <div>
                <span>Distance</span>
                <span>{getRulerMeasurement($rulerTool)?.distance.toFixed(2)} px</span>
            </div>
            <div>
                <span>Δx / Δy</span>
                <span>{getRulerMeasurement($rulerTool)?.dx.toFixed(2)} / {getRulerMeasurement($rulerTool)?.dy.toFixed(2)}</span>
            </div>
        {/if}
    </div>
    <div class="ruler-controls">
        <PaxSettingsRangeRow
            label="Hue"
            value={$rulerTool.color.h}
            min={0}
            max={360}
            step={1}
            output={`${$rulerTool.color.h.toFixed(0)}deg`}
            settingConfigKey="local.ruler.color.h"
            onInput={(value) => setRulerColor("h", value)}
        />
        <PaxSettingsRangeRow
            label="Saturation"
            value={$rulerTool.color.s}
            min={0}
            max={100}
            step={1}
            format="percent"
            settingConfigKey="local.ruler.color.s"
            onInput={(value) => setRulerColor("s", value)}
        />
        <PaxSettingsRangeRow
            label="Lightness"
            value={$rulerTool.color.l}
            min={0}
            max={100}
            step={1}
            format="percent"
            settingConfigKey="local.ruler.color.l"
            onInput={(value) => setRulerColor("l", value)}
        />
        <PaxSettingsRangeRow
            label="Alpha"
            value={$rulerTool.color.a}
            min={0.05}
            max={1}
            step={0.01}
            format="fixed2"
            settingConfigKey="local.ruler.color.a"
            onInput={(value) => setRulerColor("a", value)}
        />
    </div>
</section>

<section data-subsection-id="recorder">
    <h4 class="sub-heading">Recorder & Bundles</h4>
    <div class="row">
        <PaxSettingsToggleRow
            label={$transitionSnapshotRecorderStore.enabled ? "Recording" : "Recorder Off"}
            checked={$transitionSnapshotRecorderStore.enabled}
            meta={`${bundleList.length} bundle${bundleList.length === 1 ? "" : "s"}`}
            onChange={toggleRecorder}
        />
        <span class="debug-hint">
            {bundleList.length} bundle{bundleList.length === 1 ? "" : "s"}
        </span>
    </div>
    {#if bundleList.length === 0}
        <div class="readout">
            {$transitionSnapshotRecorderStore.enabled
                ? "Waiting for conquest events…"
                : "Enable the recorder before a conquest to capture a bundle."}
        </div>
    {:else}
        <div class="bundle-list">
            {#each bundleList as bundle (bundle.id)}
                <div class="bundle-item">
                    <div class="bundle-meta">
                        <span class="bundle-time">{timeLabel(bundle)}</span>
                        <span class="bundle-conquest">{conquestLabel(bundle)}</span>
                        <span class="bundle-frames">{frameLabel(bundle)}</span>
                    </div>
                    <div class="bundle-actions">
                        <PaxHudButton
                            label={downloading === `pkg:${bundle.id}` ? "..." : "Pkg"}
                            size="sm"
                            intent="primary"
                            disabled={downloading === `pkg:${bundle.id}`}
                            onclick={() => void packageOne(bundle)}
                        />
                        <PaxHudButton
                            label={downloading === bundle.id ? "..." : "DL"}
                            size="sm"
                            disabled={downloading === bundle.id}
                            onclick={() => void downloadOne(bundle)}
                        />
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</section>

<section data-subsection-id="exports">
    <h4 class="sub-heading">Exports</h4>
    <div class="actions-row">
        <PaxHudButton
            label={downloading === "__pkg_all__" ? "Packaging..." : "Export All Packages"}
            size="sm"
            intent="primary"
            disabled={bundleList.length === 0 || downloading !== null}
            onclick={() => void packageAll()}
        />
        <PaxHudButton
            label={downloading === "__all__" ? "Downloading..." : "Download All Files"}
            size="sm"
            disabled={bundleList.length === 0 || downloading !== null}
            onclick={() => void downloadAll()}
        />
        <PaxHudButton
            label="Clear Bundles"
            size="sm"
            danger
            disabled={bundleList.length === 0}
            onclick={clearBundles}
        />
        <PaxHudButton
            label="Refresh Live Values"
            size="sm"
            onclick={() => syncFromConfig?.()}
        />
    </div>
</section>

<SettingsDumpDiagnosticsControls />

<section data-subsection-id="mode-diagnostics">
    <h4 class="sub-heading">Mode Diagnostics</h4>
    <PaxSettingsToggleRow
        label="Show Underlying Geometry"
        checked={panel.perimeterFieldDebugShowGeometry ??
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY ??
            false}
        disabled={!showUnderlyingGeometrySupported}
        description={showUnderlyingGeometrySupported
            ? "Draw active territory geometry truth."
            : "Unavailable for this mode."}
        meta={showUnderlyingGeometrySupported ? "Supported" : "N/A"}
        settingConfigKey="PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY"
        onChange={setUnderlyingGeometry}
    />
    <div class="status-grid">
        <div><span>Mode</span><code>{getTerritoryRenderModeLabel($territoryRenderStatus.territoryMode)}</code></div>
        <div><span>Geometry</span><span>{$territoryRenderStatus.geometryReady === null ? "pending" : $territoryRenderStatus.geometryReady ? "ready" : "missing"}</span></div>
        <div>
            <span>Renderer</span>
            <span>
                {$territoryRenderStatus.rendererType}
                <code>{$territoryRenderStatus.rendererTypeSource}</code>
                {#if $territoryRenderStatus.rendererConstructorName}
                    / {$territoryRenderStatus.rendererConstructorName}
                {/if}
                {#if $territoryRenderStatus.rendererReportedType}
                    / reported {$territoryRenderStatus.rendererReportedType}
                {/if}
            </span>
        </div>
        <div><span>Arrows</span><code>{$territoryRenderStatus.arrowRenderer}</code></div>
        <div>
            <span>Topology Compile</span>
            <span>
                {$territoryTuningStatus.pending
                    ? `Compiling… ${$territoryTuningStatus.label ?? ""}`.trim()
                    : $territoryTuningStatus.lastDurationMs !== null
                      ? `${$territoryTuningStatus.lastDurationMs} ms`
                      : "idle"}
            </span>
        </div>
        <div>
            <span>Requested MSR</span>
            <span>
                {$territoryRenderStatus.msrRequestedMarginPx === null
                    ? "n/a"
                    : `${$territoryRenderStatus.msrRequestedMarginPx}px`}
            </span>
        </div>
        <div>
            <span>Star Bias</span>
            <span>
                {$territoryRenderStatus.msrStarBias === null
                    || !Number.isFinite($territoryRenderStatus.msrStarBias)
                    ? "n/a"
                    : $territoryRenderStatus.msrStarBias.toFixed(2)}
            </span>
        </div>
        <div>
            <span>Stars Affecting Frontier</span>
            <span>{$territoryRenderStatus.msrAnchorCount}</span>
        </div>
        <div>
            <span>Intervals Needing Clearance</span>
            <span>
                {$territoryRenderStatus.msrViolatedIntervalCount}/{$territoryRenderStatus.msrIntervalCount}
                active
            </span>
        </div>
        <div>
            <span>Local Repairs</span>
            <span>
                {$territoryRenderStatus.msrAcceptedRepairCount} accepted /
                {$territoryRenderStatus.msrRejectedRepairCount} rejected
            </span>
        </div>
        {#if $territoryRenderStatus.lastRenderFailure}
            <div class="status-grid__failure">
                <span>Failure</span>
                <span>{$territoryRenderStatus.lastRenderFailure}</span>
            </div>
        {/if}
        {#if $territoryRenderStatus.msrLastInvariantFailure}
            <div class="status-grid__failure">
                <span>Last Rejection Reason</span>
                <span>{$territoryRenderStatus.msrLastInvariantFailure}</span>
            </div>
        {/if}
        {#if activeRenderMode !== liveRenderMode}
            <div>
                <span>Configured</span>
                <code>{getTerritoryRenderModeLabel(activeRenderMode)}</code>
            </div>
        {/if}
    </div>
    {#if showTerritoryEngineTraceDiagnostics}
        <TerritoryEngineTraceDiagnostics {panel} {updatePanel} />
    {/if}
    {#if showMetaballGridDiagnostics}
        <div class="status-grid">
            <div><span>Family</span><code>{$metaballGridStats.familyLabel}</code></div>
            <div><span>Wave</span><code>{$metaballGridStats.waveGeometry}</code></div>
            <div><span>Seeding</span><code>{$metaballGridStats.waveSeeding}</code></div>
            <div><span>Border</span><span>{formatBorderSummary()}</span></div>
            <div><span>DX</span><span>{formatDxSummary()}</span></div>
            <div><span>Source</span><code>{$metaballGridStats.geometrySource ?? "n/a"}</code></div>
            <div><span>Frame</span><span><code>{$metaballGridStats.clockSource}</code> / {$metaballGridStats.visibleFrameState}</span></div>
            <div><span>Transition</span><span>{formatTransitionSummary()}</span></div>
            <div><span>Fast Path</span><span>{formatFastPathSummary()}</span></div>
            <div><span>Timing Config</span><span>{formatTimingConfigSummary()}</span></div>
            <div><span>Handler</span><span>{formatHandlerSummary()}</span></div>
            <div><span>Lifecycle</span><span>{formatLifecycleSummary()}</span></div>
            <div><span>Progress</span><span>{formatProgressSummary()}</span></div>
            <div><span>Local Clock</span><span>{formatLocalClockSummary()}</span></div>
            <div><span>Frontier Life</span><span>{formatFrontierLifetimeSummary()}</span></div>
            <div><span>Flip Pcts</span><span>{formatFlipPercentiles()}</span></div>
            <div><span>Flip Bins</span><span>{formatFlipBins()}</span></div>
        </div>
        {#if liveRenderMode === "metaball_grid_ember_lattice"}
            <div class="readout">
                {formatEmberLatticeSemanticsNote()}
                Default visual starting point: <code>pre_to_post_frontier</code>,
                <code>territory_edge</code>, blended borders on, Chaikin 4, and DX on at 295px with weight 0.30. Propagation shape is now a real tuning choice.
            </div>
        {/if}
        {#if liveRenderMode === "metaball_grid_phase_field"}
            <div class="readout">
                {formatPhaseFieldSemanticsNote()}
                Recommended starter: <code>pre_to_post_frontier</code> propagation, <code>territory_edge</code> borders, <code>Frontier Highlight</code> on, and the new finish-tail controls in <code>Flip</code> for fade timing, cell collapse, and frontier cleanup. DX defaults stay on at 295px with weight 0.30.
            </div>
        {/if}
    {/if}
    {#if showGridGradientDiagnostics}
        <div class="status-grid">
            <div><span>Family</span><code>{$gridGradientStats.familyLabel}</code></div>
            <div>
                <span>Renderer</span>
                <span>
                    {$gridGradientStats.rendererType}
                    <code>{$gridGradientStats.rendererTypeSource}</code>
                    {#if $gridGradientStats.rendererConstructorName}
                        / {$gridGradientStats.rendererConstructorName}
                    {/if}
                    {#if $gridGradientStats.rendererReportedType}
                        / reported {$gridGradientStats.rendererReportedType}
                    {/if}
                </span>
            </div>
            <div><span>Source</span><code>{$gridGradientStats.geometrySource ?? "n/a"}</code></div>
            <div><span>Backend</span><span>{$gridGradientStats.requestedDrawBackend} -> {$gridGradientStats.drawBackend}{#if $gridGradientStats.backendFallbackReason} / {$gridGradientStats.backendFallbackReason}{/if}</span></div>
            <div><span>Plan Cache</span><span>{$gridGradientStats.planCacheHit ? "hit" : "miss"}{#if $gridGradientStats.planRebuildReason} / {$gridGradientStats.planRebuildReason}{/if}{#if $gridGradientStats.requestedPlanPending} / pending{/if}</span></div>
            <div><span>Plan Worker</span><span>{$gridGradientStats.planWorkerScheduled ? "scheduled" : "idle"} / {$gridGradientStats.committedWorkerPlan ? "committed" : "no commit"} / wait {$gridGradientStats.planWorkerWaitMs == null ? "n/a" : `${$gridGradientStats.planWorkerWaitMs.toFixed(1)}ms`}</span></div>
            <div><span>Classifier</span><span>{$gridGradientStats.classificationAlgorithm} / cache {$gridGradientStats.prevOwnerGridCacheHit ? "prev hit" : "prev miss"} / {$gridGradientStats.nextOwnerGridCacheHit ? "next hit" : "next miss"}</span></div>
            <div><span>Paint Cache</span><span>{$gridGradientStats.presentationCacheHit ? "hit" : "miss"}{#if $gridGradientStats.presentationRebuildReason} / {$gridGradientStats.presentationRebuildReason}{/if}</span></div>
            <div><span>Cells</span><span>{$gridGradientStats.paintedCells.toLocaleString()} painted / {$gridGradientStats.emittableCells.toLocaleString()} emittable / {$gridGradientStats.totalCells.toLocaleString()} total</span></div>
            <div><span>Active/Outside</span><span>{$gridGradientStats.activeTransitionCells.toLocaleString()} active / {$gridGradientStats.outsideCells.toLocaleString()} outside</span></div>
            <div><span>Transition Cells</span><span>{$gridGradientStats.activeTransitionCells.toLocaleString()} active / {$gridGradientStats.activeDrawableTransitionCells.toLocaleString()} drawable / {$gridGradientStats.activeMixingTransitionCells.toLocaleString()} mixing / {$gridGradientStats.activeOffsetZoneTransitionCells.toLocaleString()} offset</span></div>
            <div><span>Shader Cells</span><span>{$gridGradientStats.shaderActiveTransitionCells.toLocaleString()} active / {$gridGradientStats.shaderActiveDrawableTransitionCells.toLocaleString()} drawable / {$gridGradientStats.shaderActiveOffsetZoneTransitionCells.toLocaleString()} offset</span></div>
            <div><span>Spacing</span><span>{$gridGradientStats.requestedSpacingPx.toFixed(1)}px requested / {$gridGradientStats.effectiveSpacingPx.toFixed(1)}px effective</span></div>
            <div><span>Fill</span><span>{$gridGradientStats.fillStyle} / {$gridGradientStats.cellShape} / {$gridGradientStats.edgeSizePx.toFixed(1)}px edge / {$gridGradientStats.centerSizePx.toFixed(1)}px center / curve {$gridGradientStats.curvePower.toFixed(2)}</span></div>
            <div><span>Shader</span><span>{$gridGradientStats.shaderNeighborMode} neighbors</span></div>
            <div><span>Shader Uniform</span><span>progress {$gridGradientStats.shaderUniformProgress == null ? "n/a" : $gridGradientStats.shaderUniformProgress.toFixed(3)} / time {$gridGradientStats.shaderUniformTimeSec == null ? "n/a" : `${$gridGradientStats.shaderUniformTimeSec.toFixed(2)}s`} / update {$gridGradientStats.lastUniformUpdateMs.toFixed(3)} ms</span></div>
            <div><span>Textures</span><span>{$gridGradientStats.textureUploaded ? "upload" : "cached"} / {($gridGradientStats.textureBytes / 1024).toFixed(1)} KB</span></div>
            <div><span>Build Split</span><span>plan {$gridGradientStats.lastPlanBuildMs.toFixed(1)} ms ({$gridGradientStats.lastOwnerGridBuildMs.toFixed(1)} grid + {$gridGradientStats.lastClassificationMaterializeMs.toFixed(1)} materialize + {$gridGradientStats.lastWavePlanBuildMs.toFixed(1)} wave) / field {$gridGradientStats.lastDistanceBuildMs.toFixed(1)} + {$gridGradientStats.lastTexturePackMs.toFixed(1)} ms / upload {$gridGradientStats.lastTextureUploadMs.toFixed(1)} ms</span></div>
            <div><span>Offset</span><span>{$gridGradientStats.borderOffsetPx.toFixed(1)}px</span></div>
            <div><span>Borders</span><span>{$gridGradientStats.vectorBordersEnabled ? "vector on" : "vector off"} / {$gridGradientStats.borderDotsEnabled ? `${$gridGradientStats.borderDotStyle} dots` : "dots off"}</span></div>
            <div><span>Border Count</span><span>{$gridGradientStats.vectorBorderCount} vector / {$gridGradientStats.borderDotCount} dots</span></div>
            <div><span>Frame</span><span><code>{$gridGradientStats.clockSource}</code> / {$gridGradientStats.visibleFrameState} / {$gridGradientStats.lastUpdateMs.toFixed(2)} ms / EMA {$gridGradientStats.emaUpdateMs.toFixed(2)} ms</span></div>
            <div><span>Transition</span><span>{$gridGradientStats.visualTransitionActive ? "local clock" : "scheduler"} / plan {$gridGradientStats.requestedPlanPending ? "pending" : "ready"} / progress {($gridGradientStats.rawProgress ?? $gridGradientStats.schedulerRawProgress ?? 1).toFixed(3)}</span></div>
            <div><span>Transition Input</span><span>{$gridGradientStats.transitionEventCount} events / {$gridGradientStats.transitionSessionCount} sessions / age {$gridGradientStats.transitionAgeMs == null ? "n/a" : `${$gridGradientStats.transitionAgeMs.toFixed(0)}ms`} / duration {$gridGradientStats.transitionDurationMs == null ? "n/a" : `${$gridGradientStats.transitionDurationMs.toFixed(0)}ms`}</span></div>
        </div>
    {/if}
    {#if showPerimeterFieldDiagnostics}
        <PerimeterFieldDiagnosticsPanel />
    {/if}
</section>

<style>

    .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    :global(.diagnostics-indent) {
        margin-left: 12px;
    }

    .debug-hint {
        margin-left: auto;
        font-size: var(--pax-type-3xs);
        color: #888;
    }

    .ruler-readout {
        margin-top: 8px;
        display: grid;
        gap: 4px;
        font-size: var(--pax-type-2xs);
        color: rgba(220, 220, 240, 0.84);
    }

    .ruler-readout > div {
        display: grid;
        grid-template-columns: 68px 1fr;
        gap: 8px;
        align-items: start;
    }

    .ruler-readout > div > span:first-child {
        color: rgba(180, 130, 255, 0.72);
        font-weight: var(--pax-weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: var(--pax-type-3xs);
    }

    .ruler-controls {
        margin-top: 10px;
        display: grid;
        gap: 6px;
    }

    .bundle-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
    }

    .bundle-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(17, 24, 39, 0.52);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .bundle-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 10px;
        align-items: center;
        font-size: var(--pax-type-2xs);
        color: rgba(220, 232, 245, 0.82);
    }

    .bundle-time,
    .bundle-frames {
        color: rgba(156, 163, 175, 0.9);
        font-family: monospace;
    }

    .bundle-actions,
    .actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
    }

    .readout {
        margin-top: 6px;
        font-size: var(--pax-type-2xs);
        line-height: 1.45;
        color: rgba(160, 160, 180, 0.72);
    }

    .status-grid {
        display: grid;
        gap: 6px;
        margin-top: 4px;
        font-size: var(--pax-type-2xs);
    }

    .status-grid > div {
        display: grid;
        grid-template-columns: 72px 1fr;
        gap: 8px;
        align-items: start;
    }

    .status-grid > div > span:first-child {
        color: rgba(180, 130, 255, 0.72);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: var(--pax-type-3xs);
    }

    .status-grid__failure {
        color: rgba(252, 165, 165, 0.92);
    }
</style>
