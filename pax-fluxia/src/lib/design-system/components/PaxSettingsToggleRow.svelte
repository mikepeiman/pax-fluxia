<script lang="ts">
  import PaxInfoHint from "./PaxInfoHint.svelte";

  interface Props {
    label: string;
    checked: boolean;
    description?: string;
    meta?: string;
    disabled?: boolean;
    settingConfigKey?: string;
    class?: string;
    onChange?: (checked: boolean) => void;
    onToggle?: (checked: boolean) => void;
  }

  let {
    label,
    checked,
    description,
    meta,
    disabled = false,
    settingConfigKey,
    class: className = "",
    onChange,
    onToggle,
  }: Props = $props();

  function handleChange(checked: boolean) {
    onChange?.(checked);
    onToggle?.(checked);
  }
</script>

<label
  class={`pax-settings-toggle-row ${className}`}
  class:pax-settings-toggle-row--checked={checked}
  class:pax-settings-toggle-row--disabled={disabled}
  data-setting-config-key={settingConfigKey}
  data-setting-description={description}
>
  <input
    class="pax-settings-toggle-row__input"
    type="checkbox"
    {checked}
    {disabled}
    onchange={(event) => handleChange(event.currentTarget.checked)}
  />
  <span class="pax-settings-toggle-row__switch" aria-hidden="true">
    <span class="pax-settings-toggle-row__knob"></span>
  </span>
  <span class="pax-settings-toggle-row__copy">
    <strong class="pax-settings-toggle-row__label">
      {label}
    </strong>
    {#if description}
      <PaxInfoHint text={description} class="pax-settings-toggle-row__hint" />
    {/if}
  </span>
  {#if meta}
    <span class="pax-settings-toggle-row__meta">{meta}</span>
  {/if}
</label>

<style>
  /* Flat row — no border-box. (See panel-shared.css rationale.) */
  .pax-settings-toggle-row {
    min-width: 0;
    min-height: 34px;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--pax-gap-sm);
    padding: 5px var(--pax-gap-xs);
    border-radius: var(--pax-ui-radius-sm);
    background: transparent;
    color: var(--pax-ui-text);
    cursor: pointer;
    font-family: var(--pax-ui-font-ui);
    transition: background var(--pax-motion-fast, 150ms ease);
  }

  .pax-settings-toggle-row:hover {
    background: color-mix(in srgb, var(--pax-ui-accent-warm) 5%, transparent);
  }

  .pax-settings-toggle-row--disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  .pax-settings-toggle-row__input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
  }

  .pax-settings-toggle-row__switch {
    width: 36px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    padding: 2px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 38%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--pax-color-void) 90%, transparent);
    transition:
      background var(--pax-motion-fast, 150ms ease),
      border-color var(--pax-motion-fast, 150ms ease),
      box-shadow var(--pax-motion-fast, 150ms ease);
  }

  .pax-settings-toggle-row__knob {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--pax-ui-text-soft);
    box-shadow: 0 0 0 transparent;
    transform: translateX(0);
    transition:
      background var(--pax-motion-fast, 150ms ease),
      box-shadow var(--pax-motion-fast, 150ms ease),
      transform var(--pax-motion-fast, 150ms ease);
  }

  .pax-settings-toggle-row--checked .pax-settings-toggle-row__switch {
    border-color: color-mix(in srgb, var(--pax-ui-accent) 65%, transparent);
    background: color-mix(in srgb, var(--pax-ui-accent) 22%, rgba(1, 12, 16, 0.9));
  }

  .pax-settings-toggle-row--checked .pax-settings-toggle-row__knob {
    background: var(--pax-ui-accent);
    transform: translateX(16px);
  }

  .pax-settings-toggle-row__copy {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: var(--pax-gap-xs);
  }

  .pax-settings-toggle-row__label {
    min-width: 0;
    overflow: hidden;
    color: var(--pax-ui-text);
    font-size: calc(0.74rem * var(--pax-ui-type-scale, 1));
    font-weight: var(--pax-weight-extrabold);
    letter-spacing: 0.05em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .pax-settings-toggle-row__meta {
    color: var(--pax-ui-accent-warm-strong);
    font-family: var(--pax-ui-font-data);
    font-size: calc(0.68rem * var(--pax-ui-data-scale, 1));
    font-weight: var(--pax-weight-extrabold);
    white-space: nowrap;
  }
</style>
