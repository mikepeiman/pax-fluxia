<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let star: any = undefined;

  const dispatch = createEventDispatcher();

  $: pips = Array(star?.defense ?? star?.pips ?? 0).slice(0, 8);
</script>

<div class="space-y-3">
  <div class="flex items-center gap-3 rounded-xl border border-cyan-200/20 bg-cyan-300/9 p-3">
    <div class="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-cyan-200/40 bg-black/30 text-xl text-cyan-50 shadow-lg shadow-cyan-500/20">
      {star?.icon ?? '✦'}
    </div>
    <div class="min-w-0 flex-1">
      <div class="truncate text-base font-black uppercase tracking-wide text-amber-50">{star?.name ?? 'No Star'}</div>
      <div class="truncate text-xs text-slate-300/70">{star?.type ?? 'Star'} · {star?.owner ?? 'Unknown'}</div>
    </div>
  </div>

  <div class="grid grid-cols-[2.25rem_1fr_2.25rem] gap-2">
    <button type="button" class="rounded-lg border border-amber-300/20 bg-black/25 py-2 text-amber-100 hover:border-cyan-200/45 hover:text-cyan-100" aria-label="Previous owned star" on:click={() => dispatch('prev-star')}>‹</button>
    <button type="button" class="rounded-lg border border-cyan-200/30 bg-cyan-300/10 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-50 hover:bg-cyan-300/16" on:click={() => dispatch('focus-star')}>✦ Center Star</button>
    <button type="button" class="rounded-lg border border-amber-300/20 bg-black/25 py-2 text-amber-100 hover:border-cyan-200/45 hover:text-cyan-100" aria-label="Next owned star" on:click={() => dispatch('next-star')}>›</button>
  </div>

  <dl class="space-y-2 text-xs">
    <div class="flex justify-between gap-3"><dt class="text-slate-400">Control</dt><dd class="text-cyan-100">{star?.control ?? 'Unknown'}</dd></div>
    <div class="flex justify-between gap-3"><dt class="text-slate-400">Population</dt><dd class="text-cyan-100">{star?.population ?? '—'}</dd></div>
    <div class="flex justify-between gap-3"><dt class="text-slate-400">Income</dt><dd class="text-cyan-100">{star?.income ?? '—'}</dd></div>
    <div class="flex justify-between gap-3"><dt class="text-slate-400">Intel Level</dt><dd class="text-amber-100">{star?.intel ?? 'Unknown'}</dd></div>
    <div class="flex justify-between gap-3"><dt class="text-slate-400">Connections</dt><dd class="text-amber-100">{star?.connections ?? '—'}</dd></div>
    <div class="flex justify-between gap-3"><dt class="text-slate-400">Pressure</dt><dd class="text-amber-100">{star?.pressure ?? '—'}</dd></div>
  </dl>

  <div class="flex items-center justify-between gap-3 rounded-lg border border-amber-300/12 bg-black/18 px-3 py-2 text-xs">
    <span class="text-slate-400">Defense</span>
    <span class="flex items-center gap-1">
      <strong class="mr-1 text-amber-100">{star?.defense ?? star?.pips ?? 0}</strong>
      {#each pips as _}
        <span class="h-1.5 w-1.5 rounded-full bg-cyan-200/70"></span>
      {/each}
    </span>
  </div>
</div>
