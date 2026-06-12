<script lang="ts">
  import { Tooltip } from '@ark-ui/svelte/tooltip';
  import { Portal } from '@ark-ui/svelte/portal';
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    placement?: 'right' | 'left' | 'top' | 'bottom';
    /** classes applied to the trigger button */
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }
  let { label, placement = 'right', class: cls = '', onclick, children }: Props = $props();
</script>

<Tooltip.Root openDelay={250} closeDelay={50} positioning={{ placement, gutter: 10 }}>
  <Tooltip.Trigger class={cls} aria-label={label} {onclick}>
    {#if children}{@render children()}{/if}
  </Tooltip.Trigger>
  <Portal>
    <Tooltip.Positioner>
      <Tooltip.Content
        class="hud-label z-50 border border-gold-1/60 bg-hull px-2.5 py-1.5 text-[10px] text-gold-3 shadow-glow-gold"
      >
        {label}
      </Tooltip.Content>
    </Tooltip.Positioner>
  </Portal>
</Tooltip.Root>
