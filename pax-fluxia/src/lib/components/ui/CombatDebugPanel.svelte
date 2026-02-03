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

<div class="combat-tuning-list">
    <!-- Header -->
    <div class="sidebar-header">
        <h3>⚔️ Combat Tuning</h3>
        <button
            class="reset-btn"
            onclick={() => {
                variables.forEach((v) => {
                    const key = v.key as VarKey;
                    enabled[key] = true;
                    values[key] = savedValues[key];
                    (GAME_CONFIG as any)[key] = savedValues[key];
                });
            }}>Reset</button
        >
    </div>

    <div class="content-list">
        {#each variables as v}
            <div
                class="variable-row"
                class:disabled={!enabled[v.key as keyof typeof enabled]}
            >
                <div class="row-top">
                    <label class="toggle-label">
                        <input
                            type="checkbox"
                            checked={enabled[v.key as keyof typeof enabled]}
                            onchange={() =>
                                toggle(v.key as keyof typeof enabled)}
                        />
                        <span class="var-name">{v.label}</span>
                    </label>
                    <span class="current-val"
                        >{values[v.key as VarKey].toFixed(2)}</span
                    >
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
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .combat-tuning-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: #ccc;
        font-family: inherit;
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 5px;
        border-bottom: 1px solid #334;
    }

    .sidebar-header h3 {
        margin: 0;
        font-size: 12px;
        font-weight: bold;
        color: #88aaff;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .reset-btn {
        background: transparent;
        border: 1px solid #445;
        color: #888;
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
    }
    .reset-btn:hover {
        color: #fff;
        border-color: #667;
    }

    .content-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .variable-row {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05); /* Subtle border */
        border-radius: 4px;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .variable-row.disabled {
        opacity: 0.5;
    }

    .row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .toggle-label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        color: #eee;
    }

    .current-val {
        font-family: "Exo", sans-serif;
        font-size: 11px;
        color: #00e0ff;
    }

    .row-controls input[type="range"] {
        width: 100%;
        accent-color: #00e0ff;
        height: 4px;
        background: #334;
        border-radius: 2px;
        cursor: pointer;
    }
</style>
