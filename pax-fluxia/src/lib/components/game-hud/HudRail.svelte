<script lang="ts">
  import type { Snippet } from "svelte";
  import { hudRail } from "$lib/design-system";
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

  const styles = $derived(
    hudRail({
      side,
      density: "expanded",
    }),
  );
</script>

<aside
  class={styles.root({ class: `pf-hud-rail pf-hud-rail--${side} ${className}` })}
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
