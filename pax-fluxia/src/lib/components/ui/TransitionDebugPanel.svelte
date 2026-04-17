<script lang="ts">
    import { transitionSnapshotRecorder } from '$lib/territory/devtools/TransitionSnapshotRecorder';
    import type { TransitionDebugBundle } from '$lib/territory/devtools/TransitionSnapshotRecorder';
    import {
        downloadAllBundles,
        downloadAllDiagnosticPackages,
        downloadBundle,
        downloadDiagnosticPackage,
    } from '$lib/territory/devtools/TransitionBundleSerializer';
    import { overlayConfig } from '$lib/territory/devtools/overlayConfig';
    import { getRulerMeasurement, rulerTool } from '$lib/territory/devtools/rulerTool';
    import PerimeterFieldDiagnosticsPanel from '$lib/components/ui/PerimeterFieldDiagnosticsPanel.svelte';

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    // ── Live overlay state ─────────────────────────────────────────────────
    let overlayEnabled = $state(overlayConfig.enabled);
    let overlayShowVertices = $state(overlayConfig.showAllVertices);
    let overlayShowActiveFront = $state(overlayConfig.showActiveFront);
    let overlayPolylineSamples = $state(overlayConfig.showPolylineSamples);

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

    function toggleRuler() {
        rulerTool.toggle();
    }

    function clearRuler() {
        rulerTool.clear();
    }

    function setRulerColor(key: 'h' | 's' | 'l' | 'a', value: string) {
        rulerTool.setColor(key, Number(value));
    }

    function formatPoint(point: { x: number; y: number; snapKind: string; starId?: string; laneLabel?: string } | null): string {
        if (!point) return 'unset';
        const base = `${point.x.toFixed(1)}, ${point.y.toFixed(1)} (${point.snapKind})`;
        if (point.starId) return `${base} • ${point.starId}`;
        if (point.laneLabel) return `${base} • ${point.laneLabel}`;
        return base;
    }

    // ── Recorder state ─────────────────────────────────────────────────────
    let recorderEnabled = $state(transitionSnapshotRecorder.isEnabled());
    let bundles = $state<TransitionDebugBundle[]>([]);
    let downloading = $state<string | null>(null);

    function toggleRecorder() {
        recorderEnabled = !recorderEnabled;
        transitionSnapshotRecorder.setEnabled(recorderEnabled);
    }

    function refreshBundles() {
        bundles = [...transitionSnapshotRecorder.getBundles()].reverse();
    }

    function clearBundles() {
        transitionSnapshotRecorder.clear();
        bundles = [];
    }

    async function downloadOne(bundle: TransitionDebugBundle) {
        downloading = bundle.id;
        try {
            await downloadBundle(bundle, bundle.starPositions);
        } finally {
            downloading = null;
        }
    }

    async function packageOne(bundle: TransitionDebugBundle) {
        downloading = `pkg:${bundle.id}`;
        try {
            await downloadDiagnosticPackage(bundle);
        } finally {
            downloading = null;
        }
    }

    async function downloadAll() {
        downloading = '__all__';
        try {
            const all = [...transitionSnapshotRecorder.getBundles()];
            await downloadAllBundles(all, all[0]?.starPositions ?? new Map());
        } finally {
            downloading = null;
        }
    }

    async function packageAll() {
        downloading = '__pkg_all__';
        try {
            const all = [...transitionSnapshotRecorder.getBundles()];
            await downloadAllDiagnosticPackages(all);
        } finally {
            downloading = null;
        }
    }

    // ── Refresh on mount and periodically ─────────────────────────────────
    $effect(() => {
        refreshBundles();
        const interval = setInterval(refreshBundles, 1000);
        return () => clearInterval(interval);
    });

    // ── Frame count label helper ───────────────────────────────────────────
    function frameLabel(bundle: TransitionDebugBundle): string {
        if (!bundle.transitionFrames) return 'no frames';
        return `${bundle.transitionFrames.length} frames`;
    }

    function conquestLabel(bundle: TransitionDebugBundle): string {
        const evt = bundle.conquestEvents[0];
        if (!evt) return '?';
        return `★${evt.starId} ${evt.previousOwner}→${evt.newOwner}`;
    }

    function timeLabel(bundle: TransitionDebugBundle): string {
        return bundle.timestamp.slice(11, 19); // HH:MM:SS
    }
</script>

