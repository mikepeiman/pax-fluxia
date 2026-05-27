<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let overlayToggles: Array<{ id: string; label: string; enabled: boolean; sample?: string }> = [];

  const dispatch = createEventDispatcher();

  function sampleClass(sample?: string) {
    if (sample === 'gradient') return 'bg-gradient-to-r from-cyan-300/20 via-amber-200/70 to-slate-400/20';
    if (sample === 'dashed') return 'border-t border-dashed border-cyan-300/70';
    if (sample === 'solid') return 'border-t border-amber-300/70';
    if (sample === 'fill') return 'bg-cyan-300/20 border border-cyan-300/30';
    return 'border-t border-cyan-300/60';
  }
</script>

<div class="rounded-2xl border border-amber-300/28 bg-slate-950/72 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
  <div class="mb-3 flex items-center justify-between gap-3">
    <div>
      <div class="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Overlay Legend</div>
      <div class="text-[11px] text-cyan-100/65">Map semantics currently visible</div>
    </div>
    <button type="button" class="grid h-8 w-8 place-items-center rounded-full border border-amber-300/20 bg-black/20 text-amber-100 hover:border-amber-200/50" aria-label="Close floating legend" on:click={() => dispatch('close')}>×</button>
  </div>

  <div class="space-y-1.5">
    {#each overlayToggles as item}
      <button
        type="button"
        class={`grid w-full grid-cols-[1.25rem_1fr_4rem] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${item.enabled ? 'text-cyan-50 hover:bg-cyan-300/8' : 'text-slate-500 hover:bg-amber-300/5'}`}
        on:click={() => dispatch('toggle-overlay', { id: item.id })}
      >
        <span>{item.enabled ? '✓' : '○'}</span>
        <span>{item.label}</span>
        <span class={`h-2 rounded ${sampleClass(item.sample)}`}></span>
      </button>
    {/each}
  </div>
</div>
