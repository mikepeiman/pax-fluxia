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
</script>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Which ownership-derived geometry source seeds the perimeter samples. v1 uses canonical vector geometry only."
        >
            Base Geometry Source
        </span>
        <span class="val">{panel.perimeterFieldGeometrySource ?? GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ?? 'canonical_vector'}</span>
    </div>
    <div class="var-desc">
        The source region geometry that the perimeter sampler traces before the field renderer reconstructs territory.
    </div>
    <select
        class="mode-select"
        value={panel.perimeterFieldGeometrySource ?? GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ?? 'canonical_vector'}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('PERIMETER_FIELD_GEOMETRY_SOURCE', 'perimeterFieldGeometrySource', value);
        }}
    >
        <option value="canonical_vector">Canonical Vector</option>
    </select>
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
