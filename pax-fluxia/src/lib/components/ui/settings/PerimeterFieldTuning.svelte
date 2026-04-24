<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import { perimeterFieldDebugPlaybackStore } from '$lib/territory/families/perimeterField/perimeterFieldDebugPlaybackStore';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    type PerimeterFieldModuleId =
        | 'all'
        | 'none'
        | 'source'
        | 'field'
        | 'transition'
        | 'diagnostics';

    const PERIMETER_FIELD_MODULES = [
        { id: 'source', label: 'Source' },
        { id: 'field', label: 'Field' },
        { id: 'transition', label: 'Transition' },
        { id: 'diagnostics', label: 'Diagnostics' },
    ] as const;

    const PERIMETER_FIELD_MODULE_PANEL_KEY = 'perimeterFieldModuleVisibility';

    let activeModule = $derived(
        (panel[PERIMETER_FIELD_MODULE_PANEL_KEY] ?? 'all') as PerimeterFieldModuleId,
    );

    function showModule(
        id: Exclude<PerimeterFieldModuleId, 'all' | 'none'>,
    ): boolean {
        return activeModule === 'all' || activeModule === id;
    }

    function setActiveModule(value: PerimeterFieldModuleId): void {
        updatePanel(PERIMETER_FIELD_MODULE_PANEL_KEY, value);
    }

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
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

    function currentTransitionEngine(): 'legacy' | 'plan' {
        const value =
            panel.perimeterFieldTransitionEngine ??
            GAME_CONFIG.PERIMETER_FIELD_TRANSITION_ENGINE ??
            'plan';
        return value === 'legacy' ? 'legacy' : 'plan';
    }

    function transitionEngineLabel(): string {
        return currentTransitionEngine() === 'legacy'
            ? 'Legacy Synthetic'
            : 'Topology Plan';
    }

    let activeReplaySlot = $derived(
        Math.max(
            0,
            Math.min(
                3,
                Math.round(
                    panel.perimeterFieldDebugReplaySlot ??
                        GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ??
                        0,
                ),
            ),
        ),
    );

    let availableScrubFrameCount = $derived(
        activeReplaySlot > 0
            ? ($perimeterFieldDebugPlaybackStore.replayFrameCounts[
                  activeReplaySlot - 1
              ] ?? 0)
            : $perimeterFieldDebugPlaybackStore.liveFrameCount,
    );

    function currentScrubFrameIndex(): number {
        const raw =
            panel.perimeterFieldDebugScrubFrameIndex ??
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX ??
            0;
        const maxIndex = Math.max(0, availableScrubFrameCount - 1);
        return Math.max(0, Math.min(maxIndex, Math.round(raw)));
    }

    function setScrubFrameIndex(value: number): void {
        const maxIndex = Math.max(0, availableScrubFrameCount - 1);
        writeConfig(
            'PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX',
            'perimeterFieldDebugScrubFrameIndex',
            Math.max(0, Math.min(maxIndex, Math.round(value))),
        );
    }

    function shiftScrubFrame(delta: number): void {
        setScrubFrameIndex(currentScrubFrameIndex() + delta);
    }

    $effect(() => {
        if (availableScrubFrameCount <= 0) {
            if (
                (panel.perimeterFieldDebugScrubFrameIndex ??
                    GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX ??
                    0) !== 0
            ) {
                setScrubFrameIndex(0);
            }
            return;
        }
        const clamped = currentScrubFrameIndex();
        if (
            clamped !==
            Math.round(
                panel.perimeterFieldDebugScrubFrameIndex ??
                    GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX ??
                    0,
            )
        ) {
            setScrubFrameIndex(clamped);
        }
    });
</script>

<div class="module-head">
    <div class="module-scope-toggle" role="group" aria-label="Perimeter field subsection visibility">
        <button
            type="button"
            class="module-all-toggle"
            class:active={activeModule === 'all'}
            onclick={() => {
                setActiveModule('all');
            }}>All</button>
        <button
            type="button"
            class="module-all-toggle"
            class:active={activeModule === 'none'}
            onclick={() => {
                setActiveModule('none');
            }}>None</button>
    </div>
</div>

