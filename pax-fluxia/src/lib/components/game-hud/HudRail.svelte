<script lang="ts">
  import type { Snippet } from "svelte";
  import { PaxHudRail } from "$lib/design-system";
  import type { HudDockSide } from "./types";

  interface Props {
    side: HudDockSide;
    width: number;
    class?: string;
    resizeActive?: boolean;
    onResizePointerDown?: (event: PointerEvent) => void;
    children?: Snippet;
  }

  let {
    side,
    width,
    class: className = "",
    resizeActive = false,
    onResizePointerDown,
    children,
  }: Props = $props();

</script>

<PaxHudRail
  {side}
  density="expanded"
  {width}
  class={`pf-hud-rail pf-hud-rail--${side} ${className}`}
  {resizeActive}
  {onResizePointerDown}
>
  {#if children}
    {@render children()}
  {/if}
</PaxHudRail>
