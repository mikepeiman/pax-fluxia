<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let zoom = 100;
  export let floatingLegendOpen = true;

  const dispatch = createEventDispatcher();
</script>

<div class="flex items-center gap-2 rounded-2xl border border-amber-300/25 bg-slate-950/70 p-2 shadow-2xl shadow-black/35 backdrop-blur-xl">
  <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-amber-300/22 bg-black/25 text-amber-100 hover:border-cyan-200/45 hover:text-cyan-100" aria-label="Zoom out" on:click={() => dispatch('zoom-out')}>−</button>
  <div class="min-w-16 text-center text-xs font-bold text-amber-50">{zoom}%</div>
  <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-amber-300/22 bg-black/25 text-amber-100 hover:border-cyan-200/45 hover:text-cyan-100" aria-label="Zoom in" on:click={() => dispatch('zoom-in')}>+</button>
  <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-amber-300/22 bg-black/25 text-amber-100 hover:border-cyan-200/45 hover:text-cyan-100" aria-label="Center selected star" on:click={() => dispatch('center-star')}>⌖</button>
  <button type="button" class={`grid h-9 w-9 place-items-center rounded-full border text-sm ${floatingLegendOpen ? 'border-cyan-200/55 bg-cyan-300/14 text-cyan-50' : 'border-amber-300/22 bg-black/25 text-amber-100 hover:border-cyan-200/45'}`} aria-label="Toggle floating legend" on:click={() => dispatch('toggle-legend')}>◇</button>
</div>
