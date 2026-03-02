<script lang="ts">
    import {
        audioManager,
        SOUND_LABELS,
        ALL_SOUND_TYPES,
        type SoundType,
        type AudioTheme,
    } from "$lib/services/audioManager.svelte";
    import { fade, fly } from "svelte/transition";

    // Props
    interface Props {
        visible: boolean;
        onClose: () => void;
    }
    let { visible, onClose }: Props = $props();

    let showSavePrompt = $state(false);
    let saveThemeName = $state("");

    function handleSaveTheme() {
        if (!saveThemeName.trim()) return;
        audioManager.saveAudioTheme(saveThemeName.trim());
        saveThemeName = "";
        showSavePrompt = false;
    }

    function handleApplyTheme(name: string) {
        const themes = audioManager.getAllThemes();
        const theme = themes.find((t) => t.name === name);
        if (theme) audioManager.applyAudioTheme(theme);
    }

    function handleDeleteTheme(name: string) {
        audioManager.deleteAudioTheme(name);
    }
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

                <!-- Per-Sound Volume Sliders + File Selectors -->
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
                        <!-- File selector dropdown -->
                        <select
                            class="file-select"
                            value={audioManager.soundFiles[stype]}
                            onchange={(e) =>
                                audioManager.setSoundFile(
                                    stype,
                                    (e.target as HTMLSelectElement).value,
                                )}
                            disabled={audioManager.muted}
                        >
                            {#each audioManager.getAvailableFiles(stype) as entry}
                                <option value={entry.path}
                                    >{entry.label} ({entry.category})</option
                                >
                            {/each}
                        </select>
                    </div>
                {/each}

                <div class="divider"></div>

                <!-- Audio Themes -->
                <div class="theme-section">
                    <div class="setting-header">
                        <span
                            class="setting-name"
                            style="font-size:0.9rem; color:#0ff;"
                            >Audio Themes</span
                        >
                    </div>

                    <div class="theme-row">
                        <select
                            class="theme-select"
                            value={audioManager.selectedThemeName}
                            onchange={(e) =>
                                handleApplyTheme(
                                    (e.target as HTMLSelectElement).value,
                                )}
                        >
                            <option value="">— Select theme —</option>
                            {#each audioManager.getAllThemes() as theme}
                                <option value={theme.name}
                                    >{theme.name}{theme.builtIn
                                        ? " ★"
                                        : ""}</option
                                >
                            {/each}
                        </select>
                        <button
                            class="test-btn"
                            onclick={() => {
                                showSavePrompt = !showSavePrompt;
                            }}>💾 Save</button
                        >
                        {#if audioManager.selectedThemeName && !audioManager
                                .getAllThemes()
                                .find((t) => t.name === audioManager.selectedThemeName)?.builtIn}
                            <button
                                class="reset-btn"
                                onclick={() =>
                                    handleDeleteTheme(
                                        audioManager.selectedThemeName,
                                    )}>🗑</button
                            >
                        {/if}
                    </div>

                    {#if showSavePrompt}
                        <div class="save-prompt">
                            <input
                                type="text"
                                class="save-input"
                                placeholder="Theme name..."
                                bind:value={saveThemeName}
                                onkeydown={(e) => {
                                    if (e.key === "Enter") handleSaveTheme();
                                }}
                            />
                            <button class="test-btn" onclick={handleSaveTheme}
                                >Save</button
                            >
                            <button
                                class="test-btn"
                                onclick={() => {
                                    showSavePrompt = false;
                                }}>Cancel</button
                            >
                        </div>
                    {/if}
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

    .file-select,
    .theme-select {
        width: 100%;
        background: #0d1525;
        border: 1px solid #223355;
        color: #aab;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.7rem;
        padding: 4px 8px;
        border-radius: 4px;
        appearance: auto;
    }
    .file-select:focus,
    .theme-select:focus {
        border-color: #00aaaa;
        outline: none;
    }
    .file-select:disabled {
        opacity: 0.3;
    }

    .theme-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .theme-row {
        display: flex;
        gap: 6px;
        align-items: center;
    }
    .theme-row .theme-select {
        flex: 1;
    }

    .save-prompt {
        display: flex;
        gap: 6px;
        align-items: center;
    }
    .save-input {
        flex: 1;
        background: #0d1525;
        border: 1px solid #00aaaa;
        color: #fff;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.75rem;
        padding: 5px 8px;
        border-radius: 4px;
    }
    .save-input::placeholder {
        color: #556;
    }
    .save-input:focus {
        outline: none;
        border-color: #00ffff;
        box-shadow: 0 0 6px rgba(0, 255, 255, 0.2);
    }
</style>
