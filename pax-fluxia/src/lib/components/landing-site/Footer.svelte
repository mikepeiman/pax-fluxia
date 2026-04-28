<script lang="ts">
  import { fade } from 'svelte/transition';
  
  let email = $state("");
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

<footer class="footer">
  <div class="container">
    <h2 class="title font-display">BE THE FIRST TO CONQUER THE FLOW.</h2>
    <p class="subtitle font-body">
      Sign up for the private alpha waitlist and newsletter to receive exclusive development updates and launch announcements.
    </p>

    <form class="newsletter-form" onsubmit={handleSubscribe}>
      <input 
        type="email" 
        placeholder="Enter your email..." 
        bind:value={email}
        class="input font-body"
        required
        disabled={status === 'loading'}
      />
      <button type="submit" class="btn btn--primary btn--cyan font-display" disabled={status === 'loading'}>
        {status === 'loading' ? 'LINKING...' : 'SIGN UP'}
      </button>
    </form>
    {#if status !== 'idle'}
      <p class="status-msg {status}" transition:fade={{ duration: 200 }}>{statusMessage}</p>
    {/if}

    <div class="socials">
      <!-- Social Icons Placeholder -->
    </div>

    <div class="copyright font-body">
      &copy; 2024 Fatherlion Studios. All rights reserved. Built with 🌌 by @mikepeiman.
    </div>
  </div>
</footer>

<style>
  .footer {
    padding: var(--space-12) var(--space-8);
    background-color: #050508;
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
  }

  .title {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--color-text-primary);
    letter-spacing: 0.05em;
  }

  .subtitle {
    font-size: 1.1rem;
    color: var(--color-text-muted);
    line-height: 1.6;
    max-width: 600px;
  }

  .newsletter-form {
    display: flex;
    width: 100%;
    max-width: 500px;
    margin-top: var(--space-4);
  }

  .input {
    flex: 1;
    padding: var(--space-4);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--color-text-muted);
    border-right: none;
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--color-accent-cyan);
  }

  .btn--cyan {
    background: var(--color-accent-cyan);
    color: #000;
    border: 1px solid var(--color-accent-cyan);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    padding: 0 var(--space-6);
    font-weight: 700;
  }

  .btn--cyan:hover:not(:disabled) {
    background: #00cccc;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  }

  .btn--cyan:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .status-msg {
    font-size: 0.875rem;
    margin-top: var(--space-2);
  }
  .status-msg.error { color: var(--color-status-danger, #ff4d4d); }
  .status-msg.success { color: var(--color-status-success, #00ffaa); }

  .copyright {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.3);
    margin-top: var(--space-8);
  }

  @media (max-width: 600px) {
    .newsletter-form {
      flex-direction: column;
    }
    .input {
      border-right: 1px solid var(--color-text-muted);
      border-radius: var(--radius-sm);
      margin-bottom: var(--space-2);
    }
    .btn--cyan {
      border-radius: var(--radius-sm);
      padding: var(--space-4);
    }
  }
</style>
