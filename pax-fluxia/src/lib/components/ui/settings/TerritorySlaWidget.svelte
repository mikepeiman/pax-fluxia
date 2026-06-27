<script lang="ts">
  import "./panel-shared.css";
    /**
     * Modular Saturation / Lightness / Alpha (hue = player palette).
     * Optional border-width row first means "width + SLA" for borders.
     */
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        PaxInfoHint,
        PaxSettingsRangeRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";

    interface Props {
        title: string;
        help?: string;
        panel: Record<string, unknown>;
        onUpdate: (
            configKey: string,
            panelKey: string,
            value: number | boolean,
        ) => void;

        configEnabled?: string;
        panelEnabled?: string;
        defaultEnabled?: boolean;
        enabledLabel?: string;

        configSat: string;
        panelSat: string;
        defaultSat: number;
        configLight: string;
        panelLight: string;
        defaultLight: number;
        configAlpha: string;
        panelAlpha: string;
        defaultAlpha: number;

        configWidth?: string;
        panelWidth?: string;
        defaultWidth?: number;
        widthMin?: number;
        widthMax?: number;
        widthStep?: number;
    }

    let {
        title,
        help = "",
        panel,
        onUpdate,
        configEnabled,
        panelEnabled,
        defaultEnabled = true,
        enabledLabel = "Enabled",
        configSat,
        panelSat,
        defaultSat,
        configLight,
        panelLight,
        defaultLight,
        configAlpha,
        panelAlpha,
        defaultAlpha,
        configWidth,
        panelWidth,
        defaultWidth,
        widthMin = 0.5,
        widthMax = 12,
        widthStep = 0.5,
    }: Props = $props();

    function val(panelKey: string, configKey: string, def: number): number {
        const pv = panel[panelKey];
        if (typeof pv === "number" && !Number.isNaN(pv)) return pv;
        const cv = (GAME_CONFIG as unknown as Record<string, unknown>)[
            configKey
        ];
        if (typeof cv === "number" && !Number.isNaN(cv)) return cv;
        return def;
    }

    function boolVal(panelKey: string, configKey: string, def: boolean): boolean {
        const pv = panel[panelKey];
        if (typeof pv === "boolean") return pv;
        const cv = (GAME_CONFIG as unknown as Record<string, unknown>)[
            configKey
        ];
        if (typeof cv === "boolean") return cv;
        return def;
    }

    let enabled = $derived(
        configEnabled && panelEnabled
            ? boolVal(panelEnabled, configEnabled, defaultEnabled)
            : true,
    );
</script>

<div class="territory-sla-widget" class:territory-sla-widget--disabled={!enabled}>
    <h4 class="sub-heading">
        {title}
        {#if help}<PaxInfoHint text={help} />{/if}
    </h4>
    {#if configEnabled && panelEnabled}
        <PaxSettingsToggleRow
            label={enabledLabel}
            checked={enabled}
            meta={enabled ? "On" : "Off"}
            settingConfigKey={configEnabled}
            onChange={(value) => onUpdate(configEnabled, panelEnabled, value)}
        />
    {/if}

    {#if configWidth && panelWidth && defaultWidth !== undefined}
        <PaxSettingsRangeRow
            label="Width (px)"
            value={val(panelWidth, configWidth, defaultWidth)}
            min={widthMin}
            max={widthMax}
            step={widthStep}
            output={val(panelWidth, configWidth, defaultWidth).toFixed(
                widthStep < 1 ? 1 : 0,
            )}
            disabled={!enabled}
            settingConfigKey={configWidth}
            onInput={(value) => onUpdate(configWidth, panelWidth, value)}
        />
    {/if}

    <PaxSettingsRangeRow
        label="Saturation"
        value={val(panelSat, configSat, defaultSat)}
        min={0}
        max={2}
        step={0.05}
        format="fixed2"
        disabled={!enabled}
        settingConfigKey={configSat}
        onInput={(value) => onUpdate(configSat, panelSat, value)}
    />

    <PaxSettingsRangeRow
        label="Lightness"
        value={val(panelLight, configLight, defaultLight)}
        min={0.2}
        max={2}
        step={0.05}
        format="fixed2"
        disabled={!enabled}
        settingConfigKey={configLight}
        onInput={(value) => onUpdate(configLight, panelLight, value)}
    />

    <PaxSettingsRangeRow
        label="Alpha"
        value={val(panelAlpha, configAlpha, defaultAlpha)}
        min={0}
        max={1}
        step={0.01}
        format="fixed2"
        disabled={!enabled}
        settingConfigKey={configAlpha}
        onInput={(value) => onUpdate(configAlpha, panelAlpha, value)}
    />
</div>

<style>

    .territory-sla-widget {
        display: grid;
        gap: var(--pax-space-2);
        margin: var(--pax-space-1) 0 var(--pax-gap-sm);
    }

    .territory-sla-widget--disabled {
        opacity: 0.82;
    }

</style>
