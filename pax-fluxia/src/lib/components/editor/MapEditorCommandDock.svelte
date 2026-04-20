<script lang="ts">
  import { onMount } from "svelte";
  import { mapEditorStore } from "$lib/editor/mapEditorStore.svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";

  interface Props {
    onSave: () => void;
    onExport: () => void;
    onTestSinglePlayer: () => void;
    onHostMultiplayer: () => void;
  }

  let {
    onSave,
    onExport,
    onTestSinglePlayer,
    onHostMultiplayer,
  }: Props = $props();

  const density = $derived(mapEditorUiStore.density);
  let showFileFlyout = $state(false);
  let showLaunchFlyout = $state(false);
  let fileFlyoutEl: HTMLDivElement | null = null;
  let launchFlyoutEl: HTMLDivElement | null = null;

  function toggleSheet(panel: "library" | "overflow") {
    mapEditorUiStore.openSheet(panel);
  }

  function closeFlyouts() {
    showFileFlyout = false;
    showLaunchFlyout = false;
  }

  function toggleFileFlyout() {
    showFileFlyout = !showFileFlyout;
    if (showFileFlyout) {
      showLaunchFlyout = false;
    }
  }

  function toggleLaunchFlyout() {
    showLaunchFlyout = !showLaunchFlyout;
    if (showLaunchFlyout) {
      showFileFlyout = false;
    }
  }

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (fileFlyoutEl?.contains(target) || launchFlyoutEl?.contains(target)) {
        return;
      }
      closeFlyouts();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFlyouts();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<div class="command-dock" data-density={density}>
  <div class="command-dock__summary">
    <span class="eyebrow">Map</span>
    <strong>{mapEditorStore.document.metadata.name}</strong>
  </div>

  <div class="command-dock__actions">
    <button type="button" class="primary" onclick={onSave}>Save</button>
    <div class="dock-menu" bind:this={fileFlyoutEl}>
      <button type="button" class:is-active={showFileFlyout || mapEditorUiStore.activeSheet === "library"} onclick={toggleFileFlyout}>File</button>
      {#if showFileFlyout}
        <div class="dock-flyout">
          <button type="button" onclick={() => { toggleSheet("library"); closeFlyouts(); }}>Load</button>
          <button type="button" onclick={() => { onExport(); closeFlyouts(); }}>Export</button>
        </div>
      {/if}
    </div>
    <div class="dock-menu" bind:this={launchFlyoutEl}>
      <button type="button" class="accent" class:is-active={showLaunchFlyout} onclick={toggleLaunchFlyout}>Launch</button>
      {#if showLaunchFlyout}
        <div class="dock-flyout">
          <button type="button" onclick={() => { onTestSinglePlayer(); closeFlyouts(); }}>Test SP</button>
          <button type="button" onclick={() => { onHostMultiplayer(); closeFlyouts(); }}>Host MP</button>
        </div>
      {/if}
    </div>
  </div>

  <div class="command-dock__actions command-dock__actions--secondary">
    <button type="button" onclick={() => mapEditorStore.undo()} disabled={!mapEditorStore.canUndo}>Undo</button>
    <button type="button" onclick={() => mapEditorStore.redo()} disabled={!mapEditorStore.canRedo}>Redo</button>
    <button type="button" class:is-active={mapEditorUiStore.activeSheet === "overflow"} onclick={() => toggleSheet("overflow")} aria-label="More actions">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" fill="currentColor" /></svg>
    </button>
  </div>
</div>

<style>
  .command-dock {
    position: absolute;
    left: 50%;
    bottom: 20px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 18px;
    border: 1px solid var(--editor-border, rgba(148, 163, 184, 0.16));
    background: rgba(4, 11, 26, 0.86);
    backdrop-filter: blur(18px);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.32);
    z-index: 11;
  }

  .command-dock__summary {
    display: grid;
    gap: 2px;
    padding: 0 8px 0 2px;
    min-width: 0;
  }

  .eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.88);
  }

  .command-dock__summary strong {
    font-family: "Rajdhani", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f8fafc;
    white-space: nowrap;
  }

  .command-dock__actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dock-menu {
    position: relative;
  }

  .dock-flyout {
    position: absolute;
    left: 0;
    bottom: calc(100% + 10px);
    min-width: 132px;
    padding: 8px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(4, 11, 26, 0.96);
    backdrop-filter: blur(18px);
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34);
    display: grid;
    gap: 6px;
  }

  button {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(9, 16, 31, 0.9);
    color: rgba(226, 232, 240, 0.92);
    font: inherit;
    cursor: pointer;
  }

  button.primary {
    background: linear-gradient(135deg, rgba(18, 48, 78, 0.96), rgba(11, 29, 50, 0.95));
    border-color: rgba(125, 211, 252, 0.42);
  }

  button.accent {
    background: rgba(14, 64, 87, 0.88);
    border-color: rgba(103, 232, 249, 0.34);
  }

  button.is-active {
    border-color: rgba(125, 211, 252, 0.58);
    background: rgba(17, 39, 63, 0.88);
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .command-dock__actions--secondary button {
    min-width: 36px;
    padding: 0 10px;
  }

  .command-dock__actions--secondary svg {
    width: 18px;
    height: 18px;
  }

  [data-density="compact"] .command-dock__summary {
    display: none;
  }

  @media (max-width: 980px) {
    .command-dock {
      left: 12px;
      right: 12px;
      bottom: 12px;
      transform: none;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .command-dock__actions {
      flex-wrap: wrap;
    }
  }
</style>
