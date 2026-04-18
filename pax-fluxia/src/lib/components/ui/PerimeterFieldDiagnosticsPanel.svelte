<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import PerimeterFieldTuning from '$lib/components/ui/settings/PerimeterFieldTuning.svelte';
    import { setSetting } from '$lib/components/ui/settingsState';
    import { perimeterFieldDebugPlaybackStore } from '$lib/territory/families/perimeterField/perimeterFieldDebugPlaybackStore';
    import {
        panelDefaultsFromConfig,
        savePanelSettings,
        syncPanelFromConfig,
    } from '$lib/components/ui/panelSync';
    import { enhanceSettingMetadata } from '$lib/components/ui/settings/settingMetadata';

    let panel = $state(
        panelDefaultsFromConfig(GAME_CONFIG as unknown as Record<string, any>),
    );

    function updatePanel(key: string, value: unknown): void {
        panel = setSetting(panel, key, value, savePanelSettings);
    }

    function refreshFromLiveConfig(): void {
        panel = syncPanelFromConfig(
            panel,
            GAME_CONFIG as unknown as Record<string, any>,
        );
    }

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as Record<string, unknown>)[configKey] = value;
        panel = setSetting(panel, panelKey, value, savePanelSettings);
    }

    function clearConquestCaptures(): void {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('pax-clear-perimeter-field-captures'));
    }

    function formatReplayStatusLabel(frameCount: number): string {
        if (frameCount <= 0) return 'empty';
        return `${frameCount} frame${frameCount === 1 ? '' : 's'}`;
    }
</script>

<div class="perimeter-diagnostics-panel" use:enhanceSettingMetadata={{ scope: 'territory' }}>
    <div class="panel-head">
        <div>
            <div class="panel-title">Perimeter Field Diagnostics</div>
            <div class="panel-copy">
                This is the only place for perimeter-field scrub, vstar overlays,
                geometry export, conquest package export, contact sheet export,
                onion-skin ghosts, and stroboscopic trails.
            </div>
        </div>
        <button
            type="button"
            class="refresh-btn"
            onclick={refreshFromLiveConfig}
            title="Refresh these controls from the current live config"
        >
            Refresh Live Values
        </button>
    </div>

    <div class="capture-strip">
        <label class="capture-toggle">
            <input
                type="checkbox"
                checked={panel.perimeterFieldDebugCaptureEnabled ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_CAPTURE_ENABLED ?? false}
                onchange={(event) => {
                    const value = (event.target as HTMLInputElement).checked;
                    writeConfig(
                        'PERIMETER_FIELD_DEBUG_CAPTURE_ENABLED',
                        'perimeterFieldDebugCaptureEnabled',
                        value,
                    );
                }}
            />
            <span class="capture-copy">
                <span class="capture-label">Record Conquest</span>
                <span class="capture-desc">
                    Turn this on before a conquest if you want scrub, replay slots,
                    package export, and contact-sheet export to have data.
                </span>
            </span>
            <span class="capture-state">
                {(panel.perimeterFieldDebugCaptureEnabled ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_CAPTURE_ENABLED ?? false)
                    ? 'On'
                    : 'Off'}
            </span>
        </label>
        <div class="capture-actions">
            <button
                type="button"
                class="refresh-btn clear-btn"
                onclick={clearConquestCaptures}
            >
                Clear Captured Conquests
            </button>
            <div class="capture-status">
                live {formatReplayStatusLabel($perimeterFieldDebugPlaybackStore.liveFrameCount)}
                · replay 1 {formatReplayStatusLabel($perimeterFieldDebugPlaybackStore.replayFrameCounts[0])}
                · replay 2 {formatReplayStatusLabel($perimeterFieldDebugPlaybackStore.replayFrameCounts[1])}
                · replay 3 {formatReplayStatusLabel($perimeterFieldDebugPlaybackStore.replayFrameCounts[2])}
            </div>
        </div>
    </div>

    <PerimeterFieldTuning
        {panel}
        {updatePanel}
        visibleModules={['diagnostics']}
        showCaptureControls={false}
    />
</div>

<style>
    .perimeter-diagnostics-panel {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .panel-head {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .panel-title {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(180, 130, 255, 0.86);
        margin-bottom: 4px;
    }

    .panel-copy {
        font-size: 0.72rem;
        line-height: 1.45;
        color: rgba(200, 206, 224, 0.72);
    }

    .capture-strip {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(87, 248, 255, 0.18);
        background: rgba(17, 24, 39, 0.54);
    }

    .capture-toggle {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 10px;
        align-items: start;
        cursor: pointer;
    }

    .capture-copy {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .capture-label {
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(236, 245, 255, 0.96);
    }

    .capture-desc {
        font-size: 0.72rem;
        line-height: 1.45;
        color: rgba(200, 206, 224, 0.78);
    }

    .capture-state {
        align-self: center;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(87, 248, 255, 0.92);
    }

    .capture-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .clear-btn {
        align-self: flex-start;
    }

    .capture-status {
        font-size: 0.7rem;
        line-height: 1.4;
        color: rgba(200, 206, 224, 0.68);
    }

    .refresh-btn {
        align-self: flex-start;
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(220, 220, 240, 0.82);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
    }

    .refresh-btn:hover {
        border-color: rgba(180, 130, 255, 0.38);
        background: rgba(180, 130, 255, 0.12);
        color: rgba(248, 250, 252, 0.96);
    }
</style>
