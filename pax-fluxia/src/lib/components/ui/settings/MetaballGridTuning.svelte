<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import {
        TERRITORY_FRONTIER_BENCHMARK_PRESETS,
        type TerritoryFrontierBenchmarkPreset,
    } from '$lib/territory/frontier';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import {
        metaballGridPhaseEdgesModeDefaults,
        metaballGridPhaseFieldModeDefaults,
    } from '$lib/territory/families/metaballGrid/config';
    import { metaballGridStats } from '$lib/territory/families/metaballGrid/metaballGridStats';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    type MetaballGridModuleId =
        | 'all'
        | 'none'
        | 'grid'
        | 'frontier'
        | 'wave'
        | 'flip'
        | 'perf';

    const METABALL_GRID_MODULES = [
        { id: 'grid', label: 'Grid' },
        { id: 'frontier', label: 'Frontier' },
        { id: 'wave', label: 'Wave' },
        { id: 'flip', label: 'Flip' },
        { id: 'perf', label: 'Perf' },
    ] as const;

    const METABALL_GRID_MODULE_PANEL_KEY = 'metaballGridModuleVisibility';

    let activeModule = $derived(
        (panel[METABALL_GRID_MODULE_PANEL_KEY] ?? 'all') as MetaballGridModuleId,
    );

    $effect(() => {
        if (activeModule === 'all' || activeModule === 'none') return;
        if (!METABALL_GRID_MODULES.some((module) => module.id === activeModule)) {
            updatePanel(METABALL_GRID_MODULE_PANEL_KEY, 'all');
        }
    });

    function showModule(id: Exclude<MetaballGridModuleId, 'all' | 'none'>): boolean {
        return activeModule === 'all' || activeModule === id;
    }

    function showFrontierControls(): boolean {
        return isPhaseEdgesMode() || showModule('frontier');
    }

    function setActiveModule(value: MetaballGridModuleId): void {
        updatePanel(METABALL_GRID_MODULE_PANEL_KEY, value);
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

    function isPhaseEdgesMode(): boolean {
        return (
            (panel.territoryRenderMode ?? GAME_CONFIG.TERRITORY_RENDER_MODE ?? null) ===
            'metaball_grid_phase_edges'
        );
    }

    function isPhaseFieldMode(): boolean {
        return (
            (panel.territoryRenderMode ?? GAME_CONFIG.TERRITORY_RENDER_MODE ?? null) ===
            'metaball_grid_phase_field'
        );
    }

    function currentModeLockNote(): string | null {
        if (isPhaseEdgesMode()) {
            return 'Phase Edges is built for edge-forward conquest. Choose how the takeover spreads, then tune the border character.';
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
            panel.metaballGridPatternSpacingPx ??
            (GAME_CONFIG as unknown as Record<string, unknown>).METABALL_GRID_PATTERN_SPACING_PX ??
            metaballGridPhaseFieldModeDefaults.METABALL_GRID_PATTERN_SPACING_PX ??
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
        return !isPhaseEdgesMode() && usesGridEdgeShapingControls();
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
            panel.metaballGridDistribution ??
            GAME_CONFIG.METABALL_GRID_DISTRIBUTION ??
            'square';
        if (raw === 'hex_offset') return 'hex_offset';
        if (raw === 'jittered') return 'jittered';
        return 'square';
    }

    function currentOriginMode(): 'centered' | 'corner' {
        const raw =
            panel.metaballGridOriginMode ??
            GAME_CONFIG.METABALL_GRID_ORIGIN_MODE ??
            'centered';
        return raw === 'corner' ? 'corner' : 'centered';
    }

    function currentAdjacency(): '4' | '8' {
        const raw =
            panel.metaballGridAdjacency ?? GAME_CONFIG.METABALL_GRID_ADJACENCY ?? '8';
        return raw === '4' ? '4' : '8';
    }

    function currentWaveGeometry():
        | 'grid_bfs'
        | 'euclidean_band'
        | 'conquered_star_radial'
        | 'pre_to_post_frontier' {
        const raw =
            panel.metaballGridWaveGeometry ??
            GAME_CONFIG.METABALL_GRID_WAVE_GEOMETRY ??
            (isPhaseEdgesMode()
                ? metaballGridPhaseEdgesModeDefaults.METABALL_GRID_WAVE_GEOMETRY
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
            panel.metaballGridWaveSeeding ??
            GAME_CONFIG.METABALL_GRID_WAVE_SEEDING ??
            'winner_natives';
        if (raw === 'conquered_star_center') return 'conquered_star_center';
        if (raw === 'winner_nearest_edge') return 'winner_nearest_edge';
        return 'winner_natives';
    }

    function currentFlipTransition(): 'hard' | 'lerp_per_cell' | 'dual_pass_blend' {
        const raw =
            panel.metaballGridFlipTransition ??
            GAME_CONFIG.METABALL_GRID_FLIP_TRANSITION ??
            'hard';
        if (raw === 'lerp_per_cell') return 'lerp_per_cell';
        if (raw === 'dual_pass_blend') return 'dual_pass_blend';
        return 'hard';
    }

    function currentCellShape(): 'square' | 'circle' | 'diamond' | 'hex' {
        const raw =
            panel.metaballGridCellShape ??
            GAME_CONFIG.METABALL_GRID_CELL_SHAPE ??
            'square';
        if (raw === 'circle') return 'circle';
        if (raw === 'diamond') return 'diamond';
        if (raw === 'hex') return 'hex';
        return 'square';
    }

    function currentBorderMode(): 'off' | 'per_cell' | 'territory_edge' {
        const modeDefault = isPhaseEdgesMode()
            ? metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_MODE
            : isPhaseFieldMode()
              ? metaballGridPhaseFieldModeDefaults.METABALL_GRID_BORDER_MODE
              : 'off';
        const raw =
            panel.metaballGridBorderMode ??
            GAME_CONFIG.METABALL_GRID_BORDER_MODE ??
            modeDefault;
        if (raw === 'per_cell') return 'per_cell';
        if (raw === 'territory_edge') return 'territory_edge';
        return 'off';
    }

    function currentBorderBlend(): boolean {
        const modeDefault = isPhaseEdgesMode()
            ? metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_BLEND
            : isPhaseFieldMode()
              ? metaballGridPhaseFieldModeDefaults.METABALL_GRID_BORDER_BLEND
              : true;
        return panel.metaballGridBorderBlend ?? GAME_CONFIG.METABALL_GRID_BORDER_BLEND ?? modeDefault;
    }

    function currentBorderChaikinPasses(): number {
        const modeDefault = isPhaseEdgesMode()
            ? metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES
            : isPhaseFieldMode()
              ? metaballGridPhaseFieldModeDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES
              : 0;
        return (
            panel.metaballGridBorderChaikinPasses ??
            GAME_CONFIG.METABALL_GRID_BORDER_CHAIKIN_PASSES ??
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
            panel.metaballGridWaveEase ??
            GAME_CONFIG.METABALL_GRID_WAVE_EASE ??
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
            panel.metaballGridPhaseFieldFinishFadeStart ??
            GAME_CONFIG.METABALL_GRID_PHASE_FIELD_FINISH_FADE_START ??
            0.82
        );
    }

    function currentPhaseFieldFinishFadeEnd(): number {
        return (
            panel.metaballGridPhaseFieldFinishFadeEnd ??
            GAME_CONFIG.METABALL_GRID_PHASE_FIELD_FINISH_FADE_END ??
            1
        );
    }

    function currentPhaseFieldSizeCollapseStart(): number {
        return (
            panel.metaballGridPhaseFieldSizeCollapseStart ??
            GAME_CONFIG.METABALL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START ??
            0.72
        );
    }

    function currentPhaseFieldSizeCollapseEnd(): number {
        return (
            panel.metaballGridPhaseFieldSizeCollapseEnd ??
            GAME_CONFIG.METABALL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END ??
            1
        );
    }

    function currentPhaseFieldFinalCellSizePx(): number {
        return (
            panel.metaballGridPhaseFieldFinalCellSizePx ??
            GAME_CONFIG.METABALL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX ??
            1
        );
    }

    function currentPhaseFieldFrontierHighlight(): boolean {
        return (
            panel.metaballGridPhaseFieldFrontierHighlight ??
            GAME_CONFIG.METABALL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT ??
            true
        );
    }

    function currentPhaseFieldFrontierFadeStart(): number {
        return (
            panel.metaballGridPhaseFieldFrontierFadeStart ??
            GAME_CONFIG.METABALL_GRID_PHASE_FIELD_FRONTIER_FADE_START ??
            0.8
        );
    }

    function currentPhaseFieldFrontierFadeEnd(): number {
        return (
            panel.metaballGridPhaseFieldFrontierFadeEnd ??
            GAME_CONFIG.METABALL_GRID_PHASE_FIELD_FRONTIER_FADE_END ??
            0.96
        );
    }

    const METABALL_GRID_BASELINE_SPACING_PX = 48;

    function currentSpacingPx(): number {
        return panel.metaballGridSpacingPx ?? GAME_CONFIG.METABALL_GRID_SPACING_PX ?? METABALL_GRID_BASELINE_SPACING_PX;
    }

    function spacingToDensityCellsPerMpx(spacingPx: number): number {
        if (!Number.isFinite(spacingPx) || spacingPx <= 0) return 0;
        return 1_000_000 / (spacingPx * spacingPx);
    }

    function spacingToDensityMultiplier(spacingPx: number): number {
        if (!Number.isFinite(spacingPx) || spacingPx <= 0) return 0;
        return (
            (METABALL_GRID_BASELINE_SPACING_PX * METABALL_GRID_BASELINE_SPACING_PX) /
            (spacingPx * spacingPx)
        );
    }

    function densityMultiplierToSpacing(multiplier: number): number {
        const safe = Math.max(0.05, multiplier);
        return METABALL_GRID_BASELINE_SPACING_PX / Math.sqrt(safe);
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
            (isPhaseEdgesMode()
                ? metaballGridPhaseEdgesModeDefaults.TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE
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

    function canUsePhaseFieldFrontierTechnique(): boolean {
        return isPhaseEdgesMode() && currentDistribution() === 'square';
    }

    function isControlFrontierTechnique(): boolean {
        return currentFrontierTechnique() === 'control';
    }

    function canUseControlFrontierBorderGeometry(): boolean {
        return (
            isPhaseEdgesMode() &&
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
    <div class="module-scope-toggle" role="group" aria-label="Metaball grid subsection visibility">
        <button
            type="button"
            class="module-all-toggle"
            class:active={activeModule === 'all'}
            onclick={() => setActiveModule('all')}>All</button>
        <button
            type="button"
            class="module-all-toggle"
            class:active={activeModule === 'none'}
            onclick={() => setActiveModule('none')}>None</button>
    </div>
</div>

{#if currentModeLockNote()}
    <div class="mode-lock-note">
        {currentModeLockNote()}
    </div>
{/if}

<div class="module-nav">
    {#each METABALL_GRID_MODULES as module}
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

<div class="var-desc module-nav-note">
    <strong>Panel Sections:</strong> Grid, Frontier, Wave, Flip, and Perf only change which controls are shown in this settings panel. They do not switch the renderer or apply a visual effect by themselves.
</div>

{#if isPhaseEdgesMode() && !showModule('frontier')}
<div class="mode-lock-note">
    Frontier remains a module label in this panel, but the actual Phase Edges comparison controls are rendered below even if that chip is not selected.
</div>
{/if}

{#if showModule('grid')}
<div class="module-block">
<label class="toggle-row">
    <input
        type="checkbox"
        checked={panel.metaballGridEnabled ?? GAME_CONFIG.METABALL_GRID_ENABLED ?? false}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('METABALL_GRID_ENABLED', 'metaballGridEnabled', value);
        }}
    />
    <span class="var-name" title="Master enable flag for the metaball-grid mode. When off, the family short-circuits to no cells.">
        Metaball Grid Enabled
    </span>
    <span class="val">
        {(panel.metaballGridEnabled ?? GAME_CONFIG.METABALL_GRID_ENABLED ?? false) ? 'On' : 'Off'}
    </span>
</label>
<div class="var-desc">
    Master switch for the metaball-grid conquest family. Leave on to preview; the render mode selector in "Mode" must also be set to "Metaball grid".
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="World-space spacing between grid cell centers in pixels. Smaller = denser grid, heavier CPU.">
            {currentPlannerSpacingLabel()}
        </span>
        <span class="val">{currentSpacingPx()}px</span>
    </div>
    <div class="var-desc">
        {currentPlannerSpacingDescription()}
    </div>
    <input
        type="range"
        min="4"
        max="200"
        step="1"
        value={currentSpacingPx()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_SPACING_PX', 'metaballGridSpacingPx', value);
        }}
    />
</div>

{#if isPhaseFieldMode()}
<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Visible fill-pattern lattice spacing in pixels. Larger = chunkier interior pattern. Smaller = denser interior pattern and more fill-render work.">
            Pattern Spacing
        </span>
        <span class="val">{currentPatternSpacingPx()}px</span>
    </div>
    <div class="var-desc">
        Visible interior fill-pattern spacing for the PRE/NEXT ownership fills. This affects steady-state fill density and the masked transition fills. It does not change conquest timing density or the active frontier cell size.
    </div>
    <input
        type="range"
        min="1"
        max="64"
        step="1"
        value={currentPatternSpacingPx()}
        oninput={(event) => {
            const raw = parseFloat((event.target as HTMLInputElement).value);
            const value = snapPatternSpacingPx(raw);
            writeConfig('METABALL_GRID_PATTERN_SPACING_PX', 'metaballGridPatternSpacingPx', value);
        }}
    />
</div>
{/if}

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Alias control for Cell Spacing. There is no separate density scalar in metaball-grid; denser output means smaller spacing. 1.0x equals 48 px spacing.">
            Grid Density
        </span>
        <span class="val">
            {spacingToDensityMultiplier(currentSpacingPx()).toFixed(2)}x
            <span class="perf-sub">~{Math.round(spacingToDensityCellsPerMpx(currentSpacingPx()))} cells/Mpx</span>
        </span>
    </div>
    <div class="var-desc">
        Direct density alias for Cell Spacing. Higher density means more grid cells and sharper ownership edges, but heavier CPU. Effective density can still be reduced by Max Cells.
    </div>
    <input
        type="range"
        min="0.10"
        max="8.00"
        step="0.05"
        value={spacingToDensityMultiplier(currentSpacingPx())}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig(
                'METABALL_GRID_SPACING_PX',
                'metaballGridSpacingPx',
                densityMultiplierToSpacing(value),
            );
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Where the grid is anchored in world space. 'Centered' offsets by half-spacing so cells center within the world bounds; 'Corner / origin' starts cells at (0,0).">
            Origin Mode
        </span>
        <span class="val">{currentOriginMode() === 'centered' ? 'Centered' : 'Corner'}</span>
    </div>
    <div class="var-desc">
        Anchor mode for grid sample positions. Centered places the first cell at (spacing/2, spacing/2); Corner / origin places it at (0, 0).
    </div>
    <select
        class="mode-select"
        value={currentOriginMode()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('METABALL_GRID_ORIGIN_MODE', 'metaballGridOriginMode', value);
        }}
    >
        <option value="centered">Centered (half-spacing offset)</option>
        <option value="corner">Corner / origin (0,0 anchor)</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Placement pattern for the grid sample points before ownership resolution. Square = classical lattice. Hex offset = odd rows shifted by half-spacing. Jittered = deterministic scatter from the square lattice.">
            Distribution
        </span>
        <span class="val">
            {#if currentDistribution() === 'square'}Square
            {:else if currentDistribution() === 'hex_offset'}Hex offset
            {:else}Jittered{/if}
        </span>
    </div>
    <div class="var-desc">
        Controls the planner lattice itself, not just how cells are painted. Hex offset changes cell-center placement to honeycomb packing. Jittered keeps the same ownership logic but scatters sample centers deterministically.
    </div>
    <select
        class="mode-select"
        value={currentDistribution()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('METABALL_GRID_DISTRIBUTION', 'metaballGridDistribution', value);
        }}
    >
        <option value="square">Square</option>
        <option value="hex_offset">Hex offset</option>
        <option value="jittered">Jittered</option>
    </select>
</div>

<div class="var-row" class:disabled={currentDistribution() !== 'jittered'}>
    <div class="row-top">
        <span class="var-name" title="Deterministic per-cell scatter as a fraction of spacing. Only active when Distribution = Jittered.">
            Position Jitter
        </span>
        <span class="val">{(panel.metaballGridPositionJitter ?? GAME_CONFIG.METABALL_GRID_POSITION_JITTER ?? 0).toFixed(3)}</span>
    </div>
    <div class="var-desc">
        Fraction of spacing used to scatter each cell center. 0 = none. 0.5 is the practical upper limit before neighbouring cells swap order.
    </div>
    <input
        type="range"
        min="0"
        max="0.5"
        step="0.005"
        disabled={currentDistribution() !== 'jittered'}
        value={panel.metaballGridPositionJitter ?? GAME_CONFIG.METABALL_GRID_POSITION_JITTER ?? 0}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_POSITION_JITTER', 'metaballGridPositionJitter', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Hard cap on total cells. If the requested spacing would exceed this count, the planner coarsens spacing upward to stay under the cap.">
            Max Cells
        </span>
        <span class="val">{Math.round(panel.metaballGridMaxCells ?? GAME_CONFIG.METABALL_GRID_MAX_CELLS ?? 0)}</span>
    </div>
    <div class="var-desc">
        Planner safety cap. Use the Perf tab to compare requested spacing against effective spacing when this cap is active. Set to 0 to remove the cap.
    </div>
    <input
        type="range"
        min="0"
        max="200000"
        step="1000"
        value={panel.metaballGridMaxCells ?? GAME_CONFIG.METABALL_GRID_MAX_CELLS ?? 0}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_MAX_CELLS', 'metaballGridMaxCells', value);
        }}
    />
</div>

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
    <select
        class="mode-select"
        value={currentCellShape()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('METABALL_GRID_CELL_SHAPE', 'metaballGridCellShape', value);
        }}
    >
        <option value="square">Square</option>
        <option value="circle">Circle</option>
        <option value="diamond">Diamond</option>
        <option value="hex">Hex (pointy-top honeycomb)</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Shrink each cell by this many pixels on every side. Creates gridline gaps between cells. Capped to 45% of spacing so cells never collapse.">
            Cell Inset (px)
        </span>
        <span class="val">{panel.metaballGridCellInsetPx ?? GAME_CONFIG.METABALL_GRID_CELL_INSET_PX ?? 0}px</span>
    </div>
    <div class="var-desc">
        Per-cell inward shrink on every side. 0 = fully tiled; small values draw visible grid lines; large values isolate each cell as a small shape.
    </div>
    <input
        type="range"
        min="0"
        max="48"
        step="0.5"
        value={panel.metaballGridCellInsetPx ?? GAME_CONFIG.METABALL_GRID_CELL_INSET_PX ?? 0}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_CELL_INSET_PX', 'metaballGridCellInsetPx', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Contracts the resolved fill surface inward after MSR/CX/DX/LP shaping. The cell pattern is drawn inside that inset surface.">
            Inward Offset
        </span>
        <span class="val">{(panel.metaballGridInwardOffsetPx ?? GAME_CONFIG.METABALL_GRID_INWARD_OFFSET_PX ?? 0).toFixed(0)}px</span>
    </div>
    <div class="var-desc">
        Contracts the resolved fill surface inward after MSR/CX/DX/LP shaping. The cell pattern is drawn inside that inset surface.
    </div>
    <input
        type="range"
        min="0"
        max="24"
        step="1"
        value={panel.metaballGridInwardOffsetPx ?? GAME_CONFIG.METABALL_GRID_INWARD_OFFSET_PX ?? 0}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_INWARD_OFFSET_PX', 'metaballGridInwardOffsetPx', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Rounded-corner radius for square cells only. Circle/diamond ignore this knob.">
            Square Corner (px)
        </span>
        <span class="val">{panel.metaballGridCellCornerPx ?? GAME_CONFIG.METABALL_GRID_CELL_CORNER_PX ?? 0}px</span>
    </div>
    <div class="var-desc">
        Rounded-corner radius for square cells. Ignored for circle and diamond primitives. Clamped to half the cell size.
    </div>
    <input
        type="range"
        min="0"
        max="48"
        step="0.5"
        value={panel.metaballGridCellCornerPx ?? GAME_CONFIG.METABALL_GRID_CELL_CORNER_PX ?? 0}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_CELL_CORNER_PX', 'metaballGridCellCornerPx', value);
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
    <select
        class="mode-select"
        value={currentBorderMode()}
        disabled={isPhaseEdgesMode() && currentFrontierTechnique() !== 'control'}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('METABALL_GRID_BORDER_MODE', 'metaballGridBorderMode', value);
        }}
    >
        <option value="off">Off (no borders)</option>
        <option value="territory_edge">Territory edge (owner boundaries only)</option>
        <option value="per_cell">Per cell (full grid outline)</option>
    </select>
</div>

<label
    class="toggle-row"
    class:disabled={(isPhaseEdgesMode() && currentFrontierTechnique() !== 'control') || currentBorderMode() !== 'territory_edge'}
>
    <input
        type="checkbox"
        disabled={(isPhaseEdgesMode() && currentFrontierTechnique() !== 'control') || currentBorderMode() !== 'territory_edge'}
        checked={currentBorderBlend()}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('METABALL_GRID_BORDER_BLEND', 'metaballGridBorderBlend', value);
        }}
    />
    <span class="var-name" title={currentBorderBlendTitle()}>
        {currentBorderBlendLabel()}
    </span>
    <span class="val">
        {currentBorderBlend() ? 'On' : 'Off'}
    </span>
</label>
<div class="var-desc">
    {currentBorderBlendDescription()}
</div>

{#if isPhaseFieldMode()}
<label class="toggle-row">
    <input
        type="checkbox"
        checked={currentPhaseFieldFrontierHighlight()}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig(
                'METABALL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT',
                'metaballGridPhaseFieldFrontierHighlight',
                value,
            );
        }}
    />
    <span
        class="var-name"
        title="Phase Field only: add a winner-side accent at the active conquest front. This is separate from the steady territory border stroke."
    >
        Frontier Highlight
    </span>
    <span class="val">
        {currentPhaseFieldFrontierHighlight() ? 'On' : 'Off'}
    </span>
