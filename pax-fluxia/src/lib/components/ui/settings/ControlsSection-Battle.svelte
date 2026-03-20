<script lang="ts">
    import { COMBAT_VARIABLES, CONFIG_TO_PANEL_KEY } from "../settingsDefs";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-BATTLE — In-Game Settings Controls: Battle
    // Refactored to use panel state (reactive + theme-compatible)

    const variables = COMBAT_VARIABLES;

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }
    let { panel, updatePanel, syncFromConfig }: Props = $props();

    function updateCombatValue(configKey: string, val: number) {
        if (isNaN(val)) return;
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey) {
            updatePanel(panelKey, val);
        }
        // Also write directly to GAME_CONFIG for immediate engine effect
        (GAME_CONFIG as any)[configKey] = val;
    }

    function getCombatValue(configKey: string): number {
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey && panel[panelKey] !== undefined) {
            return panel[panelKey] as number;
        }
        return (GAME_CONFIG as any)[configKey] as number;
    }
</script>

<CategoryThemeBar category="combat" onApply={() => syncFromConfig?.()} />

{#each variables as v}
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">{v.label}</span>
            <span class="val">{getCombatValue(v.key).toFixed(2)}</span>
        </div>
        <input
            type="range"
            min={v.min}
            max={v.max}
            step={v.step}
            value={getCombatValue(v.key)}
            oninput={(e) =>
                updateCombatValue(
                    v.key,
                    parseFloat((e.target as HTMLInputElement).value),
                )}
        />
    </div>
{/each}

<style>
    @import "./panel-shared.css";
</style>
