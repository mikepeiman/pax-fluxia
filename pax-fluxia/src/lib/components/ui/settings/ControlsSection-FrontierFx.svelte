<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    interface Props {
        panel: Record<string, unknown>;
        updatePanel: (key: string, value: unknown) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel }: Props = $props();

    type FrontierFxMode =
        | "off"
        | "soft_fade"
        | "stepped_moat"
        | "plasma_rim"
        | "ion_drift"
        | "geometry_strip";

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
            "territory_runtime",
        );
    }

    function supportsFrontierFx(): boolean {
        const mode = currentRenderMode();
        return mode === "metaball_grid_phase_edges" || mode === "metaball_grid_ember_lattice";
    }

    function currentMode(): FrontierFxMode {
        const raw = stringVal(
            "territoryFrontierFxMode",
            "TERRITORY_FRONTIER_FX_MODE",
            "off",
        );
        if (
            raw === "soft_fade"
            || raw === "stepped_moat"
            || raw === "plasma_rim"
            || raw === "ion_drift"
            || raw === "geometry_strip"
        ) {
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
            case "ion_drift":
                return "Ion drift";
            case "geometry_strip":
                return "Geometry strip";
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
            case "ion_drift":
                return "Frontier-local sparks and ion drift. Uses the same presented frontier distance field, but gates bright moving cells with particle density instead of a continuous ribbon.";
            case "geometry_strip":
                return "Animated procedural seam strip. Sweeps a geometric energy band across quantized frontier bands without changing the underlying border path.";
            default:
                return "Off. The fill remains stable and flush; no extra inward frontier VFX modulation is applied.";
        }
    }

    function isModeEnabled(): boolean {
        return currentMode() !== "off";
    }

    function usesSteppedControls(): boolean {
        const mode = currentMode();
        return mode === "stepped_moat" || mode === "geometry_strip";
    }

    function usesPulseControls(): boolean {
        const mode = currentMode();
        return mode === "plasma_rim" || mode === "ion_drift" || mode === "geometry_strip";
    }

    function usesEmissiveControls(): boolean {
        const mode = currentMode();
        return mode === "plasma_rim" || mode === "ion_drift" || mode === "geometry_strip";
    }

    function usesParticleDensityControls(): boolean {
        return currentMode() === "ion_drift";
    }
</script>

{#if !supportsFrontierFx()}
        <div class="axis-note">
            Frontier FX currently applies to <strong>Phase Edges</strong> and
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
                <option value="ion_drift">Ion drift</option>
                <option value="geometry_strip">Geometry strip</option>
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

        <div class="var-row" class:disabled={!isModeEnabled() || usesSteppedControls()}>
            <div class="row-top">
                <span class="var-name">Softness</span>
                <span class="val">{numVal("territoryFrontierFxSoftness", "TERRITORY_FRONTIER_FX_SOFTNESS", 1.2).toFixed(2)}</span>
            </div>
            <div class="var-desc">Falloff power for smooth frontier effects. Stepped moat and geometry strip use explicit banding instead.</div>
            <input
                type="range"
                min="0.35"
                max="2.5"
                step="0.05"
                disabled={!isModeEnabled() || usesSteppedControls()}
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

        <div class="var-row" class:disabled={!isModeEnabled() || !usesSteppedControls()}>
            <div class="row-top">
                <span class="var-name">Steps</span>
                <span class="val">{Math.round(numVal("territoryFrontierFxSteps", "TERRITORY_FRONTIER_FX_STEPS", 4))}</span>
            </div>
            <div class="var-desc">Quantized bands for stepped moat and the moving geometry strip seam.</div>
            <input
                type="range"
                min="2"
                max="10"
                step="1"
                disabled={!isModeEnabled() || !usesSteppedControls()}
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

        <div class="var-row" class:disabled={!isModeEnabled() || !usesEmissiveControls()}>
            <div class="row-top">
                <span class="var-name">Glow / Emissive</span>
                <span class="val">{numVal("territoryFrontierFxEmissive", "TERRITORY_FRONTIER_FX_EMISSIVE", 1).toFixed(2)}</span>
            </div>
            <div class="var-desc">Extra hot-blend weighting for plasma, ion, and geometry-strip modes.</div>
            <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                disabled={!isModeEnabled() || !usesEmissiveControls()}
                value={numVal("territoryFrontierFxEmissive", "TERRITORY_FRONTIER_FX_EMISSIVE", 1)}
                oninput={(event) => {
                    const value = parseFloat((event.target as HTMLInputElement).value);
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_EMISSIVE",
                        "territoryFrontierFxEmissive",
                        value,
                    );
                }}
            />
        </div>

        <div class="var-row" class:disabled={!isModeEnabled() || !usesParticleDensityControls()}>
            <div class="row-top">
                <span class="var-name">Particle Density</span>
                <span class="val">{numVal("territoryFrontierFxParticleDensity", "TERRITORY_FRONTIER_FX_PARTICLE_DENSITY", 0.45).toFixed(2)}</span>
            </div>
            <div class="var-desc">How densely ion-drift spark cells light up along the frontier.</div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={!isModeEnabled() || !usesParticleDensityControls()}
                value={numVal("territoryFrontierFxParticleDensity", "TERRITORY_FRONTIER_FX_PARTICLE_DENSITY", 0.45)}
                oninput={(event) => {
                    const value = parseFloat((event.target as HTMLInputElement).value);
                    updateConfig(
                        "TERRITORY_FRONTIER_FX_PARTICLE_DENSITY",
                        "territoryFrontierFxParticleDensity",
                        value,
                    );
                }}
            />
        </div>

        <div class="var-row" class:disabled={!isModeEnabled() || !usesPulseControls()}>
            <div class="row-top">
                <span class="var-name">Pulse Speed</span>
                <span class="val">{numVal("territoryFrontierFxPulseSpeed", "TERRITORY_FRONTIER_FX_PULSE_SPEED", 1).toFixed(2)}</span>
            </div>
            <div class="var-desc">Animation speed for the plasma, ion-drift, and geometry-strip frontier motion.</div>
            <input
                type="range"
                min="0.1"
                max="4"
                step="0.1"
                disabled={!isModeEnabled() || !usesPulseControls()}
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
