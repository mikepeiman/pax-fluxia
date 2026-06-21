<script lang="ts">
  import Newsletter from "./Newsletter.svelte";
  import { SITE } from "./content";

  let { onPlay }: { onPlay: () => void } = $props();
</script>

<section class="final">
  <div class="final-bg" style="background-image:url('/assets/pax-fluxia-bg-22.jpg')"></div>
  <div class="final-scrim"></div>

  <div class="final-inner site-shell">
    <p class="site-eyebrow site-eyebrow--center">Enlist</p>
    <h2 class="site-h2">Be first through the breach</h2>
    <p class="site-lead">
      Play the alpha now, or join the list for build drops, design notes, and the
      occasional galaxy-ending balance change. No spam — just the war room.
    </p>

    <div class="actions">
      <button class="site-btn site-btn--primary site-btn--lg" onclick={onPlay}>
        Play the Alpha — Free
      </button>
      <a
        class="site-btn site-btn--ghost site-btn--lg"
        href={SITE.discord}
        target="_blank"
        rel="noopener noreferrer">
        Join the Discord
      </a>
    </div>

    <div class="news">
      <Newsletter cta="Join the list" />
    </div>
  </div>
</section>

<style>
  .final {
    position: relative;
    overflow: hidden;
    padding-block: clamp(4rem, 9vw, 7.5rem);
  }
  .final-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0.5;
  }
  .final-scrim {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 50% 50%, rgba(4, 6, 15, 0.55), rgba(4, 6, 15, 0.9) 80%),
      linear-gradient(180deg, var(--site-void) 0%, transparent 25%, transparent 75%, var(--site-void) 100%);
  }
  .final-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.2rem;
    max-width: 720px;
  }
  .final-inner .site-lead {
    max-width: 58ch;
  }
  .actions {
    display: flex;
    gap: 0.9rem;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 0.6rem;
  }
  .news {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }
</style>