</label>
<div class="var-desc">
    Phase Field only. Adds a conquest-local winner-side rim at the active front. The Frontier Fade controls in Flip govern how this accent disappears near completion.
</div>
{/if}

{#if showGridEdgeShapingControls()}
    {#if usesBorderChaikinControl()}
        <div class="var-row">
            <div class="row-top">
                <span class="var-name" title="Number of Chaikin corner-cutting passes applied to each territory-edge polyline before it is stroked. 0 = axis-aligned (pixelated corners). 1..2 = rounded. 3..4 = very smooth but more vertices.">
                    Border Chaikin Passes
                </span>
                <span class="val">{currentBorderChaikinPasses()}</span>
            </div>
            <div class="var-desc">
                Smoothing for territory-edge polylines. Each pass roughly doubles the vertex count, trading CPU for rounder boundaries. Only the centered-blended edge path renders polylines, so this also requires Border Mode = "Territory edge" + Centered-blended = on.
            </div>
            <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={currentBorderChaikinPasses()}
                oninput={(event) => {
                    const value = parseInt((event.target as HTMLInputElement).value, 10);
                    writeConfig('METABALL_GRID_BORDER_CHAIKIN_PASSES', 'metaballGridBorderChaikinPasses', value);
                }}
            />
        </div>
    {/if}

    {#if usesSharedEdgeSmoothingControl()}
        <div class="var-row">
            <div class="row-top">
                <span class="var-name" title="Extra rounding pressure applied to shared boundary corners before the edge polyline is stroked. 0 keeps the current cell-corner profile; higher values make boundary cells read softer even before Chaikin smoothing.">
                    Shared Edge Smoothing
                </span>
                <span class="val">{panel.metaballGridEdgeSmoothingPasses ?? GAME_CONFIG.METABALL_GRID_EDGE_SMOOTHING_PASSES ?? 0}</span>
            </div>
            <div class="var-desc">
                {sharedEdgeSmoothingDescription()}
            </div>
            <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={panel.metaballGridEdgeSmoothingPasses ?? GAME_CONFIG.METABALL_GRID_EDGE_SMOOTHING_PASSES ?? 0}
                oninput={(event) => {
                    const value = parseInt((event.target as HTMLInputElement).value, 10);
                    writeConfig('METABALL_GRID_EDGE_SMOOTHING_PASSES', 'metaballGridEdgeSmoothingPasses', value);
                }}
            />
        </div>
    {/if}

    <div class="var-row">
        <div class="row-top">
            <span class="var-name" title="Trim open shared-boundary polylines inward by this many pixels at each endpoint. Intended to stay near 0 while the edge-shaping mode is stabilized.">
                Shared Edge Trim
            </span>
            <span class="val">{(panel.metaballGridEdgeTrimPx ?? GAME_CONFIG.METABALL_GRID_EDGE_TRIM_PX ?? 0).toFixed(1)}px</span>
        </div>
        <div class="var-desc">
            {sharedEdgeTrimDescription()}
        </div>
        <input
            type="range"
            min="0"
            max="12"
            step="0.5"
            value={panel.metaballGridEdgeTrimPx ?? GAME_CONFIG.METABALL_GRID_EDGE_TRIM_PX ?? 0}
            oninput={(event) => {
                const value = parseFloat((event.target as HTMLInputElement).value);
                writeConfig('METABALL_GRID_EDGE_TRIM_PX', 'metaballGridEdgeTrimPx', value);
            }}
        />
    </div>
{:else if isPhaseEdgesMode()}
<div class="var-row" class:disabled={!isControlFrontierTechnique() || currentBorderMode() !== 'territory_edge'}>
    <div class="row-top">
        <span class="var-name" title="Number of Chaikin corner-cutting passes applied to each territory-edge polyline before it is stroked. 0 = axis-aligned (pixelated corners). 1..2 = rounded. 3..4 = very smooth but more vertices.">
            Border Chaikin Passes
        </span>
        <span class="val">{currentBorderChaikinPasses()}</span>
    </div>
    <div class="var-desc">
        Smoothing for territory-edge boundaries. In <strong>Straight shared edge</strong> mode it smooths the shared-edge polyline; in <strong>Rounded contour-matched</strong> mode it smooths the contour-derived border so the fill and border stay coupled.
    </div>
    <input
        type="range"
        min="0"
        max="4"
        step="1"
        disabled={!isControlFrontierTechnique() || currentBorderMode() !== 'territory_edge'}
        value={currentBorderChaikinPasses()}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value, 10);
            writeConfig('METABALL_GRID_BORDER_CHAIKIN_PASSES', 'metaballGridBorderChaikinPasses', value);
        }}
    />
