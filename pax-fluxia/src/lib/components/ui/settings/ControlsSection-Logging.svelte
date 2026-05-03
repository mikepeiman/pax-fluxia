<script lang="ts">
    import { logFlags } from "$lib/utils/logger";

    // ControlsSection-LOGGING -- Logging controls (extracted from GameSettingsPanel.svelte)

    interface Props {
        logCategories: readonly any[] | any[];
        logRefresh: number;
        syncFromConfig?: () => void;
    }
    let { logCategories, logRefresh, syncFromConfig }: Props = $props();
    import CategoryThemeBar from './CategoryThemeBar.svelte';
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

<style>
    @import './panel-shared.css';
</style>
