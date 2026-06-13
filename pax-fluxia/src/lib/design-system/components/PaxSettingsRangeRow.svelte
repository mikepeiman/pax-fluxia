<script lang="ts">
  import PaxHudButton from "./PaxHudButton.svelte";
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

  function nudge(direction: -1 | 1) {
    if (disabled) return;
    const nextValue = Math.min(max, Math.max(min, value + step * direction));
    onInput(nextValue);
  }
</script>

<div
  class={`pax-settings-range-row ${className}`}
  class:pax-settings-range-row--disabled={disabled}
  data-setting-config-key={settingConfigKey}
  data-setting-label={label}
  data-setting-description={settingDescription}
>
  <div class="pax-settings-range-row__nudge">
    <PaxHudButton label="-" size="sm" disabled={disabled} onclick={() => nudge(-1)} />
  </div>
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
  <div class="pax-settings-range-row__nudge">
    <PaxHudButton label="+" size="sm" disabled={disabled} onclick={() => nudge(1)} />
  </div>
</div>

<style>
  .pax-settings-range-row {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 10px;
    border: 1px solid transparent;
    border-radius: var(--pax-ui-radius-sm);
    clip-path: var(--pax-ui-rounded-corner-sm);
    background:
      linear-gradient(180deg, rgba(0, 18, 21, 0.78), rgba(0, 10, 13, 0.9)) padding-box,
      var(--pax-ui-control-border-gradient) border-box;
  }

  .pax-settings-range-row--disabled {
    opacity: 0.42;
  }

  .pax-settings-range-row__nudge {
    display: none;
  }

  @media (max-width: 1024px) {
    .pax-settings-range-row {
      grid-template-columns: 34px minmax(0, 1fr) 34px;
    }

    .pax-settings-range-row__nudge {
      display: block;
    }
  }
</style>
