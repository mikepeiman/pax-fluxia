<script lang="ts">
    import {
        audioManager,
        SOUND_LABELS,
        ALL_SOUND_TYPES,
        type SoundType,
    } from "$lib/services/audioManager.svelte";
    import { getFilesForSoundType } from "$lib/config/soundManifest";
    import { CONFIG_TO_PANEL_KEY } from "../settingsDefs";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-AUDIO — In-Game Settings Controls: Audio
    // Wraps audioManager reactive state through the panel system.

    const CONQUEST_TYPES: SoundType[] = [
        "conquest",
        "conquest_retreat",
        "conquest_scatter",
        "conquest_complete",
    ];
    const NON_CONQUEST_TYPES = ALL_SOUND_TYPES.filter(
        (t) => !CONQUEST_TYPES.includes(t),
    );

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }
    let { panel, updatePanel, syncFromConfig }: Props = $props();

    // Track which file-picker dropdown is open
    let openDropdown = $state<string | null>(null);

    function toggleDropdown(type: string) {
        openDropdown = openDropdown === type ? null : type;
    }

    function selectFile(type: SoundType, path: string) {
        audioManager.setSoundFile(type, path);
        openDropdown = null;
        // Sync to panel state
        const configKey = `AUDIO_FILE_${type.toUpperCase()}`;
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey) updatePanel(panelKey, path);
    }

    function previewFile(path: string, e: MouseEvent) {
        e.stopPropagation();
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
</script>

<CategoryThemeBar category="audio" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Master</h4>
<div class="setting-row master-row">
    <label class="master-toggle">
        <input
            type="checkbox"
            checked={!audioManager.muted}
            onchange={() => {
                audioManager.toggleMute();
                updatePanel("audioMuted", audioManager.muted);
            }}
        />
        <span class="toggle-label">Sound Enabled</span>
    </label>
</div>

<div class="setting-row" class:disabled={audioManager.muted}>
    <div class="row-top">
        <span class="var-name">Master Volume</span>
        <span class="val">{Math.round(audioManager.masterVolume * 100)}%</span>
    </div>
    <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={audioManager.masterVolume}
        oninput={(e) => {
            const v = +(e.target as HTMLInputElement).value;
            audioManager.setMasterVolume(v);
            updatePanel("audioMasterVolume", v);
        }}
        disabled={audioManager.muted}
    />
</div>

<h4 class="sub-heading">Event Sounds</h4>
<!-- Per-Sound Volume + File + Offset (non-conquest) -->
{#each NON_CONQUEST_TYPES as stype}
    <div class="setting-row" class:disabled={audioManager.muted}>
        <div class="row-top">
            <span class="var-name">{SOUND_LABELS[stype]}</span>
            <span class="val"
                >{Math.round(audioManager.soundVolumes[stype] * 100)}%</span
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
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                audioManager.setSoundVolume(stype, v);
                const configKey = `AUDIO_VOL_${stype.toUpperCase()}`;
                const panelKey = CONFIG_TO_PANEL_KEY[configKey];
                if (panelKey) updatePanel(panelKey, v);
            }}
            disabled={audioManager.muted}
        />
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="file-picker"
            class:disabled={audioManager.muted}
            onclick={(e) => handleClickOutside(e)}
        >
            <div
                class="file-picker-trigger"
                onclick={() => toggleDropdown(stype)}
            >
                <span class="file-picker-label">
                    {audioManager
                        .getAvailableFiles(stype)
                        .find((f) => f.path === audioManager.soundFiles[stype])
                        ?.label ?? audioManager.soundFiles[stype]}
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
                                onclick={() => selectFile(stype, entry.path)}
                            >
                                {entry.label}
                                <span class="file-picker-item-cat"
                                    >({entry.category})</span
                                >
                            </span>
                            <button
                                class="file-picker-play"
                                onclick={(e) => previewFile(entry.path, e)}
                                title="Preview this sound">▶</button
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
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    audioManager.setSoundOffset(stype, v);
                    const configKey = `AUDIO_OFFSET_${stype.toUpperCase()}`;
                    const panelKey = CONFIG_TO_PANEL_KEY[configKey];
                    if (panelKey) updatePanel(panelKey, v);
                }}
                disabled={audioManager.muted}
                class="offset-slider"
            />
            <span class="offset-value"
                >{audioManager.soundOffsets[stype].toFixed(2)}s</span
            >
        </div>
    </div>
{/each}

