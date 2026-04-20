<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import TerritorySlaWidget from "./TerritorySlaWidget.svelte";

    interface Props {
        panel: Record<string, unknown>;
        onUpdate: (
            configKey: string,
            panelKey: string,
            value: number | boolean,
        ) => void;
        sectionHeading?: string | null;
        intro?: string;
        fillHelp?: string;
        borderHelp?: string;
    }

    let {
        panel,
        onUpdate,
        sectionHeading = "Style",
        intro = "",
        fillHelp = "Hue stays player-owned; adjust saturation, lightness, alpha, or disable fill entirely.",
        borderHelp = "Shared border surface controls for width, saturation, lightness, alpha, or disable borders entirely.",
    }: Props = $props();

    function numVal(panelKey: string, configKey: string, def: number): number {
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
</script>

{#if sectionHeading}
    <div class="sub-heading">{sectionHeading}</div>
{/if}

{#if intro}
    <div class="var-desc">{intro}</div>
{/if}

<div class="territory-style-stack">
    <TerritorySlaWidget
        title="Territory fill"
        help={fillHelp}
        {panel}
        {onUpdate}
        configEnabled="METABALL_FILL_ENABLED"
        panelEnabled="metaballFillEnabled"
        defaultEnabled={true}
        enabledLabel="Show fill"
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
        help={borderHelp}
        {panel}
        {onUpdate}
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

    <div class="sub-heading territory-style-finish-heading">Finish</div>
    <div class="var-desc">
        Shared post and edge finish for the visible territory surface. These
        affect presentation, not ownership geometry.
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">GPU blur</span><span class="val"
                >{Math.round(numVal("metaballBlur", "METABALL_BLUR", 0))}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="16"
            step="1"
            value={numVal("metaballBlur", "METABALL_BLUR", 0)}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                onUpdate("METABALL_BLUR", "metaballBlur", value);
            }}
        />
    </div>

    <label
        class="toggle-row"
        title="When blur is above 0: off blurs fill only. On applies the blur pass to fill and border strokes together."
    >
        <input
            type="checkbox"
            checked={boolVal(
                "metaballBlurAffectsBorders",
                "METABALL_BLUR_AFFECTS_BORDERS",
                false,
            )}
            onchange={(event) => {
                const value = (event.target as HTMLInputElement).checked;
                onUpdate(
                    "METABALL_BLUR_AFFECTS_BORDERS",
                    "metaballBlurAffectsBorders",
                    value,
                );
            }}
        />
        <span class="var-name">Blur affects borders</span>
        <span class="val"
            >{boolVal(
                "metaballBlurAffectsBorders",
                "METABALL_BLUR_AFFECTS_BORDERS",
                false,
            )
                ? "On"
                : "Off"}</span
        >
    </label>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Chaikin passes</span><span class="val"
                >{Math.round(
                    numVal("metaballChaikinPasses", "METABALL_CHAIKIN_PASSES", 0),
                )}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={numVal("metaballChaikinPasses", "METABALL_CHAIKIN_PASSES", 0)}
            oninput={(event) => {
                const value = +(event.target as HTMLInputElement).value;
                onUpdate(
                    "METABALL_CHAIKIN_PASSES",
                    "metaballChaikinPasses",
                    value,
                );
            }}
        />
    </div>
</div>

<style>
    @import "./panel-shared.css";

    .territory-style-stack {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .territory-style-finish-heading {
        margin-top: 10px;
    }

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
