<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-LOGGING â€” In-Game Settings Controls: Logging
    // Extracted from GameSettingsPanel.svelte

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        logCategories: any[];
        logRefresh: number;
    }
    let { panel, updatePanel, logCategories, logRefresh } = ($props() as Props);
</script>

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
            <span class="log-label">{cat.label}</span>
            <span class="log-desc">{cat.desc}</span>
        </label>
    {/key}
{/each}

<!-- ── Config Import/Export ── -->
<h4 class="sub-heading" style="margin-top: 10px;">
    ⚙️ Config
</h4>
<div class="log-actions" style="flex-wrap: wrap;">
    <button
        class="btn-xs btn-export"
        onclick={() => { exportConfigJSONBase(); }}
        >📥 Export JSON</button
    >
    <button
        class="btn-xs btn-export"
        onclick={() => exportConfigMD()}
        >📄 Export MD</button
    >
    <button
        class="btn-xs btn-import"
        onclick={() => {
            const inp = document.getElementById(
                "config-import-input",
            ) as HTMLInputElement;
            if (inp) inp.click();
        }}>📤 Import JSON</button
    >
</div>
<input
    id="config-import-input"
    type="file"
    accept=".json"
    style="display:none;"
    onchange={(e) => importConfigJSON(e)}
/>
{#if configStatus}
    <div
        class="config-status"
        style="color:{configStatusColor};font-size:9px;padding:2px 4px;margin-top:2px;"
    >
        {configStatus}
    </div>
{/if}
