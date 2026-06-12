<script lang="ts">
  import { Menu } from '@ark-ui/svelte/menu';
  import { Portal } from '@ark-ui/svelte/portal';
  import { hud, type OrderKind } from './state/hud-state.svelte';
  import HudPanel from './primitives/HudPanel.svelte';
  import Icon from './primitives/Icon.svelte';
  import StatRow from './primitives/StatRow.svelte';
  import Pips from './primitives/Pips.svelte';
  import MeterBar from './primitives/MeterBar.svelte';
  import HudButton from './primitives/HudButton.svelte';

  const star = $derived(hud.selectedStar);
  const owner = $derived(star ? hud.factions.find((f) => f.id === star.ownerId) : undefined);

  const pressureLabel = $derived.by(() => {
    const p = star?.pressure ?? 0;
    const band = p < 0.34 ? 'Low' : p < 0.67 ? 'Contested' : 'Critical';
    return `${band} (${Math.round(p * 100)}%)`;
  });

  const ORDER_META: Record<OrderKind, { icon: string; label: string }> = {
    move: { icon: 'move', label: 'Move Fleet' },
    develop: { icon: 'develop', label: 'Develop' },
    garrison: { icon: 'garrison', label: 'Garrison' },
    fortify: { icon: 'fortify', label: 'Fortify' },
    hold: { icon: 'hold', label: 'Hold Position' },
  };
  const orderKinds = Object.keys(ORDER_META) as OrderKind[];

  function onAddOrder(details: { value: string }) {
    hud.issueOrder(details.value as OrderKind);
  }
</script>

<HudPanel
  title="Star View"
  lit
  collapsible
  collapsed={!hud.panels.starView}
  onToggle={() => (hud.panels.starView = !hud.panels.starView)}
