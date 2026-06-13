<script lang="ts">
  import Navbar from "./Navbar.svelte";
  import Hero from "./Hero.svelte";
  import UspTriptych from "./USPTriptych.svelte";
  import FeatureDeepDive from "./FeatureDeepDive.svelte";
  import StarTypes from "./StarTypes.svelte";
  import FactionStory from "./FactionStory.svelte";
  import DeveloperVision from "./DeveloperVision.svelte";
  import Footer from "./Footer.svelte";

  let { onPlay } = $props<{ onPlay: () => void }>();
</script>

<div class="landing-page">
  <Navbar {onPlay} />
  <Hero {onPlay} />
  <UspTriptych />
  <FeatureDeepDive />
  <StarTypes />
  <FactionStory {onPlay} />
  <DeveloperVision />
  <Footer />
</div>

<style>
  .landing-page {
    width: 100%;
    min-height: 100vh;
    background-color: var(--pax-color-void);
    color: var(--pax-ui-text-strong);
    overflow-x: hidden;
  }
</style>
