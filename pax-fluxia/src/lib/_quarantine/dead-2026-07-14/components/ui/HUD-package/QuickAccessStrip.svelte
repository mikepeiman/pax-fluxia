<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let quickStars: Array<{ id: string; name: string; value: string | number; icon: string; tone?: string }> = [];
  export let selectedStarId = '';

  const dispatch = createEventDispatcher();

  const toneClass: Record<string, string> = {
    cyan: 'border-cyan-200/35 bg-cyan-300/10 text-cyan-50',
    amber: 'border-amber-200/35 bg-amber-300/10 text-amber-50',
    fuchsia: 'border-fuchsia-200/35 bg-fuchsia-300/10 text-fuchsia-50',
    slate: 'border-slate-200/25 bg-slate-300/8 text-slate-50'
  };
</script>

<div class="min-w-0">
  <div class="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">
    <span>Quick Access</span>
    <span class="text-amber-200/40">⌃</span>
  </div>
  <div class="flex min-w-0 gap-2 overflow-x-auto pb-1">
    {#each quickStars as star}
      <button
        type="button"
        class={`grid min-w-28 grid-cols-[1.5rem_1fr] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition hover:border-cyan-200/60 ${selectedStarId === star.id ? 'ring-2 ring-cyan-300/25' : ''} ${toneClass[star.tone ?? 'slate']}`}
        on:click={() => dispatch('select-star', { id: star.id })}
      >
        <span class="text-lg">{star.icon}</span>
        <span class="min-w-0">
          <span class="block truncate font-bold uppercase tracking-wide">{star.name}</span>
          <span class="block text-[11px] opacity-70">{star.value}</span>
        </span>
      </button>
    {/each}
  </div>
</div>
