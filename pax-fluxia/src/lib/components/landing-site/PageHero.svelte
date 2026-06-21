<script lang="ts">
  import Starfield from "./Starfield.svelte";

  // Compact hero band for standalone marketing pages. Clears the fixed header
  // and provides a consistent intro across /game, /devlog, /community, etc.
  let {
    eyebrow,
    title,
    accent = "",
    lead = "",
    image = null,
  }: {
    eyebrow: string;
    title: string;
    accent?: string;
    lead?: string;
    image?: string | null;
  } = $props();
</script>

<header class="page-hero">
  <div class="ph-bg">
    <Starfield {image} imageOpacity={0.4} vignette={false} />
  </div>
  <div class="ph-scrim"></div>

  <div class="ph-inner site-shell">
    <p class="site-eyebrow">{eyebrow}</p>
    <h1 class="site-h1 ph-title">
      {title}{#if accent}<br /><span class="site-gradient-text">{accent}</span>{/if}
    </h1>
    {#if lead}
      <p class="site-lead ph-lead">{lead}</p>
    {/if}
  </div>
</header>

<style>
  .page-hero {
    position: relative;
    overflow: hidden;
    padding-top: calc(var(--site-header-h) + clamp(2.5rem, 7vw, 5.5rem));
    padding-bottom: clamp(2.5rem, 6vw, 4.5rem);
  }
  .ph-bg {
    position: absolute;
    inset: 0;
  }
  .ph-scrim {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(4, 6, 15, 0.7), rgba(4, 6, 15, 0.55) 50%, var(--site-void) 100%),
      radial-gradient(80% 100% at 20% 0%, rgba(47, 227, 255, 0.08), transparent 60%);
  }
  .ph-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    max-width: 820px;
  }
  .ph-title {
    text-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  }
  .ph-lead {
    max-width: 60ch;
  }
</style>
