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
    const shaderNeighborMode = $derived(valueOf<string>('gridGradientShaderNeighborMode', 'eight'));
    const shaderMarkSoftness = $derived(valueOf<number>('gridGradientShaderMarkSoftness', 0.18));
    const shaderEdgeSoftnessPx = $derived(valueOf<number>('gridGradientShaderEdgeSoftnessPx', 0.85));
    const shaderNoiseStrength = $derived(valueOf<number>('gridGradientShaderNoiseStrength', 0.35));
    const shaderPulseStrength = $derived(valueOf<number>('gridGradientShaderPulseStrength', 0.06));
    const shaderPulseSpeed = $derived(valueOf<number>('gridGradientShaderPulseSpeed', 3));
    const shaderFieldDriftPx = $derived(valueOf<number>('gridGradientShaderFieldDriftPx', 0));
    const shaderFieldDriftSpeed = $derived(valueOf<number>('gridGradientShaderFieldDriftSpeed', 0.25));
    const shaderGlowStrength = $derived(valueOf<number>('gridGradientShaderGlowStrength', 0.08));
    const shaderInteriorAlphaBoost = $derived(valueOf<number>('gridGradientShaderInteriorAlphaBoost', 1));
    const shaderEdgeAlphaBoost = $derived(valueOf<number>('gridGradientShaderEdgeAlphaBoost', 0.88));
    const shaderColorMixPower = $derived(valueOf<number>('gridGradientShaderColorMixPower', 1));
</script>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Neighbor Mode</span>
        <span class="val">{shaderNeighborMode}</span>
    </div>
    <select
        class="mode-select"
        value={shaderNeighborMode}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_NEIGHBOR_MODE', 'gridGradientShaderNeighborMode', (event.target as HTMLSelectElement).value);
        }}>
        <option value="center">Center</option>
        <option value="cross">Cross</option>
        <option value="eight">Eight</option>
    </select>
</div>

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

<div class="sub-heading">Shader Field FX</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Mark Softness</span>
        <span class="val">{shaderMarkSoftness.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="1.5"
        step="0.01"
        value={shaderMarkSoftness}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_MARK_SOFTNESS', 'gridGradientShaderMarkSoftness', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Edge Feather</span>
        <span class="val">{shaderEdgeSoftnessPx.toFixed(2)}px</span>
    </div>
    <input
        type="range"
        min="0"
        max="8"
        step="0.05"
        value={shaderEdgeSoftnessPx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX', 'gridGradientShaderEdgeSoftnessPx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Noise Roughness</span>
        <span class="val">{shaderNoiseStrength.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.01"
        disabled={cellShape !== 'noise'}
        value={shaderNoiseStrength}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_NOISE_STRENGTH', 'gridGradientShaderNoiseStrength', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Pulse</span>
        <span class="val">{shaderPulseStrength.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={shaderPulseStrength}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_PULSE_STRENGTH', 'gridGradientShaderPulseStrength', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Pulse Speed</span>
        <span class="val">{shaderPulseSpeed.toFixed(2)} rad/s</span>
    </div>
    <input
        type="range"
        min="0"
        max="20"
        step="0.1"
        value={shaderPulseSpeed}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_PULSE_SPEED', 'gridGradientShaderPulseSpeed', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Drift</span>
        <span class="val">{shaderFieldDriftPx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="0"
        max="12"
        step="0.1"
        value={shaderFieldDriftPx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_FIELD_DRIFT_PX', 'gridGradientShaderFieldDriftPx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Drift Speed</span>
        <span class="val">{shaderFieldDriftSpeed.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="8"
        step="0.05"
        value={shaderFieldDriftSpeed}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED', 'gridGradientShaderFieldDriftSpeed', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Glow</span>
        <span class="val">{shaderGlowStrength.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="0.01"
        value={shaderGlowStrength}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_GLOW_STRENGTH', 'gridGradientShaderGlowStrength', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Interior Alpha</span>
        <span class="val">{shaderInteriorAlphaBoost.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="3"
        step="0.01"
        value={shaderInteriorAlphaBoost}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST', 'gridGradientShaderInteriorAlphaBoost', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Edge Alpha</span>
        <span class="val">{shaderEdgeAlphaBoost.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="3"
        step="0.01"
        value={shaderEdgeAlphaBoost}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST', 'gridGradientShaderEdgeAlphaBoost', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Color Gamma</span>
        <span class="val">{shaderColorMixPower.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0.1"
        max="4"
        step="0.01"
        value={shaderColorMixPower}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_COLOR_MIX_POWER', 'gridGradientShaderColorMixPower', parseFloat((event.target as HTMLInputElement).value));
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
    <div class="perf-label">Backend</div>
    <div class="perf-value">{$gridGradientStats.drawBackend}{#if $gridGradientStats.backendFallbackReason} / {$gridGradientStats.backendFallbackReason}{/if}</div>
    <div class="perf-label">Cells</div>
    <div class="perf-value">{$gridGradientStats.paintedCells.toLocaleString()} / {$gridGradientStats.emittableCells.toLocaleString()} / {$gridGradientStats.totalCells.toLocaleString()}</div>
    <div class="perf-label">Spacing</div>
    <div class="perf-value">{$gridGradientStats.requestedSpacingPx.toFixed(1)} / {$gridGradientStats.effectiveSpacingPx.toFixed(1)} px</div>
    <div class="perf-label">Borders</div>
    <div class="perf-value">{$gridGradientStats.vectorBorderCount} vector / {$gridGradientStats.borderDotCount} dots</div>
    <div class="perf-label">Texture</div>
    <div class="perf-value">{$gridGradientStats.textureUploaded ? 'upload' : 'cached'} / {($gridGradientStats.textureBytes / 1024).toFixed(1)} KB</div>
    <div class="perf-label">Frame</div>
    <div class="perf-value">{$gridGradientStats.clockSource} / {$gridGradientStats.visibleFrameState} / {$gridGradientStats.lastUpdateMs.toFixed(2)} ms</div>
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
