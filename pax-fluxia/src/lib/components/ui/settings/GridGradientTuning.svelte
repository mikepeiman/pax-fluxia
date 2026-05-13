<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import { gridGradientStats } from '$lib/territory/families/gridGradient/gridGradientStats';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
    }

    function valueOf<T>(panelKey: string, fallback: T): T {
        return (panel[panelKey] ?? fallback) as T;
    }

    const spacingPx = $derived(valueOf<number>('gridGradientSpacingPx', 6));
    const maxCells = $derived(valueOf<number>('gridGradientMaxCells', 160000));
    const centerSizePx = $derived(valueOf<number>('gridGradientCenterSizePx', 10));
    const edgeSizePx = $derived(valueOf<number>('gridGradientEdgeSizePx', 1.5));
    const curvePower = $derived(valueOf<number>('gridGradientCurvePower', 1.6));
    const borderOffsetPx = $derived(valueOf<number>('gridGradientBorderOffsetPx', 0));
    const positionJitter = $derived(valueOf<number>('gridGradientPositionJitter', 0));
    const cellShape = $derived(valueOf<string>('gridGradientCellShape', 'circle'));
    const vectorBordersEnabled = $derived(valueOf<boolean>('gridGradientVectorBordersEnabled', true));
    const borderDotsEnabled = $derived(valueOf<boolean>('gridGradientBorderDotsEnabled', false));
    const borderDotSizePx = $derived(valueOf<number>('gridGradientBorderDotSizePx', 2.5));
    const borderDotStyle = $derived(valueOf<string>('gridGradientBorderDotStyle', 'blended'));
</script>

<div class="sub-heading">Grid Fill</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Grid Spacing</span>
        <span class="val">{spacingPx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="2"
        max="32"
        step="0.5"
        value={spacingPx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SPACING_PX', 'gridGradientSpacingPx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Max Cells</span>
        <span class="val">{Math.round(maxCells).toLocaleString()}</span>
    </div>
    <input
        type="range"
        min="0"
        max="320000"
        step="5000"
        value={maxCells}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_MAX_CELLS', 'gridGradientMaxCells', parseInt((event.target as HTMLInputElement).value, 10));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shape</span>
        <span class="val">{cellShape}</span>
    </div>
    <select
        class="mode-select"
        value={cellShape}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_CELL_SHAPE', 'gridGradientCellShape', (event.target as HTMLSelectElement).value);
        }}>
        <option value="circle">Circle</option>
        <option value="square">Square</option>
        <option value="noise">Noise</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Center Size</span>
        <span class="val">{centerSizePx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="1"
        max="48"
        step="0.5"
        value={centerSizePx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_CENTER_SIZE_PX', 'gridGradientCenterSizePx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Edge Size</span>
        <span class="val">{edgeSizePx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="0.5"
        max="16"
        step="0.5"
        value={edgeSizePx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_EDGE_SIZE_PX', 'gridGradientEdgeSizePx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Gradient Curve</span>
        <span class="val">{curvePower.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0.1"
        max="6"
        step="0.05"
        value={curvePower}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_CURVE_POWER', 'gridGradientCurvePower', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Border Offset</span>
        <span class="val">{borderOffsetPx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="0"
        max="80"
        step="1"
        value={borderOffsetPx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_BORDER_OFFSET_PX', 'gridGradientBorderOffsetPx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Position Jitter</span>
        <span class="val">{positionJitter.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="0.5"
        step="0.01"
        value={positionJitter}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_DISTRIBUTION', 'gridGradientDistribution', parseFloat((event.target as HTMLInputElement).value) > 0 ? 'jittered' : 'square');
            writeConfig('GRID_GRADIENT_POSITION_JITTER', 'gridGradientPositionJitter', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="sub-heading">Borders</div>

<label class="toggle-line">
    <input
        type="checkbox"
        checked={vectorBordersEnabled}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_VECTOR_BORDERS_ENABLED', 'gridGradientVectorBordersEnabled', (event.target as HTMLInputElement).checked);
        }} />
    <span>Vector borders</span>
</label>

<label class="toggle-line">
    <input
        type="checkbox"
        checked={borderDotsEnabled}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_BORDER_DOTS_ENABLED', 'gridGradientBorderDotsEnabled', (event.target as HTMLInputElement).checked);
        }} />
    <span>Border dots</span>
</label>

<div class="var-row" class:disabled={!borderDotsEnabled}>
    <div class="row-top">
        <span class="var-name">Dot Size</span>
        <span class="val">{borderDotSizePx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="0.5"
        max="20"
        step="0.5"
        disabled={!borderDotsEnabled}
        value={borderDotSizePx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_BORDER_DOT_SIZE_PX', 'gridGradientBorderDotSizePx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row" class:disabled={!borderDotsEnabled}>
    <div class="row-top">
        <span class="var-name">Dot Style</span>
        <span class="val">{borderDotStyle}</span>
    </div>
    <select
        class="mode-select"
        disabled={!borderDotsEnabled}
        value={borderDotStyle}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_BORDER_DOT_STYLE', 'gridGradientBorderDotStyle', (event.target as HTMLSelectElement).value);
        }}>
        <option value="blended">Blended</option>
        <option value="butted">Butted</option>
    </select>
</div>

<div class="sub-heading">Live Stats</div>
<div class="perf-grid">
    <div class="perf-label">Cells</div>
    <div class="perf-value">{$gridGradientStats.paintedCells.toLocaleString()} / {$gridGradientStats.emittableCells.toLocaleString()} / {$gridGradientStats.totalCells.toLocaleString()}</div>
    <div class="perf-label">Spacing</div>
    <div class="perf-value">{$gridGradientStats.requestedSpacingPx.toFixed(1)} / {$gridGradientStats.effectiveSpacingPx.toFixed(1)} px</div>
    <div class="perf-label">Borders</div>
    <div class="perf-value">{$gridGradientStats.vectorBorderCount} vector / {$gridGradientStats.borderDotCount} dots</div>
    <div class="perf-label">Frame</div>
    <div class="perf-value">{$gridGradientStats.lastUpdateMs.toFixed(2)} ms / EMA {$gridGradientStats.emaUpdateMs.toFixed(2)} ms</div>
</div>

<style>
    @import "./panel-shared.css";

    .sub-heading {
        margin: 12px 0 6px;
        color: rgba(128, 222, 255, 0.92);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
    }

    .toggle-line {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        color: rgba(240, 244, 248, 0.9);
        font-size: 12px;
    }

    .var-row.disabled {
        opacity: 0.55;
    }

    .perf-grid {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 6px 14px;
        align-items: baseline;
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(7, 12, 24, 0.4);
        font-size: 11px;
    }

    .perf-label {
        color: rgba(220, 232, 245, 0.7);
        letter-spacing: 0;
    }

    .perf-value {
        color: rgba(248, 250, 252, 0.95);
        font-variant-numeric: tabular-nums;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
</style>
