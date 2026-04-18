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
        onUpdate: (configKey: string, panelKey: string, value: number) => void;

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
</script>

<div class="territory-sla-widget">
    <h4 class="sub-heading">{title}</h4>
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
                <span class="var-name" data-setting-config-key={configWidth}
                    >Width (px)</span
                ><span class="val"
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
            <span class="var-name" data-setting-config-key={configSat}
                >Saturation</span
            ><span class="val"
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
            <span class="var-name" data-setting-config-key={configLight}
                >Lightness</span
            ><span class="val"
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
            <span class="var-name" data-setting-config-key={configAlpha}
                >Alpha</span
            ><span class="val"
                >{val(panelAlpha, configAlpha, defaultAlpha).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0.05"
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
</style>
