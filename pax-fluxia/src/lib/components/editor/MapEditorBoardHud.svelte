<script lang="ts">
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import {
    mapEditorUiStore,
    type MapEditorDensityPreset,
  } from "$lib/editor/mapEditorUiStore.svelte";

  interface Props {
    statusMessage: string;
    onFitViewport: () => void;
    onToggleValidation: () => void;
  }

  let {
    statusMessage,
    onFitViewport,
    onToggleValidation,
  }: Props = $props();

  const density = $derived(mapEditorUiStore.density);

  function setDensity(densityPreset: MapEditorDensityPreset) {
    mapEditorUiStore.setDensity(densityPreset);
  }
</script>

<div class="board-hud" data-density={density}>
  <div class="board-hud__cluster">
    <button type="button" class="hud-pill hud-pill--strong" onclick={onFitViewport}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3v2H7v4H5V3h6Zm8 0v6h-2V5h-4V3h6Zm-8 18v-2H7v-4H5v6h6Zm8-6v4h-4v2h6v-6h-2ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" fill="currentColor" /></svg>
      {#if density !== "compact"}<span>Center</span>{/if}
    </button>
    <div class="hud-readout">
      <strong>{Math.round(mapEditorStore.viewport.zoom * 100)}%</strong>
      <span>{mapEditorStore.hexRadius}px grid</span>
    </div>
    <button
      type="button"
      class="hud-pill"
      class:is-alert={mapEditorStore.validationErrors.length > 0}
      onclick={onToggleValidation}
    >
      <strong>{mapEditorStore.validationErrors.length}E</strong>
      <span>{mapEditorStore.validationWarnings.length}W</span>
    </button>
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
    z-index: 10;
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
    min-height: 44px;
    border-radius: 16px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(4, 11, 26, 0.82);
    backdrop-filter: blur(14px);
    color: #e2e8f0;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.24);
  }

  .hud-pill,
  .hud-readout,
  .status-chip {
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .hud-pill {
    cursor: pointer;
  }

  .hud-pill svg {
    width: 18px;
    height: 18px;
  }

  .hud-pill strong,
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

  .hud-pill.is-alert {
    border-color: rgba(248, 113, 113, 0.38);
    color: rgba(254, 226, 226, 0.96);
  }

  .density-picker {
    padding: 4px;
    display: inline-flex;
    gap: 4px;
  }

  .density-picker button {
    width: 34px;
    height: 34px;
    border-radius: 12px;
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
