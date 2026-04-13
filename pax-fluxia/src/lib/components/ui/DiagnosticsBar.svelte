<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { diagnosticsUi } from "$lib/territory/devtools/diagnosticsUi";
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

    let overlayEnabled = $state(overlayConfig.enabled);
    let overlayShowVertices = $state(overlayConfig.showAllVertices);
    let overlayShowActiveFront = $state(overlayConfig.showActiveFront);
    let overlayPolylineSamples = $state(overlayConfig.showPolylineSamples);
    let recorderEnabled = $state(transitionSnapshotRecorder.isEnabled());
    let bundleCount = $state(transitionSnapshotRecorder.count);
    let barEl: HTMLDivElement | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const laneStateOptions: Array<{ value: RulerLaneState; label: string }> = [
        { value: "straight", label: "Straight" },
        { value: "bent", label: "Bent" },
        { value: "curved", label: "Curved" },
        { value: "missing", label: "Missing" },
    ];

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

    function closeBar() {
        diagnosticsUi.setOpen(false);
    }

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

    $effect(() => {
        if (!recorderEnabled) return;
        const interval = setInterval(refreshBundleCount, 500);
        return () => clearInterval(interval);
    });

    onMount(() => {
        if (!barEl) return;
        const publishHeight = () => {
            if (!barEl) return;
            diagnosticsUi.setHeight(barEl.getBoundingClientRect().height + 24);
        };
        publishHeight();
        resizeObserver = new ResizeObserver(publishHeight);
        resizeObserver.observe(barEl);
        return () => {
            resizeObserver?.disconnect();
            resizeObserver = null;
            diagnosticsUi.setHeight(0);
        };
    });

    onDestroy(() => {
        resizeObserver?.disconnect();
        resizeObserver = null;
        diagnosticsUi.setHeight(0);
    });
</script>

