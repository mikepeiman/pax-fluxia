<script>
  import GameInterface from "$components/GameInterface.svelte";
</script>

<svelte:head>
  <title>PAX FLUXIA - Phase 1 Implementation</title>
  <meta
    name="description"
    content="Pax Fluxia Phase 1: Core game mechanics with ship production and basic UI." />
</svelte:head>

<GameInterface />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: "Courier New", monospace;
    background: linear-gradient(135deg, #0a0a0f, #1a1a2e);
  }

  :global(*) {
    box-sizing: border-box;
  }
</style>
