<script lang="ts">
    import {
        audioManager,
        SOUND_LABELS,
        ALL_SOUND_TYPES,
        type SoundType,
        type AudioTheme,
    } from "$lib/services/audioManager.svelte";
    import { fade, fly } from "svelte/transition";
    import type { SoundFileEntry } from "$lib/config/soundManifest";

    const CONQUEST_TYPES: SoundType[] = [
        "conquest",
        "conquest_retreat",
        "conquest_scatter",
        "conquest_complete",
    ];
    const NON_CONQUEST_TYPES = ALL_SOUND_TYPES.filter(
        (t) => !CONQUEST_TYPES.includes(t),
    );

    // Track which dropdown is open (by SoundType key)
    let openDropdown = $state<string | null>(null);

    function toggleDropdown(type: string) {
        openDropdown = openDropdown === type ? null : type;
    }

    function selectFile(type: SoundType, path: string) {
        audioManager.setSoundFile(type, path);
        openDropdown = null;
    }

    function previewFile(path: string, e: MouseEvent) {
        e.stopPropagation();
        // Play the file directly without changing the assignment
        const audio = new Audio(`/sounds/${path}`);
        audio.volume = audioManager.masterVolume * 0.6;
        audio.play().catch(() => {});
    }

    function handleClickOutside(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (!target.closest(".file-picker")) {
            openDropdown = null;
        }
    }

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
            onclick={(e) => {
                e.stopPropagation();
                handleClickOutside(e);
            }}
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

                <!-- Per-Sound Volume Sliders (non-conquest) -->
                {#each NON_CONQUEST_TYPES as stype}
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
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            class="file-picker"
                            class:disabled={audioManager.muted}
                        >
                            <div
                                class="file-picker-trigger"
                                onclick={() => toggleDropdown(stype)}
                            >
                                <span class="file-picker-label">
                                    {audioManager
                                        .getAvailableFiles(stype)
                                        .find(
                                            (f) =>
                                                f.path ===
                                                audioManager.soundFiles[stype],
                                        )?.label ??
                                        audioManager.soundFiles[stype]}
                                </span>
                                <span class="file-picker-arrow"
                                    >{openDropdown === stype ? "▲" : "▼"}</span
                                >
                            </div>
                            {#if openDropdown === stype}
                                <div class="file-picker-menu">
                                    {#each audioManager.getAvailableFiles(stype) as entry}
                                        <div
                                            class="file-picker-item"
                                            class:selected={entry.path ===
                                                audioManager.soundFiles[stype]}
                                        >
                                            <span
                                                class="file-picker-item-label"
                                                onclick={() =>
                                                    selectFile(
                                                        stype,
                                                        entry.path,
                                                    )}
                                            >
                                                {entry.label}
                                                <span
                                                    class="file-picker-item-cat"
                                                    >({entry.category})</span
                                                >
                                            </span>
                                            <button
                                                class="file-picker-play"
                                                onclick={(e) =>
                                                    previewFile(entry.path, e)}
                                                title="Preview this sound"
                                                >▶</button
                                            >
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                        <div class="offset-row">
                            <span class="offset-label">Offset</span>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.01"
                                value={audioManager.soundOffsets[stype]}
                                oninput={(e) =>
                                    audioManager.setSoundOffset(
                                        stype,
                                        +(e.target as HTMLInputElement).value,
                                    )}
                                disabled={audioManager.muted}
                                class="offset-slider"
                            />
                            <span class="offset-value"
                                >{audioManager.soundOffsets[stype].toFixed(
                                    2,
                                )}s</span
                            >
                        </div>
                    </div>
                {/each}

                <!-- ═══ CONQUEST SOUNDS GROUP ═══ -->
                <div class="conquest-group" class:disabled={audioManager.muted}>
                    <div class="conquest-group-header">
                        <span class="conquest-group-title">Conquest Sounds</span
                        >
                        <label class="toggle-inline conquest-toggle">
                            <input
                                type="checkbox"
                                checked={audioManager.separateConquestSounds}
                                onchange={(e) =>
                                    audioManager.setSeparateConquestSounds(
                                        (e.target as HTMLInputElement).checked,
                                    )}
                                disabled={audioManager.muted}
                            />
                            <span class="toggle-label">Separate</span>
                            <span class="toggle-hint"
                                >{audioManager.separateConquestSounds
                                    ? "3 distinct"
                                    : "1 generic"}</span
                            >
                        </label>
                    </div>

                    {#each CONQUEST_TYPES as stype}
                        {@const isSubtype = stype !== "conquest"}
                        {@const isInactive = isSubtype
                            ? !audioManager.separateConquestSounds
                            : audioManager.separateConquestSounds}
                        <div
                            class="setting-row"
                            class:disabled={audioManager.muted}
                            class:conquest-inactive={isInactive}
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
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="file-picker"
                                class:disabled={audioManager.muted}
                            >
                                <div
                                    class="file-picker-trigger"
                                    onclick={() => toggleDropdown(stype)}
                                >
                                    <span class="file-picker-label">
                                        {audioManager
                                            .getAvailableFiles(stype)
                                            .find(
                                                (f) =>
                                                    f.path ===
                                                    audioManager.soundFiles[
                                                        stype
                                                    ],
                                            )?.label ??
                                            audioManager.soundFiles[stype]}
                                    </span>
                                    <span class="file-picker-arrow"
                                        >{openDropdown === stype
                                            ? "▲"
                                            : "▼"}</span
                                    >
                                </div>
                                {#if openDropdown === stype}
                                    <div class="file-picker-menu">
                                        {#each audioManager.getAvailableFiles(stype) as entry}
                                            <div
                                                class="file-picker-item"
                                                class:selected={entry.path ===
                                                    audioManager.soundFiles[
                                                        stype
                                                    ]}
                                            >
                                                <span
                                                    class="file-picker-item-label"
                                                    onclick={() =>
                                                        selectFile(
                                                            stype,
                                                            entry.path,
                                                        )}
                                                >
                                                    {entry.label}
                                                    <span
                                                        class="file-picker-item-cat"
                                                        >({entry.category})</span
                                                    >
                                                </span>
                                                <button
                                                    class="file-picker-play"
                                                    onclick={(e) =>
                                                        previewFile(
                                                            entry.path,
                                                            e,
                                                        )}
                                                    title="Preview this sound"
                                                    >▶</button
                                                >
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                            <div class="offset-row">
                                <span class="offset-label">Offset</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.01"
                                    value={audioManager.soundOffsets[stype]}
                                    oninput={(e) =>
                                        audioManager.setSoundOffset(
                                            stype,
                                            +(e.target as HTMLInputElement)
                                                .value,
                                        )}
                                    disabled={audioManager.muted}
                                    class="offset-slider"
                                />
                                <span class="offset-value"
                                    >{audioManager.soundOffsets[stype].toFixed(
                                        2,
                                    )}s</span
                                >
                            </div>
                        </div>
                    {/each}
                </div>

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
    .theme-select:focus {
        border-color: #00aaaa;
        outline: none;
    }

    /* ── Custom File Picker ── */
    .file-picker {
        position: relative;
        width: 100%;
    }
    .file-picker.disabled {
        opacity: 0.3;
        pointer-events: none;
    }
    .file-picker-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #0d1525;
        border: 1px solid #223355;
        color: #aab;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.7rem;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
    }
    .file-picker-trigger:hover {
        border-color: #00aaaa;
    }
    .file-picker-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
    }
    .file-picker-arrow {
        font-size: 0.55rem;
        color: #667;
        margin-left: 6px;
    }
    .file-picker-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 100;
        background: #0a0f1e;
        border: 1px solid #00aaaa;
        border-radius: 4px;
        margin-top: 2px;
        max-height: 180px;
        overflow-y: auto;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    }
    .file-picker-item {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        cursor: pointer;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.7rem;
        color: #aab;
        border-bottom: 1px solid #111a2a;
    }
    .file-picker-item:last-child {
        border-bottom: none;
    }
    .file-picker-item:hover {
        background: rgba(0, 255, 255, 0.05);
    }
    .file-picker-item.selected {
        background: rgba(0, 255, 255, 0.1);
        color: #0ff;
    }
    .file-picker-item-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .file-picker-item-cat {
        color: #556;
        font-size: 0.6rem;
        margin-left: 4px;
    }
    .file-picker-play {
        background: none;
        border: 1px solid rgba(0, 255, 255, 0.3);
        color: #0ff;
        font-size: 0.6rem;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-left: 6px;
        transition: all 0.15s;
    }
    .file-picker-play:hover {
        background: rgba(0, 255, 255, 0.15);
        border-color: #0ff;
        transform: scale(1.1);
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

    /* Offset slider row */
    .offset-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        padding: 0 4px;
    }
    .offset-label {
        font-size: 0.65rem;
        color: #888;
        min-width: 35px;
    }
    .offset-slider {
        flex: 1;
        height: 12px;
    }
    .offset-value {
        font-size: 0.65rem;
        color: #aaa;
        min-width: 32px;
        text-align: right;
        font-family: "JetBrains Mono", monospace;
    }

    /* Conquest sounds toggle */
    .toggle-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.8rem;
    }
    .toggle-inline input[type="checkbox"] {
        width: 14px;
        height: 14px;
        accent-color: #0ff;
    }
    .toggle-hint {
        font-size: 0.65rem;
        color: #888;
        margin-left: auto;
    }

    /* Conquest sounds group */
    .conquest-group {
        border: 1px solid rgba(0, 255, 255, 0.15);
        border-radius: 6px;
        padding: 8px;
        margin-top: 4px;
    }
    .conquest-group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(0, 255, 255, 0.1);
    }
    .conquest-group-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #0ff;
        letter-spacing: 0.03em;
    }
    .conquest-toggle {
        font-size: 0.7rem !important;
    }
    .conquest-inactive {
        opacity: 0.3;
        pointer-events: none;
    }
</style>
