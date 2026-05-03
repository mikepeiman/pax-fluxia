<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    interface Props {
        panel: Record<string, unknown>;
        updatePanel: (key: string, value: unknown) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel }: Props = $props();

    type FrontierFxMode = "off" | "soft_fade" | "stepped_moat" | "plasma_rim";

    function stringVal(panelKey: string, configKey: string, def: string): string {
        const pv = panel[panelKey];
        if (typeof pv === "string") return pv;
        const cv = (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
        if (typeof cv === "string") return cv;
        return def;
    }

    function numVal(panelKey: string, configKey: string, def: number): number {
        const pv = panel[panelKey];
        if (typeof pv === "number" && !Number.isNaN(pv)) return pv;
        const cv = (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
        if (typeof cv === "number" && !Number.isNaN(cv)) return cv;
        return def;
    }

    function boolVal(panelKey: string, configKey: string, def: boolean): boolean {
        const pv = panel[panelKey];
        if (typeof pv === "boolean") return pv;
        const cv = (GAME_CONFIG as unknown as Record<string, unknown>)[configKey];
        if (typeof cv === "boolean") return cv;
        return def;
    }

    function updateConfig(
        configKey: string,
        panelKey: string,
        value: string | number | boolean,
    ): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
    }

    function currentRenderMode(): string {
        return stringVal(
            "territoryRenderMode",
            "TERRITORY_RENDER_MODE",
            "territory_canonical",
        );
    }

    function supportsFrontierFx(): boolean {
        const mode = currentRenderMode();
        return mode === "metaball_grid_ember_lattice" || mode === "metaball_grid";
    }

    function currentMode(): FrontierFxMode {
        const raw = stringVal(
            "territoryFrontierFxMode",
            "TERRITORY_FRONTIER_FX_MODE",
            "off",
        );
        if (raw === "soft_fade" || raw === "stepped_moat" || raw === "plasma_rim") {
            return raw;
        }
        return "off";
    }

    function modeLabel(mode: FrontierFxMode): string {
        switch (mode) {
            case "soft_fade":
                return "Soft fade";
            case "stepped_moat":
                return "Stepped moat";
            case "plasma_rim":
                return "Plasma rim";
            default:
                return "Off";
        }
    }

    function modeDescription(): string {
        switch (currentMode()) {
            case "soft_fade":
                return "Smooth inward fade from the frontier. Lightens and softens the first interior band without changing border geometry.";
            case "stepped_moat":
                return "Quantized inward square bands. Creates a deliberate pixellated moat instead of a smooth gradient.";
            case "plasma_rim":
                return "Animated hot rim hugging the frontier. Pulses a warm emissive band inward from the border on the shared distance field.";
            default:
                return "Off. The fill remains stable and flush; no extra inward frontier VFX modulation is applied.";
        }
    }

    function isModeEnabled(): boolean {
        return currentMode() !== "off";
    }
</script>

{#if !supportsFrontierFx()}
        <div class="axis-note">
            Frontier FX currently applies to <strong>Metaball Grid</strong> and
            <strong>Ember Lattice</strong>. Switch the territory render
            mode there first, then return here.
        </div>
{:else}
    <div class="frontier-fx-card">
        <div class="territory-card__header">
            <h4 class="axis-card-title">Frontier FX</h4>
            <p class="territory-card__intro">
                Border-inward surface VFX driven by the same frontier-distance field
                as the stable fill/border contract. These are fill-side presentation
                effects only; they do not own topology or border geometry.
            </p>
        </div>

        <div class="var-row">
            <div class="row-top">
                <span class="var-name">Mode</span>
                <span class="val">{modeLabel(currentMode())}</span>
            </div>
            <select
                class="mode-select"
                value={currentMode()}
                onchange={(event) => {
                    const value = (event.target as HTMLSelectElement).value as FrontierFxMode;
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_MODE",
                        "territoryFrontierFxMode",
                        value,
                    );
                }}
            >
                <option value="off">Off</option>
                <option value="soft_fade">Soft fade</option>
                <option value="stepped_moat">Stepped moat</option>
                <option value="plasma_rim">Plasma rim</option>
            </select>
        </div>

        <div class="var-desc">{modeDescription()}</div>

        <div class="var-row" class:disabled={!isModeEnabled()}>
            <div class="row-top">
                <span class="var-name">Width</span>
                <span class="val">{numVal("territoryFrontierFxWidthPx", "TERRITORY_FRONTIER_FX_WIDTH_PX", 24).toFixed(0)}px</span>
            </div>
            <div class="var-desc">How far inward from the frontier the effect reaches.</div>
            <input
                type="range"
                min="0"
                max="96"
                step="1"
                disabled={!isModeEnabled()}
                value={numVal("territoryFrontierFxWidthPx", "TERRITORY_FRONTIER_FX_WIDTH_PX", 24)}
                oninput={(event) => {
                    const value = parseFloat((event.target as HTMLInputElement).value);
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_WIDTH_PX",
                        "territoryFrontierFxWidthPx",
                        value,
                    );
                }}
            />
        </div>

        <div class="var-row" class:disabled={!isModeEnabled()}>
            <div class="row-top">
                <span class="var-name">Strength</span>
                <span class="val">{numVal("territoryFrontierFxStrength", "TERRITORY_FRONTIER_FX_STRENGTH", 0.75).toFixed(2)}</span>
            </div>
            <div class="var-desc">Global intensity of the selected inward frontier effect.</div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={!isModeEnabled()}
                value={numVal("territoryFrontierFxStrength", "TERRITORY_FRONTIER_FX_STRENGTH", 0.75)}
                oninput={(event) => {
                    const value = parseFloat((event.target as HTMLInputElement).value);
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_STRENGTH",
                        "territoryFrontierFxStrength",
                        value,
                    );
                }}
            />
        </div>

        <div class="var-row" class:disabled={!isModeEnabled() || currentMode() === "stepped_moat"}>
            <div class="row-top">
                <span class="var-name">Softness</span>
                <span class="val">{numVal("territoryFrontierFxSoftness", "TERRITORY_FRONTIER_FX_SOFTNESS", 1.2).toFixed(2)}</span>
            </div>
            <div class="var-desc">Falloff power for the smooth fade and plasma rim modes.</div>
            <input
                type="range"
                min="0.35"
                max="2.5"
                step="0.05"
                disabled={!isModeEnabled() || currentMode() === "stepped_moat"}
                value={numVal("territoryFrontierFxSoftness", "TERRITORY_FRONTIER_FX_SOFTNESS", 1.2)}
                oninput={(event) => {
                    const value = parseFloat((event.target as HTMLInputElement).value);
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_SOFTNESS",
                        "territoryFrontierFxSoftness",
                        value,
                    );
                }}
            />
        </div>

        <div class="var-row" class:disabled={!isModeEnabled() || currentMode() !== "stepped_moat"}>
            <div class="row-top">
                <span class="var-name">Steps</span>
                <span class="val">{Math.round(numVal("territoryFrontierFxSteps", "TERRITORY_FRONTIER_FX_STEPS", 4))}</span>
            </div>
            <div class="var-desc">Quantized inward bands for the pixellated moat mode.</div>
            <input
                type="range"
                min="2"
                max="8"
                step="1"
                disabled={!isModeEnabled() || currentMode() !== "stepped_moat"}
                value={numVal("territoryFrontierFxSteps", "TERRITORY_FRONTIER_FX_STEPS", 4)}
                oninput={(event) => {
                    const value = parseInt((event.target as HTMLInputElement).value, 10);
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_STEPS",
                        "territoryFrontierFxSteps",
                        value,
                    );
                }}
            />
        </div>

        <div class="var-row" class:disabled={!isModeEnabled() || currentMode() !== "plasma_rim"}>
            <div class="row-top">
                <span class="var-name">Pulse Speed</span>
                <span class="val">{numVal("territoryFrontierFxPulseSpeed", "TERRITORY_FRONTIER_FX_PULSE_SPEED", 1).toFixed(2)}</span>
            </div>
            <div class="var-desc">Animation speed for the plasma rim pulse.</div>
            <input
                type="range"
                min="0.1"
                max="4"
                step="0.1"
                disabled={!isModeEnabled() || currentMode() !== "plasma_rim"}
                value={numVal("territoryFrontierFxPulseSpeed", "TERRITORY_FRONTIER_FX_PULSE_SPEED", 1)}
                oninput={(event) => {
                    const value = parseFloat((event.target as HTMLInputElement).value);
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_PULSE_SPEED",
                        "territoryFrontierFxPulseSpeed",
                        value,
                    );
                }}
            />
        </div>

        <label class="toggle-row" class:disabled={!isModeEnabled()}>
            <input
                type="checkbox"
                disabled={!isModeEnabled()}
                checked={boolVal("territoryFrontierFxApplySteadyState", "TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE", true)}
                onchange={(event) => {
                    const value = (event.target as HTMLInputElement).checked;
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE",
                        "territoryFrontierFxApplySteadyState",
                        value,
                    );
                }}
            />
            <span class="var-name">Apply in steady state</span>
            <span class="val">{boolVal("territoryFrontierFxApplySteadyState", "TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE", true) ? "On" : "Off"}</span>
        </label>

        <label class="toggle-row" class:disabled={!isModeEnabled()}>
            <input
                type="checkbox"
                disabled={!isModeEnabled()}
                checked={boolVal("territoryFrontierFxApplyTransition", "TERRITORY_FRONTIER_FX_APPLY_TRANSITION", true)}
                onchange={(event) => {
                    const value = (event.target as HTMLInputElement).checked;
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_APPLY_TRANSITION",
                        "territoryFrontierFxApplyTransition",
                        value,
                    );
                }}
            />
            <span class="var-name">Apply during transition</span>
            <span class="val">{boolVal("territoryFrontierFxApplyTransition", "TERRITORY_FRONTIER_FX_APPLY_TRANSITION", true) ? "On" : "Off"}</span>
        </label>
    </div>
{/if}

<style>
    @import "./panel-shared.css";

    .frontier-fx-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
            rgba(16, 22, 34, 0.7);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .territory-card__header {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .territory-card__intro,
    .axis-note {
        margin: 0;
        font-size: 11px;
        line-height: 1.45;
        color: rgba(188, 207, 224, 0.72);
    }

    .axis-card-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: rgba(236, 242, 249, 0.92);
        margin: 0;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .var-desc {
        margin: 4px 0 8px;
        color: rgba(220, 232, 245, 0.72);
        font-size: 10px;
        line-height: 1.35;
    }

    .var-row.disabled,
    .toggle-row.disabled {
        opacity: 0.55;
    }
</style>
