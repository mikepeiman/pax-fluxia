<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { territoryRenderStatus } from "$lib/stores/territoryRenderStatusStore";
    import { territoryTuningStatus } from "$lib/stores/territoryTuningStatusStore";
    import { metaballGridStats } from "$lib/territory/families/metaballGrid/metaballGridStats";
    import PerimeterFieldDiagnosticsPanel from "$lib/components/ui/PerimeterFieldDiagnosticsPanel.svelte";
    import { overlayConfig } from "$lib/territory/devtools/overlayConfig";
    import {
        authoredMeasurementsUi,
    } from "$lib/territory/devtools/authoredMeasurementsUi";
    import {
        getRulerMeasurement,
        rulerTool,
    } from "$lib/territory/devtools/rulerTool";
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

    interface Props {
        panel: Record<string, any>;
        syncFromConfig?: () => void;
    }

    let { panel, syncFromConfig }: Props = $props();

    const hasAuthoredMeasurements = $derived(
        activeGameStore.mapDiagnostics.measurements.length > 0,
    );
    const activeRenderMode = $derived(
        (panel.territoryRenderMode ??
            GAME_CONFIG.TERRITORY_RENDER_MODE ??
            "territory_canonical") as string,
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
            liveRenderMode === "metaball_grid_phase_field",
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
        value: string,
    ): void {
        rulerTool.setColor(key, Number(value));
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

    function formatPhaseEdgesSemanticsNote(): string {
        return "Phase Edges now runs as its own session-overlay renderer inside the metaball family. Idle frames can still look close to base Metaball Grid when shared settings align; the meaningful difference is that consecutive conquest sessions preserve their own PRE/NEXT captures and wave timing instead of collapsing into one retained frontier.";
    }

    function formatPhaseFieldSemanticsNote(): string {
        return "Phase Field runs as its own metaball-grid family variant. It keeps the shared deterministic cell classifier and frontier timing, but replaces metaball presentation with conquest-local PRE/POST territory compositing plus a highlighted frontier pass.";
    }
</script>

<section data-subsection-id="overlays">
    <h4 class="sub-heading">Overlays</h4>
    <label class="toggle-row">
        <input type="checkbox" checked={overlayEnabled} onchange={toggleOverlay} />
        <span class="var-name">{overlayEnabled ? "Overlay ON" : "Overlay OFF"}</span>
    </label>
    {#if overlayEnabled}
        <label class="toggle-row indent">
            <input
                type="checkbox"
                checked={overlayShowActiveFront}
                onchange={toggleOverlayActiveFront}
            />
            <span class="var-name">Active front bridge + anchors + gold sections</span>
        </label>
        <label class="toggle-row indent">
            <input
                type="checkbox"
                checked={overlayShowVertices}
                onchange={toggleOverlayVertices}
            />
            <span class="var-name">Structural vertices</span>
        </label>
        <label class="toggle-row indent">
            <input
                type="checkbox"
                checked={overlayPolylineSamples}
                onchange={togglePolylineSamples}
            />
            <span class="var-name">Polyline samples</span>
        </label>
    {/if}
    <label class="toggle-row" class:is-disabled={!hasAuthoredMeasurements}>
        <input
            type="checkbox"
            checked={$authoredMeasurementsUi.visible}
            disabled={!hasAuthoredMeasurements}
            onchange={toggleAuthoredMeasurements}
        />
        <span class="var-name">Show authored measurements</span>
        <span class="debug-hint">
            {hasAuthoredMeasurements
                ? `${activeGameStore.mapDiagnostics.measurements.length} lines`
                : "No authored measurements"}
        </span>
    </label>
</section>

<section data-subsection-id="measurements">
    <h4 class="sub-heading">Measurements</h4>
    <div class="row">
        <label class="toggle-row">
            <input
                type="checkbox"
                checked={$rulerTool.enabled}
                onchange={toggleRuler}
            />
            <span class="var-name">{$rulerTool.enabled ? "Ruler ON" : "Ruler OFF"}</span>
        </label>
        <button
            class="mini-action-btn"
            type="button"
            disabled={!$rulerTool.start && !$rulerTool.end}
            onclick={clearRuler}
        >
            Clear
        </button>
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
        <label>
            <span>H</span>
            <input
                type="range"
                min="0"
                max="360"
                value={$rulerTool.color.h}
                oninput={(event) =>
                    setRulerColor("h", (event.currentTarget as HTMLInputElement).value)}
            />
            <strong>{$rulerTool.color.h.toFixed(0)}°</strong>
        </label>
        <label>
            <span>S</span>
            <input
                type="range"
                min="0"
                max="100"
                value={$rulerTool.color.s}
                oninput={(event) =>
                    setRulerColor("s", (event.currentTarget as HTMLInputElement).value)}
            />
            <strong>{$rulerTool.color.s.toFixed(0)}%</strong>
        </label>
        <label>
            <span>L</span>
            <input
                type="range"
                min="0"
                max="100"
                value={$rulerTool.color.l}
                oninput={(event) =>
                    setRulerColor("l", (event.currentTarget as HTMLInputElement).value)}
            />
            <strong>{$rulerTool.color.l.toFixed(0)}%</strong>
        </label>
        <label>
            <span>A</span>
            <input
                type="range"
                min="0.05"
                max="1"
                step="0.01"
                value={$rulerTool.color.a}
                oninput={(event) =>
                    setRulerColor("a", (event.currentTarget as HTMLInputElement).value)}
            />
            <strong>{$rulerTool.color.a.toFixed(2)}</strong>
        </label>
    </div>
</section>

<section data-subsection-id="recorder">
    <h4 class="sub-heading">Recorder & Bundles</h4>
    <div class="row">
        <label class="toggle-row">
            <input
                type="checkbox"
                checked={$transitionSnapshotRecorderStore.enabled}
                onchange={toggleRecorder}
            />
            <span class="var-name">
                {$transitionSnapshotRecorderStore.enabled ? "Recording" : "Recorder Off"}
            </span>
        </label>
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
                        <button
                            class="mini-action-btn primary"
                            type="button"
                            disabled={downloading === `pkg:${bundle.id}`}
                            onclick={() => void packageOne(bundle)}
                        >
                            {downloading === `pkg:${bundle.id}` ? "…" : "Pkg"}
                        </button>
                        <button
                            class="mini-action-btn"
                            type="button"
                            disabled={downloading === bundle.id}
                            onclick={() => void downloadOne(bundle)}
                        >
                            {downloading === bundle.id ? "…" : "DL"}
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</section>

<section data-subsection-id="exports">
    <h4 class="sub-heading">Exports</h4>
    <div class="actions-row">
        <button
            class="mini-action-btn primary"
            type="button"
            disabled={bundleList.length === 0 || downloading !== null}
            onclick={() => void packageAll()}
        >
            {downloading === "__pkg_all__" ? "Packaging…" : "Export All Packages"}
        </button>
        <button
            class="mini-action-btn"
            type="button"
            disabled={bundleList.length === 0 || downloading !== null}
            onclick={() => void downloadAll()}
        >
            {downloading === "__all__" ? "Downloading…" : "Download All Files"}
        </button>
        <button
            class="mini-action-btn danger"
            type="button"
            disabled={bundleList.length === 0}
            onclick={clearBundles}
        >
            Clear Bundles
        </button>
        <button
            class="mini-action-btn"
            type="button"
            onclick={() => syncFromConfig?.()}
        >
            Refresh Live Values
        </button>
    </div>
</section>

<section data-subsection-id="mode-diagnostics">
    <h4 class="sub-heading">Mode Diagnostics</h4>
    <div class="status-grid">
        <div><span>Mode</span><code>{getTerritoryRenderModeLabel($territoryRenderStatus.territoryMode)}</code></div>
        <div><span>Geometry</span><span>{$territoryRenderStatus.geometryReady === null ? "pending" : $territoryRenderStatus.geometryReady ? "ready" : "missing"}</span></div>
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
        {#if $territoryRenderStatus.lastRenderFailure}
            <div class="status-grid__failure">
                <span>Failure</span>
                <span>{$territoryRenderStatus.lastRenderFailure}</span>
            </div>
        {/if}
        {#if activeRenderMode !== liveRenderMode}
            <div>
                <span>Configured</span>
                <code>{getTerritoryRenderModeLabel(activeRenderMode)}</code>
            </div>
        {/if}
    </div>
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
        {#if liveRenderMode === "metaball_grid_phase_edges"}
            <div class="readout">
                {formatPhaseEdgesSemanticsNote()}
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
    {#if showPerimeterFieldDiagnostics}
        <PerimeterFieldDiagnosticsPanel />
    {/if}
</section>

<style>
    @import "./panel-shared.css";

    .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .indent {
        padding-left: 18px;
    }

    .toggle-row.is-disabled {
        opacity: 0.45;
        cursor: default;
    }

    .debug-hint {
        margin-left: auto;
        font-size: 9px;
        color: #888;
    }

    .mini-action-btn {
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(220, 220, 240, 0.82);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
    }

    .mini-action-btn:hover:not(:disabled) {
        border-color: rgba(87, 248, 255, 0.38);
        background: rgba(87, 248, 255, 0.12);
        color: rgba(248, 250, 252, 0.96);
    }

    .mini-action-btn:disabled {
        cursor: default;
        opacity: 0.45;
    }

    .mini-action-btn.primary {
        border-color: rgba(87, 248, 255, 0.34);
    }

    .mini-action-btn.danger:hover:not(:disabled) {
        border-color: rgba(248, 113, 113, 0.45);
        background: rgba(248, 113, 113, 0.12);
    }

    .ruler-readout {
        margin-top: 8px;
        display: grid;
        gap: 4px;
        font-size: 0.68rem;
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
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.62rem;
    }

    .ruler-controls {
        margin-top: 10px;
        display: grid;
        gap: 6px;
    }

    .ruler-controls label {
        display: grid;
        grid-template-columns: 16px 1fr auto;
        gap: 8px;
        align-items: center;
        font-size: 0.68rem;
        color: rgba(220, 220, 240, 0.82);
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
        font-size: 0.68rem;
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
        font-size: 0.68rem;
        line-height: 1.45;
        color: rgba(160, 160, 180, 0.72);
    }

    .status-grid {
        display: grid;
        gap: 6px;
        margin-top: 4px;
        font-size: 0.7rem;
    }

    .status-grid > div {
        display: grid;
        grid-template-columns: 72px 1fr;
        gap: 8px;
        align-items: start;
    }

    .status-grid > div > span:first-child {
        color: rgba(180, 130, 255, 0.72);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 0.62rem;
    }

    .status-grid__failure {
        color: rgba(252, 165, 165, 0.92);
    }
</style>
