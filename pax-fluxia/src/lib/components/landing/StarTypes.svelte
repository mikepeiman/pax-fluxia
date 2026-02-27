<script lang="ts">
  const stars = [
    { type: "Offense", shape: "triangle", color: "var(--color-player-red)", desc: "Maximizes offensive fleet strength." },
    { type: "Defense", shape: "square", color: "var(--color-player-blue)", desc: "Increases defensive capabilities." },
    { type: "Production", shape: "pentagon", color: "var(--color-player-yellow)", desc: "Boosts new ship creation rate." },
    { type: "Repair", shape: "hexagon", color: "var(--color-player-purple)", desc: "Accelerates self-repair rate." },
    { type: "Speed", shape: "circle", color: "var(--color-player-green)", desc: "Increases velocity of ships." },
    { type: "Standard", shape: "star", color: "#ccc", desc: "Balanced node with no specialization." }
  ];
</script>

<section class="star-types">
  <div class="header">
    <h2 class="title font-display">VISUALIZING STAR POWER</h2>
    <p class="subtitle font-body">
      Every star is a distinct strategic asset, identified instantly by its unique polygon shape and color aura.
    </p>
  </div>

  <div class="grid">
    {#each stars as star}
      <div class="star-card glass-panel" style="--star-color: {star.color}">
        <div class="icon-container">
          {#if star.shape === "triangle"}
            <svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z" fill="currentColor"/></svg>
          {:else if star.shape === "square"}
            <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="currentColor"/></svg>
          {:else if star.shape === "pentagon"}
            <svg viewBox="0 0 24 24"><path d="M12 2l10 7-3 13H5L2 9z" fill="currentColor"/></svg>
          {:else if star.shape === "hexagon"}
            <svg viewBox="0 0 24 24"><path d="M12 2l9 5v10l-9 5-9-5V7z" fill="currentColor"/></svg>
          {:else if star.shape === "circle"}
             <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>
          {:else}
             <svg viewBox="0 0 24 24"><path d="M12 2l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z" fill="currentColor"/></svg>
          {/if}
        </div>
        <h3 class="star-name font-display">{star.type}</h3>
        <p class="star-desc font-body">{star.desc}</p>
      </div>
    {/each}
  </div>
</section>

<style>
  .star-types {
    padding: var(--space-12) var(--space-8);
    background: radial-gradient(circle at center, #1a1a2e 0%, #000 100%);
    text-align: center;
  }

  .header {
    margin-bottom: var(--space-12);
  }

  .title {
    font-size: 2.5rem;
    color: var(--color-text-primary);
    margin-bottom: var(--space-4);
  }

  .subtitle {
    font-size: 1.1rem;
    color: var(--color-text-muted);
    max-width: 600px;
    margin: 0 auto;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-6);
    max-width: 1200px;
    margin: 0 auto;
  }

  .star-card {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    transition: transform 0.3s;
    border-color: rgba(255, 255, 255, 0.05);
  }

  .star-card:hover {
    transform: translateY(-5px);
    border-color: var(--star-color);
    box-shadow: 0 0 20px var(--star-color);
  }

  .icon-container {
    width: 64px;
    height: 64px;
    color: var(--star-color);
    filter: drop-shadow(0 0 8px var(--star-color));
  }

  .star-name {
    font-size: 1.2rem;
    color: var(--star-color);
  }

  .star-desc {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }
</style>
