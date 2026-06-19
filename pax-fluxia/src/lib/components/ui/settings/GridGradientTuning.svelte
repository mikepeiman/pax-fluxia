<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from '$lib/config/game.config';
    import PaxSettingsRangeRow from '$lib/design-system/components/PaxSettingsRangeRow.svelte';
    import PaxSettingsToggleRow from '$lib/design-system/components/PaxSettingsToggleRow.svelte';
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

    function configNumber(configKey: string, fallback: number): number {
        const value = (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    const spacingPx = $derived(valueOf<number>('gridGradientSpacingPx', 6));
    const maxCells = $derived(valueOf<number>('gridGradientMaxCells', 160000));
    const fillStyle = $derived(valueOf<string>('gridGradientFillStyle', 'pointillist'));
    const centerSizePx = $derived(valueOf<number>('gridGradientCenterSizePx', 10));
    const edgeSizePx = $derived(valueOf<number>('gridGradientEdgeSizePx', 1.5));
    const curvePower = $derived(valueOf<number>('gridGradientCurvePower', 1.6));
    const fillHueShiftDeg = $derived(valueOf<number>('gridGradientFillHueShiftDeg', configNumber('GRID_GRADIENT_FILL_HUE_SHIFT_DEG', 0)));
    const fillSaturation = $derived(valueOf<number>('metaballSaturation', configNumber('METABALL_SATURATION', 1)));
    const fillLightness = $derived(valueOf<number>('metaballLightness', configNumber('METABALL_LIGHTNESS', 1)));
    const fillAlpha = $derived(valueOf<number>('metaballAlpha', configNumber('METABALL_ALPHA', 0.52)));
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
    const pointillistFillActive = $derived(fillStyle === 'pointillist');
    const gridSamplingActive = $derived(pointillistFillActive || borderDotsEnabled);
    const shaderFieldFxActive = $derived(pointillistFillActive && $gridGradientStats.drawBackend === 'shader_field');
    const shaderNoiseActive = $derived(shaderFieldFxActive && cellShape === 'noise');
</script>

<div class="var-row" class:disabled={!shaderFieldFxActive}>
    <div class="row-top">
        <span class="var-name">Shader Neighbor Mode</span>
        <span class="val">{shaderFieldFxActive ? shaderNeighborMode : 'inactive'}</span>
    </div>
    <select
        class="mode-select"
        disabled={!shaderFieldFxActive}
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
        <span class="var-name">Fill Style</span>
        <span class="val">{fillStyle === 'solid' ? 'solid' : 'pointillist'}</span>
    </div>
    <select
        class="mode-select"
        value={fillStyle}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_FILL_STYLE', 'gridGradientFillStyle', (event.target as HTMLSelectElement).value);
        }}>
        <option value="pointillist">Pointillist</option>
        <option value="solid">Solid Fill</option>
    </select>
</div>

<PaxSettingsRangeRow
    label="Grid Spacing"
    value={spacingPx}
    min={2}
    max={32}
    step={0.5}
    disabled={!gridSamplingActive}
    output={gridSamplingActive ? `${spacingPx.toFixed(1)}px` : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SPACING_PX"
    onInput={(value) => writeConfig('GRID_GRADIENT_SPACING_PX', 'gridGradientSpacingPx', value)} />

<PaxSettingsRangeRow
    label="Max Cells"
    value={maxCells}
    min={0}
    max={320000}
    step={5000}
    disabled={!gridSamplingActive}
    output={gridSamplingActive ? Math.round(maxCells).toLocaleString() : 'inactive'}
    settingConfigKey="GRID_GRADIENT_MAX_CELLS"
    onInput={(value) => writeConfig('GRID_GRADIENT_MAX_CELLS', 'gridGradientMaxCells', value)} />

<div class="var-row" class:disabled={!pointillistFillActive}>
    <div class="row-top">
        <span class="var-name">Shape</span>
        <span class="val">{pointillistFillActive ? cellShape : 'inactive'}</span>
    </div>
    <select
        class="mode-select"
        disabled={!pointillistFillActive}
        value={cellShape}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_CELL_SHAPE', 'gridGradientCellShape', (event.target as HTMLSelectElement).value);
        }}>
        <option value="circle">Circle</option>
        <option value="square">Square</option>
        <option value="noise">Noise</option>
    </select>
</div>

<div class="sub-heading">Fill HSLA</div>

<PaxSettingsRangeRow
    label="Hue Shift"
    value={fillHueShiftDeg}
    min={-180}
    max={180}
    step={1}
    output={`${fillHueShiftDeg.toFixed(0)}deg`}
    settingConfigKey="GRID_GRADIENT_FILL_HUE_SHIFT_DEG"
    onInput={(value) => writeConfig('GRID_GRADIENT_FILL_HUE_SHIFT_DEG', 'gridGradientFillHueShiftDeg', value)} />

<PaxSettingsRangeRow
    label="Saturation"
    value={fillSaturation}
    min={0}
    max={3}
    step={0.01}
    output={fillSaturation.toFixed(2)}
    settingConfigKey="METABALL_SATURATION"
    onInput={(value) => writeConfig('METABALL_SATURATION', 'metaballSaturation', value)} />

