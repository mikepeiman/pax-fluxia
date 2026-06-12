<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
    import { PaxHudSelect } from "$lib/design-system";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    const GEOMETRY_SOURCE_OPTIONS = [
        { value: "power_voronoi_0319", label: "Power Voronoi (0319)" },
        { value: "resolved_vector", label: "Resolved Vector" },
    ];

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
    }

    function currentGeometrySource(): string {
        return (
            panel.perimeterFieldGeometrySource ??
            GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ??
            "power_voronoi_0319"
        ) as string;
    }
</script>

<div class="sub-heading">Geometry Source</div>

<PaxHudSelect
    label="Base Geometry Source"
    value={currentGeometrySource()}
    options={GEOMETRY_SOURCE_OPTIONS}
    onValueChange={(value) =>
        writeConfig(
            "PERIMETER_FIELD_GEOMETRY_SOURCE",
            "perimeterFieldGeometrySource",
            value,
        )}
/>

<div class="var-desc">
    Choose which compiled territory geometry feeds the active derived renderer
    before it applies its own surface presentation.
</div>

<div class="var-desc">
    Topology ownership rules are no longer duplicated here. MSR, CX,
    lane-pair, and DX controls live only in <strong>Topology Rules</strong>.
</div>

<style>
    @import "./panel-shared.css";

    .var-desc {
        margin: 4px 0 10px;
        color: var(--hud-text-dim);
        font-family: var(--hud-font-copy);
        font-size: calc(0.68rem * var(--hud-type-scale, 1));
        line-height: 1.35;
    }

    .sub-heading {
        margin: 12px 0 6px;
        color: var(--hud-accent-cyan);
        font-family: var(--hud-font-ui);
        font-size: calc(0.68rem * var(--hud-type-scale, 1));
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
</style>
