<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
    import {
        PaxHudButton,
        PaxHudSelect,
        PaxSettingsRangeRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    type PerimeterFieldModuleId =
        | "all"
        | "none"
        | "field"
        | "transition";

    const PERIMETER_FIELD_MODULES = [
        { id: "field", label: "Field" },
        { id: "transition", label: "Transition" },
    ] as const;

    const PERIMETER_FIELD_MODULE_PANEL_KEY = "perimeterFieldModuleVisibility";

    const TRANSITION_ENGINE_OPTIONS = [
        { value: "plan", label: "Topology Plan" },
        { value: "legacy", label: "Synthetic Reference" },
    ];

    let activeModule = $derived(
        (panel[PERIMETER_FIELD_MODULE_PANEL_KEY] ?? "all") as PerimeterFieldModuleId,
    );

    function showModule(
        id: Exclude<PerimeterFieldModuleId, "all" | "none">,
    ): boolean {
        return activeModule === "all" || activeModule === id;
    }

    function setActiveModule(value: PerimeterFieldModuleId): void {
        updatePanel(PERIMETER_FIELD_MODULE_PANEL_KEY, value);
    }

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
    }

    function currentTransitionEngine(): "legacy" | "plan" {
        const value =
            panel.perimeterFieldTransitionEngine ??
            GAME_CONFIG.PERIMETER_FIELD_TRANSITION_ENGINE ??
            "plan";
        return value === "legacy" ? "legacy" : "plan";
    }

    function transitionEngineLabel(): string {
        return currentTransitionEngine() === "legacy"
            ? "Synthetic Reference"
            : "Topology Plan";
    }

    function freezeBaseDuringTransition(): boolean {
        return panel.perimeterFieldFreezeBaseDuringTransition ??
            GAME_CONFIG.PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION ??
            true;
    }
</script>

<div class="module-head">
    <div class="module-scope-toggle" role="group" aria-label="Perimeter field subsection visibility">
        <PaxHudButton
            class="perimeter-field-mini"
            label="All"
            size="sm"
            active={activeModule === "all"}
            onclick={() => setActiveModule("all")}
        />
        <PaxHudButton
            class="perimeter-field-mini"
            label="None"
            size="sm"
            active={activeModule === "none"}
            onclick={() => setActiveModule("none")}
        />
    </div>
</div>

