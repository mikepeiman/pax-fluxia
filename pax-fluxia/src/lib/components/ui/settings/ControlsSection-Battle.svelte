<script lang="ts">
    import { COMBAT_VARIABLES } from "../settingsDefs";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-BATTLE — In-Game Settings Controls: Battle
    // Extracted from GameSettingsPanel.svelte

    type VarKey = string;
    const variables = COMBAT_VARIABLES;

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        values: Record<string, number>;
        enabled: Record<string, boolean>;
        updateValue: (key: string, val: number) => void;
        toggle: (key: string) => void;
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
            <span class="val">{values[v.key as VarKey].toFixed(2)}</span>
        </div>
        <input
            type="range"
            min={v.min}
            max={v.max}
            step={v.step}
            value={values[v.key as VarKey]}
            oninput={(e) =>
                updateValue(
                    v.key as VarKey,
                    parseFloat((e.target as HTMLInputElement).value),
                )}
        />
    </div>
{/each}

<style>
    @import "./panel-shared.css";
</style>
