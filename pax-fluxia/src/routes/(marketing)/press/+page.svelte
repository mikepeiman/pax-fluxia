<script lang="ts">
  import PageHero from "$lib/components/landing-site/PageHero.svelte";
  import { SITE, PILLARS } from "$lib/components/landing-site/content";

  const facts: { k: string; v: string; href?: string }[] = [
    { k: "Developer", v: SITE.studio },
    { k: "Founder", v: SITE.dev },
    { k: "Release", v: "In development · free alpha live now" },
    { k: "Platforms", v: "Web browser (desktop) · native builds planned" },
    { k: "Price", v: "Free during alpha" },
    { k: "Website", v: "paxfluxia.com", href: "/" },
    { k: "Contact", v: SITE.pressEmail, href: `mailto:${SITE.pressEmail}` },
    { k: "Community", v: "Discord", href: SITE.discord },
  ];

  const features = [
    "Flow-based combat — fleets stream between stars in visible rivers of force.",
    "Topology is terrain — stars are nodes, lanes are fixed, and the network shape drives every decision.",
    "Symmetric attrition, pinning, and overwhelm — three mechanics that open up sieges, feints, and reversals.",
    "Six specialized star types, each doubling down on attack, defense, production, repair, or speed.",
    "Over 100 live-tunable parameters, from tick cadence to ship glow.",
    "Runs free in the browser — no download, no account.",
  ];

  const gallery = [
    "/assets/pax-fluxia-bg-18.jpg",
    "/assets/pax-fluxia-bg-22.jpg",
    "/assets/pax-fluxia-bg-23.jpg",
    "/assets/pax-fluxia-bg-20.jpg",
    "/assets/pax-fluxia-bg-31.jpg",
    "/assets/pax-fluxia-bg-32.jpg",
  ];
</script>

<svelte:head>
  <title>Press Kit — Pax Fluxia</title>
  <meta
    name="description"
    content="Press kit for Pax Fluxia by Fatherlion Studios: fact sheet, description, features, history, logos, and key art for download." />
</svelte:head>

<PageHero
  eyebrow="Press kit"
  title="Pax Fluxia"
  accent="press kit"
  lead="Everything you need to write about Pax Fluxia. Grab the art, quote the copy, and reach out anytime."
  image="/assets/pax-fluxia-bg-25.jpg" />

