<script lang="ts">
  import "./panel-shared.css";
  import { settingsStore } from "../settingsStore.svelte";
  import { GAME_CONFIG } from "$lib/config/game.config";
  import { SETTINGS_CONTROLS } from "./settingsControlRegistry";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import SettingsControlRenderer from "./SettingsControlRenderer.svelte";

  const panel = $derived(settingsStore.panel);
  const syncFromConfig = settingsStore.syncFromConfig;

  const byKey = new Map(SETTINGS_CONTROLS.map((control) => [control.configKey, control]));
  const controlsFor = (keys: string[]) =>
    keys.map((key) => byKey.get(key)).filter((c): c is NonNullable<typeof c> => Boolean(c));
</script>

<CategoryThemeBar category="travel" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Travel Model</h4>
<SettingsControlRenderer
  controls={controlsFor([
    "TRAVEL_MODE",
    "TRAVEL_EASING",
    "TRAVEL_EASING_POWER",
    "TRAVEL_DURATION_MULT",
    "TRAVEL_ARC_INTENSITY",
    "TRAVEL_FOLLOW_LANE_PATHS",
  ])}
/>

<h4 class="sub-heading">Departure</h4>
<SettingsControlRenderer
  controls={controlsFor([
    "DEPART_MODE",
    "DEPART_FRACTION",
    "DEPART_STAGGER",
    "DEPART_ARC_INTENSITY",
    "DEPART_JITTER_MS",
  ])}
/>

<h4 class="sub-heading">Arrival &amp; Settle</h4>
<SettingsControlRenderer
  controls={controlsFor([
    "SETTLE_DURATION_MS",
    "ARRIVAL_SPREAD",
    "ARRIVAL_ARC_INTENSITY",
    "WOBBLE_AMP",
  ])}
/>

<h4 class="sub-heading">Lane Pathing</h4>
<SettingsControlRenderer
  controls={controlsFor(["LANE_OFFSET_PX"])}
/>

<h4 class="sub-heading">Orbit Bias</h4>
<SettingsControlRenderer controls={controlsFor(["ORBIT_BIAS_STRENGTH", "ORBIT_BIAS_OSCILLATE"])} />
{#if panel.oscillate ?? GAME_CONFIG.ORBIT_BIAS_OSCILLATE ?? false}
  <SettingsControlRenderer
    controls={controlsFor(["ORBIT_BIAS_MIN", "ORBIT_BIAS_MAX", "ORBIT_BIAS_FREQ"])}
  />
{/if}
