<script lang="ts">
    import { COMBAT_VARIABLES, AI_VARIABLES } from "../settingsDefs";
    type VarKey = string;
    const variables = COMBAT_VARIABLES;
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-BATTLE â€” In-Game Settings Controls: Battle
    // Extracted from GameSettingsPanel.svelte

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        values: Record<string, number>;
        enabled: Record<string, boolean>;
        updateValue: (key: string, val: number) => void;
        toggle: (key: string) => void;
    }
    let { panel, updatePanel, values, enabled, updateValue, toggle } =
        $props() as Props;
    import CategoryThemeBar from './CategoryThemeBar.svelte';
</script>

<CategoryThemeBar category="combat" onApply={() => {}} />


{#each variables as v}
    <div
        class="var-row"
        class:disabled={!enabled[v.key as keyof typeof enabled]}
    >
        <div class="row-top">
            <label class="toggle-label">
                <input
                    type="checkbox"
                    checked={enabled[v.key as keyof typeof enabled]}
                    onchange={() => toggle(v.key as keyof typeof enabled)}
                />
                <span class="var-name">{v.label}</span>
            </label>
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
            disabled={!enabled[v.key as keyof typeof enabled]}
        />
    </div>
{/each}

<style>
    @import './panel-shared.css';
</style>
