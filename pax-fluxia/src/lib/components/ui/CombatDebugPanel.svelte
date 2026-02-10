<script lang="ts">
    import { onMount } from "svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { log } from "$lib/utils/logger";

    const STORAGE_KEY = "pax-fluxia-combat-tuning";

    // Default values — single source of truth for reset + disabled toggle state
    // All values in raw units as used by GAME_CONFIG (decimals, not percentages)
    const defaultValues = {
        TRANSFER_RATE: 0.1, // 10% transfer rate
        AGGRESSOR_ADVANTAGE: 0.7, // defense is stronger
        DAMAGE_PER_SHIP: 0.05, // base damage per ship per tick
        LETHALITY: 0.1, // kill vs disable ratio
        FORCE_RATIO_EFFECT: 0, // no force ratio bonus
        CONQUEST_THRESHOLD: 12, // ratio: attacker force / defender force
        CONQUEST_TRANSFER_PERCENTAGE: 0.3, // transfer on conquest
        RETREAT_CAPTURE_RATE: 0.25, // capture rate on retreat
        SCATTER_CAPTURE_RATE: 0.4, // capture rate on scatter
        SCATTER_DESTROY_RATE: 0.5, // destruction rate on scatter
        DAMAGED_SHIP_EFFECTIVENESS: 0.1, // small defensive contribution
        REPAIR_RATE: 0.1, // 10% repair per tick
        AI_ATTACK_THRESHOLD: 1.33, // AI attack threshold ratio
        AI_DESIST_THRESHOLD: 1.0, // AI retreat threshold ratio
        AI_RANDOM_AGGRESSION: 0.05, // random attack chance per tick
        AI_TACTICAL_AGGRESSION: 0.1, // tactical attack chance
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
        REPAIR_RATE: true,
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
            (GAME_CONFIG as any)[key] = val;
        });
    });

    // Timing variables
    let tickInterval = $state(GAME_CONFIG.BASE_TICK_MS);
    let animationSpeed = $state(GAME_CONFIG.ANIMATION_SPEED_MS);

    function updateTickInterval(value: number) {
        tickInterval = value;
        activeGameStore.updateTickInterval(value);
    }

    function updateAnimationSpeed(value: number) {
        animationSpeed = value;
        GAME_CONFIG.ANIMATION_SPEED_MS = value;
    }

    // Transfer Rate control — stored as decimal in defaultValues, displayed as % in UI
    let transferRate = $state(
        Math.round((initialValues.TRANSFER_RATE ?? 0.1) * 100),
    );

    function updateTransferRate(value: number) {
        transferRate = value;
        const decimal = value / 100;
        values = { ...values, TRANSFER_RATE: decimal };
        GAME_CONFIG.TRANSFER_RATE = decimal;
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
        {
            key: "REPAIR_RATE",
            label: "🔧 Repair Rate",
            desc: "% of damaged ships repaired per tick (Purple 2x)",
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
            values = { ...values, [key]: defaultValues[key] };
            (GAME_CONFIG as any)[key] = defaultValues[key];
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
        visuals: "pax-fluxia-collapse-visuals",
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
    let visualsCollapsed = $state(getCollapsedState(COLLAPSE_KEYS.visuals));

    // Visuals state
    const VISUALS_STORAGE_KEY = "pax-fluxia-visuals";
    const visualDefaults = {
        laneWidth: GAME_CONFIG.CONNECTION_WIDTH,
        laneAlpha: GAME_CONFIG.CONNECTION_ALPHA,
        shadowWidth: GAME_CONFIG.CONNECTION_SHADOW_WIDTH,
        shadowAlpha: GAME_CONFIG.CONNECTION_SHADOW_ALPHA,
    };
    function loadVisuals() {
        if (typeof window === "undefined") return { ...visualDefaults };
        try {
            const s = localStorage.getItem(VISUALS_STORAGE_KEY);
            if (s) return { ...visualDefaults, ...JSON.parse(s) };
        } catch {
            /* ignore */
        }
        return { ...visualDefaults };
    }
    let vis = $state(loadVisuals());
    function saveVisuals() {
        if (typeof window === "undefined") return;
        localStorage.setItem(VISUALS_STORAGE_KEY, JSON.stringify(vis));
    }
    function updateVisual(key: keyof typeof vis, value: number) {
        vis = { ...vis, [key]: value };
        GAME_CONFIG.CONNECTION_WIDTH = vis.laneWidth;
        GAME_CONFIG.CONNECTION_ALPHA = vis.laneAlpha;
        GAME_CONFIG.CONNECTION_SHADOW_WIDTH = vis.shadowWidth;
        GAME_CONFIG.CONNECTION_SHADOW_ALPHA = vis.shadowAlpha;
        saveVisuals();
    }
    // Apply from storage on mount
    onMount(() => {
        GAME_CONFIG.CONNECTION_WIDTH = vis.laneWidth;
        GAME_CONFIG.CONNECTION_ALPHA = vis.laneAlpha;
        GAME_CONFIG.CONNECTION_SHADOW_WIDTH = vis.shadowWidth;
        GAME_CONFIG.CONNECTION_SHADOW_ALPHA = vis.shadowAlpha;
    });
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
                    <span class="var-name">Tick Interval</span>
                    <span class="current-val">{tickInterval}ms</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="200"
                        max="3000"
                        step="100"
                        value={tickInterval}
                        oninput={(e) =>
                            updateTickInterval(
                                parseInt((e.target as HTMLInputElement).value),
                            )}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Animation Speed</span>
                    <span class="current-val">{animationSpeed}ms</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="200"
                        max="3000"
                        step="100"
                        value={animationSpeed}
                        oninput={(e) =>
                            updateAnimationSpeed(
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
                        min="1"
                        max="100"
                        step="1"
                        value={transferRate}
                        oninput={(e) =>
                            updateTransferRate(
                                parseInt((e.target as HTMLInputElement).value),
                            )}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Arrow Length</span>
                    <span class="current-val"
                        >{Math.round(
                            GAME_CONFIG.ARROW_LENGTH_FRACTION * 100,
                        )}%</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min="10"
                        max="100"
                        step="1"
                        value={Math.round(
                            GAME_CONFIG.ARROW_LENGTH_FRACTION * 100,
                        )}
                        oninput={(e) => {
                            GAME_CONFIG.ARROW_LENGTH_FRACTION =
                                parseInt((e.target as HTMLInputElement).value) /
                                100;
                        }}
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
                tickInterval = 1200;
                activeGameStore.updateTickInterval(1200);
                animationSpeed = 1200;
                GAME_CONFIG.ANIMATION_SPEED_MS = 1200;
                // Reset combat vars
                variables.forEach((v) => {
                    const key = v.key as VarKey;
                    enabled = { ...enabled, [key]: true };
                    values = { ...values, [key]: defaultValues[key] };
                    savedValues = {
                        ...savedValues,
                        [key]: defaultValues[key],
                    };
                    if (key === "TRANSFER_RATE") {
                        GAME_CONFIG.TRANSFER_RATE =
                            (defaultValues[key] as number) / 100;
                    } else {
                        (GAME_CONFIG as any)[key] = defaultValues[key];
                    }
                });
                // Reset transfer rate slider too
                transferRate = defaultValues.TRANSFER_RATE;
                GAME_CONFIG.TRANSFER_RATE = defaultValues.TRANSFER_RATE / 100;
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

    <!-- Visuals Section -->
    <button
        class="section-header visuals-section"
        onclick={() => {
            visualsCollapsed = !visualsCollapsed;
            setCollapsedState(COLLAPSE_KEYS.visuals, visualsCollapsed);
        }}
    >
        <span class="section-title">🎨 Lane Visuals</span>
        <span class="collapse-icon">{visualsCollapsed ? "▶" : "▼"}</span>
    </button>

    {#if !visualsCollapsed}
        <div class="content-list">
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Lane Width</span>
                    <span class="current-val">{vis.laneWidth.toFixed(1)}</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min={0.5}
                        max={8}
                        step={0.5}
                        value={vis.laneWidth}
                        oninput={(e) =>
                            updateVisual(
                                "laneWidth",
                                parseFloat(
                                    (e.target as HTMLInputElement).value,
                                ),
                            )}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Lane Opacity</span>
                    <span class="current-val">{vis.laneAlpha.toFixed(2)}</span>
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={vis.laneAlpha}
                        oninput={(e) =>
                            updateVisual(
                                "laneAlpha",
                                parseFloat(
                                    (e.target as HTMLInputElement).value,
                                ),
                            )}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Shadow Width</span>
                    <span class="current-val">{vis.shadowWidth.toFixed(1)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={vis.shadowWidth}
                        oninput={(e) =>
                            updateVisual(
                                "shadowWidth",
                                parseFloat(
                                    (e.target as HTMLInputElement).value,
                                ),
                            )}
                    />
                </div>
            </div>
            <div class="variable-row">
                <div class="row-top">
                    <span class="var-name">Shadow Opacity</span>
                    <span class="current-val">{vis.shadowAlpha.toFixed(2)}</span
                    >
                </div>
                <div class="row-controls">
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={vis.shadowAlpha}
                        oninput={(e) =>
                            updateVisual(
                                "shadowAlpha",
                                parseFloat(
                                    (e.target as HTMLInputElement).value,
                                ),
                            )}
                    />
                </div>
            </div>
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
