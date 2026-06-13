<script lang="ts">
  import { onMount } from "svelte";
  import "../../app.css";
  import GameContainer from "$lib/components/game/GameContainer.svelte";
  import { audioManager } from "$lib/services/audioManager.svelte";

  onMount(() => {
    audioManager.init();
  });
</script>

<GameContainer />
