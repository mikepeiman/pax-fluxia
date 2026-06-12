<script lang="ts">
  import { hud } from './state/hud-state.svelte';
  import Icon from './primitives/Icon.svelte';
  import HudTooltip from './primitives/HudTooltip.svelte';

  const items = [
    { icon: 'gear', label: 'Settings', action: 'settings' },
    { icon: 'chart', label: 'Statistics', action: 'stats' },
    { icon: 'star', label: 'Empire overview', action: 'stars' },
    { icon: 'network', label: 'Map overlays', action: 'overlays' },
    { icon: 'users', label: 'Factions', action: 'players' },
    { icon: 'bookmark', label: 'Bookmarks', action: 'bookmarks' },
    { icon: 'target', label: 'Objectives', action: 'objectives' },
  ];

  const isActive = (action: string) =>
    (action === 'stars' && hud.panels.overview) || (action === 'overlays' && hud.panels.legend);
</script>

<nav class="pointer-events-auto relative w-12 self-start" aria-label="Command rail">
  <div class="hud-frame bevel" style="--bv: 10px; --panel-bv: 10px">
    <div class="hud-plate bevel flex flex-col items-center gap-1 py-3">
      {#each items as item, i (item.action)}
        {#if i === 4}
          <span class="my-1 h-px w-5 bg-gold-0" aria-hidden="true"></span>
        {/if}
        <HudTooltip
          label={item.label}
          onclick={() => hud.railAction(item.action)}
          class="grid size-9 place-items-center transition-colors [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]
            {isActive(item.action)
            ? 'bg-teal-0/50 text-teal-2 shadow-glow-teal'
            : 'text-text-faint hover:bg-hull-3/70 hover:text-gold-3'}"
        >
          <Icon name={item.icon} size={16} />
        </HudTooltip>
      {/each}
    </div>
  </div>
  <span class="hud-bracket hud-bracket-tr" aria-hidden="true"></span>
  <span class="hud-bracket hud-bracket-bl" aria-hidden="true"></span>
</nav>