<section class="press site-section">
  <div class="site-shell press-grid">
    <!-- Fact sheet -->
    <aside class="facts">
      <h2 class="block-title">Fact sheet</h2>
      <dl>
        {#each facts as fact}
          <div class="fact">
            <dt>{fact.k}</dt>
            <dd>
              {#if fact.href}
                <a
                  href={fact.href}
                  target={fact.href.startsWith("http") ? "_blank" : undefined}
                  rel={fact.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >{fact.v}</a>
              {:else}
                {fact.v}
              {/if}
            </dd>
          </div>
        {/each}
      </dl>
    </aside>

    <!-- Narrative -->
    <div class="body">
      <div class="block">
        <h2 class="block-title">Description</h2>
        <p class="lead-line">{SITE.blurb}</p>
        <div class="site-prose">
          <p>
            Pax Fluxia is a tick-based real-time strategy game about commanding
            rivers of ships between stars. Open a flow and your fleets stream
            along a lane continuously; where they meet a defender, both sides
            bleed every tick. Hold the chokepoints, pin the strongholds, and
            overwhelm the weak flanks until one commander is left standing.
          </p>
          <p>
            It's deliberately legible — the board itself tells you who's winning —
            and deceptively deep. A modern homage to the {SITE.homageYear} indie
            game {SITE.homageTitle}, built from scratch by {SITE.studio}.
          </p>
        </div>
      </div>

      <div class="block">
        <h2 class="block-title">Key features</h2>
        <ul class="features">
          {#each features as f}
            <li>{f}</li>
          {/each}
        </ul>
      </div>

      <div class="block">
        <h2 class="block-title">The three pillars</h2>
        <div class="pillars">
          {#each PILLARS as p}
            <div class="pillar">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          {/each}
        </div>
      </div>

      <div class="block">
        <h2 class="block-title">History</h2>
        <div class="site-prose">
          <p>
            {SITE.dev} fell for {SITE.homageTitle} — a quiet {SITE.homageYear}
            indie game about flowing fleets and good position — and never stopped
            missing it after it faded from view. Pax Fluxia began as a personal
            attempt to recreate that feeling and grew into a full, modern
            reimagining: faithful to the hypnotic core, rebuilt on a
            GPU-accelerated browser engine, with a roadmap reaching well beyond
            the original.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="assets site-section">
  <div class="site-shell">
    <h2 class="block-title">Logo &amp; key art</h2>
    <p class="assets-note">
      Free to use in coverage of Pax Fluxia. Click any image to open the
      full-resolution file.
    </p>

    <div class="logo-row">
      <a class="logo-tile" href="/assets/generated_image_5.jpg" target="_blank" rel="noopener">
        <img src="/assets/generated_image_5.jpg" alt="Fatherlion Studios logo" />
        <span>Studio logo</span>
      </a>
      <a class="logo-tile" href="/icons/icon-512.png" target="_blank" rel="noopener">
        <img src="/icons/icon-512.png" alt="Pax Fluxia app icon" />
        <span>App icon</span>
      </a>
    </div>

    <div class="gallery">
      {#each gallery as src, i}
        <a class="shot" href={src} target="_blank" rel="noopener" aria-label="Open key art {i + 1}">
          <img {src} alt="Pax Fluxia key art {i + 1}" loading="lazy" />
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="press-contact site-section">
  <div class="site-shell pc-card">
    <div>
      <h2 class="contact-title">Press &amp; partnerships</h2>
      <p class="contact-note">
        Coverage, interviews, review keys — happy to help. Fastest replies come
        through Discord.
      </p>
    </div>
    <div class="pc-actions">
      <a class="site-btn site-btn--primary" href={`mailto:${SITE.pressEmail}`}>
        {SITE.pressEmail}
      </a>
      <a class="site-btn site-btn--ghost" href={SITE.discord} target="_blank" rel="noopener noreferrer">
        Discord
      </a>
    </div>
  </div>
</section>

<style>
  .block-title {
    margin: 0 0 1rem;
    font-family: var(--site-font-display);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--site-cyan-bright);
  }

  .press-grid {
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1fr;
    gap: clamp(2rem, 5vw, 4rem);
    align-items: start;
  }
  .facts {
    position: sticky;
    top: calc(var(--site-header-h) + 1.5rem);
    padding: 1.8rem;
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius);
  }
  .facts dl {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .fact {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid var(--site-hairline);
  }
  .fact:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .fact dt {
    font-family: var(--site-font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--site-ink-dim);
  }
  .fact dd {
    margin: 0;
    font-size: 0.98rem;
    color: var(--site-ink);
  }
  .fact dd a {
    color: var(--site-cyan-bright);
    text-decoration: none;
  }
  .fact dd a:hover {
    text-decoration: underline;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: clamp(2rem, 5vw, 3.2rem);
  }
  .lead-line {
    margin: 0 0 1.1rem;
    font-size: 1.25rem;
    line-height: 1.55;
    color: var(--site-ink);
  }
  .features {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .features li {
    position: relative;
    padding-left: 1.5rem;
    color: var(--site-ink-soft);
    line-height: 1.55;
  }
  .features li::before {
    content: "›";
    position: absolute;
    left: 0;
    color: var(--site-cyan);
    font-weight: 700;
  }

  .pillars {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.2rem;
  }
  .pillar {
    padding: 1.3rem 1.4rem;
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius);
  }
  .pillar h3 {
    margin: 0 0 0.5rem;
    font-family: var(--site-font-display);
    font-size: 1.15rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--site-ink);
  }
  .pillar p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--site-ink-soft);
  }

  .assets {
    background: var(--site-void-2);
  }
  .assets-note {
    margin: -0.4rem 0 1.6rem;
    color: var(--site-ink-soft);
  }
  .logo-row {
    display: flex;
    gap: 1.2rem;
    flex-wrap: wrap;
    margin-bottom: 1.6rem;
  }
  .logo-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    text-decoration: none;
    color: var(--site-ink-soft);
    font-family: var(--site-font-mono);
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .logo-tile img {
    width: 140px;
    height: 140px;
    object-fit: cover;
    border-radius: var(--site-radius);
    border: 1px solid var(--site-hairline-strong);
    transition: transform 0.2s ease;
  }
  .logo-tile:hover img {
    transform: translateY(-3px);
  }

  .gallery {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .shot {
    display: block;
    border-radius: var(--site-radius);
    overflow: hidden;
    border: 1px solid var(--site-hairline);
    aspect-ratio: 16 / 9;
  }
  .shot img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  .shot:hover img {
    transform: scale(1.05);
  }

  .pc-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
    padding: clamp(1.8rem, 4vw, 2.6rem);
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius-lg);
  }
  .contact-title {
    margin: 0;
    font-family: var(--site-font-display);
    font-size: 1.6rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--site-ink);
  }
  .contact-note {
    margin: 0.4rem 0 0;
    max-width: 46ch;
    color: var(--site-ink-soft);
  }
  .pc-actions {
    display: flex;
    gap: 0.7rem;
    flex-wrap: wrap;
  }

  @media (max-width: 860px) {
    .press-grid {
      grid-template-columns: 1fr;
    }
    .facts {
      position: static;
    }
    .gallery {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 520px) {
    .gallery {
      grid-template-columns: 1fr;
    }
  }
</style>
