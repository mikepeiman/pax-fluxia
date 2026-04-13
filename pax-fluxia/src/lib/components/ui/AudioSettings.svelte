<script lang="ts">
    import {
        audioManager,
        SOUND_LABELS,
        ALL_SOUND_TYPES,
        type SoundType,
    } from "$lib/services/audioManager.svelte";
    import { fade, fly } from "svelte/transition";
    import { MENU_THEME_OPTIONS, type MenuTheme } from "./menuTheme";

    const CONQUEST_TYPES: SoundType[] = [
        "conquest",
        "conquest_retreat",
        "conquest_scatter",
        "conquest_complete",
    ];
    const NON_CONQUEST_TYPES = ALL_SOUND_TYPES.filter((type) => !CONQUEST_TYPES.includes(type));

    interface Props {
        visible: boolean;
        menuTheme: MenuTheme;
        onMenuThemeChange: (theme: MenuTheme) => void;
        onClose: () => void;
    }

    let { visible, menuTheme, onMenuThemeChange, onClose }: Props = $props();

    let openDropdown = $state<SoundType | null>(null);
    let showSavePrompt = $state(false);
    let saveThemeName = $state("");

    function toggleDropdown(type: SoundType) {
        openDropdown = openDropdown === type ? null : type;
    }

    function selectFile(type: SoundType, path: string) {
        audioManager.setSoundFile(type, path);
        openDropdown = null;
    }

    function previewFile(path: string, event: MouseEvent) {
        event.stopPropagation();
        const audio = new Audio(`/sounds/${path}`);
        audio.volume = audioManager.masterVolume * 0.6;
        void audio.play().catch(() => {});
    }

    function closeTransientUI() {
        openDropdown = null;
        showSavePrompt = false;
    }

    function handleClickInside(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        if (!target?.closest(".file-picker")) openDropdown = null;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!visible || event.key !== "Escape") return;
        if (openDropdown) {
            openDropdown = null;
            return;
        }
        if (showSavePrompt) {
            showSavePrompt = false;
            return;
        }
        onClose();
    }

    function handleSaveTheme() {
        if (!saveThemeName.trim()) return;
        audioManager.saveAudioTheme(saveThemeName.trim());
        saveThemeName = "";
        showSavePrompt = false;
    }

    function handleApplyTheme(name: string) {
        const theme = audioManager.getAllThemes().find((entry) => entry.name === name);
        if (theme) audioManager.applyAudioTheme(theme);
    }

    function handleDeleteTheme(name: string) {
        audioManager.deleteAudioTheme(name);
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="modal-overlay"
        onclick={() => {
            closeTransientUI();
            onClose();
        }}
        transition:fade={{ duration: 150 }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="modal-content"
            data-theme={menuTheme}
            onclick={(event) => {
                event.stopPropagation();
                handleClickInside(event);
            }}
            transition:fly={{ y: 20, duration: 220 }}
        >
            <div class="modal-header">
                <div>
                    <p class="eyebrow">Settings</p>
                    <h2>Command Deck</h2>
                    <p class="subtitle">Tune menu appearance and battle audio from one surface.</p>
                </div>

                <div class="header-actions">
                    <button type="button" class="btn btn-ghost" onclick={() => audioManager.resetDefaults()}>
                        Reset Audio
                    </button>
                    <button type="button" class="btn btn-ghost btn-close" onclick={onClose} aria-label="Close settings">
                        X
                    </button>
                </div>
            </div>

            <div class="settings-body">
                <section class="section">
                    <div class="section-head">
                        <div>
                            <p class="eyebrow">Appearance</p>
                            <h3>Menu Theme</h3>
                        </div>
                        <p class="copy">Switch the command surface live. Your choice is saved automatically.</p>
                    </div>

                    <div class="theme-grid">
                        {#each MENU_THEME_OPTIONS as option}
                            <button
                                type="button"
                                class="theme-card"
                                class:selected={menuTheme === option.id}
                                onclick={() => onMenuThemeChange(option.id)}
                            >
                                <span>{option.label}</span>
                                <small>{option.summary}</small>
                            </button>
                        {/each}
                    </div>
                </section>

                <section class="section">
                    <div class="section-head">
                        <div>
                            <p class="eyebrow">Master</p>
                            <h3>Output</h3>
                        </div>
                    </div>

                    <label class="toggle">
                        <input
                            type="checkbox"
                            checked={!audioManager.muted}
                            onchange={() => audioManager.toggleMute()}
                        />
                        <span>Sound Enabled</span>
                    </label>

                    <div class="setting-row" class:disabled={audioManager.muted}>
                        <div class="setting-header">
                            <span class="setting-name">Master Volume</span>
                            <span class="setting-value">{Math.round(audioManager.masterVolume * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={audioManager.masterVolume}
                            oninput={(event) =>
                                audioManager.setMasterVolume(+(event.target as HTMLInputElement).value)}
                            disabled={audioManager.muted}
                        />
                    </div>
                </section>

                <section class="section">
                    <div class="section-head">
                        <div>
                            <p class="eyebrow">Audio</p>
                            <h3>Core Cues</h3>
                        </div>
                    </div>

                    {#each NON_CONQUEST_TYPES as soundType}
                        <div class="setting-row" class:disabled={audioManager.muted}>
                            <div class="setting-header">
                                <span class="setting-name">{SOUND_LABELS[soundType]}</span>
                                <span class="setting-value">{Math.round(audioManager.soundVolumes[soundType] * 100)}%</span>
                                <button
                                    type="button"
                                    class="btn btn-inline"
                                    onclick={() => audioManager.preview(soundType)}
                                    disabled={audioManager.muted}
                                >
                                    Test
                                </button>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={audioManager.soundVolumes[soundType]}
                                oninput={(event) =>
                                    audioManager.setSoundVolume(soundType, +(event.target as HTMLInputElement).value)}
                                disabled={audioManager.muted}
                            />

                            <div class="file-picker" class:disabled={audioManager.muted}>
                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <div class="picker-trigger" onclick={() => toggleDropdown(soundType)}>
                                    <span class="picker-label">
                                        {audioManager
                                            .getAvailableFiles(soundType)
                                            .find((file) => file.path === audioManager.soundFiles[soundType])?.label ??
                                            audioManager.soundFiles[soundType]}
                                    </span>
                                    <span class="picker-arrow">{openDropdown === soundType ? "UP" : "DOWN"}</span>
                                </div>

                                {#if openDropdown === soundType}
                                    <div class="picker-menu">
                                        {#each audioManager.getAvailableFiles(soundType) as entry}
                                            <div class="picker-item" class:selected={entry.path === audioManager.soundFiles[soundType]}>
                                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                                <span class="picker-item__label" onclick={() => selectFile(soundType, entry.path)}>
                                                    {entry.label}
                                                    <small>({entry.category})</small>
                                                </span>
                                                <button
                                                    type="button"
                                                    class="btn btn-inline"
                                                    onclick={(event) => previewFile(entry.path, event)}
                                                >
                                                    Play
                                                </button>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>

                            <div class="offset-row">
                                <span>Offset</span>
                                <input
                                    class="offset-slider"
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.01"
                                    value={audioManager.soundOffsets[soundType]}
                                    oninput={(event) =>
                                        audioManager.setSoundOffset(soundType, +(event.target as HTMLInputElement).value)}
                                    disabled={audioManager.muted}
                                />
                                <span>{audioManager.soundOffsets[soundType].toFixed(2)}s</span>
                            </div>
                        </div>
                    {/each}
                </section>

                <section class="section section-accent" class:disabled={audioManager.muted}>
                    <div class="section-head section-head-inline">
                        <div>
                            <p class="eyebrow">Audio</p>
                            <h3>Conquest Signals</h3>
                        </div>

                        <label class="toggle toggle-inline">
                            <input
                                type="checkbox"
                                checked={audioManager.separateConquestSounds}
                                onchange={(event) =>
                                    audioManager.setSeparateConquestSounds((event.target as HTMLInputElement).checked)}
                                disabled={audioManager.muted}
                            />
                            <span>Split Variants</span>
                            <small>{audioManager.separateConquestSounds ? "3 distinct" : "1 generic"}</small>
                        </label>
                    </div>

                    {#each CONQUEST_TYPES as soundType}
                        {@const isSubtype = soundType !== "conquest"}
                        {@const isInactive = isSubtype ? !audioManager.separateConquestSounds : audioManager.separateConquestSounds}

                        <div class="setting-row" class:disabled={audioManager.muted} class:inactive={isInactive}>
                            <div class="setting-header">
                                <span class="setting-name">{SOUND_LABELS[soundType]}</span>
                                <span class="setting-value">{Math.round(audioManager.soundVolumes[soundType] * 100)}%</span>
                                <button
                                    type="button"
                                    class="btn btn-inline"
                                    onclick={() => audioManager.preview(soundType)}
                                    disabled={audioManager.muted}
                                >
                                    Test
                                </button>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={audioManager.soundVolumes[soundType]}
                                oninput={(event) =>
                                    audioManager.setSoundVolume(soundType, +(event.target as HTMLInputElement).value)}
                                disabled={audioManager.muted}
                            />
                        </div>
                    {/each}
                </section>

                <section class="section">
                    <div class="section-head">
                        <div>
                            <p class="eyebrow">Presets</p>
                            <h3>Audio Themes</h3>
                        </div>
                    </div>

                    <div class="preset-row">
                        <select
                            class="select"
                            value={audioManager.selectedThemeName}
                            onchange={(event) => handleApplyTheme((event.target as HTMLSelectElement).value)}
                        >
                            <option value="">Select theme</option>
                            {#each audioManager.getAllThemes() as theme}
                                <option value={theme.name}>{theme.name}{theme.builtIn ? " (built-in)" : ""}</option>
                            {/each}
                        </select>

                        <button
                            type="button"
                            class="btn btn-inline"
                            onclick={() => {
                                showSavePrompt = !showSavePrompt;
                                openDropdown = null;
                            }}
                        >
                            Save
                        </button>

                        {#if audioManager.selectedThemeName && !audioManager.getAllThemes().find((theme) => theme.name === audioManager.selectedThemeName)?.builtIn}
                            <button type="button" class="btn btn-ghost" onclick={() => handleDeleteTheme(audioManager.selectedThemeName)}>
                                Delete
                            </button>
                        {/if}
                    </div>

                    {#if showSavePrompt}
                        <div class="preset-row">
                            <input
                                type="text"
                                class="select"
                                placeholder="Theme name"
                                bind:value={saveThemeName}
                                onkeydown={(event) => {
                                    if (event.key === "Enter") handleSaveTheme();
                                }}
                            />
                            <button type="button" class="btn btn-inline" onclick={handleSaveTheme}>Save</button>
                            <button type="button" class="btn btn-ghost" onclick={() => (showSavePrompt = false)}>
                                Cancel
                            </button>
                        </div>
                    {/if}
                </section>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(2, 5, 12, 0.74);
        backdrop-filter: blur(10px);
        z-index: 10000;
    }

    .modal-content {
        --pf-text: #ecf5ff;
        --pf-heading: #9fdfff;
        --pf-muted: rgba(212, 229, 255, 0.68);
        --pf-border: rgba(123, 195, 255, 0.22);
        --pf-accent: #56d6ff;
        --pf-accent-soft: rgba(109, 212, 255, 0.3);
        --pf-bg: rgba(7, 14, 28, 0.96);
        --pf-bg-soft: rgba(12, 20, 38, 0.9);
        width: min(760px, 100%);
        max-height: 88vh;
        overflow-y: auto;
        border-radius: 28px;
        border: 1px solid var(--pf-border);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 28%), var(--pf-bg);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 28px 64px rgba(0, 0, 0, 0.42);
        color: var(--pf-text);
        font-family: "Rajdhani", sans-serif;
    }

    .modal-content[data-theme="neon"] {
        --pf-text: #eaf8ff;
        --pf-heading: #8fe9ff;
        --pf-muted: rgba(216, 239, 255, 0.68);
        --pf-border: rgba(89, 228, 255, 0.24);
        --pf-accent: #7effe6;
        --pf-accent-soft: rgba(126, 255, 230, 0.28);
        --pf-bg: rgba(6, 14, 34, 0.96);
        --pf-bg-soft: rgba(9, 22, 44, 0.9);
    }

    .modal-content[data-theme="mythic"] {
        --pf-text: #f6eeff;
        --pf-heading: #f0d0ff;
        --pf-muted: rgba(238, 222, 255, 0.68);
        --pf-border: rgba(220, 171, 255, 0.24);
        --pf-accent: #ffce83;
        --pf-accent-soft: rgba(255, 206, 131, 0.24);
        --pf-bg: rgba(22, 15, 38, 0.96);
        --pf-bg-soft: rgba(31, 20, 52, 0.9);
    }

    .modal-header,
    .section-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
    }

    .modal-header {
        position: sticky;
        top: 0;
        padding: 22px 24px 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 120%), var(--pf-bg);
        z-index: 2;
    }

    .eyebrow {
        margin: 0 0 6px;
        font-family: "Oxanium", sans-serif;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--pf-heading);
    }

    h2,
    h3 {
        margin: 0;
        font-family: "Oxanium", sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .subtitle,
    .copy {
        margin: 6px 0 0;
        color: var(--pf-muted);
        font-size: 0.95rem;
    }

    .header-actions,
    .preset-row {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .settings-body {
        display: grid;
        gap: 16px;
        padding: 18px 24px 24px;
    }

    .section {
        display: grid;
        gap: 14px;
        padding: 18px;
        border-radius: 22px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 120%), var(--pf-bg-soft);
    }

    .section-accent {
        border-color: var(--pf-border);
    }

    .theme-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
    }

    .theme-card,
    .btn,
    .select,
    .picker-trigger {
        border: 1px solid var(--pf-border);
        background: rgba(255, 255, 255, 0.04);
        color: var(--pf-text);
    }

    .theme-card,
    .btn,
    .select,
    .picker-trigger,
    input[type="range"] {
        transition: border-color 0.14s ease, background 0.14s ease, transform 0.14s ease;
    }

    .theme-card {
        display: grid;
        gap: 6px;
        min-height: 100px;
        padding: 16px;
        border-radius: 18px;
        text-align: left;
        cursor: pointer;
    }

    .theme-card span {
        font-family: "Oxanium", sans-serif;
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .theme-card small,
    .toggle small,
    .picker-item small {
        color: var(--pf-muted);
        font-size: 0.82rem;
    }

    .theme-card:hover,
    .theme-card.selected,
    .btn:hover,
    .picker-trigger:hover,
    .select:focus {
        border-color: var(--pf-accent);
        background: rgba(255, 255, 255, 0.08);
        outline: none;
    }

    .theme-card.selected {
        box-shadow: inset 0 0 0 1px var(--pf-accent-soft);
    }

    .toggle,
    .setting-header,
    .offset-row {
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .toggle {
        font-weight: 700;
    }

    .toggle input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--pf-accent);
    }

    .setting-row {
        display: grid;
        gap: 8px;
    }

    .setting-row.disabled,
    .setting-row.inactive,
    .file-picker.disabled,
    .section.disabled {
        opacity: 0.42;
        pointer-events: none;
    }

    .setting-name {
        flex: 1;
        color: rgba(236, 244, 255, 0.9);
        font-weight: 700;
    }

    .setting-value,
    .offset-row span:last-child {
        min-width: 44px;
        text-align: right;
        color: var(--pf-heading);
        font-weight: 700;
    }

    .btn {
        min-height: 34px;
        padding: 0 12px;
        border-radius: 12px;
        font-family: "Rajdhani", sans-serif;
        font-size: 0.84rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
    }

    .btn-inline {
        min-width: 58px;
    }

    .btn-close {
        width: 38px;
        min-width: 38px;
        padding: 0;
    }

    .file-picker {
        position: relative;
    }

    .picker-trigger,
    .select {
        width: 100%;
        min-height: 38px;
        padding: 0 12px;
        border-radius: 12px;
        font-family: "Rajdhani", sans-serif;
        font-size: 0.92rem;
    }

    .picker-trigger {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
    }

    .picker-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .picker-arrow {
        margin-left: 10px;
        color: var(--pf-muted);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .picker-menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        z-index: 5;
        display: grid;
        gap: 2px;
        max-height: 220px;
        padding: 8px;
        overflow-y: auto;
        border-radius: 16px;
        border: 1px solid var(--pf-border);
        background: rgba(5, 12, 24, 0.98);
        box-shadow: 0 18px 30px rgba(0, 0, 0, 0.28);
    }

    .picker-item {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 8px 10px;
        border-radius: 12px;
    }

    .picker-item.selected {
        background: rgba(255, 255, 255, 0.08);
    }

    .picker-item__label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
    }

    .offset-slider {
        flex: 1;
    }

    input[type="range"] {
        width: 100%;
        accent-color: var(--pf-accent);
    }

    @media (max-width: 767px) {
        .modal-overlay {
            padding: 12px;
        }

        .modal-content {
            max-height: 92vh;
            border-radius: 22px;
        }

        .modal-header,
        .section-head,
        .section-head-inline,
        .preset-row {
            flex-direction: column;
            align-items: stretch;
        }

        .theme-grid {
            grid-template-columns: 1fr;
        }

        .header-actions {
            justify-content: space-between;
        }

        .setting-header {
            flex-wrap: wrap;
        }
    }
</style>
