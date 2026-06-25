<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from '$lib/config/game.config';
    import {
        TERRITORY_FRONTIER_BENCHMARK_PRESETS,
        type TerritoryFrontierBenchmarkPreset,
    } from '$lib/territory/frontier';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import {
        cellGridPhaseEdgesModeDefaults,
        cellGridPhaseFieldModeDefaults,
    } from '$lib/territory/families/cellGrid/config';
    import { cellGridStats } from '$lib/territory/families/cellGrid/cellGridStats';
    import {
        PaxHudButton,
        PaxHudSegmentedControl,
        PaxHudSelect,
        PaxSettingsRangeRow,
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
        | 'perf';

    const CELL_GRID_MODULES = [
        { id: 'grid', label: 'Grid' },
        { id: 'frontier', label: 'Frontier' },
        { id: 'wave', label: 'Wave' },
        { id: 'flip', label: 'Flip' },
        { id: 'perf', label: 'Perf' },
    ] as const;

    const CELL_GRID_MODULE_PANEL_KEY = 'cellGridModuleVisibility';

    const ORIGIN_MODE_OPTIONS = [
        { value: 'centered', label: 'Centered (half-spacing offset)' },
        { value: 'corner', label: 'Corner / origin (0,0 anchor)' },
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
        { value: 'hex', label: 'Hex (pointy-top honeycomb)' },
    ];

    const BORDER_MODE_OPTIONS = [
        { value: 'off', label: 'Off (no borders)' },
        { value: 'territory_edge', label: 'Territory edge (owner boundaries only)' },
        { value: 'per_cell', label: 'Per cell (full grid outline)' },
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
        { value: 'checkerboard', label: 'Checkerboard' },
        { value: 'gradient', label: 'Gradient chosen' },
    ];

    const ADJACENCY_OPTIONS = [
        { value: '8', label: '8-connected (diagonals)' },
        { value: '4', label: '4-connected (orthogonal only)' },
    ];

    const WAVE_GEOMETRY_OPTIONS = [
        { value: 'grid_bfs', label: 'Grid BFS (step-by-step)' },
        { value: 'euclidean_band', label: 'Euclidean band (distance buckets)' },
        { value: 'conquered_star_radial', label: 'Conquered star radial' },
        { value: 'pre_to_post_frontier', label: 'Pre to post frontier' },
    ];

    const WAVE_SEEDING_OPTIONS = [
        { value: 'winner_natives', label: 'Winner natives (multi-source)' },
        { value: 'conquered_star_center', label: 'Conquered star center' },
        { value: 'winner_nearest_edge', label: 'Winner nearest edge (4-adj)' },
    ];

    const FLIP_TRANSITION_OPTIONS = [
        { value: 'hard', label: 'Hard (instant)' },
        { value: 'lerp_per_cell', label: 'Lerp per cell (local window)' },
        { value: 'dual_pass_blend', label: 'Dual pass blend (always two)' },
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
        return currentRenderMode() === 'metaball_grid_phase_edges';
    }

    function isEmberLatticeMode(): boolean {
        return currentRenderMode() === 'metaball_grid_ember_lattice';
    }

    function isPhaseFieldMode(): boolean {
        return currentRenderMode() === 'metaball_grid_phase_field';
    }

    function isEdgeForwardMode(): boolean {
        return isPhaseEdgesMode() || isEmberLatticeMode();
    }

    function visibleModules() {
        return CELL_GRID_MODULES.filter(
            (module) => module.id !== 'frontier' || isEmberLatticeMode(),
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
        return isEmberLatticeMode() && showModule('frontier');
    }

    function setActiveModule(value: CellGridModuleId): void {
        updatePanel(CELL_GRID_MODULE_PANEL_KEY, value);
    }

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
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

    function spacingToDensityCellsPerMpx(spacingPx: number): number {
        if (!Number.isFinite(spacingPx) || spacingPx <= 0) return 0;
        return 1_000_000 / (spacingPx * spacingPx);
    }

    function spacingToDensityMultiplier(spacingPx: number): number {
        if (!Number.isFinite(spacingPx) || spacingPx <= 0) return 0;
        return (
            (CELL_GRID_BASELINE_SPACING_PX * CELL_GRID_BASELINE_SPACING_PX) /
            (spacingPx * spacingPx)
        );
    }

    function densityMultiplierToSpacing(multiplier: number): number {
        const safe = Math.max(0.05, multiplier);
        return CELL_GRID_BASELINE_SPACING_PX / Math.sqrt(safe);
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
        return isEmberLatticeMode() && currentDistribution() === 'square';
    }

    function isControlFrontierTechnique(): boolean {
        return currentFrontierTechnique() === 'control';
    }

    function canUseControlFrontierBorderGeometry(): boolean {
        return (
            isEmberLatticeMode() &&
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

    function applyFrontierPreset(preset: TerritoryFrontierBenchmarkPreset): void {
        for (const [configKey, value] of Object.entries(preset.values)) {
            writeConfig(configKey, panelKeyFromConfig(configKey), value);
        }
    }

    function isFrontierPresetSelected(preset: TerritoryFrontierBenchmarkPreset): boolean {
        return Object.entries(preset.values).every(([configKey, value]) => {
            const panelValue = panel[panelKeyFromConfig(configKey)];
            const configValue =
                (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
            return (panelValue ?? configValue) === value;
        });
    }
</script>

<div class="module-head">
    <PaxHudSegmentedControl
        class="module-scope-toggle"
        value={activeModule}
        options={moduleVisibilityOptions}
        density="compact"
        ariaLabel="Metaball grid subsection visibility"
        onValueChange={(value) => setActiveModule(value as CellGridModuleId)}
    />
</div>

{#if currentModeLockNote()}
    <div class="mode-lock-note">
        {currentModeLockNote()}
    </div>
{/if}

<div class="var-desc module-nav-note">
    <strong>Panel Sections:</strong> Grid, Frontier, Wave, Flip, and Perf only change which controls are shown in this settings panel. They do not switch the renderer or apply a visual effect by themselves.
</div>

{#if isEmberLatticeMode() && !showModule('frontier')}
<div class="mode-lock-note">
    Frontier remains a module label in this panel, but the Ember Lattice comparison controls are kept visible below even if that chip is not selected.
</div>
{/if}

{#if showModule('grid')}
<div class="module-block">
<PaxSettingsToggleRow
    label="Metaball Grid Enabled"
    checked={panel.cellGridEnabled ?? GAME_CONFIG.CELL_GRID_ENABLED ?? false}
    description="Master enable flag for the metaball-grid mode."
    meta={(panel.cellGridEnabled ?? GAME_CONFIG.CELL_GRID_ENABLED ?? false) ? 'On' : 'Off'}
    settingConfigKey="CELL_GRID_ENABLED"
    onChange={(value) => {
        writeConfig('CELL_GRID_ENABLED', 'cellGridEnabled', value);
    }}
/>
<div class="var-desc">
    Master switch for the metaball-grid conquest family. Leave on to preview; the render mode selector in "Mode" must also be set to "Metaball grid".
</div>

<PaxSettingsRangeRow
    label={currentPlannerSpacingLabel()}
    note={currentPlannerSpacingDescription()}
    value={currentSpacingPx()}
    min={4}
    max={200}
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

<PaxSettingsRangeRow
    label="Grid Density"
    note={`Direct density alias for Cell Spacing. About ${Math.round(spacingToDensityCellsPerMpx(currentSpacingPx()))} cells/Mpx.`}
    value={spacingToDensityMultiplier(currentSpacingPx())}
    min={0.1}
    max={8}
    step={0.05}
    output={`${spacingToDensityMultiplier(currentSpacingPx()).toFixed(2)}x`}
    settingConfigKey="CELL_GRID_SPACING_PX"
    onInput={(value) => {
        writeConfig(
            'CELL_GRID_SPACING_PX',
            'cellGridSpacingPx',
            densityMultiplierToSpacing(value),
        );
    }}
/>

<PaxHudSelect
    label="Origin Mode"
    value={currentOriginMode()}
    options={ORIGIN_MODE_OPTIONS}
    onValueChange={(value) => {
        writeConfig('CELL_GRID_ORIGIN_MODE', 'cellGridOriginMode', value);
    }}
/>

<PaxHudSelect
    label="Distribution"
    value={currentDistribution()}
    options={DISTRIBUTION_OPTIONS}
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
<div class="var-desc">
    Phase Field keeps its cell-primitive, fill-boundary, and border-path controls local to the mode so fill-first tuning stays in one place.
</div>
<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Per-cell primitive. Square tiles the grid cleanly; circle and diamond create visible inter-cell gaps naturally.">
            Cell Shape
        </span>
        <span class="val">
            {#if currentCellShape() === 'square'}Square
            {:else if currentCellShape() === 'circle'}Circle
            {:else if currentCellShape() === 'diamond'}Diamond
            {:else}Hex{/if}
        </span>
    </div>
    <div class="var-desc">
        Visual primitive drawn per cell. Square packs tightly; circle and diamond leave corner gaps for a stippled look; hex draws pointy-top hexagons with honeycomb row-offset tessellation (≈13% vertical gap reads as fine grid lines — pure pointy-top can't perfectly tile a square grid).
    </div>
    <PaxHudSelect
        label="Cell Shape"
        value={currentCellShape()}
        options={CELL_SHAPE_OPTIONS}
        onValueChange={(value) => {
            writeConfig('CELL_GRID_CELL_SHAPE', 'cellGridCellShape', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Shrink each cell by this many pixels on every side. Creates gridline gaps between cells. Capped to 45% of spacing so cells never collapse.">
            Cell Inset (px)
        </span>
        <span class="val">{panel.cellGridCellInsetPx ?? GAME_CONFIG.CELL_GRID_CELL_INSET_PX ?? 0}px</span>
    </div>
    <div class="var-desc">
        Per-cell inward shrink on every side. 0 = fully tiled; small values draw visible grid lines; large values isolate each cell as a small shape.
    </div>
    <PaxSettingsRangeRow
        label="Cell Inset"
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
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Contracts the resolved fill surface inward after MSR/CX/DX/LP shaping. The cell pattern is drawn inside that inset surface.">
            Inward Offset
        </span>
        <span class="val">{(panel.cellGridInwardOffsetPx ?? GAME_CONFIG.CELL_GRID_INWARD_OFFSET_PX ?? 0).toFixed(0)}px</span>
    </div>
    <div class="var-desc">
        Contracts the resolved fill surface inward after MSR/CX/DX/LP shaping. The cell pattern is drawn inside that inset surface.
    </div>
    <PaxSettingsRangeRow
        label="Inward Offset"
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
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Rounded-corner radius for square cells only. Circle/diamond ignore this knob.">
            Square Corner (px)
        </span>
        <span class="val">{panel.cellGridCellCornerPx ?? GAME_CONFIG.CELL_GRID_CELL_CORNER_PX ?? 0}px</span>
    </div>
    <div class="var-desc">
        Rounded-corner radius for square cells. Ignored for circle and diamond primitives. Clamped to half the cell size.
    </div>
    <PaxSettingsRangeRow
        label="Square Corner"
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
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Where to draw the Territory border stroke. Off = no borders. Per cell = stroke every visible cell. Territory edge = stroke only cells on the boundary between owners (or the world edge).">
            Border Mode
        </span>
        <span class="val">
            {#if currentBorderMode() === 'off'}Off
            {:else if currentBorderMode() === 'per_cell'}Per cell
            {:else}Territory edge{/if}
        </span>
    </div>
    <div class="var-desc">
        Border stroke target. Per-cell draws a full grid outline; Territory-edge only outlines ownership boundaries — cheap and distinctive. Width/alpha/HSL come from the Territory border SLA widget below.
    </div>
    <PaxHudSelect
        label="Border Mode"
        value={currentBorderMode()}
        options={BORDER_MODE_OPTIONS}
        disabled={isEmberLatticeMode() && currentFrontierTechnique() !== 'control'}
        onValueChange={(value) => {
            writeConfig('CELL_GRID_BORDER_MODE', 'cellGridBorderMode', value);
        }}
    />
</div>

<PaxSettingsToggleRow
    label={currentBorderBlendLabel()}
    checked={currentBorderBlend()}
    disabled={(isEmberLatticeMode() && currentFrontierTechnique() !== 'control') || currentBorderMode() !== 'territory_edge'}
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
<div class="var-desc">
    Phase Field only. Adds a conquest-local winner-side rim at the active front. The Frontier Fade controls in Flip govern how this accent disappears near completion.
</div>
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
{:else if currentBorderMode() === 'territory_edge' && usesSingularCenterlineTerritoryBorders()}
    <div class="var-desc">
        Singular blended territory borders ignore grid-edge shaping. Turn this off to tune the grid-edge fallback path.
    </div>
{/if}
</div>
{/if}

{#if showFrontierControls()}
<div class="module-block">
<div class="var-desc">
    Ember Lattice compares the control path against shader-band and contour-extraction variants without changing the underlying ownership truth. These options only apply cleanly on the square lattice. Surface styling and border-geometry controls live in Territory Styles.
</div>

<div class="var-row" class:disabled={!isEmberLatticeMode()}>
    <div class="row-top">
        <span class="var-name" title="Benchmark comparison rows matching the frontier technique matrix.">
            Preset Rows
        </span>
        <span class="val">
            {#if !isEmberLatticeMode()}Ember Lattice only
            {:else if !canUseEmberFrontierTechnique()}Square lattice required
            {:else}Tap to apply{/if}
        </span>
    </div>
    <div class="var-desc">
        These presets apply the planned benchmark rows directly so effect and performance can be compared without manually dialing each knob.
    </div>
    <div class="preset-grid">
        {#each TERRITORY_FRONTIER_BENCHMARK_PRESETS as preset}
            <PaxHudButton
                label={preset.label}
                size="sm"
                active={isFrontierPresetSelected(preset)}
                title={preset.description}
                disabled={!isEmberLatticeMode()}
                onclick={() => applyFrontierPreset(preset)}
            />
        {/each}
    </div>
</div>

<PaxHudSelect
    label="Frontier Technique"
    value={currentFrontierTechnique()}
    options={FRONTIER_TECHNIQUE_OPTIONS}
    disabled={!isEmberLatticeMode()}
    onValueChange={(value) => {
        writeConfig('TERRITORY_FRONTIER_TECHNIQUE', 'territoryFrontierTechnique', value);
    }}
/>

<PaxHudSelect
    label="Phase Sampling"
    value={currentFrontierPhaseSampling()}
    options={FRONTIER_PHASE_SAMPLING_OPTIONS}
    disabled={!canUseEmberFrontierTechnique() || !isShaderFrontierTechnique()}
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

<PaxHudSelect
    label="Triangle Diagonal"
    value={currentFrontierTriangleDiagonalPolicy()}
    options={FRONTIER_TRIANGLE_DIAGONAL_OPTIONS}
    disabled={!canUseEmberFrontierTechnique() || !isTriangleFrontierTechnique()}
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
<PaxHudSelect
    label="Adjacency"
    value={currentAdjacency()}
    options={ADJACENCY_OPTIONS}
    onValueChange={(value) => {
        writeConfig('CELL_GRID_ADJACENCY', 'cellGridAdjacency', value);
    }}
/>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="How the wave's rank (ordering) is derived — BFS over grid steps or a Euclidean band around the seed set.">
            Wave Geometry
        </span>
        <span class="val">
            {#if currentWaveGeometry() === 'grid_bfs'}Grid BFS
            {:else if currentWaveGeometry() === 'euclidean_band'}Euclidean band
            {:else if currentWaveGeometry() === 'conquered_star_radial'}Conquered star radial
            {:else}Pre → post frontier{/if}
        </span>
    </div>
    <div class="var-desc">
        Grid BFS follows grid neighbors step-by-step; Euclidean band bins cells by distance to nearest seed; the phase-edge geometries derive flip time directly from conquest-local frontier relationships.
    </div>
    <PaxHudSelect
        label="Wave Geometry"
        value={currentWaveGeometry()}
        options={WAVE_GEOMETRY_OPTIONS}
        onValueChange={(value) => {
            writeConfig('CELL_GRID_WAVE_GEOMETRY', 'cellGridWaveGeometry', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Where the wave starts. Winner natives = all winner-owned cells; conquered star center = a single seed at the conquered star; winner nearest edge = the winner cell(s) closest to the conquered star (forces 4-adjacency).">
            Wave Seeding
        </span>
        <span class="val">
            {#if currentWaveSeeding() === 'winner_natives'}Winner natives
            {:else if currentWaveSeeding() === 'conquered_star_center'}Conquered star
            {:else}Winner nearest edge{/if}
        </span>
    </div>
    <div class="var-desc">
        Winner natives spreads from the entire winner footprint. Conquered star center is a point source. Winner nearest edge picks the winner-owned cell(s) closest to the conquered star.
    </div>
    <PaxHudSelect
        label="Wave Seeding"
        value={currentWaveSeeding()}
        options={WAVE_SEEDING_OPTIONS}
        onValueChange={(value) => {
            writeConfig('CELL_GRID_WAVE_SEEDING', 'cellGridWaveSeeding', value);
        }}
    />
</div>
</div>
{/if}

{#if showModule('flip')}
<div class="module-block">
<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="How each cell visually transitions at its flipTime. Hard = instant flip. Lerp per cell = local crossfade inside a window. Dual pass = always two passes crossfading.">
            Flip Transition
        </span>
        <span class="val">
            {#if currentFlipTransition() === 'hard'}Hard
            {:else if currentFlipTransition() === 'lerp_per_cell'}Lerp per cell
            {:else}Dual pass blend{/if}
        </span>
    </div>
    <div class="var-desc">
        Hard looks like pixel-flip; lerp_per_cell crossfades within ±window; dual_pass_blend always emits both passes with complementary alphas.
    </div>
    <PaxHudSelect
        label="Flip Transition"
        value={currentFlipTransition()}
        options={FLIP_TRANSITION_OPTIONS}
        onValueChange={(value) => {
            writeConfig('CELL_GRID_FLIP_TRANSITION', 'cellGridFlipTransition', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Half-width of the crossfade window around each cell's flipTime (as a fraction of transition progress 0..1).">
            Flip Window
        </span>
        <span class="val">{(panel.cellGridFlipWindow ?? GAME_CONFIG.CELL_GRID_FLIP_WINDOW ?? 0.06).toFixed(3)}</span>
    </div>
    <div class="var-desc">
        Crossfade half-width for lerp_per_cell and dual_pass_blend. Larger values soften flips; 0 collapses to hard behavior.
    </div>
    <PaxSettingsRangeRow
        label="Flip Window"
        note="Crossfade half-width around each cell flip time."
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
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Progress easing curve applied BEFORE the per-cell flip math. Linear leaves transition timing as-is; ease_in/out bias the wave to the start/end; elastic_out/back_out add overshoot flavor.">
            Wave Easing
        </span>
        <span class="val">
            {#if currentWaveEase() === 'linear'}Linear
            {:else if currentWaveEase() === 'ease_in'}Ease in
            {:else if currentWaveEase() === 'ease_out'}Ease out
            {:else if currentWaveEase() === 'ease_in_out'}Ease in-out
            {:else if currentWaveEase() === 'back_out'}Back out
            {:else}Elastic out{/if}
        </span>
    </div>
    <div class="var-desc">
        Remaps transition progress before the flip math runs. Back-out / elastic-out briefly overshoot 1 so the NEXT cells visibly "settle" into place — good with Lerp / Dual-pass flip modes.
    </div>
    <PaxHudSelect
        label="Wave Easing"
        value={currentWaveEase()}
        options={WAVE_EASE_OPTIONS}
        onValueChange={(value) => {
            writeConfig('CELL_GRID_WAVE_EASE', 'cellGridWaveEase', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Per-cell deterministic shift applied to flipTime, in progress units. 0.05 = each cell flips up to ±5 percent earlier/later than the wave rank would dictate. Breaks up rigid fronts for a more organic feel.">
            FlipTime Jitter
        </span>
        <span class="val">{(panel.cellGridFlipWindowJitter ?? GAME_CONFIG.CELL_GRID_FLIP_WINDOW_JITTER ?? 0).toFixed(3)}</span>
    </div>
    <div class="var-desc">
        Deterministic per-cell scatter of flip-time (seeded by cell id, stable across runs). Great for softening straight wave fronts.
    </div>
    <PaxSettingsRangeRow
        label="FlipTime Jitter"
        note="Deterministic per-cell scatter of flip time."
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
</div>
{/if}

{#if showModule('perf')}
<div class="module-block">
<div class="var-desc perf-intro">
    Live planner/readout surface for metaball-grid. Requested spacing is the knob value; effective spacing is what the planner actually used after max-cell coarsening. Painted cells are the cells that survived the current frame’s alpha/scene cull.
</div>

<div class="perf-grid">
    <div class="perf-label">Cells (painted / emittable / total)</div>
    <div class="perf-value">
        {$cellGridStats.paintedCells.toLocaleString()}
        <span class="perf-sub">/ {$cellGridStats.emittableCells.toLocaleString()} / {$cellGridStats.totalCells.toLocaleString()}</span>
    </div>

    <div class="perf-label">Spacing (requested / effective)</div>
    <div class="perf-value">
        {$cellGridStats.requestedSpacingPx.toFixed(1)} px
        <span class="perf-sub">
            / {$cellGridStats.effectiveSpacingPx.toFixed(1)} px
            {#if $cellGridStats.effectiveSpacingPx > $cellGridStats.requestedSpacingPx + 0.01}
                <span class="perf-coarsen">(coarsened)</span>
            {/if}
        </span>
    </div>

    <div class="perf-label">Density (requested / effective)</div>
    <div class="perf-value">
        {$cellGridStats.requestedDensityCellsPerMpx.toFixed(0)} cells/Mpx
        <span class="perf-sub">
            / {$cellGridStats.effectiveDensityCellsPerMpx.toFixed(0)} cells/Mpx
            {#if $cellGridStats.effectiveDensityCellsPerMpx + 0.5 < $cellGridStats.requestedDensityCellsPerMpx}
                <span class="perf-coarsen">(reduced)</span>
            {/if}
        </span>
    </div>

    <div class="perf-label">Frame time (last / EMA)</div>
    <div class="perf-value">
        {$cellGridStats.lastUpdateMs.toFixed(2)} ms
        <span class="perf-sub">/ {$cellGridStats.emaUpdateMs.toFixed(2)} ms</span>
    </div>

    <div class="perf-label">Frontier technique</div>
    <div class="perf-value">
        {$cellGridStats.frontierTechnique}
        {#if $cellGridStats.frontierTechnique !== $cellGridStats.frontierRequestedTechnique}
            <span class="perf-sub">
                requested {$cellGridStats.frontierRequestedTechnique}
                {#if $cellGridStats.frontierFallbackReason}
                    ({$cellGridStats.frontierFallbackReason})
                {/if}
            </span>
        {/if}
    </div>

    <div class="perf-label">Border geometry</div>
    <div class="perf-value">
        {$cellGridStats.frontierBorderGeometryMode}
        {#if $cellGridStats.frontierBorderGeometryMode !== $cellGridStats.frontierRequestedBorderGeometryMode}
            <span class="perf-sub">
                requested {$cellGridStats.frontierRequestedBorderGeometryMode}
                {#if $cellGridStats.frontierBorderGeometryFallbackReason}
                    ({$cellGridStats.frontierBorderGeometryFallbackReason})
                {/if}
            </span>
        {:else if $cellGridStats.frontierBorderGeometryFallbackReason}
            <span class="perf-sub">
                ({$cellGridStats.frontierBorderGeometryFallbackReason})
            </span>
        {/if}
    </div>

    <div class="perf-label">Surface family</div>
    <div class="perf-value">
        {$cellGridStats.frontierSurfaceGeometryFamily}
        <span class="perf-sub">
            steady {$cellGridStats.frontierStableGeometryFamily}
            / transition {$cellGridStats.frontierTransitionGeometryFamily}
            {#if $cellGridStats.frontierSurfaceInvariantViolation}
                ({$cellGridStats.frontierSurfaceInvariantViolation})
            {/if}
        </span>
    </div>

    <div class="perf-label">Phase grid (layers / max dims)</div>
    <div class="perf-value">
        {$cellGridStats.frontierPhaseLayerCount}
        <span class="perf-sub">
            / {$cellGridStats.frontierPhaseGridCols} × {$cellGridStats.frontierPhaseGridRows}
        </span>
    </div>

    <div class="perf-label">Frontier timings</div>
    <div class="perf-value">
        blur {$cellGridStats.frontierBlurMs.toFixed(2)} ms
        <span class="perf-sub">
            contour {$cellGridStats.frontierContourExtractionMs.toFixed(2)} ms
            / smooth {$cellGridStats.frontierSmoothingMs.toFixed(2)} ms
        </span>
    </div>

    <div class="perf-label">Frontier geometry</div>
    <div class="perf-value">
        {$cellGridStats.frontierPolylineCount.toLocaleString()} polylines
        <span class="perf-sub">
            / {$cellGridStats.frontierEmittedVertexCount.toLocaleString()} vertices
        </span>
    </div>

    <div class="perf-label">Plan build (classify / wave / total)</div>
    <div class="perf-value">
        {$cellGridStats.lastClassificationBuildMs.toFixed(2)} ms
        <span class="perf-sub">
            / {$cellGridStats.lastWavePlanBuildMs.toFixed(2)} ms
            / {$cellGridStats.lastPlanBuildMs.toFixed(2)} ms
        </span>
    </div>

    <div class="perf-label">Frames</div>
    <div class="perf-value">
        {$cellGridStats.frameCount.toLocaleString()}
        <span class="perf-sub">skipped {$cellGridStats.skippedFrameCount.toLocaleString()}</span>
    </div>

    <div class="perf-label">Render cache</div>
    <div class="perf-value">
        {$cellGridStats.renderCacheMode === 'steady_texture'
            ? 'steady texture'
            : 'live vectors'}
    </div>

    <div class="perf-label">Requested plan</div>
    <div class="perf-value">
        {$cellGridStats.planWorkerPending ? 'worker build pending' : 'worker ready'}
    </div>

    <div class="perf-label">Visible frame</div>
    <div class="perf-value">
        {#if $cellGridStats.visibleFrameState === 'holding_pre'}
            holding PRE
        {:else if $cellGridStats.visibleFrameState === 'requested_plan'}
            requested transition plan
        {:else if $cellGridStats.visibleFrameState === 'fallback_plan'}
            fallback plan
        {:else}
            steady-state plan
        {/if}
    </div>

    <div class="perf-label">Transition clock</div>
    <div class="perf-value">
        {#if $cellGridStats.clockSource === 'local'}
            local visual clock
        {:else if $cellGridStats.clockSource === 'scheduler'}
            scheduler clock
        {:else}
            none
        {/if}
    </div>
</div>
{#if isPhaseFieldMode()}
<div class="var-desc finish-tail-intro">
    Phase Field finish tail. These controls only affect how the PRE cell mask resolves into the smooth POST territory at the end of conquest.
</div>

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

    .preset-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--pax-space-2);
        margin: var(--pax-space-1) 0 2px;
    }

    .var-desc {
        margin: var(--pax-space-1) 0 var(--pax-gap-sm);
        color: color-mix(in srgb, var(--pax-ui-text-soft) 72%, transparent);
        font-size: var(--pax-type-3xs);
        line-height: 1.35;
    }

    .perf-intro {
        margin-bottom: var(--pax-space-2);
        opacity: 0.9;
    }

    .finish-tail-intro {
        margin: var(--pax-gap-md) 0 var(--pax-space-2);
        opacity: 0.92;
    }

    .var-row.disabled {
        opacity: 0.55;
    }

    .perf-grid {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: var(--pax-gap-xs) var(--pax-gap-md);
        align-items: baseline;
        padding: var(--pax-gap-sm) var(--pax-space-3);
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, var(--pax-ui-text-strong) 8%, transparent);
        background: color-mix(in srgb, var(--pax-color-void) 40%, transparent);
        font-size: var(--pax-type-2xs);
    }

    .perf-label {
        color: color-mix(in srgb, var(--pax-ui-text-soft) 70%, transparent);
        letter-spacing: 0.04em;
    }

    .perf-value {
        color: color-mix(in srgb, var(--pax-ui-text-strong) 95%, transparent);
        font-variant-numeric: tabular-nums;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .perf-sub {
        color: color-mix(in srgb, var(--pax-ui-text-soft) 55%, transparent);
        margin-left: var(--pax-gap-xs);
    }

    .perf-coarsen {
        color: color-mix(in srgb, var(--pax-ui-accent-warm) 90%, transparent);
        margin-left: var(--pax-space-1);
        font-size: var(--pax-type-3xs);
    }
</style>
