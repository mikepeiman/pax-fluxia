<script lang="ts">
  let email = $state("");
</script>

<footer class="footer">
  <div class="container">
    <h2 class="title font-display">BE THE FIRST TO CONQUER THE FLOW.</h2>
    <p class="subtitle font-body">
      Sign up for the private alpha waitlist and newsletter to receive exclusive development updates and launch announcements.
    </p>

    <div class="newsletter-form">
      <input 
        type="email" 
        placeholder="Enter your email..." 
        bind:value={email}
        class="input font-body"
      />
      <button class="btn btn--primary btn--cyan font-display">
        SIGN UP
      </button>
    </div>

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

  .btn--cyan:hover {
    background: #00cccc;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  }

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
