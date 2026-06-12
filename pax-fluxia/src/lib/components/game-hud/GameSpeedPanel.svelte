<script lang="ts">
  import type { GameSpeed } from "$lib/types/game.types";
  import { PaxHudSegmentedControl, type PaxHudSegmentedOption } from "$lib/design-system";
  import HudPanel from "./HudPanel.svelte";
  import type { GameSpeedPanelActions } from "./types";

  let {
    speed,
    isPaused,
    hasStarted,
    onSpeedChange,
    onPause,
    onResume,
    onStart,
  }: GameSpeedPanelActions = $props();

  const speedOptions: Array<PaxHudSegmentedOption & { value: `${GameSpeed}` }> = [
    { value: "0", label: "Pause", icon: "pause" },
    { value: "1", label: "1x", icon: "play-1" },
    { value: "2", label: "2x", icon: "play-2" },
    { value: "4", label: "4x", icon: "play-4" },
    { value: "10", label: "10x", icon: "play-10" },
  ];

  function setSpeed(nextSpeed: GameSpeed) {
    if (!hasStarted && nextSpeed > 0) {
      onStart();
    }
    if (nextSpeed === 0) {
      onPause();
      return;
    }
    if (isPaused) {
      onResume();
    }
    onSpeedChange(nextSpeed);
  }

  function selectedValue() {
    return isPaused ? "0" : String(speed);
  }
</script>

<HudPanel title="Game Speed" eyebrow="Tempo" class="pf-game-speed">
  <PaxHudSegmentedControl
    value={selectedValue()}
    options={speedOptions}
    ariaLabel="Game speed"
    density="compact"
    class="pf-game-speed__buttons"
    iconSize={17}
    onValueChange={(value) => setSpeed(Number(value) as GameSpeed)}
  />
</HudPanel>
