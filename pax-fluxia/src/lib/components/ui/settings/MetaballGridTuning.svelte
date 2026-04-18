<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    type MetaballGridModuleId = 'all' | 'none' | 'grid' | 'wave' | 'flip';

    const METABALL_GRID_MODULES = [
        { id: 'grid', label: 'Grid' },
        { id: 'wave', label: 'Wave' },
        { id: 'flip', label: 'Flip' },
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
    function currentOriginMode(): 'centered' | 'origin' {
        const raw =
            panel.metaballGridOriginMode ??
            GAME_CONFIG.METABALL_GRID_ORIGIN_MODE ??
            'centered';
        return raw === 'origin' ? 'origin' : 'centered';
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
        <span class="val">{panel.metaballGridSpacingPx ?? GAME_CONFIG.METABALL_GRID_SPACING_PX ?? 48}px</span>
    </div>
    <div class="var-desc">
        Distance between grid Vstar centers. Drives cell count as (worldWidth/spacing)×(worldHeight/spacing).
    </div>
    <input
        type="range"
        min="8"
        max="96"
        step="1"
        value={panel.metaballGridSpacingPx ?? GAME_CONFIG.METABALL_GRID_SPACING_PX ?? 48}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_SPACING_PX', 'metaballGridSpacingPx', value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Where the grid is anchored in world space. 'Centered' offsets by half-spacing so cells center within the world bounds; 'Origin' starts cells at (0,0).">
            Origin Mode
        </span>
        <span class="val">{currentOriginMode() === 'centered' ? 'Centered' : 'Origin'}</span>
    </div>
    <div class="var-desc">
        Anchor mode for grid sample positions. Centered places the first cell at (spacing/2, spacing/2); Origin places it at (0, 0).
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
        <option value="origin">Origin (0,0 anchor)</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name" title="Inward bias applied to edge-adjacent cells during compositing. 0 = no offset.">
            Inward Offset
        </span>
        <span class="val">{panel.metaballGridInwardOffsetPx ?? GAME_CONFIG.METABALL_GRID_INWARD_OFFSET_PX ?? 0}px</span>
    </div>
    <div class="var-desc">
        Optional visual pull of edge cells toward owner interiors. Set to 0 to pass positions through unchanged.
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
        <span class="var-name" title="Strength multiplier fed to each grid cell's metaball influence sample. Higher = fuller fill, stronger blob.">
            Cell Strength
        </span>
        <span class="val">{(panel.metaballGridStrength ?? GAME_CONFIG.METABALL_GRID_STRENGTH ?? 1.35).toFixed(2)}</span>
    </div>
    <div class="var-desc">
        Per-cell compositor strength. Since grid cells are 1:1 with Vstars on a world grid, a slightly higher strength (~1.35) keeps interiors saturated.
    </div>
    <input
        type="range"
        min="0.1"
        max="6"
        step="0.05"
        value={panel.metaballGridStrength ?? GAME_CONFIG.METABALL_GRID_STRENGTH ?? 1.35}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_STRENGTH', 'metaballGridStrength', value);
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
        max="0.5"
        step="0.005"
        value={panel.metaballGridFlipWindow ?? GAME_CONFIG.METABALL_GRID_FLIP_WINDOW ?? 0.06}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            writeConfig('METABALL_GRID_FLIP_WINDOW', 'metaballGridFlipWindow', value);
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
        grid-template-columns: repeat(3, minmax(0, 1fr));
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
</style>
