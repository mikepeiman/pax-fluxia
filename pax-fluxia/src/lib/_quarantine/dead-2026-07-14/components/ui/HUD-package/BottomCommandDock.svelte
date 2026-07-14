<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import QuickAccessStrip from './QuickAccessStrip.svelte';
  import CommandModeBar from './CommandModeBar.svelte';
  import ResourceStrip from './ResourceStrip.svelte';

  export let mode: 'full' | 'compact' | 'hidden' = 'full';
  export let quickStars: any[] = [];
  export let commandModes: Array<{ icon: string; label: string }> = [];
  export let activeCommand = 'Order';
  export let resources: Array<{ icon: string; label: string; value: string | number }> = [];
  export let selectedStarId = '';

  const dispatch = createEventDispatcher();
</script>

{#if mode !== 'hidden'}
  <footer class={`rounded-2xl border border-amber-300/25 bg-slate-950/72 shadow-2xl shadow-black/40 backdrop-blur-xl ${mode === 'compact' ? 'px-3 py-2' : 'px-4 py-3'}`}>
    {#if mode === 'full'}
      <div class="grid items-center gap-3 xl:grid-cols-[minmax(20rem,1fr)_auto_minmax(16rem,1fr)]">
        <QuickAccessStrip {quickStars} {selectedStarId} on:select-star={(event) => dispatch('select-star', event.detail)} />
        <CommandModeBar modes={commandModes} {activeCommand} on:mode-change={(event) => dispatch('mode-change', event.detail)} />
        <div class="flex items-center justify-end gap-3">
          <ResourceStrip {resources} />
          <button type="button" class="grid h-11 w-11 place-items-center rounded-xl border border-amber-300/25 bg-black/24 text-amber-100 hover:border-cyan-200/50" aria-label="Cycle bottom dock mode" on:click={() => dispatch('cycle-mode')}>⌄</button>
        </div>
      </div>
    {:else}
      <div class="flex items-center justify-center gap-4">
        <CommandModeBar modes={commandModes} {activeCommand} compact on:mode-change={(event) => dispatch('mode-change', event.detail)} />
        <ResourceStrip {resources} compact />
        <button type="button" class="rounded-lg border border-amber-300/20 bg-black/25 px-3 py-2 text-xs text-amber-100 hover:border-cyan-200/45" on:click={() => dispatch('cycle-mode')}>Dock</button>
      </div>
    {/if}
  </footer>
{/if}
