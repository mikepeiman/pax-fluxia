<script lang="ts">
  import type { GameSpeed } from "$lib/types/game.types";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
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

  const speedOptions: Array<{ value: GameSpeed; label: string; icon: string }> = [
    { value: 0, label: "Pause", icon: "pause" },
    { value: 1, label: "1x", icon: "play-1" },
    { value: 2, label: "2x", icon: "play-2" },
    { value: 4, label: "4x", icon: "play-4" },
    { value: 10, label: "10x", icon: "play-10" },
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
</script>

<HudPanel title="Game Speed" eyebrow="Tempo" class="pf-game-speed">
  <div class="pf-game-speed__buttons" role="group" aria-label="Game speed">
    {#each speedOptions as option}
      <button
        type="button"
        class="pf-game-speed__button"
        class:pf-game-speed__button--active={option.value === 0 ? isPaused : !isPaused && speed === option.value}
        onclick={() => setSpeed(option.value)}
        title={option.label}
      >
        <HudIcon name={option.icon} size={17} />
        <span>{option.label}</span>
      </button>
    {/each}
  </div>
</HudPanel>