<!-- Backdrop click-through trap -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<div class="panel-outer" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="panel">
        <!-- Header bar -->
        <div class="panel-header">
            <span class="panel-title">Diagnostics</span>
            <button class="close-btn" onclick={onClose} title="Close">✕</button>
        </div>

        <section class="section">
            <div class="section-title">What This Panel Owns</div>
            <div class="info-text">
                This is now the single diagnostics surface. Use it for live overlay
                toggles, ruler, recorder bundles, perimeter-field scrub, geometry
                artifact export, conquest package export, and contact-sheet export.
            </div>
        </section>

        <!-- Live overlay section -->
        <section class="section">
            <div class="section-title">Live Canvas Overlay</div>
            <div class="row">
                <label class="toggle-label">
                    <input type="checkbox" checked={overlayEnabled} onchange={toggleOverlay} />
                    <span class="toggle-text" class:active={overlayEnabled}>
                        {overlayEnabled ? 'Overlay ON' : 'Overlay OFF'}
                    </span>
                </label>
            </div>
            {#if overlayEnabled}
                <div class="sub-toggles">
                    <label class="toggle-label small">
                        <input type="checkbox" checked={overlayShowActiveFront} onchange={toggleOverlayActiveFront} />
                        <span class="toggle-text small">Active front bridge + anchors + gold sections</span>
                    </label>
                    <label class="toggle-label small">
                        <input type="checkbox" checked={overlayShowVertices} onchange={toggleOverlayVertices} />
                        <span class="toggle-text small">Structural vertices (junctions, etc.)</span>
                    </label>
                    <label class="toggle-label small">
                        <input type="checkbox" checked={overlayPolylineSamples} onchange={togglePolylineSamples} />
                        <span class="toggle-text small">Polyline samples (curve interior points)</span>
                    </label>
                </div>
                <div class="overlay-legend">
                    <span class="ol-dot" style="background:#ffb000"></span><span>Active front sections</span>
                    <span class="ol-dot" style="background:#44ff66"></span><span>AF bridge (anchor pair)</span>
                    <span class="ol-dot" style="background:#00ffff"></span><span>Change anchors (⚓)</span>
                    <span class="ol-dot" style="background:#9999cc"></span><span>Structural vertices only</span>
                    <span class="ol-dot" style="background:#cc88ff"></span><span>Polyline samples</span>
                </div>
            {/if}
        </section>

        <section class="section">
            <div class="section-title">Ruler</div>
            <div class="row">
                <label class="toggle-label">
                    <input type="checkbox" checked={$rulerTool.enabled} onchange={toggleRuler} />
                    <span class="toggle-text" class:active={$rulerTool.enabled}>
                        {$rulerTool.enabled ? 'Ruler ON' : 'Ruler OFF'}
                    </span>
                </label>
                <button
                    class="action-btn small"
                    disabled={!$rulerTool.start && !$rulerTool.end}
                    onclick={clearRuler}
                >
                    Clear
                </button>
            </div>
            <div class="info-text">
                Click the canvas to place start and end vertices. Star hitbox wins first, then nearest lane point inside the lane hitbox.
            </div>
            <div class="ruler-readout">
                <div><span>Start</span><span>{formatPoint($rulerTool.start)}</span></div>
                <div><span>End</span><span>{formatPoint($rulerTool.end)}</span></div>
                {#if getRulerMeasurement($rulerTool)}
                    <div><span>Distance</span><span>{getRulerMeasurement($rulerTool)?.distance.toFixed(2)} px</span></div>
                    <div><span>Δx / Δy</span><span>{getRulerMeasurement($rulerTool)?.dx.toFixed(2)} / {getRulerMeasurement($rulerTool)?.dy.toFixed(2)}</span></div>
                {:else if $rulerTool.start}
                    <div><span>Status</span><span>Awaiting end point</span></div>
                {/if}
            </div>
            <div class="ruler-controls">
                <label>
                    <span>H</span>
                    <input type="range" min="0" max="360" value={$rulerTool.color.h} oninput={(e) => setRulerColor('h', (e.currentTarget as HTMLInputElement).value)} />
                    <strong>{$rulerTool.color.h.toFixed(0)}°</strong>
                </label>
                <label>
                    <span>S</span>
                    <input type="range" min="0" max="100" value={$rulerTool.color.s} oninput={(e) => setRulerColor('s', (e.currentTarget as HTMLInputElement).value)} />
                    <strong>{$rulerTool.color.s.toFixed(0)}%</strong>
                </label>
                <label>
                    <span>L</span>
                    <input type="range" min="0" max="100" value={$rulerTool.color.l} oninput={(e) => setRulerColor('l', (e.currentTarget as HTMLInputElement).value)} />
                    <strong>{$rulerTool.color.l.toFixed(0)}%</strong>
                </label>
                <label>
                    <span>A</span>
                    <input type="range" min="0.05" max="1" step="0.01" value={$rulerTool.color.a} oninput={(e) => setRulerColor('a', (e.currentTarget as HTMLInputElement).value)} />
                    <strong>{$rulerTool.color.a.toFixed(2)}</strong>
                </label>
            </div>
        </section>

        <!-- Recorder section -->
        <section class="section">
            <div class="section-title">Legacy Transition Recorder</div>
            <div class="row">
                <label class="toggle-label">
                    <input type="checkbox" checked={recorderEnabled} onchange={toggleRecorder} />
                    <span class="toggle-text" class:active={recorderEnabled}>
                        {recorderEnabled ? 'Recording' : 'Disabled'}
                    </span>
                </label>
                <div class="bundle-count">{bundles.length} bundle{bundles.length !== 1 ? 's' : ''}</div>
            </div>
            <div class="info-text">
                This recorder feeds the older transition bundle exports that produce
                the legacy `prev.png` / `next.png` package.
            </div>
            <div class="info-text">
                Use the perimeter-field section below for scrub controls, geometry
                artifact export, conquest package export, contact sheets, onion
                skins, and stroboscopic trails.
            </div>
        </section>

        <!-- Actions section -->
        <section class="section">
            <div class="section-title">Actions</div>
            <div class="btn-row">
                <button class="action-btn" onclick={refreshBundles}>Refresh</button>
                <button
                    class="action-btn primary"
                    disabled={bundles.length === 0 || downloading !== null}
                    onclick={packageAll}
                >
                    {downloading === '__pkg_all__' ? 'Packaging…' : 'Legacy Package All'}
                </button>
                <button
                    class="action-btn"
                    disabled={bundles.length === 0 || downloading !== null}
                    onclick={downloadAll}
                >
                    {downloading === '__all__' ? 'Downloading…' : 'Legacy Download All'}
                </button>
                <button
                    class="action-btn danger"
                    disabled={bundles.length === 0}
                    onclick={clearBundles}
                >
                    Clear
                </button>
            </div>
        </section>

        <section class="section">
            <PerimeterFieldDiagnosticsPanel />
        </section>

        <!-- Bundle list -->
        <section class="section bundles-section">
            <div class="section-title">Legacy Bundles (newest first)</div>
            {#if bundles.length === 0}
                <div class="empty-state">
                    {recorderEnabled
                        ? 'Waiting for conquest events…'
                        : 'Enable recorder to capture conquest data.'}
                </div>
            {:else}
                <div class="bundle-list">
                    {#each bundles as bundle (bundle.id)}
                        <div class="bundle-item">
                            <div class="bundle-meta">
                                <span class="bundle-time">{timeLabel(bundle)}</span>
                                <span class="bundle-conquest">{conquestLabel(bundle)}</span>
                                <span class="bundle-frames">{frameLabel(bundle)}</span>
                            </div>
                            <div class="bundle-actions">
                                <button
                                    class="action-btn small primary"
                                    disabled={downloading === `pkg:${bundle.id}`}
                                    onclick={() => packageOne(bundle)}
                                    title="Download one ZIP package"
                                >
                                    {downloading === `pkg:${bundle.id}` ? '…' : 'Pkg'}
                                </button>
                                <button
                                    class="action-btn small"
                                    disabled={downloading === bundle.id}
                                    onclick={() => downloadOne(bundle)}
                                    title="Download loose files"
                                >
                                    {downloading === bundle.id ? '…' : 'DL'}
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <!-- Legend -->
        <section class="section legend-section">
            <div class="section-title">Frame legend</div>
            <div class="legend-grid">
                <span class="legend-dot" style="background:#ffb000"></span><span>Active front sections</span>
                <span class="legend-dot" style="background:#00ffff"></span><span>Change anchors (⚓)</span>
                <span class="legend-dot" style="background:rgba(255,155,0,0.55)"></span><span>Motion trail (swept area)</span>
                <span class="legend-dot" style="background:rgba(160,160,210,0.85)"></span><span>All frontier vertices</span>
                <span class="legend-dot" style="background:rgba(255,80,80,0.7)"></span><span>Collapsing regions (✕)</span>
            </div>
        </section>
    </div>
</div>

<style>
    .panel-outer {
        position: fixed;
        inset: 0;
        z-index: 500;
        pointer-events: none;
    }

    .panel {
        position: fixed;
        bottom: 64px;
        right: 12px;
        width: min(440px, calc(100vw - 24px));
        max-height: calc(100vh - 80px);
        overflow-y: auto;
        background: rgba(12, 12, 22, 0.92);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(180, 130, 255, 0.25);
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7), 0 0 24px rgba(180, 130, 255, 0.08);
        color: rgba(220, 220, 240, 0.9);
        font-family: 'Exo', sans-serif;
        font-size: 0.78rem;
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    /* Scrollbar */
    .panel::-webkit-scrollbar { width: 4px; }
    .panel::-webkit-scrollbar-track { background: transparent; }
    .panel::-webkit-scrollbar-thumb { background: rgba(180, 130, 255, 0.3); border-radius: 2px; }

    /* Header */
    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px 8px;
        border-bottom: 1px solid rgba(180, 130, 255, 0.18);
        background: rgba(180, 130, 255, 0.07);
        border-radius: 10px 10px 0 0;
        position: sticky;
        top: 0;
        z-index: 2;
    }

    .panel-title {
        font-weight: 700;
        font-size: 0.82rem;
        letter-spacing: 0.06em;
        color: rgba(200, 175, 255, 0.95);
        text-transform: uppercase;
    }

    .close-btn {
        background: none;
        border: none;
        color: rgba(220, 220, 240, 0.45);
        cursor: pointer;
        font-size: 0.85rem;
        padding: 2px 4px;
        border-radius: 4px;
        transition: color 0.15s;
    }

    .close-btn:hover { color: rgba(255, 255, 255, 0.9); }

    /* Sections */
    .section {
        padding: 10px 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .section:last-child { border-bottom: none; }

    .section-title {
        font-size: 0.67rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(180, 130, 255, 0.7);
        margin-bottom: 8px;
    }

    /* Toggle row */
    .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
    }

    .toggle-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }

    .toggle-label input[type="checkbox"] {
        accent-color: rgba(180, 130, 255, 0.9);
        width: 14px;
        height: 14px;
    }

    .toggle-text {
        color: rgba(180, 180, 200, 0.7);
        font-size: 0.78rem;
    }

    .toggle-text.active {
        color: rgba(140, 255, 140, 0.9);
        font-weight: 600;
    }

    .toggle-text.small { font-size: 0.72rem; }

    .sub-toggles {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 4px 0 6px 18px;
    }

    .overlay-legend {
        display: grid;
        grid-template-columns: 10px 1fr;
        gap: 3px 7px;
        align-items: center;
        font-size: 0.65rem;
        color: rgba(160, 160, 180, 0.7);
        margin-top: 6px;
        margin-left: 4px;
    }

    .ol-dot {
        width: 8px;
        height: 8px;
        border-radius: 2px;
        display: inline-block;
        justify-self: center;
    }

    .bundle-count {
        font-size: 0.72rem;
        color: rgba(180, 130, 255, 0.6);
        font-weight: 600;
    }

    .info-text {
        font-size: 0.68rem;
        color: rgba(160, 160, 180, 0.6);
        line-height: 1.45;
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

    .ruler-controls input[type="range"] {
        width: 100%;
    }

    .ruler-controls strong {
        min-width: 44px;
        text-align: right;
        font-size: 0.64rem;
        color: rgba(200, 175, 255, 0.9);
        font-family: monospace;
    }

    /* Buttons */
    .btn-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .action-btn {
        padding: 5px 10px;
        border-radius: 5px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.06);
        color: rgba(220, 220, 240, 0.8);
        font-size: 0.73rem;
        font-family: 'Exo', sans-serif;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
    }

    .action-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.3);
    }

    .action-btn.primary {
        border-color: rgba(180, 130, 255, 0.35);
        background: rgba(180, 130, 255, 0.1);
        color: rgba(200, 175, 255, 0.9);
    }

    .action-btn.primary:hover:not(:disabled) {
        background: rgba(180, 130, 255, 0.22);
        border-color: rgba(180, 130, 255, 0.6);
        box-shadow: 0 0 8px rgba(180, 130, 255, 0.15);
    }

    .action-btn.danger {
        border-color: rgba(255, 80, 80, 0.3);
        color: rgba(255, 130, 130, 0.8);
    }

    .action-btn.danger:hover:not(:disabled) {
        background: rgba(255, 80, 80, 0.1);
        border-color: rgba(255, 80, 80, 0.5);
    }

    .action-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .action-btn.small {
        padding: 3px 8px;
        font-size: 0.68rem;
    }

    /* Bundle list */
    .bundles-section {
        max-height: 240px;
        overflow-y: auto;
    }

    .bundle-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .bundle-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 5px 8px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 5px;
    }

    .bundle-meta {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
    }

    .bundle-actions {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .bundle-time {
        font-size: 0.65rem;
        color: rgba(180, 180, 200, 0.55);
        font-family: monospace;
    }

    .bundle-conquest {
        font-size: 0.72rem;
        color: rgba(220, 220, 240, 0.85);
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .bundle-frames {
        font-size: 0.62rem;
        color: rgba(140, 255, 180, 0.55);
        font-family: monospace;
    }

    .empty-state {
        text-align: center;
        padding: 16px 0;
        color: rgba(160, 160, 180, 0.45);
        font-size: 0.72rem;
        font-style: italic;
    }

    /* Legend */

    .legend-grid {
        display: grid;
        grid-template-columns: 14px 1fr;
        gap: 4px 8px;
        align-items: center;
        font-size: 0.68rem;
        color: rgba(160, 160, 180, 0.75);
    }

    .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 2px;
        display: inline-block;
        justify-self: center;
    }
</style>
