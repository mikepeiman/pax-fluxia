<script lang="ts">
  import { hud } from './state/hud-state.svelte';
  import TopBar from './TopBar.svelte';
  import LeftRail from './LeftRail.svelte';
  import OverviewPanel from './OverviewPanel.svelte';
  import TacticalStandings from './TacticalStandings.svelte';
  import StarViewPanel from './StarViewPanel.svelte';
  import GameSpeedPanel from './GameSpeedPanel.svelte';
  import EventFeed from './EventFeed.svelte';
  import OverlayLegend from './OverlayLegend.svelte';
  import BottomDock from './BottomDock.svelte';
  import ZoomControls from './ZoomControls.svelte';
  import CancelOrderDialog from './CancelOrderDialog.svelte';
  import Icon from './primitives/Icon.svelte';

  interface Props {
    /** start the built-in demo clock (remove once the engine drives ticks) */
    demoTicker?: boolean;
  }
  let { demoTicker = false }: Props = $props();

  $effect(() => {
    if (!demoTicker) return;
    hud.startDemoTicker();
    return () => hud.stopDemoTicker();
  });
</script>

<!-- The HUD never blocks the map: only its children take pointer events. -->
<div class="hud-root font-ui pointer-events-none fixed inset-0 z-30 flex flex-col text-text select-none">
  <TopBar />

  <div class="relative flex min-h-0 flex-1 items-start gap-3 p-3">
    <!-- left column -->
    <LeftRail />
    {#if hud.panels.overview}
      <div class="pointer-events-auto">
        <OverviewPanel />
      </div>
    {/if}
    {#if hud.panels.legend}
      <div class="pointer-events-auto">
        <OverlayLegend />
      </div>
    {/if}

    <!-- right stack -->
    {#if hud.panels.rightStack}
      <aside
        class="hud-scroll pointer-events-auto ml-auto flex max-h-full w-72 flex-col gap-3 overflow-y-auto pr-0.5"
      >
        <TacticalStandings />
        <StarViewPanel />
        <GameSpeedPanel />
        <EventFeed />
      </aside>
    {/if}

    <!-- right-stack collapse handle -->
    <button
      type="button"
      class="pointer-events-auto absolute top-1/2 -translate-y-1/2 border border-gold-0 bg-hull/90 py-3
        text-text-faint transition-colors hover:text-gold-3
        {hud.panels.rightStack ? 'right-[19.5rem]' : 'right-0'}"
      style="clip-path: polygon(0 8px, 100% 0, 100% 100%, 0 calc(100% - 8px))"
      aria-label={hud.panels.rightStack ? 'Hide side panels' : 'Show side panels'}
      aria-expanded={hud.panels.rightStack}
      onclick={() => (hud.panels.rightStack = !hud.panels.rightStack)}
    >
      <Icon name={hud.panels.rightStack ? 'chevron-right' : 'chevron-left'} size={13} />
    </button>
  </div>

  <!-- bottom strip -->
  <div class="relative flex items-end px-3 pb-3">
    <ZoomControls />
    <div class="absolute inset-x-0 bottom-3 flex justify-center">
      <BottomDock />
    </div>
  </div>
</div>

<CancelOrderDialog />
