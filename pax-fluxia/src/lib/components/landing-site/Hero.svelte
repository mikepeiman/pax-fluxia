<script lang="ts">
  import Starfield from "./Starfield.svelte";
  import { SITE } from "./content";

  let { onPlay }: { onPlay: () => void } = $props();
</script>

<header class="hero">
  <div class="hero-bg">
    <Starfield
      image="/assets/pax-fluxia-bg-18.jpg"
      imageOpacity={0.9}
      vignette={false} />
  </div>
  <div class="scrim"></div>

  <div class="hero-inner site-shell--wide">
    <div class="hero-copy">
      <div class="badges">
        <span class="site-chip">
          <span class="site-chip__dot"></span>{SITE.version}
        </span>
        <span class="site-chip">Free · In your browser</span>
      </div>

      <p class="site-eyebrow">Tick-based real-time strategy</p>

      <h1 class="site-h1 headline">
        Command the Flow.<br />
        <span class="site-gradient-text">Conquer the Galaxy.</span>
      </h1>

      <p class="site-lead sub">
        Fleets stream between stars in living rivers of force. Open a flow, hold
        the chokepoints, and bleed your rivals dry — until one commander is left
        standing. Easy to read at a glance. A long way down to master.
      </p>

      <div class="cta-row">
        <button
          class="site-btn site-btn--primary site-btn--lg"
          onclick={onPlay}>
          Play the Alpha — Free
        </button>
        <a class="site-btn site-btn--ghost site-btn--lg" href="/game">
          See how it plays
        </a>
        <a
          class="discord"
          href={SITE.discord}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join the Discord">
          <svg viewBox="0 0 127.14 96.36" width="26" height="26" fill="currentColor">
            <path
              d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21h0A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.1 88.05 88.05 0 0 1-11.19-5.3 65.59 65.59 0 0 0 2.22-1.63c22.19 10.3 46.16 10.3 68.18 0a61.1 61.1 0 0 0 2.22 1.63 87.05 87.05 0 0 1-11.23 5.3 75.92 75.92 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.15c2.61-26.47-3.95-49.88-21.18-72.14zM42.56 65.3c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96zm42.06 0c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96z" />
          </svg>
        </a>
      </div>

      <ul class="meta">
        <li>No download</li>
        <li>Plays in your browser</li>
        <li>A solo-made homage to {SITE.homageTitle} ({SITE.homageYear})</li>
      </ul>
    </div>
  </div>

  <a class="scroll-cue" href="#pillars" aria-label="Scroll to learn more">
    <span></span>
  </a>
</header>

<style>
  .hero {
    position: relative;
    min-height: 100vh;
    min-height: 100svh;
    display: flex;
    align-items: center;
    overflow: hidden;
  }
  .hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }
  .scrim {
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(
        90deg,
        rgba(4, 6, 15, 0.94) 0%,
        rgba(4, 6, 15, 0.78) 38%,
        rgba(4, 6, 15, 0.25) 68%,
        transparent 88%
      ),
      linear-gradient(
        180deg,
        rgba(4, 6, 15, 0.55) 0%,
        transparent 22%,
        transparent 60%,
        var(--site-void) 100%
      );
  }

  .hero-inner {
    position: relative;
    z-index: 2;
    width: 100%;
    padding-top: var(--site-header-h);
  }
  .hero-copy {
    max-width: 660px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.4rem;
    padding-block: clamp(2rem, 6vh, 4rem);
    animation: hero-rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .headline {
    text-shadow: 0 4px 40px rgba(0, 0, 0, 0.6);
  }
  .sub {
    max-width: 56ch;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
  }

  .cta-row {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }
  .discord {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    color: #b9c4ff;
    background: rgba(88, 101, 242, 0.12);
    border: 1px solid rgba(120, 132, 255, 0.4);
    border-radius: 12px;
    transition:
      transform 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }
  .discord:hover {
    color: #fff;
    border-color: #7884ff;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(88, 101, 242, 0.35);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.4rem;
    margin: 0.6rem 0 0;
    padding: 0;
    list-style: none;
  }
  .meta li {
    position: relative;
    padding-left: 1.1rem;
    font-family: var(--site-font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    color: var(--site-ink-soft);
  }
  .meta li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--site-cyan);
    box-shadow: 0 0 8px var(--site-cyan);
  }

  .scroll-cue {
    position: absolute;
    bottom: 1.6rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    width: 26px;
    height: 42px;
    border: 1px solid var(--site-hairline-strong);
    border-radius: 16px;
    display: none;
  }
  .scroll-cue span {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 8px;
    border-radius: 2px;
    background: var(--site-cyan);
    animation: scroll-bob 1.8s ease-in-out infinite;
  }

  @keyframes hero-rise {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes scroll-bob {
    0%,
    100% {
      opacity: 0.2;
      transform: translate(-50%, 0);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, 12px);
    }
  }

  @media (min-height: 720px) {
    .scroll-cue {
      display: block;
    }
  }
  @media (max-width: 700px) {
    .scrim {
      background:
        linear-gradient(
          90deg,
          rgba(4, 6, 15, 0.9) 0%,
          rgba(4, 6, 15, 0.7) 100%
        ),
        linear-gradient(180deg, rgba(4, 6, 15, 0.6) 0%, transparent 30%, var(--site-void) 100%);
    }
    .cta-row {
      width: 100%;
    }
    .cta-row .site-btn {
      flex: 1 1 100%;
    }
    .discord {
      width: 100%;
    }
  }
</style>
