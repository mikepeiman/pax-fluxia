<script lang="ts">
  import "./panel-shared.css";
  import { settingsStore } from "../settingsStore.svelte";
  import { SETTINGS_CONTROLS } from "./settingsControlRegistry";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import SettingsControlRenderer from "./SettingsControlRenderer.svelte";

  const syncFromConfig = settingsStore.syncFromConfig;

  // Grouping (IA) stays here; control DATA + rows come from the registry.
  const GROUPS: Array<{ label: string; keys: string[] }> = [
    {
      label: "Damage Model",
      keys: [
        "AGGRESSOR_ADVANTAGE",
        "GLOBAL_DAMAGE_MODIFIER",
        "LETHALITY",
        "FORCE_RATIO_EFFECT",
      ],
    },
    {
      label: "Capture Rules",
      keys: [
        "CONQUEST_THRESHOLD",
        "CONQUEST_TRANSFER_PERCENTAGE",
        "RETREAT_CAPTURE_RATE",
        "SCATTER_CAPTURE_RATE",
        "SCATTER_DESTROY_RATE",
      ],
    },
    {
      label: "Damaged Ships",
      keys: ["RETREAT_DAMAGED_ACTIVATION_RATE", "DAMAGED_SHIP_EFFECTIVENESS"],
    },
  ];

  const byKey = new Map(SETTINGS_CONTROLS.map((control) => [control.configKey, control]));
  const controlsFor = (keys: string[]) =>
    keys.map((key) => byKey.get(key)).filter((c): c is NonNullable<typeof c> => Boolean(c));
</script>

<CategoryThemeBar category="combat" onApply={() => syncFromConfig?.()} />

{#each GROUPS as group}
  <h4 class="sub-heading">{group.label}</h4>
  <SettingsControlRenderer controls={controlsFor(group.keys)} />
{/each}
