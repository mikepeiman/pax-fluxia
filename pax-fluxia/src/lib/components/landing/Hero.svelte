<script lang="ts">
  import { fade } from 'svelte/transition';

  let { onPlay } = $props<{ onPlay: () => void }>();

  let email = $state('');
  let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
  let statusMessage = $state('');

  async function handleSubscribe(event: Event) {
    event.preventDefault();
    if (!email) return;

    status = 'loading';
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (data.success) {
        status = 'success';
        statusMessage = "You're on the list. Stand by for orders.";
        email = '';
      } else {
        status = 'error';
        statusMessage = data.message || "Comm link failed. Try again.";
      }
    } catch (e) {
      status = 'error';
      statusMessage = "Offline. Please try again.";
    }
  }
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
      Pax Fluxia is the real-time galactic conquest game where you command
      flowing rivers of ships between stars, fighting for total domination
      across a procedurally generated star map. All in your browser.
    </p>

    <div class="actions">
      <div class="primary-actions">
        <button class="btn btn--primary btn--lg btn--pulse" onclick={onPlay}>
          PLAY NOW
        </button>
        <a 
          href="https://discord.gg/yQu7X3UXv" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="discord-btn"
          aria-label="Join our Discord Command"
          title="Join the Discord Command"
        >
          <svg viewBox="0 0 127.14 96.36" class="discord-icon">
            <path fill="currentColor" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21h0A105.73 105.73 0 0 0 32.71 96.36a77.7 77.7 0 0 0 6.89-11.1 88.05 88.05 0 0 1-11.19-5.3 65.59 65.59 0 0 0 2.22-1.63c22.19 10.3 46.16 10.3 68.18 0a61.1 61.1 0 0 0 2.22 1.63 87.05 87.05 0 0 1-11.23 5.3 75.92 75.92 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.15c2.61-26.47-3.95-49.88-21.18-72.14zM42.56 65.3c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96zm42.06 0c-5.36 0-9.8-4.9-9.8-10.96s4.35-10.96 9.8-10.96 9.89 4.9 9.8 10.96c0 6.06-4.35 10.96-9.8 10.96z"/>
          </svg>
        </a>
      </div>

      <form class="subscribe-form" onsubmit={handleSubscribe}>
        <div class="input-group">
          <input 
            type="email" 
            bind:value={email} 
            placeholder="Enter comm-link email" 
            required 
            disabled={status === 'loading'}
            aria-label="Email address for updates"
          />
          <button type="submit" class="btn btn--outline" disabled={status === 'loading'}>
            {status === 'loading' ? 'LINKING...' : 'ENLIST'}
          </button>
        </div>
        {#if status !== 'idle'}
          <p class="status-msg {status}" transition:fade={{ duration: 200 }}>{statusMessage}</p>
        {/if}
      </form>
    </div>
  </div>
</header>

<style>
  .hero {
    position: relative;
    height: 100vh;
    min-height: 800px; /* Give room for form */
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
    background: radial-gradient(
      circle at 20% 30%,
      rgba(0, 255, 255, 0.15),
      transparent 40%
    );
    filter: blur(60px);
    animation: pulse-slow 8s ease-in-out infinite alternate;
  }

  .nebula-2 {
    background: radial-gradient(
      circle at 80% 70%,
      rgba(168, 85, 247, 0.15),
      transparent 40%
    ); /* Magenta-ish */
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
    flex-direction: column;
    gap: var(--space-6);
    margin-top: var(--space-4);
    align-items: center;
    width: 100%;
    max-width: 480px;
  }

  .primary-actions {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    width: 100%;
    justify-content: center;
  }

  /* Discord Button */
  .discord-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: rgba(88, 101, 242, 0.1);
    color: #5865F2; /* Discord Blurple */
    border: 1px solid rgba(88, 101, 242, 0.3);
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .discord-btn:hover {
    background: rgba(88, 101, 242, 0.2);
    border-color: rgba(88, 101, 242, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(88, 101, 242, 0.2);
    color: #fff; /* Highlights on hover */
  }

  .discord-icon {
    width: 32px;
    height: 32px;
  }

  /* Subscribe Form */
  .subscribe-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    background: rgba(0, 0, 0, 0.4);
    padding: var(--space-4);
    border-radius: 12px;
    border: 1px solid rgba(0, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .input-group {
    display: flex;
    gap: var(--space-3);
    width: 100%;
  }

  .subscribe-form input {
    flex: 1;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(0, 255, 255, 0.2);
    border-radius: 8px;
    padding: 0 var(--space-4);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .subscribe-form input:focus {
    outline: none;
    border-color: var(--color-accent-cyan);
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.1);
  }

  .subscribe-form input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn--outline {
    white-space: nowrap;
    min-width: 120px;
    padding: var(--space-3) var(--space-5);
    background: transparent;
    border: 1px solid var(--color-accent-cyan);
    color: var(--color-accent-cyan);
    cursor: pointer;
    border-radius: 8px;
    font-family: var(--font-display);
    font-weight: 700;
    transition: all 0.2s ease;
  }

  .btn--outline:hover:not(:disabled) {
    background: rgba(0, 255, 255, 0.1);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
  }

  .btn--outline:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .status-msg {
    font-size: 0.875rem;
    margin: 0;
    text-align: left;
    padding-left: var(--space-2);
  }

  .status-msg.error {
    color: var(--color-status-danger, #ff4d4d);
  }

  .status-msg.success {
    color: var(--color-status-success, #00ffaa);
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
    .primary-actions {
      flex-direction: column;
    }
    .input-group {
      flex-direction: column;
    }
    .btn, .discord-btn {
      width: 100%;
    }
    .discord-btn {
      border-radius: 8px;
      height: 48px;
    }
    .btn--outline {
      width: 100%;
    }
    .subscribe-form {
      padding: var(--space-3);
    }
  }
</style>
