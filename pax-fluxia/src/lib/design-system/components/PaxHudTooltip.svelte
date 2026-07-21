<script lang="ts">
  import { Portal } from "@ark-ui/svelte/portal";
  import { Tooltip } from "@ark-ui/svelte/tooltip";
  import type { Snippet } from "svelte";
  import { hudTooltip } from "$lib/design-system/variants/hud";

  interface Props {
    label: string;
    placement?: "top" | "right" | "bottom" | "left";
    class?: string;
    /** Hover-open delay in ms. Settings infotips pass 50 for a snappy reveal. */
    openDelay?: number;
    children?: Snippet;
  }

  let {
    label,
    placement = "top",
    class: className = "",
    openDelay = 100,
    children,
  }: Props = $props();
</script>

<Tooltip.Root {openDelay} closeDelay={50} positioning={{ placement, gutter: 10 }}>
  <Tooltip.Trigger class={className} aria-label={label}>
    {#if children}
      {@render children()}
    {/if}
  </Tooltip.Trigger>
  <Portal>
    <Tooltip.Positioner>
      <Tooltip.Content class={hudTooltip()}>{label}</Tooltip.Content>
    </Tooltip.Positioner>
  </Portal>
</Tooltip.Root>
