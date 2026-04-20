<script lang="ts">
  import { onMount } from "svelte";
  import "../../app.css";
  import GameContainer from "$lib/components/game/GameContainer.svelte";
  import { audioManager } from "$lib/services/audioManager.svelte";

  onMount(() => {
    audioManager.init();
  });
</script>

<svelte:head>
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

<GameContainer />
