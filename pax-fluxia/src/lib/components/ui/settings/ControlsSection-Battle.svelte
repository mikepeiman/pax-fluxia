<script lang="ts">
    import { COMBAT_VARIABLES, type TuningVarKey } from "../settingsDefs";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    const variables = COMBAT_VARIABLES;

    // ControlsSection-BATTLE — In-Game Settings Controls: Battle
    // Extracted from GameSettingsPanel.svelte

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        values: Record<TuningVarKey, number>;
        enabled: Record<TuningVarKey, boolean>;
        updateValue: (key: TuningVarKey, val: number) => void;
        toggle: (key: TuningVarKey) => void;
        syncFromConfig?: () => void;
    }

    let {
        panel,
        updatePanel,
        values,
        enabled,
        updateValue,
        toggle,
        syncFromConfig,
    }: Props = $props();
</script>

<CategoryThemeBar category="combat" onApply={() => syncFromConfig?.()} />

{#each variables as v}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">{v.label}</span>
            <span class="val">{values[v.key as TuningVarKey].toFixed(2)}</span>
        </div>
        <input
            type="range"
            min={v.min}
            max={v.max}
            step={v.step}
            value={values[v.key as TuningVarKey]}
            oninput={(e) =>
                updateValue(
                    v.key as TuningVarKey,
                    parseFloat((e.target as HTMLInputElement).value),
                )}
        />
    </div>
{/each}

<style>
    @import "./panel-shared.css";
</style>
