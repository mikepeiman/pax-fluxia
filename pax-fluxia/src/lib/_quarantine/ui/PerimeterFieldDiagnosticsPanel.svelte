<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import PerimeterFieldDiagnosticsControls from '$lib/components/ui/settings/PerimeterFieldDiagnosticsControls.svelte';
    import { setSetting } from '$lib/components/ui/settingsState';
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
</script>

<div
    class="perimeter-diagnostics-panel"
    use:enhanceSettingMetadata={{ scope: 'territory' }}
>
    <div class="panel-head">
        <button
            type="button"
            class="refresh-btn"
            onclick={refreshFromLiveConfig}
            title="Refresh these controls from the current live config"
        >
            Refresh Live Values
        </button>
    </div>

    <PerimeterFieldDiagnosticsControls {panel} {updatePanel} />
</div>

<style>
    .perimeter-diagnostics-panel {
        display: flex;
        flex-direction: column;
        gap: var(--pax-gap-sm);
    }

    .panel-head {
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-2);
    }
</style>
