<script lang="ts">
    /**
     * Modular Saturation / Lightness / Alpha (hue = player palette).
     * Optional border-width row first → “width + SLA” for borders.
     * Styling matches ControlsSection + panel-shared (sub-heading, var-row).
     */
    import { GAME_CONFIG } from "$lib/config/game.config";

    interface Props {
        title: string;
        /** Short note under title (not between slider label and track). */
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
    <h4 class="sub-heading">{title}</h4>
    {#if configEnabled && panelEnabled}
        <label class="toggle-row territory-sla-widget__toggle">
            <input
                type="checkbox"
                checked={enabled}
                onchange={(event) => {
                    const value = (event.target as HTMLInputElement).checked;
                    onUpdate(configEnabled, panelEnabled, value);
                }}
            />
            <span class="var-name">{enabledLabel}</span>
            <span class="val">{enabled ? "On" : "Off"}</span>
        </label>
    {/if}
    {#if help}
        <div
            class="row-bottom"
            style="font-size:11px;opacity:0.72;margin-bottom:8px;line-height:1.35;"
        >
            {help}
        </div>
    {/if}

    {#if configWidth && panelWidth && defaultWidth !== undefined}
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Width (px)</span><span class="val"
                    >{val(panelWidth, configWidth, defaultWidth).toFixed(
                        widthStep < 1 ? 1 : 0,
                    )}</span
                >
            </div>
            <input
                type="range"
                min={widthMin}
                max={widthMax}
                step={widthStep}
                value={val(panelWidth, configWidth, defaultWidth)}
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    onUpdate(configWidth, panelWidth, v);
                }}
            />
        </div>
    {/if}

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
                >{val(panelSat, configSat, defaultSat).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={val(panelSat, configSat, defaultSat)}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                onUpdate(configSat, panelSat, v);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
                >{val(panelLight, configLight, defaultLight).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.2"
            max="2"
            step="0.05"
            value={val(panelLight, configLight, defaultLight)}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                onUpdate(configLight, panelLight, v);
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Alpha</span><span class="val"
                >{val(panelAlpha, configAlpha, defaultAlpha).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={val(panelAlpha, configAlpha, defaultAlpha)}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                onUpdate(configAlpha, panelAlpha, v);
            }}
        />
    </div>
</div>

<style>
    @import "./panel-shared.css";

    .territory-sla-widget {
        margin: 4px 0 10px;
    }

    .territory-sla-widget__toggle {
        margin: 0 0 6px;
    }

    .territory-sla-widget--disabled {
        opacity: 0.82;
    }
</style>
