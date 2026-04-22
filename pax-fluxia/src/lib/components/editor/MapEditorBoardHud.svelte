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
        title="Grid resolution"
        onclick={toggleGridFlyout}
        onwheel={handleGridWheel}
      >
        <strong>{Math.round(mapEditorStore.viewport.zoom * 100)}%</strong>
        <span>{mapEditorStore.hexRadius}px grid</span>
      </button>
      {#if showGridFlyout}
        <div class="grid-flyout" onwheel={handleGridWheel}>
          <div class="grid-flyout__header">
            <strong>Grid Resolution</strong>
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
            <span>Scroll</span>
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
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    pointer-events: none;
    z-index: 8;
  }

  .board-hud__cluster {
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
  }

  .board-hud__cluster--right {
    justify-content: flex-end;
  }

  .hud-pill,
  .hud-readout,
  .density-picker,
  .status-chip {
    min-height: 40px;
    border-radius: 14px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(4, 11, 26, 0.82);
    backdrop-filter: blur(14px);
    color: #e2e8f0;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.24);
  }

  .hud-pill,
  .hud-readout,
  .status-chip {
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
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
    border-color: rgba(148, 163, 184, 0.2);
    transition:
      border-color 140ms ease,
      background 140ms ease,
      box-shadow 140ms ease;
  }

  .hud-readout--interactive:hover,
  .hud-readout--interactive.is-open {
    border-color: rgba(125, 211, 252, 0.52);
    background: rgba(8, 18, 36, 0.9);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
  }

  .hud-pill svg {
    width: 18px;
    height: 18px;
  }

  .hud-readout strong,
  .status-chip {
    font-family: "Rajdhani", sans-serif;
    letter-spacing: 0.08em;
  }

  .hud-pill span,
  .hud-readout span {
    font-size: 0.78rem;
    text-transform: uppercase;
    color: rgba(191, 219, 254, 0.9);
  }

  .hud-pill--strong {
    background: linear-gradient(135deg, rgba(18, 48, 78, 0.96), rgba(11, 29, 50, 0.95));
  }

  .density-picker {
    padding: 4px;
    display: inline-flex;
    gap: 4px;
  }

  .grid-flyout {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    min-width: 156px;
    padding: 10px;
    border-radius: 16px;
    border: 1px solid rgba(125, 211, 252, 0.3);
    background: rgba(4, 11, 26, 0.94);
    backdrop-filter: blur(18px);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.3);
    display: grid;
    gap: 12px;
  }

  .grid-flyout__header,
  .grid-flyout__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .grid-flyout__header strong,
  .grid-flyout__footer span:last-child {
    font-family: "Rajdhani", sans-serif;
    letter-spacing: 0.08em;
  }

  .grid-flyout__header span,
  .grid-flyout__footer span:first-child {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: rgba(191, 219, 254, 0.82);
  }

  .grid-flyout__body {
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 10px;
  }

  .grid-flyout__slider {
    appearance: slider-vertical;
    -webkit-appearance: slider-vertical;
    writing-mode: vertical-lr;
    direction: rtl;
    width: 20px;
    height: 148px;
    margin: 0;
    accent-color: #60a5fa;
  }

  .grid-flyout__number {
    display: grid;
    align-content: center;
    gap: 6px;
  }

  .grid-flyout__number span {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: rgba(191, 219, 254, 0.82);
  }

  .grid-flyout__number input {
    width: 62px;
    min-height: 36px;
    padding: 0 10px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(10, 17, 33, 0.88);
    color: #f8fafc;
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    font-weight: 700;
  }

  .grid-flyout__number input:focus {
    outline: none;
    border-color: rgba(125, 211, 252, 0.58);
    box-shadow: 0 0 0 1px rgba(125, 211, 252, 0.25);
  }

  .density-picker button {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(226, 232, 240, 0.86);
    cursor: pointer;
    font-family: "Rajdhani", sans-serif;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .density-picker button.is-active {
    border-color: rgba(125, 211, 252, 0.58);
    background: rgba(17, 39, 63, 0.88);
    color: #f8fafc;
  }


  .status-chip {
    max-width: min(420px, 34vw);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 980px) {
    .board-hud {
      top: 12px;
      left: 12px;
      right: 12px;
      flex-wrap: wrap;
    }

    .status-chip {
      max-width: 100%;
    }
  }
</style>
