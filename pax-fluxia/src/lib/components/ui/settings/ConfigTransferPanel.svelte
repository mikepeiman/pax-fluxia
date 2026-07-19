<script lang="ts">
    import "./panel-shared.css";
    import { settingsStore } from "../settingsStore.svelte";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        buildConfigMarkdown,
        clearResettableSettingsStorage,
        parseConfigImport,
    } from "../configTransfer";
    import { exportConfigJSON } from "../panelSync";
    import {
        type FullConfigPreset,
        deleteFullConfigPreset,
        getFullConfigPreset,
        importFullConfigPreset,
        listFullConfigPresets,
        saveFullConfigPreset,
    } from "$lib/config/fullConfigPresets";
    import { PaxHudButton, PaxHudSelect, PaxHudTextInput } from "$lib/design-system";
    import { log } from "$lib/utils/logger";

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

    // ── Full-config presets (named, in-app; captures ALL categories at once) ──
    let presetVersion = $state(0);
    let fullPresets = $derived.by<FullConfigPreset[]>(() => {
        presetVersion;
        return listFullConfigPresets();
    });
    let fullPresetOptions = $derived(
        fullPresets.map((preset) => ({ value: preset.name, label: preset.name })),
    );
    let selectedPresetName = $state("");
    let newPresetName = $state("");

    function downloadFullPreset(preset: FullConfigPreset) {
        const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const safe = preset.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        anchor.href = url;
        anchor.download = `pax-config-preset-${safe}-${ts}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function saveFullPreset() {
        const name = newPresetName.trim();
        if (!name) return;
        const preset = saveFullConfigPreset(name);
        newPresetName = "";
        selectedPresetName = name;
        presetVersion++;
        downloadFullPreset(preset);
        status = `Saved preset "${name}" (${Object.keys(preset.values).length} settings)`;
        statusIsError = false;
    }

    function loadFullPreset() {
        if (!selectedPresetName) return;
        const preset = getFullConfigPreset(selectedPresetName);
        if (!preset) return;
        applyConfigPatch(preset.values);
        status = `Loaded preset "${preset.name}" (${Object.keys(preset.values).length} settings)`;
        statusIsError = false;
    }

    function deleteSelectedPreset() {
        if (!selectedPresetName) return;
        deleteFullConfigPreset(selectedPresetName);
        selectedPresetName = "";
        presetVersion++;
    }

    function onImportPresetFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const preset = importFullConfigPreset(JSON.parse(reader.result as string));
                if (!preset) {
                    status = "Not a valid full-config preset file";
                    statusIsError = true;
                    return;
                }
                selectedPresetName = preset.name;
                presetVersion++;
                status = `Imported preset "${preset.name}"`;
                statusIsError = false;
            } catch (error) {
                log.error("ConfigTransferPanel", "Failed to import preset", error);
                status = "Failed to import preset file";
                statusIsError = true;
            }
        };
        reader.readAsText(file);
    }
    let presetFileInput = $state<HTMLInputElement | null>(null);

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

    /** Clear Pax settings/preferences while preserving user-created content. */
    function resetAllSettings() {
        if (!resetArmed) {
            resetArmed = true;
            if (resetDisarmTimer) clearTimeout(resetDisarmTimer);
            resetDisarmTimer = setTimeout(() => (resetArmed = false), 4000);
            return;
        }
        clearResettableSettingsStorage(localStorage);
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
    <h4 class="sub-heading">Config Presets</h4>
    <p class="config-io-hint">
        Save your entire current tuning as a named preset and reload it anytime.
        Unlike the per-section preset bars, this captures every category at once —
        AI, territory topology, ships, timing, everything.
    </p>
    <div class="actions-row">
        <PaxHudTextInput
            class="config-preset-name"
            value={newPresetName}
            placeholder="Preset name…"
            size="sm"
            onInput={(value) => (newPresetName = value)}
            onKeydown={(event) => {
                if (event.key === "Enter") saveFullPreset();
            }}
        />
        <PaxHudButton label="Save preset" size="sm" intent="primary" onclick={saveFullPreset} />
    </div>
    {#if fullPresets.length > 0}
        <div class="actions-row">
            <PaxHudSelect
                class="config-preset-select"
                value={selectedPresetName}
                options={fullPresetOptions}
                placeholder="Select preset…"
                ariaLabel="Select full-config preset"
                size="sm"
                onValueChange={(value) => (selectedPresetName = value)}
            />
            <PaxHudButton label="Load" size="sm" disabled={!selectedPresetName} onclick={loadFullPreset} />
            <PaxHudButton
                label="Download"
                size="sm"
                disabled={!selectedPresetName}
                onclick={() => {
                    const preset = getFullConfigPreset(selectedPresetName);
                    if (preset) downloadFullPreset(preset);
                }}
            />
            <PaxHudButton label="Delete" size="sm" danger disabled={!selectedPresetName} onclick={deleteSelectedPreset} />
        </div>
    {/if}
    <div class="actions-row">
        <PaxHudButton label="Import preset…" size="sm" onclick={() => presetFileInput?.click()} />
        <input
            bind:this={presetFileInput}
            class="config-io-file"
            type="file"
            accept=".json,application/json"
            onchange={(event) => {
                const file = (event.target as HTMLInputElement)?.files?.[0];
                if (file) onImportPresetFile(file);
                (event.target as HTMLInputElement).value = "";
            }}
        />
    </div>
</section>

<section>
    <h4 class="sub-heading">Reset</h4>
    <p class="config-io-hint">
        Clears saved settings and interface preferences, then reloads factory
        defaults. Saved maps, games, presets, and map-editor work are preserved.
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
    :global(.config-preset-name),
    :global(.config-preset-select) {
        flex: 1 1 auto;
        min-width: 0;
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
