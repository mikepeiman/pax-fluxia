<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import OverviewPanel from './OverviewPanel.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import OverlayControlsPanel from './OverlayControlsPanel.svelte';
  import LegendPanel from './LegendPanel.svelte';

  export let mode: 'overview' | 'settings' | 'overlays' | 'legend' = 'overview';
  export let modes: Array<{ id: string; icon: string; label: string }> = [];
  export let overlayToggles: Array<{ id: string; label: string; enabled: boolean; sample?: string }> = [];
  export let selectedStar: any = undefined;

  const dispatch = createEventDispatcher();
</script>

<aside class="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-300/28 bg-slate-950/72 shadow-2xl shadow-black/40 backdrop-blur-xl">
  <div class="flex items-center justify-between gap-3 border-b border-amber-300/16 px-4 py-3">
    <div class="min-w-0">
      <div class="truncate text-xs font-black uppercase tracking-[0.2em] text-amber-200">Utility Panel</div>
      <div class="truncate text-[11px] text-cyan-100/65">Overview, overlays, and appearance controls</div>
    </div>
    <button
      type="button"
      class="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-amber-300/25 bg-black/20 text-amber-100 transition hover:border-cyan-200/60 hover:text-cyan-100"
      aria-label="Collapse utility panel"
      on:click={() => dispatch('collapse')}
    >
      ‹
    </button>
  </div>

  <nav class="grid grid-cols-4 gap-1 border-b border-amber-300/12 p-2" aria-label="Utility panel modes">
    {#each modes as item}
      <button
        type="button"
        class={`rounded-xl border px-2 py-2 text-center text-[11px] font-semibold transition ${mode === item.id ? 'border-cyan-200/55 bg-cyan-300/14 text-cyan-50 shadow-lg shadow-cyan-500/10' : 'border-amber-300/14 bg-black/18 text-amber-100/70 hover:border-amber-200/35 hover:text-amber-50'}`}
        aria-current={mode === item.id ? 'page' : undefined}
        on:click={() => dispatch('mode-change', { mode: item.id })}
      >
        <span class="block text-base leading-none">{item.icon}</span>
        <span class="mt-1 block truncate auto-collapse-label">{item.label}</span>
      </button>
    {/each}
  </nav>

  <div class="min-h-0 flex-1 overflow-y-auto p-3">
    {#if mode === 'overview'}
      <OverviewPanel {selectedStar} />
    {:else if mode === 'settings'}
      <SettingsPanel />
    {:else if mode === 'overlays'}
      <OverlayControlsPanel {overlayToggles} on:toggle-overlay={(event) => dispatch('toggle-overlay', event.detail)} />
    {:else}
      <LegendPanel {overlayToggles} on:toggle-overlay={(event) => dispatch('toggle-overlay', event.detail)} />
    {/if}
  </div>

  <div class="grid grid-cols-3 gap-2 border-t border-amber-300/12 p-3 text-[11px]">
    <button type="button" class="rounded-lg border border-amber-300/20 bg-black/20 px-2 py-2 text-amber-100/75 hover:border-cyan-200/45 hover:text-cyan-50">Reset</button>
    <button type="button" class="rounded-lg border border-amber-300/20 bg-black/20 px-2 py-2 text-amber-100/75 hover:border-cyan-200/45 hover:text-cyan-50">Preset</button>
    <button type="button" class="rounded-lg border border-amber-300/20 bg-black/20 px-2 py-2 text-amber-100/75 hover:border-cyan-200/45 hover:text-cyan-50">Help</button>
  </div>
</aside>
