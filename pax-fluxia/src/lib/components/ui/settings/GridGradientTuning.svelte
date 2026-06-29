<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from '$lib/config/game.config';
    import PaxSettingsRangeRow from '$lib/design-system/components/PaxSettingsRangeRow.svelte';
    import PaxSettingsSegmentedRow from '$lib/design-system/components/PaxSettingsSegmentedRow.svelte';
    import PaxSettingsToggleRow from '$lib/design-system/components/PaxSettingsToggleRow.svelte';
    import {
        PaxHudSegmentedControl,
        PaxInfoHint,
        type PaxHudSegmentedOption,
    } from '$lib/design-system';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import { gridGradientStats } from '$lib/territory/families/gridGradient/gridGradientStats';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    type GridGradientModuleId = 'all' | 'fill' | 'color' | 'shape' | 'shader' | 'borders';

    const GRID_GRADIENT_MODULE_PANEL_KEY = 'gridGradientModuleVisibility';
    const GRID_GRADIENT_MODULE_OPTIONS: PaxHudSegmentedOption[] = [
        { value: 'all', label: 'All' },
        { value: 'fill', label: 'Fill' },
        { value: 'color', label: 'Color' },
        { value: 'shape', label: 'Shape' },
        { value: 'shader', label: 'Shader FX' },
        { value: 'borders', label: 'Borders' },
    ];

    let activeModule = $derived(
        (panel[GRID_GRADIENT_MODULE_PANEL_KEY] ?? 'all') as GridGradientModuleId,
    );

    function showModule(id: Exclude<GridGradientModuleId, 'all'>): boolean {
        return activeModule === 'all' || activeModule === id;
    }

    function setActiveModule(value: GridGradientModuleId): void {
        updatePanel(GRID_GRADIENT_MODULE_PANEL_KEY, value);
    }

    const SHADER_NEIGHBOR_OPTIONS = [
        { value: 'center', label: 'Center' },
        { value: 'cross', label: 'Cross' },
        { value: 'eight', label: 'Eight' },
    ];
    const FILL_STYLE_OPTIONS = [
        { value: 'pointillist', label: 'Pointillist' },
        { value: 'solid', label: 'Solid' },
    ];
    const GRID_CELL_SHAPE_OPTIONS = [
        { value: 'circle', label: 'Circle' },
        { value: 'square', label: 'Square' },
        { value: 'noise', label: 'Noise' },
    ];
    const BORDER_DOT_STYLE_OPTIONS = [
        { value: 'blended', label: 'Blended' },
        { value: 'butted', label: 'Butted' },
    ];

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
    const fillSaturation = $derived(valueOf<number>('territorySurfaceSaturation', configNumber('TERRITORY_SURFACE_SATURATION', 1)));
    const fillLightness = $derived(valueOf<number>('territorySurfaceLightness', configNumber('TERRITORY_SURFACE_LIGHTNESS', 1)));
    const fillAlpha = $derived(valueOf<number>('territorySurfaceAlpha', configNumber('TERRITORY_SURFACE_ALPHA', 0.52)));
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

<div class="module-head">
    <PaxInfoHint
        text="Section chips (Fill, Color, Shape, Shader FX, Borders) only change which Grid Gradient controls are shown here — they do not switch the renderer."
    />
    <PaxHudSegmentedControl
        class="module-scope-toggle"
        value={activeModule}
        options={GRID_GRADIENT_MODULE_OPTIONS}
        density="compact"
        ariaLabel="Grid gradient subsection visibility"
        onValueChange={(value) => setActiveModule(value as GridGradientModuleId)}
    />
</div>

{#if showModule('fill')}
<div class="module-block">
<div class="sub-heading">Grid Fill</div>

<PaxSettingsSegmentedRow
    label="Fill Style"
    hint="Grid Gradient fill: Pointillist (per-cell shapes) or Solid (filled cells)."
    value={fillStyle}
    options={FILL_STYLE_OPTIONS}
    settingConfigKey="GRID_GRADIENT_FILL_STYLE"
    onValueChange={(value) => {
        writeConfig('GRID_GRADIENT_FILL_STYLE', 'gridGradientFillStyle', value);
    }}
/>

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

<PaxSettingsSegmentedRow
    label="Shape"
    hint="Pointillist cell shape: Circle, Square, or Noise."
    value={cellShape}
    options={GRID_CELL_SHAPE_OPTIONS}
    disabled={!pointillistFillActive}
    settingConfigKey="GRID_GRADIENT_CELL_SHAPE"
    onValueChange={(value) => {
        writeConfig('GRID_GRADIENT_CELL_SHAPE', 'gridGradientCellShape', value);
    }}
/>
</div>
{/if}

{#if showModule('color')}
<div class="module-block">
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
    settingConfigKey="TERRITORY_SURFACE_SATURATION"
    onInput={(value) => writeConfig('TERRITORY_SURFACE_SATURATION', 'territorySurfaceSaturation', value)} />

<PaxSettingsRangeRow
    label="Lightness"
    value={fillLightness}
    min={0}
    max={3}
    step={0.01}
    output={fillLightness.toFixed(2)}
    settingConfigKey="TERRITORY_SURFACE_LIGHTNESS"
    onInput={(value) => writeConfig('TERRITORY_SURFACE_LIGHTNESS', 'territorySurfaceLightness', value)} />

<PaxSettingsRangeRow
    label="Alpha"
    value={fillAlpha}
    min={0}
    max={1}
    step={0.01}
    output={fillAlpha.toFixed(2)}
    settingConfigKey="TERRITORY_SURFACE_ALPHA"
    onInput={(value) => writeConfig('TERRITORY_SURFACE_ALPHA', 'territorySurfaceAlpha', value)} />
</div>
{/if}

{#if showModule('shape')}
<div class="module-block">
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
</div>
{/if}

{#if showModule('shader')}
<div class="module-block">
<div class="sub-heading">Shader Field FX</div>

<PaxSettingsSegmentedRow
    label="Shader Neighbor Mode"
    hint="How many neighbor cells the shader samples for the gradient field: Center (1), Cross (4-way), or Eight (8-way)."
    value={shaderNeighborMode}
    options={SHADER_NEIGHBOR_OPTIONS}
    disabled={!shaderFieldFxActive}
    settingConfigKey="GRID_GRADIENT_SHADER_NEIGHBOR_MODE"
    onValueChange={(value) => {
        writeConfig('GRID_GRADIENT_SHADER_NEIGHBOR_MODE', 'gridGradientShaderNeighborMode', value);
    }}
/>

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
</div>
{/if}

{#if showModule('borders')}
<div class="module-block">
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

<PaxSettingsSegmentedRow
    label="Dot Style"
    hint="Border dot rendering: Blended (soft) or Butted (hard-edged)."
    value={borderDotStyle}
    options={BORDER_DOT_STYLE_OPTIONS}
    disabled={!borderDotsEnabled}
    settingConfigKey="GRID_GRADIENT_BORDER_DOT_STYLE"
    onValueChange={(value) => {
        writeConfig('GRID_GRADIENT_BORDER_DOT_STYLE', 'gridGradientBorderDotStyle', value);
    }}
/>
</div>
{/if}

<style>

    .module-head {
        display: flex;
        justify-content: flex-end;
        margin: 0 0 var(--pax-space-2);
    }

    .module-block {
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .module-block:first-of-type .sub-heading:first-child {
        margin-top: 0;
    }

    .sub-heading {
        margin: var(--pax-space-3) 0 var(--pax-gap-xs);
        color: color-mix(in srgb, var(--pax-ui-accent) 92%, transparent);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0;
        text-transform: uppercase;
    }

</style>
