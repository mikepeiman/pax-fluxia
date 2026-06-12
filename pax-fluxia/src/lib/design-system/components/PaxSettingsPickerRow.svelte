<script lang="ts">
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

  export interface PaxSettingsPickerOption {
    value: string;
    label: string;
    meta?: string;
    disabled?: boolean;
  }

  interface Props {
    label: string;
    value: string;
    selectedLabel?: string;
    options: PaxSettingsPickerOption[];
    open?: boolean;
    disabled?: boolean;
    description?: string;
    settingConfigKey?: string;
    settingLabel?: string;
    class?: string;
    onToggle: () => void;
    onSelect: (value: string) => void;
    onPreview?: (value: string) => void;
  }

  let {
    label,
    value,
    selectedLabel,
    options,
    open = false,
    disabled = false,
    description,
    settingConfigKey,
    settingLabel,
    class: className = "",
    onToggle,
    onSelect,
    onPreview,
  }: Props = $props();
</script>

<div
  class={`pax-settings-picker-row ${className}`}
  class:pax-settings-picker-row--open={open}
  class:pax-settings-picker-row--disabled={disabled}
  data-setting-config-key={settingConfigKey}
  data-setting-label={settingLabel ?? label}
  data-setting-description={description}
>
  <span class="pax-settings-picker-row__label">{label}</span>
  <button
    type="button"
    class="pax-settings-picker-row__trigger"
    disabled={disabled}
    aria-expanded={open}
    aria-label={settingLabel ?? label}
    onclick={() => onToggle()}
  >
    <span class="pax-settings-picker-row__value">{selectedLabel ?? value}</span>
    <span class="pax-settings-picker-row__chevron" aria-hidden="true">
      <HudIcon name={open ? "chevron-up" : "chevron-down"} size={12} />
    </span>
  </button>

  {#if open}
    <div class="pax-settings-picker-row__menu" role="listbox">
      {#each options as option}
        <div
          class="pax-settings-picker-row__option"
          class:pax-settings-picker-row__option--selected={option.value === value}
          class:pax-settings-picker-row__option--disabled={option.disabled}
          role="option"
          aria-selected={option.value === value}
        >
          <button
            type="button"
            class="pax-settings-picker-row__option-main"
            disabled={disabled || option.disabled}
            onclick={() => onSelect(option.value)}
          >
            <span class="pax-settings-picker-row__option-label">{option.label}</span>
            {#if option.meta}
              <span class="pax-settings-picker-row__option-meta">{option.meta}</span>
            {/if}
          </button>
          {#if onPreview}
            <button
              type="button"
              class="pax-settings-picker-row__preview"
              disabled={disabled || option.disabled}
              title={`Preview ${option.label}`}
              aria-label={`Preview ${option.label}`}
              onclick={(event) => {
                event.stopPropagation();
                onPreview?.(option.value);
              }}
            >
              <HudIcon name="play-1" size={13} />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .pax-settings-picker-row {
    position: relative;
    min-width: 0;
    display: grid;
    gap: 7px;
    padding: 10px;
    border: 1px solid transparent;
    border-radius: var(--hud-radius-sm);
    clip-path: var(--hud-rounded-corner-sm);
    background:
      linear-gradient(180deg, rgba(0, 18, 21, 0.78), rgba(0, 10, 13, 0.9)) padding-box,
      var(--hud-control-border-gradient) border-box;
    color: var(--hud-text);
    font-family: var(--hud-font-ui);
  }

  .pax-settings-picker-row--disabled {
    opacity: 0.42;
  }

  .pax-settings-picker-row__label {
    overflow: hidden;
    color: var(--hud-text-soft);
    font-size: calc(0.7rem * var(--hud-type-scale, 1));
    font-weight: 800;
    letter-spacing: 0.08em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .pax-settings-picker-row__trigger {
    width: 100%;
    min-width: 0;
    min-height: 34px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 6px 9px;
    border: 1px solid transparent;
    border-radius: var(--hud-radius-xs);
    background:
      linear-gradient(180deg, rgba(0, 21, 25, 0.9), rgba(0, 11, 14, 0.96)) padding-box,
      var(--hud-control-border-gradient) border-box;
    color: var(--hud-text);
    cursor: pointer;
    font: inherit;
  }

  .pax-settings-picker-row__trigger:disabled {
    cursor: not-allowed;
  }

  .pax-settings-picker-row__value {
    min-width: 0;
    overflow: hidden;
    color: var(--hud-text);
    font-family: var(--hud-font-data);
    font-size: calc(0.72rem * var(--hud-data-scale, 1));
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pax-settings-picker-row__chevron {
    color: var(--hud-accent-warm-strong);
    font-size: 0.6rem;
    line-height: 1;
  }

  .pax-settings-picker-row__menu {
    position: absolute;
    top: calc(100% - 2px);
    left: 10px;
    right: 10px;
    z-index: 120;
    max-height: 184px;
    overflow-y: auto;
    padding: 5px;
    border: 1px solid transparent;
    border-radius: var(--hud-radius-sm);
    background:
      linear-gradient(180deg, rgba(0, 17, 20, 0.98), rgba(0, 8, 10, 0.98)) padding-box,
      var(--hud-border-gradient) border-box;
    box-shadow: var(--hud-shadow-panel);
  }

  .pax-settings-picker-row__option {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center;
  }

  .pax-settings-picker-row__option + .pax-settings-picker-row__option {
    margin-top: 4px;
  }

  .pax-settings-picker-row__option-main,
  .pax-settings-picker-row__preview {
    border: 1px solid color-mix(in srgb, var(--hud-accent-warm) 22%, transparent);
    border-radius: var(--hud-radius-xs);
    background: rgba(0, 18, 21, 0.74);
    color: var(--hud-text-dim);
    cursor: pointer;
    font: inherit;
  }

  .pax-settings-picker-row__option-main {
    min-width: 0;
    min-height: 30px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 5px 7px;
    text-align: left;
  }

  .pax-settings-picker-row__option-main:hover,
  .pax-settings-picker-row__preview:hover {
    border-color: color-mix(in srgb, var(--hud-accent-cyan) 48%, transparent);
    color: var(--hud-text);
  }

  .pax-settings-picker-row__option--selected .pax-settings-picker-row__option-main {
    border-color: color-mix(in srgb, var(--hud-accent-warm) 65%, transparent);
    color: var(--hud-accent-warm-strong);
    box-shadow: 0 0 14px color-mix(in srgb, var(--hud-accent-warm) 16%, transparent);
  }

  .pax-settings-picker-row__option-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pax-settings-picker-row__option-meta {
    color: var(--hud-text-muted);
    font-size: calc(0.62rem * var(--hud-type-scale, 1));
    text-transform: uppercase;
    white-space: nowrap;
  }

  .pax-settings-picker-row__preview {
    width: 30px;
    min-height: 30px;
    color: var(--hud-accent-cyan);
  }
</style>
