<script lang="ts">
  // Registry-driven renderer: projects a list of SettingsControl entries onto
  // the shared Pax*Row components. This is the single place control rows are
  // drawn, so a section built from it cannot drift from the registry (the
  // 15-hand-rolled-files drift source). Only the PURE-DATA control types are
  // handled here (range/toggle/segmented with a uniform settingsStore write +
  // optional display scale/format); genuinely bespoke controls (custom output,
  // mode-gated disabled, service side-effects) stay inline in their section.
  import { settingsStore } from "../settingsStore.svelte";
  import { GAME_CONFIG } from "$lib/config/game.config";
  import { CONFIG_TO_PANEL_KEY, derivePanelKey } from "../settingsDefs";
  import PaxSettingsRangeRow from "$lib/design-system/components/PaxSettingsRangeRow.svelte";
  import PaxSettingsToggleRow from "$lib/design-system/components/PaxSettingsToggleRow.svelte";
  import PaxSettingsSegmentedRow from "$lib/design-system/components/PaxSettingsSegmentedRow.svelte";
  import type { SettingsControl } from "./settingsControlRegistry";
  import { toShown, toStored, displayOutput } from "./settingsControlValue";

  interface Props {
    controls: readonly SettingsControl[];
  }
  let { controls }: Props = $props();

  const panel = $derived(settingsStore.panel);

  function panelKeyOf(c: SettingsControl): string {
    return (
      c.panelKey ??
      (CONFIG_TO_PANEL_KEY as Record<string, string>)[c.configKey] ??
      derivePanelKey(c.configKey)
    );
  }
  function rawValue(c: SettingsControl): unknown {
    const pv = (panel as Record<string, unknown>)[panelKeyOf(c)];
    return pv ?? (GAME_CONFIG as unknown as Record<string, unknown>)[c.configKey];
  }
  function shownNumber(c: SettingsControl): number {
    return toShown(c, Number(rawValue(c) ?? 0));
  }
  // Faithful to the hand-rolled sections' update path, and transform-safe: if the
  // key has a PANEL_CONFIG_MAP entry, route through the store (it writes
  // GAME_CONFIG via the mapping, respecting any transform — a raw write here is
  // how the old inverse-'defense' mapping flipped on reload). Otherwise write the
  // derived panel key AND GAME_CONFIG raw (the store won't, with no mapping).
  function write(c: SettingsControl, value: unknown) {
    const mapped = (CONFIG_TO_PANEL_KEY as Record<string, string>)[c.configKey];
    if (mapped) {
      settingsStore.set(mapped, value);
    } else {
      settingsStore.set(panelKeyOf(c), value);
      (GAME_CONFIG as unknown as Record<string, unknown>)[c.configKey] = value;
    }
  }
  function commitNumber(c: SettingsControl, shown: number) {
    write(c, toStored(c, shown));
  }
</script>

{#each controls as c (c.configKey)}
  {#if c.controlType === "range" && c.range}
    <PaxSettingsRangeRow
      label={c.label}
      value={shownNumber(c)}
      min={c.range.min}
      max={c.range.max}
      step={c.range.step}
      format={c.format === "percentOfFraction" ? "raw" : (c.format ?? "raw")}
      output={displayOutput(c, shownNumber(c))}
      settingConfigKey={c.configKey}
      settingDescription={c.description}
      onInput={(value) => commitNumber(c, value)}
    />
  {:else if c.controlType === "toggle"}
    <PaxSettingsToggleRow
      label={c.label}
      checked={Boolean(rawValue(c))}
      description={c.description}
      settingConfigKey={c.configKey}
      onChange={(value) => write(c, value)}
    />
  {:else if c.controlType === "segmented" && c.options}
    <PaxSettingsSegmentedRow
      label={c.label}
      value={String(rawValue(c))}
      options={c.options.map((option) =>
        typeof option === "string" ? { value: option, label: option } : option,
      )}
      hint={c.description}
      settingConfigKey={c.configKey}
      onValueChange={(value) => write(c, value)}
    />
  {/if}
{/each}
