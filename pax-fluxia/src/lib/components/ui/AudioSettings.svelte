<script lang="ts">
    import { browser } from "$app/environment";
    import {
        audioManager,
        SOUND_LABELS,
        ALL_SOUND_TYPES,
        type SoundType,
    } from "$lib/services/audioManager.svelte";
    import { fade, fly } from "svelte/transition";
    import { getMenuThemeCssVars, type MenuTheme } from "./main-menu/menuTheme";
    import PaxSettingsToggleRow from "$lib/design-system/components/PaxSettingsToggleRow.svelte";

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
        onClose: () => void;
    }

    let { visible, menuTheme, onClose }: Props = $props();

    let openDropdown = $state<SoundType | null>(null);
    let showSavePrompt = $state(false);
    let saveThemeName = $state("");

    function portal(node: HTMLElement) {
        if (!browser) {
            return {};
        }

        document.body.appendChild(node);

        return {
            destroy() {
                if (node.parentNode === document.body) {
                    document.body.removeChild(node);
                }
            },
        };
    }

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

    $effect(() => {
        if (!browser || !visible) return;

        const previousOverflow = document.body.style.overflow;
        const previousTouchAction = document.body.style.touchAction;

        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.touchAction = previousTouchAction;
        };
    });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="modal-overlay"
        use:portal
        style={getMenuThemeCssVars(menuTheme)}
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
            onclick={(event) => {
                event.stopPropagation();
                handleClickInside(event);
            }}
            transition:fly={{ y: 20, duration: 220 }}
        >
            <div class="modal-header">
                <div>
                    <p class="eyebrow">Audio Settings</p>
                    <h2>Signal Mixer</h2>
                    <p class="subtitle">Tune battle cues, saved themes, and live output from one surface.</p>
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
                            <p class="eyebrow">Master</p>
                            <h3>Output</h3>
                        </div>
                    </div>

                    <PaxSettingsToggleRow
                        label="Sound Enabled"
                        checked={!audioManager.muted}
                        onChange={() => audioManager.toggleMute()} />

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

                        <PaxSettingsToggleRow
                            label="Split Variants"
                            checked={audioManager.separateConquestSounds}
                            disabled={audioManager.muted}
                            meta={audioManager.separateConquestSounds ? "3 distinct" : "1 generic"}
                            onChange={(checked) => audioManager.setSeparateConquestSounds(checked)} />
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
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 24px;
        overflow-y: auto;
        overscroll-behavior: contain;
        background: var(--pf-overlay-modal-scrim);
        backdrop-filter: blur(10px);
        z-index: 10000;
    }

    .modal-content {
        position: relative;
        width: min(760px, calc(100vw - 48px));
        max-height: 88vh;
        margin: 0 auto;
        overflow-y: auto;
        border-radius: var(--pf-title-radius);
        border: 1px solid var(--pf-border-strong);
        background: var(--pf-frame-modal), var(--pf-surface-modal);
        box-shadow: var(--pf-shadow-elevated);
        color: var(--pf-text);
        font-family: var(--pf-font-body);
    }

    .modal-content::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 220px;
        background: center top / cover no-repeat var(--pf-theme-banner-art);
        opacity: 0.18;
        pointer-events: none;
        mix-blend-mode: screen;
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
        border-bottom: 1px solid var(--pf-divider);
        background: var(--pf-surface-modal);
        z-index: 2;
    }

    .eyebrow {
        margin: 0 0 6px;
        font-family: var(--pf-font-display);
        font-size: var(--pax-type-xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--pf-heading);
    }

    h2,
    h3 {
        margin: 0;
        font-family: var(--pf-font-display);
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .subtitle {
        margin: 6px 0 0;
        color: var(--pf-muted);
        font-size: var(--pax-type-sm-plus);
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

    .modal-content > * {
        position: relative;
        z-index: 1;
    }

    .section {
        display: grid;
        gap: 14px;
        padding: 18px;
        border-radius: var(--pf-card-radius);
        border: 1px solid var(--pf-border-faint);
        background: var(--pf-frame-panel), var(--pf-surface-card);
    }

    .section-accent {
        border-color: var(--pf-border-strong);
    }

    .btn,
    .select,
    .picker-trigger {
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-frame-control), var(--pf-surface-control);
        color: var(--pf-text);
    }

    .btn,
    .select,
    .picker-trigger,
    input[type="range"] {
        transition: border-color 0.14s ease, background 0.14s ease, transform 0.14s ease;
    }
    .picker-item small {
        color: var(--pf-muted);
        font-size: var(--pax-type-xs-plus);
    }

    .btn:hover,
    .picker-trigger:hover,
    .select:focus {
        border-color: var(--pf-accent-strong);
        background: var(--pf-frame-control), var(--pf-surface-control-hover);
        outline: none;
    }

    .setting-header,
    .offset-row {
        display: flex;
        gap: 10px;
        align-items: center;
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
        color: var(--pf-text);
        font-weight: var(--pax-weight-bold);
    }

    .setting-value,
    .offset-row span:last-child {
        min-width: 44px;
        text-align: right;
        color: var(--pf-heading);
        font-weight: var(--pax-weight-bold);
    }

    .btn {
        min-height: 34px;
        padding: 0 12px;
        border-radius: var(--pf-button-radius);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-xs-plus);
        font-weight: var(--pax-weight-bold);
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
        border-radius: var(--pf-button-radius);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-sm-plus);
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
        font-size: var(--pax-type-xs);
        font-weight: var(--pax-weight-bold);
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
        border: 1px solid var(--pf-border-strong);
        background: var(--pf-surface-elevated);
        box-shadow: var(--pf-shadow-elevated);
    }

    .picker-item {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 8px 10px;
        border-radius: 12px;
    }

    .picker-item.selected {
        background: var(--pf-surface-pill-active);
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
        accent-color: var(--pf-accent-strong);
    }

    @media (max-width: 767px) {
        .modal-overlay {
            padding: 12px;
        }

        .modal-content {
            width: min(760px, calc(100vw - 24px));
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

        .header-actions {
            justify-content: space-between;
        }

        .setting-header {
            flex-wrap: wrap;
        }
    }
</style>
