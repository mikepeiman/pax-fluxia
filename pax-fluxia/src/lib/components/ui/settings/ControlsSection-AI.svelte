<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-AI â€” In-Game Settings Controls: AI Behavior
    // Extracted from GameSettingsPanel.svelte

    let {
    panel: Record<string, any>,
    updatePanel: (key: string, value: any) => void,
    values: Record<string, number>,
    enabled: Record<string, boolean>,
    updateValue: (key: string, val: number) => void,
    toggle: (key: string) => void,
    } = $props();
</script>

{#each aiVariables as v}
    <div
        class="var-row"
        class:disabled={!enabled[
            v.key as keyof typeof enabled
        ]}
    >
        <div class="row-top">
            <label class="toggle-label">
                <input
                    type="checkbox"
                    checked={enabled[
                        v.key as keyof typeof enabled
                    ]}
                    onchange={() =>
                        toggle(
                            v.key as keyof typeof enabled,
                        )}
                />
                <span class="var-name">{v.label}</span>
            </label>
            <span class="val"
                >{values[v.key as VarKey].toFixed(2)}</span
            >
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
                    parseFloat(
                        (e.target as HTMLInputElement)
                            .value,
                    ),
                )}
            disabled={!enabled[
                v.key as keyof typeof enabled
            ]}
        />
    </div>
{/each}

<h4 class="sub-heading">Future Strategies</h4>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🎯 Sniper</span><span
            class="val">—</span
        >
    </div>
    <span class="future-desc"
        >Targets weakest stars first</span
    >
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🛡️ Turtle</span><span
            class="val">—</span
        >
    </div>
    <span class="future-desc"
        >Defensive posture, holds territory</span
    >
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🌊 Swarm</span><span
            class="val">—</span
        >
    </div>
    <span class="future-desc">Mass coordinated attacks</span
    >
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🎲 Chaos</span><span
            class="val">—</span
        >
    </div>
    <span class="future-desc"
        >Unpredictable, random targets</span
    >
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">🤝 Diplomat</span><span
            class="val">—</span
        >
    </div>
    <span class="future-desc"
        >Avoids conflict, grows economy</span
    >
</div>
<div class="var-row grayed">
    <div class="row-top">
        <span class="var-name">⚖️ Balanced</span><span
            class="val">—</span
        >
    </div>
    <span class="future-desc"
        >Adapts to game state dynamically</span
    >
</div>

<!-- 🚀 SHIP TRAVEL -->
