<script lang="ts">
  import "./panel-shared.css";
  import { settingsStore } from "../settingsStore.svelte";
  import { SETTINGS_CONTROLS } from "./settingsControlRegistry";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import SettingsControlRenderer from "./SettingsControlRenderer.svelte";

  const syncFromConfig = settingsStore.syncFromConfig;

  // Grouping (IA) stays here; the control DATA + row rendering come from the
  // registry via SettingsControlRenderer — no hand-rolled rows to drift.
  const GROUPS: Array<{ label: string; keys: string[] }> = [
    {
      label: "Aggression",
      keys: [
        "AI_MUST_ATTACK_RATIO",
        "AI_ATTACK_UPPER_BOUNDS",
        "AI_TACTICAL_AGGRESSION",
        "AI_RANDOM_AGGRESSION",
      ],
    },
    {
      label: "Decision Tempo",
      keys: ["AI_ATTACK_STICKINESS", "AI_EVALUATION_FREQUENCY"],
    },
  ];

  const byKey = new Map(SETTINGS_CONTROLS.map((control) => [control.configKey, control]));
  const controlsFor = (keys: string[]) =>
    keys.map((key) => byKey.get(key)).filter((c): c is NonNullable<typeof c> => Boolean(c));
</script>

<CategoryThemeBar category="ai" onApply={() => syncFromConfig?.()} />

{#each GROUPS as group}
  <h4 class="sub-heading">{group.label}</h4>
  <SettingsControlRenderer controls={controlsFor(group.keys)} />
{/each}
