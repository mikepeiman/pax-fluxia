<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import { normalizePerimeterFieldGeometrySource } from '$lib/territory/geometry/geometrySource';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        const normalized = normalizePerimeterFieldGeometrySource(value);
        ((GAME_CONFIG as unknown) as Record<string, unknown>)[configKey] = normalized;
        updatePanel(panelKey, normalized);
        bumpTerritoryVisualConfig();
    }

    function currentGeometrySource(): string {
        return (
            panel.perimeterFieldGeometrySource ??
            GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ??
            "power_voronoi_0319"
        ) as string;
    }

    function geometrySourceLabel(): string {
        return 'Power Voronoi (0319 Authority)';
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
        Final authority source for derived renderers. Saved Resolved Vector configs are normalized here so CX, DX, MSR, and lane-pair tuning all use the same geometry contract.
    </div>
    <select
        class="mode-select"
        value={normalizePerimeterFieldGeometrySource(currentGeometrySource())}
        onchange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            writeConfig('PERIMETER_FIELD_GEOMETRY_SOURCE', 'perimeterFieldGeometrySource', value);
        }}
    >
        <option value="power_voronoi_0319">Power Voronoi (0319 Authority)</option>
    </select>
</div>

<div class="var-desc">
    Topology ownership rules are no longer duplicated here. MSR, CX,
    lane-pair, and DX controls live only in <strong>Topology Rules</strong>.
</div>

<style>

    .var-desc {
        margin: 4px 0 10px;
        color: var(--pax-ui-text-dim);
        font-family: var(--pax-ui-font-copy);
        font-size: calc(0.68rem * var(--pax-ui-type-scale, 1));
        line-height: 1.35;
    }

    .sub-heading {
        margin: 12px 0 6px;
        color: var(--pax-ui-accent-cyan);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.68rem * var(--pax-ui-type-scale, 1));
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
</style>
