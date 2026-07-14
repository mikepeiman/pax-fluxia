<script lang="ts">
  import "./panel-shared.css";
    import { PaxHudButton, PaxSettingsToggleRow } from "$lib/design-system";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { logFlags } from "$lib/utils/logger";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-LOGGING -- Logging controls (extracted from GameSettingsPanel.svelte)

    interface Props {
        logCategories: readonly any[] | any[];
        logRefresh: number;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }
    let { logCategories, logRefresh, updatePanel, syncFromConfig }: Props = $props();

    function gridGradientTraceEnabled(): boolean {
        return Boolean(
            (GAME_CONFIG as unknown as Record<string, unknown>)
                .GRID_GRADIENT_DEBUG_TRANSITIONS,
        );
    }

    function setGridGradientTraceEnabled(enabled: boolean): void {
        // Through the panel, not a raw GAME_CONFIG write: the key is in
        // PANEL_CONFIG_MAP, so boot-time applyPanelToConfig replays the panel's
        // stored value over config — a raw write here persisted, then got
        // clobbered back to the stale panel snapshot on the next reload.
        updatePanel("gridGradientDebugTransitions", enabled);
        logRefresh++;
    }
</script>

<CategoryThemeBar category="logging" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Log Channels</h4>
<div class="log-actions">
    <PaxHudButton
        label="All On"
        size="sm"
        onclick={() => {
            Object.keys(logFlags).forEach(
                (k) => ((logFlags as any)[k] = true),
            );
            logRefresh++;
        }}
    />
    <PaxHudButton
        label="All Off"
        size="sm"
        onclick={() => {
            Object.keys(logFlags).forEach((k) => {
                if (k !== "error")
                    (logFlags as any)[k] = false;
            });
            logRefresh++;
        }}
    />
</div>
{#each logCategories as cat}
    {#key logRefresh}
        <PaxSettingsToggleRow
            label={cat.label}
            checked={(logFlags as any)[cat.key]}
            description={cat.desc}
            settingConfigKey={`local.logFlags.${cat.key}`}
            onChange={(checked) => {
                (logFlags as any)[cat.key] = checked;
                logRefresh++;
            }}
        />
    {/key}
{/each}
{#key logRefresh}
    <PaxSettingsToggleRow
        label="Grid Gradient transition trace"
        checked={gridGradientTraceEnabled()}
        description="Renderer trace: filter logs for [GG_TRANSITION]."
        settingConfigKey="GRID_GRADIENT_DEBUG_TRANSITIONS"
        onChange={(checked) => setGridGradientTraceEnabled(checked)} />
{/key}

<style>

    .log-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pax-space-2);
    }
</style>
