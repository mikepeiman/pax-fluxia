<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        ((GAME_CONFIG as unknown) as Record<string, unknown>)[configKey] = value;
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

<div class="sub-heading">Geometry Source</div>

<div class="var-row">
    <div class="row-top">
        <span
            class="var-name"
            title="Which territory geometry pipeline provides the source boundary data used by derived render families."
        >
            Base Geometry Source
        </span>
        <span class="val">{geometrySourceLabel()}</span>
    </div>
    <div class="var-desc">
        Choose which compiled territory geometry feeds the active derived renderer before it applies its own surface presentation.
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

<div class="var-desc">
    Topology ownership rules are no longer duplicated here. MSR, CX, lane-pair, and DX controls live only in <strong>Topology Rules</strong>.
</div>

<style>
    @import './panel-shared.css';

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
