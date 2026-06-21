<script lang="ts">
  import PageHero from "$lib/components/landing-site/PageHero.svelte";
  import HowItPlays from "$lib/components/landing-site/HowItPlays.svelte";
  import StarTypes from "$lib/components/landing-site/StarTypes.svelte";
  import FinalCta from "$lib/components/landing-site/FinalCta.svelte";
  import { ROADMAP, FAQ } from "$lib/components/landing-site/content";
  import { goToGame } from "$lib/site/play";

  const loop = [
    {
      n: "01",
      title: "Flow",
      body: "Open a flow between two stars and ships stream along the lane — continuously, automatically — until you redirect it.",
    },
    {
      n: "02",
      title: "Clash",
      body: "Where your flow meets a defender, both sides lose ships every tick. Symmetric attrition: hold the lane or break against it.",
    },
    {
      n: "03",
      title: "Build & repair",
      body: "Production stars mint fresh fleets; repair stars heal the wounded. Your economy is the reserve that decides long sieges.",
    },
    {
      n: "04",
      title: "Conquer",
      body: "Empty a star — or overwhelm it outright — and it flips to your colors. Its lanes, its bonus, its position: now yours.",
    },
  ];
</script>

<svelte:head>
  <title>The Game — Pax Fluxia</title>
  <meta
    name="description"
    content="How Pax Fluxia plays: tick-based flow combat, six star types, symmetric attrition, pinning and overwhelm, and the roadmap from classic mode to a galaxy you author." />
</svelte:head>

<PageHero
  eyebrow="How it plays"
  title="One screen."
  accent="Endless position."
  lead="Pax Fluxia is a tick-based real-time strategy game. No fog of menus, no spreadsheet — just stars, lanes, and the rivers of force you send between them. Here's the whole machine."
  image="/assets/pax-fluxia-bg-20.jpg" />

<section class="loop site-section">
  <div class="site-shell">
    <header class="head">
      <p class="site-eyebrow">The core loop</p>
      <h2 class="site-h2">The galaxy runs on ticks</h2>
      <p class="site-lead">
        Every tick, the same handful of things happen. Your standing orders
        decide the rest — so good play is good planning, not fast clicking.
      </p>
    </header>

    <ol class="steps">
      {#each loop as step}
        <li class="step">
          <span class="step-n">{step.n}</span>
          <h3 class="step-title">{step.title}</h3>
          <p class="step-body">{step.body}</p>
        </li>
      {/each}
    </ol>
  </div>
</section>

<HowItPlays />

<StarTypes />

<section class="roadmap site-section">
  <div class="site-shell">
    <header class="head head--center">
      <p class="site-eyebrow site-eyebrow--center">Where it's going</p>
      <h2 class="site-h2">From classic mode to a galaxy you author</h2>
      <p class="site-lead">
        The alpha is faithful to the original's hypnotic core. After that, the
        plan is breadth — more ways to play, then the tools to invent your own.
      </p>
    </header>

    <div class="phases">
      {#each ROADMAP as phase}
        <article class="phase phase--{phase.status}">
          <div class="phase-top">
            <span class="dot"></span>
            <span class="phase-label">{phase.phase}</span>
          </div>
          <h3 class="phase-title">{phase.title}</h3>
          <ul class="phase-list">
            {#each phase.items as item}
              <li>{item}</li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="faq site-section">
  <div class="site-shell faq-shell">
    <header class="head">
      <p class="site-eyebrow">Before you ask</p>
      <h2 class="site-h2">Questions, answered</h2>
    </header>
    <div class="faq-list">
      {#each FAQ as item}
        <details class="faq-item">
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      {/each}
    </div>
  </div>
</section>

<FinalCta onPlay={goToGame} />

<style>
  .head {
    max-width: 660px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: clamp(2.5rem, 5vw, 3.5rem);
  }
  .head--center {
    max-width: 720px;
    margin-inline: auto;
    text-align: center;
    align-items: center;
  }

  .loop {
    background: linear-gradient(180deg, var(--site-void), var(--site-void-2));
  }
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.2rem;
  }
  .step {
    position: relative;
    padding: 1.8rem 1.5rem;
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius);
  }
  .step-n {
    font-family: var(--site-font-mono);
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    color: var(--site-cyan);
  }
  .step-title {
    margin: 0.6rem 0 0.6rem;
    font-family: var(--site-font-display);
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--site-ink);
  }
  .step-body {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--site-ink-soft);
  }

  .roadmap {
    background: var(--site-void-2);
  }
  .phases {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.4rem;
  }
  .phase {
    --c: var(--site-cyan);
    padding: 1.9rem 1.7rem;
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-top: 2px solid var(--c);
    border-radius: var(--site-radius);
  }
  .phase--now {
    --c: var(--site-cyan);
  }
  .phase--next {
    --c: var(--site-magenta);
  }
  .phase--later {
    --c: var(--site-gold);
  }
  .phase-top {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 12px var(--c);
  }
  .phase-label {
    font-family: var(--site-font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--c);
  }
  .phase-title {
    margin: 0.7rem 0 1rem;
    font-family: var(--site-font-display);
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--site-ink);
  }
  .phase-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .phase-list li {
    position: relative;
    padding-left: 1.4rem;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--site-ink-soft);
  }
  .phase-list li::before {
    content: "›";
    position: absolute;
    left: 0;
    color: var(--c);
    font-weight: 700;
  }

  .faq {
    background: var(--site-void);
  }
  .faq-shell {
    max-width: 820px;
  }
  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .faq-item {
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius);
    background: var(--site-panel);
    overflow: hidden;
  }
  .faq-item summary {
    list-style: none;
    cursor: pointer;
    padding: 1.2rem 1.4rem;
    font-family: var(--site-font-display);
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--site-ink);
  }
  .faq-item summary::-webkit-details-marker {
    display: none;
  }
  .faq-item summary::after {
    content: "+";
    float: right;
    color: var(--site-cyan);
    font-weight: 400;
  }
  .faq-item[open] summary::after {
    content: "−";
  }
  .faq-item p {
    margin: 0;
    padding: 0 1.4rem 1.3rem;
    color: var(--site-ink-soft);
    line-height: 1.65;
  }

  @media (max-width: 900px) {
    .steps {
      grid-template-columns: repeat(2, 1fr);
    }
    .phases {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 520px) {
    .steps {
      grid-template-columns: 1fr;
    }
  }
</style>
