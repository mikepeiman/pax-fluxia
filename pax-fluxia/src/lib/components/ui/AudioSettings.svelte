<script lang="ts">
    import {
        audioManager,
        SOUND_LABELS,
        ALL_SOUND_TYPES,
        type SoundType,
    } from "$lib/services/audioManager.svelte";
    import { fade, fly } from "svelte/transition";

    // Props
    interface Props {
        visible: boolean;
        onClose: () => void;
    }
    let { visible, onClose }: Props = $props();
</script>

{#if visible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="modal-overlay"
        onclick={onClose}
        transition:fade={{ duration: 150 }}
    >
        <div
            class="modal-content"
            onclick={(e) => e.stopPropagation()}
            transition:fly={{ y: 20, duration: 200 }}
        >
            <div class="modal-header">
                <h2>Audio Settings</h2>
                <div class="header-actions">
                    <button
                        class="reset-btn"
                        onclick={() => audioManager.resetDefaults()}
                        title="Reset all to defaults">↺ Reset</button
                    >
                    <button class="close-btn" onclick={onClose}>×</button>
                </div>
            </div>

            <div class="settings-body">
                <!-- Master Toggle + Volume -->
                <div class="setting-row master-row">
                    <label class="master-toggle">
                        <input
                            type="checkbox"
                            checked={!audioManager.muted}
                            onchange={() => audioManager.toggleMute()}
                        />
                        <span class="toggle-label">Sound Enabled</span>
                    </label>
                </div>

                <div class="setting-row" class:disabled={audioManager.muted}>
                    <div class="setting-header">
                        <span class="setting-name">Master Volume</span>
                        <span class="setting-value"
                            >{Math.round(
                                audioManager.masterVolume * 100,
                            )}%</span
                        >
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={audioManager.masterVolume}
                        oninput={(e) =>
                            audioManager.setMasterVolume(
                                +(e.target as HTMLInputElement).value,
                            )}
                        disabled={audioManager.muted}
                    />
                </div>

                <div class="divider"></div>

                <!-- Per-Sound Volume Sliders -->
                {#each ALL_SOUND_TYPES as stype}
                    <div
                        class="setting-row"
                        class:disabled={audioManager.muted}
                    >
                        <div class="setting-header">
                            <span class="setting-name"
                                >{SOUND_LABELS[stype]}</span
                            >
                            <span class="setting-value"
                                >{Math.round(
                                    audioManager.soundVolumes[stype] * 100,
                                )}%</span
                            >
                            <button
                                class="test-btn"
                                onclick={() => audioManager.preview(stype)}
                                disabled={audioManager.muted}>Test</button
                            >
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={audioManager.soundVolumes[stype]}
                            oninput={(e) =>
                                audioManager.setSoundVolume(
                                    stype,
                                    +(e.target as HTMLInputElement).value,
                                )}
                            disabled={audioManager.muted}
                        />
                    </div>
                {/each}
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
        width: 420px;
        max-width: 90vw;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 0 40px rgba(68, 136, 255, 0.2);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #1a2a40;
        position: sticky;
        top: 0;
        background: #0a0f1e;
        z-index: 1;
    }

    .modal-header h2 {
        margin: 0;
        font-family: "Orbitron", sans-serif;
        font-size: 1.1rem;
        color: #00ffff;
        letter-spacing: 1px;
    }

    .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .reset-btn {
        background: rgba(255, 80, 80, 0.1);
        border: 1px solid rgba(255, 80, 80, 0.3);
        color: #f88;
        padding: 4px 10px;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.7rem;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .reset-btn:hover {
        background: rgba(255, 80, 80, 0.2);
        border-color: rgba(255, 80, 80, 0.5);
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
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .setting-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .setting-row.disabled {
        opacity: 0.4;
        pointer-events: none;
    }

    .master-toggle {
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
        font-size: 0.8rem;
        color: #aab;
        flex: 1;
    }

    .setting-value {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.75rem;
        color: #00ffff;
        min-width: 36px;
        text-align: right;
    }

    .test-btn {
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid #00aaaa;
        color: #00ffff;
        padding: 3px 10px;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.65rem;
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

    .divider {
        height: 1px;
        background: #1a2a40;
        margin: 2px 0;
    }
</style>
