<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import "../app.css";
  import LandingPage from "$lib/components/landing-site";
  import { audioManager } from "$lib/services/audioManager.svelte";
  import { isGameHost } from "$lib/site/play";

  // The home route is the marketing landing only. The playable game lives at the
  // real `/play` route (see src/routes/play/+page.svelte), so entering the game
  // is a genuine navigation — the browser back button returns here natively, no
  // URL token, no inline toggle.
  function handlePlay() {
    audioManager.play("play");
    void goto("/play");
  }

  onMount(() => {
    audioManager.init();
    // The dedicated game subdomain (play.*) has no landing — send it straight to
    // the real game route.
    if (typeof window !== "undefined" && isGameHost(window.location.hostname)) {
      void goto("/play", { replaceState: true });
    }
  });
</script>

<main>
  <LandingPage onPlay={handlePlay} />

  <script
    type="text/javascript"
    async
    src="https://subscribe-forms.beehiiv.com/attribution.js"></script>
</main>

<style>
  main {
    position: relative;
    min-height: 100vh;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: "Inter", sans-serif;
  }
</style>
