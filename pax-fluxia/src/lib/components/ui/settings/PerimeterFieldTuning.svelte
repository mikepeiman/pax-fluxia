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
        <span class="var-name" title="Which ownership-derived geometry source seeds the perimeter samples. v1 uses canonical vector geometry only.">
            Base Geometry Source
        </span>
        <span class="val">{panel.perimeterFieldGeometrySource ?? GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ?? 'canonical_vector'}</span>
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
        <span class="var-name" title="Arc-length spacing between derived perimeter samples. Lower values trace the region more tightly but add more samples and cost.">
            Perimeter Sample Spacing
        </span>
        <span class="val">{panel.perimeterFieldSampleSpacing ?? GAME_CONFIG.PERIMETER_FIELD_SAMPLE_SPACING ?? 28}px</span>
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
        <span class="var-name" title="Influence radius for each perimeter sample in the displayed field. Higher values thicken and soften the derived territory skin.">
            Perimeter Influence Radius
        </span>
        <span class="val">{panel.perimeterFieldInfluenceRadius ?? GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_RADIUS ?? 52}px</span>
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
        <span class="var-name" title="Strength of each perimeter sample. Higher values make the boundary shell dominate more strongly over empty interior space.">
            Perimeter Influence Weight
        </span>
        <span class="val">{(panel.perimeterFieldInfluenceWeight ?? GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_WEIGHT ?? 1.35).toFixed(2)}</span>
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
        <span class="var-name" title="Number of radial rays cast from the conquered star to build the local transition override. Higher values produce smoother local motion but add cost.">
            Transition Ray Count
        </span>
        <span class="val">{panel.perimeterFieldTransitionRayCount ?? GAME_CONFIG.PERIMETER_FIELD_TRANSITION_RAY_COUNT ?? 60}</span>
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
        <span class="var-name" title="Duration of the conquest boundary handoff for this family. This writes the shared territory transition duration.">
            Transition Duration
        </span>
        <span class="val">{panel.territoryTransitionMs ?? GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400}ms</span>
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
    <span class="var-name" title="When on, the static displayed perimeter field stays on T0 while only the conquest-local override moves.">
        Freeze Base Boundary During Transition
    </span>
    <span class="val">
        {(panel.perimeterFieldFreezeBaseDuringTransition ?? GAME_CONFIG.PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION ?? true)
            ? 'On'
            : 'Off'}
    </span>
</label>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Multiplier on the local old-owner boundary fade during conquest. Higher values keep the old edge visible longer.">
            Old Boundary Fade
        </span>
        <span class="val">{(panel.perimeterFieldOldBoundaryFade ?? GAME_CONFIG.PERIMETER_FIELD_OLD_BOUNDARY_FADE ?? 1).toFixed(2)}</span>
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
        <span class="var-name" title="Multiplier on the local new-owner boundary grow during conquest. Higher values let the incoming edge assert faster.">
            New Boundary Grow
        </span>
        <span class="val">{(panel.perimeterFieldNewBoundaryGrow ?? GAME_CONFIG.PERIMETER_FIELD_NEW_BOUNDARY_GROW ?? 1).toFixed(2)}</span>
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

<style>
    @import "./panel-shared.css";
</style>