<div class="module-nav">
    {#each PERIMETER_FIELD_MODULES as module}
        <PaxHudButton
            class="perimeter-field-chip"
            label={module.label}
            size="sm"
            active={activeModule === module.id}
            onclick={() => setActiveModule(activeModule === module.id ? "all" : module.id)}
        />
    {/each}
</div>

{#if showModule("field")}
    <div class="module-block">
        <PaxSettingsRangeRow
            label="Perimeter Vstar Spacing"
            note="Distance between derived boundary control points. Lower is more faithful and heavier; higher is simpler and looser."
            value={panel.perimeterFieldSampleSpacing ?? GAME_CONFIG.PERIMETER_FIELD_SAMPLE_SPACING ?? 28}
            min={8}
            max={120}
            step={1}
            suffix="px"
            settingConfigKey="PERIMETER_FIELD_SAMPLE_SPACING"
            settingDescription="Arc-length spacing between derived perimeter vstars. Lower values hug the source boundary more tightly but create more samples."
            onInput={(value) => {
                writeConfig("PERIMETER_FIELD_SAMPLE_SPACING", "perimeterFieldSampleSpacing", value);
            }}
        />

        <PaxSettingsRangeRow
            label="Perimeter Vstar Radius"
            note="How far each perimeter vstar reaches into the field. This strongly affects whether interiors stay filled or cave inward."
            value={panel.perimeterFieldInfluenceRadius ?? GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_RADIUS ?? 52}
            min={8}
            max={180}
            step={1}
            suffix="px"
            settingConfigKey="PERIMETER_FIELD_INFLUENCE_RADIUS"
            settingDescription="Influence radius for each derived perimeter vstar in the displayed field. Higher values make the boundary shell thicker and more blobby."
            onInput={(value) => {
                writeConfig("PERIMETER_FIELD_INFLUENCE_RADIUS", "perimeterFieldInfluenceRadius", value);
            }}
        />

        <PaxSettingsRangeRow
            label="Perimeter Vstar Power"
            note="Overall boundary-control strength. If static regions are underfilling, this is one of the first controls to try."
            value={panel.perimeterFieldInfluenceWeight ?? GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_WEIGHT ?? 1.35}
            min={0.1}
            max={6}
            step={0.05}
            format="fixed2"
            settingConfigKey="PERIMETER_FIELD_INFLUENCE_WEIGHT"
            settingDescription="Overall power of each derived perimeter vstar. Higher values make the perimeter shell dominate more strongly over empty interior space."
            onInput={(value) => {
                writeConfig("PERIMETER_FIELD_INFLUENCE_WEIGHT", "perimeterFieldInfluenceWeight", value);
            }}
        />
    </div>
{/if}

{#if showModule("transition")}
    <div class="module-block">
        <div
            class="perimeter-field-select"
            data-setting-config-key="PERIMETER_FIELD_TRANSITION_ENGINE"
            data-setting-description="Choose between the synthetic conquest samples and the topology-driven transition plan."
        >
            <PaxHudSelect
                label={`Transition Engine - ${transitionEngineLabel()}`}
                value={currentTransitionEngine()}
                options={TRANSITION_ENGINE_OPTIONS}
                onValueChange={(value) => {
                    writeConfig(
                        "PERIMETER_FIELD_TRANSITION_ENGINE",
                        "perimeterFieldTransitionEngine",
                        value === "legacy" ? "legacy" : "plan",
                    );
                }}
            />
            <p>
                Topology Plan is the deterministic section-aware path. Synthetic keeps the previous transition implementation available for A/B comparison.
            </p>
        </div>

        <PaxSettingsRangeRow
            label="Transition Slice Count"
            note="More slices make the conquest override rounder and smoother. Fewer slices make it cheaper and more faceted."
            value={panel.perimeterFieldTransitionRayCount ?? GAME_CONFIG.PERIMETER_FIELD_TRANSITION_RAY_COUNT ?? 60}
            min={8}
            max={180}
            step={1}
            settingConfigKey="PERIMETER_FIELD_TRANSITION_RAY_COUNT"
            settingDescription="Number of radial slices cast from the conquered star to build the conquest-local boundary override."
            onInput={(value) => {
                writeConfig("PERIMETER_FIELD_TRANSITION_RAY_COUNT", "perimeterFieldTransitionRayCount", value);
            }}
        />

        <PaxSettingsToggleRow
            label="Hold Base State During Transition"
            checked={freezeBaseDuringTransition()}
            description="Keeps the pre-conquest perimeter shell fixed while the local transition override does the visible handoff."
            meta={freezeBaseDuringTransition() ? "On" : "Off"}
            settingConfigKey="PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION"
            onChange={(value) => {
                writeConfig(
                    "PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION",
                    "perimeterFieldFreezeBaseDuringTransition",
                    value,
                );
            }}
        />

        <PaxSettingsRangeRow
            label="Old Boundary Persistence"
            note="Transition-only multiplier for the previous owner's local boundary handles. Higher means the old edge lingers longer."
            value={panel.perimeterFieldOldBoundaryFade ?? GAME_CONFIG.PERIMETER_FIELD_OLD_BOUNDARY_FADE ?? 1}
            min={0}
            max={3}
            step={0.05}
            format="fixed2"
            settingConfigKey="PERIMETER_FIELD_OLD_BOUNDARY_FADE"
            settingDescription="How strongly the old-owner local boundary handles remain present during conquest. Higher values preserve the old edge longer before it yields."
            onInput={(value) => {
                writeConfig("PERIMETER_FIELD_OLD_BOUNDARY_FADE", "perimeterFieldOldBoundaryFade", value);
            }}
        />

        <PaxSettingsRangeRow
            label="New Boundary Assertion"
            note="Transition-only multiplier for the incoming owner's local boundary handles. Higher means the new edge takes over faster."
            value={panel.perimeterFieldNewBoundaryGrow ?? GAME_CONFIG.PERIMETER_FIELD_NEW_BOUNDARY_GROW ?? 1}
            min={0}
            max={3}
            step={0.05}
            format="fixed2"
            settingConfigKey="PERIMETER_FIELD_NEW_BOUNDARY_GROW"
            settingDescription="How strongly the new-owner local boundary handles assert themselves during conquest. Higher values make the incoming edge claim space faster."
            onInput={(value) => {
                writeConfig("PERIMETER_FIELD_NEW_BOUNDARY_GROW", "perimeterFieldNewBoundaryGrow", value);
            }}
        />
    </div>
{/if}

<style>
    @import "./panel-shared.css";

    .module-head {
        display: flex;
        justify-content: flex-end;
        margin: 0 0 8px;
    }

    .module-scope-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .module-nav {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 0 0 10px;
    }

    :global(.perimeter-field-chip) {
        width: 100%;
        justify-content: center;
    }

    :global(.perimeter-field-mini) {
        min-width: 54px;
    }

    .module-block {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .perimeter-field-select {
        min-width: 0;
        display: grid;
        gap: 8px;
        padding: 10px;
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-sm);
        clip-path: var(--pax-ui-rounded-corner-sm);
        background:
            linear-gradient(180deg, rgba(0, 18, 21, 0.78), rgba(0, 10, 13, 0.9)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
    }

    .perimeter-field-select p {
        margin: 0;
        color: var(--pax-ui-text-dim);
        font-family: var(--pax-ui-font-copy);
        font-size: calc(0.66rem * var(--pax-ui-type-scale, 1));
        line-height: 1.35;
    }
</style>
