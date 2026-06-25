<script lang="ts">
  import "./panel-shared.css";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
    import { perimeterFieldDebugPlaybackStore } from "$lib/territory/families/perimeterField/perimeterFieldDebugPlaybackStore";
    import {
        PaxHudButton,
        PaxHudRange,
        PaxInfoHint,
        PaxSettingsSegmentedRow,
        PaxSettingsToggleRow,
    } from "$lib/design-system";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    const REPLAY_SOURCE_OPTIONS = [
        { value: "0", label: "Live" },
        { value: "1", label: "R1" },
        { value: "2", label: "R2" },
        { value: "3", label: "R3" },
    ];

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
    }

    let activeReplaySlot = $derived(
        Math.max(
            0,
            Math.min(
                3,
                Math.round(
                    panel.perimeterFieldDebugReplaySlot ??
                        GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ??
                        0,
                ),
            ),
        ),
    );

    let availableScrubFrameCount = $derived(
        activeReplaySlot > 0
            ? ($perimeterFieldDebugPlaybackStore.replayFrameCounts[
                  activeReplaySlot - 1
              ] ?? 0)
            : $perimeterFieldDebugPlaybackStore.liveFrameCount,
    );

    function currentScrubFrameIndex(): number {
        const raw =
            panel.perimeterFieldDebugScrubFrameIndex ??
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX ??
            0;
        const maxIndex = Math.max(0, availableScrubFrameCount - 1);
        return Math.max(0, Math.min(maxIndex, Math.round(raw)));
    }

    function scrubOutput(): string {
        return availableScrubFrameCount > 0
            ? `F${currentScrubFrameIndex()} / ${availableScrubFrameCount - 1}`
            : "No frames";
    }

    function setScrubFrameIndex(value: number): void {
        const maxIndex = Math.max(0, availableScrubFrameCount - 1);
        writeConfig(
            "PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX",
            "perimeterFieldDebugScrubFrameIndex",
            Math.max(0, Math.min(maxIndex, Math.round(value))),
        );
    }

    function shiftScrubFrame(delta: number): void {
        setScrubFrameIndex(currentScrubFrameIndex() + delta);
    }

    $effect(() => {
        if (availableScrubFrameCount <= 0) {
            if (
                (panel.perimeterFieldDebugScrubFrameIndex ??
                    GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX ??
                    0) !== 0
            ) {
                setScrubFrameIndex(0);
            }
            return;
        }

        const clamped = currentScrubFrameIndex();
        if (
            clamped !==
            Math.round(
                panel.perimeterFieldDebugScrubFrameIndex ??
                    GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX ??
                    0,
            )
        ) {
            setScrubFrameIndex(clamped);
        }
    });
</script>

<div class="module-block">
    <div class="sub-heading">Perimeter Field</div>

    <PaxSettingsToggleRow
        label="Show Perimeter Vstars"
        checked={panel.perimeterFieldDebugShowVstars ??
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_VSTARS ??
            false}
        description="Draw the derived perimeter vstars and conquest-local override points. Vstars use owner/player color; the halo shows debug state — cyan = current/base, magenta = next-state, yellow = moving transition override."
        meta={(panel.perimeterFieldDebugShowVstars ??
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_VSTARS ??
            false)
            ? "On"
            : "Off"}
        settingConfigKey="PERIMETER_FIELD_DEBUG_SHOW_VSTARS"
        onChange={(value) =>
            writeConfig(
                "PERIMETER_FIELD_DEBUG_SHOW_VSTARS",
                "perimeterFieldDebugShowVstars",
                value,
            )}
    />
    <PaxSettingsToggleRow
        label="Enable Transition Preview"
        checked={panel.perimeterFieldDebugScrubEnabled ??
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED ??
            false}
        description="Explicitly replace the live perimeter-field view with captured frames for scrub/replay inspection."
        meta={(panel.perimeterFieldDebugScrubEnabled ??
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED ??
            false)
            ? "On"
            : "Off"}
        settingConfigKey="PERIMETER_FIELD_DEBUG_SCRUB_ENABLED"
        onChange={(value) =>
            writeConfig(
                "PERIMETER_FIELD_DEBUG_SCRUB_ENABLED",
                "perimeterFieldDebugScrubEnabled",
                value,
            )}
    />

    <PaxSettingsSegmentedRow
        label="Replay Source"
        hint="Live uses the currently active conquest. R1 is the most recent captured conquest, then R2 and R3."
        settingConfigKey="PERIMETER_FIELD_DEBUG_REPLAY_SLOT"
        value={(panel.perimeterFieldDebugReplaySlot ??
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ??
            0).toString()}
        options={REPLAY_SOURCE_OPTIONS}
        onValueChange={(value) =>
            writeConfig(
                "PERIMETER_FIELD_DEBUG_REPLAY_SLOT",
                "perimeterFieldDebugReplaySlot",
                parseFloat(value),
            )}
    />

    <div class="scrub-card">
        <div class="scrub-card__header">
            <span class="scrub-card__label">
                Transition Scrub
                <PaxInfoHint text="In explicit preview mode, this steps through exact captured gameplay frames for the live conquest or selected replay. Each step moves exactly one conquest frame." />
            </span>
            <span class="scrub-card__value">{scrubOutput()}</span>
        </div>
        <div class="scrub-controls">
            <PaxHudButton
                label="-"
                size="sm"
                disabled={availableScrubFrameCount <= 0 ||
                    currentScrubFrameIndex() <= 0}
                onclick={() => shiftScrubFrame(-1)}
            />
            <PaxHudRange
                label="Transition Scrub"
                nudge={false}
                value={currentScrubFrameIndex()}
                min={0}
                max={Math.max(0, availableScrubFrameCount - 1)}
                step={1}
                output={scrubOutput()}
                disabled={availableScrubFrameCount <= 0}
                onInput={setScrubFrameIndex}
            />
            <PaxHudButton
                label="+"
                size="sm"
                disabled={availableScrubFrameCount <= 0 ||
                    currentScrubFrameIndex() >= availableScrubFrameCount - 1}
                onclick={() => shiftScrubFrame(1)}
            />
        </div>
    </div>
</div>

<style>

    .module-block {
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-2);
    }

    .scrub-card {
        display: grid;
        gap: var(--pax-space-2);
        padding: var(--pax-gap-sm);
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-sm);
        clip-path: var(--pax-ui-rounded-corner-sm);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 76%, transparent), color-mix(in srgb, var(--pax-color-void) 90%, transparent)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
    }

    .scrub-card__header,
    .scrub-controls {
        min-width: 0;
        display: grid;
        align-items: center;
        gap: var(--pax-space-2);
    }

    .scrub-card__header {
        grid-template-columns: minmax(0, 1fr) auto;
    }

    .scrub-controls {
        grid-template-columns: auto minmax(0, 1fr) auto;
    }

    .scrub-card__label {
        display: inline-flex;
        align-items: center;
        gap: var(--pax-space-2);
        color: var(--pax-ui-text-soft);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.72rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .scrub-card__value {
        color: var(--pax-ui-accent-warm-strong);
        font-family: var(--pax-ui-font-data);
        font-size: calc(0.72rem * var(--pax-ui-data-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        white-space: nowrap;
    }

    .sub-heading {
        margin: var(--pax-space-3) 0 var(--pax-gap-xs);
        color: var(--pax-ui-accent);
        font-family: var(--pax-ui-font-ui);
        font-size: calc(0.68rem * var(--pax-ui-type-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
</style>