<PaxSettingsRangeRow
    label="Lightness"
    value={fillLightness}
    min={0}
    max={3}
    step={0.01}
    output={fillLightness.toFixed(2)}
    settingConfigKey="METABALL_LIGHTNESS"
    onInput={(value) => writeConfig('METABALL_LIGHTNESS', 'metaballLightness', value)} />

<PaxSettingsRangeRow
    label="Alpha"
    value={fillAlpha}
    min={0}
    max={1}
    step={0.01}
    output={fillAlpha.toFixed(2)}
    settingConfigKey="METABALL_ALPHA"
    onInput={(value) => writeConfig('METABALL_ALPHA', 'metaballAlpha', value)} />

<div class="sub-heading">Gradient Shape</div>

<PaxSettingsRangeRow
    label="Center Size"
    value={centerSizePx}
    min={1}
    max={48}
    step={0.5}
    disabled={!pointillistFillActive}
    output={pointillistFillActive ? `${centerSizePx.toFixed(1)}px` : 'inactive'}
    settingConfigKey="GRID_GRADIENT_CENTER_SIZE_PX"
    onInput={(value) => writeConfig('GRID_GRADIENT_CENTER_SIZE_PX', 'gridGradientCenterSizePx', value)} />

<PaxSettingsRangeRow
    label="Edge Size"
    value={edgeSizePx}
    min={0.5}
    max={16}
    step={0.5}
    disabled={!pointillistFillActive}
    output={pointillistFillActive ? `${edgeSizePx.toFixed(1)}px` : 'inactive'}
    settingConfigKey="GRID_GRADIENT_EDGE_SIZE_PX"
    onInput={(value) => writeConfig('GRID_GRADIENT_EDGE_SIZE_PX', 'gridGradientEdgeSizePx', value)} />

<PaxSettingsRangeRow
    label="Gradient Curve"
    value={curvePower}
    min={0.1}
    max={6}
    step={0.05}
    disabled={!pointillistFillActive}
    output={pointillistFillActive ? curvePower.toFixed(2) : 'inactive'}
    settingConfigKey="GRID_GRADIENT_CURVE_POWER"
    onInput={(value) => writeConfig('GRID_GRADIENT_CURVE_POWER', 'gridGradientCurvePower', value)} />

<PaxSettingsRangeRow
    label="Border Offset"
    value={borderOffsetPx}
    min={0}
    max={80}
    step={1}
    disabled={!pointillistFillActive}
    output={pointillistFillActive ? `${borderOffsetPx.toFixed(1)}px` : 'inactive'}
    settingConfigKey="GRID_GRADIENT_BORDER_OFFSET_PX"
    onInput={(value) => writeConfig('GRID_GRADIENT_BORDER_OFFSET_PX', 'gridGradientBorderOffsetPx', value)} />

<PaxSettingsRangeRow
    label="Position Jitter"
    value={positionJitter}
    min={0}
    max={0.5}
    step={0.01}
    disabled={!gridSamplingActive}
    output={gridSamplingActive ? positionJitter.toFixed(2) : 'inactive'}
    settingConfigKey="GRID_GRADIENT_POSITION_JITTER"
    onInput={(value) => {
        writeConfig('GRID_GRADIENT_DISTRIBUTION', 'gridGradientDistribution', value > 0 ? 'jittered' : 'square');
        writeConfig('GRID_GRADIENT_POSITION_JITTER', 'gridGradientPositionJitter', value);
    }} />

<div class="sub-heading">Shader Field FX</div>

