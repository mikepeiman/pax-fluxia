<script lang="ts">
  import { onMount } from "svelte";
  import { mapEditorUiStore } from "$lib/editor/mapEditorUiStore.svelte";

  interface Props {
    onNewMap: () => void;
    onClearBoard: () => void;
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
    onClearBoard,
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
    <button
      type="button"
      class="command-btn command-btn--danger"
      onclick={() => {
        onClearBoard();
        closeFlyouts();
      }}
    >
      Clear
    </button>
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
    gap: var(--pax-gap-sm);
    padding: var(--pax-space-2) var(--pax-gap-sm);
    border-radius: 18px;
    border: 1px solid var(--editor-border, color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent));
    background: color-mix(in srgb, var(--pax-color-void) 86%, transparent);
    backdrop-filter: blur(18px);
    box-shadow: 0 18px 50px color-mix(in srgb, var(--pax-color-void) 32%, transparent);
    z-index: 8;
  }

  .command-dock__actions {
    display: flex;
    align-items: center;
    gap: var(--pax-gap-xs);
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
    padding: var(--pax-space-2);
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 96%, transparent);
    backdrop-filter: blur(18px);
    box-shadow: 0 18px 42px color-mix(in srgb, var(--pax-color-void) 34%, transparent);
    display: grid;
    gap: var(--pax-gap-xs);
  }

  button {
    min-height: 36px;
    padding: 0 var(--pax-space-3);
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 16%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
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
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    border-color: color-mix(in srgb, var(--pax-ui-text-soft) 18%, transparent);
    color: color-mix(in srgb, var(--pax-ui-text) 92%, transparent);
  }

  .command-btn:hover,
  .command-btn.is-active {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
    background: color-mix(in srgb, var(--pax-color-void) 88%, transparent);
    color: var(--pax-ui-text-strong);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--pax-color-void) 22%, transparent);
  }

  .command-btn--danger {
    border-color: color-mix(in srgb, var(--pax-ui-danger) 30%, transparent);
    color: color-mix(in srgb, var(--pax-ui-danger) 86%, var(--pax-ui-text));
  }

  .command-btn--danger:hover {
    border-color: color-mix(in srgb, var(--pax-ui-danger) 64%, transparent);
    background: color-mix(in srgb, var(--pax-ui-danger) 18%, var(--pax-color-void));
    color: var(--pax-ui-text-strong);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--pax-ui-danger) 22%, transparent);
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
