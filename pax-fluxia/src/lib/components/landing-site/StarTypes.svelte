<script lang="ts">
  import { STAR_TYPES } from "./content";

  // Reused on the home page and the /game page. Header can be hidden when the
  // host page provides its own section intro.
  let { showHeader = true }: { showHeader?: boolean } = $props();
</script>

<section class="star-types site-section">
  <div class="site-shell">
    {#if showHeader}
      <header class="head">
        <p class="site-eyebrow site-eyebrow--center">Know the board</p>
        <h2 class="site-h2">Every star is a decision</h2>
        <p class="site-lead">
          Stars aren't interchangeable. Each type doubles down on one role — read
          its shape and aura, and you know its worth at a glance.
        </p>
      </header>
    {/if}

    <div class="grid">
      {#each STAR_TYPES as star}
        <article class="star" style="--star:{star.color}">
          <div class="icon">
            {#if star.shape === "triangle"}
              <svg viewBox="0 0 24 24"><path d="M12 2 2 22h20L12 2z" fill="currentColor" /></svg>
            {:else if star.shape === "square"}
              <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1.5" fill="currentColor" /></svg>
            {:else if star.shape === "pentagon"}
              <svg viewBox="0 0 24 24"><path d="M12 2l10 7-3 13H5L2 9z" fill="currentColor" /></svg>
            {:else if star.shape === "hexagon"}
              <svg viewBox="0 0 24 24"><path d="M12 2l9 5v10l-9 5-9-5V7z" fill="currentColor" /></svg>
            {:else if star.shape === "heptagon"}
              <svg viewBox="0 0 24 24"><path d="M12 2l7.8 3.8 2.2 8.7-4.3 8.5H6.3L2 14.5l2.2-8.7z" fill="currentColor" /></svg>
            {:else}
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>
            {/if}
          </div>
          <div class="star-head">
            <h3 class="star-name">{star.type}</h3>
            <span class="star-tag">{star.tag}</span>
          </div>
          <p class="star-desc">{star.desc}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .star-types {
    background:
      radial-gradient(circle at 50% 0%, rgba(47, 227, 255, 0.06), transparent 55%),
      linear-gradient(180deg, var(--site-void-2), var(--site-void));
    text-align: center;
  }
  .head {
    max-width: 620px;
    margin: 0 auto clamp(2.5rem, 5vw, 4rem);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.2rem;
  }

  .star {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    padding: 2rem 1.5rem;
    text-align: center;
    background: var(--site-panel);
    border: 1px solid var(--site-hairline);
    border-radius: var(--site-radius);
    transition:
      transform 0.25s ease,
      border-color 0.25s ease,
      box-shadow 0.25s ease;
  }
  .star:hover {
    transform: translateY(-5px);
    border-color: color-mix(in srgb, var(--star) 60%, transparent);
    box-shadow: 0 0 30px color-mix(in srgb, var(--star) 22%, transparent);
  }

  .icon {
    width: 56px;
    height: 56px;
    color: var(--star);
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--star) 70%, transparent));
  }
  .icon svg {
    width: 100%;
    height: 100%;
  }

  .star-head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .star-name {
    margin: 0;
    font-family: var(--site-font-display);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--star);
  }
  .star-tag {
    font-family: var(--site-font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--site-ink-soft);
    padding: 0.2rem 0.5rem;
    border: 1px solid color-mix(in srgb, var(--star) 40%, transparent);
    border-radius: 999px;
  }
  .star-desc {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--site-ink-soft);
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 540px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
