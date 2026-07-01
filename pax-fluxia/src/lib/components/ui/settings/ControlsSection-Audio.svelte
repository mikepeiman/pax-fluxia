<script lang="ts">
  import "./panel-shared.css";
    import {
        audioManager,
        SOUND_LABELS,
        ALL_SOUND_TYPES,
        type SoundType,
    } from "$lib/services/audioManager.svelte";
    import {
        PaxHudButton,
        PaxHudIconButton,
        PaxSettingsPickerRow,
        PaxSettingsRangeRow,
        PaxSettingsToggleRow,
        type PaxSettingsPickerOption,
    } from "$lib/design-system";
    import { CONFIG_TO_PANEL_KEY } from "../settingsDefs";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-AUDIO - In-Game Settings Controls: Audio
    // Wraps audioManager reactive state through the panel system.

    const CONQUEST_TYPES: SoundType[] = [
        "conquest",
        "conquest_retreat",
        "conquest_scatter",
        "conquest_complete",
    ];
    const NON_CONQUEST_TYPES = ALL_SOUND_TYPES.filter(
        (type) => !CONQUEST_TYPES.includes(type),
    );

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { updatePanel, syncFromConfig }: Props = $props();

    let openPicker = $state<string | null>(null);

    function configPanelKey(prefix: string, type: SoundType) {
        return CONFIG_TO_PANEL_KEY[`AUDIO_${prefix}_${type.toUpperCase()}`];
    }

    function fileOptions(type: SoundType): PaxSettingsPickerOption[] {
        return audioManager.getAvailableFiles(type).map((entry) => ({
            value: entry.path,
            label: entry.label,
            meta: entry.category,
        }));
    }

    function selectedFileLabel(type: SoundType): string {
        return (
            audioManager
                .getAvailableFiles(type)
                .find((entry) => entry.path === audioManager.soundFiles[type])
                ?.label ?? audioManager.soundFiles[type]
        );
    }

    function togglePicker(type: SoundType) {
        openPicker = openPicker === type ? null : type;
    }

    function setSoundEnabled(enabled: boolean) {
        if (enabled !== !audioManager.muted) {
            audioManager.toggleMute();
        }
        updatePanel("audioMuted", audioManager.muted);
    }

    function setMasterVolume(value: number) {
        audioManager.setMasterVolume(value);
        updatePanel("audioMasterVolume", value);
    }

    function setSoundVolume(type: SoundType, value: number) {
        audioManager.setSoundVolume(type, value);
        const panelKey = configPanelKey("VOL", type);
        if (panelKey) updatePanel(panelKey, value);
    }

    function setSoundFile(type: SoundType, path: string) {
        audioManager.setSoundFile(type, path);
        openPicker = null;
        const panelKey = configPanelKey("FILE", type);
        if (panelKey) updatePanel(panelKey, path);
    }

    function previewFile(path: string) {
        const audio = new Audio(`/sounds/${path}`);
        audio.volume = audioManager.masterVolume * 0.6;
        audio.play().catch(() => {});
    }

    function setSoundOffset(type: SoundType, value: number) {
        audioManager.setSoundOffset(type, value);
        const panelKey = configPanelKey("OFFSET", type);
        if (panelKey) updatePanel(panelKey, value);
    }

    function setSeparateConquestSounds(value: boolean) {
        audioManager.setSeparateConquestSounds(value);
        updatePanel("audioSeparateConquest", value);
    }
</script>

<CategoryThemeBar category="audio" onApply={() => syncFromConfig?.()} />

<div data-subsection-id="master">
<h4 class="sub-heading">Master</h4>
<PaxSettingsToggleRow
    label="Sound Enabled"
    checked={!audioManager.muted}
    description="Master switch for the full audio mixer."
    meta={audioManager.muted ? "Muted" : "On"}
    settingConfigKey="AUDIO_MUTED"
    onChange={setSoundEnabled}
/>

<PaxSettingsRangeRow
    label="Master Volume"
    value={audioManager.masterVolume}
    min={0}
    max={1}
    step={0.05}
    output={`${Math.round(audioManager.masterVolume * 100)}%`}
    disabled={audioManager.muted}
    settingConfigKey="AUDIO_MASTER_VOLUME"
    onInput={setMasterVolume}
/>
</div>

