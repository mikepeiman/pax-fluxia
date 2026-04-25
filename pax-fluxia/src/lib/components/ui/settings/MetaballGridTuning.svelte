<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
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
        | 'shape'
        | 'wave'
        | 'flip'
        | 'perf';

    const METABALL_GRID_MODULES = [
        { id: 'grid', label: 'Grid' },
        { id: 'shape', label: 'Shape' },
        { id: 'wave', label: 'Wave' },
        { id: 'flip', label: 'Flip' },
        { id: 'perf', label: 'Perf' },
    ] as const;

    const METABALL_GRID_MODULE_PANEL_KEY = 'metaballGridModuleVisibility';

    let activeModule = $derived(
        (panel[METABALL_GRID_MODULE_PANEL_KEY] ?? 'all') as MetaballGridModuleId,
    );

    function showModule(id: Exclude<MetaballGridModuleId, 'all' | 'none'>): boolean {
        return activeModule === 'all' || activeModule === id;
    }

    function setActiveModule(value: MetaballGridModuleId): void {
        updatePanel(METABALL_GRID_MODULE_PANEL_KEY, value);
    }

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
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

    function currentWaveGeometry(): 'grid_bfs' | 'euclidean_band' {
        const raw =
            panel.metaballGridWaveGeometry ??
            GAME_CONFIG.METABALL_GRID_WAVE_GEOMETRY ??
            'grid_bfs';
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
        const raw =
            panel.metaballGridBorderMode ??
            GAME_CONFIG.METABALL_GRID_BORDER_MODE ??
            'off';
        if (raw === 'per_cell') return 'per_cell';
        if (raw === 'territory_edge') return 'territory_edge';
        return 'off';
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
            Cell Spacing
        </span>
        <span class="val">{currentSpacingPx()}px</span>
    </div>
    <div class="var-desc">
        Distance between grid Vstar centers. Drives cell count as (worldWidth/spacing)×(worldHeight/spacing).
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

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Extra inset applied only to non-native (boundary / in-transition) cells on top of Cell Inset. Visually pulls the territory edge inward from its classified extent. 0 = no extra offset.">
            Inward Offset
        </span>
        <span class="val">{panel.metaballGridInwardOffsetPx ?? GAME_CONFIG.METABALL_GRID_INWARD_OFFSET_PX ?? 0}px</span>
    </div>
    <div class="var-desc">
        Extra inset on non-native cells (boundary + in-transition). Adds to the base Cell Inset, so boundary cells render smaller than interior-territory cells. 0 = no extra offset.
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

</div>
{/if}

{#if showModule('shape')}
<div class="module-block">
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

<label class="toggle-row" class:disabled={currentBorderMode() !== 'territory_edge'}>
    <input
        type="checkbox"
        disabled={currentBorderMode() !== 'territory_edge'}
        checked={panel.metaballGridBorderBlend ?? GAME_CONFIG.METABALL_GRID_BORDER_BLEND ?? true}
        onchange={(event) => {
            const value = (event.target as HTMLInputElement).checked;
            writeConfig('METABALL_GRID_BORDER_BLEND', 'metaballGridBorderBlend', value);
        }}
    />
    <span class="var-name" title="Centered-blended borders: a single stroke on each ownership-boundary edge, coloured as the 50/50 blend of the two players' border colours. Off: each cell draws its own stroke in its own colour, so boundaries show two abutting strokes.">
        Centered-blended borders
    </span>
    <span class="val">
        {(panel.metaballGridBorderBlend ?? GAME_CONFIG.METABALL_GRID_BORDER_BLEND ?? true) ? 'On' : 'Off'}
    </span>
</label>
<div class="var-desc">
    Only applies when Border Mode = "Territory edge". On: one blended stroke per shared boundary edge. Off: each cell strokes its own outline in its own colour (edges appear as two abutting lines).
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Number of Chaikin corner-cutting passes applied to each territory-edge polyline before it is stroked. 0 = axis-aligned (pixelated corners). 1..2 = rounded. 3..4 = very smooth but more vertices.">
            Border Chaikin Passes
        </span>
        <span class="val">{panel.metaballGridBorderChaikinPasses ?? GAME_CONFIG.METABALL_GRID_BORDER_CHAIKIN_PASSES ?? 0}</span>
    </div>
    <div class="var-desc">
        Smoothing for territory-edge polylines. Each pass roughly doubles the vertex count, trading CPU for rounder boundaries. Only the centered-blended edge path renders polylines, so this also requires Border Mode = "Territory edge" + Centered-blended = on.
    </div>
    <input
        type="range"
        min="0"
        max="4"
        step="1"
        value={panel.metaballGridBorderChaikinPasses ?? GAME_CONFIG.METABALL_GRID_BORDER_CHAIKIN_PASSES ?? 0}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value, 10);
            writeConfig('METABALL_GRID_BORDER_CHAIKIN_PASSES', 'metaballGridBorderChaikinPasses', value);
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
        <span class="val">{currentWaveGeometry() === 'grid_bfs' ? 'Grid BFS' : 'Euclidean band'}</span>
    </div>
    <div class="var-desc">
        Grid BFS follows grid neighbors step-by-step; Euclidean band bins cells by distance to nearest seed.
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

    <div class="perf-label">Frames</div>
    <div class="perf-value">
        {$metaballGridStats.frameCount.toLocaleString()}
        <span class="perf-sub">skipped {$metaballGridStats.skippedFrameCount.toLocaleString()}</span>
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