<h4 class="sub-heading">Conquest Sounds</h4>
<div class="conquest-group" class:disabled={audioManager.muted}>
    <div class="conquest-group-header">
        <span class="conquest-group-title">Conquest Sounds</span>
        <label class="toggle-inline conquest-toggle">
            <input
                type="checkbox"
                checked={audioManager.separateConquestSounds}
                onchange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    audioManager.setSeparateConquestSounds(v);
                    updatePanel("audioSeparateConquest", v);
                }}
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
            <div class="row-top">
                <span class="var-name">{SOUND_LABELS[stype]}</span>
                <span class="val"
                    >{Math.round(audioManager.soundVolumes[stype] * 100)}%</span
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
                oninput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    audioManager.setSoundVolume(stype, v);
                    const configKey = `AUDIO_VOL_${stype.toUpperCase()}`;
                    const panelKey = CONFIG_TO_PANEL_KEY[configKey];
                    if (panelKey) updatePanel(panelKey, v);
                }}
                disabled={audioManager.muted}
            />
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="file-picker" class:disabled={audioManager.muted}>
                <div
                    class="file-picker-trigger"
                    onclick={() => toggleDropdown(stype)}
                >
                    <span class="file-picker-label">
                        {audioManager
                            .getAvailableFiles(stype)
                            .find(
                                (f) =>
                                    f.path === audioManager.soundFiles[stype],
                            )?.label ?? audioManager.soundFiles[stype]}
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
                                        selectFile(stype, entry.path)}
                                >
                                    {entry.label}
                                    <span class="file-picker-item-cat"
                                        >({entry.category})</span
                                    >
                                </span>
                                <button
                                    class="file-picker-play"
                                    onclick={(e) => previewFile(entry.path, e)}
                                    title="Preview this sound">▶</button
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
                    oninput={(e) => {
                        const v = +(e.target as HTMLInputElement).value;
                        audioManager.setSoundOffset(stype, v);
                        const configKey = `AUDIO_OFFSET_${stype.toUpperCase()}`;
                        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
                        if (panelKey) updatePanel(panelKey, v);
                    }}
                    disabled={audioManager.muted}
                    class="offset-slider"
                />
                <span class="offset-value"
                    >{audioManager.soundOffsets[stype].toFixed(2)}s</span
                >
            </div>
        </div>
    {/each}
</div>

<style>
    @import "./panel-shared.css";

    .master-row {
        margin-bottom: 4px;
    }
    .master-toggle {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
    }
    .master-toggle input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: #00ffff;
    }
    .toggle-label {
        font-size: 0.8rem;
        color: #dde;
    }
    .setting-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px 10px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);
    }
    .setting-row.disabled {
        opacity: 0.35;
        pointer-events: none;
    }
    .test-btn {
        background: rgba(0, 255, 255, 0.08);
        border: 1px solid #00aaaa;
        color: #0ff;
        padding: 1px 6px;
        font-size: 0.6rem;
        border-radius: 3px;
        cursor: pointer;
    }
    .test-btn:hover:not(:disabled) {
        background: rgba(0, 255, 255, 0.18);
    }

    /* ── File picker ── */
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
        font-size: 0.68rem;
        min-height: 32px;
        padding: 6px 8px;
        border-radius: 7px;
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
        font-size: 0.5rem;
        color: #667;
        margin-left: 4px;
    }
    .file-picker-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 100;
        background: #0a0f1e;
        border: 1px solid #00aaaa;
        border-radius: 3px;
        margin-top: 1px;
        max-height: 150px;
        overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    }
    .file-picker-item {
        display: flex;
        align-items: center;
        padding: 3px 6px;
        cursor: pointer;
        font-size: 0.65rem;
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
        font-size: 0.55rem;
        margin-left: 3px;
    }
    .file-picker-play {
        background: none;
        border: 1px solid rgba(0, 255, 255, 0.3);
        color: #0ff;
        font-size: 0.55rem;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-left: 4px;
    }
    .file-picker-play:hover {
        background: rgba(0, 255, 255, 0.1);
    }

    /* ── Offset row ── */
    .offset-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-left: 2px;
    }
    .offset-label {
        font-size: 0.6rem;
        color: #667;
        min-width: 30px;
    }
    .offset-slider {
        flex: 1;
    }
    .offset-value {
        font-size: 0.6rem;
        color: #0ff;
        min-width: 28px;
        text-align: right;
    }

    /* ── Conquest group ── */
    .conquest-group {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 8px;
        margin-top: 4px;
        background: rgba(255, 255, 255, 0.025);
    }
    .conquest-group.disabled {
        opacity: 0.35;
        pointer-events: none;
    }
    .conquest-group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
    }
    .conquest-group-title {
        font-size: 0.75rem;
        color: #ff66aa;
        font-weight: 600;
    }
    .toggle-inline {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
    }
    .toggle-hint {
        font-size: 0.55rem;
        color: #667;
    }
    :global(.conquest-inactive) {
        opacity: 0.25 !important;
        pointer-events: none;
    }
</style>
