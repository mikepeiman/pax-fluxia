<script lang="ts">
  import "./panel-shared.css";
    import { COMBAT_VARIABLES, CONFIG_TO_PANEL_KEY } from "../settingsDefs";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { PaxSettingsRangeRow } from "$lib/design-system";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();

    const GROUPS: Array<{ label: string; keys: string[] }> = [
        {
            label: "Damage Model",
            keys: [
                "AGGRESSOR_ADVANTAGE",
                "GLOBAL_DAMAGE_MODIFIER",
                "LETHALITY",
                "FORCE_RATIO_EFFECT",
            ],
        },
        {
            label: "Capture Rules",
            keys: [
                "CONQUEST_THRESHOLD",
                "CONQUEST_TRANSFER_PERCENTAGE",
                "RETREAT_CAPTURE_RATE",
                "SCATTER_CAPTURE_RATE",
                "SCATTER_DESTROY_RATE",
            ],
        },
        {
            label: "Damaged Ships",
            keys: [
                "RETREAT_DAMAGED_ACTIVATION_RATE",
                "DAMAGED_SHIP_EFFECTIVENESS",
            ],
        },
    ];

    function getCombatValue(configKey: string): number {
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey && panel[panelKey] !== undefined) {
            return panel[panelKey] as number;
        }
        return (GAME_CONFIG as any)[configKey] as number;
    }

    function updateCombatValue(configKey: string, value: number) {
        if (Number.isNaN(value)) return;
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey) {
            updatePanel(panelKey, value);
        }
        (GAME_CONFIG as any)[configKey] = value;
    }

    function varsFor(keys: string[]) {
        return COMBAT_VARIABLES.filter((variable) => keys.includes(variable.key));
    }
</script>

<CategoryThemeBar category="combat" onApply={() => syncFromConfig?.()} />

{#each GROUPS as group}
    <h4 class="sub-heading">{group.label}</h4>
    {#each varsFor(group.keys) as variable}
        <PaxSettingsRangeRow
            label={variable.label}
            value={getCombatValue(variable.key)}
            min={variable.min}
            max={variable.max}
            step={variable.step}
            format="fixed2"
            settingConfigKey={variable.key}
            onInput={(value) => updateCombatValue(variable.key, value)}
        />
    {/each}
{/each}