</div>

<div
    class="var-row"
    class:disabled={!canUseControlFrontierBorderGeometry() || currentFrontierBorderGeometryMode() !== 'shared_edge'}
>
    <div class="row-top">
        <span class="var-name" title="Extra rounding pressure applied to shared boundary corners before the edge polyline is stroked. 0 keeps the current cell-corner profile; higher values make boundary cells read softer even before Chaikin smoothing.">
            Shared Edge Smoothing
        </span>
        <span class="val">{panel.metaballGridEdgeSmoothingPasses ?? GAME_CONFIG.METABALL_GRID_EDGE_SMOOTHING_PASSES ?? 0}</span>
    </div>
    <div class="var-desc">
        Additional shared-edge softening for the straight control border path. Rounded contour-matched mode does not use this knob.
    </div>
    <input
        type="range"
        min="0"
        max="4"
        step="1"
        disabled={!canUseControlFrontierBorderGeometry() || currentFrontierBorderGeometryMode() !== 'shared_edge'}
        value={panel.metaballGridEdgeSmoothingPasses ?? GAME_CONFIG.METABALL_GRID_EDGE_SMOOTHING_PASSES ?? 0}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value, 10);
            writeConfig('METABALL_GRID_EDGE_SMOOTHING_PASSES', 'metaballGridEdgeSmoothingPasses', value);
        }}
    />
