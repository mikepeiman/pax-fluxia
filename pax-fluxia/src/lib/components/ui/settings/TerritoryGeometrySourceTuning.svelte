<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
    }

    function currentGeometrySource(): string {
        return (
            panel.perimeterFieldGeometrySource ??
            GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ??
            'power_voronoi_0319'
        ) as string;
    }

    function geometrySourceLabel(): string {
        const source = currentGeometrySource();
        if (source === 'power_voronoi_0319') return 'Power Voronoi (0319)';
        if (source === 'canonical_vector') return 'Canonical Vector';
        return source;
    }
</script>

<div class="sub-heading">Geometry Source</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Which territory geometry pipeline provides the source boundary data used by render-family geometry."
        >
            Base Geometry Source
        </span>
        <span class="val">{geometrySourceLabel()}</span>
    </div>
    <div class="var-desc">
        Select which existing geometry pipeline supplies the source territory regions before the active renderer derives its displayed shape from them.
    </div>
    <select
        class="mode-select"
        value={currentGeometrySource()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('PERIMETER_FIELD_GEOMETRY_SOURCE', 'perimeterFieldGeometrySource', value);
        }}
    >
        <option value="power_voronoi_0319">Power Voronoi (0319)</option>
        <option value="canonical_vector">Canonical Vector</option>
    </select>
</div>

<div class="sub-heading">Source Constraints</div>

<div class="var-desc">
    Both current sources honor these MSR, CX, lane-pair, and DX controls through their own geometry compilers. Adjust them here to change the source geometry used by the active render family.
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Minimum Star Region. Base ownership footprint around each star before source-geometry frontiers are solved."
        >
            Source MSR
        </span>
        <span class="val">{panel.starMargin ?? GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45}px</span>
    </div>
    <div class="var-desc">
        Minimum star territory size in the source geometry.
    </div>
    <input
        type="range"
        min="0"
        max="180"
        step="1"
        value={panel.starMargin ?? GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('MODIFIED_VORONOI_STAR_MARGIN', 'starMargin', value);
        }}
    />
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.corridorEnabled ?? GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ?? true}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('MODIFIED_VORONOI_CORRIDOR_ENABLED', 'corridorEnabled', value);
        }}
    />
    <span
        class="var-name"
        title="Enable CX corridor virtuals in the selected source geometry."
    >
        Source CX Corridors
    </span>
    <span class="val">
        {(panel.corridorEnabled ?? GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ?? true) ? 'On' : 'Off'}
    </span>
</label>
<div class="var-desc">
    Adds corridor virtuals to the source geometry before any family-specific rendering is derived from it.
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.cxContestMidpointVstars ?? GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ?? true}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('TERRITORY_CX_CONTEST_MIDPOINT_VSTARS', 'cxContestMidpointVstars', value);
        }}
    />
    <span
        class="var-name"
        title="Enable the contested lane midpoint pair construction in CX so opposed lanes get paired midpoint virtual stars."
    >
        Source CX Lane Pairs
    </span>
    <span class="val">
        {(panel.cxContestMidpointVstars ?? GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ?? true) ? 'On' : 'Off'}
    </span>
