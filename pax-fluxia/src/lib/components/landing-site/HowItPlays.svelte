<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { TACTICS } from "./content";

  let active = $state(0);
  const current = $derived(TACTICS[active]);
</script>

<section id="how-it-plays" class="how site-section">
  <div class="site-shell">
    <header class="head">
      <p class="site-eyebrow">The tactics that emerge</p>
      <h2 class="site-h2">Simple rules. Ruthless decisions.</h2>
      <p class="site-lead">
        Four mechanics do all the work. None of them need a manual — but together
        they open up sieges, feints, and last-second reversals.
      </p>
    </header>

    <div class="tabs" role="tablist" aria-label="Core tactics">
      {#each TACTICS as tactic, i}
        <button
          role="tab"
          aria-selected={active === i}
          class="tab"
          class:active={active === i}
          style="--accent:{tactic.accent}"
          onclick={() => (active = i)}>
          {tactic.label}
        </button>
      {/each}
    </div>

    <div class="panel" style="--accent:{current.accent}">
      <div class="visual">
        {#key active}
          <div
            class="art"
            in:fade={{ duration: 350 }}
            style="background-image:url('{current.image}')">
          </div>
        {/key}
        <div class="art-frame"></div>
        <div class="scanline"></div>
        <span class="art-tag">{current.label}</span>
      </div>

      <div class="text">
        {#key active}
          <div in:fly={{ y: 18, duration: 320 }} out:fade={{ duration: 120 }}>
            <h3 class="t-title">{current.title}</h3>
            <p class="t-body">{current.body}</p>
          </div>
        {/key}
      </div>
    </div>
  </div>
</section>

<style>
  .how {
    background: var(--site-void-2);
  }
  .head {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: clamp(2rem, 4vw, 3rem);
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 1.4rem;
    border-bottom: 1px solid var(--site-hairline);
  }
  .tab {
    position: relative;
    padding: 0.9rem 1.3rem;
    background: transparent;
    border: none;
    font-family: var(--site-font-display);
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--site-ink-dim);
    cursor: pointer;
    transition: color 0.2s ease;
  }
  .tab:hover {
    color: var(--site-ink);
  }
  .tab.active {
    color: var(--accent);
  }
  .tab.active::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -1px;
    width: 100%;
    height: 2px;
    background: var(--accent);
    box-shadow: 0 0 16px var(--accent);
  }

  .panel {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: center;
    padding: clamp(1.2rem, 3vw, 2rem);
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius-lg);
  }

  .visual {
    position: relative;
    aspect-ratio: 16 / 10;
    border-radius: var(--site-radius);
    overflow: hidden;
    background: #02040a;
  }
  .art {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
  }
  .art-frame {
    position: absolute;
    inset: 0;
    border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
    border-radius: var(--site-radius);
    box-shadow:
      inset 0 0 60px rgba(2, 4, 12, 0.7),
      0 0 0 1px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }
  .scanline {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 2px;
    background: color-mix(in srgb, var(--accent) 70%, transparent);
    opacity: 0.5;
    box-shadow: 0 0 12px var(--accent);
    animation: scan 4.5s linear infinite;
  }
  .art-tag {
    position: absolute;
    left: 0.9rem;
    bottom: 0.9rem;
    padding: 0.3rem 0.7rem;
    font-family: var(--site-font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--site-ink);
    background: rgba(3, 6, 14, 0.72);
    border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    border-radius: 6px;
    backdrop-filter: blur(4px);
  }

  .text {
    min-height: 11rem;
  }
  .t-title {
    margin: 0 0 1rem;
    font-family: var(--site-font-display);
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 700;
    line-height: 1.1;
    color: var(--accent);
  }
  .t-body {
    margin: 0;
    font-size: 1.08rem;
    line-height: 1.7;
    color: var(--site-ink-soft);
  }

  @keyframes scan {
    0% {
      top: 0;
      opacity: 0;
    }
    10% {
      opacity: 0.5;
    }
    90% {
      opacity: 0.5;
    }
    100% {
      top: 100%;
      opacity: 0;
    }
  }

  @media (max-width: 820px) {
    .panel {
      grid-template-columns: 1fr;
    }
    .text {
      min-height: 0;
    }
    .tabs {
      overflow-x: auto;
      flex-wrap: nowrap;
    }
    .tab {
      white-space: nowrap;
    }
  }
</style>
