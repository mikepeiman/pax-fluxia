<script lang="ts">
  import { hudField, type HudFieldVariants } from "$lib/design-system/variants/hud";

  interface SelectOption {
    value: string;
    label: string;
  }

  interface Props {
    value: string;
    options: SelectOption[];
    label?: string;
    /** Optional one-line explanation, shown via a hover `?` instead of inline prose. */
    hint?: string;
    ariaLabel?: string;
    placeholder?: string;
    size?: HudFieldVariants["size"];
    disabled?: boolean;
    class?: string;
    onValueChange: (value: string) => void;
  }

  let {
    value,
    options,
    label,
    hint,
    ariaLabel,
    placeholder,
    size = "md",
    disabled = false,
    class: className = "",
    onValueChange,
  }: Props = $props();

  const styles = $derived(hudField({ size }));
</script>

<label class={styles.label({ class: className })}>
  {#if label || hint}
    <span class={styles.labelText()}>
      {label}
      {#if hint}
        <span class="pax-hud-select__hint" data-hint={hint} aria-label={hint} role="note">?</span>
      {/if}
    </span>
  {/if}
  <select
    class={`${styles.input()} pax-hud-select__input`}
    {value}
    {disabled}
    aria-label={ariaLabel ?? label}
    onchange={(event) => onValueChange(event.currentTarget.value)}
  >
    {#if placeholder}
      <option value="">{placeholder}</option>
    {/if}
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>

<style>
  /* Native dropdown popup: force dark chrome + explicit option colors so the
     OS-rendered option list isn't light-text-on-light-popup (it inherits the
     dark select's light text but the browser default popup bg is light). */
  .pax-hud-select__input {
    color-scheme: dark;
  }
  .pax-hud-select__input option {
    background-color: var(--pax-ui-panel-bg-strong, #0b1220);
    color: var(--pax-ui-text, rgba(224, 232, 232, 0.95));
  }

  /* Hover `?` — keeps explanatory text out of the layout until wanted. */
  .pax-hud-select__hint {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    margin-left: 5px;
    border-radius: 999px;
    border: 1px solid var(--pax-ui-border, color-mix(in srgb, var(--pax-ui-accent-warm) 35%, transparent));
    font-size: var(--pax-type-3xs);
    font-weight: var(--pax-weight-bold);
    line-height: 1;
    color: var(--pax-ui-text-dim, color-mix(in srgb, var(--pax-ui-text-soft) 70%, transparent));
    cursor: help;
    position: relative;
    text-transform: none;
    letter-spacing: 0;
    vertical-align: middle;
  }

  .pax-hud-select__hint:hover {
    color: var(--pax-ui-accent, #55e7ef);
    border-color: var(--pax-ui-accent, #55e7ef);
  }

  .pax-hud-select__hint:hover::after {
    content: attr(data-hint);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    width: max-content;
    max-width: 220px;
    padding: var(--pax-gap-xs) var(--pax-space-2);
    background: var(--pax-ui-panel-bg-strong);
    border: 1px solid var(--pax-ui-border, color-mix(in srgb, var(--pax-ui-accent-warm) 35%, transparent));
    border-radius: 6px;
    color: var(--pax-ui-text, rgba(224, 232, 232, 0.95));
    font-size: var(--pax-type-2xs);
    font-weight: var(--pax-weight-regular);
    line-height: 1.35;
    white-space: normal;
    z-index: 60;
    box-shadow: 0 4px 16px color-mix(in srgb, var(--pax-color-void) 45%, transparent);
    pointer-events: none;
    opacity: 0;
    animation: paxHudSelectHintFade 120ms ease forwards;
  }

  @keyframes paxHudSelectHintFade {
    to {
      opacity: 1;
    }
  }
</style>
