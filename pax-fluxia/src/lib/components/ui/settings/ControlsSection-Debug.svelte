<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { transitionSnapshotRecorder } from "$lib/territory/devtools/TransitionSnapshotRecorder";
    import { authoredMeasurementsUi } from "$lib/territory/devtools/authoredMeasurementsUi";
    import {
        downloadAllDiagnosticPackages,
        downloadBundle,
        downloadDiagnosticPackage,
    } from "$lib/territory/devtools/TransitionBundleSerializer";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
    import PerfScenarioRunner from "./PerfScenarioRunner.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();
    const hasAuthoredMeasurements = $derived(
        activeGameStore.mapDiagnostics.measurements.length > 0,
    );

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

    function handleOpenTransitionPanel() {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("pax-open-transition-debug-panel"));
    }

    function toggleAuthoredMeasurements() {
        if (!hasAuthoredMeasurements) return;
        authoredMeasurementsUi.toggle();
    }
</script>

<CategoryThemeBar category="debug" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Map Diagnostics</h4>

<label class="toggle-row" class:is-disabled={!hasAuthoredMeasurements}>
    <input
        type="checkbox"
        checked={$authoredMeasurementsUi.visible}
        disabled={!hasAuthoredMeasurements}
        onchange={toggleAuthoredMeasurements}
    />
    <span>Show authored measurements</span>
    <span class="debug-hint">
        {hasAuthoredMeasurements
            ? `${activeGameStore.mapDiagnostics.measurements.length} lines`
            : "No measurements in this map"}
    </span>
</label>

<h4 class="sub-heading">Morph Diagnostics</h4>

<button class="debug-btn" class:active={slowMoActive} onclick={toggleSlowMo}>
    <span
        class="debug-label"
        data-setting-config-key="DEBUG_MORPH_SLOWMO"
        data-setting-label="Morph Slow-Mo"
        data-setting-description="Slows territory morph timing by 10x for inspection."
        >{slowMoActive ? "10X SLOW-MO ON" : "Normal Speed"}</span
    >
    <span class="debug-hint">{GAME_CONFIG.TERRITORY_TRANSITION_MS}ms</span>
</button>

<label class="toggle-row">
    <input type="checkbox" checked={showVertices} onchange={toggleVertices} />
    <span
        class="var-name"
        data-setting-config-key="DEBUG_MORPH_VERTICES"
        >Show vertex dots</span
    >
    <span class="debug-hint">Pinned vs morph</span>
</label>

{#if showVertices}
    <div class="slider-row">
        <span
            class="slider-label"
            data-setting-config-key="DEBUG_MORPH_VERTEX_COLOR_MODE"
            >Color mode</span
        >
        <select
            class="mode-select"
            value={colorMode}
            onchange={(e) => {
                colorMode = (e.target as HTMLSelectElement).value;
                GAME_CONFIG.DEBUG_MORPH_VERTEX_COLOR_MODE = colorMode;
            }}
        >
            <option value="pinmorph">Pin/Morph</option>
            <option value="owner">Player Color</option>
            <option value="neutral">Neutral Grey</option>
        </select>
    </div>
{/if}

<label class="toggle-row">
    <input type="checkbox" checked={showLabels} onchange={toggleLabels} />
    <span
        class="var-name"
        data-setting-config-key="DEBUG_MORPH_VERTEX_LABELS"
        >Show vertex labels</span
    >
    <span class="debug-hint">Numeric index</span>
</label>

<label class="toggle-row">
    <input type="checkbox" checked={traceLog} onchange={toggleTrace} />
    <span
        class="var-name"
        data-setting-config-key="DEBUG_MORPH_TRACE_LOG"
        >Vertex trace log</span
    >
    <span class="debug-hint">Console output</span>
</label>

<div class="slider-row">
    <span
        class="slider-label"
        data-setting-config-key="DEBUG_MORPH_VERTEX_SIZE"
        >Dot size</span
    >
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
    <span
        class="slider-label"
        data-setting-config-key="DEBUG_MORPH_PIN_THRESHOLD"
        >Pin threshold</span
    >
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
    <span
        class="slider-label"
        data-setting-config-key="DEBUG_MORPH_VERTEX_NTH"
        >Show every</span
    >
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
    <span
        class="slider-label"
        data-setting-config-key="MORPH_CONQUEST_RADIUS"
        >Morph radius</span
    >
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
    <input type="checkbox" checked={dy4DisableFillCrossfade} onchange={() => {
        dy4DisableFillCrossfade = !dy4DisableFillCrossfade;
        GAME_CONFIG.DEBUG_DY4_DISABLE_FILL_CROSSFADE = dy4DisableFillCrossfade;
        updatePanel("debugDy4DisableFillCrossfade", dy4DisableFillCrossfade);
    }} />
    <span
        class="var-name"
        data-setting-config-key="DEBUG_DY4_DISABLE_FILL_CROSSFADE"
        >Disable Fill Crossfade</span
    >
    <span class="debug-hint">Skip alpha morphing</span>
</label>

<label class="toggle-row">
    <input type="checkbox" checked={dy4DisableBorderTransition} onchange={() => {
        dy4DisableBorderTransition = !dy4DisableBorderTransition;
        GAME_CONFIG.DEBUG_DY4_DISABLE_BORDER_TRANSITION = dy4DisableBorderTransition;
        updatePanel("debugDy4DisableBorderTransition", dy4DisableBorderTransition);
    }} />
    <span
        class="var-name"
        data-setting-config-key="DEBUG_DY4_DISABLE_BORDER_TRANSITION"
        >Disable Border Transition</span
    >
    <span class="debug-hint">Snap immediately</span>
</label>

<label class="toggle-row">
    <input type="checkbox" checked={dy4ForceTransitionStart} onchange={() => {
        dy4ForceTransitionStart = !dy4ForceTransitionStart;
        GAME_CONFIG.DEBUG_DY4_FORCE_TRANSITION_START = dy4ForceTransitionStart;
        updatePanel("debugDy4ForceTransitionStart", dy4ForceTransitionStart);
    }} />
    <span
        class="var-name"
        data-setting-config-key="DEBUG_DY4_FORCE_TRANSITION_START"
        >Force Transition Start</span
    >
    <span class="debug-hint">Override checks</span>
</label>

<div class="readout">
    Transition: {GAME_CONFIG.TERRITORY_TRANSITION_MS}ms · Control pts: {GAME_CONFIG.TERRITORY_MORPH_CONTROL_POINTS}
</div>

<h4 class="sub-heading">Diagnostics Panel</h4>

<div class="readout">
    Recorder bundles, perimeter-field scrub, geometry artifact export, conquest package
    export, contact sheets, onion skins, and stroboscopic trails now live in one floating
    Diagnostics panel.
</div>

<div class="snapshot-actions">
    <button class="snapshot-btn" onclick={handleOpenTransitionPanel}>
        Open Diagnostics
    </button>
</div>

<PerfScenarioRunner />

<style>
    @import "./panel-shared.css";

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
    .debug-label {
        color: inherit;
        font-weight: 600;
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
    .toggle-row.is-disabled {
        opacity: 0.45;
        cursor: default;
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
        min-width: 36px;
        text-align: right;
        color: #8cf;
        font-family: monospace;
    }
    .readout {
        margin-top: 6px;
        font-size: 9px;
        color: #666;
        font-family: monospace;
    }
    .snapshot-actions {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        margin-top: 6px;
    }
    .snapshot-btn {
        flex: 1;
        min-width: 90px;
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
