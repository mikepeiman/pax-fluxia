<script lang="ts">
  import { onMount } from "svelte";
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import {
    mapEditorUiStore,
    type MapEditorDensityPreset,
  } from "$lib/editor/mapEditorUiStore.svelte";
  import {
    MAP_EDITOR_MAX_HEX_RADIUS,
    MAP_EDITOR_MIN_HEX_RADIUS,
    normalizeHexRadius,
  } from "$lib/editor/mapEditorPresentation";

  interface Props {
    statusMessage: string;
    onFitViewport: () => void;
  }

  let {
    statusMessage,
    onFitViewport,
  }: Props = $props();

  const density = $derived(mapEditorUiStore.density);
  let showGridFlyout = $state(false);
  let gridInputValue = $state(String(mapEditorStore.hexRadius));
  let gridInputFocused = $state(false);
  let gridControlEl: HTMLDivElement | null = null;

  function setDensity(densityPreset: MapEditorDensityPreset) {
    mapEditorUiStore.setDensity(densityPreset);
  }

  $effect(() => {
    if (!gridInputFocused) {
      gridInputValue = String(mapEditorStore.hexRadius);
    }
  });

  function setHexRadius(nextValue: number) {
    mapEditorStore.hexRadius = normalizeHexRadius(nextValue);
  }

  function nudgeHexRadius(delta: number) {
    setHexRadius(mapEditorStore.hexRadius + delta);
  }

  function toggleGridFlyout() {
    showGridFlyout = !showGridFlyout;
  }

  function handleGridWheel(event: WheelEvent) {
    event.preventDefault();
    const step = event.shiftKey ? 5 : 1;
    nudgeHexRadius(event.deltaY < 0 ? step : -step);
  }

  function commitGridInput() {
    const parsed = Number(gridInputValue);
    if (!Number.isFinite(parsed)) {
      gridInputValue = String(mapEditorStore.hexRadius);
      return;
    }
    setHexRadius(parsed);
    gridInputValue = String(mapEditorStore.hexRadius);
  }

  function handleGridInputKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      commitGridInput();
      showGridFlyout = false;
      gridInputFocused = false;
      return;
    }
    if (event.key === "Escape") {
      gridInputValue = String(mapEditorStore.hexRadius);
      showGridFlyout = false;
      gridInputFocused = false;
    }
  }

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!showGridFlyout || !gridControlEl) return;
      if (gridControlEl.contains(event.target as Node)) return;
      showGridFlyout = false;
      gridInputFocused = false;
      gridInputValue = String(mapEditorStore.hexRadius);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      showGridFlyout = false;
      gridInputFocused = false;
      gridInputValue = String(mapEditorStore.hexRadius);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<div class="board-hud" data-density={density}>
  <div class="board-hud__cluster">
    <button type="button" class="hud-pill hud-pill--strong" onclick={onFitViewport}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3v2H7v4H5V3h6Zm8 0v6h-2V5h-4V3h6Zm-8 18v-2H7v-4H5v6h6Zm8-6v4h-4v2h6v-6h-2ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" fill="currentColor" /></svg>
      {#if density !== "compact"}<span>Center</span>{/if}
    </button>
    <div class="grid-control" bind:this={gridControlEl}>
      <button
        type="button"
        class="hud-readout hud-readout--interactive"
        class:is-open={showGridFlyout}
        title="Map density"
        onclick={toggleGridFlyout}
        onwheel={handleGridWheel}
      >
        <strong>{mapEditorStore.hexRadius}px</strong>
        <span>Map density · {Math.round(mapEditorStore.viewport.zoom * 100)}% view</span>
      </button>
      {#if showGridFlyout}
        <div class="grid-flyout" onwheel={handleGridWheel}>
          <div class="grid-flyout__header">
            <strong>Map Density</strong>
            <span>{MAP_EDITOR_MIN_HEX_RADIUS}px to {MAP_EDITOR_MAX_HEX_RADIUS}px</span>
          </div>
          <div class="grid-flyout__body">
            <input
              class="grid-flyout__slider"
              type="range"
              min={MAP_EDITOR_MIN_HEX_RADIUS}
              max={MAP_EDITOR_MAX_HEX_RADIUS}
              step="1"
              value={mapEditorStore.hexRadius}
              oninput={(event) =>
                setHexRadius(Number((event.currentTarget as HTMLInputElement).value))}
            />
            <label class="grid-flyout__number">
              <span>px</span>
              <input
                type="number"
                min={MAP_EDITOR_MIN_HEX_RADIUS}
                max={MAP_EDITOR_MAX_HEX_RADIUS}
                step="1"
                value={gridInputValue}
                onfocus={() => {
                  gridInputFocused = true;
                }}
                onblur={() => {
                  commitGridInput();
                  gridInputFocused = false;
                }}
                oninput={(event) => {
                  gridInputValue = (event.currentTarget as HTMLInputElement).value;
                }}
                onkeydown={handleGridInputKeydown}
              />
            </label>
          </div>
          <div class="grid-flyout__footer">
            <span>Saved with map</span>
            <span>{mapEditorStore.hexRadius}px</span>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="board-hud__cluster board-hud__cluster--right">
    <div class="density-picker" aria-label="Editor density">
      <button type="button" class:is-active={density === "compact"} onclick={() => setDensity("compact")} title="Compact density">C</button>
      <button type="button" class:is-active={density === "standard"} onclick={() => setDensity("standard")} title="Standard density">S</button>
      <button type="button" class:is-active={density === "expanded"} onclick={() => setDensity("expanded")} title="Expanded density">E</button>
    </div>
    {#if density !== "compact"}
      <div class="status-chip" title={statusMessage}>{statusMessage}</div>
    {/if}
  </div>
</div>

<style>
  .board-hud {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--pax-space-3);
    width: 100%;
    min-width: 0;
  }

  .board-hud__cluster {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--pax-gap-sm);
  }

  .board-hud__cluster--right {
    justify-content: flex-end;
    margin-left: auto;
  }

  .hud-pill,
  .hud-readout,
  .density-picker,
  .status-chip {
    min-height: 40px;
    border-radius: 14px;
    border: 1px solid var(--editor-border, color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent));
    background: color-mix(in srgb, var(--pax-color-void) 82%, transparent);
    backdrop-filter: blur(14px);
    color: var(--pax-ui-text);
    box-shadow: 0 14px 40px color-mix(in srgb, var(--pax-color-void) 24%, transparent);
  }

  .hud-pill,
  .hud-readout,
  .status-chip {
    padding: 0 var(--pax-space-3);
    display: inline-flex;
    align-items: center;
    gap: var(--pax-space-2);
  }

  .hud-pill {
    cursor: pointer;
  }

  .grid-control {
    position: relative;
    pointer-events: auto;
  }

  .hud-readout--interactive {
    cursor: pointer;
    border-color: color-mix(in srgb, var(--pax-ui-text-soft) 20%, transparent);
    transition:
      border-color 140ms ease,
      background 140ms ease,
      box-shadow 140ms ease;
  }

  .hud-readout--interactive:hover,
  .hud-readout--interactive.is-open {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 52%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    box-shadow: 0 16px 40px color-mix(in srgb, var(--pax-color-void) 28%, transparent);
  }

  .hud-pill svg {
    width: 18px;
    height: 18px;
  }

  .hud-readout strong,
  .status-chip {
    font-family: var(--pax-ui-font-ui);
    letter-spacing: 0.08em;
  }

  .hud-pill span,
  .hud-readout span {
    font-size: var(--pax-type-xs);
    text-transform: uppercase;
    color: rgba(191, 219, 254, 0.9);
  }

  .hud-pill--strong {
    background: linear-gradient(135deg, color-mix(in srgb, var(--pax-color-void) 96%, transparent), color-mix(in srgb, var(--pax-color-void) 95%, transparent));
  }

  .density-picker {
    padding: var(--pax-space-1);
    display: inline-flex;
    gap: var(--pax-space-1);
  }

  .grid-flyout {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    min-width: 156px;
    padding: var(--pax-gap-sm);
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-accent) 30%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 94%, transparent);
    backdrop-filter: blur(18px);
    box-shadow: 0 20px 48px color-mix(in srgb, var(--pax-color-void) 30%, transparent);
    display: grid;
    gap: var(--pax-space-3);
  }

  .grid-flyout__header,
  .grid-flyout__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pax-gap-sm);
  }

  .grid-flyout__header strong,
  .grid-flyout__footer span:last-child {
    font-family: var(--pax-ui-font-ui);
    letter-spacing: 0.08em;
  }

  .grid-flyout__header span,
  .grid-flyout__footer span:first-child {
    font-size: var(--pax-type-xs);
    text-transform: uppercase;
    color: rgba(191, 219, 254, 0.82);
  }

  .grid-flyout__body {
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: var(--pax-gap-sm);
  }

  .grid-flyout__slider {
    appearance: slider-vertical;
    -webkit-appearance: slider-vertical;
    writing-mode: vertical-lr;
    direction: rtl;
    width: 20px;
    height: 148px;
    margin: 0;
    accent-color: var(--pax-color-player-blue);
  }

  .grid-flyout__number {
    display: grid;
    align-content: center;
    gap: var(--pax-gap-xs);
  }

  .grid-flyout__number span {
    font-size: var(--pax-type-xs);
    text-transform: uppercase;
    color: rgba(191, 219, 254, 0.82);
  }

  .grid-flyout__number input {
    width: 62px;
    min-height: 36px;
    padding: 0 var(--pax-gap-sm);
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 20%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    color: var(--pax-ui-text-strong);
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-base);
    font-weight: var(--pax-weight-bold);
  }

  .grid-flyout__number input:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--pax-ui-accent) 25%, transparent);
  }

  .density-picker button {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: color-mix(in srgb, var(--pax-ui-text) 86%, transparent);
    cursor: pointer;
    font-family: var(--pax-ui-font-ui);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.08em;
  }

  .density-picker button.is-active {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    color: var(--pax-ui-text-strong);
  }


  .status-chip {
    max-width: min(420px, 34vw);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 980px) {
    .board-hud {
      justify-content: flex-start;
    }

    .status-chip {
      max-width: min(100%, 420px);
    }
  }
</style>
