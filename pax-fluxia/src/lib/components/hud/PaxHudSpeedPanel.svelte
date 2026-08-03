<script lang="ts">
  import type { GameSpeed } from "$lib/types/game.types";
  import { PaxHudPanel, PaxHudRange, PaxHudSegmentedControl, type PaxHudSegmentedOption } from "$lib/design-system";
  import type { GameSpeedPanelActions } from "$lib/components/game-hud/types";

  let {
    speed,
    isPaused,
    hasStarted,
    tickIntervalMs,
    onSpeedChange,
    onPause,
    onResume,
    onStart,
    onTickIntervalChange,
  }: GameSpeedPanelActions = $props();

  // Tempo is a colour ramp, not five interchangeable buttons: neutral at rest,
  // then calm → steady → urgent → alarming as the clock speeds up. Each tone is
  // a theme token, so the ramp re-casts with the rest of the HUD.
  const speedOptions: Array<PaxHudSegmentedOption & { value: `${GameSpeed}` }> = [
    { value: "0", label: "Pause", icon: "pause", title: "Pause the clock", tone: "var(--pax-ui-speed-pause)" },
    { value: "1", label: "1x", icon: "play-1", title: "Normal speed", tone: "var(--pax-ui-speed-normal)" },
    { value: "2", label: "2x", icon: "play-2", title: "Double speed", tone: "var(--pax-ui-speed-fast)" },
    { value: "4", label: "4x", icon: "play-4", title: "Quadruple speed", tone: "var(--pax-ui-speed-high)" },
    { value: "10", label: "10x", icon: "play-10", title: "Maximum speed", tone: "var(--pax-ui-speed-extreme)" },
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

<PaxHudPanel title="Game Speed" eyebrow="Tempo" class="pf-hud-panel pf-game-speed">
  <PaxHudSegmentedControl
    value={selectedValue()}
    options={speedOptions}
    ariaLabel="Game speed"
    density="compact"
    class="pf-game-speed__buttons"
    iconSize={17}
    onValueChange={(value) => setSpeed(Number(value) as GameSpeed)}
  />
  <PaxHudRange
    label="Tick Duration"
    value={tickIntervalMs}
    min={100}
    max={5000}
    step={50}
    output={`${tickIntervalMs} ms`}
    ariaLabel="Tick duration in milliseconds"
    onInput={onTickIntervalChange}
  />
</PaxHudPanel>
