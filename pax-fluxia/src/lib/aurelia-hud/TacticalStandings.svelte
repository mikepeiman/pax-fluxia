<script lang="ts">
  import { hud } from './state/hud-state.svelte';
  import HudPanel from './primitives/HudPanel.svelte';
  import FactionSigil from './primitives/FactionSigil.svelte';

  const toneText: Record<string, string> = {
    teal: 'text-teal-2',
    amber: 'text-amber-2',
    ice: 'text-ice',
    nova: 'text-nova',
  };
</script>

<HudPanel
  title="Tactical Standings"
  collapsible
  collapsed={!hud.panels.standings}
  onToggle={() => (hud.panels.standings = !hud.panels.standings)}
>
  <ol class="space-y-1 px-2.5 py-2.5">
    {#each hud.standings as f, i (f.id)}
      <li
        class="flex h-8 items-center gap-2.5 px-2 transition-colors
          {f.id === hud.playerFactionId
          ? 'bg-teal-0/35 ring-1 ring-teal-1/40 ring-inset'
          : 'bg-hull-2/50 ring-1 ring-line/60 ring-inset'}"
        style="clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)"
      >
        <span class="hud-num w-3 text-center text-[11px] text-text-faint">{i + 1}</span>
        <span class={toneText[f.tone]}><FactionSigil variant={f.sigil} size={14} /></span>
        <span class="hud-label flex-1 truncate text-[10px] {f.id === hud.playerFactionId ? 'text-teal-3' : 'text-text-dim'}">
          {f.name}
        </span>
        <span class="hud-num text-[14px] font-bold {toneText[f.tone]}">{f.score}</span>
      </li>
    {/each}
  </ol>
</HudPanel>
