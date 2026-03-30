<script lang="ts">
  let { onPlay } = $props<{ onPlay: () => void }>();
</script>

<nav class="navbar glass-panel">
  <div class="navbar-content">
    <div class="logo font-display">PAX FLUXIA</div>
    <div class="links">
      <a href="#features" class="link">FEATURES</a>
      <a href="#factions" class="link">FACTIONS</a>
      <a href="#community" class="link">COMMUNITY</a>
    </div>
    <button class="btn btn--secondary btn--glow" onclick={onPlay}>
      PLAY NOW
    </button>
  </div>
</nav>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 1000;
    border-radius: 0;
    border-top: none;
    border-left: none;
    border-right: none;
    background: rgba(10, 10, 18, 0.85);
  }

  .navbar-content {
    max-width: 1440px;
    margin: 0 auto;
    padding: var(--space-4) var(--space-8);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    color: var(--color-text-primary);
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  }

  .links {
    display: flex;
    gap: var(--space-8);
  }

  .link {
    font-family: var(--font-body); /* Montserrat */
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);
    letter-spacing: 0.05em;
  }

  .link:hover {
    color: var(--color-accent-cyan);
    text-shadow: 0 0 8px var(--color-accent-cyan-dim);
  }

  .btn--glow {
    border-color: var(--color-accent-cyan);
    color: var(--color-accent-cyan);
    background: rgba(0, 255, 255, 0.05);
  }

  .btn--glow:hover {
    background: rgba(0, 255, 255, 0.15);
    box-shadow: 0 0 15px var(--color-accent-cyan-dim);
  }

  @media (max-width: 768px) {
    .links {
      display: none;
    }
  }
</style>
