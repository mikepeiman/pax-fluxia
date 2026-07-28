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

<section class={`pax-hud-panel ${styles.root({ class: className })}`}>
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

<style>
  /* Padding and internal rhythm live here, NOT on the Tailwind padding utilities.
     Those sit in @layer utilities and lose to unlayered CSS, so they computed to
     0 and the panel's content sat flush against its border. Scoped component CSS
     is unlayered and always wins. Density is driven by the variant's own class. */
  .pax-hud-panel {
    padding: var(--pax-panel-pad, 1.15rem 1.25rem 1.25rem);
    row-gap: var(--pax-panel-gap-y, 0.85rem);
  }
  :global(.pax-hud-panel.p-2\.5) { --pax-panel-pad: 0.9rem 1rem 1rem; --pax-panel-gap-y: 0.65rem; }
  :global(.pax-hud-panel.p-5) { --pax-panel-pad: 1.4rem 1.5rem 1.5rem; --pax-panel-gap-y: 1.05rem; }
  /* header needs to clear the body, and its title block needs internal air */
  .pax-hud-panel > :global(header) { margin-bottom: 0.25rem; column-gap: 0.85rem; }
  .pax-hud-panel > :global(header) > :global(div:first-child) { row-gap: 0.2rem; }
</style>
