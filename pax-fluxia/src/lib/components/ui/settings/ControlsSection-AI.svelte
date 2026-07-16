<script lang="ts">
  import "./panel-shared.css";
    import { settingsStore } from "../settingsStore.svelte";
    import { AI_VARIABLES, CONFIG_TO_PANEL_KEY } from "../settingsDefs";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { PaxSettingsRangeRow } from "$lib/design-system";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // Settings data comes from the store, not props (2026-07-15 audit phase 2b).
    const panel = $derived(settingsStore.panel);
    const updatePanel = settingsStore.set;
    const syncFromConfig = settingsStore.syncFromConfig;

    const GROUPS: Array<{ label: string; keys: string[] }> = [
        {
            label: "Aggression",
            keys: [
                "AI_MUST_ATTACK_RATIO",
                "AI_ATTACK_UPPER_BOUNDS",
                "AI_TACTICAL_AGGRESSION",
                "AI_RANDOM_AGGRESSION",
            ],
        },
        {
            label: "Decision Tempo",
            keys: [
                "AI_ATTACK_STICKINESS",
                "AI_EVALUATION_FREQUENCY",
            ],
        },
    ];

    function varsFor(keys: string[]) {
        return AI_VARIABLES.filter((variable) => keys.includes(variable.key));
    }

    function getAIValue(configKey: string): number {
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey && panel[panelKey] !== undefined) {
            return panel[panelKey] as number;
        }
        return (GAME_CONFIG as any)[configKey] as number;
    }

    function updateAIValue(configKey: string, value: number) {
        if (Number.isNaN(value)) return;
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey) {
            updatePanel(panelKey, value);
        }
        (GAME_CONFIG as any)[configKey] = value;
    }
</script>

<CategoryThemeBar category="ai" onApply={() => syncFromConfig?.()} />

{#each GROUPS as group}
    <h4 class="sub-heading">{group.label}</h4>
    {#each varsFor(group.keys) as variable}
        <PaxSettingsRangeRow
            label={variable.label}
            value={getAIValue(variable.key)}
            min={variable.min}
            max={variable.max}
            step={variable.step}
            format="fixed2"
            settingConfigKey={variable.key}
            onInput={(value) => updateAIValue(variable.key, value)}
        />
    {/each}
{/each}
