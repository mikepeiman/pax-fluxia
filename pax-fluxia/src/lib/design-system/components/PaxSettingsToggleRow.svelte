<script lang="ts">
  interface Props {
    label: string;
    checked: boolean;
    description?: string;
    meta?: string;
    disabled?: boolean;
    settingConfigKey?: string;
    class?: string;
    onChange: (checked: boolean) => void;
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
  }: Props = $props();
</script>

<label
  class={`pax-settings-toggle-row ${className}`}
  class:pax-settings-toggle-row--checked={checked}
  class:pax-settings-toggle-row--disabled={disabled}
>
  <input
    class="pax-settings-toggle-row__input"
    type="checkbox"
    {checked}
    {disabled}
    onchange={(event) => onChange(event.currentTarget.checked)}
  />
  <span class="pax-settings-toggle-row__switch" aria-hidden="true">
    <span class="pax-settings-toggle-row__knob"></span>
  </span>
  <span class="pax-settings-toggle-row__copy">
    <strong
      class="pax-settings-toggle-row__label"
      data-setting-config-key={settingConfigKey}
      data-setting-description={description}
    >
      {label}
    </strong>
    {#if description}
      <small class="pax-settings-toggle-row__description">{description}</small>
    {/if}
  </span>
  {#if meta}
    <span class="pax-settings-toggle-row__meta">{meta}</span>
  {/if}
</label>

<style>
  .pax-settings-toggle-row {
    min-width: 0;
    min-height: 42px;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border: 1px solid transparent;
    border-radius: var(--hud-radius-sm);
    clip-path: var(--hud-rounded-corner-sm);
    background:
      linear-gradient(180deg, rgba(0, 18, 21, 0.76), rgba(0, 10, 13, 0.9)) padding-box,
      var(--hud-control-border-gradient) border-box;
    color: var(--hud-text);
    cursor: pointer;
    font-family: var(--hud-font-ui);
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
    border: 1px solid color-mix(in srgb, var(--hud-text-muted) 38%, transparent);
    border-radius: 999px;
    background: rgba(1, 12, 16, 0.9);
    transition:
      background var(--pax-motion-fast, 150ms ease),
      border-color var(--pax-motion-fast, 150ms ease),
      box-shadow var(--pax-motion-fast, 150ms ease);
  }

  .pax-settings-toggle-row__knob {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--hud-text-muted);
    box-shadow: 0 0 0 transparent;
    transform: translateX(0);
    transition:
      background var(--pax-motion-fast, 150ms ease),
      box-shadow var(--pax-motion-fast, 150ms ease),
      transform var(--pax-motion-fast, 150ms ease);
  }

  .pax-settings-toggle-row--checked .pax-settings-toggle-row__switch {
    border-color: color-mix(in srgb, var(--hud-accent-cyan) 65%, transparent);
    background: color-mix(in srgb, var(--hud-accent-cyan) 22%, rgba(1, 12, 16, 0.9));
    box-shadow: 0 0 16px color-mix(in srgb, var(--hud-accent-cyan) 18%, transparent);
  }

  .pax-settings-toggle-row--checked .pax-settings-toggle-row__knob {
    background: var(--hud-accent-cyan);
    box-shadow: 0 0 10px color-mix(in srgb, var(--hud-accent-cyan) 42%, transparent);
    transform: translateX(16px);
  }

  .pax-settings-toggle-row__copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .pax-settings-toggle-row__label {
    min-width: 0;
    overflow: hidden;
    color: var(--hud-text);
    font-size: calc(0.74rem * var(--hud-type-scale, 1));
    font-weight: 800;
    letter-spacing: 0.05em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .pax-settings-toggle-row__description {
    min-width: 0;
    overflow: hidden;
    color: var(--hud-text-dim);
    font-family: var(--hud-font-copy);
    font-size: calc(0.66rem * var(--hud-type-scale, 1));
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pax-settings-toggle-row__meta {
    color: var(--hud-accent-warm-strong);
    font-family: var(--hud-font-data);
    font-size: calc(0.68rem * var(--hud-data-scale, 1));
    font-weight: 800;
    white-space: nowrap;
  }
</style>
