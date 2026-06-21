<script lang="ts">
  let { onPlay }: { onPlay: () => void } = $props();
</script>

<section class="story">
  <div
    class="story-bg"
    style="background-image:url('/assets/pax-fluxia-bg-23.jpg')">
  </div>
  <div class="story-scrim"></div>

  <div class="story-inner site-shell">
    <div class="story-card">
      <p class="site-eyebrow">The mandate</p>
      <h2 class="site-h2">
        Inherit the stars.<br />
        <span class="site-gradient-text">Secure dominion.</span>
      </h2>
      <p class="story-text">
        The long peace — the <em>Pax</em> — has shattered. Every system is a prize
        now: a forge of ships, a wall of guns, a knife-edge chokepoint. You inherit
        a handful of stars and a single mandate.
      </p>
      <p class="story-text">
        Expand. Endure. Outlast. The galaxy keeps no record of second place.
      </p>
      <div class="story-cta">
        <button class="site-btn site-btn--primary site-btn--lg" onclick={onPlay}>
          Take command
        </button>
        <a class="site-textlink" href="/game">Read the design notes →</a>
      </div>
    </div>
  </div>
</section>

<style>
  .story {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 78vh;
    overflow: hidden;
  }
  .story-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    transform: scale(1.05);
  }
  .story-scrim {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        90deg,
        rgba(3, 5, 13, 0.92) 0%,
        rgba(3, 5, 13, 0.7) 42%,
        rgba(3, 5, 13, 0.2) 75%,
        transparent 100%
      ),
      linear-gradient(180deg, var(--site-void) 0%, transparent 18%, transparent 80%, var(--site-void) 100%);
  }
  .story-inner {
    position: relative;
    z-index: 1;
    width: 100%;
  }
  .story-card {
    max-width: 580px;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    padding-block: clamp(3rem, 8vw, 6rem);
  }
  .story-text {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.7;
    color: var(--site-ink-soft);
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
  }
  .story-text em {
    color: var(--site-cyan-bright);
    font-style: italic;
  }
  .story-cta {
    display: flex;
    align-items: center;
    gap: 1.4rem;
    flex-wrap: wrap;
    margin-top: 0.6rem;
  }
</style>
