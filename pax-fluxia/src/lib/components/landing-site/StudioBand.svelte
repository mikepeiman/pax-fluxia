<script lang="ts">
  import { SITE } from "./content";
</script>

<section class="studio site-section">
  <div class="site-shell">
    <div class="grid">
      <div class="brand-col">
        <div class="logo-plate">
          <img src="/assets/generated_image_5.jpg" alt="Fatherlion Studios emblem" />
        </div>
        <h3 class="studio-name">{SITE.studio}</h3>
        <p class="dev">Solo development · {SITE.dev}</p>
      </div>

      <div class="story-col">
        <p class="site-eyebrow">The studio</p>
        <h2 class="site-h2">A solo-made homage to a lost classic</h2>
        <blockquote class="quote">
          “Years ago I fell hard for {SITE.homageTitle} — a quiet {SITE.homageYear}
          indie game about rivers of ships and the slow pleasure of good position.
          It mostly faded from view, and I never stopped missing it. Pax Fluxia is
          my attempt to bring that feeling back: faithful to the hypnotic core, but
          rebuilt from scratch with a modern engine and room to grow far beyond the
          original. Not a clone — the game I remember, made for now.”
        </blockquote>
        <p class="attribution">— {SITE.dev}, {SITE.studio}</p>

        <div class="footer-row">
          <div class="tech">
            <span class="tech-label">Built with</span>
            <span class="tech-chip">Svelte</span>
            <span class="tech-chip">TypeScript</span>
            <span class="tech-chip">WebGPU</span>
          </div>
          <a class="site-textlink" href="/about">More about the studio →</a>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .studio {
    background: var(--site-void);
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(220px, 320px) 1fr;
    gap: clamp(2rem, 6vw, 5rem);
    align-items: center;
  }

  .brand-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }
  .logo-plate {
    width: 100%;
    max-width: 240px;
    aspect-ratio: 1;
    border-radius: var(--site-radius-lg);
    overflow: hidden;
    border: 1px solid var(--site-hairline-strong);
    box-shadow:
      0 0 0 1px rgba(255, 206, 90, 0.1),
      0 20px 50px rgba(0, 0, 0, 0.5);
  }
  .logo-plate img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .studio-name {
    margin: 0;
    font-family: var(--site-font-brand);
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--site-gold);
  }
  .dev {
    margin: 0;
    font-family: var(--site-font-mono);
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    color: var(--site-ink-dim);
  }

  .story-col {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  .quote {
    margin: 0;
    padding-left: 1.3rem;
    border-left: 2px solid;
    border-image: var(--site-flow) 1;
    font-size: 1.15rem;
    line-height: 1.7;
    color: var(--site-ink);
  }
  .attribution {
    margin: 0;
    font-family: var(--site-font-display);
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--site-ink-soft);
  }

  .footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin-top: 0.8rem;
  }
  .tech {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .tech-label {
    font-family: var(--site-font-mono);
    font-size: 0.74rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--site-ink-dim);
    margin-right: 0.2rem;
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

  @media (max-width: 820px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .brand-col {
      max-width: 280px;
    }
  }
</style>
