<script lang="ts">
  import { PILLARS } from "./content";
</script>

<section id="pillars" class="pillars site-section">
  <div class="site-shell">
    <header class="head">
      <p class="site-eyebrow">Why it plays differently</p>
      <h2 class="site-h2">Three ideas, one galaxy</h2>
      <p class="site-lead">
        Pax Fluxia strips strategy down to what you can see and feel — then lets
        the depth emerge from it.
      </p>
    </header>

    <div class="grid">
      {#each PILLARS as pillar, i}
        <article class="card accent-{pillar.accent}">
          <div class="card-top">
            <span class="num">0{i + 1}</span>
            <span class="icon">
              {#if pillar.key === "flow"}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              {:else if pillar.key === "topology"}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="5" cy="6" r="2.4" /><circle cx="19" cy="7" r="2.4" /><circle cx="12" cy="18" r="2.4" />
                  <path d="M7 7l3 9M17 9l-4 7M7 6h10" />
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              {/if}
            </span>
          </div>
          <h3 class="card-title">{pillar.title}</h3>
          <p class="card-body">{pillar.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .pillars {
    background: linear-gradient(180deg, var(--site-void), var(--site-void-2));
  }
  .head {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: clamp(2.5rem, 5vw, 4rem);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.4rem;
  }

  .card {
    --accent: var(--site-cyan);
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 2rem 1.8rem 2.2rem;
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius);
    backdrop-filter: blur(10px);
    overflow: hidden;
    transition:
      transform 0.25s ease,
      border-color 0.25s ease,
      box-shadow 0.25s ease;
  }
  .card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent), transparent 75%);
    opacity: 0.9;
  }
  .card::after {
    content: "";
    position: absolute;
    top: -40%;
    right: -30%;
    width: 60%;
    height: 80%;
    background: radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .card:hover {
    transform: translateY(-6px);
    border-color: color-mix(in srgb, var(--accent) 55%, transparent);
    box-shadow: 0 18px 50px rgba(2, 6, 20, 0.6);
  }
  .card:hover::after {
    opacity: 1;
  }
  .accent-cyan {
    --accent: var(--site-cyan);
  }
  .accent-magenta {
    --accent: var(--site-magenta);
  }
  .accent-gold {
    --accent: var(--site-gold);
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .num {
    font-family: var(--site-font-mono);
    font-size: 0.95rem;
    letter-spacing: 0.1em;
    color: var(--site-ink-dim);
  }
  .icon {
    display: inline-flex;
    width: 48px;
    height: 48px;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    border-radius: 12px;
  }
  .icon svg {
    width: 24px;
    height: 24px;
  }
  .card-title {
    font-family: var(--site-font-display);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: var(--site-ink);
  }
  .card-body {
    margin: 0;
    color: var(--site-ink-soft);
    line-height: 1.65;
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
      max-width: 540px;
    }
  }
</style>
