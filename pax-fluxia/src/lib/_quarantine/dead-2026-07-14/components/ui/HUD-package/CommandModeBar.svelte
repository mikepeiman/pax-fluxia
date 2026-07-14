<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let modes: Array<{ icon: string; label: string }> = [];
  export let activeCommand = 'Order';
  export let compact = false;

  const dispatch = createEventDispatcher();
</script>

<nav class={`flex items-center justify-center overflow-hidden rounded-2xl border border-amber-300/18 bg-black/24 ${compact ? 'p-1' : 'p-1.5'}`} aria-label="Command modes">
  {#each modes as mode}
    <button
      type="button"
      class={`min-w-16 rounded-xl px-3 transition ${compact ? 'py-2' : 'py-2.5'} ${activeCommand === mode.label ? 'bg-cyan-300/14 text-cyan-50 shadow-lg shadow-cyan-500/10' : 'text-amber-100/70 hover:bg-amber-300/8 hover:text-amber-50'}`}
      aria-pressed={activeCommand === mode.label}
      on:click={() => dispatch('mode-change', { mode: mode.label })}
    >
      <span class="block text-lg leading-none">{mode.icon}</span>
      {#if !compact}
        <span class="mt-1 block text-[10px] font-bold uppercase tracking-wide">{mode.label}</span>
      {/if}
    </button>
  {/each}
</nav>
