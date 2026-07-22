<script lang="ts">
  import "./panel-shared.css";
  import { settingsStore } from "../settingsStore.svelte";
  import { GAME_CONFIG } from "$lib/config/game.config";
  import { PaxSettingsRangeRow } from "$lib/design-system";
  import { SETTINGS_CONTROLS } from "./settingsControlRegistry";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import SettingsControlRenderer from "./SettingsControlRenderer.svelte";

  const panel = $derived(settingsStore.panel);
  const updatePanel = settingsStore.set;
  const syncFromConfig = settingsStore.syncFromConfig;

  const byKey = new Map(SETTINGS_CONTROLS.map((control) => [control.configKey, control]));
  const controlsFor = (keys: string[]) =>
    keys.map((key) => byKey.get(key)).filter((c): c is NonNullable<typeof c> => Boolean(c));
</script>

<CategoryThemeBar category="conquest" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Animation</h4>
<SettingsControlRenderer
  controls={controlsFor([
    "CONQUEST_ANIMATION_MODE",
    "CONQUEST_COLOR_DELAY_TICKS",
    "CONQUEST_FLASH_TICKS",
    "CONQUEST_SETTLE_MS",
    "CONQUEST_SURGE_STAGGER_MS",
  ])}
/>

<h4 class="sub-heading">Force Glow</h4>
<SettingsControlRenderer controls={controlsFor(["CONQUEST_FORCE_GLOW", "CONQUEST_FORCE_GLOW_MULT"])} />

{#if panel.conquestAnimMode === "arrowhead"}
  <h4 class="sub-heading">Arrowhead Formation</h4>
  <SettingsControlRenderer
    controls={controlsFor([
      "ARROW_TAPER",
      "ARROW_WIDTH",
      "ARROW_SPEED",
      "ARROW_EASING",
      "ARROW_STAGGER_AUTO",
    ])}
  />
  <!-- Inline: output depends on the ARROW_STAGGER_AUTO toggle, not the value. -->
  <PaxSettingsRangeRow
    label="Arrowhead Stagger"
    value={panel.arrowStaggerMs}
    min={0}
    max={100}
    step={1}
    output={panel.arrowStaggerAuto ? "auto" : `${panel.arrowStaggerMs}ms`}
    settingConfigKey="ARROW_STAGGER_MS"
    onInput={(value) => {
      GAME_CONFIG.ARROW_STAGGER_MS = value;
      updatePanel("arrowStaggerMs", value);
    }}
  />

  <h4 class="sub-heading">Arrival Pattern</h4>
  <SettingsControlRenderer
    controls={controlsFor([
      "ARROW_ENGULF_MODE",
      "ARROW_ENGULF_RADIUS",
      "ARROW_SPIRAL_MIN_DEG",
      "ARROW_SPIRAL_MAX_DEG",
      "ARROW_SPIRAL_RANDOM",
      "ARROW_SPIRAL_DURATION_MS",
    ])}
  />
{/if}
