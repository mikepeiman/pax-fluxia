<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { logFlags } from "$lib/utils/logger";
    import CategoryThemeBar from './CategoryThemeBar.svelte';

    // ControlsSection-LOGGING -- Logging controls (extracted from GameSettingsPanel.svelte)

    interface Props {
        logCategories: readonly any[] | any[];
        logRefresh: number;
        syncFromConfig?: () => void;
    }
    let { logCategories, logRefresh, syncFromConfig }: Props = $props();

    function gridGradientTraceEnabled(): boolean {
        return Boolean(
            (GAME_CONFIG as unknown as Record<string, unknown>)
                .GRID_GRADIENT_DEBUG_TRANSITIONS,
        );
    }

    function setGridGradientTraceEnabled(enabled: boolean): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)
            .GRID_GRADIENT_DEBUG_TRANSITIONS = enabled;
        if (enabled) {
            (logFlags as any).renderer = true;
        }
        logRefresh++;
    }
</script>

<CategoryThemeBar category="logging" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Log Channels</h4>
<div class="log-actions">
    <button
        class="btn-xs"
        onclick={() => {
            Object.keys(logFlags).forEach(
                (k) => ((logFlags as any)[k] = true),
            );
            logRefresh++;
        }}>All On</button
    >
    <button
        class="btn-xs"
        onclick={() => {
            Object.keys(logFlags).forEach((k) => {
                if (k !== "error")
                    (logFlags as any)[k] = false;
            });
            logRefresh++;
        }}>All Off</button
    >
</div>
{#each logCategories as cat}
    {#key logRefresh}
        <label class="toggle-row">
            <input
                type="checkbox"
                checked={(logFlags as any)[cat.key]}
                onchange={(e) => {
                    (logFlags as any)[cat.key] = (
                        e.target as HTMLInputElement
                    ).checked;
                    logRefresh++;
                }}
            />
            <span
                class="log-label"
                data-setting-config-key={`local.logFlags.${cat.key}`}
                data-setting-description={cat.desc}
                >{cat.label}</span
            >
            <span class="log-desc">{cat.desc}</span>
        </label>
    {/key}
{/each}

<h4 class="sub-heading">Renderer Traces</h4>
{#key logRefresh}
    <label class="toggle-row">
        <input
            type="checkbox"
            checked={gridGradientTraceEnabled()}
            onchange={(e) => {
                setGridGradientTraceEnabled(
                    (e.target as HTMLInputElement).checked,
                );
            }}
        />
        <span
            class="log-label"
            data-setting-config-key="GRID_GRADIENT_DEBUG_TRANSITIONS"
            data-setting-description="Detailed Grid Gradient conquest transition trace logs."
            >Grid Gradient transition trace</span
        >
        <span class="log-desc">Filter logs for [GG_TRANSITION]</span>
    </label>
{/key}

<style>
    @import './panel-shared.css';
</style>