<div data-subsection-id="event-sounds">
<h4 class="sub-heading">Event Sounds</h4>
{#each NON_CONQUEST_TYPES as soundType}
    <section
        class="audio-sound-card"
        class:audio-sound-card--disabled={audioManager.muted}
    >
        <div class="audio-sound-card__header">
            <span
                class="audio-sound-card__label"
                data-setting-config-key={`AUDIO_VOL_${soundType.toUpperCase()}`}
                data-setting-description="Volume multiplier for this sound event."
            >
                {SOUND_LABELS[soundType]}
            </span>
            <PaxHudIconButton
                icon="play-1"
                title="Test this sound"
                disabled={audioManager.muted}
                onclick={() => audioManager.preview(soundType)}
            />
        </div>

        <PaxSettingsRangeRow
            label="Volume"
            value={audioManager.soundVolumes[soundType]}
            min={0}
            max={1}
            step={0.05}
            output={`${Math.round(audioManager.soundVolumes[soundType] * 100)}%`}
            disabled={audioManager.muted}
            settingConfigKey={`AUDIO_VOL_${soundType.toUpperCase()}`}
            onInput={(value) => setSoundVolume(soundType, value)}
        />

        <PaxSettingsPickerRow
            label="File"
            value={audioManager.soundFiles[soundType]}
            selectedLabel={selectedFileLabel(soundType)}
            options={fileOptions(soundType)}
            open={openPicker === soundType}
            disabled={audioManager.muted}
            settingConfigKey={`AUDIO_FILE_${soundType.toUpperCase()}`}
            settingLabel={`${SOUND_LABELS[soundType]} File`}
            description="Selected sound file for this sound event."
            onToggle={() => togglePicker(soundType)}
            onSelect={(value) => setSoundFile(soundType, value)}
            onPreview={previewFile}
        />

        <PaxSettingsRangeRow
            label="Offset"
            value={audioManager.soundOffsets[soundType]}
            min={0}
            max={2}
            step={0.01}
            output={`${audioManager.soundOffsets[soundType].toFixed(2)}s`}
            disabled={audioManager.muted}
            settingConfigKey={`AUDIO_OFFSET_${soundType.toUpperCase()}`}
            settingDescription="Playback offset applied to this sound event."
            onInput={(value) => setSoundOffset(soundType, value)}
        />
    </section>
{/each}
</div>

<div data-subsection-id="conquest">
<h4 class="sub-heading">Conquest Sounds</h4>
<section
    class="audio-conquest-group"
    class:audio-conquest-group--disabled={audioManager.muted}
>
    <div class="audio-conquest-group__header">
        <span class="audio-conquest-group__title">Conquest Sound Routing</span>
        <PaxSettingsToggleRow
            class="audio-conquest-group__toggle"
            label="Separate"
            checked={audioManager.separateConquestSounds}
            description="Use subtype-specific conquest sounds instead of a shared clip."
            meta={audioManager.separateConquestSounds ? "3 distinct" : "1 generic"}
            disabled={audioManager.muted}
            settingConfigKey="AUDIO_SEPARATE_CONQUEST"
            onChange={setSeparateConquestSounds}
        />
    </div>

    {#each CONQUEST_TYPES as soundType}
        {@const isSubtype = soundType !== "conquest"}
        {@const isInactive = isSubtype
            ? !audioManager.separateConquestSounds
            : audioManager.separateConquestSounds}
        {@const isDisabled = audioManager.muted || isInactive}
        <section
            class="audio-sound-card"
            class:audio-sound-card--disabled={isDisabled}
        >
            <div class="audio-sound-card__header">
                <span
                    class="audio-sound-card__label"
                    data-setting-config-key={`AUDIO_VOL_${soundType.toUpperCase()}`}
                    data-setting-description="Volume multiplier for this sound event."
                >
                    {SOUND_LABELS[soundType]}
                </span>
                <PaxHudIconButton
                    icon="play-1"
                    title="Test this sound"
                    disabled={isDisabled}
                    onclick={() => audioManager.preview(soundType)}
                />
            </div>

            <PaxSettingsRangeRow
                label="Volume"
                value={audioManager.soundVolumes[soundType]}
                min={0}
                max={1}
                step={0.05}
                output={`${Math.round(audioManager.soundVolumes[soundType] * 100)}%`}
                disabled={isDisabled}
                settingConfigKey={`AUDIO_VOL_${soundType.toUpperCase()}`}
                onInput={(value) => setSoundVolume(soundType, value)}
            />

            <PaxSettingsPickerRow
                label="File"
                value={audioManager.soundFiles[soundType]}
                selectedLabel={selectedFileLabel(soundType)}
                options={fileOptions(soundType)}
                open={openPicker === soundType}
                disabled={isDisabled}
                settingConfigKey={`AUDIO_FILE_${soundType.toUpperCase()}`}
                settingLabel={`${SOUND_LABELS[soundType]} File`}
                description="Selected sound file for this sound event."
                onToggle={() => togglePicker(soundType)}
                onSelect={(value) => setSoundFile(soundType, value)}
                onPreview={previewFile}
            />

            <PaxSettingsRangeRow
                label="Offset"
                value={audioManager.soundOffsets[soundType]}
                min={0}
                max={2}
                step={0.01}
                output={`${audioManager.soundOffsets[soundType].toFixed(2)}s`}
                disabled={isDisabled}
                settingConfigKey={`AUDIO_OFFSET_${soundType.toUpperCase()}`}
                settingDescription="Playback offset applied to this sound event."
                onInput={(value) => setSoundOffset(soundType, value)}
            />
        </section>
    {/each}
</section>
</div>

<style>

    .audio-sound-card,
    .audio-conquest-group {
        min-width: 0;
        display: grid;
        gap: var(--pax-space-2);
        padding: var(--pax-space-2) var(--pax-gap-sm);
        border-radius: var(--pax-ui-radius-sm);
        /* Lighter treatment (AUD-3): subtle fill, no gradient border, to reduce
           the boxes-in-boxes busyness. No clip-path (would clip the File dropdown). */
        background: color-mix(in srgb, var(--pax-color-void) 50%, transparent);
    }

    .audio-sound-card--disabled,
    .audio-conquest-group--disabled {
        opacity: 0.46;
    }

    .audio-sound-card__header,
    .audio-conquest-group__header {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--pax-gap-sm);
    }

    .audio-sound-card__label,
    .audio-conquest-group__title {
        min-width: 0;
        overflow: hidden;
        color: var(--pax-ui-text);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.78rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.06em;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
    }

    :global(.audio-conquest-group__toggle) {
        min-width: 180px;
        padding: 7px var(--pax-space-2);
    }
</style>
