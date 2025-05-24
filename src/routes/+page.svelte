<script>
  import PixiControls from "$components/PixiControls.svelte";
</script>

<svelte:head>
  <title>PAX FLUXIA - High-Performance Space Strategy</title>
  <meta
    name="description"
    content="Experience buttery-smooth space strategy with advanced PixiJS rendering and tick-based animation." />
</svelte:head>

<PixiControls width={1400} height={900} />

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
