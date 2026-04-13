<script lang="ts">
    import { AI_VARIABLES, CONFIG_TO_PANEL_KEY } from "../settingsDefs";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();

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
        <div class="var-row">
            <div class="row-top">
                <span class="var-name">{variable.label}</span>
                <span class="val">{getAIValue(variable.key).toFixed(2)}</span>
            </div>
            <input
                type="range"
                min={variable.min}
                max={variable.max}
                step={variable.step}
                value={getAIValue(variable.key)}
                oninput={(event) =>
                    updateAIValue(
                        variable.key,
                        parseFloat((event.target as HTMLInputElement).value),
                    )}
            />
        </div>
    {/each}
{/each}

<h4 class="sub-heading">Future Strategies</h4>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">Sniper</span>
        <span class="val">planned</span>
    </div>
    <span class="future-desc">Prioritize exposed weak stars.</span>
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">Turtle</span>
        <span class="val">planned</span>
    </div>
    <span class="future-desc">Bias toward defense and retention.</span>
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">Swarm</span>
        <span class="val">planned</span>
    </div>
    <span class="future-desc">Coordinated mass attacks across fronts.</span>
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">Chaos</span>
        <span class="val">planned</span>
    </div>
    <span class="future-desc">Intentionally unstable target selection.</span>
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">Diplomat</span>
        <span class="val">planned</span>
    </div>
    <span class="future-desc">Expand economically before escalating.</span>
</div>

<style>
    @import "./panel-shared.css";
</style>
