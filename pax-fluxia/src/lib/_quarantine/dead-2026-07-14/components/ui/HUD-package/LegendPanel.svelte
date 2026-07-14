<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let overlayToggles: Array<{ id: string; label: string; enabled: boolean; sample?: string }> = [];

  const dispatch = createEventDispatcher();

  export let symbolRows = [
    { icon: '◌', label: 'Basic Star', detail: 'Neutral or unclaimed' },
    { icon: '✦', label: 'Production Star', detail: 'Generates core economy' },
    { icon: '△', label: 'Attack Star', detail: 'Projects pressure' },
    { icon: '▣', label: 'Defense Star', detail: 'Hard to capture' },
    { icon: '⬢', label: 'Repair Star', detail: 'Restores fleets' }
  ];

  function sampleClass(sample?: string) {
    if (sample === 'gradient') return 'bg-gradient-to-r from-cyan-300/20 via-amber-200/70 to-slate-400/20';
    if (sample === 'dashed') return 'border-t border-dashed border-cyan-300/70';
    if (sample === 'solid') return 'border-t border-amber-300/70';
    if (sample === 'fill') return 'bg-cyan-300/20 border border-cyan-300/30';
    return 'border-t border-cyan-300/60';
  }
</script>

<div class="space-y-4">
  <div>
    <div class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">Star Types</div>
    <div class="space-y-2">
      {#each symbolRows as row}
        <div class="grid grid-cols-[2rem_1fr] gap-2 rounded-lg border border-amber-300/12 bg-black/18 px-2 py-2 text-xs">
          <span class="grid h-7 w-7 place-items-center rounded-full border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">{row.icon}</span>
          <span>
            <span class="block font-semibold text-amber-50">{row.label}</span>
            <span class="block text-[11px] text-slate-300/65">{row.detail}</span>
          </span>
        </div>
      {/each}
    </div>
  </div>

  <div>
    <div class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">Map Overlays</div>
    <div class="space-y-2">
      {#each overlayToggles as item}
        <button
          type="button"
          class={`grid w-full grid-cols-[1fr_4rem_auto] items-center gap-3 rounded-lg border px-2 py-2 text-left text-xs ${item.enabled ? 'border-cyan-200/26 bg-cyan-300/8 text-cyan-50' : 'border-amber-300/12 bg-black/18 text-slate-400'}`}
          on:click={() => dispatch('toggle-overlay', { id: item.id })}
        >
          <span>{item.label}</span>
          <span class={`h-3 rounded ${sampleClass(item.sample)}`}></span>
          <span>{item.enabled ? '✓' : '○'}</span>
        </button>
      {/each}
    </div>
  </div>
</div>
