<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let overlayToggles: Array<{ id: string; label: string; enabled: boolean; sample?: string }> = [];

  const dispatch = createEventDispatcher();

  function sampleClass(sample?: string) {
    if (sample === 'gradient') return 'bg-gradient-to-r from-cyan-300/20 via-amber-200/70 to-slate-400/20';
    if (sample === 'dashed') return 'border-t border-dashed border-cyan-300/70';
    if (sample === 'solid') return 'border-t border-amber-300/70';
    if (sample === 'arrows') return 'text-cyan-200';
    if (sample === 'fill') return 'bg-cyan-300/20 border border-cyan-300/30';
    return 'border-t border-cyan-300/60';
  }
</script>

<div class="space-y-3">
  <div class="rounded-xl border border-cyan-200/18 bg-cyan-300/8 p-3 text-xs text-cyan-50/80">
    Toggle map overlays without leaving the tactical view. These keys should map to your real settings manifest.
  </div>

  <div class="space-y-2">
    {#each overlayToggles as item}
      <button
        type="button"
        class={`grid w-full grid-cols-[auto_1fr_4rem_auto] items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs transition ${item.enabled ? 'border-cyan-200/35 bg-cyan-300/10 text-cyan-50' : 'border-amber-300/12 bg-black/20 text-slate-400 hover:border-amber-200/30'}`}
        aria-pressed={item.enabled}
        on:click={() => dispatch('toggle-overlay', { id: item.id })}
      >
        <span class={`grid h-5 w-5 place-items-center rounded border text-[10px] ${item.enabled ? 'border-cyan-200/65 bg-cyan-300/20 text-cyan-50' : 'border-slate-500/50 text-slate-500'}`}>{item.enabled ? '✓' : ''}</span>
        <span class="font-semibold">{item.label}</span>
        <span class={`h-3 rounded ${sampleClass(item.sample)}`}>{item.sample === 'arrows' ? '↠↠' : ''}</span>
        <span class="text-[10px] uppercase tracking-wide opacity-60">{item.enabled ? 'On' : 'Off'}</span>
      </button>
    {/each}
  </div>
</div>
