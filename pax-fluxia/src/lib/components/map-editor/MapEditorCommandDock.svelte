<script lang="ts">
  import { onMount } from "svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";

  interface Props {
    onNewMap: () => void;
    onOpenDuplicate: () => void;
    onSave: () => void;
    onSaveAndExit: () => void;
    onOpenLoad: () => void;
    onExport: () => void;
    onTestSinglePlayer: () => void;
    onHostMultiplayer: () => void;
  }

  let {
    onNewMap,
    onOpenDuplicate,
    onSave,
    onSaveAndExit,
    onOpenLoad,
    onExport,
    onTestSinglePlayer,
    onHostMultiplayer,
  }: Props = $props();

  const density = $derived(mapEditorUiStore.density);
  let showLaunchFlyout = $state(false);
  let launchFlyoutEl: HTMLDivElement | null = null;

  function closeFlyouts() {
    showLaunchFlyout = false;
  }

  function toggleLaunchFlyout() {
    showLaunchFlyout = !showLaunchFlyout;
  }

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (launchFlyoutEl?.contains(target)) {
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
  <div class="command-dock__actions">
    <button type="button" class="command-btn" onclick={onNewMap}>New</button>
    <button type="button" class="command-btn" onclick={onOpenDuplicate}>Duplicate Map</button>
    <button
      type="button"
      class="command-btn"
      class:is-active={mapEditorUiStore.activeSheet === "library"}
      onclick={() => {
        onOpenLoad();
        closeFlyouts();
      }}
    >
      Load
    </button>
    <button type="button" class="command-btn" onclick={onSave}>Save</button>
    <button type="button" class="command-btn" onclick={onSaveAndExit}>
      Save &amp; Exit
    </button>
    <button type="button" class="command-btn" onclick={onExport}>Export</button>
    <div class="dock-menu" bind:this={launchFlyoutEl}>
      <button type="button" class="command-btn" class:is-active={showLaunchFlyout} onclick={toggleLaunchFlyout}>
        Launch
      </button>
      {#if showLaunchFlyout}
        <div class="dock-flyout">
          <button type="button" onclick={() => { onTestSinglePlayer(); closeFlyouts(); }}>Test SP</button>
          <button type="button" onclick={() => { onHostMultiplayer(); closeFlyouts(); }}>Host MP</button>
        </div>
      {/if}
    </div>
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
    z-index: 8;
  }

  .command-dock__actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
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
    transition:
      background 140ms ease,
      border-color 140ms ease,
      color 140ms ease,
      box-shadow 140ms ease;
  }

  .command-btn {
    font-weight: var(--pax-weight-semibold);
    background: rgba(9, 16, 31, 0.9);
    border-color: rgba(148, 163, 184, 0.18);
    color: rgba(226, 232, 240, 0.92);
  }

  .command-btn:hover,
  .command-btn.is-active {
    border-color: rgba(125, 211, 252, 0.58);
    background: rgba(17, 39, 63, 0.88);
    color: #f8fafc;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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
