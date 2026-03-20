<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-DEBUG -- Morph diagnostic controls

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

    function toggleSlowMo() {
        slowMoActive = !slowMoActive;
        GAME_CONFIG.DEBUG_MORPH_SLOWMO = slowMoActive;
        // Apply 10X multiplier immediately
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
</script>

<CategoryThemeBar category="debug" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">🔬 Morph Diagnostics</h4>

<!-- Slow-Mo Toggle -->
<button class="debug-btn" class:active={slowMoActive} onclick={toggleSlowMo}>
    {slowMoActive ? "🐢 10X SLOW-MO ON" : "⏱️ Normal Speed"}
    <span class="debug-hint">
        {GAME_CONFIG.TERRITORY_TRANSITION_MS}ms
    </span>
</button>

<!-- Vertex Debug Overlay -->
<label class="toggle-row">
    <input type="checkbox" checked={showVertices} onchange={toggleVertices} />
    <span>Show vertex dots</span>
    <span class="debug-hint">🟢 pinned · 🔴 morph</span>
</label>

<!-- Trace Log -->
<label class="toggle-row">
    <input type="checkbox" checked={traceLog} onchange={toggleTrace} />
    <span>Vertex trace log</span>
    <span class="debug-hint">Console per-vertex displacement</span>
</label>

<!-- Vertex Dot Size -->
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

<!-- Pin Threshold -->
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

<!-- Label every Nth vertex -->
<div class="slider-row">
    <span class="slider-label">Label every</span>
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
    <span class="slider-value"
        >{vertexNth === 1 ? "all" : `${vertexNth}th`}</span
    >
</div>

<!-- Current Transition MS readout -->
<div class="readout">
    Transition: {GAME_CONFIG.TERRITORY_TRANSITION_MS}ms · Control pts: {GAME_CONFIG.TERRITORY_MORPH_CONTROL_POINTS}
</div>

<style>
    @import "./panel-shared.css";

    .sub-heading {
        margin: 4px 0 6px;
        font-size: 11px;
        color: #8cf;
        letter-spacing: 0.5px;
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
</style>
