<script lang="ts">
    import { AI_VARIABLES, CONFIG_TO_PANEL_KEY } from "../settingsDefs";
    import { GAME_CONFIG, DEFAULT_GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-AI — In-Game Settings Controls: AI Behavior
    // Refactored to use panel state (reactive + theme-compatible)

    const aiVariables = AI_VARIABLES;

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }
    let { panel, updatePanel, syncFromConfig }: Props = $props();

    // Per-variable enable/disable toggle (local UI state, not persisted)
    let enabled = $state<Record<string, boolean>>(
        Object.fromEntries(aiVariables.map((v) => [v.key, true])),
    );

    function getAIValue(configKey: string): number {
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey && panel[panelKey] !== undefined) {
            return panel[panelKey] as number;
        }
        return (GAME_CONFIG as any)[configKey] as number;
    }

    function updateAIValue(configKey: string, val: number) {
        if (isNaN(val)) return;
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey) {
            updatePanel(panelKey, val);
        }
        (GAME_CONFIG as any)[configKey] = val;
    }

    function toggle(configKey: string) {
        const wasEnabled = enabled[configKey];
        enabled = { ...enabled, [configKey]: !wasEnabled };
        if (wasEnabled) {
            // Disable: reset to default
            const defaultVal = (DEFAULT_GAME_CONFIG as any)[configKey];
            updateAIValue(configKey, defaultVal);
        }
        // Enable: current panel value is already correct
    }
</script>

<CategoryThemeBar category="ai" onApply={() => syncFromConfig?.()} />

{#each aiVariables as v}
    <div class="var-row" class:disabled={!enabled[v.key]}>
        <div class="row-top">
            <label class="toggle-label">
                <input
                    type="checkbox"
                    checked={enabled[v.key]}
                    onchange={() => toggle(v.key)}
                />
                <span class="var-name">{v.label}</span>
            </label>
            <span class="val">{getAIValue(v.key).toFixed(2)}</span>
        </div>
        <input
            type="range"
            min={v.min}
            max={v.max}
            step={v.step}
            value={getAIValue(v.key)}
            oninput={(e) =>
                updateAIValue(
                    v.key,
                    parseFloat((e.target as HTMLInputElement).value),
                )}
            disabled={!enabled[v.key]}
        />
    </div>
{/each}

<h4 class="sub-heading">Future Strategies</h4>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🎯 Sniper</span><span class="val">—</span>
    </div>
    <span class="future-desc">Targets weakest stars first</span>
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🛡️ Turtle</span><span class="val">—</span>
    </div>
    <span class="future-desc">Defensive posture, holds territory</span>
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🌊 Swarm</span><span class="val">—</span>
    </div>
    <span class="future-desc">Mass coordinated attacks</span>
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🎲 Chaos</span><span class="val">—</span>
    </div>
    <span class="future-desc">Unpredictable, random targets</span>
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🤝 Diplomat</span><span class="val">—</span>
    </div>
    <span class="future-desc">Avoids conflict, grows economy</span>
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">⚖️ Balanced</span><span class="val">—</span>
    </div>
    <span class="future-desc">Adapts to game state dynamically</span>
</div>

<style>
    @import "./panel-shared.css";
</style>