<div class="module-nav">
    {#each PERIMETER_FIELD_MODULES as module}
        <button
            type="button"
            class="module-chip"
            class:active={activeModule === module.id}
            onclick={() => {
                setActiveModule(activeModule === module.id ? 'all' : module.id);
            }}
        >
            {module.label}
        </button>
    {/each}
</div>

{#if showModule('source')}
<div class="module-block">
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

</div>
{/if}

{#if showModule('field')}
<div class="module-block">
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

</div>
{/if}

{#if showModule('transition')}
<div class="module-block">
<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Choose between the legacy synthetic conquest samples and the new topology-driven transition plan."
        >
            Transition Engine
        </span>
        <span class="val">{transitionEngineLabel()}</span>
    </div>
    <div class="var-desc">
        Topology Plan is the new deterministic section-aware path. Legacy Synthetic keeps the previous transition implementation available for A/B comparison.
    </div>
    <select
        class="mode-select"
        value={currentTransitionEngine()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig(
                'PERIMETER_FIELD_TRANSITION_ENGINE',
                'perimeterFieldTransitionEngine',
                value === 'legacy' ? 'legacy' : 'plan',
            );
        }}
    >
        <option value="plan">Topology Plan</option>
        <option value="legacy">Legacy Synthetic</option>
    </select>
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

</div>
{/if}

{#if showModule('diagnostics')}
<div class="module-block">
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
    Vstars are filled with owner/player color. The surrounding halo shows debug state: cyan = current/base, magenta = next-state, yellow = moving transition override.
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
        title="Explicit diagnostic preview mode. When enabled, the game view can be replaced with captured transition frames for scrub/replay inspection. When disabled, pause only pauses."
    >
        Enable Transition Preview
    </span>
    <span class="val">
        {(panel.perimeterFieldDebugScrubEnabled ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED ?? false)
            ? 'On'
            : 'Off'}
    </span>
</label>
    <div class="var-desc">
    Explicitly turn this on to replace the live perimeter-field view with captured frames for scrub/replay inspection. Turn it off for normal gameplay; pause alone will no longer switch views.
    </div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Choose the active capture or one of the last three captured conquests for explicit preview mode."
        >
            Replay Source
        </span>
        <span class="val">
            {#if (panel.perimeterFieldDebugReplaySlot ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ?? 0) === 0}
                Live
            {:else}
                Replay {(panel.perimeterFieldDebugReplaySlot ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ?? 0)}
            {/if}
        </span>
    </div>
    <div class="var-desc">
        `Live` uses the currently active conquest. `Replay 1` is the most recent captured conquest, then `Replay 2` and `Replay 3`.
    </div>
    <select
        class="mode-select"
        value={(panel.perimeterFieldDebugReplaySlot ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ?? 0).toString()}
        onchange={(event) => {
            const value = parseFloat((event.target as HTMLSelectElement).value);
            writeConfig('PERIMETER_FIELD_DEBUG_REPLAY_SLOT', 'perimeterFieldDebugReplaySlot', value);
        }}
    >
        <option value="0">Live</option>
        <option value="1">Replay 1 (most recent)</option>
        <option value="2">Replay 2</option>
        <option value="3">Replay 3</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Exact captured transition frame index for the live conquest or selected replay. Index 0 is PREV, the last index is NEXT."
        >
            Transition Scrub
        </span>
        <span class="val">
            {#if availableScrubFrameCount > 0}
                F{currentScrubFrameIndex()} / {availableScrubFrameCount - 1}
            {:else}
                No frames
            {/if}
        </span>
    </div>
    <div class="var-desc">
        In explicit preview mode, this steps through the exact captured gameplay frames for the live conquest or selected replay. Each +/- click moves exactly one conquest frame.
    </div>
    <div class="scrub-controls">
        <button
            type="button"
            class="module-all-toggle scrub-step-btn"
            disabled={availableScrubFrameCount <= 0 || currentScrubFrameIndex() <= 0}
            onclick={() => shiftScrubFrame(-1)}
        >
            -
        </button>
        <input
            type="range"
            min="0"
            max={Math.max(0, availableScrubFrameCount - 1)}
            step="1"
            disabled={availableScrubFrameCount <= 0}
            value={currentScrubFrameIndex()}
            oninput={(event) => {
                const value = parseFloat((event.target as HTMLInputElement).value);
                setScrubFrameIndex(value);
            }}
        />
        <button
            type="button"
            class="module-all-toggle scrub-step-btn"
            disabled={availableScrubFrameCount <= 0 || currentScrubFrameIndex() >= availableScrubFrameCount - 1}
            onclick={() => shiftScrubFrame(1)}
        >
            +
        </button>
    </div>
</div>

</div>
{/if}

<style>
    @import "./panel-shared.css";

    .module-head {
        display: flex;
        justify-content: flex-end;
        margin: 0 0 8px;
    }

    .module-scope-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .module-all-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(7, 12, 24, 0.5);
        color: rgba(240, 244, 248, 0.9);
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    .module-all-toggle.active {
        border-color: rgba(95, 211, 255, 0.42);
        background: rgba(49, 105, 164, 0.26);
        box-shadow: 0 0 0 1px rgba(95, 211, 255, 0.16);
    }

    .module-nav {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 0 0 10px;
    }

    .module-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(7, 12, 24, 0.45);
        color: rgba(226, 232, 240, 0.84);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease;
    }

    .module-chip.active {
        border-color: rgba(95, 211, 255, 0.42);
        background: rgba(49, 105, 164, 0.26);
        box-shadow: 0 0 0 1px rgba(95, 211, 255, 0.16);
        color: rgba(248, 250, 252, 0.98);
    }

    .module-block {
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .scrub-controls {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
    }

    .scrub-step-btn {
        min-width: 32px;
        min-height: 28px;
        padding: 0 8px;
    }

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
