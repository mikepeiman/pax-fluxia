<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        PaxHudSelect,
        PaxSettingsRangeRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";

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

    const FRONTIER_FX_MODE_OPTIONS: Array<{
        value: FrontierFxMode;
        label: string;
    }> = [
        { value: "off", label: "Off" },
        { value: "soft_fade", label: "Soft fade" },
        { value: "stepped_moat", label: "Stepped moat" },
        { value: "plasma_rim", label: "Plasma rim" },
        { value: "ion_drift", label: "Ion drift" },
        { value: "geometry_strip", label: "Geometry strip" },
    ];

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
        return (
            mode === "phase_edges" ||
            mode === "ember_lattice"
        );
    }

    function currentMode(): FrontierFxMode {
        const raw = stringVal(
            "territoryFrontierFxMode",
            "TERRITORY_FRONTIER_FX_MODE",
            "off",
        );
        if (
            raw === "soft_fade" ||
            raw === "stepped_moat" ||
            raw === "plasma_rim" ||
            raw === "ion_drift" ||
            raw === "geometry_strip"
        ) {
            return raw;
        }
        return "off";
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
        return (
            mode === "plasma_rim" ||
            mode === "ion_drift" ||
            mode === "geometry_strip"
        );
    }

    function usesEmissiveControls(): boolean {
        const mode = currentMode();
        return (
            mode === "plasma_rim" ||
            mode === "ion_drift" ||
            mode === "geometry_strip"
        );
    }

    function usesParticleDensityControls(): boolean {
        return currentMode() === "ion_drift";
    }
</script>