</div>

<div
    class="var-row"
    class:disabled={!canUseControlFrontierBorderGeometry() || currentFrontierBorderGeometryMode() !== 'shared_edge'}
>
    <div class="row-top">
        <span class="var-name" title="Trim open shared-boundary polylines inward by this many pixels at each endpoint. Intended to stay near 0 while the edge-shaping mode is stabilized.">
            Shared Edge Trim
        </span>
        <span class="val">{(panel.metaballGridEdgeTrimPx ?? GAME_CONFIG.METABALL_GRID_EDGE_TRIM_PX ?? 0).toFixed(1)}px</span>
    </div>
    <div class="var-desc">
        Endpoint trim for open shared-edge chains. Rounded contour-matched mode does not use this path.
    </div>
    <input
        type="range"
        min="0"
        max="12"
        step="0.5"
        disabled={!canUseControlFrontierBorderGeometry() || currentFrontierBorderGeometryMode() !== 'shared_edge'}
        value={panel.metaballGridEdgeTrimPx ?? GAME_CONFIG.METABALL_GRID_EDGE_TRIM_PX ?? 0}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_EDGE_TRIM_PX', 'metaballGridEdgeTrimPx', value);
        }}
    />
</div>
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
    Frontier Techniques compares the control path against shader-band and contour-extraction variants without changing the underlying ownership truth. These options only apply cleanly in Phase Edges on the square lattice. Surface styling and border-geometry controls live in Territory Styles.
