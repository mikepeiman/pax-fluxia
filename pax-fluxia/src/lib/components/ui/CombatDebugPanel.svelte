<script lang="ts">
    import { onMount } from "svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { log } from "$lib/utils/logger";

    const STORAGE_KEY = "pax-fluxia-combat-tuning";

    // Default values for reset button (canonical game balance settings)
    const defaultValues = {
        // Transfer
        TRANSFER_RATE: 25, // Stored as % in UI, converted to decimal when applied
        // Combat
        AGGRESSOR_ADVANTAGE: 0.8,
        DAMAGE_PER_SHIP: 0.1,
        LETHALITY: 0.25,
        FORCE_RATIO_EFFECT: 0,
        CONQUEST_THRESHOLD: 8,
        CONQUEST_TRANSFER_PERCENTAGE: 50,
        RETREAT_CAPTURE_RATE: 0.35,
        SCATTER_CAPTURE_RATE: 0.5,
        SCATTER_DESTROY_RATE: 0.5,
        DAMAGED_SHIP_EFFECTIVENESS: 0.14,
        // AI Behavior
        AI_ATTACK_THRESHOLD: 1.33,
        AI_DESIST_THRESHOLD: 1.0,
        AI_RANDOM_AGGRESSION: 0.05,
        AI_TACTICAL_AGGRESSION: 0.1,
    };

    // Load from localStorage or use defaults
    function loadFromStorage(): typeof defaultValues {
        if (typeof window === "undefined") return { ...defaultValues };
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to handle new keys
                return { ...defaultValues, ...parsed };
            }
        } catch (e) {
            log.error(
                "CombatDebugPanel",
                "Failed to load combat tuning from localStorage",
                e,
            );
        }
        return { ...defaultValues };
    }

    function saveToStorage(vals: typeof defaultValues) {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(vals));
        } catch (e) {
            log.error(
                "CombatDebugPanel",
                "Failed to save combat tuning to localStorage",
                e,
            );
        }
    }

    // Track which variables are enabled (true = active, false = use neutral value)
    let enabled = $state({
        TRANSFER_RATE: true,
        AGGRESSOR_ADVANTAGE: true,
        DAMAGE_PER_SHIP: true,
        LETHALITY: true,
        FORCE_RATIO_EFFECT: true,
        CONQUEST_THRESHOLD: true,
        CONQUEST_TRANSFER_PERCENTAGE: true,
        RETREAT_CAPTURE_RATE: true,
        SCATTER_CAPTURE_RATE: true,
        SCATTER_DESTROY_RATE: true,
        DAMAGED_SHIP_EFFECTIVENESS: true,
        AI_ATTACK_THRESHOLD: true,
        AI_DESIST_THRESHOLD: true,
        AI_RANDOM_AGGRESSION: true,
        AI_TACTICAL_AGGRESSION: true,
    });

    // Load initial values from localStorage
    const initialValues = loadFromStorage();

    // REACTIVE values state - this drives the UI and syncs TO GAME_CONFIG
    let values = $state({ ...initialValues });

    // Store original values for when re-enabled
    let savedValues = $state({ ...initialValues });

    // Apply loaded values to GAME_CONFIG on mount
    onMount(() => {
        Object.entries(values).forEach(([key, val]) => {
            if (key === "TRANSFER_RATE") {
                // TRANSFER_RATE is stored as % in UI/storage, but needs to be decimal in GAME_CONFIG
                GAME_CONFIG.TRANSFER_RATE = (val as number) / 100;
            } else {
                (GAME_CONFIG as any)[key] = val;
            }
        });
    });

    // Neutral values when disabled
    const neutralValues: Record<string, number> = {
        TRANSFER_RATE: 25, // Default 25%
        AGGRESSOR_ADVANTAGE: 1.0, // No bonus
        DAMAGE_PER_SHIP: 0, // No damage
        LETHALITY: 0, // All damage converts to disabled
        FORCE_RATIO_EFFECT: 0, // No force ratio bonus
        CONQUEST_THRESHOLD: 9999, // Impossible to conquer
        CONQUEST_TRANSFER_PERCENTAGE: 0, // No transfer
        RETREAT_CAPTURE_RATE: 1.0, // Capture all on retreat
        SCATTER_CAPTURE_RATE: 1.0, // Capture all on scatter
        SCATTER_DESTROY_RATE: 0, // No destruction
        DAMAGED_SHIP_EFFECTIVENESS: 0, // No defensive contribution from damaged ships
        AI_ATTACK_THRESHOLD: 999, // Never attack
        AI_DESIST_THRESHOLD: 999, // Never retreat
        AI_RANDOM_AGGRESSION: 0, // No random attacks
        AI_TACTICAL_AGGRESSION: 0, // No tactical attacks
    };

    // Timing variables
    let tickLength = $state(GAME_CONFIG.BASE_TICK_MS);
    const defaultTickLength = 1200;

    function updateTickLength(value: number) {
        tickLength = value;
        GAME_CONFIG.BASE_TICK_MS = value;
    }

    // Transfer Rate control (% in UI, decimal in GAME_CONFIG)
    // Stored as % (25) in localStorage, converted to decimal (0.25) for GAME_CONFIG in onMount
    let transferRate = $state(initialValues.TRANSFER_RATE ?? 25);

    function updateTransferRate(value: number) {
        transferRate = value;
        values = { ...values, TRANSFER_RATE: value };
        GAME_CONFIG.TRANSFER_RATE = value / 100; // Convert % to decimal
        saveToStorage(values as typeof defaultValues);
    }

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
        {
            key: "RETREAT_CAPTURE_RATE",
            label: "Retreat Capture",
            desc: "% captured when defender retreats",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "SCATTER_CAPTURE_RATE",
            label: "Scatter Capture",
            desc: "% captured when defender scatters",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "SCATTER_DESTROY_RATE",
            label: "Scatter Destroy",
            desc: "% of escapees destroyed",
            min: 0,
            max: 1,
            step: 0.05,
        },
        {
            key: "DAMAGED_SHIP_EFFECTIVENESS",
            label: "Damaged Ship Defense",
            desc: "Fraction of damaged ships counting as defenders",
            min: 0,
            max: 1,
            step: 0.01,
        },
    ] as const;

    // AI-specific variables (separate array for UI grouping)
    const aiVariables = [
        {
            key: "AI_ATTACK_THRESHOLD",
            label: "Attack Threshold",
            desc: "Min ratio to initiate attack (1.33 = need 33% advantage)",
            min: 0.5,
            max: 3,
            step: 0.1,
        },
        {
            key: "AI_DESIST_THRESHOLD",
            label: "Desist Threshold",
            desc: "Ratio at which AI retreats (1.0 = parity)",
            min: 0.1,
            max: 2,
            step: 0.1,
        },
        {
            key: "AI_RANDOM_AGGRESSION",
            label: "Random Aggression",
            desc: "Chance per tick to attack randomly",
            min: 0,
            max: 0.5,
            step: 0.01,
        },
        {
            key: "AI_TACTICAL_AGGRESSION",
            label: "Tactical Aggression",
            desc: "Chance to attack weak target to bait others",
            min: 0,
            max: 0.5,
            step: 0.01,
        },
    ] as const;

    type VarKey = keyof typeof values;

    // Toggle a variable on/off
    function toggle(key: VarKey) {
        const wasEnabled = enabled[key];
        enabled = { ...enabled, [key]: !wasEnabled };

        if (!wasEnabled) {
            // Was disabled, now enabling: restore saved value
            values = { ...values, [key]: savedValues[key] };
            (GAME_CONFIG as any)[key] = savedValues[key];
        } else {
            // Was enabled, now disabling: save current value, apply neutral
            savedValues = { ...savedValues, [key]: values[key] };
            values = { ...values, [key]: neutralValues[key] };
            (GAME_CONFIG as any)[key] = neutralValues[key];
        }
    }

    // Update a value in real-time (called from slider or number input)
    function updateValue(key: VarKey, newValue: number) {
        if (isNaN(newValue)) return;
        // Force reactivity by creating new object (Svelte 5 deep reactivity quirk with dynamic keys)
        values = { ...values, [key]: newValue };
        savedValues = { ...savedValues, [key]: newValue };
        (GAME_CONFIG as any)[key] = newValue;
        // Persist to localStorage
        saveToStorage(values as typeof defaultValues);
    }

    // Collapsible sections state with localStorage persistence
    const COLLAPSE_KEYS = {
        timing: "pax-fluxia-collapse-timing",
        transfer: "pax-fluxia-collapse-transfer",
        combat: "pax-fluxia-collapse-combat",
        ai: "pax-fluxia-collapse-ai",
    };

    function getCollapsedState(key: string): boolean {
        if (typeof window === "undefined") return false;
        return localStorage.getItem(key) === "true";
    }

    function setCollapsedState(key: string, value: boolean) {
        if (typeof window === "undefined") return;
        localStorage.setItem(key, String(value));
    }

    let timingCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.timing));
    let transferCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.transfer));
    let combatCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.combat));
    let aiCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.ai));