{#if !supportsFrontierFx()}
    <div class="axis-note">
        Frontier FX currently applies to <strong>Phase Edges</strong> and
        <strong>Ember Lattice</strong>. Switch the territory render mode there
        first, then return here.
    </div>
{:else}
    <div class="frontier-fx-card">
        <div class="frontier-fx-card__header">
            <h4 class="axis-card-title">Frontier FX</h4>
        </div>

        <PaxHudSelect
            label="Mode"
            hint={modeDescription()}
            value={currentMode()}
            options={FRONTIER_FX_MODE_OPTIONS}
            onValueChange={(value) => {
                updateConfig(
                    "TERRITORY_FRONTIER_FX_MODE",
                    "territoryFrontierFxMode",
                    value as FrontierFxMode,
                );
            }}
        />

        <PaxSettingsRangeRow
            label="Width"
            note="How far inward from the frontier the effect reaches."
            value={numVal(
                "territoryFrontierFxWidthPx",
                "TERRITORY_FRONTIER_FX_WIDTH_PX",
                24,
            )}
            min={0}
            max={96}
            step={1}
            suffix="px"
            disabled={!isModeEnabled()}
            settingConfigKey="TERRITORY_FRONTIER_FX_WIDTH_PX"
            onInput={(value) =>
                updateConfig(
                    "TERRITORY_FRONTIER_FX_WIDTH_PX",
                    "territoryFrontierFxWidthPx",
                    value,
                )}
        />

        <PaxSettingsRangeRow
            label="Strength"
            note="Global intensity of the selected inward frontier effect."
            value={numVal(
                "territoryFrontierFxStrength",
                "TERRITORY_FRONTIER_FX_STRENGTH",
                0.75,
            )}
            min={0}
            max={1}
            step={0.05}
            format="fixed2"
            disabled={!isModeEnabled()}
            settingConfigKey="TERRITORY_FRONTIER_FX_STRENGTH"
            onInput={(value) =>
                updateConfig(
                    "TERRITORY_FRONTIER_FX_STRENGTH",
                    "territoryFrontierFxStrength",
                    value,
                )}
        />

        <PaxSettingsRangeRow
            label="Softness"
            note="Falloff power for smooth frontier effects. Stepped modes use explicit banding."
            value={numVal(
                "territoryFrontierFxSoftness",
                "TERRITORY_FRONTIER_FX_SOFTNESS",
                1.2,
            )}
            min={0.35}
            max={2.5}
            step={0.05}
            format="fixed2"
            disabled={!isModeEnabled() || usesSteppedControls()}
            settingConfigKey="TERRITORY_FRONTIER_FX_SOFTNESS"
            onInput={(value) =>
                updateConfig(
                    "TERRITORY_FRONTIER_FX_SOFTNESS",
                    "territoryFrontierFxSoftness",
                    value,
                )}
        />

        <PaxSettingsRangeRow
            label="Steps"
            note="Quantized bands for stepped moat and the moving geometry strip seam."
            value={numVal(
                "territoryFrontierFxSteps",
                "TERRITORY_FRONTIER_FX_STEPS",
                4,
            )}
            min={2}
            max={10}
            step={1}
            output={`${Math.round(numVal("territoryFrontierFxSteps", "TERRITORY_FRONTIER_FX_STEPS", 4))}`}
            disabled={!isModeEnabled() || !usesSteppedControls()}
            settingConfigKey="TERRITORY_FRONTIER_FX_STEPS"
            onInput={(value) =>
                updateConfig(
                    "TERRITORY_FRONTIER_FX_STEPS",
                    "territoryFrontierFxSteps",
                    value,
                )}
        />

        <PaxSettingsRangeRow
            label="Glow / Emissive"
            note="Extra hot-blend weighting for plasma, ion, and geometry-strip modes."
            value={numVal(
                "territoryFrontierFxEmissive",
                "TERRITORY_FRONTIER_FX_EMISSIVE",
                1,
            )}
            min={0}
            max={2}
            step={0.05}
            format="fixed2"
            disabled={!isModeEnabled() || !usesEmissiveControls()}
            settingConfigKey="TERRITORY_FRONTIER_FX_EMISSIVE"
            onInput={(value) =>
                updateConfig(
                    "TERRITORY_FRONTIER_FX_EMISSIVE",
                    "territoryFrontierFxEmissive",
                    value,
                )}
        />

        <PaxSettingsRangeRow
            label="Particle Density"
            note="How densely ion-drift spark cells light up along the frontier."
            value={numVal(
                "territoryFrontierFxParticleDensity",
                "TERRITORY_FRONTIER_FX_PARTICLE_DENSITY",
                0.45,
            )}
            min={0}
            max={1}
            step={0.05}
            format="fixed2"
            disabled={!isModeEnabled() || !usesParticleDensityControls()}
            settingConfigKey="TERRITORY_FRONTIER_FX_PARTICLE_DENSITY"
            onInput={(value) =>
                updateConfig(
                    "TERRITORY_FRONTIER_FX_PARTICLE_DENSITY",
                    "territoryFrontierFxParticleDensity",
                    value,
                )}
        />

        <PaxSettingsRangeRow
            label="Pulse Speed"
            note="Animation speed for plasma, ion-drift, and geometry-strip frontier motion."
            value={numVal(
                "territoryFrontierFxPulseSpeed",
                "TERRITORY_FRONTIER_FX_PULSE_SPEED",
                1,
            )}
            min={0.1}
            max={4}
            step={0.1}
            format="fixed2"
            disabled={!isModeEnabled() || !usesPulseControls()}
            settingConfigKey="TERRITORY_FRONTIER_FX_PULSE_SPEED"
            onInput={(value) =>
                updateConfig(
                    "TERRITORY_FRONTIER_FX_PULSE_SPEED",
                    "territoryFrontierFxPulseSpeed",
                    value,
                )}
        />

        <PaxSettingsToggleRow
            label="Apply in steady state"
            checked={boolVal(
                "territoryFrontierFxApplySteadyState",
                "TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE",
                true,
            )}
            description="Apply the frontier effect outside active ownership transitions."
            meta={boolVal(
                "territoryFrontierFxApplySteadyState",
                "TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE",
                true,
            )
                ? "On"
                : "Off"}
            disabled={!isModeEnabled()}
            settingConfigKey="TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE"
            onChange={(value) =>
                updateConfig(
                    "TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE",
                    "territoryFrontierFxApplySteadyState",
                    value,
                )}
        />

        <PaxSettingsToggleRow
            label="Apply during transition"
            checked={boolVal(
                "territoryFrontierFxApplyTransition",
                "TERRITORY_FRONTIER_FX_APPLY_TRANSITION",
                true,
            )}
            description="Apply the frontier effect during active territory transitions."
            meta={boolVal(
                "territoryFrontierFxApplyTransition",
                "TERRITORY_FRONTIER_FX_APPLY_TRANSITION",
                true,
            )
                ? "On"
                : "Off"}
            disabled={!isModeEnabled()}
            settingConfigKey="TERRITORY_FRONTIER_FX_APPLY_TRANSITION"
            onChange={(value) =>
                updateConfig(
                    "TERRITORY_FRONTIER_FX_APPLY_TRANSITION",
                    "territoryFrontierFxApplyTransition",
                    value,
                )}
        />
    </div>
{/if}

<style>

    .frontier-fx-card {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
        padding: var(--pax-space-3);
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-sm);
        clip-path: var(--pax-ui-rounded-corner-sm);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 74%, transparent), color-mix(in srgb, var(--pax-color-void) 90%, transparent)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
    }

    .frontier-fx-card__header {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-xs);
    }

    .axis-note {
        margin: 0;
        color: var(--pax-ui-text-dim);
        font-family: var(--pax-ui-font-copy);
        font-size: calc(0.7rem * var(--pax-ui-type-scale, 1));
        line-height: 1.42;
    }

    .axis-note {
        padding: var(--pax-space-3);
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-sm);
        clip-path: var(--pax-ui-rounded-corner-sm);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 76%, transparent), color-mix(in srgb, var(--pax-color-void) 90%, transparent)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
    }

    .axis-card-title {
        margin: 0;
        padding-bottom: var(--pax-gap-xs);
        border-bottom: 1px solid color-mix(in srgb, var(--pax-ui-accent-warm) 22%, transparent);
        color: var(--pax-ui-text);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.8rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
</style>
