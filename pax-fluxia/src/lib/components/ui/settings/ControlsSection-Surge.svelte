<script lang="ts">
  import "./panel-shared.css";
  import { settingsStore } from "../settingsStore.svelte";
  import { GAME_CONFIG } from "$lib/config/game.config";
  import { PaxSettingsRangeRow, PaxSettingsToggleRow } from "$lib/design-system";
  import { SETTINGS_CONTROLS } from "./settingsControlRegistry";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import SettingsControlRenderer from "./SettingsControlRenderer.svelte";

  const panel = $derived(settingsStore.panel);
  const updatePanel = settingsStore.set;
  const syncFromConfig = settingsStore.syncFromConfig;

  // Bespoke: the bind flag is stored but resolved live in ShipRenderer; the
  // duration below is disabled while bound. Kept inline.
  const pulseBound = $derived(
    panel.surgePulseBindToTick ?? GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK ?? true,
  );
  function setPulseBindToTick(value: boolean) {
    GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK = value;
    updatePanel("surgePulseBindToTick", value);
  }

  const byKey = new Map(SETTINGS_CONTROLS.map((control) => [control.configKey, control]));
  const controlsFor = (keys: string[]) =>
    keys.map((key) => byKey.get(key)).filter((c): c is NonNullable<typeof c> => Boolean(c));
</script>

<CategoryThemeBar category="surge" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Attack Surge</h4>
<SettingsControlRenderer controls={controlsFor(["ATTACK_SURGE_MULT", "ATTACK_SURGE_PROPORTIONAL"])} />
{#if panel.attackSurgeProportional}
  <SettingsControlRenderer controls={controlsFor(["ATTACK_SURGE_FORCE_COFACTOR"])} />
{/if}
<SettingsControlRenderer controls={controlsFor(["ATTACK_SURGE_RAMP_MS", "ATTACK_SURGE_SHAPE"])} />

<h4 class="sub-heading">Pulse Timing</h4>
<PaxSettingsToggleRow
  label="Bind Pulse Duration To Tick"
  checked={pulseBound}
  description="Match surge pulse duration to the simulation tick."
  meta={pulseBound ? "Bound" : "Free"}
  settingConfigKey="SURGE_PULSE_BIND_TO_TICK"
  onChange={setPulseBindToTick}
/>
<PaxSettingsRangeRow
  label="Pulse Duration"
  value={panel.surgePulseDurationMs ?? GAME_CONFIG.SURGE_PULSE_DURATION_MS}
  min={0}
  max={5000}
  step={10}
  suffix="ms"
  disabled={pulseBound}
  settingConfigKey="SURGE_PULSE_DURATION_MS"
  onInput={(value) => {
    GAME_CONFIG.SURGE_PULSE_DURATION_MS = value;
    updatePanel("surgePulseDurationMs", value);
  }}
/>

<h4 class="sub-heading">Orb Merge</h4>
<SettingsControlRenderer controls={controlsFor(["ORB_TRAVEL"])} />
{#if panel.orbTravel}
  <SettingsControlRenderer controls={controlsFor(["ORB_BASE_RADIUS", "ORB_RADIUS_SCALE", "ORB_GLOW_MULT"])} />
  <h4 class="sub-heading">Orb Layers</h4>
  <div class="orb-pair">
    <SettingsControlRenderer controls={controlsFor(["ORB_OUTER_ALPHA", "ORB_OUTER_SCALE"])} />
  </div>
  <div class="orb-pair">
    <SettingsControlRenderer controls={controlsFor(["ORB_MID_ALPHA", "ORB_MID_SCALE"])} />
  </div>
  <div class="orb-pair">
    <SettingsControlRenderer controls={controlsFor(["ORB_CORE_ALPHA", "ORB_CORE_SCALE"])} />
  </div>
  <SettingsControlRenderer controls={controlsFor(["ORB_CENTER_ALPHA"])} />
{/if}
