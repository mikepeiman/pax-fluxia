<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from '$lib/config/game.config';
    import {
        TERRITORY_FRONTIER_RECIPE_PRESETS,
        type TerritoryFrontierRecipePreset,
    } from '$lib/territory/frontier';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import { log } from '$lib/utils/logger';
    import {
        cellGridPhaseEdgesModeDefaults,
        cellGridPhaseFieldModeDefaults,
    } from '$lib/territory/families/cellGrid/config';
    import {
        PaxHudSegmentedControl,
        PaxHudSelect,
        PaxInfoHint,
        PaxSettingsRangeRow,
        PaxSettingsSegmentedRow,
        PaxSettingsToggleRow,
        type PaxHudSegmentedOption,
    } from '$lib/design-system';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    type CellGridModuleId =
        | 'all'
        | 'none'
        | 'grid'
        | 'frontier'
        | 'wave'
        | 'flip'
        | 'finish';

    const CELL_GRID_MODULES = [
        { id: 'grid', label: 'Grid' },
        { id: 'frontier', label: 'Frontier' },
        { id: 'wave', label: 'Wave' },
        { id: 'flip', label: 'Flip' },
        { id: 'finish', label: 'Finish' },
    ] as const;

    const CELL_GRID_MODULE_PANEL_KEY = 'cellGridModuleVisibility';

    const ORIGIN_MODE_OPTIONS = [
        { value: 'centered', label: 'Centered' },
        { value: 'corner', label: 'Corner' },
    ];

    const DISTRIBUTION_OPTIONS = [
        { value: 'square', label: 'Square' },
        { value: 'hex_offset', label: 'Hex offset' },
        { value: 'jittered', label: 'Jittered' },
    ];

    const CELL_SHAPE_OPTIONS = [
        { value: 'square', label: 'Square' },
        { value: 'circle', label: 'Circle' },
        { value: 'diamond', label: 'Diamond' },
        { value: 'hex', label: 'Hex' },
    ];

    const BORDER_MODE_OPTIONS = [
        { value: 'off', label: 'Off' },
        { value: 'territory_edge', label: 'Edge' },
        { value: 'per_cell', label: 'Per cell' },
    ];

    const FRONTIER_TECHNIQUE_OPTIONS = [
        { value: 'control', label: 'Current control' },
        { value: 'shader_frontier_band', label: 'Shader frontier band' },
        { value: 'marching_squares_midpoint', label: 'Marching squares (midpoint)' },
        { value: 'marching_squares_scalar', label: 'Marching squares (scalar)' },
        { value: 'marching_triangles_fixed', label: 'Marching triangles (fixed)' },
        { value: 'marching_triangles_checkerboard', label: 'Marching triangles (checkerboard)' },
        { value: 'marching_triangles_gradient', label: 'Marching triangles (gradient)' },
    ];

    const FRONTIER_PHASE_SAMPLING_OPTIONS = [
        { value: 'nearest', label: 'Nearest' },
        { value: 'linear', label: 'Linear' },
    ];

    const FRONTIER_TRIANGLE_DIAGONAL_OPTIONS = [
        { value: 'fixed', label: 'Fixed' },
        { value: 'checkerboard', label: 'Checker' },
        { value: 'gradient', label: 'Gradient' },
    ];

    const FRONTIER_RECIPE_OPTIONS = [
        { value: 'custom', label: 'Custom' },
        ...TERRITORY_FRONTIER_RECIPE_PRESETS.map((preset) => ({
            value: preset.id,
            label: preset.label,
        })),
    ];

    const ADJACENCY_OPTIONS = [
        { value: '8', label: '8-way' },
        { value: '4', label: '4-way' },
    ];

    const WAVE_GEOMETRY_OPTIONS = [
        { value: 'grid_bfs', label: 'Grid BFS' },
        { value: 'euclidean_band', label: 'Euclidean' },
        { value: 'conquered_star_radial', label: 'Radial' },
        { value: 'pre_to_post_frontier', label: 'Frontier' },
    ];

    const WAVE_SEEDING_OPTIONS = [
        { value: 'winner_natives', label: 'Natives' },
        { value: 'conquered_star_center', label: 'Center' },
        { value: 'winner_nearest_edge', label: 'Edge' },
    ];

    const FLIP_TRANSITION_OPTIONS = [
        { value: 'hard', label: 'Hard' },
        { value: 'lerp_per_cell', label: 'Lerp' },
        { value: 'dual_pass_blend', label: 'Dual-pass' },
    ];

    const WAVE_EASE_OPTIONS = [
        { value: 'linear', label: 'Linear (no easing)' },
        { value: 'ease_in', label: 'Ease in (quadratic)' },
        { value: 'ease_out', label: 'Ease out (quadratic)' },
        { value: 'ease_in_out', label: 'Ease in-out' },
        { value: 'back_out', label: 'Back out (slight overshoot)' },
        { value: 'elastic_out', label: 'Elastic out (spring)' },
    ];

    let activeModule = $derived(
        (panel[CELL_GRID_MODULE_PANEL_KEY] ?? 'all') as CellGridModuleId,
    );
    let moduleVisibilityOptions = $derived<PaxHudSegmentedOption[]>([
        { value: 'all', label: 'All' },
        { value: 'none', label: 'None' },
        ...visibleModules().map((module) => ({
            value: module.id,
            label: module.label,
        })),
    ]);

    function currentRenderMode(): string | null {
        return (
            panel.territoryRenderMode ??
            GAME_CONFIG.TERRITORY_RENDER_MODE ??
            null
        );
    }

    function isPhaseEdgesMode(): boolean {
        return currentRenderMode() === 'phase_edges';
    }

    function isEmberLatticeMode(): boolean {
        return currentRenderMode() === 'ember_lattice';
    }

    function isPhaseFieldMode(): boolean {
        return currentRenderMode() === 'phase_field';
    }

    function isEdgeForwardMode(): boolean {
        return isPhaseEdgesMode() || isEmberLatticeMode();
    }

    function visibleModules() {
        // Frontier module is available to every cell-grid mode now (Phase Edges,
        // Ember, Phase Field) so the Frontier Technique / smooth-fill controls are
        // exposed uniformly. Finish stays Phase-Field-only.
        return CELL_GRID_MODULES.filter(
            (module) => module.id !== 'finish' || isPhaseFieldMode(),
        );
    }

    $effect(() => {
        if (activeModule === 'all' || activeModule === 'none') return;
        if (!visibleModules().some((module) => module.id === activeModule)) {
            updatePanel(CELL_GRID_MODULE_PANEL_KEY, 'all');
        }
    });

    function showModule(id: Exclude<CellGridModuleId, 'all' | 'none'>): boolean {
        return activeModule === 'all' || activeModule === id;
    }

    function showFrontierControls(): boolean {
        return showModule('frontier');
    }

    function setActiveModule(value: CellGridModuleId): void {
        updatePanel(CELL_GRID_MODULE_PANEL_KEY, value);
    }

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        const prev = (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
        // PAUSE-EXEMPT (settings panel pauses the game). Shows whether the toggle
        // even fired + the active mode (some keys only act in specific modes).
        log.ui(
            "cellgrid",
            `${configKey} = ${JSON.stringify(value)} (was ${JSON.stringify(prev)}) [mode=${(GAME_CONFIG as unknown as Record<string, unknown>).TERRITORY_RENDER_MODE}]`,
        );
    }

    function panelKeyFromConfig(configKey: string): string {
        return configKey
            .toLowerCase()
            .replace(/_([a-z0-9])/g, (_, value: string) => value.toUpperCase());
    }

    function currentModeLockNote(): string | null {
        if (isEmberLatticeMode()) {
            return 'Ember Lattice keeps the dense square ownership mass but derives a softer blended frontier seam from contour/frontier extraction. Tune the seam locally here.';
        }
        if (isPhaseEdgesMode()) {
            return 'Phase Edges is the simpler edge-forward conquest mode. Tune grid, wave, and border behavior here without Ember Lattice contour/seam overrides.';
        }
        if (isPhaseFieldMode()) {
            return 'Phase Field is built for fill-first conquest. Choose how the takeover spreads, then tune the cell look, border feel, and finish timing.';
        }
        return null;
    }

    function currentPlannerSpacingLabel(): string {
        return isPhaseFieldMode() ? 'Base Resolution' : 'Cell Spacing';
    }

    function currentPlannerSpacingDescription(): string {
        if (isPhaseFieldMode()) {
            return 'Authoritative phase-field lattice spacing. It sets ownership classification density, conquest-wave timing density, transition-cell size, and grid-derived border/frontier detail. Smaller = denser behavior and heavier CPU. It does not set the visible interior fill-pattern pitch.';
        }
        return 'Distance between grid Vstar centers. Drives cell count as (worldWidth/spacing)x(worldHeight/spacing).';
    }

    function snapPatternSpacingPx(raw: number): number {
        const clamped = Math.max(1, Math.min(64, Math.round(raw)));
        if (clamped <= 24) return clamped;
        return Math.max(24, Math.min(64, 24 + Math.round((clamped - 24) / 4) * 4));
    }

    function currentPatternSpacingPx(): number {
        const raw = (
            panel.cellGridPatternSpacingPx ??
            (GAME_CONFIG as unknown as Record<string, unknown>).CELL_GRID_PATTERN_SPACING_PX ??
            cellGridPhaseFieldModeDefaults.CELL_GRID_PATTERN_SPACING_PX ??
            64
        ) as number;
        return snapPatternSpacingPx(raw);
    }

    function currentBorderBlendLabel(): string {
        return isPhaseFieldMode()
            ? 'Singular blended territory border'
            : 'Centered-blended borders';
    }

    function currentBorderBlendTitle(): string {
        if (isPhaseFieldMode()) {
            return 'On: phase-field draws one blended centerline border between players, aligned by the same territory constraints as the fills. Off: borders fall back to grid cell edges.';
        }
        return "Centered-blended borders: a single stroke on each ownership-boundary edge, coloured as the 50/50 blend of the two players' border colours. Off: each cell draws its own stroke in its own colour, so boundaries show two abutting strokes.";
    }

    function currentBorderBlendDescription(): string {
        if (usesSingularCenterlineTerritoryBorders()) {
            return 'Phase Field default: Territory-edge + singular blended border draws one player-blended centerline aligned to the constrained territory fill boundary. Turn this off to use grid cell edges instead.';
        }
        return 'Only applies when Border Mode = "Territory edge". On: one blended stroke per shared boundary edge. Off: each cell strokes its own outline in its own colour (edges appear as two abutting lines).';
    }

    function usesSingularCenterlineTerritoryBorders(): boolean {
        return (
            isPhaseFieldMode() &&
            currentBorderMode() === 'territory_edge' &&
            currentBorderBlend()
        );
    }

    function usesGridEdgeShapingControls(): boolean {
        return (
            currentBorderMode() === 'territory_edge' &&
            !usesSingularCenterlineTerritoryBorders()
        );
    }

    function showGridEdgeShapingControls(): boolean {
        return !isEmberLatticeMode() && usesGridEdgeShapingControls();
    }

    function usesBorderChaikinControl(): boolean {
        if (isPhaseFieldMode()) return false;
        return (
            currentBorderMode() === 'territory_edge' &&
            currentBorderBlend() &&
            currentDistribution() === 'square'
        );
    }

    function usesSharedEdgeSmoothingControl(): boolean {
        if (!showGridEdgeShapingControls()) return false;
        if (!isPhaseFieldMode()) return true;
        return currentCellShape() === 'square';
    }

    function sharedEdgeSmoothingDescription(): string {
        return isPhaseFieldMode()
            ? 'Rounds square grid-edge boundary strokes.'
            : 'Softens the grid-edge border path before Chaikin rounding.';
    }

    function sharedEdgeTrimDescription(): string {
        return isPhaseFieldMode()
            ? 'Moves grid-edge boundary strokes inward.'
            : 'Trims open grid-edge border chains at both ends.';
    }

    // Resolved values.
    function currentDistribution(): 'square' | 'hex_offset' | 'jittered' {
        const raw =
            panel.cellGridDistribution ??
            GAME_CONFIG.CELL_GRID_DISTRIBUTION ??
            'square';
        if (raw === 'hex_offset') return 'hex_offset';
        if (raw === 'jittered') return 'jittered';
        return 'square';
    }

    function currentOriginMode(): 'centered' | 'corner' {
        const raw =
            panel.cellGridOriginMode ??
            GAME_CONFIG.CELL_GRID_ORIGIN_MODE ??
            'centered';
        return raw === 'corner' ? 'corner' : 'centered';
    }

    function currentAdjacency(): '4' | '8' {
        const raw =
            panel.cellGridAdjacency ?? GAME_CONFIG.CELL_GRID_ADJACENCY ?? '8';
        return raw === '4' ? '4' : '8';
    }

    function currentWaveGeometry():
        | 'grid_bfs'
        | 'euclidean_band'
        | 'conquered_star_radial'
        | 'pre_to_post_frontier' {
        const raw =
            panel.cellGridWaveGeometry ??
            GAME_CONFIG.CELL_GRID_WAVE_GEOMETRY ??
            (isEmberLatticeMode()
                ? cellGridPhaseEdgesModeDefaults.CELL_GRID_WAVE_GEOMETRY
                : 'grid_bfs');
        if (raw === 'conquered_star_radial') return 'conquered_star_radial';
        if (raw === 'pre_to_post_frontier') return 'pre_to_post_frontier';
        return raw === 'euclidean_band' ? 'euclidean_band' : 'grid_bfs';
    }

    function currentWaveSeeding():
        | 'winner_natives'
        | 'conquered_star_center'
        | 'winner_nearest_edge' {
        const raw =
            panel.cellGridWaveSeeding ??
            GAME_CONFIG.CELL_GRID_WAVE_SEEDING ??
            'winner_natives';
        if (raw === 'conquered_star_center') return 'conquered_star_center';
        if (raw === 'winner_nearest_edge') return 'winner_nearest_edge';
        return 'winner_natives';
    }

    function currentFlipTransition(): 'hard' | 'lerp_per_cell' | 'dual_pass_blend' {
        const raw =
            panel.cellGridFlipTransition ??
            GAME_CONFIG.CELL_GRID_FLIP_TRANSITION ??
            'hard';
        if (raw === 'lerp_per_cell') return 'lerp_per_cell';
        if (raw === 'dual_pass_blend') return 'dual_pass_blend';
        return 'hard';
    }

    function currentCellShape(): 'square' | 'circle' | 'diamond' | 'hex' {
        const raw =
            panel.cellGridCellShape ??
            GAME_CONFIG.CELL_GRID_CELL_SHAPE ??
            'square';
        if (raw === 'circle') return 'circle';
        if (raw === 'diamond') return 'diamond';
        if (raw === 'hex') return 'hex';
        return 'square';
    }

    function currentBorderMode(): 'off' | 'per_cell' | 'territory_edge' {
        const modeDefault = isEmberLatticeMode()
            ? cellGridPhaseEdgesModeDefaults.CELL_GRID_BORDER_MODE
            : isPhaseFieldMode()
              ? cellGridPhaseFieldModeDefaults.CELL_GRID_BORDER_MODE
              : 'off';
        const raw =
            panel.cellGridBorderMode ??
            GAME_CONFIG.CELL_GRID_BORDER_MODE ??
            modeDefault;
        if (raw === 'per_cell') return 'per_cell';
        if (raw === 'territory_edge') return 'territory_edge';
        return 'off';
    }

    function currentBorderBlend(): boolean {
        const modeDefault = isEmberLatticeMode()
            ? cellGridPhaseEdgesModeDefaults.CELL_GRID_BORDER_BLEND
            : isPhaseFieldMode()
              ? cellGridPhaseFieldModeDefaults.CELL_GRID_BORDER_BLEND
              : true;
        return panel.cellGridBorderBlend ?? GAME_CONFIG.CELL_GRID_BORDER_BLEND ?? modeDefault;
    }

    function currentBorderChaikinPasses(): number {
        const modeDefault = isEmberLatticeMode()
            ? cellGridPhaseEdgesModeDefaults.CELL_GRID_BORDER_CHAIKIN_PASSES
            : isPhaseFieldMode()
              ? cellGridPhaseFieldModeDefaults.CELL_GRID_BORDER_CHAIKIN_PASSES
              : 0;
        return (
            panel.cellGridBorderChaikinPasses ??
            GAME_CONFIG.CELL_GRID_BORDER_CHAIKIN_PASSES ??
            modeDefault
        );
    }

    function currentWaveEase():
        | 'linear'
        | 'ease_in'
        | 'ease_out'
        | 'ease_in_out'
        | 'back_out'
        | 'elastic_out' {
        const raw =
            panel.cellGridWaveEase ??
            GAME_CONFIG.CELL_GRID_WAVE_EASE ??
            'linear';
        if (
            raw === 'ease_in' ||
            raw === 'ease_out' ||
            raw === 'ease_in_out' ||
            raw === 'back_out' ||
            raw === 'elastic_out'
        )
            return raw;
        return 'linear';
    }

    function currentPhaseFieldFinishFadeStart(): number {
        return (
            panel.cellGridPhaseFieldFinishFadeStart ??
            GAME_CONFIG.CELL_GRID_PHASE_FIELD_FINISH_FADE_START ??
            0.82
        );
    }

    function currentPhaseFieldFinishFadeEnd(): number {
        return (
            panel.cellGridPhaseFieldFinishFadeEnd ??
            GAME_CONFIG.CELL_GRID_PHASE_FIELD_FINISH_FADE_END ??
            1
        );
    }

    function currentPhaseFieldSizeCollapseStart(): number {
        return (
            panel.cellGridPhaseFieldSizeCollapseStart ??
            GAME_CONFIG.CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START ??
            0.72
        );
    }

    function currentPhaseFieldSizeCollapseEnd(): number {
        return (
            panel.cellGridPhaseFieldSizeCollapseEnd ??
            GAME_CONFIG.CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END ??
            1
        );
    }

    function currentPhaseFieldFinalCellSizePx(): number {
        return (
            panel.cellGridPhaseFieldFinalCellSizePx ??
            GAME_CONFIG.CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX ??
            1
        );
    }

    function currentPhaseFieldFrontierHighlight(): boolean {
        return (
            panel.cellGridPhaseFieldFrontierHighlight ??
            GAME_CONFIG.CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT ??
            true
        );
    }

    function currentPhaseFieldFrontierFadeStart(): number {
        return (
            panel.cellGridPhaseFieldFrontierFadeStart ??
            GAME_CONFIG.CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START ??
            0.8
        );
    }

    function currentPhaseFieldFrontierFadeEnd(): number {
        return (
            panel.cellGridPhaseFieldFrontierFadeEnd ??
            GAME_CONFIG.CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END ??
            0.96
        );
    }

    const CELL_GRID_BASELINE_SPACING_PX = 48;

    function currentSpacingPx(): number {
        return panel.cellGridSpacingPx ?? GAME_CONFIG.CELL_GRID_SPACING_PX ?? CELL_GRID_BASELINE_SPACING_PX;
    }


    function currentFrontierTechnique():
        | 'control'
        | 'shader_frontier_band'
        | 'marching_squares_midpoint'
        | 'marching_squares_scalar'
        | 'marching_triangles_fixed'
        | 'marching_triangles_checkerboard'
        | 'marching_triangles_gradient' {
        const raw =
            panel.territoryFrontierTechnique ??
            GAME_CONFIG.TERRITORY_FRONTIER_TECHNIQUE ??
            'control';
        if (
            raw === 'shader_frontier_band' ||
            raw === 'marching_squares_midpoint' ||
            raw === 'marching_squares_scalar' ||
            raw === 'marching_triangles_fixed' ||
            raw === 'marching_triangles_checkerboard' ||
            raw === 'marching_triangles_gradient'
        ) {
            return raw;
        }
        return 'control';
    }

    function currentFrontierBorderGeometryMode():
        | 'shared_edge'
        | 'contour_matched' {
        const raw =
            panel.territoryFrontierBorderGeometryMode ??
            GAME_CONFIG.TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE ??
            (isEmberLatticeMode()
                ? cellGridPhaseEdgesModeDefaults.TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE
                : 'shared_edge');
        return raw === 'contour_matched' ? 'contour_matched' : 'shared_edge';
    }

    function currentFrontierPhaseSampling(): 'nearest' | 'linear' {
        const raw =
            panel.territoryFrontierPhaseSampling ??
            GAME_CONFIG.TERRITORY_FRONTIER_PHASE_SAMPLING ??
            'nearest';
        return raw === 'linear' ? 'linear' : 'nearest';
    }

    function currentFrontierTriangleDiagonalPolicy():
        | 'fixed'
        | 'checkerboard'
        | 'gradient' {
        const raw =
            panel.territoryFrontierTriangleDiagonalPolicy ??
            GAME_CONFIG.TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY ??
            'fixed';
        if (raw === 'checkerboard' || raw === 'gradient') return raw;
        return 'fixed';
    }

    function currentFrontierBlurPasses(): number {
        return (
            panel.territoryFrontierBlurPasses ??
            GAME_CONFIG.TERRITORY_FRONTIER_BLUR_PASSES ??
            0
        );
    }

    function currentFrontierChaikinPasses(): number {
        return (
            panel.territoryFrontierChaikinPasses ??
            GAME_CONFIG.TERRITORY_FRONTIER_CHAIKIN_PASSES ??
            0
        );
    }

    function currentFrontierShaderSoftnessPx(): number {
        return (
            panel.territoryFrontierShaderSoftnessPx ??
            GAME_CONFIG.TERRITORY_FRONTIER_SHADER_SOFTNESS_PX ??
            5
        );
    }

    function currentFrontierBandWidthPx(): number {
        return (
            panel.territoryFrontierBandWidthPx ??
            GAME_CONFIG.TERRITORY_FRONTIER_BAND_WIDTH_PX ??
            2
        );
    }

    function canUseEmberFrontierTechnique(): boolean {
        // Frontier Technique applies to ANY square-lattice cell-grid mode
        // (Phase Edges, Ember, Phase Field) — not Ember-only. The only real
        // requirement is the square distribution the shader-band/contour paths need.
        return currentDistribution() === 'square';
    }

    function isControlFrontierTechnique(): boolean {
        return currentFrontierTechnique() === 'control';
    }

    function canUseControlFrontierBorderGeometry(): boolean {
        return (
            isControlFrontierTechnique() &&
            currentDistribution() === 'square' &&
            currentBorderMode() === 'territory_edge' &&
            currentBorderBlend()
        );
    }

    function isShaderFrontierTechnique(): boolean {
        return currentFrontierTechnique() === 'shader_frontier_band';
    }

    function isContourFrontierTechnique(): boolean {
        return (
            currentFrontierTechnique() === 'marching_squares_midpoint' ||
            currentFrontierTechnique() === 'marching_squares_scalar' ||
            currentFrontierTechnique() === 'marching_triangles_fixed' ||
            currentFrontierTechnique() === 'marching_triangles_checkerboard' ||
            currentFrontierTechnique() === 'marching_triangles_gradient'
        );
    }

    function isTriangleFrontierTechnique(): boolean {
        return (
            currentFrontierTechnique() === 'marching_triangles_fixed' ||
            currentFrontierTechnique() === 'marching_triangles_checkerboard' ||
            currentFrontierTechnique() === 'marching_triangles_gradient'
        );
    }

    function applyFrontierPreset(
        preset: Pick<TerritoryFrontierRecipePreset, 'values'>,
    ): void {
        for (const [configKey, value] of Object.entries(preset.values)) {
            writeConfig(configKey, panelKeyFromConfig(configKey), value);
        }
    }

    function isFrontierPresetSelected(
        preset: Pick<TerritoryFrontierRecipePreset, 'values'>,
    ): boolean {
        return Object.entries(preset.values).every(([configKey, value]) => {
            const panelValue = panel[panelKeyFromConfig(configKey)];
            const configValue =
                (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
            return (panelValue ?? configValue) === value;
        });
    }

    function currentFrontierRecipeId(): string {
        const selectedPreset = TERRITORY_FRONTIER_RECIPE_PRESETS.find((preset) =>
            isFrontierPresetSelected(preset),
        );
        return selectedPreset?.id ?? 'custom';
    }

    function applyFrontierRecipe(recipeId: string): void {
        const preset = TERRITORY_FRONTIER_RECIPE_PRESETS.find(
            (candidate) => candidate.id === recipeId,
        );
        if (!preset) return;
        applyFrontierPreset(preset);
    }
</script>

<div class="module-head">
    <PaxInfoHint
        text="Section chips (Grid, Frontier, Wave, Flip, Finish) only change which controls are shown here — they do not switch the renderer or apply any visual effect by themselves."
    />
    <PaxHudSegmentedControl
        class="module-scope-toggle"
        value={activeModule}
        options={moduleVisibilityOptions}
        density="compact"
        ariaLabel="Cell grid subsection visibility"
        onValueChange={(value) => setActiveModule(value as CellGridModuleId)}
    />
</div>

{#if currentModeLockNote()}
    <div class="mode-lock-note">
        {currentModeLockNote()}
    </div>
{/if}

{#if showModule('grid')}
<div class="module-block">
<PaxSettingsToggleRow
    label="Cell Grid Enabled"
    checked={panel.cellGridEnabled ?? GAME_CONFIG.CELL_GRID_ENABLED ?? false}
    description="Master switch for the cell-grid conquest family. Leave on to preview; the render mode selector in Mode must also be set to Cell grid."
    meta={(panel.cellGridEnabled ?? GAME_CONFIG.CELL_GRID_ENABLED ?? false) ? 'On' : 'Off'}
    settingConfigKey="CELL_GRID_ENABLED"
    onChange={(value) => {
        writeConfig('CELL_GRID_ENABLED', 'cellGridEnabled', value);
    }}
/>

<PaxSettingsRangeRow
    label={currentPlannerSpacingLabel()}
    note={currentPlannerSpacingDescription()}
    value={currentSpacingPx()}
    min={1}
    max={64}
    step={1}
    suffix="px"
    settingConfigKey="CELL_GRID_SPACING_PX"
    onInput={(value) => {
        writeConfig('CELL_GRID_SPACING_PX', 'cellGridSpacingPx', value);
    }}
/>

{#if isPhaseFieldMode()}
<PaxSettingsRangeRow
    label="Pattern Spacing"
    note="Visible interior fill-pattern spacing for the PRE/NEXT ownership fills."
    value={currentPatternSpacingPx()}
    min={1}
    max={64}
    step={1}
    suffix="px"
    settingConfigKey="CELL_GRID_PATTERN_SPACING_PX"
    onInput={(raw) => {
        const value = snapPatternSpacingPx(raw);
        writeConfig('CELL_GRID_PATTERN_SPACING_PX', 'cellGridPatternSpacingPx', value);
    }}
/>
{/if}

<PaxSettingsSegmentedRow
    label="Origin Mode"
    hint="Cell origin: Centered = half-spacing offset; Corner = anchored at (0,0)."
    value={currentOriginMode()}
    options={ORIGIN_MODE_OPTIONS}
    settingConfigKey="CELL_GRID_ORIGIN_MODE"
    onValueChange={(value) => {
        writeConfig('CELL_GRID_ORIGIN_MODE', 'cellGridOriginMode', value);
    }}
/>

<PaxSettingsSegmentedRow
    label="Distribution"
    hint="Cell distribution: Square grid, Hex offset rows, or Jittered (per-cell scatter)."
    value={currentDistribution()}
    options={DISTRIBUTION_OPTIONS}
    settingConfigKey="CELL_GRID_DISTRIBUTION"
    onValueChange={(value) => {
        writeConfig('CELL_GRID_DISTRIBUTION', 'cellGridDistribution', value);
    }}
/>

<PaxSettingsRangeRow
    label="Position Jitter"
    note="Deterministic per-cell scatter as a fraction of spacing."
    value={panel.cellGridPositionJitter ?? GAME_CONFIG.CELL_GRID_POSITION_JITTER ?? 0}
    min={0}
    max={0.5}
    step={0.005}
    output={(panel.cellGridPositionJitter ?? GAME_CONFIG.CELL_GRID_POSITION_JITTER ?? 0).toFixed(3)}
    disabled={currentDistribution() !== 'jittered'}
    settingConfigKey="CELL_GRID_POSITION_JITTER"
    onInput={(value) => {
        writeConfig('CELL_GRID_POSITION_JITTER', 'cellGridPositionJitter', value);
    }}
/>

<PaxSettingsRangeRow
    label="Max Cells"
    note="Planner safety cap. Set to 0 to remove the cap."
    value={panel.cellGridMaxCells ?? GAME_CONFIG.CELL_GRID_MAX_CELLS ?? 0}
    min={0}
    max={200000}
    step={1000}
    output={`${Math.round(panel.cellGridMaxCells ?? GAME_CONFIG.CELL_GRID_MAX_CELLS ?? 0)}`}
    settingConfigKey="CELL_GRID_MAX_CELLS"
    onInput={(value) => {
        writeConfig('CELL_GRID_MAX_CELLS', 'cellGridMaxCells', value);
    }}
/>

</div>
{/if}

{#if isPhaseFieldMode() && showModule('grid')}
<div class="module-block">
<PaxSettingsSegmentedRow
    label="Cell Shape"
    hint="Visual primitive drawn per cell. Square packs tightly; circle and diamond leave corner gaps for a stippled look; hex draws pointy-top hexagons with honeycomb row-offset tessellation (≈13% vertical gap reads as fine grid lines — pure pointy-top can't perfectly tile a square grid)."
    value={currentCellShape()}
    options={CELL_SHAPE_OPTIONS}
    settingConfigKey="CELL_GRID_CELL_SHAPE"
    onValueChange={(value) => {
        writeConfig('CELL_GRID_CELL_SHAPE', 'cellGridCellShape', value);
    }}
/>

<PaxSettingsRangeRow
    label="Cell Inset"
    note="Per-cell inward shrink on every side. 0 = fully tiled; small values draw visible grid lines; large values isolate each cell as a small shape. Capped to 45% of spacing so cells never collapse."
    value={panel.cellGridCellInsetPx ?? GAME_CONFIG.CELL_GRID_CELL_INSET_PX ?? 0}
    min={0}
    max={48}
    step={0.5}
    output={`${panel.cellGridCellInsetPx ?? GAME_CONFIG.CELL_GRID_CELL_INSET_PX ?? 0}px`}
    settingConfigKey="CELL_GRID_CELL_INSET_PX"
    onInput={(value) => {
        writeConfig('CELL_GRID_CELL_INSET_PX', 'cellGridCellInsetPx', value);
    }}
/>

<PaxSettingsRangeRow
    label="Inward Offset"
    note="Contracts the resolved fill surface inward after MSR/CX/DX/LP shaping. The cell pattern is drawn inside that inset surface."
    value={panel.cellGridInwardOffsetPx ?? GAME_CONFIG.CELL_GRID_INWARD_OFFSET_PX ?? 0}
    min={0}
    max={24}
    step={1}
    suffix="px"
    settingConfigKey="CELL_GRID_INWARD_OFFSET_PX"
    onInput={(value) => {
        writeConfig('CELL_GRID_INWARD_OFFSET_PX', 'cellGridInwardOffsetPx', value);
    }}
/>

<PaxSettingsRangeRow
    label="Square Corner"
    note="Rounded-corner radius for square cells. Ignored for circle and diamond primitives. Clamped to half the cell size."
    value={panel.cellGridCellCornerPx ?? GAME_CONFIG.CELL_GRID_CELL_CORNER_PX ?? 0}
    min={0}
    max={48}
    step={0.5}
    output={`${panel.cellGridCellCornerPx ?? GAME_CONFIG.CELL_GRID_CELL_CORNER_PX ?? 0}px`}
    settingConfigKey="CELL_GRID_CELL_CORNER_PX"
    onInput={(value) => {
        writeConfig('CELL_GRID_CELL_CORNER_PX', 'cellGridCellCornerPx', value);
    }}
/>

<PaxSettingsSegmentedRow
    label="Border Mode"
    hint="Where to draw the Territory border stroke. Off = none. Per cell draws a full grid outline. Edge outlines only ownership boundaries (or the world edge) — cheap and distinctive. Width/alpha/HSL come from the Territory border SLA widget below."
    value={currentBorderMode()}
    options={BORDER_MODE_OPTIONS}
    disabled={currentFrontierTechnique() !== 'control'}
    settingConfigKey="CELL_GRID_BORDER_MODE"
    onValueChange={(value) => {
        writeConfig('CELL_GRID_BORDER_MODE', 'cellGridBorderMode', value);
    }}
/>

<PaxSettingsToggleRow
    label={currentBorderBlendLabel()}
    checked={currentBorderBlend()}
    disabled={currentFrontierTechnique() !== 'control' || currentBorderMode() !== 'territory_edge'}
    description={currentBorderBlendDescription()}
    meta={currentBorderBlend() ? 'On' : 'Off'}
    settingConfigKey="CELL_GRID_BORDER_BLEND"
    onChange={(value) => {
        writeConfig('CELL_GRID_BORDER_BLEND', 'cellGridBorderBlend', value);
    }}
/>

{#if isPhaseFieldMode()}
<PaxSettingsToggleRow
    label="Frontier Highlight"
    checked={currentPhaseFieldFrontierHighlight()}
    description="Phase Field only: add a winner-side accent at the active conquest front."
    meta={currentPhaseFieldFrontierHighlight() ? 'On' : 'Off'}
    settingConfigKey="CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT"
    onChange={(value) => {
        writeConfig(
            'CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT',
            'cellGridPhaseFieldFrontierHighlight',
            value,
        );
    }}
/>
{/if}

{#if showGridEdgeShapingControls()}
    {#if usesBorderChaikinControl()}
        <PaxSettingsRangeRow
            label="Border Chaikin Passes"
            note="Rounds territory-edge polylines; higher values trade CPU for softer boundaries."
            value={currentBorderChaikinPasses()}
            min={0}
            max={4}
            step={1}
            output={`${currentBorderChaikinPasses()}`}
            settingConfigKey="CELL_GRID_BORDER_CHAIKIN_PASSES"
            onInput={(value) => {
                writeConfig('CELL_GRID_BORDER_CHAIKIN_PASSES', 'cellGridBorderChaikinPasses', value);
            }}
        />
    {/if}

    {#if usesSharedEdgeSmoothingControl()}
        <PaxSettingsRangeRow
            label="Shared Edge Smoothing"
            note={sharedEdgeSmoothingDescription()}
            value={panel.cellGridEdgeSmoothingPasses ?? GAME_CONFIG.CELL_GRID_EDGE_SMOOTHING_PASSES ?? 0}
            min={0}
            max={4}
            step={1}
            output={`${panel.cellGridEdgeSmoothingPasses ?? GAME_CONFIG.CELL_GRID_EDGE_SMOOTHING_PASSES ?? 0}`}
            settingConfigKey="CELL_GRID_EDGE_SMOOTHING_PASSES"
            onInput={(value) => {
                writeConfig('CELL_GRID_EDGE_SMOOTHING_PASSES', 'cellGridEdgeSmoothingPasses', value);
            }}
        />
    {/if}

    <PaxSettingsRangeRow
        label="Shared Edge Trim"
        note={sharedEdgeTrimDescription()}
        value={panel.cellGridEdgeTrimPx ?? GAME_CONFIG.CELL_GRID_EDGE_TRIM_PX ?? 0}
        min={0}
        max={12}
        step={0.5}
        output={`${(panel.cellGridEdgeTrimPx ?? GAME_CONFIG.CELL_GRID_EDGE_TRIM_PX ?? 0).toFixed(1)}px`}
        settingConfigKey="CELL_GRID_EDGE_TRIM_PX"
        onInput={(value) => {
            writeConfig('CELL_GRID_EDGE_TRIM_PX', 'cellGridEdgeTrimPx', value);
        }}
    />
{:else if isEmberLatticeMode()}
<PaxSettingsRangeRow
    label="Border Chaikin Passes"
    note="Rounds territory-edge boundaries for the control frontier path."
    value={currentBorderChaikinPasses()}
    min={0}
    max={4}
    step={1}
    output={`${currentBorderChaikinPasses()}`}
    disabled={!isControlFrontierTechnique() || currentBorderMode() !== 'territory_edge'}
    settingConfigKey="CELL_GRID_BORDER_CHAIKIN_PASSES"
    onInput={(value) => {
        writeConfig('CELL_GRID_BORDER_CHAIKIN_PASSES', 'cellGridBorderChaikinPasses', value);
    }}
/>

<PaxSettingsRangeRow
    label="Shared Edge Smoothing"
    note="Additional shared-edge softening for the straight control border path."
    value={panel.cellGridEdgeSmoothingPasses ?? GAME_CONFIG.CELL_GRID_EDGE_SMOOTHING_PASSES ?? 0}
    min={0}
    max={4}
    step={1}
    output={`${panel.cellGridEdgeSmoothingPasses ?? GAME_CONFIG.CELL_GRID_EDGE_SMOOTHING_PASSES ?? 0}`}
    disabled={!canUseControlFrontierBorderGeometry() || currentFrontierBorderGeometryMode() !== 'shared_edge'}
    settingConfigKey="CELL_GRID_EDGE_SMOOTHING_PASSES"
    onInput={(value) => {
        writeConfig('CELL_GRID_EDGE_SMOOTHING_PASSES', 'cellGridEdgeSmoothingPasses', value);
    }}
/>

<PaxSettingsRangeRow
    label="Shared Edge Trim"
    note="Endpoint trim for open shared-edge chains."
    value={panel.cellGridEdgeTrimPx ?? GAME_CONFIG.CELL_GRID_EDGE_TRIM_PX ?? 0}
    min={0}
    max={12}
    step={0.5}
    output={`${(panel.cellGridEdgeTrimPx ?? GAME_CONFIG.CELL_GRID_EDGE_TRIM_PX ?? 0).toFixed(1)}px`}
    disabled={!canUseControlFrontierBorderGeometry() || currentFrontierBorderGeometryMode() !== 'shared_edge'}
    settingConfigKey="CELL_GRID_EDGE_TRIM_PX"
    onInput={(value) => {
        writeConfig('CELL_GRID_EDGE_TRIM_PX', 'cellGridEdgeTrimPx', value);
    }}
/>
{/if}
</div>
{/if}

{#if showFrontierControls()}
<div class="module-block">
<PaxHudSelect
    label="Frontier Recipe"
    hint="Applies a curated starting point for the frontier controls below. Custom means the manual controls no longer match one recipe. The full benchmark matrix lives in Developer Diagnostics."
    value={currentFrontierRecipeId()}
    options={FRONTIER_RECIPE_OPTIONS}
    disabled={!canUseEmberFrontierTechnique()}
    onValueChange={applyFrontierRecipe}
/>

<PaxHudSelect
    label="Frontier Technique"
    hint="Selects how the territory FILL surface is built: Current control keeps crisp scene cells (raster fill edge), while shader-band produces a smooth phase-fill that matches the border. Applies to every square-lattice cell-grid mode (Phase Edges, Ember, Phase Field). Surface styling and border-geometry controls live in Territory Styles."
    value={currentFrontierTechnique()}
    options={FRONTIER_TECHNIQUE_OPTIONS}
    disabled={!canUseEmberFrontierTechnique()}
    onValueChange={(value) => {
        writeConfig('TERRITORY_FRONTIER_TECHNIQUE', 'territoryFrontierTechnique', value);
    }}
/>

<PaxSettingsSegmentedRow
    label="Phase Sampling"
    hint="How the phase field is sampled for the shader frontier band: Nearest (crisp) or Linear (smoothed)."
    value={currentFrontierPhaseSampling()}
    options={FRONTIER_PHASE_SAMPLING_OPTIONS}
    disabled={!canUseEmberFrontierTechnique() || !isShaderFrontierTechnique()}
    settingConfigKey="TERRITORY_FRONTIER_PHASE_SAMPLING"
    onValueChange={(value) => {
        writeConfig('TERRITORY_FRONTIER_PHASE_SAMPLING', 'territoryFrontierPhaseSampling', value);
    }}
/>

<PaxSettingsRangeRow
    label="Blur Passes"
    note="Tiny horizontal and vertical blur passes before the frontier is rendered or contoured."
    value={currentFrontierBlurPasses()}
    min={0}
    max={2}
    step={1}
    output={`${currentFrontierBlurPasses()}`}
    disabled={!canUseEmberFrontierTechnique() || currentFrontierTechnique() === 'control'}
    settingConfigKey="TERRITORY_FRONTIER_BLUR_PASSES"
    onInput={(value) => {
        writeConfig('TERRITORY_FRONTIER_BLUR_PASSES', 'territoryFrontierBlurPasses', value);
    }}
/>

<PaxSettingsSegmentedRow
    label="Triangle Diagonal"
    hint="Diagonal split policy for marching-triangles contouring: Fixed, Checkerboard (alternating), or Gradient-chosen."
    value={currentFrontierTriangleDiagonalPolicy()}
    options={FRONTIER_TRIANGLE_DIAGONAL_OPTIONS}
    disabled={!canUseEmberFrontierTechnique() || !isTriangleFrontierTechnique()}
    settingConfigKey="TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY"
    onValueChange={(value) => {
        writeConfig(
            'TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY',
            'territoryFrontierTriangleDiagonalPolicy',
            value,
        );
    }}
/>

<PaxSettingsRangeRow
    label="Frontier Chaikin"
    note="Post-contour smoothing passes."
    value={currentFrontierChaikinPasses()}
    min={0}
    max={3}
    step={1}
    output={`${currentFrontierChaikinPasses()}`}
    disabled={!canUseEmberFrontierTechnique() || !isContourFrontierTechnique()}
    settingConfigKey="TERRITORY_FRONTIER_CHAIKIN_PASSES"
    onInput={(value) => {
        writeConfig('TERRITORY_FRONTIER_CHAIKIN_PASSES', 'territoryFrontierChaikinPasses', value);
    }}
/>

<PaxSettingsRangeRow
    label="Shader Softness"
    note="Softens the shader frontier band after phase sampling."
    value={currentFrontierShaderSoftnessPx()}
    min={0.5}
    max={20}
    step={0.5}
    output={`${currentFrontierShaderSoftnessPx().toFixed(1)}px`}
    disabled={!canUseEmberFrontierTechnique() || !isShaderFrontierTechnique()}
    settingConfigKey="TERRITORY_FRONTIER_SHADER_SOFTNESS_PX"
    onInput={(value) => {
        writeConfig(
            'TERRITORY_FRONTIER_SHADER_SOFTNESS_PX',
            'territoryFrontierShaderSoftnessPx',
            value,
        );
    }}
/>

<PaxSettingsRangeRow
    label="Band Width"
    note="Visible half-width of the shader frontier band."
    value={currentFrontierBandWidthPx()}
    min={0.5}
    max={12}
    step={0.5}
    output={`${currentFrontierBandWidthPx().toFixed(1)}px`}
    disabled={!canUseEmberFrontierTechnique() || !isShaderFrontierTechnique()}
    settingConfigKey="TERRITORY_FRONTIER_BAND_WIDTH_PX"
    onInput={(value) => {
        writeConfig('TERRITORY_FRONTIER_BAND_WIDTH_PX', 'territoryFrontierBandWidthPx', value);
    }}
/>
</div>
{/if}

{#if showModule('wave')}
<div class="module-block">
<PaxSettingsSegmentedRow
    label="Adjacency"
    hint="Grid connectivity for wave propagation: 8-way includes diagonals; 4-way is orthogonal only."
    value={currentAdjacency()}
    options={ADJACENCY_OPTIONS}
    settingConfigKey="CELL_GRID_ADJACENCY"
    onValueChange={(value) => {
        writeConfig('CELL_GRID_ADJACENCY', 'cellGridAdjacency', value);
    }}
/>

<PaxSettingsSegmentedRow
    label="Wave Geometry"
    hint="How the wave's rank (ordering) is derived. Grid BFS follows grid neighbors step-by-step; Euclidean bins cells by distance to the nearest seed; Radial/Frontier derive flip time directly from conquest-local frontier relationships."
    value={currentWaveGeometry()}
    options={WAVE_GEOMETRY_OPTIONS}
    settingConfigKey="CELL_GRID_WAVE_GEOMETRY"
    onValueChange={(value) => {
        writeConfig('CELL_GRID_WAVE_GEOMETRY', 'cellGridWaveGeometry', value);
    }}
/>

<PaxSettingsSegmentedRow
    label="Wave Seeding"
    hint="Where the wave starts. Natives spreads from the entire winner footprint; Center is a single point source at the conquered star; Edge picks the winner-owned cell(s) closest to the conquered star (forces 4-adjacency)."
    value={currentWaveSeeding()}
    options={WAVE_SEEDING_OPTIONS}
    settingConfigKey="CELL_GRID_WAVE_SEEDING"
    onValueChange={(value) => {
        writeConfig('CELL_GRID_WAVE_SEEDING', 'cellGridWaveSeeding', value);
    }}
/>
</div>
{/if}

{#if showModule('flip')}
<div class="module-block">
<PaxSettingsSegmentedRow
    label="Flip Transition"
    hint="How each cell visually transitions at its flip time. Hard looks like an instant pixel-flip; Lerp crossfades within ±window; Dual-pass always emits both passes with complementary alphas."
    value={currentFlipTransition()}
    options={FLIP_TRANSITION_OPTIONS}
    settingConfigKey="CELL_GRID_FLIP_TRANSITION"
    onValueChange={(value) => {
        writeConfig('CELL_GRID_FLIP_TRANSITION', 'cellGridFlipTransition', value);
    }}
/>

<PaxSettingsRangeRow
    label="Flip Window"
    note="Crossfade half-width around each cell's flip time (fraction of transition progress 0..1), for lerp per cell and dual pass blend. Larger values soften flips; 0 collapses to hard behavior."
    value={panel.cellGridFlipWindow ?? GAME_CONFIG.CELL_GRID_FLIP_WINDOW ?? 0.06}
    min={0}
    max={1}
    step={0.005}
    output={`${(panel.cellGridFlipWindow ?? GAME_CONFIG.CELL_GRID_FLIP_WINDOW ?? 0.06).toFixed(3)}`}
    settingConfigKey="CELL_GRID_FLIP_WINDOW"
    onInput={(value) => {
        writeConfig('CELL_GRID_FLIP_WINDOW', 'cellGridFlipWindow', value);
    }}
/>

<PaxHudSelect
    label="Wave Easing"
    hint="Progress easing curve applied BEFORE the per-cell flip math. Linear leaves timing as-is; ease in/out bias the wave to the start/end; back out / elastic out briefly overshoot 1 so the NEXT cells visibly settle into place — good with Lerp / Dual-pass flip modes."
    value={currentWaveEase()}
    options={WAVE_EASE_OPTIONS}
    onValueChange={(value) => {
        writeConfig('CELL_GRID_WAVE_EASE', 'cellGridWaveEase', value);
    }}
/>

<PaxSettingsRangeRow
    label="FlipTime Jitter"
    note="Per-cell deterministic shift applied to flip time, in progress units (seeded by cell id, stable across runs). 0.05 = each cell flips up to ±5% earlier/later than the wave rank dictates — breaks up rigid fronts for a more organic feel."
    value={panel.cellGridFlipWindowJitter ?? GAME_CONFIG.CELL_GRID_FLIP_WINDOW_JITTER ?? 0}
    min={0}
    max={0.5}
    step={0.005}
    output={`${(panel.cellGridFlipWindowJitter ?? GAME_CONFIG.CELL_GRID_FLIP_WINDOW_JITTER ?? 0).toFixed(3)}`}
    settingConfigKey="CELL_GRID_FLIP_WINDOW_JITTER"
    onInput={(value) => {
        writeConfig('CELL_GRID_FLIP_WINDOW_JITTER', 'cellGridFlipWindowJitter', value);
    }}
/>
</div>
{/if}

{#if showModule('finish')}
<div class="module-block">
{#if isPhaseFieldMode()}
<PaxSettingsRangeRow
    label="Finish Fade Start"
    note="Start of the end-tail alpha fade for PRE-side cells."
    value={currentPhaseFieldFinishFadeStart()}
    min={0}
    max={1}
    step={0.005}
    output={currentPhaseFieldFinishFadeStart().toFixed(3)}
    settingConfigKey="CELL_GRID_PHASE_FIELD_FINISH_FADE_START"
    onInput={(value) => {
        writeConfig(
            'CELL_GRID_PHASE_FIELD_FINISH_FADE_START',
            'cellGridPhaseFieldFinishFadeStart',
            value,
        );
    }}
/>

<PaxSettingsRangeRow
    label="Finish Fade End"
    note="End of the end-tail alpha fade for PRE-side cells."
    value={currentPhaseFieldFinishFadeEnd()}
    min={0}
    max={1}
    step={0.005}
    output={currentPhaseFieldFinishFadeEnd().toFixed(3)}
    settingConfigKey="CELL_GRID_PHASE_FIELD_FINISH_FADE_END"
    onInput={(value) => {
        writeConfig(
            'CELL_GRID_PHASE_FIELD_FINISH_FADE_END',
            'cellGridPhaseFieldFinishFadeEnd',
            value,
        );
    }}
/>

<PaxSettingsRangeRow
    label="Size Collapse Start"
    note="Start of the size-collapse tail."
    value={currentPhaseFieldSizeCollapseStart()}
    min={0}
    max={1}
    step={0.005}
    output={currentPhaseFieldSizeCollapseStart().toFixed(3)}
    settingConfigKey="CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START"
    onInput={(value) => {
        writeConfig(
            'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START',
            'cellGridPhaseFieldSizeCollapseStart',
            value,
        );
    }}
/>

<PaxSettingsRangeRow
    label="Size Collapse End"
    note="End of the size-collapse tail."
    value={currentPhaseFieldSizeCollapseEnd()}
    min={0}
    max={1}
    step={0.005}
    output={currentPhaseFieldSizeCollapseEnd().toFixed(3)}
    settingConfigKey="CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END"
    onInput={(value) => {
        writeConfig(
            'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END',
            'cellGridPhaseFieldSizeCollapseEnd',
            value,
        );
    }}
/>

<PaxSettingsRangeRow
    label="Final Cell Size"
    note="Smallest cell size the phase-field cleanup tail collapses toward."
    value={currentPhaseFieldFinalCellSizePx()}
    min={1}
    max={32}
    step={0.5}
    output={`${currentPhaseFieldFinalCellSizePx().toFixed(1)}px`}
    settingConfigKey="CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX"
    onInput={(value) => {
        writeConfig(
            'CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX',
            'cellGridPhaseFieldFinalCellSizePx',
            value,
        );
    }}
/>

<PaxSettingsRangeRow
    label="Frontier Fade Start"
    note="Start of the winner-side frontier accent fade."
    value={currentPhaseFieldFrontierFadeStart()}
    min={0}
    max={1}
    step={0.005}
    output={currentPhaseFieldFrontierFadeStart().toFixed(3)}
    settingConfigKey="CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START"
    onInput={(value) => {
        writeConfig(
            'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START',
            'cellGridPhaseFieldFrontierFadeStart',
            value,
        );
    }}
/>

<PaxSettingsRangeRow
    label="Frontier Fade End"
    note="End of the winner-side frontier accent fade."
    value={currentPhaseFieldFrontierFadeEnd()}
    min={0}
    max={1}
    step={0.005}
    output={currentPhaseFieldFrontierFadeEnd().toFixed(3)}
    settingConfigKey="CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END"
    onInput={(value) => {
        writeConfig(
            'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END',
            'cellGridPhaseFieldFrontierFadeEnd',
            value,
        );
    }}
/>
{/if}
</div>
{/if}

<style>

    .module-head {
        display: flex;
        justify-content: flex-end;
        margin: 0 0 var(--pax-space-2);
    }

    .mode-lock-note {
        margin: 0 0 var(--pax-gap-sm);
        font-size: var(--pax-type-2xs);
        line-height: 1.4;
        color: color-mix(in srgb, var(--pax-ui-text-strong) 72%, transparent);
    }

    .module-block {
        display: flex;
        flex-direction: column;
        gap: 0;
    }
</style>
