<script lang="ts">
    import { onMount } from 'svelte';

    import {
        dumpSettingsNow,
        refreshSettingsDumpState,
        settingsDumpState,
        setSettingsDumpEnabled,
    } from '$lib/utils/settingsDump';

    function toggleContinuousDump(): void {
        setSettingsDumpEnabled(!$settingsDumpState.enabled);
    }

    async function runManualDump(): Promise<void> {
        await dumpSettingsNow();
    }

    function formatStatus(): string {
        if (!$settingsDumpState.devMode) return 'unavailable';
        if ($settingsDumpState.posting) return 'posting';
        if ($settingsDumpState.lastStatus === 'failed') {
            return $settingsDumpState.lastHttpStatus === null
                ? 'failed'
                : `failed (${String($settingsDumpState.lastHttpStatus)})`;
        }
        if ($settingsDumpState.lastStatus === 'ok') {
            return $settingsDumpState.lastHttpStatus === null
                ? 'saved'
                : `saved (${String($settingsDumpState.lastHttpStatus)})`;
        }
        if ($settingsDumpState.lastStatus === 'scheduled') return 'scheduled';
        return 'idle';
    }

    function formatMode(): string {
        if (!$settingsDumpState.devMode) return 'dev only';
        return $settingsDumpState.enabled ? 'continuous on' : 'continuous off';
    }

    onMount(() => {
        refreshSettingsDumpState();
    });
</script>

<section data-subsection-id="live-settings-dump">
    <h4 class="sub-heading">Live Settings Dump</h4>
    <label class="toggle-row">
        <input
            type="checkbox"
            checked={$settingsDumpState.enabled}
            disabled={!$settingsDumpState.devMode}
            onchange={toggleContinuousDump}
        />
        <span
            class="var-name"
            data-setting-config-key="local.settingsDump.enabled"
            data-setting-description="Dev-only automatic dump of live settings changes to common/resources/settings-live/current-settings.json."
        >
            Continuous Settings Dump
        </span>
        <span class="debug-hint">{formatMode()}</span>
    </label>

    <div class="status-grid status-grid--compact">
        <div><span>Status</span><span>{formatStatus()}</span></div>
        <div><span>Posts</span><span>{$settingsDumpState.postCount}</span></div>
        <div><span>Last Trigger</span><span>{$settingsDumpState.lastTrigger ?? 'none'}</span></div>
        <div><span>Target</span><code>{$settingsDumpState.targetPath}</code></div>
    </div>

    <div class="actions-row">
        <button
            class="mini-action-btn primary"
            type="button"
            disabled={!$settingsDumpState.devMode || $settingsDumpState.posting}
            onclick={() => void runManualDump()}
        >
            {$settingsDumpState.posting ? 'Posting...' : 'Dump Now'}
        </button>
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
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: rgba(186, 210, 232, 0.82);
    }

    .toggle-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(255, 255, 255, 0.026);
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease;
    }

    .toggle-row:hover {
        background: rgba(255, 255, 255, 0.045);
        border-color: rgba(255, 255, 255, 0.12);
    }

    input[type="checkbox"] {
        accent-color: #4ade80;
        cursor: pointer;
        width: 14px;
        height: 14px;
    }

    .var-name {
        font-size: 12px;
        font-weight: 600;
        line-height: 1.25;
        color: rgba(236, 242, 249, 0.9);
    }

    .debug-hint {
        margin-left: auto;
        font-size: 9px;
        color: #888;
    }

    .status-grid {
        display: grid;
        gap: 6px;
        margin-top: 4px;
        font-size: 0.7rem;
    }

    .status-grid > div {
        display: grid;
        grid-template-columns: 72px 1fr;
        gap: 8px;
        align-items: start;
    }

    .status-grid > div > span:first-child {
        color: rgba(180, 130, 255, 0.72);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 0.62rem;
    }

    .status-grid--compact {
        margin-top: 8px;
    }

    .status-grid--compact code {
        font-size: 0.68rem;
        word-break: break-word;
    }

    .actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
    }

    .mini-action-btn {
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(220, 220, 240, 0.82);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
    }

    .mini-action-btn:hover:not(:disabled) {
        border-color: rgba(87, 248, 255, 0.38);
        background: rgba(87, 248, 255, 0.12);
        color: rgba(248, 250, 252, 0.96);
    }

    .mini-action-btn:disabled {
        cursor: default;
        opacity: 0.45;
    }

    .mini-action-btn.primary {
        border-color: rgba(87, 248, 255, 0.34);
    }

    .readout {
        margin-top: 10px;
        font-size: 0.68rem;
        line-height: 1.45;
        color: rgba(160, 160, 180, 0.72);
    }
</style>
