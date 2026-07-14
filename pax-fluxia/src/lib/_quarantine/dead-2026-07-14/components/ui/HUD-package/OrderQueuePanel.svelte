<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let orders: Array<{ index: number; type: string; target: string; eta: number | string; icon: string; tone?: string }> = [];

  const dispatch = createEventDispatcher();

  const toneClass: Record<string, string> = {
    cyan: 'text-cyan-100 border-cyan-200/20 bg-cyan-300/8',
    amber: 'text-amber-100 border-amber-200/20 bg-amber-300/8',
    fuchsia: 'text-fuchsia-100 border-fuchsia-200/20 bg-fuchsia-300/8',
    slate: 'text-slate-100 border-slate-200/16 bg-slate-300/6'
  };
</script>

<div class="space-y-2">
  {#each orders as order}
    <div class={`grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-xs ${toneClass[order.tone ?? 'slate']}`}>
      <span class="text-slate-300/70">{order.index}</span>
      <span class="min-w-0">
        <span class="block truncate font-semibold"><span class="mr-1">{order.icon}</span>{order.type}</span>
        <span class="block truncate text-[11px] text-slate-300/65">To {order.target} · ETA {order.eta}</span>
      </span>
      <button
        type="button"
        class="grid h-7 w-7 place-items-center rounded-full border border-amber-300/20 bg-black/20 text-amber-100 hover:border-amber-200/60"
        aria-label={`Remove order ${order.index}`}
        on:click={() => dispatch('remove-order', { index: order.index })}
      >
        ×
      </button>
    </div>
  {/each}

  <button type="button" class="w-full rounded-lg border border-cyan-200/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-cyan-50 hover:bg-cyan-300/18">
    + Add Order
  </button>
</div>