</label>
<div class="var-desc">
    Forces contested lanes to use the paired midpoint-vstar construction in the source geometry.
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Number of paired midpoint samples per owner on contested lanes. Samples are distributed along the lane around the midpoint with approximately one MSR spacing."
        >
            Source CX Lane-Pair Count
        </span>
        <span class="val">{panel.cxContestPairCount ?? GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ?? 1}</span>
    </div>
    <div class="var-desc">
        Number of midpoint-pair samples per owner on contested lanes.
    </div>
    <input
        type="range"
        min="1"
        max="10"
        step="1"
        value={panel.cxContestPairCount ?? GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ?? 1}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('TERRITORY_CX_CONTEST_PAIR_COUNT', 'cxContestPairCount', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Weight multiplier applied specifically to the contested midpoint-pair samples on cross-owner lanes."
        >
            Source CX Lane-Pair Weight
        </span>
        <span class="val">{(panel.cxContestPairWeight ?? GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ?? 0.5).toFixed(2)}</span>
    </div>
    <div class="var-desc">
        Strength of the contested midpoint-pair interface, separate from ordinary CX corridor weight.
    </div>
    <input
        type="range"
        min="0"
        max="3"
        step="0.05"
        value={panel.cxContestPairWeight ?? GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ?? 0.5}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('TERRITORY_CX_CONTEST_PAIR_WEIGHT', 'cxContestPairWeight', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="How many CX corridor samples are placed along each eligible lane when count mode is in use."
        >
            Source CX Count
        </span>
        <span class="val">{panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0}</span>
    </div>
    <div class="var-desc">
        Number of corridor samples per lane in the source geometry.
    </div>
    <input
        type="range"
        min="0"
        max="12"
        step="1"
        value={panel.cxCount ?? GAME_CONFIG.TERRITORY_CX_COUNT ?? 0}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('TERRITORY_CX_COUNT', 'cxCount', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Weight multiplier applied to CX virtual stars in the source geometry."
        >
            Source CX Weight
        </span>
        <span class="val">{(panel.cxWeight ?? GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5).toFixed(2)}</span>
    </div>
    <div class="var-desc">
        Strength of corridor virtuals in the source geometry.
    </div>
    <input
        type="range"
        min="0"
        max="3"
        step="0.05"
        value={panel.cxWeight ?? GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('TERRITORY_CX_WEIGHT', 'cxWeight', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Spacing between CX virtual stars along the lane in the selected source geometry."
        >
            Source CX Spacing
        </span>
        <span class="val">{panel.corridorSpacing ?? GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60}px</span>
    </div>
    <div class="var-desc">
        Physical spacing between CX samples in the source geometry.
    </div>
    <input
        type="range"
        min="8"
        max="180"
        step="1"
        value={panel.corridorSpacing ?? GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('MODIFIED_VORONOI_CORRIDOR_SPACING', 'corridorSpacing', value);
        }}
    />
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.disconnectEnabled ?? GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ?? true}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('MODIFIED_VORONOI_DISCONNECT_ENABLED', 'disconnectEnabled', value);
        }}
    />
    <span
        class="var-name"
        title="Enable DX disconnect virtuals in the selected source geometry."
    >
        Source DX Disconnect
    </span>
    <span class="val">
        {(panel.disconnectEnabled ?? GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ?? true) ? 'On' : 'Off'}
    </span>
</label>
<div class="var-desc">
    Adds paired enemy disconnect virtuals around same-owner Euclidean midpoints in the source geometry.
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Weight multiplier applied to DX disconnect virtual stars in the source geometry."
        >
            Source DX Weight
        </span>
        <span class="val">{(panel.dxWeight ?? GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3).toFixed(2)}</span>
    </div>
    <div class="var-desc">
        Strength of DX virtuals in the source geometry.
    </div>
    <input
        type="range"
        min="0"
        max="3"
        step="0.05"
        value={panel.dxWeight ?? GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('TERRITORY_DX_WEIGHT', 'dxWeight', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Maximum star-to-star distance that still qualifies for DX virtual site insertion in the selected source geometry."
        >
            Source DX Distance
        </span>
        <span class="val">{panel.disconnectDistance ?? GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400}px</span>
    </div>
    <div class="var-desc">
        Distance threshold for DX insertion in the source geometry.
    </div>
    <input
        type="range"
        min="0"
        max="1000"
        step="5"
        value={panel.disconnectDistance ?? GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('MODIFIED_VORONOI_DISCONNECT_DISTANCE', 'disconnectDistance', value);
        }}
    />
</div>

<style>
    @import './panel-shared.css';

    .var-desc {
        margin: 4px 0 10px;
        color: rgba(220, 232, 245, 0.72);
        font-size: 10px;
        line-height: 1.35;
    }

    .sub-heading {
        margin: 12px 0 6px;
        color: rgba(128, 222, 255, 0.92);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
</style>