>
  {#if star}
    <div class="hud-scroll max-h-[46vh] overflow-y-auto px-3.5 pt-3 pb-3.5">
      <!-- identity -->
      <div class="mb-2 flex items-center gap-3">
        <span
          class="grid size-10 flex-none place-items-center rounded-full text-gold-3 ring-1 ring-gold-1/70 shadow-glow-gold"
        >
          <Icon name={star.kind} size={20} stroke={1.4} />
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-display truncate text-[15px] font-semibold tracking-[0.12em] text-text">
            {star.name}
          </p>
          {#if star.epithet}
            <p class="hud-label text-[9px] text-gold-2">{star.epithet}</p>
          {/if}
        </div>
        <span class="flex items-center gap-1 text-teal-2" title="Defense rating">
          <Icon name="shield" size={14} />
          <span class="hud-num text-[12px] font-semibold">{star.defense}</span>
        </span>
      </div>

      <!-- stats -->
      <div class="divide-y divide-line/40">
        <StatRow label="Star Type">
          <Icon name={star.kind} size={13} class="text-amber-2" />
          <span class="capitalize">{star.kind}</span>
        </StatRow>
        <StatRow label="Control">
          <span class={owner?.tone === 'teal' ? 'text-teal-2' : 'text-amber-2'}>
            {owner?.name ?? 'Unclaimed'}
          </span>
        </StatRow>
        <StatRow label="Population">
          <Pips value={star.population} max={star.populationMax} tone="teal" />
          <span class="text-text-dim">{star.population}/{star.populationMax}</span>
        </StatRow>
        <StatRow label="Defense">
          <Pips value={star.defense} max={star.defenseMax} tone="teal" />
        </StatRow>
        <StatRow label="Development">{star.development}</StatRow>
        <StatRow label="Pressure">
          <MeterBar value={star.pressure} tone="pressure" class="w-16" />
          <span class="text-[11px] text-text-dim">{pressureLabel}</span>
        </StatRow>
        <StatRow label="Flux Income">
          <span class="text-amber-2">+{star.fluxPerTick}<span class="text-text-faint">/tick</span></span>
        </StatRow>
        <StatRow label="Influence">
          <span class="text-teal-2">+{star.influencePerTick}<span class="text-text-faint">/tick</span></span>
        </StatRow>
        <StatRow label="Intel Level">{star.intelLevel}</StatRow>
      </div>

      <!-- current order -->
      <h3 class="hud-label mt-3.5 mb-2 text-[10px] text-text-faint">Current Order</h3>
      {#if hud.currentOrder}
        {@const ord = hud.currentOrder}
        <div class="hud-frame hud-frame-teal bevel" style="--bv: 9px; --panel-bv: 9px">
          <div class="bevel bg-teal-0/30 px-3 py-2.5 backdrop-blur-sm">
            <div class="flex items-center gap-2">
              <Icon name={ORDER_META[ord.kind].icon} size={14} class="text-teal-2" />
              <span class="hud-label flex-1 text-[10px] text-teal-3">{ORDER_META[ord.kind].label}</span>
              {#if ord.eta != null}
                <span class="hud-num text-[10px] text-text-dim">ETA <span class="font-bold text-teal-2">{ord.eta}</span></span>
              {/if}
            </div>
            {#if ord.targetName}
              <p class="hud-num mt-1.5 flex items-center gap-1.5 text-[12px] text-text">
                {ord.starName}
                <Icon name="arrow-right" size={11} class="text-teal-1" />
                {ord.targetName}
                {#if ord.via}
                  <span class="text-[10px] text-text-faint">via {ord.via}</span>
                {/if}
              </p>
            {/if}
            <HudButton variant="danger" size="sm" class="mt-2.5 w-full" onclick={() => hud.requestCancel(ord)}>
              Cancel order
            </HudButton>
          </div>
        </div>
      {:else}
        <p class="hud-label py-1 text-[10px] text-text-faint normal-case">
          No active order. Queue one below.
        </p>
      {/if}

      <!-- order queue -->
      <h3 class="hud-label mt-3.5 mb-2 flex items-baseline justify-between text-[10px] text-text-faint">
        Order Queue
        <span class="hud-num text-gold-2">{hud.orderQueue.length}</span>
      </h3>
      <ol class="space-y-1">
        {#each hud.orderQueue as ord, i (ord.id)}
          <li
            class="flex h-8 items-center gap-2 bg-hull-2/60 px-2 ring-1 ring-line/60 ring-inset"
            style="clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)"
          >
            <span class="hud-num w-3 text-center text-[10px] text-gold-2">{i + 1}</span>
            <Icon name={ORDER_META[ord.kind].icon} size={13} class="text-text-dim" />
            <span class="hud-label flex-1 truncate text-[10px] text-text-dim">
              {ORDER_META[ord.kind].label}
              <span class="text-text-faint normal-case">· {ord.targetName ?? ord.starName}</span>
            </span>
            {#if ord.eta != null}
              <span class="hud-num text-[10px] text-text-faint">{ord.eta}</span>
            {/if}
            <button
              type="button"
              class="grid size-5 place-items-center text-text-faint transition-colors hover:text-danger"
              aria-label={`Remove ${ORDER_META[ord.kind].label} from queue`}
              onclick={() => hud.removeQueued(ord.id)}
            >
              <Icon name="x" size={11} />
            </button>
          </li>
        {/each}
        {#if hud.orderQueue.length === 0}
          <li class="hud-label py-1 text-[10px] text-text-faint normal-case">Queue is empty.</li>
        {/if}
      </ol>

      <!-- add order -->
      <Menu.Root onSelect={onAddOrder}>
        <Menu.Trigger class="mt-3 w-full">
          <span
            class="hud-frame hud-frame-lit bevel-sym block transition-shadow hover:shadow-glow-gold"
            style="--bv: 7px"
          >
            <span
              class="bevel-sym hud-label flex items-center justify-center gap-1.5 bg-amber-0/60 px-4 py-2 text-gold-3"
              style="--bv: 6px"
            >
              <Icon name="plus" size={12} /> Add order
            </span>
          </span>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content
              class="z-50 min-w-44 border border-gold-1/60 bg-hull/95 p-1 shadow-glow-gold outline-none backdrop-blur-md"
            >
              {#each orderKinds as kind (kind)}
                <Menu.Item
                  value={kind}
                  class="hud-label flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[10px] text-text-dim
                    transition-colors data-highlighted:bg-amber-0/50 data-highlighted:text-gold-3"
                >
                  <Icon name={ORDER_META[kind].icon} size={13} />
                  {ORDER_META[kind].label}
                </Menu.Item>
              {/each}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </div>
  {:else}
    <p class="hud-label px-3.5 py-4 text-[10px] text-text-faint normal-case">
      Select a star on the map to inspect it.
    </p>
  {/if}
</HudPanel>
