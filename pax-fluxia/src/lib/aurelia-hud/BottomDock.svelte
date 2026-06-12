<script lang="ts">
  import { ToggleGroup } from '@ark-ui/svelte/toggle-group';
  import { hud, type HudMode } from './state/hud-state.svelte';
  import Icon from './primitives/Icon.svelte';

  const modes: { value: HudMode; icon: string; label: string }[] = [
    { value: 'fleet', icon: 'fleet', label: 'Fleet' },
    { value: 'order', icon: 'order', label: 'Order' },
    { value: 'build', icon: 'build', label: 'Build' },
    { value: 'research', icon: 'research', label: 'Research' },
    { value: 'diplomacy', icon: 'diplomacy', label: 'Diplomacy' },
    { value: 'intel', icon: 'intel', label: 'Intel' },
  ];

  function onValueChange(details: { value: string[] }) {
    const v = details.value[0];
    if (v !== undefined) hud.setMode(v as HudMode);
  }
</script>

<div class="pointer-events-auto relative flex flex-col items-center">
  <!-- collapse handle -->
  <button
    type="button"
    class="relative z-10 -mb-px flex h-5 w-12 items-center justify-center border border-b-0 border-gold-0
      bg-hull text-text-faint transition-colors hover:text-gold-3"
    style="clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 100%, 0 100%)"
    aria-label={hud.panels.dock ? 'Hide command dock' : 'Show command dock'}
    aria-expanded={hud.panels.dock}
    onclick={() => (hud.panels.dock = !hud.panels.dock)}
  >
    <Icon name={hud.panels.dock ? 'chevron-down' : 'chevron-up'} size={12} />
  </button>

  {#if hud.panels.dock}
    <div class="dock-plate bg-gradient-to-b from-gold-1/90 via-gold-0/70 to-gold-1/90 p-px">
      <ToggleGroup.Root
        value={[hud.mode]}
        {onValueChange}
        class="dock-plate flex items-end gap-1 bg-gradient-to-b from-hull-2/95 to-void/95 px-8 pt-2 pb-1.5 backdrop-blur-md"
        aria-label="Command mode"
      >
        {#each modes as m (m.value)}
          <ToggleGroup.Item
            value={m.value}
            class="group relative flex w-[72px] flex-col items-center gap-1 px-2 pt-1.5 pb-2 transition-colors
              data-[state=off]:text-text-faint data-[state=off]:hover:text-text-dim
              data-[state=on]:text-gold-3"
            aria-label={m.label}
          >
            <Icon
              name={m.icon}
              size={19}
              class="transition-all group-data-[state=on]:drop-shadow-[0_0_7px_rgba(236,210,138,0.65)]"
            />
            <span class="hud-label text-[9px]">{m.label}</span>
            <!-- active underline -->
            <span
              class="absolute inset-x-3 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-gold-3 to-transparent
                opacity-0 transition-opacity group-data-[state=on]:opacity-100"
              aria-hidden="true"
            ></span>
          </ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </div>
  {/if}
</div>
