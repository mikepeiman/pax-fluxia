<script lang="ts">
  import "./panel-shared.css";
    import { onMount } from "svelte";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import {
        PaxColorSwatchButton,
        PaxHudButton,
        PaxSettingsRangeRow,
    } from "$lib/design-system";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";
    import {
        PLAYER_HUE_NUDGE_LIMIT,
        PLAYER_PALETTE_SIZE,
        buildPlayerPaletteHex,
        clampPlayerHueNudge,
        generatePlayerPaletteHues,
        loadPlayerPaletteSettings,
        normalizePlayerPaletteNudges,
        savePlayerPaletteSettings,
    } from "$lib/utils/playerPalette";

    interface Props {
        syncFromConfig?: () => void;
    }

    let { syncFromConfig }: Props = $props();

    const initial = loadPlayerPaletteSettings();
    let anchorHue = $state(initial.anchorHue);
    let saturation = $state(initial.saturation);
    let lightness = $state(initial.lightness);
    let nudges = $state(normalizePlayerPaletteNudges(initial.nudges));
    let selectedPaletteIndex = $state(0);

    const rosterSize = $derived(
        Math.max(
            1,
            Math.min(
                activeGameStore.players.length || PLAYER_PALETTE_SIZE,
                PLAYER_PALETTE_SIZE,
            ),
        ),
    );

    const paletteHues = $derived(
        generatePlayerPaletteHues(
            anchorHue,
            rosterSize,
            nudges.slice(0, rosterSize),
        ),
    );
    const fullPaletteHues = $derived(
        generatePlayerPaletteHues(anchorHue, PLAYER_PALETTE_SIZE, nudges),
    );
    const paletteHex = $derived(
        buildPlayerPaletteHex(
            anchorHue,
            rosterSize,
            nudges.slice(0, rosterSize),
            saturation,
            lightness,
        ),
    );
    const selectedPaletteHue = $derived(
        fullPaletteHues[selectedPaletteIndex] ?? anchorHue,
    );

    function persistAndApplyPalette(): void {
        savePlayerPaletteSettings({
            anchorHue,
            saturation,
            lightness,
            nudges,
        });
        activeGameStore.applyPlayerColors(
            buildPlayerPaletteHex(
                anchorHue,
                rosterSize,
                nudges.slice(0, rosterSize),
                saturation,
                lightness,
            ),
        );
    }

    function selectPaletteIndex(index: number): void {
        selectedPaletteIndex = Math.max(
            0,
            Math.min(index, Math.max(0, rosterSize - 1)),
        );
    }

    function setSelectedPaletteNudge(value: number): void {
        const next = clampPlayerHueNudge(value);
        if (nudges[selectedPaletteIndex] === next) return;
        nudges[selectedPaletteIndex] = next;
        persistAndApplyPalette();
    }

    function resetSelectedPaletteNudge(): void {
        setSelectedPaletteNudge(0);
    }

    onMount(() => {
        persistAndApplyPalette();
    });

    $effect(() => {
        if (selectedPaletteIndex >= rosterSize) {
            selectedPaletteIndex = Math.max(0, rosterSize - 1);
        }
    });
</script>

<CategoryThemeBar category="players" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Live Player Palette</h4>

<PaxSettingsRangeRow
    label="Anchor Hue"
    value={anchorHue}
    min={0}
    max={359}
    step={1}
    output={`${Math.round(anchorHue)}deg`}
    settingConfigKey="local.playerPalette.anchorHue"
    settingDescription="Persisted local anchor hue used to generate the player palette."
    onInput={(value) => {
        anchorHue = value;
        persistAndApplyPalette();
    }}
/>

<div class="players-preview-grid">
    {#each paletteHex as hex, index}
        <PaxColorSwatchButton
            color={hex}
            label={`P${index + 1}`}
            meta={`${Math.round(paletteHues[index] ?? 0)}deg`}
            selected={selectedPaletteIndex === index}
            onclick={() => selectPaletteIndex(index)}
        />
    {/each}
</div>

<h4 class="sub-heading">Per-Player Nudge</h4>
<div class="players-focus-card">
    <div class="players-focus-row">
        <span class="players-focus-label">Selected</span>
        <span class="players-focus-value">
            P{selectedPaletteIndex + 1} - {Math.round(selectedPaletteHue)}deg
        </span>
    </div>
    <PaxSettingsRangeRow
        label="Hue Nudge"
        value={nudges[selectedPaletteIndex] ?? 0}
        min={-PLAYER_HUE_NUDGE_LIMIT}
        max={PLAYER_HUE_NUDGE_LIMIT}
        step={1}
        output={`${(nudges[selectedPaletteIndex] ?? 0) > 0 ? "+" : ""}${nudges[selectedPaletteIndex] ?? 0}deg`}
        settingConfigKey="local.playerPalette.nudges[selected]"
        settingDescription="Per-player local hue offset layered on top of the anchored palette."
        onInput={setSelectedPaletteNudge}
    />
    <PaxHudButton
        label="Reset selected nudge"
        size="sm"
        disabled={(nudges[selectedPaletteIndex] ?? 0) === 0}
        onclick={resetSelectedPaletteNudge}
    />
</div>

<h4 class="sub-heading">Advanced Tuning</h4>
<details class="players-detail">
    <summary>Advanced palette tuning</summary>
    <div class="players-detail-grid">
        <PaxSettingsRangeRow
            label="Saturation"
            value={saturation}
            min={40}
            max={100}
            step={1}
            format="percent"
            settingConfigKey="local.playerPalette.saturation"
            settingDescription="Persisted local saturation used when generating player colors."
            onInput={(value) => {
                saturation = value;
                persistAndApplyPalette();
            }}
        />
        <PaxSettingsRangeRow
            label="Lightness"
            value={lightness}
            min={35}
            max={70}
            step={1}
            format="percent"
            settingConfigKey="local.playerPalette.lightness"
            settingDescription="Persisted local lightness used when generating player colors."
            onInput={(value) => {
                lightness = value;
                persistAndApplyPalette();
            }}
        />
    </div>
</details>

<style>

    .players-preview-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
    }

    .players-focus-card {
        display: grid;
        gap: 8px;
        margin-top: 8px;
        padding: 10px;
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-sm);
        clip-path: var(--pax-ui-rounded-corner-sm);
        background:
            linear-gradient(180deg, rgba(0, 18, 21, 0.78), rgba(0, 10, 13, 0.9)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
    }

    .players-focus-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
    }

    .players-focus-label {
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(185, 220, 255, 0.72);
    }

    .players-focus-value {
        min-width: 0;
        overflow: hidden;
        color: #dbeafe;
        font-size: 11px;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .players-detail {
        margin-top: 8px;
    }

    .players-detail summary {
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        color: rgba(190, 220, 255, 0.78);
        list-style: none;
    }

    .players-detail summary::-webkit-details-marker {
        display: none;
    }

    .players-detail-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 6px;
        margin-top: 8px;
    }
</style>