</div>

<div class="var-row" class:disabled={!isPhaseEdgesMode()}>
    <div class="row-top">
        <span class="var-name" title="Benchmark comparison rows matching the frontier technique matrix.">
            Preset Rows
        </span>
        <span class="val">
            {#if !isPhaseEdgesMode()}Phase Edges only
            {:else if !canUsePhaseFieldFrontierTechnique()}Square lattice required
            {:else}Tap to apply{/if}
        </span>
    </div>
    <div class="var-desc">
        These presets apply the planned benchmark rows directly so effect and performance can be compared without manually dialing each knob.
    </div>
    <div class="preset-grid">
        {#each TERRITORY_FRONTIER_BENCHMARK_PRESETS as preset}
            <button
                type="button"
                class="preset-chip"
                class:active={isFrontierPresetSelected(preset)}
                disabled={!isPhaseEdgesMode()}
                title={preset.description}
                onclick={() => applyFrontierPreset(preset)}
            >
                {preset.label}
            </button>
        {/each}
    </div>
</div>

<div class="var-row" class:disabled={!isPhaseEdgesMode()}>
    <div class="row-top">
        <span class="var-name" title="Requested frontier implementation. Control = existing shared-edge path. Shader band = linear sampled phase texture. The contour options extract explicit geometry from the phase field.">
            Frontier Technique
        </span>
        <span class="val">
            {#if currentFrontierTechnique() === 'control'}Control
            {:else if currentFrontierTechnique() === 'shader_frontier_band'}Shader band
            {:else if currentFrontierTechnique() === 'marching_squares_midpoint'}MS midpoint
            {:else if currentFrontierTechnique() === 'marching_squares_scalar'}MS scalar
            {:else if currentFrontierTechnique() === 'marching_triangles_fixed'}MT fixed
            {:else if currentFrontierTechnique() === 'marching_triangles_checkerboard'}MT checker
            {:else}MT gradient{/if}
        </span>
    </div>
    <div class="var-desc">
        Control keeps the current square-cell shared-edge baseline. The new options use a shared frontier utility layer and are gated to Phase Edges.
    </div>
    <select
        class="mode-select"
        disabled={!isPhaseEdgesMode()}
        value={currentFrontierTechnique()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('TERRITORY_FRONTIER_TECHNIQUE', 'territoryFrontierTechnique', value);
        }}
    >
        <option value="control">Current control</option>
        <option value="shader_frontier_band">Shader frontier band</option>
        <option value="marching_squares_midpoint">Marching squares (midpoint)</option>
        <option value="marching_squares_scalar">Marching squares (scalar)</option>
        <option value="marching_triangles_fixed">Marching triangles (fixed)</option>
        <option value="marching_triangles_checkerboard">Marching triangles (checkerboard)</option>
        <option value="marching_triangles_gradient">Marching triangles (gradient)</option>
    </select>
</div>

<div class="var-row" class:disabled={!canUsePhaseFieldFrontierTechnique() || !isShaderFrontierTechnique()}>
    <div class="row-top">
        <span class="var-name" title="Sampling mode for the phase texture used by the shader frontier band.">
            Phase Sampling
        </span>
        <span class="val">{currentFrontierPhaseSampling() === 'linear' ? 'Linear' : 'Nearest'}</span>
    </div>
    <div class="var-desc">
        Linear filtering is the cheapest visual softening step from the source document. It only affects the scalar phase texture, never owner IDs.
    </div>
    <select
        class="mode-select"
        disabled={!canUsePhaseFieldFrontierTechnique() || !isShaderFrontierTechnique()}
        value={currentFrontierPhaseSampling()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('TERRITORY_FRONTIER_PHASE_SAMPLING', 'territoryFrontierPhaseSampling', value);
        }}
    >
        <option value="nearest">Nearest</option>
        <option value="linear">Linear</option>
    </select>
</div>

<div class="var-row" class:disabled={!canUsePhaseFieldFrontierTechnique() || currentFrontierTechnique() === 'control'}>
    <div class="row-top">
        <span class="var-name" title="Number of separable 3-tap blur passes applied to the scalar phase field before the frontier is rendered or contoured.">
            Blur Passes
        </span>
        <span class="val">{currentFrontierBlurPasses()}</span>
    </div>
    <div class="var-desc">
        Each pass is a tiny [0.25, 0.5, 0.25] horizontal + vertical blur. Use 0 for raw frontier geometry, 1 for the recommended cheap smoothing pass.
    </div>
    <input
        type="range"
        min="0"
        max="2"
        step="1"
        disabled={!canUsePhaseFieldFrontierTechnique() || currentFrontierTechnique() === 'control'}
        value={currentFrontierBlurPasses()}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value, 10);
            writeConfig('TERRITORY_FRONTIER_BLUR_PASSES', 'territoryFrontierBlurPasses', value);
        }}
    />
</div>

