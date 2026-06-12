<script lang="ts">
  import type { Snippet } from "svelte";
  import { hudPanel, type HudPanelVariants } from "$lib/design-system/variants/hud";

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

  const styles = $derived(hudPanel({ density, tone }));
</script>

<section class={styles.root({ class: className })}>
  {#if title || eyebrow || actions}
    <header class={styles.header()}>
      <div class={styles.titleBlock()}>
        {#if eyebrow}
          <span class={styles.eyebrow()}>{eyebrow}</span>
        {/if}
        {#if title}
          <h2 class={styles.title()}>{title}</h2>
        {/if}
      </div>
      {#if actions}
        <div class="flex shrink-0 items-center gap-1.5">
          {@render actions()}
        </div>
      {/if}
    </header>
  {/if}

  <div class={styles.body()}>
    {#if children}
      {@render children()}
    {/if}
  </div>
</section>
