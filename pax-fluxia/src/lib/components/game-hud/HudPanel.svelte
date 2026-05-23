<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title?: string;
    eyebrow?: string;
    class?: string;
    actions?: Snippet;
    children?: Snippet;
  }

  let {
    title,
    eyebrow,
    class: className = "",
    actions,
    children,
  }: Props = $props();
</script>

<section class={`pf-hud-panel ${className}`}>
  {#if title || eyebrow || actions}
    <header class="pf-hud-panel__header">
      <div class="pf-hud-panel__title-block">
        {#if eyebrow}
          <span class="pf-hud-panel__eyebrow">{eyebrow}</span>
        {/if}
        {#if title}
          <h2 class="pf-hud-panel__title">{title}</h2>
        {/if}
      </div>
      {#if actions}
        <div class="pf-hud-panel__actions">
          {@render actions()}
        </div>
      {/if}
    </header>
  {/if}

  <div class="pf-hud-panel__body">
    {#if children}
      {@render children()}
    {/if}
  </div>
</section>
