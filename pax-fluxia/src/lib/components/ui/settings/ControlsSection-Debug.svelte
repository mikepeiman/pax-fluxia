<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
    import { overlayConfig } from "$lib/territory/devtools/overlayConfig";
    import {
        getRulerMeasurement,
        rulerTool,
        type RulerLaneState,
        type RulerMeasurement,
        type RulerPoint,
    } from "$lib/territory/devtools/rulerTool";
    import { transitionSnapshotRecorder } from "$lib/territory/devtools/TransitionSnapshotRecorder";
    import { downloadBundle } from "$lib/territory/devtools/TransitionBundleSerializer";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();

    let slowMoActive = $state(GAME_CONFIG.DEBUG_MORPH_SLOWMO);
    let showVertices = $state(GAME_CONFIG.DEBUG_MORPH_VERTICES);
    let traceLog = $state(GAME_CONFIG.DEBUG_MORPH_TRACE_LOG);
    let vertexSize = $state(GAME_CONFIG.DEBUG_MORPH_VERTEX_SIZE);
    let pinThreshold = $state(GAME_CONFIG.DEBUG_MORPH_PIN_THRESHOLD);
    let vertexNth = $state(GAME_CONFIG.DEBUG_MORPH_VERTEX_NTH);
    let colorMode = $state(
        GAME_CONFIG.DEBUG_MORPH_VERTEX_COLOR_MODE ?? "pinmorph",
    );
    let showLabels = $state(GAME_CONFIG.DEBUG_MORPH_VERTEX_LABELS ?? true);
    let conquestRadius = $state(GAME_CONFIG.MORPH_CONQUEST_RADIUS ?? 300);

    let dy4DisableFillCrossfade = $state(
        GAME_CONFIG.DEBUG_DY4_DISABLE_FILL_CROSSFADE ?? false,
    );
    let dy4DisableBorderTransition = $state(
        GAME_CONFIG.DEBUG_DY4_DISABLE_BORDER_TRANSITION ?? false,
    );
    let dy4ForceTransitionStart = $state(
        GAME_CONFIG.DEBUG_DY4_FORCE_TRANSITION_START ?? false,
    );

    let overlayEnabled = $state(overlayConfig.enabled);
    let overlayShowVertices = $state(overlayConfig.showAllVertices);
    let overlayShowActiveFront = $state(overlayConfig.showActiveFront);
    let overlayPolylineSamples = $state(overlayConfig.showPolylineSamples);

    let recorderEnabled = $state(transitionSnapshotRecorder.isEnabled());
    let bundleCount = $state(transitionSnapshotRecorder.count);

    const laneStateOptions: Array<{ value: RulerLaneState; label: string }> = [
        { value: "straight", label: "Straight" },
        { value: "bent", label: "Bent" },
        { value: "curved", label: "Curved" },
        { value: "missing", label: "Missing" },
    ];

    let liveMeasurement = $derived(getRulerMeasurement($rulerTool));
    let rulerMeasurements = $derived([...$rulerTool.measurements].reverse());

    function formatPoint(point: RulerPoint | null): string {
        if (!point) return "unset";
        if (point.starId) return point.starId;
        if (point.laneLabel) return point.laneLabel;
        return `${point.x.toFixed(1)}, ${point.y.toFixed(1)}`;
    }

    function formatMeasurement(measurement: RulerMeasurement): string {
        const core = measurement.starPairLabel ?? measurement.relatedLaneLabel;
        if (core) return core;
        return `${formatPoint(measurement.start)} -> ${formatPoint(measurement.end)}`;
    }

    function setRulerColor(key: "h" | "s" | "l" | "a", event: Event) {
        rulerTool.setColor(
            key,
            Number((event.currentTarget as HTMLInputElement).value),
        );
    }

    function setLaneState(measurementId: string, laneState: RulerLaneState) {
        rulerTool.setMeasurementLaneState(measurementId, laneState);
    }

    function toggleLabels() {
        showLabels = !showLabels;
        GAME_CONFIG.DEBUG_MORPH_VERTEX_LABELS = showLabels;
    }

    function toggleSlowMo() {
        slowMoActive = !slowMoActive;
        GAME_CONFIG.DEBUG_MORPH_SLOWMO = slowMoActive;
        if (slowMoActive) {
            GAME_CONFIG.TERRITORY_TRANSITION_MS =
                (GAME_CONFIG.TERRITORY_TRANSITION_MS || 400) * 10;
        } else {
            GAME_CONFIG.TERRITORY_TRANSITION_MS = Math.round(
                (GAME_CONFIG.TERRITORY_TRANSITION_MS || 4000) / 10,
            );
        }
    }

    function toggleVertices() {
        showVertices = !showVertices;
        GAME_CONFIG.DEBUG_MORPH_VERTICES = showVertices;
    }

    function toggleTrace() {
        traceLog = !traceLog;
        GAME_CONFIG.DEBUG_MORPH_TRACE_LOG = traceLog;
    }

    function toggleOverlay() {
        overlayEnabled = !overlayEnabled;
        overlayConfig.enabled = overlayEnabled;
    }

    function toggleOverlayVertices() {
        overlayShowVertices = !overlayShowVertices;
        overlayConfig.showAllVertices = overlayShowVertices;
    }

    function toggleOverlayActiveFront() {
        overlayShowActiveFront = !overlayShowActiveFront;
        overlayConfig.showActiveFront = overlayShowActiveFront;
    }

    function togglePolylineSamples() {
        overlayPolylineSamples = !overlayPolylineSamples;
        overlayConfig.showPolylineSamples = overlayPolylineSamples;
    }

    function toggleRecorder() {
        recorderEnabled = !recorderEnabled;
        transitionSnapshotRecorder.setEnabled(recorderEnabled);
    }

    function refreshBundleCount() {
        bundleCount = transitionSnapshotRecorder.count;
    }

    $effect(() => {
        if (!recorderEnabled) return;
        const interval = setInterval(refreshBundleCount, 500);
        return () => clearInterval(interval);
    });

    async function handleDownloadLatest() {
        const bundles = transitionSnapshotRecorder.getBundles();
        if (bundles.length === 0) return;
        const latest = bundles[bundles.length - 1];
        await downloadBundle(latest, latest.starPositions);
        refreshBundleCount();
    }

    async function handleDownloadAll() {
        const bundles = transitionSnapshotRecorder.getBundles();
        if (bundles.length === 0) return;
        for (const bundle of bundles) {
            await downloadBundle(bundle, bundle.starPositions);
        }
        refreshBundleCount();
    }

    function handleClearBundles() {
        transitionSnapshotRecorder.clear();
        refreshBundleCount();
    }
