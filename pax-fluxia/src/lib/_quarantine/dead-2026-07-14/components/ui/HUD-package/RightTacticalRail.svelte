<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import PanelSection from './PanelSection.svelte';
  import TacticalStandingsPanel from './TacticalStandingsPanel.svelte';
  import GameSpeedControl from './GameSpeedControl.svelte';
  import StarViewPanel from './StarViewPanel.svelte';
  import CurrentOrderPanel from './CurrentOrderPanel.svelte';
  import OrderQueuePanel from './OrderQueuePanel.svelte';
  import EventFeedPanel from './EventFeedPanel.svelte';

  export let standings: any[] = [];
  export let speed: 'pause' | '1x' | '2x' | '4x' = '1x';
  export let star: any = undefined;
  export let currentOrder: any = undefined;
  export let orders: any[] = [];
  export let events: any[] = [];

  const dispatch = createEventDispatcher();
</script>

<aside class="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-300/28 bg-slate-950/76 shadow-2xl shadow-black/45 backdrop-blur-xl">
  <div class="flex items-center justify-between gap-3 border-b border-amber-300/16 px-4 py-3">
    <div class="min-w-0">
      <div class="truncate text-xs font-black uppercase tracking-[0.2em] text-amber-200">Tactical Rail</div>
      <div class="truncate text-[11px] text-cyan-100/65">Standings, speed, star view, orders</div>
    </div>
    <button
      type="button"
      class="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-amber-300/25 bg-black/20 text-amber-100 transition hover:border-cyan-200/60 hover:text-cyan-100"
      aria-label="Collapse tactical rail"
      on:click={() => dispatch('collapse')}
    >
      ›
    </button>
  </div>

  <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
    <PanelSection title="Tactical Standings" defaultOpen={true}>
      <TacticalStandingsPanel {standings} />
    </PanelSection>

    <PanelSection title="Game Speed" defaultOpen={true}>
      <GameSpeedControl {speed} on:speed-change={(event) => dispatch('speed-change', event.detail)} />
    </PanelSection>

    <PanelSection title="Star View" defaultOpen={true}>
      <StarViewPanel
        {star}
        on:prev-star={() => dispatch('prev-star')}
        on:next-star={() => dispatch('next-star')}
        on:focus-star={() => dispatch('focus-star')}
      />
    </PanelSection>

    <PanelSection title="Current Order" defaultOpen={true}>
      <CurrentOrderPanel {currentOrder} on:cancel-order={() => dispatch('cancel-order')} />
    </PanelSection>

    <PanelSection title="Order Queue" badge={orders.length} defaultOpen={true}>
      <OrderQueuePanel {orders} on:remove-order={(event) => dispatch('remove-order', event.detail)} />
    </PanelSection>

    <PanelSection title="Event Feed" defaultOpen={true}>
      <EventFeedPanel {events} />
    </PanelSection>
  </div>
</aside>