</script>

<div class="combat-tuning-list">
    <!-- Timing Section -->
    <div class="timing-section">
        <button
            class="section-header"
            onclick={() => {
                timingCollapsed = !timingCollapsed;
                setCollapsedState(COLLAPSE_KEYS.timing, timingCollapsed);
            }}
        >
            <span class="section-title">⏱️ Timing</span>
            <span class="collapse-icon">{timingCollapsed ? "▶" : "▼"}</span>
        </button>
        {#if !timingCollapsed}
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Tick Length</span>
                    <span class="current-val">{tickLength}ms</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="200"
                        max="3000"
                        step="100"
                        value={tickLength}
                        oninput={(e) =>
                            updateTickLength(
                                parseInt((e.target as HTMLInputElement).value),
                            )}
                    />
                </div>
            </div>
        {/if}
    </div>

    <!-- Transfer Section -->
    <div class="transfer-section">
        <button
            class="section-header"
            onclick={() => {
                transferCollapsed = !transferCollapsed;
                setCollapsedState(COLLAPSE_KEYS.transfer, transferCollapsed);
            }}
        >
            <span class="section-title">🚀 Transfer</span>
            <span class="collapse-icon">{transferCollapsed ? "▶" : "▼"}</span>
        </button>
        {#if !transferCollapsed}
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Transfer Rate</span>
                    <span class="current-val">{transferRate}%</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={transferRate}
                        oninput={(e) =>
                            updateTransferRate(
                                parseInt((e.target as HTMLInputElement).value),
                            )}
                    />
                </div>
            </div>
        {/if}
    </div>

    <!-- Combat Tuning Section -->
    <div class="sidebar-header">
        <h3
            onclick={() => {
                combatCollapsed = !combatCollapsed;
                setCollapsedState(COLLAPSE_KEYS.combat, combatCollapsed);
            }}
            style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1;"
        >
            ⚔️ Combat Tuning
            <span class="collapse-icon">{combatCollapsed ? "▶" : "▼"}</span>
        </h3>
        <button
            class="reset-btn"
            onclick={() => {
                // Reset timing
                tickLength = defaultTickLength;
                GAME_CONFIG.BASE_TICK_MS = defaultTickLength;
                // Reset combat vars
                variables.forEach((v) => {
                    const key = v.key as VarKey;
                    enabled = { ...enabled, [key]: true };
                    values = { ...values, [key]: defaultValues[key] };
                    savedValues = {
                        ...savedValues,
                        [key]: defaultValues[key],
                    };
                    (GAME_CONFIG as any)[key] = defaultValues[key];
                });
                // Reset AI vars
                aiVariables.forEach((v) => {
                    const key = v.key as VarKey;
                    enabled = { ...enabled, [key]: true };
                    values = { ...values, [key]: defaultValues[key] };
                    savedValues = {
                        ...savedValues,
                        [key]: defaultValues[key],
                    };
                    (GAME_CONFIG as any)[key] = defaultValues[key];
                });
                // Save to localStorage
                saveToStorage(values as typeof defaultValues);
            }}>Reset</button
        >
    </div>

    {#if !combatCollapsed}
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
    {/if}

    <!-- AI Behavior Section -->
    <button
        class="section-header ai-section"
        onclick={() => {
            aiCollapsed = !aiCollapsed;
            setCollapsedState(COLLAPSE_KEYS.ai, aiCollapsed);
        }}
    >
        <span class="section-title">🤖 AI Behavior</span>
        <span class="collapse-icon">{aiCollapsed ? "▶" : "▼"}</span>
    </button>

    {#if !aiCollapsed}
        <div class="content-list">
            {#each aiVariables as v}
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
    {/if}
</div>

<style>
    .combat-tuning-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: #ccc;
        font-family: inherit;
    }

    .timing-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 8px;
        border-bottom: 1px solid #223;
    }

    .transfer-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 8px;
        border-bottom: 1px solid #223;
    }

    .transfer-section .section-title {
        color: #00e0ff;
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        color: inherit;
        text-align: left;
    }

    .section-header:hover .section-title {
        color: #fff;
    }

    .collapse-icon {
        font-size: 10px;
        color: #888;
        margin-left: 6px;
    }

    .section-title {
        font-size: 11px;
        font-weight: bold;
        color: #88aaff;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .ai-section {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #223;
    }

    .ai-section .section-title {
        color: #ff8844;
    }

    .var-name {
        font-size: 11px;
        font-weight: 600;
        color: #eee;
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

    .sidebar-header h3:hover .collapse-icon {
        color: #fff;
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
