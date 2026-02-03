<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // Track which variables are enabled (true = active, false = use neutral value)
    let enabled = $state({
        AGGRESSOR_ADVANTAGE: true,
        DAMAGE_PER_SHIP: true,
        LETHALITY: true,
        FORCE_RATIO_EFFECT: true,
        CONQUEST_THRESHOLD: true,
        CONQUEST_TRANSFER_PERCENTAGE: true,
    });

    // REACTIVE values state - this drives the UI and syncs TO GAME_CONFIG
    let values = $state({
        AGGRESSOR_ADVANTAGE: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
        DAMAGE_PER_SHIP: GAME_CONFIG.DAMAGE_PER_SHIP,
        LETHALITY: GAME_CONFIG.LETHALITY,
        FORCE_RATIO_EFFECT: GAME_CONFIG.FORCE_RATIO_EFFECT,
        CONQUEST_THRESHOLD: GAME_CONFIG.CONQUEST_THRESHOLD,
        CONQUEST_TRANSFER_PERCENTAGE: GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE,
    });

    // Store original values for when re-enabled
    let savedValues = $state({
        AGGRESSOR_ADVANTAGE: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
        DAMAGE_PER_SHIP: GAME_CONFIG.DAMAGE_PER_SHIP,
        LETHALITY: GAME_CONFIG.LETHALITY,
        FORCE_RATIO_EFFECT: GAME_CONFIG.FORCE_RATIO_EFFECT,
        CONQUEST_THRESHOLD: GAME_CONFIG.CONQUEST_THRESHOLD,
        CONQUEST_TRANSFER_PERCENTAGE: GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE,
    });

    // Neutral values when disabled
    const neutralValues: Record<string, number> = {
        AGGRESSOR_ADVANTAGE: 1.0, // No bonus
        DAMAGE_PER_SHIP: 0, // No damage
        LETHALITY: 0, // All damage converts to disabled
        FORCE_RATIO_EFFECT: 0, // No force ratio bonus
        CONQUEST_THRESHOLD: 9999, // Impossible to conquer
        CONQUEST_TRANSFER_PERCENTAGE: 0, // No transfer
    };

    // Variable metadata for UI display
    const variables = [
        {
            key: "AGGRESSOR_ADVANTAGE",
            label: "Aggressor Advantage",
            desc: "Damage multiplier for attacking side",
            min: 0,
            max: 3,
            step: 0.1,
        },
        {
            key: "DAMAGE_PER_SHIP",
            label: "Damage Per Ship",
            desc: "Base damage output per ship per tick",
            min: 0,
            max: 1,
            step: 0.01,
        },
        {
            key: "LETHALITY",
            label: "Lethality",
            desc: "% of damage that kills (vs disables)",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "FORCE_RATIO_EFFECT",
            label: "Force Ratio Effect",
            desc: "How much numbers matter",
            min: 0,
            max: 1,
            step: 0.1,
        },
        {
            key: "CONQUEST_THRESHOLD",
            label: "Conquest Threshold",
            desc: "Defender:Attacker ratio for capture",
            min: 1,
            max: 20,
            step: 1,
        },
        {
            key: "CONQUEST_TRANSFER_PERCENTAGE",
            label: "Transfer %",
            desc: "% of attacker ships transferred on conquest",
            min: 0,
            max: 100,
            step: 10,
        },
    ] as const;

    type VarKey = keyof typeof values;

    // Toggle a variable on/off
    function toggle(key: VarKey) {
        enabled[key] = !enabled[key];

        if (enabled[key]) {
            // Re-enable: restore saved value
            values[key] = savedValues[key];
            (GAME_CONFIG as any)[key] = savedValues[key];
        } else {
            // Disable: save current value, apply neutral
            savedValues[key] = values[key];
            values[key] = neutralValues[key];
            (GAME_CONFIG as any)[key] = neutralValues[key];
        }
    }

    // Update a value in real-time (called from slider or number input)
    function updateValue(key: VarKey, newValue: number) {
        if (isNaN(newValue)) return;
        values[key] = newValue;
        (GAME_CONFIG as any)[key] = newValue;
        savedValues[key] = newValue;
    }

    // Collapsed state
    let collapsed = $state(false);
</script>

