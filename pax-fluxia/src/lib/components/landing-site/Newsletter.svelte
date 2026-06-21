<script lang="ts">
  import { fade } from "svelte/transition";

  // Reusable alpha / newsletter signup. Single source for the subscribe flow —
  // previously duplicated in the hero and footer. Posts to the existing
  // /api/subscribe (Beehiiv) endpoint.
  let {
    cta = "Join the Alpha List",
    placeholder = "your@email.com",
    compact = false,
  }: {
    cta?: string;
    placeholder?: string;
    compact?: boolean;
  } = $props();

  let email = $state("");
  let status = $state<"idle" | "loading" | "success" | "error">("idle");
  let statusMessage = $state("");

  async function handleSubscribe(event: Event) {
    event.preventDefault();
    if (!email) return;

    status = "loading";
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (data.success) {
        status = "success";
        statusMessage = "You're on the list. Watch the skies.";
        email = "";
      } else {
        status = "error";
        statusMessage = data.message || "Comm link failed. Try again.";
      }
    } catch (e) {
      status = "error";
      statusMessage = "Offline. Please try again.";
    }
  }
</script>

<form class="newsletter" class:compact onsubmit={handleSubscribe}>
  <div class="field">
    <input
      type="email"
      bind:value={email}
      {placeholder}
      required
      disabled={status === "loading"}
      aria-label="Email address" />
    <button
      type="submit"
      class="site-btn site-btn--primary"
      disabled={status === "loading"}>
      {status === "loading" ? "Linking…" : cta}
    </button>
  </div>
  {#if status !== "idle" && status !== "loading"}
    <p class="status {status}" transition:fade={{ duration: 200 }}>
      {statusMessage}
    </p>
  {/if}
</form>

<style>
  .newsletter {
    width: 100%;
    max-width: 520px;
  }
  .field {
    display: flex;
    gap: 0.6rem;
    width: 100%;
  }
  input {
    flex: 1;
    min-width: 0;
    padding: 0.95rem 1.1rem;
    color: var(--site-ink);
    font-family: var(--site-font-body);
    font-size: 1rem;
    background: rgba(4, 8, 18, 0.6);
    border: 1px solid var(--site-hairline-strong);
    border-radius: 12px;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }
  input::placeholder {
    color: var(--site-ink-dim);
  }
  input:focus {
    outline: none;
    border-color: var(--site-cyan);
    box-shadow: 0 0 0 3px rgba(47, 227, 255, 0.12);
  }
  input:disabled {
    opacity: 0.6;
  }
  .field .site-btn {
    flex-shrink: 0;
  }
  .status {
    margin: 0.7rem 0 0;
    font-size: 0.9rem;
    font-family: var(--site-font-mono);
    letter-spacing: 0.02em;
  }
  .status.success {
    color: var(--site-green);
  }
  .status.error {
    color: var(--site-red);
  }

  @media (max-width: 540px) {
    .field {
      flex-direction: column;
    }
    .compact .field {
      flex-direction: row;
    }
  }
</style>