</script>

<CategoryThemeBar category="debug" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Ruler</h4>

<button class="debug-btn" class:active={$rulerTool.enabled} onclick={() => rulerTool.toggle()}>
    {$rulerTool.enabled ? "Ruler On" : "Ruler Off"}
    <span class="debug-hint">Click two points to measure</span>
</button>

<div class="chip-row ruler-mode-row">
    <button
        class="chip"
        class:active={$rulerTool.mode === "transient"}
        onclick={() => rulerTool.setMode("transient")}
    >
        Transient
    </button>
    <button
        class="chip"
        class:active={$rulerTool.mode === "persistent"}
        onclick={() => rulerTool.setMode("persistent")}
    >
        Persistent
    </button>
    <button class="chip" onclick={() => rulerTool.clear()}>
        Clear
    </button>
</div>

<div class="readout-grid">
    <div><span>Start</span><strong>{formatPoint($rulerTool.start)}</strong></div>
    <div><span>End</span><strong>{formatPoint($rulerTool.end)}</strong></div>
    <div>
        <span>Distance</span>
        <strong>{liveMeasurement?.distance?.toFixed(2) ?? "—"} px</strong>
    </div>
    <div>
        <span>Lane Margin</span>
        <strong>{GAME_CONFIG.MAPGEN_LANE_MARGIN_PX}px</strong>
    </div>
</div>

