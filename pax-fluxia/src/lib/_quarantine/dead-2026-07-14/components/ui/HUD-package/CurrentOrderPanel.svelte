<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let currentOrder: any = undefined;

  const dispatch = createEventDispatcher();
</script>

{#if currentOrder}
  <div class="space-y-3 rounded-xl border border-cyan-200/22 bg-cyan-300/8 p-3">
    <div class="flex items-start gap-3">
      <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan-200/35 bg-black/25 text-cyan-100">{currentOrder.icon}</div>
      <div class="min-w-0 flex-1">
        <div class="text-sm font-bold uppercase tracking-wide text-cyan-50">{currentOrder.type}</div>
        <div class="mt-1 text-xs text-slate-300/75">{currentOrder.from} → {currentOrder.target}</div>
        <div class="mt-1 text-xs text-amber-100">ETA {currentOrder.eta} turns</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="rounded-lg border border-cyan-200/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-cyan-50 hover:bg-cyan-300/18">Edit</button>
      <button type="button" class="rounded-lg border border-amber-200/30 bg-amber-300/12 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-50 hover:bg-amber-300/20" on:click={() => dispatch('cancel-order')}>Cancel</button>
    </div>
  </div>
{:else}
  <div class="rounded-xl border border-amber-300/14 bg-black/18 p-3 text-sm text-slate-300/70">No active order for the current selection.</div>
{/if}
