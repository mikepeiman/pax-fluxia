<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let title = 'Panel';
  export let variant: 'utility' | 'tactical' = 'utility';
  export let items: Array<{ id: string; icon: string; label: string }> = [];

  const dispatch = createEventDispatcher();
</script>

<aside class="flex h-full min-h-0 flex-col items-center gap-2 rounded-2xl border border-amber-300/25 bg-slate-950/72 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
  <button
    type="button"
    class="grid h-9 w-9 place-items-center rounded-full border border-cyan-200/30 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/18"
    aria-label={`Expand ${title}`}
    on:click={() => dispatch('expand')}
  >
    {variant === 'utility' ? '›' : '‹'}
  </button>

  <div class="my-1 h-px w-full bg-amber-300/18"></div>

  {#each items as item}
    <button
      type="button"
      class="grid h-9 w-9 place-items-center rounded-xl border border-amber-300/16 bg-black/22 text-amber-100/80 transition hover:border-cyan-200/45 hover:text-cyan-50"
      title={item.label}
      aria-label={item.label}
      on:click={() => dispatch('open-mode', { mode: item.id })}
    >
      {item.icon}
    </button>
  {/each}
</aside>
