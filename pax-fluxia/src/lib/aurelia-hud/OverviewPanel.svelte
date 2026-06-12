<script lang="ts">
  import { hud } from './state/hud-state.svelte';
  import HudPanel from './primitives/HudPanel.svelte';
  import Icon from './primitives/Icon.svelte';
  import FactionSigil from './primitives/FactionSigil.svelte';
  import MeterBar from './primitives/MeterBar.svelte';

  const toneText: Record<string, string> = {
    teal: 'text-teal-2',
    amber: 'text-amber-2',
    ice: 'text-ice',
    nova: 'text-nova',
  };
  const toneBar: Record<string, 'teal' | 'amber'> = { teal: 'teal', amber: 'amber' };
</script>

<HudPanel title="Overview" class="w-56" onClose={() => (hud.panels.overview = false)}>
  <div class="hud-scroll max-h-[60vh] overflow-y-auto px-3.5 py-3">
    <!-- Stars -->
    <h3 class="hud-label mb-2 text-[10px] text-text-faint">Stars</h3>
    <ul class="mb-4 space-y-1">
      {#each hud.starsByKind as row, i (i)}
        <li class="flex items-center gap-2.5">
          <Icon name={row.kind} size={13} class={toneText[row.tone]} />
          <span class="hud-num text-[13px] font-semibold text-text">{row.count}</span>
        </li>
      {/each}
    </ul>

    <!-- Fleets -->
    <h3 class="hud-label mb-2 text-[10px] text-text-faint">Fleets</h3>
    <div class="mb-4 flex items-center gap-4">
      <span class="flex items-center gap-1.5" title="Fleets underway">
        <Icon name="fleet" size={13} class="text-teal-2" />
        <span class="hud-num text-[13px] font-semibold text-text">{hud.fleets.moving}</span>
      </span>
      <span class="flex items-center gap-1.5" title="Fleets holding">
        <Icon name="hold" size={13} class="text-text-dim" />
        <span class="hud-num text-[13px] font-semibold text-text">{hud.fleets.holding}</span>
      </span>
      <span class="flex items-center gap-1.5" title="Fleets engaged">
        <Icon name="alert" size={13} class={hud.fleets.engaged > 0 ? 'text-danger' : 'text-text-faint'} />
        <span class="hud-num text-[13px] font-semibold {hud.fleets.engaged > 0 ? 'text-danger' : 'text-text-faint'}">
          {hud.fleets.engaged}
        </span>
      </span>
    </div>

    <!-- Economy -->
    <h3 class="hud-label mb-2 text-[10px] text-text-faint">Economy</h3>
    <ul class="mb-4 space-y-1.5">
      {#each hud.economy as res (res.key)}
        <li class="flex items-center gap-2">
          <Icon name={res.icon} size={13} class={toneText[res.tone]} />
          <span class="hud-label flex-1 text-[10px] text-text-dim normal-case tracking-wider">{res.label}</span>
          <span class="hud-num text-[10px] {toneText[res.tone]}">+{res.perTick}/tick</span>
          <span class="hud-num w-9 text-right text-[13px] font-semibold text-text">{res.total}</span>
        </li>
      {/each}
    </ul>

    <!-- Victory progress -->
    <h3 class="hud-label mb-2 text-[10px] text-text-faint">Victory Progress</h3>
    <ul class="space-y-2.5">
      {#each hud.factions as f (f.id)}
        <li>
          <div class="mb-1 flex items-center gap-2">
            <span class={toneText[f.tone]}><FactionSigil variant={f.sigil} size={13} /></span>
            <MeterBar value={f.victory / 100} tone={toneBar[f.tone] ?? 'teal'} class="flex-1" />
            <span class="hud-num text-[11px] text-text-dim">
              <span class="font-semibold text-text">{f.victory}</span>&hairsp;/&hairsp;100
            </span>
          </div>
        </li>
      {/each}
    </ul>
  </div>
</HudPanel>
