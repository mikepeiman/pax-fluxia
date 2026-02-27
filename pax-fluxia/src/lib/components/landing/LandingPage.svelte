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
    background-color: var(--color-void-deep);
    color: var(--color-text-primary);
    overflow-x: hidden;
  }
</style>
