<script lang="ts">
  let { onPlay } = $props<{ onPlay: () => void }>();
</script>

<header class="hero">
  <div class="hero-bg">
    <!-- Simulated Nebula Layers -->
    <div class="layer nebula-1"></div>
    <div class="layer nebula-2"></div>
    <div class="layer stars"></div>
  </div>

  <div class="hero-content">
    <h1 class="headline font-display">
      COMMAND THE FLOW.<br />
      <span class="highlight">CONQUER THE GALAXY.</span>
    </h1>
    
    <p class="subhead font-body">
      Pax Fluxia is the real-time galactic conquest game where you command flowing rivers of ships between stars, fighting for total domination across a procedurally generated star map. All in your browser.
    </p>

    <div class="actions">
      <button class="btn btn--primary btn--lg btn--pulse" onclick={onPlay}>
        PLAY NOW
      </button>
      <button class="btn btn--ghost btn--lg">
        WATCH TRAILER
      </button>
    </div>
  </div>
</header>

<style>
  .hero {
    position: relative;
    height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
    padding-top: 80px; /* Navbar height */
  }

  /* Background Layers */
  .hero-bg {
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--color-void-deep);
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  .nebula-1 {
    background: radial-gradient(circle at 20% 30%, rgba(0, 255, 255, 0.15), transparent 40%);
    filter: blur(60px);
    animation: pulse-slow 8s ease-in-out infinite alternate;
  }

  .nebula-2 {
    background: radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.15), transparent 40%); /* Magenta-ish */
    filter: blur(80px);
    animation: pulse-slow 12s ease-in-out infinite alternate-reverse;
  }

  .stars {
    background-image: 
      radial-gradient(1px 1px at 10% 10%, white, transparent),
      radial-gradient(1px 1px at 20% 20%, white, transparent),
      radial-gradient(2px 2px at 30% 30%, white, transparent),
      radial-gradient(1px 1px at 40% 40%, white, transparent),
      radial-gradient(1px 1px at 50% 50%, white, transparent),
      radial-gradient(2px 2px at 60% 60%, white, transparent),
      radial-gradient(1px 1px at 70% 70%, white, transparent),
      radial-gradient(1px 1px at 80% 80%, white, transparent),
      radial-gradient(2px 2px at 90% 90%, white, transparent);
    background-size: 550px 550px;
    opacity: 0.5;
    animation: star-drift 120s linear infinite;
  }

  /* Content */
  .hero-content {
    max-width: 900px;
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    align-items: center;
    z-index: 1;
  }

  .headline {
    font-size: 4rem; /* Fallback */
    font-size: clamp(2.5rem, 5vw + 1rem, 5rem);
    line-height: 1.1;
    font-weight: 900;
    color: var(--color-text-primary);
    text-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
  }

  .highlight {
    background: linear-gradient(90deg, #fff, var(--color-accent-cyan));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
  }

  .subhead {
    font-family: var(--font-body);
    font-size: 1.25rem;
    color: var(--color-text-muted);
    max-width: 700px;
    line-height: 1.6;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  }

  .actions {
    display: flex;
    gap: var(--space-6);
    margin-top: var(--space-8);
  }

  @keyframes pulse-slow {
    0% { opacity: 0.5; transform: scale(1); }
    100% { opacity: 0.8; transform: scale(1.1); }
  }

  @keyframes star-drift {
    from { transform: translateY(0); }
    to { transform: translateY(-550px); }
  }

  @media (max-width: 600px) {
    .actions {
      flex-direction: column;
      width: 100%;
    }
    .btn {
      width: 100%;
    }
  }
</style>
