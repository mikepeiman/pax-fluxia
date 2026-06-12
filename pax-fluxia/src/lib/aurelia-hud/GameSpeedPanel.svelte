<script lang="ts">
  import { ToggleGroup } from '@ark-ui/svelte/toggle-group';
  import { hud, type GameSpeed } from './state/hud-state.svelte';
  import HudPanel from './primitives/HudPanel.svelte';
  import Icon from './primitives/Icon.svelte';

  const options: { value: string; label: string; icon?: string }[] = [
    { value: '0', label: 'Pause', icon: 'pause' },
    { value: '1', label: '1×' },
    { value: '2', label: '2×' },
    { value: '4', label: '4×' },
  ];

  function onValueChange(details: { value: string[] }) {
    const v = details.value[0];
    if (v !== undefined) hud.setSpeed(Number(v) as GameSpeed);
  }
</script>

<HudPanel title="Game Speed" brackets={false} bevel={10}>
  <ToggleGroup.Root
    value={[String(hud.speed)]}
    {onValueChange}
    class="flex gap-1.5 px-3 py-2.5"
    aria-label="Game speed"
  >
    {#each options as opt (opt.value)}
      <ToggleGroup.Item
        value={opt.value}
        aria-label={opt.label}
        class="hud-label flex h-8 flex-1 items-center justify-center gap-1 text-[11px] ring-1 transition-all
          data-[state=off]:bg-hull-2/60 data-[state=off]:text-text-faint data-[state=off]:ring-line/70
          data-[state=off]:hover:text-text-dim
          data-[state=on]:bg-teal-0/55 data-[state=on]:text-teal-2 data-[state=on]:shadow-glow-teal data-[state=on]:ring-teal-1/60
          {opt.value === '0' ? 'data-[state=on]:!bg-danger/15 data-[state=on]:!text-danger data-[state=on]:!shadow-glow-danger data-[state=on]:!ring-danger/50' : ''}"
        style="clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)"
      >
        {#if opt.icon}
          <Icon name={opt.icon} size={12} />
        {:else}
          {opt.label}
        {/if}
      </ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>
</HudPanel>
