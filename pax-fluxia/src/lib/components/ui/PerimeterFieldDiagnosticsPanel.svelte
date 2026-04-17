<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import PerimeterFieldTuning from '$lib/components/ui/settings/PerimeterFieldTuning.svelte';
    import { setSetting } from '$lib/components/ui/settingsState';
    import {
        panelDefaultsFromConfig,
        savePanelSettings,
        syncPanelFromConfig,
    } from '$lib/components/ui/panelSync';

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
</script>

<div class="perimeter-diagnostics-panel">
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

    <PerimeterFieldTuning {panel} {updatePanel} />
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
