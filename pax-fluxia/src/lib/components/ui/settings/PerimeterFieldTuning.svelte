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

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Which pre-existing territory geometry pipeline provides the source boundary that perimeter-field samples from."
        >
            Base Geometry Source
        </span>
        <span class="val">{geometrySourceLabel()}</span>
    </div>
    <div class="var-desc">
        The source region geometry that the perimeter sampler traces before the field renderer reconstructs territory.
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
    {geometrySourceLabel()} uses these source-geometry constraints. These are the actual MSR, CX lane-pair, and DX settings driving the underlying geometry for this mode.
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Minimum Star Region. This is the base radius/pressure around owned stars in the selected geometry source before perimeter-field derives vstars from the result."
        >
            Source MSR
        </span>
        <span class="val">{panel.starMargin ?? GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45}px</span>
    </div>
    <div class="var-desc">
        Minimum star territory size in the source geometry. Increase this if the source geometry is clipping too tightly around stars.
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
        title="Enable CX corridor virtual sites in the selected source geometry."
    >
        Source CX Corridors
    </span>
    <span class="val">
        {(panel.corridorEnabled ?? GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ?? true) ? 'On' : 'Off'}
    </span>
</label>
<div class="var-desc">
    Adds corridor virtuals to the source geometry before perimeter-field samples the resulting region boundary.
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
    Forces contested lanes to use the paired midpoint vstar construction in the source geometry.
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
            title="Weight multiplier applied to DX disconnect virtual stars in the selected source geometry."
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

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Arc-length spacing between derived perimeter vstars. Lower values hug the source boundary more tightly but create more samples."
        >
            Perimeter Vstar Spacing
        </span>
        <span class="val">{panel.perimeterFieldSampleSpacing ?? GAME_CONFIG.PERIMETER_FIELD_SAMPLE_SPACING ?? 28}px</span>
    </div>
    <div class="var-desc">
        Distance between derived boundary control points. Lower is more faithful and heavier; higher is simpler and looser.
    </div>
    <input
        type="range"
        min="8"
        max="120"
        step="1"
        value={panel.perimeterFieldSampleSpacing ?? GAME_CONFIG.PERIMETER_FIELD_SAMPLE_SPACING ?? 28}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('PERIMETER_FIELD_SAMPLE_SPACING', 'perimeterFieldSampleSpacing', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="How far inward from the source boundary each perimeter vstar is placed. Higher values move the samples deeper into the region interior."
        >
            Perimeter Inward Offset
        </span>
        <span class="val">{panel.perimeterFieldInwardOffsetPx ?? GAME_CONFIG.PERIMETER_FIELD_INWARD_OFFSET_PX ?? 10}px</span>
    </div>
    <div class="var-desc">
        Moves derived perimeter vstars inside the region instead of sitting exactly on the boundary.
    </div>
    <input
        type="range"
        min="0"
        max="60"
        step="1"
        value={panel.perimeterFieldInwardOffsetPx ?? GAME_CONFIG.PERIMETER_FIELD_INWARD_OFFSET_PX ?? 10}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('PERIMETER_FIELD_INWARD_OFFSET_PX', 'perimeterFieldInwardOffsetPx', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Influence radius for each derived perimeter vstar in the displayed field. Higher values make the boundary shell thicker and more blobby."
        >
            Perimeter Vstar Radius
        </span>
        <span class="val">{panel.perimeterFieldInfluenceRadius ?? GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_RADIUS ?? 52}px</span>
    </div>
    <div class="var-desc">
        How far each perimeter vstar reaches into the field. This strongly affects whether interiors stay filled or cave inward.
    </div>
    <input
        type="range"
        min="8"
        max="180"
        step="1"
        value={panel.perimeterFieldInfluenceRadius ?? GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_RADIUS ?? 52}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('PERIMETER_FIELD_INFLUENCE_RADIUS', 'perimeterFieldInfluenceRadius', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Overall power of each derived perimeter vstar. Higher values make the perimeter shell dominate more strongly over empty interior space."
        >
            Perimeter Vstar Power
        </span>
        <span class="val">{(panel.perimeterFieldInfluenceWeight ?? GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_WEIGHT ?? 1.35).toFixed(2)}</span>
    </div>
    <div class="var-desc">
        Overall boundary-control strength. If static regions are underfilling, this is one of the first controls to try.
    </div>
    <input
        type="range"
        min="0.1"
        max="6"
        step="0.05"
        value={panel.perimeterFieldInfluenceWeight ?? GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_WEIGHT ?? 1.35}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('PERIMETER_FIELD_INFLUENCE_WEIGHT', 'perimeterFieldInfluenceWeight', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Number of radial slices cast from the conquered star to build the conquest-local boundary override."
        >
            Transition Slice Count
        </span>
        <span class="val">{panel.perimeterFieldTransitionRayCount ?? GAME_CONFIG.PERIMETER_FIELD_TRANSITION_RAY_COUNT ?? 60}</span>
    </div>
    <div class="var-desc">
        More slices make the conquest override rounder and smoother. Fewer slices make it cheaper and more faceted.
    </div>
    <input
        type="range"
        min="8"
        max="180"
        step="1"
        value={panel.perimeterFieldTransitionRayCount ?? GAME_CONFIG.PERIMETER_FIELD_TRANSITION_RAY_COUNT ?? 60}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('PERIMETER_FIELD_TRANSITION_RAY_COUNT', 'perimeterFieldTransitionRayCount', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Duration of the conquest handoff for this family. This writes the shared territory transition duration."
        >
            Transition Duration
        </span>
        <span class="val">{panel.territoryTransitionMs ?? GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400}ms</span>
    </div>
    <div class="var-desc">
        Total time for the local boundary override to move from previous ownership to next ownership.
    </div>
    <input
        type="range"
        min="0"
        max="3000"
        step="25"
        value={panel.territoryTransitionMs ?? GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('TERRITORY_TRANSITION_MS', 'territoryTransitionMs', value);
        }}
    />
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.perimeterFieldFreezeBaseDuringTransition ?? GAME_CONFIG.PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION ?? true}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION', 'perimeterFieldFreezeBaseDuringTransition', value);
        }}
    />
    <span
        class="var-name"
        title="When on, the static displayed perimeter field stays on T0 while only the conquest-local override moves."
    >
        Hold Base State During Transition
    </span>
    <span class="val">
        {(panel.perimeterFieldFreezeBaseDuringTransition ?? GAME_CONFIG.PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION ?? true)
            ? 'On'
            : 'Off'}
    </span>
</label>
<div class="var-desc">
    Keeps the pre-conquest perimeter shell fixed while the local transition override does the visible handoff.
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="How strongly the old-owner local boundary handles remain present during conquest. Higher values preserve the old edge longer before it yields."
        >
            Old Boundary Persistence
        </span>
        <span class="val">{(panel.perimeterFieldOldBoundaryFade ?? GAME_CONFIG.PERIMETER_FIELD_OLD_BOUNDARY_FADE ?? 1).toFixed(2)}</span>
    </div>
    <div class="var-desc">
        Transition-only multiplier for the previous owner’s local boundary handles. Higher means the old edge lingers longer.
    </div>
    <input
        type="range"
        min="0"
        max="3"
        step="0.05"
        value={panel.perimeterFieldOldBoundaryFade ?? GAME_CONFIG.PERIMETER_FIELD_OLD_BOUNDARY_FADE ?? 1}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('PERIMETER_FIELD_OLD_BOUNDARY_FADE', 'perimeterFieldOldBoundaryFade', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="How strongly the new-owner local boundary handles assert themselves during conquest. Higher values make the incoming edge claim space faster."
        >
            New Boundary Assertion
        </span>
        <span class="val">{(panel.perimeterFieldNewBoundaryGrow ?? GAME_CONFIG.PERIMETER_FIELD_NEW_BOUNDARY_GROW ?? 1).toFixed(2)}</span>
    </div>
    <div class="var-desc">
        Transition-only multiplier for the incoming owner’s local boundary handles. Higher means the new edge takes over faster.
    </div>
    <input
        type="range"
        min="0"
        max="3"
        step="0.05"
        value={panel.perimeterFieldNewBoundaryGrow ?? GAME_CONFIG.PERIMETER_FIELD_NEW_BOUNDARY_GROW ?? 1}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('PERIMETER_FIELD_NEW_BOUNDARY_GROW', 'perimeterFieldNewBoundaryGrow', value);
        }}
    />