<div class="diagnostics-bar" bind:this={barEl}>
    <div class="bar-header">
        <div>
            <div class="bar-title">Diagnostics</div>
            <div class="bar-subtitle">
                Lane Margin {GAME_CONFIG.MAPGEN_LANE_MARGIN_PX}px
            </div>
        </div>
        <button class="bar-close" onclick={closeBar} title="Close diagnostics">
            ×
        </button>
    </div>

    <div class="bar-content">
        <section class="diag-section ruler-section">
            <div class="section-head">
                <span>Ruler</span>
                <button
                    class="ruler-toggle"
                    class:active={$rulerTool.enabled}
                    onclick={() => rulerTool.toggle()}
                    title="Toggle ruler"
                >
                    <span class="ruler-icon">📏</span>
                    <span>{$rulerTool.enabled ? "Ruler On" : "Ruler Off"}</span>
                </button>
            </div>

            <div class="ruler-controls">
                <div class="chip-row">
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
                    <button class="chip" onclick={() => rulerTool.setEnabled(false)}>
                        Off
                    </button>
                </div>

                <div class="readout-grid">
                    <div><span>Start</span><strong>{formatPoint($rulerTool.start)}</strong></div>
                    <div><span>End</span><strong>{formatPoint($rulerTool.end)}</strong></div>
                    <div>
                        <span>Distance</span>
                        <strong>{getRulerMeasurement($rulerTool)?.distance?.toFixed(2) ?? "—"} px</strong>
                    </div>
                    <div>
                        <span>Log Count</span>
                        <strong>{$rulerTool.measurements.length}</strong>
                    </div>
                </div>

                <div class="slider-grid">
                    <label>
                        <span>Hitbox</span>
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
                        <strong>{$rulerTool.laneHitboxPx}px</strong>
                    </label>
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
            </div>

            <div class="measure-log">
                {#if $rulerTool.measurements.length === 0}
                    <div class="empty-note">
                        Measurements log here as you place them.
                    </div>
                {:else}
                    {#each [...$rulerTool.measurements].reverse() as measurement (measurement.id)}
                        <div class="measure-item">
                            <div class="measure-meta">
                                <div class="measure-title">{formatMeasurement(measurement)}</div>
                                <div class="measure-subtitle">
                                    {measurement.distance.toFixed(2)} px · LM {measurement.laneMarginPx}px
                                    {#if measurement.relatedLaneLabel}
                                        · {measurement.relatedLaneLabel}
                                    {/if}
                                    · actual {measurement.actualLaneState}
                                </div>
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
        </section>

        <section class="diag-section">
            <div class="section-head">
                <span>Canvas Overlay</span>
            </div>
            <div class="toggle-stack">
                <label><input type="checkbox" checked={overlayEnabled} onchange={toggleOverlay} /> Overlay</label>
                <label><input type="checkbox" checked={overlayShowActiveFront} onchange={toggleOverlayActiveFront} /> Active front</label>
                <label><input type="checkbox" checked={overlayShowVertices} onchange={toggleOverlayVertices} /> Vertices</label>
                <label><input type="checkbox" checked={overlayPolylineSamples} onchange={togglePolylineSamples} /> Polyline samples</label>
            </div>
        </section>

        <section class="diag-section">
            <div class="section-head">
                <span>Snapshot Recorder</span>
                <button
                    class="chip"
                    class:active={recorderEnabled}
                    onclick={toggleRecorder}
                >
                    {recorderEnabled ? "On" : "Off"}
                </button>
            </div>
            <div class="readout-grid compact">
                <div><span>Captures</span><strong>{bundleCount}</strong></div>
                <div><span>Status</span><strong>{recorderEnabled ? "Recording" : "Idle"}</strong></div>
            </div>
            <div class="chip-row">
                <button class="chip" onclick={handleDownloadLatest} disabled={bundleCount === 0}>
                    Latest
                </button>
                <button class="chip" onclick={handleDownloadAll} disabled={bundleCount === 0}>
                    All
                </button>
                <button class="chip danger" onclick={handleClearBundles} disabled={bundleCount === 0}>
                    Clear
                </button>
            </div>
        </section>
    </div>
</div>

<style>
    .diagnostics-bar {
        position: fixed;
        left: 12px;
        right: 12px;
        bottom: 12px;
        z-index: 1200;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px 14px;
        background: rgba(8, 11, 20, 0.92);
        border: 1px solid rgba(120, 220, 255, 0.24);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
        color: #d8efff;
        font-family: "Montserrat", sans-serif;
    }

    .bar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .bar-title {
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #89f1ff;
    }

    .bar-subtitle {
        margin-top: 2px;
        font-size: 0.72rem;
        color: rgba(216, 239, 255, 0.72);
    }

    .bar-close {
        width: 30px;
        height: 30px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.06);
        color: #d8efff;
        font-size: 1rem;
        cursor: pointer;
    }

    .bar-content {
        display: grid;
        grid-template-columns: minmax(420px, 2.2fr) minmax(220px, 1fr) minmax(220px, 1fr);
        gap: 12px;
        align-items: start;
    }

    .diag-section {
        min-height: 100%;
        padding: 10px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #89f1ff;
    }

    .ruler-toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.06);
        color: #d8efff;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
    }

    .ruler-toggle.active {
        border-color: rgba(89, 248, 255, 0.42);
        background: rgba(89, 248, 255, 0.12);
    }

    .ruler-icon {
        font-size: 1.2rem;
    }

    .chip-row,
    .state-chip-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
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

    .chip.danger {
        color: #ffb3b3;
        border-color: rgba(255, 120, 120, 0.24);
    }

    .ruler-controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .readout-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
    }

    .readout-grid.compact {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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

    .slider-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
    }

    .slider-grid label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
    }

    .slider-grid span {
        font-size: 0.66rem;
        color: rgba(216, 239, 255, 0.65);
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .slider-grid strong {
        font-size: 0.74rem;
        color: #ffffff;
    }

    .measure-log {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 180px;
        margin-top: 10px;
        overflow: auto;
        padding-right: 4px;
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
    .empty-note {
        font-size: 0.68rem;
        color: rgba(216, 239, 255, 0.68);
    }

    .toggle-stack {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 0.78rem;
    }

    .toggle-stack label {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .toggle-stack input {
        accent-color: #57f8ff;
    }

    @media (max-width: 1200px) {
        .bar-content {
            grid-template-columns: 1fr;
        }

        .slider-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .readout-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
</style>
