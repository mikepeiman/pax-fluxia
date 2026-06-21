<script lang="ts">
  import "../../app.css";
  import SiteHeader from "$lib/components/landing-site/SiteHeader.svelte";
  import SiteFooter from "$lib/components/landing-site/SiteFooter.svelte";

  let { children } = $props();
</script>

<div class="site-root">
  <SiteHeader />
  <main class="page">
    {@render children()}
  </main>
  <SiteFooter />
</div>

<style>
  .page {
    position: relative;
    z-index: 1;
    min-height: 60vh;
  }
</style>
