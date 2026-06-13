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
    <p class="kicker">Real-time galactic strategy</p>

    <h1 class="headline font-display">
      Pour your fleets between the stars.<br />
      <span class="highlight">Take the galaxy one system at a time.</span>
    </h1>

    <p class="subhead font-body">
      Pax Fluxia is strategy you read at a glance — no menus, no spreadsheets.
      Just stars, the lanes between them, and the ships you stream down those
      lanes. Set a flow and it keeps pumping. Pin a rival with a single ship.
      Surround them, and their whole fleet falls into your hands.
    </p>

    <div class="actions">
      <div class="primary-actions">
        <button class="btn btn--primary btn--lg btn--pulse" onclick={onPlay}>
          Play free in your browser
        </button>
        <a
          href="https://discord.gg/yQu7X3UXv"
          target="_blank"
          rel="noopener noreferrer"
          class="discord-btn"
          aria-label="Join the Pax Fluxia Discord"
          title="Join the Discord"
        >
          <svg viewBox="0 0 127.14 96.36" class="discord-icon">
            <path
              fill="currentColor"
              d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21h0A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.1 88.05 88.05 0 0 1-11.19-5.3 65.59 65.59 0 0 0 2.22-1.63c22.19 10.3 46.16 10.3 68.18 0a61.1 61.1 0 0 0 2.22 1.63 87.05 87.05 0 0 1-11.23 5.3 75.92 75.92 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.15c2.61-26.47-3.95-49.88-21.18-72.14zM42.56 65.3c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96zm42.06 0c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96z"
            />
          </svg>
        </a>
      </div>
      <p class="hero-meta">Free · Runs in any modern browser · No download</p>
    </div>
  </div>
</header>

<style>
  .hero {
    position: relative;
    min-height: 100vh;
    min-height: 100svh;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
    padding: 80px var(--pax-space-6) var(--pax-space-8);
  }

  /* Background Layers */
  .hero-bg {
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--pax-color-void);
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  .nebula-1 {
    background: radial-gradient(
      circle at 20% 30%,
      color-mix(in srgb, var(--pax-ui-accent) 18%, transparent),
      transparent 40%
    );
    filter: blur(60px);
    animation: pulse-slow 8s ease-in-out infinite alternate;
  }

  .nebula-2 {
    background: radial-gradient(
      circle at 80% 70%,
      color-mix(in srgb, var(--pax-ui-accent-warm) 16%, transparent),
      transparent 40%
    );
    filter: blur(80px);
    animation: pulse-slow 12s ease-in-out infinite alternate-reverse;
  }

  .stars {
    background-image: radial-gradient(1px 1px at 10% 10%, white, transparent),
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
    max-width: 920px;
    width: 100%;
    box-sizing: border-box;
    padding: var(--pax-space-8);
    display: flex;
    flex-direction: column;
    gap: var(--pax-space-5);
    align-items: center;
    z-index: 1;
  }

  .kicker {
    margin: 0;
    font-family: var(--pax-ui-font-ui);
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--pax-ui-accent);
    text-shadow: 0 0 18px color-mix(in srgb, var(--pax-ui-accent) 45%, transparent);
  }

  .headline {
    font-size: 4rem; /* Fallback */
    font-size: clamp(2.5rem, 5vw + 1rem, 5rem);
    line-height: 1.08;
    font-weight: 900;
    color: var(--pax-ui-text-strong);
    text-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
    margin: 0;
  }

  .highlight {
    background: linear-gradient(90deg, #fff, var(--pax-ui-accent));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 0 20px color-mix(in srgb, var(--pax-ui-accent) 40%, transparent);
  }

  .subhead {
    font-family: var(--pax-ui-font-copy);
    font-size: 1.2rem;
    color: var(--pax-ui-text-soft);
    max-width: 680px;
    line-height: 1.6;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    margin: 0;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--pax-space-3);
    margin-top: var(--pax-space-4);
    align-items: center;
    width: 100%;
    max-width: 520px;
  }

  .primary-actions {
    display: flex;
    gap: var(--pax-space-4);
    align-items: center;
    justify-content: center;
  }

  .hero-meta {
    margin: 0;
    font-family: var(--pax-ui-font-ui);
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    color: var(--pax-ui-text-dim);
  }

  /* Discord Button */
  .discord-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: var(--pax-ui-radius-md);
    background: rgba(88, 101, 242, 0.12);
    color: #5865f2; /* Discord brand */
    border: 1px solid rgba(88, 101, 242, 0.32);
    transition: all var(--pax-ui-motion-fast);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .discord-btn:hover {
    background: rgba(88, 101, 242, 0.2);
    border-color: rgba(88, 101, 242, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(88, 101, 242, 0.2);
    color: #fff;
  }

  .discord-icon {
    width: 32px;
    height: 32px;
  }

  @keyframes pulse-slow {
    0% {
      opacity: 0.5;
      transform: scale(1);
    }
    100% {
      opacity: 0.8;
      transform: scale(1.1);
    }
  }

  @keyframes star-drift {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-550px);
    }
  }

  @media (max-width: 600px) {
    .hero {
      padding: 88px var(--pax-space-4) var(--pax-space-6);
    }

    .primary-actions {
      flex-direction: column;
      width: 100%;
    }
    .btn,
    .discord-btn {
      width: 100%;
    }
    .discord-btn {
      border-radius: var(--pax-ui-radius-xs);
      height: 48px;
    }
  }
</style>