<div class="var-row" class:disabled={!canUsePhaseFieldFrontierTechnique() || !isTriangleFrontierTechnique()}>
    <div class="row-top">
        <span class="var-name" title="How marching triangles chooses the square-split diagonal.">
            Triangle Diagonal
        </span>
        <span class="val">
            {#if currentFrontierTriangleDiagonalPolicy() === 'fixed'}Fixed
            {:else if currentFrontierTriangleDiagonalPolicy() === 'checkerboard'}Checkerboard
            {:else}Gradient{/if}
        </span>
    </div>
    <div class="var-desc">
        Fixed is the cheapest prototype. Checkerboard reduces directional bias. Gradient chooses the diagonal from the local phase slope.
    </div>
    <select
        class="mode-select"
        disabled={!canUsePhaseFieldFrontierTechnique() || !isTriangleFrontierTechnique()}
        value={currentFrontierTriangleDiagonalPolicy()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig(
                'TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY',
                'territoryFrontierTriangleDiagonalPolicy',
                value,
            );
        }}
    >
        <option value="fixed">Fixed</option>
        <option value="checkerboard">Checkerboard</option>
        <option value="gradient">Gradient chosen</option>
    </select>
</div>

<div class="var-row" class:disabled={!canUsePhaseFieldFrontierTechnique() || !isContourFrontierTechnique()}>
    <div class="row-top">
        <span class="var-name" title="Post-contour Chaikin smoothing passes.">
            Frontier Chaikin
        </span>
        <span class="val">{currentFrontierChaikinPasses()}</span>
    </div>
    <div class="var-desc">
        Applied after contour extraction only. One pass is the recommended first test; two gets smoother and more rounded.
    </div>
    <input
        type="range"
        min="0"
        max="3"
        step="1"
        disabled={!canUsePhaseFieldFrontierTechnique() || !isContourFrontierTechnique()}
        value={currentFrontierChaikinPasses()}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value, 10);
            writeConfig('TERRITORY_FRONTIER_CHAIKIN_PASSES', 'territoryFrontierChaikinPasses', value);
        }}
    />
</div>

<div class="var-row" class:disabled={!canUsePhaseFieldFrontierTechnique() || !isShaderFrontierTechnique()}>
    <div class="row-top">
        <span class="var-name" title="Additional softness on the shader frontier band, in world pixels before conversion to phase-space width.">
            Shader Softness
        </span>
        <span class="val">{currentFrontierShaderSoftnessPx().toFixed(1)}px</span>
    </div>
    <div class="var-desc">
        Softens the `abs(phase - progress)` band after linear sampling. Larger values broaden the feather.
    </div>
    <input
        type="range"
        min="0.5"
        max="20"
        step="0.5"
        disabled={!canUsePhaseFieldFrontierTechnique() || !isShaderFrontierTechnique()}
        value={currentFrontierShaderSoftnessPx()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig(
                'TERRITORY_FRONTIER_SHADER_SOFTNESS_PX',
                'territoryFrontierShaderSoftnessPx',
                value,
            );
        }}
    />
</div>

<div class="var-row" class:disabled={!canUsePhaseFieldFrontierTechnique() || !isShaderFrontierTechnique()}>
    <div class="row-top">
        <span class="var-name" title="Half-width of the shader frontier band, in world pixels before conversion to phase-space width.">
            Band Width
        </span>
        <span class="val">{currentFrontierBandWidthPx().toFixed(1)}px</span>
    </div>
    <div class="var-desc">
        Controls how thick the shader frontier band reads on screen. The contour techniques still use the existing border width control for stroke thickness.
    </div>
    <input
        type="range"
        min="0.5"
        max="12"
        step="0.5"
        disabled={!canUsePhaseFieldFrontierTechnique() || !isShaderFrontierTechnique()}
        value={currentFrontierBandWidthPx()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('TERRITORY_FRONTIER_BAND_WIDTH_PX', 'territoryFrontierBandWidthPx', value);
        }}
    />
</div>
</div>
{/if}

{#if showModule('wave')}
<div class="module-block">
<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Neighborhood used when a grid_bfs wave expands over the grid.">
            Adjacency
        </span>
        <span class="val">{currentAdjacency() === '4' ? '4-connected' : '8-connected'}</span>
    </div>
    <div class="var-desc">
        4-connected produces square-fronted waves; 8-connected produces more diagonal/rounded fronts.
    </div>
    <select
        class="mode-select"
        value={currentAdjacency()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('METABALL_GRID_ADJACENCY', 'metaballGridAdjacency', value);
        }}
    >
        <option value="8">8-connected (diagonals)</option>
        <option value="4">4-connected (orthogonal only)</option>
    </select>
</div>

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
    <select
        class="mode-select"
        value={currentWaveGeometry()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('METABALL_GRID_WAVE_GEOMETRY', 'metaballGridWaveGeometry', value);
        }}
    >
        <option value="grid_bfs">Grid BFS (step-by-step)</option>
        <option value="euclidean_band">Euclidean band (distance buckets)</option>
        <option value="conquered_star_radial">Conquered star radial</option>
        <option value="pre_to_post_frontier">Pre → post frontier</option>
    </select>
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
    <select
        class="mode-select"
        value={currentWaveSeeding()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('METABALL_GRID_WAVE_SEEDING', 'metaballGridWaveSeeding', value);
        }}
    >
        <option value="winner_natives">Winner natives (multi-source)</option>
        <option value="conquered_star_center">Conquered star center</option>
        <option value="winner_nearest_edge">Winner nearest edge (4-adj)</option>
    </select>
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
    <select
        class="mode-select"
        value={currentFlipTransition()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('METABALL_GRID_FLIP_TRANSITION', 'metaballGridFlipTransition', value);
        }}
    >
        <option value="hard">Hard (instant)</option>
        <option value="lerp_per_cell">Lerp per cell (local window)</option>
        <option value="dual_pass_blend">Dual pass blend (always two)</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Half-width of the crossfade window around each cell's flipTime (as a fraction of transition progress 0..1).">
            Flip Window
        </span>
        <span class="val">{(panel.metaballGridFlipWindow ?? GAME_CONFIG.METABALL_GRID_FLIP_WINDOW ?? 0.06).toFixed(3)}</span>
    </div>
    <div class="var-desc">
        Crossfade half-width for lerp_per_cell and dual_pass_blend. Larger values soften flips; 0 collapses to hard behavior.
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={panel.metaballGridFlipWindow ?? GAME_CONFIG.METABALL_GRID_FLIP_WINDOW ?? 0.06}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_FLIP_WINDOW', 'metaballGridFlipWindow', value);
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
    <select
        class="mode-select"
        value={currentWaveEase()}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('METABALL_GRID_WAVE_EASE', 'metaballGridWaveEase', value);
        }}
    >
        <option value="linear">Linear (no easing)</option>
        <option value="ease_in">Ease in (quadratic)</option>
        <option value="ease_out">Ease out (quadratic)</option>
        <option value="ease_in_out">Ease in-out</option>
        <option value="back_out">Back out (slight overshoot)</option>
        <option value="elastic_out">Elastic out (spring)</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Per-cell deterministic shift applied to flipTime, in progress units. 0.05 = each cell flips up to ±5 percent earlier/later than the wave rank would dictate. Breaks up rigid fronts for a more organic feel.">
            FlipTime Jitter
        </span>
        <span class="val">{(panel.metaballGridFlipWindowJitter ?? GAME_CONFIG.METABALL_GRID_FLIP_WINDOW_JITTER ?? 0).toFixed(3)}</span>
    </div>
    <div class="var-desc">
        Deterministic per-cell scatter of flip-time (seeded by cell id, stable across runs). Great for softening straight wave fronts.
    </div>
    <input
        type="range"
        min="0"
        max="0.5"
        step="0.005"
        value={panel.metaballGridFlipWindowJitter ?? GAME_CONFIG.METABALL_GRID_FLIP_WINDOW_JITTER ?? 0}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_FLIP_WINDOW_JITTER', 'metaballGridFlipWindowJitter', value);
        }}
    />
