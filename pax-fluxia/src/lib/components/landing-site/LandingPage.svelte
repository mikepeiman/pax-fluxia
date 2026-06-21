<script lang="ts">
  import SiteHeader from "./SiteHeader.svelte";
  import Hero from "./Hero.svelte";
  import Pillars from "./Pillars.svelte";
  import HowItPlays from "./HowItPlays.svelte";
  import StarTypes from "./StarTypes.svelte";
  import StoryBand from "./StoryBand.svelte";
  import DevlogTeaser from "./DevlogTeaser.svelte";
  import StudioBand from "./StudioBand.svelte";
  import FinalCta from "./FinalCta.svelte";
  import SiteFooter from "./SiteFooter.svelte";

  let { onPlay }: { onPlay: () => void } = $props();
</script>

<svelte:head>
  <title>Pax Fluxia — Command the Flow. Conquer the Galaxy.</title>
  <meta
    name="description"
    content="A free, in-browser tick-based real-time strategy game. Fleets stream between stars in living rivers of force — easy to read, deep to master. Play the alpha now." />
  <meta property="og:title" content="Pax Fluxia — Command the Flow" />
  <meta
    property="og:description"
    content="A tick-based real-time strategy game of rivers, stars, and position. Play the free alpha in your browser." />
  <meta property="og:image" content="/assets/pax-fluxia-bg-18.jpg" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="site-root landing-page">
  <SiteHeader {onPlay} />
  <main>
    <Hero {onPlay} />
    <Pillars />
    <HowItPlays />
    <StarTypes />
    <StoryBand {onPlay} />
    <DevlogTeaser />
    <StudioBand />
    <FinalCta {onPlay} />
  </main>
  <SiteFooter />
</div>

<style>
  .landing-page {
    width: 100%;
    min-height: 100vh;
    overflow-x: hidden;
  }
  main {
    position: relative;
    z-index: 1;
  }
</style>