<div class="slider-row">
    <span class="slider-label">Lane hitbox</span>
    <input
        type="range"
        min="4"
        max="80"
        step="1"
        value={$rulerTool.laneHitboxPx}
        oninput={(e) =>
            rulerTool.setLaneHitboxPx(
                Number((e.currentTarget as HTMLInputElement).value),
            )}
    />
    <span class="slider-value">{$rulerTool.laneHitboxPx}px</span>
</div>

<div class="hsla-grid">
    <label>
        <span>Hue</span>
        <input
            type="range"
            min="0"
            max="360"
            value={$rulerTool.color.h}
            oninput={(e) => setRulerColor("h", e)}
        />
        <strong>{$rulerTool.color.h.toFixed(0)}°</strong>
    </label>
    <label>
        <span>Sat</span>
        <input
            type="range"
            min="0"
            max="100"
            value={$rulerTool.color.s}
            oninput={(e) => setRulerColor("s", e)}
        />
        <strong>{$rulerTool.color.s.toFixed(0)}%</strong>
    </label>
    <label>
        <span>Light</span>
        <input
            type="range"
            min="0"
            max="100"
            value={$rulerTool.color.l}
            oninput={(e) => setRulerColor("l", e)}
        />
        <strong>{$rulerTool.color.l.toFixed(0)}%</strong>
    </label>
    <label>
        <span>Alpha</span>
        <input
            type="range"
            min="0.05"
            max="1"
            step="0.01"
            value={$rulerTool.color.a}
            oninput={(e) => setRulerColor("a", e)}
        />
        <strong>{$rulerTool.color.a.toFixed(2)}</strong>
    </label>
</div>