</div>

<div class="sub-heading">Diagnostics</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.perimeterFieldDebugShowGeometry ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY ?? false}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY', 'perimeterFieldDebugShowGeometry', value);
        }}
    />
    <span
        class="var-name"
        title="Draw the source geometry loops that the perimeter sampler is tracing."
    >
        Show Underlying Geometry
    </span>
    <span class="val">
        {(panel.perimeterFieldDebugShowGeometry ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY ?? false)
            ? 'On'
            : 'Off'}
    </span>
</label>
<div class="var-desc">
    Cyan shows the current base geometry. In paused scrub mode, magenta shows the next-state geometry as well.
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.perimeterFieldDebugShowVstars ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_VSTARS ?? false}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('PERIMETER_FIELD_DEBUG_SHOW_VSTARS', 'perimeterFieldDebugShowVstars', value);
        }}
    />
    <span
        class="var-name"
        title="Draw the derived perimeter vstars and the conquest-local override points."
    >
        Show Perimeter Vstars
    </span>
    <span class="val">
        {(panel.perimeterFieldDebugShowVstars ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_VSTARS ?? false)
            ? 'On'
            : 'Off'}
    </span>
</label>
<div class="var-desc">
    Cyan points are the current/base perimeter vstars. In paused scrub mode, magenta shows next-state vstars and yellow shows the moving interim override.
</div>

<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.perimeterFieldDebugScrubEnabled ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED ?? false}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('PERIMETER_FIELD_DEBUG_SCRUB_ENABLED', 'perimeterFieldDebugScrubEnabled', value);
        }}
    />
    <span
        class="var-name"
        title="When the game is paused and a conquest transition is active, override the displayed transition progress with the scrub slider below."
    >
        Enable Transition Scrub When Paused
    </span>
    <span class="val">
        {(panel.perimeterFieldDebugScrubEnabled ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED ?? false)
            ? 'On'
            : 'Off'}
    </span>
</label>
<div class="var-desc">
    Pause the game, then drag the scrub slider to inspect previous state, next state, and the interim handoff frame-by-frame.
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Paused scrub position for the active conquest transition. 0 = previous state, 1 = settled next state."
        >
            Transition Scrub
        </span>
        <span class="val">{(panel.perimeterFieldDebugScrubProgress ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS ?? 0).toFixed(2)}</span>
    </div>
    <div class="var-desc">
        Only applies while paused and only if a conquest transition is active. The displayed `perimeter_field` render is forced to this transition progress.
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={panel.perimeterFieldDebugScrubProgress ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS ?? 0}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS', 'perimeterFieldDebugScrubProgress', value);
        }}
    />
</div>

<style>
    @import "./panel-shared.css";

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
