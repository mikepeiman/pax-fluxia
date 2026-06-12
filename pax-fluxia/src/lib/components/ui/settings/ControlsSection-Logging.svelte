<script lang="ts">
    import { PaxHudButton, PaxSettingsToggleRow } from "$lib/design-system";
    import { logFlags } from "$lib/utils/logger";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-LOGGING -- Logging controls (extracted from GameSettingsPanel.svelte)

    interface Props {
        logCategories: readonly any[] | any[];
        logRefresh: number;
        syncFromConfig?: () => void;
    }
    let { logCategories, logRefresh, syncFromConfig }: Props = $props();
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

<style>
    @import "./panel-shared.css";

    .log-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
</style>
