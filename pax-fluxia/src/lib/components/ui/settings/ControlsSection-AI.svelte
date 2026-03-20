<script lang="ts">
    import { AI_VARIABLES, type TuningVarKey } from "../settingsDefs";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    const aiVariables = AI_VARIABLES;

    // ControlsSection-AI — In-Game Settings Controls: AI Behavior
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

<CategoryThemeBar category="ai" onApply={() => syncFromConfig?.()} />

{#each aiVariables as v}
    <div
        class="var-row"
        class:disabled={!enabled[v.key as TuningVarKey]}
    >
        <div class="row-top">
            <label class="toggle-label">
                <input
                    type="checkbox"
                    checked={enabled[v.key as TuningVarKey]}
                    onchange={() => toggle(v.key as TuningVarKey)}
                />
                <span class="var-name">{v.label}</span>
            </label>
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
            disabled={!enabled[v.key as TuningVarKey]}
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
