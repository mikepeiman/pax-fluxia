<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let speed: 'pause' | '1x' | '2x' | '4x' = '1x';
  export let speeds: Array<'pause' | '1x' | '2x' | '4x'> = ['pause', '1x', '2x', '4x'];

  const dispatch = createEventDispatcher();

  function labelFor(value: string) {
    return value === 'pause' ? 'Ⅱ' : value;
  }
</script>

<div class="grid grid-cols-4 gap-2">
  {#each speeds as item}
    <button
      type="button"
      class={`rounded-lg border px-3 py-2 text-sm font-bold transition ${speed === item ? 'border-amber-200/70 bg-amber-300/18 text-amber-50 shadow-lg shadow-amber-500/15' : 'border-amber-300/16 bg-black/24 text-slate-300 hover:border-cyan-200/45 hover:text-cyan-50'}`}
      aria-pressed={speed === item}
      on:click={() => dispatch('speed-change', { speed: item })}
    >
      {labelFor(item)}
    </button>
  {/each}
</div>
