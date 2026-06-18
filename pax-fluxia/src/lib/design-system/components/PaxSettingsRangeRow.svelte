<script lang="ts">
  import PaxHudRange from "./PaxHudRange.svelte";

  type RangeFormat = "raw" | "percent" | "fixed2" | "fixed1" | "multiplier";

  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    format?: RangeFormat;
    suffix?: string;
    output?: string;
    note?: string;
    disabled?: boolean;
    settingConfigKey?: string;
    settingDescription?: string;
    class?: string;
    onInput: (value: number) => void;
  }

  let {
    label,
    value,
    min,
    max,
    step,
    format = "raw",
    suffix = "",
    output,
    note,
    disabled = false,
    settingConfigKey,
    settingDescription,
    class: className = "",
    onInput,
  }: Props = $props();

  function displayValue(v: number): string {
    switch (format) {
      case "percent":
        return `${Math.round(v)}%`;
      case "fixed2":
        return v.toFixed(2);
      case "fixed1":
        return v.toFixed(1);
      case "multiplier":
        return `${v.toFixed(2)}x`;
      default:
        return `${v}${suffix}`;
    }
  }
</script>

<!-- Thin wrapper for settings: carries the search/persistence data attributes;
     the single-row layout + nudges live in PaxHudRange (the design-system source). -->
<div
  class={`pax-settings-range-row ${className}`}
  class:pax-settings-range-row--disabled={disabled}
  data-setting-config-key={settingConfigKey}
  data-setting-label={label}
  data-setting-description={settingDescription}
>
  <PaxHudRange
    {label}
    {note}
    {value}
    {min}
    {max}
    {step}
    {disabled}
    output={output ?? displayValue(value)}
    ariaLabel={label}
    onInput={onInput}
  />
</div>

<style>
  .pax-settings-range-row {
    min-width: 0;
  }
  .pax-settings-range-row--disabled {
    opacity: 0.42;
  }
</style>