<PaxSettingsRangeRow
    label="Shader Mark Softness"
    value={shaderMarkSoftness}
    min={0}
    max={1.5}
    step={0.01}
    disabled={!shaderFieldFxActive}
    output={shaderFieldFxActive ? shaderMarkSoftness.toFixed(2) : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SHADER_MARK_SOFTNESS"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_MARK_SOFTNESS', 'gridGradientShaderMarkSoftness', value)} />

<PaxSettingsRangeRow
    label="Edge Feather"
    value={shaderEdgeSoftnessPx}
    min={0}
    max={8}
    step={0.05}
    disabled={!shaderFieldFxActive}
    output={shaderFieldFxActive ? `${shaderEdgeSoftnessPx.toFixed(2)}px` : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX', 'gridGradientShaderEdgeSoftnessPx', value)} />

<PaxSettingsRangeRow
    label="Shader Noise Roughness (Noise)"
    value={shaderNoiseStrength}
    min={0}
    max={2}
    step={0.01}
    disabled={!shaderNoiseActive}
    output={shaderNoiseActive ? shaderNoiseStrength.toFixed(2) : cellShape === 'noise' ? 'inactive' : 'noise only'}
    settingConfigKey="GRID_GRADIENT_SHADER_NOISE_STRENGTH"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_NOISE_STRENGTH', 'gridGradientShaderNoiseStrength', value)} />

<PaxSettingsRangeRow
    label="Shader Pulse"
    value={shaderPulseStrength}
    min={0}
    max={1}
    step={0.01}
    disabled={!shaderFieldFxActive}
    output={shaderFieldFxActive ? shaderPulseStrength.toFixed(2) : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SHADER_PULSE_STRENGTH"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_PULSE_STRENGTH', 'gridGradientShaderPulseStrength', value)} />

<PaxSettingsRangeRow
    label="Shader Pulse Speed"
    value={shaderPulseSpeed}
    min={0}
    max={20}
    step={0.1}
    disabled={!shaderFieldFxActive}
    output={shaderFieldFxActive ? `${shaderPulseSpeed.toFixed(2)} rad/s` : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SHADER_PULSE_SPEED"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_PULSE_SPEED', 'gridGradientShaderPulseSpeed', value)} />

<PaxSettingsRangeRow
    label="Shader Drift"
    value={shaderFieldDriftPx}
    min={0}
    max={12}
    step={0.1}
    disabled={!shaderFieldFxActive}
    output={shaderFieldFxActive ? `${shaderFieldDriftPx.toFixed(1)}px` : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SHADER_FIELD_DRIFT_PX"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_FIELD_DRIFT_PX', 'gridGradientShaderFieldDriftPx', value)} />

<PaxSettingsRangeRow
    label="Shader Drift Speed"
    value={shaderFieldDriftSpeed}
    min={0}
    max={8}
    step={0.05}
    disabled={!shaderFieldFxActive}
    output={shaderFieldFxActive ? shaderFieldDriftSpeed.toFixed(2) : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED', 'gridGradientShaderFieldDriftSpeed', value)} />

<PaxSettingsRangeRow
    label="Shader Glow"
    value={shaderGlowStrength}
    min={0}
    max={2}
    step={0.01}
    disabled={!shaderFieldFxActive}
    output={shaderFieldFxActive ? shaderGlowStrength.toFixed(2) : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SHADER_GLOW_STRENGTH"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_GLOW_STRENGTH', 'gridGradientShaderGlowStrength', value)} />

<PaxSettingsRangeRow
    label="Shader Interior Alpha"
    value={shaderInteriorAlphaBoost}
    min={0}
    max={3}
    step={0.01}
    disabled={!shaderFieldFxActive}
    output={shaderFieldFxActive ? shaderInteriorAlphaBoost.toFixed(2) : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST', 'gridGradientShaderInteriorAlphaBoost', value)} />

<PaxSettingsRangeRow
    label="Shader Edge Alpha"
    value={shaderEdgeAlphaBoost}
    min={0}
    max={3}
    step={0.01}
    disabled={!shaderFieldFxActive}
    output={shaderFieldFxActive ? shaderEdgeAlphaBoost.toFixed(2) : 'inactive'}
    settingConfigKey="GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST"
    onInput={(value) => writeConfig('GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST', 'gridGradientShaderEdgeAlphaBoost', value)} />

<div class="sub-heading">Borders</div>

<PaxSettingsToggleRow
    label="Vector borders"
    checked={vectorBordersEnabled}
    settingConfigKey="GRID_GRADIENT_VECTOR_BORDERS_ENABLED"
    onChange={(checked) => writeConfig('GRID_GRADIENT_VECTOR_BORDERS_ENABLED', 'gridGradientVectorBordersEnabled', checked)} />

<PaxSettingsToggleRow
    label="Border dots"
    checked={borderDotsEnabled}
    settingConfigKey="GRID_GRADIENT_BORDER_DOTS_ENABLED"
    onChange={(checked) => writeConfig('GRID_GRADIENT_BORDER_DOTS_ENABLED', 'gridGradientBorderDotsEnabled', checked)} />

<PaxSettingsRangeRow
    label="Dot Size"
    value={borderDotSizePx}
    min={0.5}
    max={20}
    step={0.5}
    disabled={!borderDotsEnabled}
    output={`${borderDotSizePx.toFixed(1)}px`}
    settingConfigKey="GRID_GRADIENT_BORDER_DOT_SIZE_PX"
    onInput={(value) => writeConfig('GRID_GRADIENT_BORDER_DOT_SIZE_PX', 'gridGradientBorderDotSizePx', value)} />

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
    <div class="perf-label">Fill</div>
    <div class="perf-value">{$gridGradientStats.fillStyle}</div>
    <div class="perf-label">Cells</div>
    <div class="perf-value">{$gridGradientStats.paintedCells.toLocaleString()} / {$gridGradientStats.emittableCells.toLocaleString()} / {$gridGradientStats.totalCells.toLocaleString()}</div>
    <div class="perf-label">Active/Drawable/Mix/Offset</div>
    <div class="perf-value">{$gridGradientStats.activeTransitionCells.toLocaleString()} / {$gridGradientStats.activeDrawableTransitionCells.toLocaleString()} / {$gridGradientStats.activeMixingTransitionCells.toLocaleString()} / {$gridGradientStats.activeOffsetZoneTransitionCells.toLocaleString()}</div>
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

    .sub-heading {
        margin: 12px 0 6px;
        color: rgba(128, 222, 255, 0.92);
        font-size: 10px;
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0;
        text-transform: uppercase;
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
