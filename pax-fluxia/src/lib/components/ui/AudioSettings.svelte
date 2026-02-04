<script lang="ts">
    import { audio } from "$lib/audio/AudioManager";
    import { fade, fly } from "svelte/transition";

    // Props
    interface Props {
        visible: boolean;
        onClose: () => void;
    }
    let { visible, onClose }: Props = $props();

    // Load settings from localStorage or audio manager
    function loadSetting<T>(key: string, defaultValue: T): T {
        if (typeof window === 'undefined') return defaultValue;
        const stored = localStorage.getItem(`pax-fluxia-audio-${key}`);
        if (stored) {
            try {
                return JSON.parse(stored) as T;
            } catch {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    function saveSetting(key: string, value: any) {
        if (typeof window === 'undefined') return;
        localStorage.setItem(`pax-fluxia-audio-${key}`, JSON.stringify(value));
    }

    // State
    let audioEnabled = $state(loadSetting("enabled", true));
    let masterVol = $state(loadSetting("master", 0.3));
    let tickVol = $state(loadSetting("tick", 0.5));
    let orderVol = $state(loadSetting("order", 0.7));
    let combatVol = $state(loadSetting("combat", 0.5));

    // Apply settings when changed
    $effect(() => {
        audio.setEnabled(audioEnabled);
        saveSetting("enabled", audioEnabled);
    });

    $effect(() => {
        audio.setVolume(masterVol);
        saveSetting("master", masterVol);
    });

    $effect(() => {
        audio.setTickVolume(tickVol);
        saveSetting("tick", tickVol);
    });

    $effect(() => {
        audio.setOrderVolume(orderVol);
        saveSetting("order", orderVol);
    });

    $effect(() => {
        audio.setCombatVolume(combatVol);
        saveSetting("combat", combatVol);
    });

    // Test sounds
    function testTick() {
        audio.tick();
    }

    function testOrder() {
        audio.order(0);
        setTimeout(() => audio.order(1), 150);
        setTimeout(() => audio.order(2), 300);
    }

    function testCombat() {
        audio.combat(0.3);
        setTimeout(() => audio.combat(0.6), 200);
        setTimeout(() => audio.combat(0.9), 400);
    }

    function testConquest() {
        audio.conquest();
    }
</script>

{#if visible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={onClose} transition:fade={{ duration: 150 }}>
        <div 
            class="modal-content" 
            onclick={(e) => e.stopPropagation()}
            transition:fly={{ y: 20, duration: 200 }}
        >
            <div class="modal-header">
                <h2>Audio Settings</h2>
                <button class="close-btn" onclick={onClose}>×</button>
            </div>

            <div class="settings-body">
                <!-- Master Toggle -->
                <div class="setting-row master-toggle">
                    <label>
                        <input type="checkbox" bind:checked={audioEnabled} />
                        <span class="toggle-label">Sound Enabled</span>
                    </label>
                </div>

                <!-- Master Volume -->
                <div class="setting-row" class:disabled={!audioEnabled}>
                    <div class="setting-header">
                        <span class="setting-name">Master Volume</span>
                        <span class="setting-value">{Math.round(masterVol * 100)}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        bind:value={masterVol}
                        disabled={!audioEnabled}
                    />
                </div>

                <div class="divider"></div>

                <!-- Tick Volume -->
                <div class="setting-row" class:disabled={!audioEnabled}>
                    <div class="setting-header">
                        <span class="setting-name">Tick Sound</span>
                        <span class="setting-value">{Math.round(tickVol * 100)}%</span>
                        <button class="test-btn" onclick={testTick} disabled={!audioEnabled}>Test</button>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        bind:value={tickVol}
                        disabled={!audioEnabled}
                    />
                    <span class="setting-desc">Subtle pulse each game tick</span>
                </div>

                <!-- Order Volume -->
                <div class="setting-row" class:disabled={!audioEnabled}>
                    <div class="setting-header">
                        <span class="setting-name">Order Sounds</span>
                        <span class="setting-value">{Math.round(orderVol * 100)}%</span>
                        <button class="test-btn" onclick={testOrder} disabled={!audioEnabled}>Test</button>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        bind:value={orderVol}
                        disabled={!audioEnabled}
                    />
                    <span class="setting-desc">Chimes when issuing commands</span>
                </div>

                <!-- Combat Volume -->
                <div class="setting-row" class:disabled={!audioEnabled}>
                    <div class="setting-header">
                        <span class="setting-name">Combat Sounds</span>
                        <span class="setting-value">{Math.round(combatVol * 100)}%</span>
                        <button class="test-btn" onclick={testCombat} disabled={!audioEnabled}>Test</button>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        bind:value={combatVol}
                        disabled={!audioEnabled}
                    />
                    <span class="setting-desc">Battle impacts and conquest fanfares</span>
                </div>

                <!-- Conquest Test -->
                <div class="setting-row" class:disabled={!audioEnabled}>
                    <button class="conquest-btn" onclick={testConquest} disabled={!audioEnabled}>
                        Test Conquest Fanfare
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .modal-content {
        background: #0a0f1e;
        border: 1px solid #4488ff;
        border-radius: 12px;
        width: 380px;
        max-width: 90vw;
        box-shadow: 0 0 40px rgba(68, 136, 255, 0.2);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #1a2a40;
    }

    .modal-header h2 {
        margin: 0;
        font-family: "Orbitron", sans-serif;
        font-size: 1.1rem;
        color: #00ffff;
        letter-spacing: 1px;
    }

    .close-btn {
        background: none;
        border: none;
        color: #667;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    .settings-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .setting-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .setting-row.disabled {
        opacity: 0.4;
        pointer-events: none;
    }

    .master-toggle label {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
    }

    .master-toggle input[type="checkbox"] {
        width: 20px;
        height: 20px;
        accent-color: #00ffff;
    }

    .toggle-label {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.95rem;
        color: #fff;
    }

    .setting-header {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .setting-name {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.85rem;
        color: #aab;
        flex: 1;
    }

    .setting-value {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8rem;
        color: #00ffff;
        min-width: 40px;
        text-align: right;
    }

    .test-btn {
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid #00aaaa;
        color: #00ffff;
        padding: 4px 12px;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.7rem;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .test-btn:hover:not(:disabled) {
        background: rgba(0, 255, 255, 0.2);
    }

    .test-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    input[type="range"] {
        width: 100%;
        accent-color: #00ffff;
        height: 6px;
        background: #223355;
        border-radius: 3px;
        appearance: none;
    }

    input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        background: #00ffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px #00ffff;
    }

    input[type="range"]:disabled {
        opacity: 0.3;
    }

    .setting-desc {
        font-size: 0.7rem;
        color: #556;
        font-style: italic;
    }

    .divider {
        height: 1px;
        background: #1a2a40;
        margin: 4px 0;
    }

    .conquest-btn {
        background: linear-gradient(180deg, #2a3a5a, #1a2a40);
        border: 1px solid #4488ff;
        color: #88aaff;
        padding: 10px 16px;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .conquest-btn:hover:not(:disabled) {
        background: linear-gradient(180deg, #3a4a6a, #2a3a50);
        color: #aaccff;
    }

    .conquest-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
</style>