</div>
</div>
{/if}

{#if showModule('perf')}
<div class="module-block">
<div class="var-desc" style="opacity:0.9;margin-bottom:8px;">
    Live planner/readout surface for metaball-grid. Requested spacing is the knob value; effective spacing is what the planner actually used after max-cell coarsening. Painted cells are the cells that survived the current frame’s alpha/scene cull.
</div>

<div class="perf-grid">
    <div class="perf-label">Cells (painted / emittable / total)</div>
    <div class="perf-value">
        {$metaballGridStats.paintedCells.toLocaleString()}
        <span class="perf-sub">/ {$metaballGridStats.emittableCells.toLocaleString()} / {$metaballGridStats.totalCells.toLocaleString()}</span>
    </div>

    <div class="perf-label">Spacing (requested / effective)</div>
    <div class="perf-value">
        {$metaballGridStats.requestedSpacingPx.toFixed(1)} px
        <span class="perf-sub">
            / {$metaballGridStats.effectiveSpacingPx.toFixed(1)} px
            {#if $metaballGridStats.effectiveSpacingPx > $metaballGridStats.requestedSpacingPx + 0.01}
                <span class="perf-coarsen">(coarsened)</span>
            {/if}
        </span>
    </div>

    <div class="perf-label">Density (requested / effective)</div>
    <div class="perf-value">
        {$metaballGridStats.requestedDensityCellsPerMpx.toFixed(0)} cells/Mpx
        <span class="perf-sub">
            / {$metaballGridStats.effectiveDensityCellsPerMpx.toFixed(0)} cells/Mpx
            {#if $metaballGridStats.effectiveDensityCellsPerMpx + 0.5 < $metaballGridStats.requestedDensityCellsPerMpx}
                <span class="perf-coarsen">(reduced)</span>
            {/if}
        </span>
    </div>

    <div class="perf-label">Frame time (last / EMA)</div>
    <div class="perf-value">
        {$metaballGridStats.lastUpdateMs.toFixed(2)} ms
        <span class="perf-sub">/ {$metaballGridStats.emaUpdateMs.toFixed(2)} ms</span>
    </div>

    <div class="perf-label">Frontier technique</div>
    <div class="perf-value">
        {$metaballGridStats.frontierTechnique}
        {#if $metaballGridStats.frontierTechnique !== $metaballGridStats.frontierRequestedTechnique}
            <span class="perf-sub">
                requested {$metaballGridStats.frontierRequestedTechnique}
                {#if $metaballGridStats.frontierFallbackReason}
                    ({$metaballGridStats.frontierFallbackReason})
                {/if}
            </span>
        {/if}
    </div>

    <div class="perf-label">Border geometry</div>
    <div class="perf-value">
        {$metaballGridStats.frontierBorderGeometryMode}
        {#if $metaballGridStats.frontierBorderGeometryMode !== $metaballGridStats.frontierRequestedBorderGeometryMode}
            <span class="perf-sub">
                requested {$metaballGridStats.frontierRequestedBorderGeometryMode}
                {#if $metaballGridStats.frontierBorderGeometryFallbackReason}
                    ({$metaballGridStats.frontierBorderGeometryFallbackReason})
                {/if}
            </span>
        {:else if $metaballGridStats.frontierBorderGeometryFallbackReason}
            <span class="perf-sub">
                ({$metaballGridStats.frontierBorderGeometryFallbackReason})
            </span>
        {/if}
    </div>

    <div class="perf-label">Surface family</div>
    <div class="perf-value">
        {$metaballGridStats.frontierSurfaceGeometryFamily}
        <span class="perf-sub">
            steady {$metaballGridStats.frontierStableGeometryFamily}
            / transition {$metaballGridStats.frontierTransitionGeometryFamily}
            {#if $metaballGridStats.frontierSurfaceInvariantViolation}
                ({$metaballGridStats.frontierSurfaceInvariantViolation})
            {/if}
        </span>
    </div>

    <div class="perf-label">Phase grid (layers / max dims)</div>
    <div class="perf-value">
        {$metaballGridStats.frontierPhaseLayerCount}
        <span class="perf-sub">
            / {$metaballGridStats.frontierPhaseGridCols} × {$metaballGridStats.frontierPhaseGridRows}
        </span>
    </div>

    <div class="perf-label">Frontier timings</div>
    <div class="perf-value">
        blur {$metaballGridStats.frontierBlurMs.toFixed(2)} ms
        <span class="perf-sub">
            contour {$metaballGridStats.frontierContourExtractionMs.toFixed(2)} ms
            / smooth {$metaballGridStats.frontierSmoothingMs.toFixed(2)} ms
        </span>
    </div>

    <div class="perf-label">Frontier geometry</div>
    <div class="perf-value">
        {$metaballGridStats.frontierPolylineCount.toLocaleString()} polylines
        <span class="perf-sub">
            / {$metaballGridStats.frontierEmittedVertexCount.toLocaleString()} vertices
        </span>
    </div>

    <div class="perf-label">Plan build (classify / wave / total)</div>
    <div class="perf-value">
        {$metaballGridStats.lastClassificationBuildMs.toFixed(2)} ms
        <span class="perf-sub">
            / {$metaballGridStats.lastWavePlanBuildMs.toFixed(2)} ms
            / {$metaballGridStats.lastPlanBuildMs.toFixed(2)} ms
        </span>
    </div>

    <div class="perf-label">Frames</div>
    <div class="perf-value">
        {$metaballGridStats.frameCount.toLocaleString()}
        <span class="perf-sub">skipped {$metaballGridStats.skippedFrameCount.toLocaleString()}</span>
    </div>

    <div class="perf-label">Render cache</div>
    <div class="perf-value">
        {$metaballGridStats.renderCacheMode === 'steady_texture'
            ? 'steady texture'
            : 'live vectors'}
    </div>

    <div class="perf-label">Requested plan</div>
    <div class="perf-value">
        {$metaballGridStats.planWorkerPending ? 'worker build pending' : 'worker ready'}
    </div>

    <div class="perf-label">Visible frame</div>
    <div class="perf-value">
        {#if $metaballGridStats.visibleFrameState === 'holding_pre'}
            holding PRE
        {:else if $metaballGridStats.visibleFrameState === 'requested_plan'}
            requested transition plan
        {:else if $metaballGridStats.visibleFrameState === 'fallback_plan'}
            fallback plan
        {:else}
            steady-state plan
        {/if}
    </div>

    <div class="perf-label">Transition clock</div>
    <div class="perf-value">
        {#if $metaballGridStats.clockSource === 'local'}
            local visual clock
        {:else if $metaballGridStats.clockSource === 'scheduler'}
            scheduler clock
        {:else}
            none
        {/if}
    </div>
</div>
{#if isPhaseFieldMode()}
<div class="var-desc" style="margin:14px 0 8px; opacity:0.92;">
    Phase Field finish tail. These controls only affect how the PRE cell mask resolves into the smooth POST territory at the end of conquest.
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Normalized conquest time (0..1) when the PRE cell overlay starts fading away. Lower starts the settle earlier; higher keeps the chunky mask visible longer.">
            Finish Fade Start
        </span>
        <span class="val">{currentPhaseFieldFinishFadeStart().toFixed(3)}</span>
    </div>
    <div class="var-desc">
        Start of the end-tail alpha fade for PRE-side cells, measured against the overall conquest clock before wave easing.
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={currentPhaseFieldFinishFadeStart()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig(
                'METABALL_GRID_PHASE_FIELD_FINISH_FADE_START',
                'metaballGridPhaseFieldFinishFadeStart',
                value,
            );
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Normalized conquest time (0..1) when the PRE cell overlay finishes fading out. Set close to 1 for a late dissolve into steady POST territory.">
            Finish Fade End
        </span>
        <span class="val">{currentPhaseFieldFinishFadeEnd().toFixed(3)}</span>
    </div>
    <div class="var-desc">
        End of the end-tail alpha fade for PRE-side cells. The interval between start and end controls how gradual the settle feels.
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={currentPhaseFieldFinishFadeEnd()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig(
                'METABALL_GRID_PHASE_FIELD_FINISH_FADE_END',
                'metaballGridPhaseFieldFinishFadeEnd',
                value,
            );
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Normalized conquest time (0..1) when transition cells begin shrinking toward their final cleanup size.">
            Size Collapse Start
        </span>
        <span class="val">{currentPhaseFieldSizeCollapseStart().toFixed(3)}</span>
    </div>
    <div class="var-desc">
        Start of the size-collapse tail. Earlier values make the grid read more like a dissolve into territory truth instead of holding chunk size until the end.
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={currentPhaseFieldSizeCollapseStart()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig(
                'METABALL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START',
                'metaballGridPhaseFieldSizeCollapseStart',
                value,
            );
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Normalized conquest time (0..1) when transition cells finish shrinking.">
            Size Collapse End
        </span>
        <span class="val">{currentPhaseFieldSizeCollapseEnd().toFixed(3)}</span>
    </div>
    <div class="var-desc">
        End of the size-collapse tail. A later end keeps the cell read visible almost to steady-state; an earlier end makes the POST geometry take over sooner.
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={currentPhaseFieldSizeCollapseEnd()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig(
                'METABALL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END',
                'metaballGridPhaseFieldSizeCollapseEnd',
                value,
            );
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Smallest cell size the phase-field cleanup tail collapses toward. 1px gives the smoothest dissolve into POST territory.">
            Final Cell Size
        </span>
        <span class="val">{currentPhaseFieldFinalCellSizePx().toFixed(1)}px</span>
    </div>
    <div class="var-desc">
        Final cell size at the end of the completion tail. Lower values make the block mask melt into the POST shape instead of dropping away as large chunks.
    </div>
    <input
        type="range"
        min="1"
        max="32"
        step="0.5"
        value={currentPhaseFieldFinalCellSizePx()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig(
                'METABALL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX',
                'metaballGridPhaseFieldFinalCellSizePx',
                value,
            );
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Normalized conquest time (0..1) when the phase-field frontier accent begins fading. This is the cleanup control for whether the edge lingers after the cells start settling.">
            Frontier Fade Start
        </span>
        <span class="val">{currentPhaseFieldFrontierFadeStart().toFixed(3)}</span>
    </div>
    <div class="var-desc">
        Start of the winner-side frontier-accent fade. Use this to keep a brief rim of motion even after the fill has begun settling.
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={currentPhaseFieldFrontierFadeStart()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig(
                'METABALL_GRID_PHASE_FIELD_FRONTIER_FADE_START',
                'metaballGridPhaseFieldFrontierFadeStart',
                value,
            );
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Normalized conquest time (0..1) when the phase-field frontier accent is fully gone.">
            Frontier Fade End
        </span>
        <span class="val">{currentPhaseFieldFrontierFadeEnd().toFixed(3)}</span>
    </div>
    <div class="var-desc">
        End of the winner-side frontier-accent fade. A slightly earlier value prevents the border highlight from hanging after the map has otherwise resolved.
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={currentPhaseFieldFrontierFadeEnd()}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig(
                'METABALL_GRID_PHASE_FIELD_FRONTIER_FADE_END',
                'metaballGridPhaseFieldFrontierFadeEnd',
                value,
            );
        }}
    />
</div>
{/if}
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

    .mode-lock-note {
        margin: 0 0 10px;
        font-size: 11px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.72);
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
        grid-template-columns: repeat(5, minmax(0, 1fr));
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

    .preset-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 4px 0 2px;
    }

    .preset-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        padding: 0 10px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(7, 12, 24, 0.45);
        color: rgba(226, 232, 240, 0.84);
        font-size: 10px;
        font-weight: 700;
        line-height: 1.15;
        letter-spacing: 0.03em;
        text-align: center;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease;
    }

    .preset-chip.active {
        border-color: rgba(95, 211, 255, 0.42);
        background: rgba(49, 105, 164, 0.26);
        box-shadow: 0 0 0 1px rgba(95, 211, 255, 0.16);
        color: rgba(248, 250, 252, 0.98);
    }

    .preset-chip:disabled {
        opacity: 0.5;
        cursor: default;
    }

    .var-desc {
        margin: 4px 0 10px;
        color: rgba(220, 232, 245, 0.72);
        font-size: 10px;
        line-height: 1.35;
    }

    .var-row.disabled {
        opacity: 0.55;
    }

    .perf-grid {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 6px 14px;
        align-items: baseline;
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(7, 12, 24, 0.4);
        font-size: 11px;
    }

    .perf-label {
        color: rgba(220, 232, 245, 0.7);
        letter-spacing: 0.04em;
    }

    .perf-value {
        color: rgba(248, 250, 252, 0.95);
        font-variant-numeric: tabular-nums;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .perf-sub {
        color: rgba(220, 232, 245, 0.55);
        margin-left: 6px;
    }

    .perf-coarsen {
        color: rgba(255, 196, 105, 0.9);
        margin-left: 4px;
        font-size: 10px;
    }
</style>
