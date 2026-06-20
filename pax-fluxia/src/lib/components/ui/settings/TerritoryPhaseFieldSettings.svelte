<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
    import { metaballGridPhaseFieldModeDefaults } from "$lib/territory/families/metaballGrid/config";
    import MetaballGridTuning from "./MetaballGridTuning.svelte";
    import TerritorySlaWidget from "./TerritorySlaWidget.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    function writeConfig(
        configKey: string,
        panelKey: string,
        value: number | boolean,
    ): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
    }

    function numVal(panelKey: string, configKey: string, def: number): number {
        const panelValue = panel[panelKey];
        if (typeof panelValue === "number" && !Number.isNaN(panelValue)) {
            return panelValue;
        }
        const configValue = (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
        if (typeof configValue === "number" && !Number.isNaN(configValue)) {
            return configValue;
        }
        return def;
    }

    function boolVal(panelKey: string, configKey: string, def: boolean): boolean {
        const panelValue = panel[panelKey];
        if (typeof panelValue === "boolean") return panelValue;
        const configValue = (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
        if (typeof configValue === "boolean") return configValue;
        return def;
    }

    function currentBorderMode(): "off" | "per_cell" | "territory_edge" {
        const raw =
            panel.metaballGridBorderMode ??
            GAME_CONFIG.METABALL_GRID_BORDER_MODE ??
            metaballGridPhaseFieldModeDefaults.METABALL_GRID_BORDER_MODE;
        if (raw === "per_cell") return "per_cell";
        if (raw === "territory_edge") return "territory_edge";
        return "off";
    }

    function currentBorderBlend(): boolean {
        const raw =
            panel.metaballGridBorderBlend ??
            GAME_CONFIG.METABALL_GRID_BORDER_BLEND ??
            metaballGridPhaseFieldModeDefaults.METABALL_GRID_BORDER_BLEND;
        return raw !== false;
    }

    function borderPathLabel(): string {
        if (currentBorderMode() === "off") return "Off";
        if (currentBorderMode() === "per_cell") return "Per cell";
        return currentBorderBlend()
            ? "Territory edge - singular blended centerline"
            : "Territory edge - split cell strokes";
    }

    function borderState(): { tone: "live" | "blocked"; summary: string; detail: string } {
        if (!boolVal("metaballBorderEnabled", "METABALL_BORDER_ENABLED", true)) {
            return {
                tone: "blocked",
                summary: "Borders blocked",
                detail: "Territory border is disabled.",
            };
        }
        if (numVal("metaballBorderWidth", "METABALL_BORDER_WIDTH", 3) <= 0) {
            return {
                tone: "blocked",
                summary: "Borders blocked",
                detail: "Territory border width is 0px.",
            };
        }
        if (numVal("metaballBorderAlpha", "METABALL_BORDER_ALPHA", 1) <= 0) {
            return {
                tone: "blocked",
                summary: "Borders blocked",
                detail: "Territory border alpha is 0.",
            };
        }
        if (currentBorderMode() === "off") {
            return {
                tone: "blocked",
                summary: "Borders blocked",
                detail: "Shape -> Border Mode is Off.",
            };
        }
        if (currentBorderMode() === "per_cell") {
            return {
                tone: "live",
                summary: "Borders live",
                detail: "Every visible cell outline is stroked.",
            };
        }
        if (currentBorderBlend()) {
            return {
                tone: "live",
                summary: "Borders live",
                detail: "One blended centerline border follows the constrained territory fill boundary.",
            };
        }
        return {
            tone: "live",
            summary: "Borders live",
            detail: "Border strokes follow grid cell edges.",
        };
    }

    let borderStateValue = $derived(borderState());
</script>

<div class="phase-field-shell">
    <div class="phase-field-head">
        <h4 class="sub-heading">Phase Field</h4>
        <span
            class="phase-field-status"
            class:phase-field-status--live={borderStateValue.tone === "live"}
        >
            {borderStateValue.summary}
        </span>
    </div>

    <div class="phase-field-card">
        <h5 class="sub-heading">Surface</h5>
        <TerritorySlaWidget
            title="Territory fill"
            {panel}
            onUpdate={writeConfig}
            configSat="METABALL_SATURATION"
            panelSat="metaballSaturation"
            defaultSat={1.05}
            configLight="METABALL_LIGHTNESS"
            panelLight="metaballLightness"
            defaultLight={0.65}
            configAlpha="METABALL_ALPHA"
            panelAlpha="metaballAlpha"
            defaultAlpha={0.5}
        />

        <TerritorySlaWidget
            title="Territory border"
            {panel}
            onUpdate={writeConfig}
            configEnabled="METABALL_BORDER_ENABLED"
            panelEnabled="metaballBorderEnabled"
            defaultEnabled={true}
            enabledLabel="Show border"
            configWidth="METABALL_BORDER_WIDTH"
            panelWidth="metaballBorderWidth"
            defaultWidth={3}
            widthMin={0.5}
            widthMax={12}
            widthStep={0.5}
            configSat="METABALL_BORDER_SATURATION"
            panelSat="metaballBorderSaturation"
            defaultSat={1}
            configLight="METABALL_BORDER_LIGHTNESS"
            panelLight="metaballBorderLightness"
            defaultLight={1}
            configAlpha="METABALL_BORDER_ALPHA"
            panelAlpha="metaballBorderAlpha"
            defaultAlpha={1}
        />

        <div class="axis-note phase-field-note">
            <strong>{borderPathLabel()}</strong>
            <span>{borderStateValue.detail}</span>
        </div>
    </div>

    <div class="phase-field-card">
        <h5 class="sub-heading">Shape, Propagation, Finish</h5>
        <MetaballGridTuning {panel} {updatePanel} />
    </div>
</div>

<style>
    .phase-field-shell {
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-3);
    }

    .sub-heading {
        display: flex;
        align-items: center;
        gap: var(--pax-space-2);
        margin: 0;
        color: color-mix(in srgb, var(--pax-ui-accent) 92%, transparent);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    .phase-field-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--pax-space-3);
    }

    .phase-field-status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        padding: 0 var(--pax-gap-sm);
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--pax-ui-warning) 35%, transparent);
        background: color-mix(in srgb, var(--pax-ui-warning) 12%, transparent);
        color: color-mix(in srgb, var(--pax-ui-accent-warm) 96%, transparent);
        font-size: var(--pax-type-3xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .phase-field-status--live {
        border-color: color-mix(in srgb, var(--pax-ui-success) 40%, transparent);
        background: color-mix(in srgb, var(--pax-ui-success) 12%, transparent);
        color: color-mix(in srgb, var(--pax-ui-success) 96%, transparent);
    }

    .phase-field-card {
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-2);
        padding: var(--pax-space-3);
        border-radius: 14px;
        border: 1px solid color-mix(in srgb, var(--pax-color-player-blue) 18%, transparent);
        background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--pax-color-void) 94%, transparent) 0%,
            color-mix(in srgb, var(--pax-color-void) 94%, transparent) 100%
        );
    }

    .phase-field-note {
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-1);
        margin-top: 2px;
        padding: var(--pax-gap-sm) var(--pax-space-3);
        border-left: 3px solid color-mix(in srgb, var(--pax-color-player-blue) 60%, transparent);
        border-radius: 10px;
        background: color-mix(in srgb, var(--pax-color-void) 60%, transparent);
        color: color-mix(in srgb, var(--pax-ui-text-strong) 90%, transparent);
        font-size: var(--pax-type-2xs);
        line-height: 1.35;
    }
</style>
