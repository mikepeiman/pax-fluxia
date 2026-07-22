<script lang="ts">
  import "./panel-shared.css";
  import { settingsStore } from "../settingsStore.svelte";
  import { SETTINGS_CONTROLS } from "./settingsControlRegistry";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import SettingsControlRenderer from "./SettingsControlRenderer.svelte";

  const syncFromConfig = settingsStore.syncFromConfig;

  const byKey = new Map(SETTINGS_CONTROLS.map((control) => [control.configKey, control]));
  const controlsFor = (keys: string[]) =>
    keys.map((key) => byKey.get(key)).filter((c): c is NonNullable<typeof c> => Boolean(c));
</script>

<CategoryThemeBar category="economy" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Production &amp; Flow</h4>
<SettingsControlRenderer controls={controlsFor(["BASE_PRODUCTION", "TRANSFER_RATE"])} />

<div class="orb-pair">
  <SettingsControlRenderer
    controls={controlsFor(["MIN_SHIPS_PER_TRANSFER", "MAX_SHIPS_PER_TRANSFER"])}
  />
</div>

<h4 class="sub-heading">Repair Discipline</h4>
<SettingsControlRenderer
  controls={controlsFor([
    "REPAIR_RATE",
    "REPAIR_SUPPRESS_ATTACKER",
    "REPAIR_SUPPRESS_DEFENDER",
  ])}
/>

<h4 class="sub-heading">Starting Pressure</h4>
<SettingsControlRenderer controls={controlsFor(["STARTING_SHIPS"])} />
