<script lang="ts">
    import { onMount } from "svelte";
    import { PaxHudButton, PaxSettingsToggleRow } from "$lib/design-system";

    import {
        dumpSettingsNow,
        refreshSettingsDumpState,
        settingsDumpState,
        setSettingsDumpEnabled,
    } from "$lib/utils/settingsDump";

    function toggleContinuousDump(enabled: boolean): void {
        setSettingsDumpEnabled(enabled);
    }

    async function runManualDump(): Promise<void> {
        await dumpSettingsNow();
    }

    function formatStatus(): string {
        if (!$settingsDumpState.devMode) return "unavailable";
        if ($settingsDumpState.posting) return "posting";
        if ($settingsDumpState.lastStatus === "failed") {
            return $settingsDumpState.lastHttpStatus === null
                ? "failed"
                : `failed (${String($settingsDumpState.lastHttpStatus)})`;
        }
        if ($settingsDumpState.lastStatus === "ok") {
            return $settingsDumpState.lastHttpStatus === null
                ? "saved"
                : `saved (${String($settingsDumpState.lastHttpStatus)})`;
        }
        if ($settingsDumpState.lastStatus === "scheduled") return "scheduled";
        return "idle";
    }

    function formatMode(): string {
        if (!$settingsDumpState.devMode) return "dev only";
        return $settingsDumpState.enabled ? "continuous on" : "continuous off";
    }

    onMount(() => {
        refreshSettingsDumpState();
    });
</script>

<section data-subsection-id="live-settings-dump">
    <h4 class="sub-heading">Live Settings Dump</h4>
    <PaxSettingsToggleRow
        label="Continuous Settings Dump"
        checked={$settingsDumpState.enabled}
        disabled={!$settingsDumpState.devMode}
        description="Dev-only automatic dump of live settings changes to common/resources/settings-live/current-settings.json."
        meta={formatMode()}
        settingConfigKey="local.settingsDump.enabled"
        onChange={toggleContinuousDump}
    />

    <div class="status-grid status-grid--compact">
        <div><span>Status</span><span>{formatStatus()}</span></div>
        <div><span>Posts</span><span>{$settingsDumpState.postCount}</span></div>
        <div><span>Last Trigger</span><span>{$settingsDumpState.lastTrigger ?? "none"}</span></div>
        <div><span>Target</span><code>{$settingsDumpState.targetPath}</code></div>
    </div>

    <div class="actions-row">
        <PaxHudButton
            label={$settingsDumpState.posting ? "Posting..." : "Dump Now"}
            intent="primary"
            disabled={!$settingsDumpState.devMode || $settingsDumpState.posting}
            onclick={() => void runManualDump()}
        />
    </div>

    {#if !$settingsDumpState.devMode}
        <div class="readout">
            Live settings dump is only available in the dev build.
        </div>
    {/if}
</section>

<style>
    .sub-heading {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 16px 0 8px;
        padding-top: 12px;
        border-top: 1px solid color-mix(in srgb, var(--pax-ui-accent-warm) 18%, transparent);
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.68rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.14em;
        text-transform: uppercase;
    }

    .status-grid {
        display: grid;
        gap: 6px;
        margin-top: 4px;
        font-family: var(--pax-ui-font-data);
        font-size: calc(0.7rem * var(--pax-ui-data-scale, 1));
    }

    .status-grid > div {
        display: grid;
        grid-template-columns: 72px 1fr;
        gap: 8px;
        align-items: start;
    }

    .status-grid > div > span:first-child {
        color: var(--pax-ui-accent-warm);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.62rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .status-grid--compact {
        margin-top: 8px;
    }

    .status-grid--compact code {
        font-size: calc(0.68rem * var(--pax-ui-data-scale, 1));
        word-break: break-word;
    }

    .actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
    }

    .readout {
        margin-top: 10px;
        color: var(--pax-ui-text-dim);
        font-family: var(--pax-ui-font-copy);
        font-size: calc(0.68rem * var(--pax-ui-type-scale, 1));
        line-height: 1.45;
    }
</style>
