<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    type PerimeterFieldModuleId =
        | 'all'
        | 'none'
        | 'field'
        | 'transition';

    const PERIMETER_FIELD_MODULES = [
        { id: 'field', label: 'Field' },
        { id: 'transition', label: 'Transition' },
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

    function currentTransitionEngine(): 'legacy' | 'plan' {
        const value =
            panel.perimeterFieldTransitionEngine ??
            GAME_CONFIG.PERIMETER_FIELD_TRANSITION_ENGINE ??
            'plan';
        return value === 'legacy' ? 'legacy' : 'plan';
    }

    function transitionEngineLabel(): string {
        return currentTransitionEngine() === 'legacy'
            ? 'Synthetic Reference'
            : 'Topology Plan';
    }
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
            title="Choose between the synthetic conquest samples and the topology-driven transition plan."
        >
            Transition Engine
        </span>
        <span class="val">{transitionEngineLabel()}</span>
    </div>
    <div class="var-desc">
        Topology Plan is the deterministic section-aware path. Synthetic keeps the previous transition implementation available for A/B comparison.
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
        <option value="legacy">Synthetic Reference</option>
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
