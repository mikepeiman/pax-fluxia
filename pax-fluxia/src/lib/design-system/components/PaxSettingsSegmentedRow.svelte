<script lang="ts">
  // A labelled segmented control for settings — the canonical replacement for
  // dropdowns with a small option set (≤4). Label (+ optional info hint) sits
  // above the segments so it never overflows a narrow panel.
  import PaxHudSegmentedControl, {
    type PaxHudSegmentedOption,
  } from "./PaxHudSegmentedControl.svelte";
  import PaxInfoHint from "./PaxInfoHint.svelte";

  interface Props {
    label: string;
    value: string;
    options: PaxHudSegmentedOption[];
    /** Help text shown via an info hint next to the label. */
    hint?: string;
    disabled?: boolean;
    settingConfigKey?: string;
    class?: string;
    onValueChange: (value: string) => void;
  }

  let {
    label,
    value,
    options,
    hint,
    disabled = false,
    settingConfigKey,
    class: className = "",
    onValueChange,
  }: Props = $props();

  const resolvedOptions = $derived(
    disabled ? options.map((o) => ({ ...o, disabled: true })) : options,
  );
</script>

<div
  class={`pax-settings-segmented-row ${className}`.trim()}
  class:pax-settings-segmented-row--disabled={disabled}
>
  <span
    class="pax-settings-segmented-row__label"
    data-setting-config-key={settingConfigKey}
    data-setting-description={hint}
  >
    {label}
    {#if hint}<PaxInfoHint text={hint} />{/if}
  </span>
  <PaxHudSegmentedControl
    {value}
    options={resolvedOptions}
    ariaLabel={label}
    density="compact"
    {onValueChange}
  />
</div>

<style>
  .pax-settings-segmented-row {
    display: flex;
    flex-direction: column;
    gap: var(--pax-gap-xs);
    min-width: 0;
    padding: 5px var(--pax-gap-xs);
  }

  .pax-settings-segmented-row--disabled {
    opacity: 0.45;
    pointer-events: none;
  }

  .pax-settings-segmented-row__label {
    display: inline-flex;
    align-items: center;
    gap: var(--pax-gap-xs);
    min-width: 0;
    color: var(--pax-ui-text);
    font-family: var(--pax-ui-font-ui);
    font-size: calc(0.74rem * var(--pax-ui-type-scale, 1));
    font-weight: var(--pax-weight-extrabold);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
</style>