<div class="combat-debug-panel" class:collapsed>
    <button class="header" onclick={() => (collapsed = !collapsed)}>
        <span class="icon">{collapsed ? "▶" : "▼"}</span>
        <span class="title">⚙️ Combat Debug</span>
    </button>

    {#if !collapsed}
        <div class="content">
            {#each variables as v}
                <div
                    class="variable-row"
                    class:disabled={!enabled[v.key as keyof typeof enabled]}
                >
                    <div class="row-header">
                        <label class="toggle-label">
                            <input
                                type="checkbox"
                                checked={enabled[v.key as keyof typeof enabled]}
                                onchange={() =>
                                    toggle(v.key as keyof typeof enabled)}
                            />
                            <span class="var-name">{v.label}</span>
                        </label>
                    </div>
                    <div class="row-controls">
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
                                        (e.target as HTMLInputElement).value,
                                    ),
                                )}
                            disabled={!enabled[v.key as keyof typeof enabled]}
                        />
                        <input
                            type="number"
                            min={v.min}
                            max={v.max}
                            step={v.step}
                            value={values[v.key as VarKey]}
                            oninput={(e) =>
                                updateValue(
                                    v.key as VarKey,
                                    parseFloat(
                                        (e.target as HTMLInputElement).value,
                                    ),
                                )}
                            disabled={!enabled[v.key as keyof typeof enabled]}
                        />
                    </div>
                    <div class="description">{v.desc}</div>
                </div>
            {/each}

            <div class="presets">
                <button
                    onclick={() => {
                        variables.forEach((v) => {
                            const key = v.key as VarKey;
                            enabled[key] = true;
                            values[key] = savedValues[key];
                            (GAME_CONFIG as any)[key] = savedValues[key];
                        });
                    }}>Reset All</button
                >
                <button
                    onclick={() => {
                        variables.forEach((v) => {
                            const key = v.key as VarKey;
                            savedValues[key] = values[key];
                            enabled[key] = false;
                            values[key] = neutralValues[key];
                            (GAME_CONFIG as any)[key] = neutralValues[key];
                        });
                    }}>Disable All</button
                >
            </div>
        </div>
    {/if}
</div>

<style>
    .combat-debug-panel {
        background: rgba(10, 10, 20, 0.95);
        border: 1px solid #334;
        border-radius: 8px;
        font-family: "JetBrains Mono", monospace;
        font-size: 11px;
        color: #ccc;
        overflow: hidden;
    }

    .header {
        width: 100%;
        padding: 10px 12px;
        background: #1a1a25;
        border: none;
        border-bottom: 1px solid #334;
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: inherit;
        font-size: 12px;
        text-align: left;
    }

    .header:hover {
        background: #252535;
    }

    .icon {
        font-size: 10px;
        color: #888;
    }

    .title {
        font-weight: bold;
    }

    .content {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 400px;
        overflow-y: auto;
    }

    .variable-row {
        padding: 8px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 4px;
        border: 1px solid #223;
    }

    .variable-row.disabled {
        opacity: 0.5;
        background: rgba(255, 0, 0, 0.05);
        border-color: #422;
    }

    .row-header {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
    }

    .toggle-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }

    .toggle-label input[type="checkbox"] {
        accent-color: #00ffcc;
    }

    .var-name {
        font-weight: bold;
        color: #fff;
    }

    .row-controls {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .row-controls input[type="range"] {
        flex: 1;
        accent-color: #00ccff;
        height: 4px;
    }

    .row-controls input[type="number"] {
        width: 60px;
        padding: 4px 6px;
        background: #223;
        border: 1px solid #445;
        border-radius: 3px;
        color: #0ff;
        font-family: inherit;
        font-size: 11px;
        text-align: right;
    }

    .row-controls input[type="number"]:disabled {
        color: #666;
        background: #1a1a22;
    }

    .description {
        margin-top: 4px;
        font-size: 9px;
        color: #666;
    }

    .presets {
        display: flex;
        gap: 8px;
        padding-top: 8px;
        border-top: 1px solid #334;
    }

    .presets button {
        flex: 1;
        padding: 6px 10px;
        background: #334;
        border: none;
        border-radius: 4px;
        color: #aaa;
        font-family: inherit;
        font-size: 10px;
        cursor: pointer;
    }

    .presets button:hover {
        background: #445;
        color: #fff;
    }

    .collapsed .content {
        display: none;
    }
</style>
