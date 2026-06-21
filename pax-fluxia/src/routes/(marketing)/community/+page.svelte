<script lang="ts">
  import PageHero from "$lib/components/landing-site/PageHero.svelte";
  import Newsletter from "$lib/components/landing-site/Newsletter.svelte";
  import FinalCta from "$lib/components/landing-site/FinalCta.svelte";
  import { SITE } from "$lib/components/landing-site/content";
  import { goToGame } from "$lib/site/play";

  const ways = [
    {
      title: "Playtest the alpha",
      body: "Jump in, push the systems hard, and find the places that snowball, stall, or confuse. Fresh eyes catch what mine can't.",
    },
    {
      title: "Report what breaks",
      body: "Hit a bug or a baffling moment? The Discord feedback channel runs straight to the developer — every report is read.",
    },
    {
      title: "Shape the design",
      body: "Balance is live and opinions are wanted. Make the case for a change and the best arguments end up in the next build.",
    },
    {
      title: "Spread the word",
      body: "An indie game lives and dies by word of mouth. Tell the friend who still talks about that one perfect strategy game.",
    },
  ];
</script>

<svelte:head>
  <title>Community — Pax Fluxia</title>
  <meta
    name="description"
    content="Join the Pax Fluxia community: hop into Discord, subscribe for build drops, and help shape an indie strategy game built in the open." />
</svelte:head>

<PageHero
  eyebrow="Community"
  title="Join the"
  accent="command network"
  lead="Pax Fluxia is built in the open, with players in the loop. Two ways in, and a handful of ways to make the game better."
  image="/assets/pax-fluxia-bg-31.jpg" />

<section class="channels site-section">
  <div class="site-shell">
    <div class="grid">
      <article class="channel channel--discord">
        <div class="ch-icon">
          <svg viewBox="0 0 127.14 96.36" width="34" height="34" fill="currentColor">
            <path
              d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21h0A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.1 88.05 88.05 0 0 1-11.19-5.3 65.59 65.59 0 0 0 2.22-1.63c22.19 10.3 46.16 10.3 68.18 0a61.1 61.1 0 0 0 2.22 1.63 87.05 87.05 0 0 1-11.23 5.3 75.92 75.92 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.15c2.61-26.47-3.95-49.88-21.18-72.14zM42.56 65.3c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96zm42.06 0c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96z" />
          </svg>
        </div>
        <h2 class="ch-title">The Discord</h2>
        <p class="ch-body">
          The fastest line to the developer and the other commanders. Strategy
          talk, bug reports, balance arguments, and the first word on every new
          build live here.
        </p>
        <a
          class="site-btn site-btn--primary site-btn--lg"
          href={SITE.discord}
          target="_blank"
          rel="noopener noreferrer">
          Join the Discord
        </a>
      </article>

      <article class="channel channel--news">
        <div class="ch-icon ch-icon--news">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.7">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        <h2 class="ch-title">The newsletter</h2>
        <p class="ch-body">
          Prefer your updates in the inbox? Get milestone releases and the
          longer-form design notes delivered. Low volume, high signal.
        </p>
        <Newsletter cta="Subscribe" />
      </article>
    </div>
  </div>
</section>

<section class="ways site-section">
  <div class="site-shell">
    <header class="head">
      <p class="site-eyebrow">Ways to help</p>
      <h2 class="site-h2">Make the game better</h2>
      <p class="site-lead">
        A solo project leans on its players. Here's where you can move the needle.
      </p>
    </header>
    <div class="ways-grid">
      {#each ways as way, i}
        <article class="way">
          <span class="way-n">0{i + 1}</span>
          <h3 class="way-title">{way.title}</h3>
          <p class="way-body">{way.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<FinalCta onPlay={goToGame} />

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.4rem;
  }
  .channel {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.1rem;
    padding: clamp(1.8rem, 3vw, 2.6rem);
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius-lg);
  }
  .channel--discord {
    border-color: rgba(120, 132, 255, 0.35);
    background:
      radial-gradient(120% 90% at 0% 0%, rgba(88, 101, 242, 0.16), transparent 60%),
      var(--site-panel);
  }
  .ch-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 16px;
    color: #b9c4ff;
    background: rgba(88, 101, 242, 0.14);
    border: 1px solid rgba(120, 132, 255, 0.4);
  }
  .ch-icon--news {
    color: var(--site-cyan-bright);
    background: rgba(47, 227, 255, 0.12);
    border-color: rgba(47, 227, 255, 0.4);
  }
  .ch-title {
    margin: 0;
    font-family: var(--site-font-display);
    font-size: 1.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--site-ink);
  }
  .ch-body {
    margin: 0;
    color: var(--site-ink-soft);
    line-height: 1.65;
    max-width: 44ch;
  }

  .ways {
    background: var(--site-void-2);
  }
  .head {
    max-width: 620px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: clamp(2rem, 4vw, 3rem);
  }
  .ways-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.2rem;
  }
  .way {
    padding: 1.7rem 1.5rem;
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius);
  }
  .way-n {
    font-family: var(--site-font-mono);
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    color: var(--site-magenta);
  }
  .way-title {
    margin: 0.7rem 0 0.6rem;
    font-family: var(--site-font-display);
    font-size: 1.2rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--site-ink);
  }
  .way-body {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.6;
    color: var(--site-ink-soft);
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .ways-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 540px) {
    .ways-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
