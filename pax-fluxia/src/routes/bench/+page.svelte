<script lang="ts">
  import { onMount } from "svelte";
  import GameContainer from "$lib/components/game/GameContainer.svelte";
  import { installBenchmarkBridge } from "$lib/perf/benchmarkBridge";
  import { audioManager } from "$lib/services/audioManager.svelte";

  onMount(() => {
    audioManager.init();
    const dispose = installBenchmarkBridge({
      openGameShell: async () => {},
      ensureGameShellLoaded: async () => {},
    });
    return () => {
      dispose();
    };
  });
</script>

<GameContainer />
