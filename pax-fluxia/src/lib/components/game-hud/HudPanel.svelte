<script lang="ts">
  import type { Snippet } from "svelte";
  import { PaxHudPanel, type HudPanelVariants } from "$lib/design-system";

  interface Props {
    title?: string;
    eyebrow?: string;
    density?: HudPanelVariants["density"];
    tone?: HudPanelVariants["tone"];
    class?: string;
    actions?: Snippet;
    children?: Snippet;
  }

  let {
    title,
    eyebrow,
    density = "balanced",
    tone = "default",
    class: className = "",
    actions,
    children,
  }: Props = $props();

</script>

<PaxHudPanel
  {title}
  {eyebrow}
  {density}
  {tone}
  class={`pf-hud-panel ${className}`}
  {actions}
>
  {#if children}
    {@render children()}
  {/if}
</PaxHudPanel>
