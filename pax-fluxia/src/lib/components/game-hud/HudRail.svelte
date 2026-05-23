<script lang="ts">
  import type { Snippet } from "svelte";
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

<aside
  class={`pf-hud-rail pf-hud-rail--${side} ${className}`}
  style={`width:${width}px;`}
>
  {#if onResizePointerDown}
    <div
      class="pf-hud-rail__resize"
      class:active={resizeActive}
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize"
      onpointerdown={onResizePointerDown}
    ></div>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</aside>
