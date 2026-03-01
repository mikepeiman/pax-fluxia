<script lang="ts">
  import "../app.css";
  import LandingPage from "$lib/components/landing/LandingPage.svelte";
  import GameContainer from "$lib/components/game/GameContainer.svelte";

  let showGame = $state(false);

  function handlePlay() {
    showGame = true;
  }
</script>

<svelte:head>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&family=Rajdhani:wght@500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<main>
  {#if showGame}
    <GameContainer />
  {:else}
    <LandingPage onPlay={handlePlay} />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    color: #fff;
    font-family: "Inter", sans-serif;
  }
</style>
