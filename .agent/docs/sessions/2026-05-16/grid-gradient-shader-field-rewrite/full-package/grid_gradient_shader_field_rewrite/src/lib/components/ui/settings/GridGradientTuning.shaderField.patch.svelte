<!-- Patch into GridGradientTuning.svelte near the top of the component, before Grid Fill. -->

<script lang="ts">
    const drawBackend = $derived(valueOf<string>('gridGradientDrawBackend', 'shader_field'));
    const shaderNeighborMode = $derived(valueOf<string>('gridGradientShaderNeighborMode', 'eight'));
    const shaderDebugMode = $derived(valueOf<string>('gridGradientShaderDebugMode', 'off'));
    const shaderMarkSoftness = $derived(valueOf<number>('gridGradientShaderMarkSoftness', 0.18));
    const shaderEdgeSoftnessPx = $derived(valueOf<number>('gridGradientShaderEdgeSoftnessPx', 0.85));
    const shaderNoiseStrength = $derived(valueOf<number>('gridGradientShaderNoiseStrength', 0.35));
    const shaderPulseStrength = $derived(valueOf<number>('gridGradientShaderPulseStrength', 0.06));
    const shaderPulseSpeed = $derived(valueOf<number>('gridGradientShaderPulseSpeed', 3));
    const shaderFieldDriftPx = $derived(valueOf<number>('gridGradientShaderFieldDriftPx', 0));
    const shaderGlowStrength = $derived(valueOf<number>('gridGradientShaderGlowStrength', 0.08));
</script>

<div class="sub-heading">Backend</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Draw Backend</span>
        <span class="val">{drawBackend}</span>
    </div>
    <select
        class="mode-select"
        value={drawBackend}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_DRAW_BACKEND', 'gridGradientDrawBackend', (event.target as HTMLSelectElement).value);
        }}>
        <option value="shader_field">Shader Field</option>
        <option value="graphics">Graphics Fallback</option>
        <option value="mesh_quads">Mesh Quads</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Neighbor Sampling</span>
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

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shader Debug</span>
        <span class="val">{shaderDebugMode}</span>
    </div>
    <select
        class="mode-select"
        value={shaderDebugMode}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_SHADER_DEBUG_MODE', 'gridGradientShaderDebugMode', (event.target as HTMLSelectElement).value);
        }}>
        <option value="off">Off</option>
        <option value="cell_grid">Cell Grid</option>
        <option value="owner_index">Owner Index</option>
        <option value="distance_band">Distance Band</option>
        <option value="flip_time">Flip Time</option>
        <option value="role">Role</option>
    </select>
</div>

<div class="sub-heading">Shader Field FX</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Mark Softness</span>
        <span class="val">{shaderMarkSoftness.toFixed(2)}</span>
    </div>
    <input type="range" min="0" max="1.5" step="0.01" value={shaderMarkSoftness}
        oninput={(event) => writeConfig('GRID_GRADIENT_SHADER_MARK_SOFTNESS', 'gridGradientShaderMarkSoftness', parseFloat((event.target as HTMLInputElement).value))} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Edge Softness</span>
        <span class="val">{shaderEdgeSoftnessPx.toFixed(2)}px</span>
    </div>
    <input type="range" min="0" max="8" step="0.05" value={shaderEdgeSoftnessPx}
        oninput={(event) => writeConfig('GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX', 'gridGradientShaderEdgeSoftnessPx', parseFloat((event.target as HTMLInputElement).value))} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Noise Strength</span>
        <span class="val">{shaderNoiseStrength.toFixed(2)}</span>
    </div>
    <input type="range" min="0" max="2" step="0.01" value={shaderNoiseStrength}
        oninput={(event) => writeConfig('GRID_GRADIENT_SHADER_NOISE_STRENGTH', 'gridGradientShaderNoiseStrength', parseFloat((event.target as HTMLInputElement).value))} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Pulse Strength</span>
        <span class="val">{shaderPulseStrength.toFixed(2)}</span>
    </div>
    <input type="range" min="0" max="1" step="0.01" value={shaderPulseStrength}
        oninput={(event) => writeConfig('GRID_GRADIENT_SHADER_PULSE_STRENGTH', 'gridGradientShaderPulseStrength', parseFloat((event.target as HTMLInputElement).value))} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Pulse Speed</span>
        <span class="val">{shaderPulseSpeed.toFixed(1)}</span>
    </div>
    <input type="range" min="0" max="20" step="0.1" value={shaderPulseSpeed}
        oninput={(event) => writeConfig('GRID_GRADIENT_SHADER_PULSE_SPEED', 'gridGradientShaderPulseSpeed', parseFloat((event.target as HTMLInputElement).value))} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Field Drift</span>
        <span class="val">{shaderFieldDriftPx.toFixed(1)}px</span>
    </div>
    <input type="range" min="0" max="12" step="0.1" value={shaderFieldDriftPx}
        oninput={(event) => writeConfig('GRID_GRADIENT_SHADER_FIELD_DRIFT_PX', 'gridGradientShaderFieldDriftPx', parseFloat((event.target as HTMLInputElement).value))} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Glow Strength</span>
        <span class="val">{shaderGlowStrength.toFixed(2)}</span>
    </div>
    <input type="range" min="0" max="2" step="0.01" value={shaderGlowStrength}
        oninput={(event) => writeConfig('GRID_GRADIENT_SHADER_GLOW_STRENGTH', 'gridGradientShaderGlowStrength', parseFloat((event.target as HTMLInputElement).value))} />
</div>
