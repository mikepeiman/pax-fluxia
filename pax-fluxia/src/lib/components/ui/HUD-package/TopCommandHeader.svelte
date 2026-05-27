<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FactionScorePod from './FactionScorePod.svelte';
  import UtilityIconCluster from './UtilityIconCluster.svelte';

  export let title = 'Pax Fluxia';
  export let themeName = 'Aurelia Drift';
  export let matchState = { turn: 67, timer: '28:47', phase: 'Match Time' };
  export let playerFaction: any;
  export let opponentFaction: any;
  export let railSide: 'left' | 'right' = 'right';
  export let bottomMode: 'full' | 'compact' | 'hidden' = 'full';
  export let leftPanelCollapsed = false;
  export let tacticalRailCollapsed = false;
  export let floatingLegendOpen = true;

  const dispatch = createEventDispatcher();
</script>

<header class="rounded-2xl border border-amber-300/28 bg-slate-950/62 px-4 py-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
  <div class="grid items-center gap-3 xl:grid-cols-[minmax(14rem,18rem)_minmax(34rem,1fr)_auto]">
    <div class="min-w-0">
      <div class="flex items-center gap-3">
        <div class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-300/35 bg-amber-300/10 text-2xl text-amber-100 shadow-lg shadow-amber-500/15">✧</div>
        <div class="min-w-0">
          <div class="truncate text-xl font-bold uppercase tracking-[0.22em] text-amber-100">{title}</div>
          <div class="truncate text-xs uppercase tracking-[0.28em] text-amber-300/70">{themeName}</div>
        </div>
      </div>
    </div>

    <div class="grid min-w-0 items-center gap-3 rounded-2xl border border-amber-300/18 bg-black/25 p-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <FactionScorePod faction={playerFaction} side="left" />

      <div class="rounded-xl border border-amber-300/22 bg-slate-950/70 px-5 py-2 text-center shadow-inner shadow-black/30">
        <div class="text-lg font-black uppercase tracking-[0.1em] text-amber-50">Turn {matchState.turn}</div>
        <div class="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-amber-300/70">{matchState.phase}</div>
        <div class="mt-1 text-xl font-semibold text-cyan-100">{matchState.timer}</div>
      </div>

      <FactionScorePod faction={opponentFaction} side="right" />
    </div>

    <UtilityIconCluster
      {railSide}
      {bottomMode}
      {leftPanelCollapsed}
      {tacticalRailCollapsed}
      {floatingLegendOpen}
      on:swap-rails={() => dispatch('swap-rails')}
      on:toggle-left-panel={() => dispatch('toggle-left-panel')}
      on:toggle-tactical-rail={() => dispatch('toggle-tactical-rail')}
      on:cycle-bottom-dock={() => dispatch('cycle-bottom-dock')}
      on:toggle-floating-legend={() => dispatch('toggle-floating-legend')}
    />
  </div>
</header>
