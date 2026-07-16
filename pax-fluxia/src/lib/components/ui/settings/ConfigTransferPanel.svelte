<script lang="ts">
    import "./panel-shared.css";
    import { settingsStore } from "../settingsStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { buildConfigMarkdown, parseConfigImport } from "../configTransfer";
    import { exportConfigJSON } from "../panelSync";
    import { PaxHudButton } from "$lib/design-system";

    // The "config mod" surface: export the full live config as a shareable
    // file, import someone else's, or reset everything to factory defaults.
    // The handlers lived (dead, with no UI affordance) in GameSettingsPanel
    // until the 2026-07-15 audit; the user ruled this is a user-facing
    // mod-sharing feature, so it now has a real panel.
    // The batch-apply path comes from the store, not props (audit phase 2b).
    const applyConfigPatch = settingsStore.applyPatch;

    let status = $state("");
    let statusIsError = $state(false);
    let fileInput = $state<HTMLInputElement | null>(null);
    let resetArmed = $state(false);
    let resetDisarmTimer: ReturnType<typeof setTimeout> | null = null;

    function exportMD() {
        const md = buildConfigMarkdown(
            GAME_CONFIG as unknown as Record<string, unknown>,
        );
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        a.href = url;
        a.download = `pax-config-${ts}.md`;
        a.click();
        URL.revokeObjectURL(url);
        status = "Exported Markdown";
        statusIsError = false;
    }

    function exportJSON() {
        exportConfigJSON();
        status = "Exported JSON";
        statusIsError = false;
    }

    function onImportFile(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const result = parseConfigImport(
                    reader.result as string,
                    GAME_CONFIG as unknown as Record<string, unknown>,
                );
                if (!result.ok) {
                    status = result.error;
                    statusIsError = true;
                    input.value = "";
                    return;
                }

                if (result.applied > 0) {
                    applyConfigPatch(result.patch);
                }

                const parts = [`${result.applied} applied`];
                if (result.skipped) parts.push(`${result.skipped} unknown`);
                if (result.typeErrors)
                    parts.push(`${result.typeErrors} type mismatches`);
                status = parts.join(", ");
                statusIsError = result.typeErrors > 0;
            } catch (err) {
                status = `Import failed: ${(err as Error).message}`;
                statusIsError = true;
            }
            input.value = "";
        };
        reader.readAsText(file);
    }

    /** Nuclear reset: clear ALL pax-* localStorage keys and reload into factory defaults. */
    function resetAllSettings() {
        if (!resetArmed) {
            resetArmed = true;
            if (resetDisarmTimer) clearTimeout(resetDisarmTimer);
            resetDisarmTimer = setTimeout(() => (resetArmed = false), 4000);
            return;
        }
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("pax") || k.startsWith("PAX")))
                keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        window.location.reload();
    }
</script>

<section>
    <h4 class="sub-heading">Share Config</h4>
    <p class="config-io-hint">
        Export the complete live game configuration as a file to share your
        setup, or import one to play with someone else's tuning.
    </p>
    <div class="actions-row">
        <PaxHudButton label="Export JSON" size="sm" intent="primary" onclick={exportJSON} />
        <PaxHudButton label="Export Markdown" size="sm" onclick={exportMD} />
        <PaxHudButton label="Import JSON…" size="sm" onclick={() => fileInput?.click()} />
        <input
            bind:this={fileInput}
            class="config-io-file"
            type="file"
            accept=".json,application/json"
            onchange={onImportFile}
        />
    </div>
    {#if status}
        <p class="config-io-status" class:is-error={statusIsError}>{status}</p>
    {/if}
</section>

<section>
    <h4 class="sub-heading">Reset</h4>
    <p class="config-io-hint">
        Clears every saved setting (config values, themes, panel layout) and
        reloads the game with factory defaults. Saved games are not affected.
    </p>
    <div class="actions-row">
        <PaxHudButton
            label={resetArmed ? "Click again to confirm" : "Reset All Settings"}
            size="sm"
            danger
            onclick={resetAllSettings}
        />
    </div>
</section>

<style>
    .actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }
    .config-io-file {
        display: none;
    }
    .config-io-hint {
        margin: 0 0 8px;
        font-size: 11px;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.55);
    }
    .config-io-status {
        margin: 8px 0 0;
        font-size: 11px;
        color: #4ade80;
    }
    .config-io-status.is-error {
        color: #f87171;
    }
</style>
