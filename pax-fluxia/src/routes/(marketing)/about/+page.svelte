<script lang="ts">
  import PageHero from "$lib/components/landing-site/PageHero.svelte";
  import FinalCta from "$lib/components/landing-site/FinalCta.svelte";
  import { SITE } from "$lib/components/landing-site/content";
  import { goToGame } from "$lib/site/play";
</script>

<svelte:head>
  <title>Studio — Fatherlion Studios</title>
  <meta
    name="description"
    content="Fatherlion Studios is the solo studio behind Pax Fluxia — a modern homage to the 2007 indie strategy game Pax Galaxia, built around one idea: visible strategy." />
</svelte:head>

<PageHero
  eyebrow="Studio"
  title="Fatherlion Studios"
  lead="One developer, one obsession: strategy you can read by looking at it. This is the story behind Pax Fluxia."
  image="/assets/pax-fluxia-bg-4.jpg" />

<section class="intro site-section">
  <div class="site-shell intro-grid">
    <div class="plate-col">
      <div class="logo-plate">
        <img src="/assets/generated_image_5.jpg" alt="Fatherlion Studios emblem" />
      </div>
      <div class="plate-meta">
        <span class="meta-row"><span>Studio</span>{SITE.studio}</span>
        <span class="meta-row"><span>Developer</span>{SITE.dev}</span>
        <span class="meta-row"><span>Status</span>In active development</span>
        <span class="meta-row"><span>First game</span>Pax Fluxia</span>
      </div>
    </div>

    <div class="prose-col site-prose">
      <p>
        Fatherlion Studios is a one-person studio. That means every line of code,
        every star you conquer, and every word on this site comes from the same
        pair of hands — which is exactly the kind of focused, opinionated craft I
        wanted to make.
      </p>
      <p>
        I'm {SITE.dev}, and Pax Fluxia is the game I couldn't stop thinking about
        until I built it.
      </p>
    </div>
  </div>
</section>

<section class="chapter site-section">
  <div class="site-shell chapter-shell">
    <div class="chapter-block">
      <p class="site-eyebrow">The homage</p>
      <h2 class="site-h2">A 2007 classic that never let go</h2>
      <div class="site-prose">
        <p>
          Back in {SITE.homageYear}, a small indie game called {SITE.homageTitle}
          quietly nailed something rare: strategy that was hypnotic instead of
          stressful. Ships flowed between stars like water finding its level, and
          winning felt less like out-clicking an opponent and more like reading a
          current and steering it. It mostly faded from view — and I never stopped
          missing the specific feeling of it.
        </p>
        <p>
          Pax Fluxia is my attempt to bring that feeling back. It's faithful where
          it counts — the flow, the legibility, the slow tightening of position —
          but it isn't a clone. It's rebuilt from scratch on a modern engine, with
          sharper visuals, deeper tuning, and a roadmap that reaches well past the
          original. The goal was never nostalgia for its own sake. It's the game I
          remember, made for now.
        </p>
      </div>
    </div>

    <div class="chapter-block">
      <p class="site-eyebrow">The philosophy</p>
      <h2 class="site-h2">Visible strategy</h2>
      <div class="site-prose">
        <p>
          One principle governs every decision in Pax Fluxia: if it matters, you
          should be able to see it. The thickness of a flow is its strength. A
          contested lane reads as two rivers grinding together. A pinned star
          visibly stops healing. Nothing important hides in a tooltip or a
          spreadsheet.
        </p>
        <p>
          That constraint is harder to build than a wall of numbers — but it's the
          whole point. It's what makes the game calm to watch and sharp to play at
          the same time, and it's the one pillar I refuse to compromise.
        </p>
      </div>
    </div>

    <div class="chapter-block">
      <p class="site-eyebrow">The build</p>
      <h2 class="site-h2">Made solo, shipped in the open</h2>
      <div class="site-prose">
        <p>
          Pax Fluxia runs in your browser on a modern, GPU-accelerated stack —
          thousands of ships and hundreds of stars at a smooth sixty frames a
          second, no install required. I build it in the open, ship often, and
          let player feedback steer what comes next.
        </p>
      </div>
      <div class="tech">
        <span class="tech-chip">Svelte</span>
        <span class="tech-chip">TypeScript</span>
        <span class="tech-chip">WebGPU</span>
        <span class="tech-chip">PixiJS</span>
      </div>
    </div>
  </div>
</section>

<section class="contact site-section">
  <div class="site-shell contact-card">
    <div>
      <h2 class="contact-title">Say hello</h2>
      <p class="contact-note">
        Questions, press, or just want to talk strategy? The door's open.
      </p>
    </div>
    <div class="contact-actions">
      <a class="site-btn site-btn--ghost" href={`mailto:${SITE.contactEmail}`}>
        {SITE.contactEmail}
      </a>
      <a
        class="site-btn site-btn--ghost"
        href={SITE.discord}
        target="_blank"
        rel="noopener noreferrer">
        Discord
      </a>
    </div>
  </div>
</section>

<FinalCta onPlay={goToGame} />

<style>
  .intro-grid {
    display: grid;
    grid-template-columns: minmax(220px, 300px) 1fr;
    gap: clamp(2rem, 6vw, 4.5rem);
    align-items: start;
  }
  .plate-col {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
  }
  .logo-plate {
    width: 100%;
    max-width: 280px;
    aspect-ratio: 1;
    border-radius: var(--site-radius-lg);
    overflow: hidden;
    border: 1px solid var(--site-hairline-strong);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  }
  .logo-plate img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .plate-meta {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .meta-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--site-hairline);
    font-family: var(--site-font-display);
    font-size: 0.95rem;
    color: var(--site-ink);
  }
  .meta-row span {
    font-family: var(--site-font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--site-ink-dim);
  }
  .prose-col {
    padding-top: 0.4rem;
    font-size: 1.15rem;
  }

  .chapter {
    background: var(--site-void-2);
  }
  .chapter-shell {
    max-width: 820px;
    display: flex;
    flex-direction: column;
    gap: clamp(2.5rem, 6vw, 4rem);
  }
  .chapter-block {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .chapter-block .site-h2 {
    margin-bottom: 0.4rem;
  }
  .tech {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }
  .tech-chip {
    font-family: var(--site-font-mono);
    font-size: 0.78rem;
    color: var(--site-ink-soft);
    padding: 0.3rem 0.7rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--site-hairline);
    border-radius: 7px;
  }

  .contact-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
    padding: clamp(1.8rem, 4vw, 2.6rem);
    background:
      radial-gradient(100% 120% at 100% 0%, rgba(199, 104, 255, 0.12), transparent 60%),
      var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius-lg);
  }
  .contact-title {
    margin: 0;
    font-family: var(--site-font-display);
    font-size: 1.7rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--site-ink);
  }
  .contact-note {
    margin: 0.4rem 0 0;
    color: var(--site-ink-soft);
  }
  .contact-actions {
    display: flex;
    gap: 0.7rem;
    flex-wrap: wrap;
  }

  @media (max-width: 820px) {
    .intro-grid {
      grid-template-columns: 1fr;
    }
    .plate-col {
      max-width: 320px;
    }
  }
</style>
