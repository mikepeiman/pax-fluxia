<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import { perimeterFieldDebugPlaybackStore } from '$lib/territory/families/perimeterField/perimeterFieldDebugPlaybackStore';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

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

    function setScrubFrameIndex(value: number): void {
        const maxIndex = Math.max(0, availableScrubFrameCount - 1);
        writeConfig(
            'PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX',
            'perimeterFieldDebugScrubFrameIndex',
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

    <label class="toggle-row">
        <input
            type="checkbox"
            checked={panel.perimeterFieldDebugShowVstars ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_VSTARS ?? false}
            onchange={(event) => {
                const value = (event.target as HTMLInputElement).checked;
                writeConfig('PERIMETER_FIELD_DEBUG_SHOW_VSTARS', 'perimeterFieldDebugShowVstars', value);
            }}
        />
        <span
            class="var-name"
            title="Draw the derived perimeter vstars and the conquest-local override points."
        >
            Show Perimeter Vstars
        </span>
        <span class="val">
            {(panel.perimeterFieldDebugShowVstars ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_VSTARS ?? false)
                ? 'On'
                : 'Off'}
        </span>
    </label>
    <div class="var-desc">
        Vstars are filled with owner/player color. The surrounding halo shows debug state: cyan = current/base, magenta = next-state, yellow = moving transition override.
    </div>

    <label class="toggle-row">
        <input
            type="checkbox"
            checked={panel.perimeterFieldDebugScrubEnabled ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED ?? false}
            onchange={(event) => {
                const value = (event.target as HTMLInputElement).checked;
                writeConfig('PERIMETER_FIELD_DEBUG_SCRUB_ENABLED', 'perimeterFieldDebugScrubEnabled', value);
            }}
        />
        <span
            class="var-name"
            title="Explicit diagnostic preview mode. When enabled, the game view can be replaced with captured transition frames for scrub/replay inspection. When disabled, pause only pauses."
        >
            Enable Transition Preview
        </span>
        <span class="val">
            {(panel.perimeterFieldDebugScrubEnabled ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED ?? false)
                ? 'On'
                : 'Off'}
        </span>
    </label>
    <div class="var-desc">
        Explicitly turn this on to replace the live perimeter-field view with captured frames for scrub/replay inspection. Turn it off for normal gameplay; pause alone will no longer switch views.
    </div>

    <div class="var-row">
        <div class="row-top">
            <span
                class="var-name"
                title="Choose the active capture or one of the last three captured conquests for explicit preview mode."
            >
                Replay Source
            </span>
            <span class="val">
                {#if (panel.perimeterFieldDebugReplaySlot ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ?? 0) === 0}
                    Live
                {:else}
                    Replay {(panel.perimeterFieldDebugReplaySlot ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ?? 0)}
                {/if}
            </span>
        </div>
        <div class="var-desc">
            `Live` uses the currently active conquest. `Replay 1` is the most recent captured conquest, then `Replay 2` and `Replay 3`.
        </div>
        <select
            class="mode-select"
            value={(panel.perimeterFieldDebugReplaySlot ?? GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT ?? 0).toString()}
            onchange={(event) => {
                const value = parseFloat((event.target as HTMLSelectElement).value);
                writeConfig('PERIMETER_FIELD_DEBUG_REPLAY_SLOT', 'perimeterFieldDebugReplaySlot', value);
            }}
        >
            <option value="0">Live</option>
            <option value="1">Replay 1 (most recent)</option>
            <option value="2">Replay 2</option>
            <option value="3">Replay 3</option>
        </select>
    </div>

    <div class="var-row">
        <div class="row-top">
            <span
                class="var-name"
                title="Exact captured transition frame index for the live conquest or selected replay. Index 0 is PREV, the last index is NEXT."
            >
                Transition Scrub
            </span>
            <span class="val">
                {#if availableScrubFrameCount > 0}
                    F{currentScrubFrameIndex()} / {availableScrubFrameCount - 1}
                {:else}
                    No frames
                {/if}
            </span>
        </div>
        <div class="var-desc">
            In explicit preview mode, this steps through the exact captured gameplay frames for the live conquest or selected replay. Each +/- click moves exactly one conquest frame.
        </div>
        <div class="scrub-controls">
            <button
                type="button"
                class="scrub-step-btn"
                disabled={availableScrubFrameCount <= 0 || currentScrubFrameIndex() <= 0}
                onclick={() => shiftScrubFrame(-1)}
            >
                -
            </button>
            <input
                type="range"
                min="0"
                max={Math.max(0, availableScrubFrameCount - 1)}
                step="1"
                disabled={availableScrubFrameCount <= 0}
                value={currentScrubFrameIndex()}
                oninput={(event) => {
                    const value = parseFloat((event.target as HTMLInputElement).value);
                    setScrubFrameIndex(value);
                }}
            />
            <button
                type="button"
                class="scrub-step-btn"
                disabled={availableScrubFrameCount <= 0 || currentScrubFrameIndex() >= availableScrubFrameCount - 1}
                onclick={() => shiftScrubFrame(1)}
            >
                +
            </button>
        </div>
    </div>
</div>

<style>
    @import "./panel-shared.css";

    .module-block {
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .scrub-controls {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
    }

    .scrub-step-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        min-height: 28px;
        padding: 0 8px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(7, 12, 24, 0.5);
        color: rgba(240, 244, 248, 0.9);
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    .scrub-step-btn:disabled {
        cursor: default;
        opacity: 0.45;
        transform: none;
    }

    .var-desc {
        margin: 4px 0 10px;
        color: rgba(220, 232, 245, 0.72);
        font-size: 10px;
        line-height: 1.35;
    }

    .sub-heading {
        margin: 12px 0 6px;
        color: rgba(128, 222, 255, 0.92);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
</style>
