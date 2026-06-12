<script lang="ts">
  import type { Snippet } from "svelte";
  import { hudRail, type HudRailVariants } from "$lib/design-system/variants/hud";

  interface Props {
    side: NonNullable<HudRailVariants["side"]>;
    density?: HudRailVariants["density"];
    width: number;
    class?: string;
    resizeActive?: boolean;
    onResizePointerDown?: (event: PointerEvent) => void;
    children?: Snippet;
  }

  let {
    side,
    density = "expanded",
    width,
    class: className = "",
    resizeActive = false,
    onResizePointerDown,
    children,
  }: Props = $props();

  const styles = $derived(hudRail({ side, density }));
</script>

<aside class={styles.root({ class: className })} style={`width:${width}px;`}>
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
