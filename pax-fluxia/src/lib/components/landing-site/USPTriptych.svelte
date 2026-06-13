<section class="usp-triptych">
  <div class="cards">
    <!-- Card 1 -->
    <div class="card card--cyan">
      <div class="icon-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-activity"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
      </div>
      <h3 class="card-title font-display">Flow-Based Combat</h3>
      <p class="card-text">
        Ships don't warp; they stream between stars in visible rivers of force. Set a dynamic flow and it keeps pumping ships until you stop it or get conquered. A living battlefield you can read at a glance.
      </p>
    </div>

    <!-- Card 2 -->
    <div class="card card--gold">
      <div class="icon-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-map"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
      </div>
      <h3 class="card-title font-display">Topology IS Terrain</h3>
      <p class="card-text">
        No open-world map. Every star is a node connected by fixed stellar lanes. The map's topology drives your strategy, creating emergent chokepoints and flanking maneuvers.
      </p>
    </div>

    <!-- Card 3 -->
    <div class="card card--magenta">
      <div class="icon-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sliders"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
      </div>
      <h3 class="card-title font-display">Infinitely Tunable</h3>
      <p class="card-text">
        Make the game yours. Over 100 live-configurable parameters—from combat tick rates to ship glow intensity—allow you to sculpt every aspect of the experience in real time.
      </p>
    </div>
  </div>
</section>

<style>
  .usp-triptych {
    padding: var(--pax-space-12) var(--pax-space-8);
    display: flex;
    justify-content: center;
    background: linear-gradient(to bottom, var(--pax-color-void), #000);
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--pax-space-8);
    max-width: 1200px;
    width: 100%;
  }

  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--pax-ui-radius-lg);
    padding: var(--pax-space-8);
    backdrop-filter: blur(10px);
    transition: transform var(--pax-ui-motion-base), box-shadow var(--pax-ui-motion-base);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--pax-space-4);
  }

  .card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  .icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--pax-space-4);
    background: rgba(255, 255, 255, 0.05);
  }

  .icon-wrap svg {
    width: 24px;
    height: 24px;
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: var(--pax-space-2);
    color: var(--pax-ui-text-strong);
  }

  .card-text {
    font-size: 1rem;
    color: var(--pax-ui-text-soft);
    line-height: 1.6;
  }

  /* Theme specific styling */
  .card--cyan { border-color: rgba(0, 255, 255, 0.3); }
  .card--cyan .icon-wrap { color: var(--pax-ui-accent); box-shadow: 0 0 15px rgba(0, 255, 255, 0.2); }
  .card--cyan:hover { box-shadow: 0 0 20px rgba(0, 255, 255, 0.1); }

  .card--gold { border-color: rgba(251, 191, 36, 0.3); }
  .card--gold .icon-wrap { color: #fbbf24; box-shadow: 0 0 15px rgba(251, 191, 36, 0.2); }
  .card--gold:hover { box-shadow: 0 0 20px rgba(251, 191, 36, 0.1); }

  .card--magenta { border-color: rgba(168, 85, 247, 0.3); }
  .card--magenta .icon-wrap { color: #a855f7; box-shadow: 0 0 15px rgba(168, 85, 247, 0.2); }
  .card--magenta:hover { box-shadow: 0 0 20px rgba(168, 85, 247, 0.1); }
</style>
