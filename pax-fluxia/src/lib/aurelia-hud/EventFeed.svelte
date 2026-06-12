<script lang="ts">
  import { hud } from './state/hud-state.svelte';
  import HudPanel from './primitives/HudPanel.svelte';
  import FactionSigil from './primitives/FactionSigil.svelte';

  const toneText: Record<string, string> = {
    teal: 'text-teal-2',
    amber: 'text-amber-2',
    ice: 'text-ice',
    nova: 'text-nova',
    neutral: 'text-text-faint',
  };
  const sigilFor: Record<string, 'luminara' | 'vaelari' | 'neutral'> = {
    teal: 'luminara',
    amber: 'vaelari',
  };
</script>

<HudPanel
  title="Event Feed"
  collapsible
  collapsed={!hud.panels.events}
  onToggle={() => (hud.panels.events = !hud.panels.events)}
>
  <ul class="hud-scroll max-h-44 space-y-2 overflow-y-auto px-3.5 py-3" aria-live="polite">
    {#each hud.events as ev (ev.id)}
      <li class="flex gap-2.5">
        <span class="mt-0.5 flex-none {toneText[ev.tone]}">
          <FactionSigil variant={sigilFor[ev.tone] ?? 'neutral'} size={13} />
        </span>
        <p class="hud-num min-w-0 text-[11.5px] leading-snug text-text-dim">
          <span class="text-text-faint">Tick {ev.tick}:</span>
          {#each ev.parts as part, i (i)}<span
              class={part.accent ? `font-semibold ${toneText[ev.tone]}` : ''}>{part.text}</span
            >{/each}
        </p>
      </li>
    {/each}
  </ul>
</HudPanel>