<div class="measure-log">
    {#if rulerMeasurements.length === 0}
        <div class="empty-note">Measurements will log here.</div>
    {:else}
        {#each rulerMeasurements as measurement (measurement.id)}
            <div class="measure-item">
                <div class="measure-title">{formatMeasurement(measurement)}</div>
                <div class="measure-subtitle">
                    {measurement.distance.toFixed(2)} px · LM {measurement.laneMarginPx}px
                    {#if measurement.relatedLaneLabel}
                        · {measurement.relatedLaneLabel}
                    {/if}
                    · actual {measurement.actualLaneState}
                </div>
                <div class="state-chip-row">
                    {#each laneStateOptions as option}
                        <button
                            class="state-chip"
                            class:active={measurement.userLaneState === option.value}
                            onclick={() => setLaneState(measurement.id, option.value)}
                        >
                            {option.label}
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    {/if}
</div>

<h4 class="sub-heading">Canvas Overlay</h4>

<label class="toggle-row">
    <input type="checkbox" checked={overlayEnabled} onchange={toggleOverlay} />
    <span>Overlay</span>
    <span class="debug-hint">Frontier diagnostics</span>
</label>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={overlayShowActiveFront}
        onchange={toggleOverlayActiveFront}
    />
    <span>Active front</span>
</label>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={overlayShowVertices}
        onchange={toggleOverlayVertices}
    />
    <span>Vertices</span>
</label>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={overlayPolylineSamples}
        onchange={togglePolylineSamples}
    />
    <span>Polyline samples</span>
</label>

<h4 class="sub-heading">Morph Diagnostics</h4>

<button class="debug-btn" class:active={slowMoActive} onclick={toggleSlowMo}>
    {slowMoActive ? "10X Slow-Mo On" : "Normal Speed"}
    <span class="debug-hint">{GAME_CONFIG.TERRITORY_TRANSITION_MS}ms</span>
</button>

<label class="toggle-row">
    <input type="checkbox" checked={showVertices} onchange={toggleVertices} />
    <span>Show vertex dots</span>
    <span class="debug-hint">Pinned vs morph</span>
</label>

{#if showVertices}
    <div class="slider-row">
        <span class="slider-label">Color mode</span>
        <select
            class="mode-select"
            value={colorMode}
            onchange={(e) => {
                colorMode = (e.target as HTMLSelectElement).value;
                GAME_CONFIG.DEBUG_MORPH_VERTEX_COLOR_MODE = colorMode;
            }}
        >
            <option value="pinmorph">Pin / Morph</option>
            <option value="owner">Player Color</option>
            <option value="neutral">Neutral Grey</option>
        </select>
    </div>
{/if}

<label class="toggle-row">
    <input type="checkbox" checked={showLabels} onchange={toggleLabels} />
    <span>Show vertex labels</span>
    <span class="debug-hint">Numeric index on each dot</span>
</label>

<label class="toggle-row">
    <input type="checkbox" checked={traceLog} onchange={toggleTrace} />
    <span>Vertex trace log</span>
    <span class="debug-hint">Console output</span>
</label>

<div class="slider-row">
    <span class="slider-label">Dot size</span>
    <input
        type="range"
        min="1"
        max="10"
        step="1"
        value={vertexSize}
        oninput={(e) => {
            vertexSize = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.DEBUG_MORPH_VERTEX_SIZE = vertexSize;
        }}
    />
    <span class="slider-value">{vertexSize}px</span>
</div>

<div class="slider-row">
    <span class="slider-label">Pin threshold</span>
    <input
        type="range"
        min="1"
        max="50"
        step="1"
        value={pinThreshold}
        oninput={(e) => {
            pinThreshold = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.DEBUG_MORPH_PIN_THRESHOLD = pinThreshold;
        }}
    />
    <span class="slider-value">{pinThreshold}px</span>
</div>

<div class="slider-row">
    <span class="slider-label">Show every</span>
    <input
        type="range"
        min="1"
        max="30"
        step="1"
        value={vertexNth}
        oninput={(e) => {
            vertexNth = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.DEBUG_MORPH_VERTEX_NTH = vertexNth;
        }}
    />
    <span class="slider-value">{vertexNth === 1 ? "all" : `${vertexNth}th`}</span>
</div>

<div class="slider-row">
    <span class="slider-label">Morph radius</span>
    <input
        type="range"
        min="0"
        max="1000"
        step="25"
        value={conquestRadius}
        oninput={(e) => {
            conquestRadius = +(e.target as HTMLInputElement).value;
            GAME_CONFIG.MORPH_CONQUEST_RADIUS = conquestRadius;
        }}
    />
    <span class="slider-value">{conquestRadius === 0 ? "off" : `${conquestRadius}px`}</span>
</div>

<h4 class="sub-heading">DY4 Transition Isolation</h4>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={dy4DisableFillCrossfade}
        onchange={() => {
            dy4DisableFillCrossfade = !dy4DisableFillCrossfade;
            updatePanel("debugDy4DisableFillCrossfade", dy4DisableFillCrossfade);
        }}
    />
    <span>Disable Fill Crossfade</span>
    <span class="debug-hint">Skip A-Z alpha morphing</span>
</label>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={dy4DisableBorderTransition}
        onchange={() => {
            dy4DisableBorderTransition = !dy4DisableBorderTransition;
            updatePanel("debugDy4DisableBorderTransition", dy4DisableBorderTransition);
        }}
    />
    <span>Disable Border Transition</span>
    <span class="debug-hint">Snap immediately</span>
</label>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={dy4ForceTransitionStart}
        onchange={() => {
            dy4ForceTransitionStart = !dy4ForceTransitionStart;
            updatePanel("debugDy4ForceTransitionStart", dy4ForceTransitionStart);
        }}
    />
    <span>Force Transition Start</span>
    <span class="debug-hint">Override condition checks</span>
</label>

<div class="readout">
    Transition: {GAME_CONFIG.TERRITORY_TRANSITION_MS}ms · Control pts:
    {GAME_CONFIG.TERRITORY_MORPH_CONTROL_POINTS}
</div>

<h4 class="sub-heading">Transition Snapshot Recorder</h4>

<button class="debug-btn" class:active={recorderEnabled} onclick={toggleRecorder}>
    {recorderEnabled ? "Recorder On" : "Recorder Off"}
    <span class="debug-hint">
        {bundleCount} capture{bundleCount !== 1 ? "s" : ""}
    </span>
</button>

{#if recorderEnabled}
    <div class="readout">
        Captures conquest events with before/after screenshots and frontier
        diff overlays.
    </div>
{/if}

{#if bundleCount > 0}
    <div class="snapshot-actions">
        <button class="snapshot-btn" onclick={handleDownloadLatest}>
            Download Latest
        </button>
        <button class="snapshot-btn" onclick={handleDownloadAll}>
            Download All ({bundleCount})
        </button>
        <button
            class="snapshot-btn snapshot-btn-danger"
            onclick={handleClearBundles}
        >
            Clear
        </button>
    </div>
{/if}

<style>
    @import "./panel-shared.css";

    .sub-heading {
        margin: 6px 0;
        font-size: 11px;
        color: #8cf;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .debug-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 6px 10px;
        margin-bottom: 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        color: #bbb;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .debug-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
    }

    .debug-btn.active {
        background: rgba(255, 80, 80, 0.15);
        border-color: rgba(255, 80, 80, 0.5);
        color: #ff8888;
    }

    .debug-hint {
        font-size: 9px;
        color: #888;
        margin-left: auto;
    }

    .chip-row,
    .state-chip-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .ruler-mode-row {
        margin-bottom: 8px;
    }

    .chip,
    .state-chip {
        padding: 6px 9px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        color: #d8efff;
        font-size: 0.72rem;
        cursor: pointer;
    }

    .chip.active,
    .state-chip.active {
        background: rgba(89, 248, 255, 0.16);
        border-color: rgba(89, 248, 255, 0.42);
    }

    .toggle-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        padding: 3px 0;
        color: #ccc;
        cursor: pointer;
    }

    .toggle-row input[type="checkbox"] {
        accent-color: #66ccaa;
    }

    .slider-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        padding: 3px 0;
        color: #bbb;
    }

    .slider-label {
        min-width: 70px;
        color: #999;
    }

    .slider-row input[type="range"] {
        flex: 1;
        height: 4px;
        accent-color: #66ccaa;
    }

    .slider-value {
        min-width: 40px;
        text-align: right;
        color: #8cf;
        font-family: monospace;
    }

    .mode-select {
        flex: 1;
        min-width: 0;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 4px;
        color: #d8efff;
    }

    .readout-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 8px;
    }

    .readout-grid div {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
    }

    .readout-grid span {
        font-size: 0.66rem;
        color: rgba(216, 239, 255, 0.65);
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .readout-grid strong {
        font-size: 0.8rem;
        color: #ffffff;
    }

    .hsla-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 10px;
    }

    .hsla-grid label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
    }

    .hsla-grid span {
        font-size: 0.66rem;
        color: rgba(216, 239, 255, 0.65);
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .hsla-grid strong {
        font-size: 0.74rem;
        color: #ffffff;
    }

    .measure-log {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 220px;
        overflow: auto;
        padding-right: 4px;
        margin-bottom: 8px;
    }

    .measure-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .measure-title {
        font-size: 0.78rem;
        font-weight: 700;
        color: #ffffff;
    }

    .measure-subtitle,
    .empty-note,
    .readout {
        font-size: 0.68rem;
        color: rgba(216, 239, 255, 0.68);
    }

    .snapshot-actions {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        margin-top: 4px;
    }

    .snapshot-btn {
        flex: 1;
        min-width: 80px;
        padding: 5px 8px;
        background: rgba(100, 180, 255, 0.1);
        border: 1px solid rgba(100, 180, 255, 0.25);
        border-radius: 4px;
        color: #8cf;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .snapshot-btn:hover {
        background: rgba(100, 180, 255, 0.2);
        border-color: rgba(100, 180, 255, 0.4);
    }

    .snapshot-btn-danger {
        background: rgba(255, 80, 80, 0.1);
        border-color: rgba(255, 80, 80, 0.25);
        color: #f88;
    }

    .snapshot-btn-danger:hover {
        background: rgba(255, 80, 80, 0.2);
        border-color: rgba(255, 80, 80, 0.4);
    }
</style>
