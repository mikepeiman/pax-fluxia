<script lang="ts">
  import type { Snippet } from "svelte";
  import { hudPanel, type HudPanelVariants } from "$lib/design-system";

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

<section class={styles.root({ class: `pf-hud-panel ${className}` })}>
  {#if title || eyebrow || actions}
    <header class={styles.header({ class: "pf-hud-panel__header" })}>
      <div class={styles.titleBlock({ class: "pf-hud-panel__title-block" })}>
        {#if eyebrow}
          <span class={styles.eyebrow({ class: "pf-hud-panel__eyebrow" })}>{eyebrow}</span>
        {/if}
        {#if title}
          <h2 class={styles.title({ class: "pf-hud-panel__title" })}>{title}</h2>
        {/if}
      </div>
      {#if actions}
        <div class="pf-hud-panel__actions">
          {@render actions()}
        </div>
      {/if}
    </header>
  {/if}

  <div class={styles.body({ class: "pf-hud-panel__body" })}>
    {#if children}
      {@render children()}
    {/if}
  </div>
</section>
