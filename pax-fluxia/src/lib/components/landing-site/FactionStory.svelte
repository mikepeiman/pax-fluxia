<script lang="ts">
  let { onPlay } = $props<{ onPlay: () => void }>();
</script>

<section class="faction-story">
  <div class="bg-layer">
    <!-- Delaunay Graph Simulation -->
    <svg class="delaunay-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M10,10 L30,40 L60,20 L90,50 L50,80 L20,70 Z" fill="none" stroke="rgba(0, 255, 255, 0.1)" stroke-width="0.2"/>
      <circle cx="10" cy="10" r="0.5" fill="cyan" />
      <circle cx="30" cy="40" r="0.5" fill="blue" />
      <circle cx="60" cy="20" r="0.5" fill="purple" />
      <circle cx="90" cy="50" r="0.5" fill="gold" />
      <circle cx="50" cy="80" r="0.5" fill="red" />
      <circle cx="20" cy="70" r="0.5" fill="green" />
      <!-- More connections -->
      <line x1="10" y1="10" x2="30" y2="40" stroke="rgba(0,255,255,0.2)" stroke-width="0.1" />
      <line x1="30" y1="40" x2="60" y2="20" stroke="rgba(0,255,255,0.2)" stroke-width="0.1" />
      <line x1="60" y1="20" x2="90" y2="50" stroke="rgba(0,255,255,0.2)" stroke-width="0.1" />
      <line x1="90" y1="50" x2="50" y2="80" stroke="rgba(0,255,255,0.2)" stroke-width="0.1" />
      <line x1="50" y1="80" x2="20" y2="70" stroke="rgba(0,255,255,0.2)" stroke-width="0.1" />
      <line x1="20" y1="70" x2="10" y2="10" stroke="rgba(0,255,255,0.2)" stroke-width="0.1" />
    </svg>
  </div>

  <div class="content glass-panel glass-panel--accent">
    <h2 class="title font-display">INHERIT THE STARS,<br/>SECURE DOMINION</h2>
    <p class="desc font-body">
      The fragile peace between star-faring factions has collapsed. Every system is now a prize—a node of production, a bastion of defense, or a chokepoint of critical strategic value.<br/><br/>
      You inherit command of a small cluster of stars. Your mandate is clear: Expand. Fight. Be the last commander standing. The galaxy remembers no second place.
    </p>
    <button class="btn btn--secondary btn--gold" onclick={onPlay}>
      MASTER THE FLOW
    </button>
  </div>
</section>

<style>
  .faction-story {
    position: relative;
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center; /* Center horizontally? Or left align? Inspiration says "floating over void" */
    justify-content: flex-start;
    padding: var(--space-12);
    overflow: hidden;
  }

  .bg-layer {
    position: absolute;
    inset: 0;
    z-index: -1;
    background: #050510;
  }

  .delaunay-svg {
    width: 100%;
    height: 100%;
    opacity: 0.3;
  }

  .content {
    max-width: 600px;
    padding: var(--space-8);
    position: relative;
    z-index: 1;
    margin-left: 10%; /* Offset to left */
  }

  .title {
    font-size: 2.5rem;
    color: var(--color-text-primary);
    margin-bottom: var(--space-4);
    line-height: 1.2;
  }

  .desc {
    font-size: 1.1rem;
    color: var(--color-text-muted);
    line-height: 1.6;
    margin-bottom: var(--space-8);
  }

  .btn--gold {
    border-color: var(--color-accent-yellow);
    color: var(--color-accent-yellow);
  }

  .btn--gold:hover {
    background: rgba(255, 204, 0, 0.1);
    box-shadow: 0 0 20px rgba(255, 204, 0, 0.2);
  }

  @media (max-width: 768px) {
    .faction-story {
      justify-content: center;
      padding: var(--space-6);
    }
    .content {
      margin-left: 0;
    }
  }
</style>
