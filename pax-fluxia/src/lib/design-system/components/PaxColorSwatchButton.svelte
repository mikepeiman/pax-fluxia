<script lang="ts">
  interface Props {
    color: string;
    label: string;
    meta?: string;
    selected?: boolean;
    disabled?: boolean;
    title?: string;
    class?: string;
    onclick?: () => void;
  }

  let {
    color,
    label,
    meta,
    selected = false,
    disabled = false,
    title,
    class: className = "",
    onclick,
  }: Props = $props();
</script>

<button
  type="button"
  class={`pax-color-swatch-button ${className}`}
  class:pax-color-swatch-button--selected={selected}
  {disabled}
  title={title ?? label}
  aria-label={title ?? label}
  aria-pressed={selected}
  style={`--pax-swatch-color: ${color}`}
  onclick={() => onclick?.()}
>
  <span class="pax-color-swatch-button__swatch" aria-hidden="true"></span>
  <span class="pax-color-swatch-button__label">{label}</span>
  {#if meta}
    <span class="pax-color-swatch-button__meta">{meta}</span>
  {/if}
</button>

<style>
  .pax-color-swatch-button {
    min-width: 0;
    display: grid;
    justify-items: center;
    gap: 5px;
    padding: 8px 6px;
    border: 1px solid transparent;
    border-radius: var(--pax-ui-radius-sm);
    clip-path: var(--pax-ui-rounded-corner-sm);
    background:
      linear-gradient(180deg, rgba(0, 18, 21, 0.78), rgba(0, 10, 13, 0.92)) padding-box,
      var(--pax-ui-control-border-gradient) border-box;
    color: var(--pax-ui-text);
    cursor: pointer;
    font-family: var(--pax-ui-font-ui);
    transition:
      background var(--pax-motion-fast, 150ms ease),
      box-shadow var(--pax-motion-fast, 150ms ease),
      transform var(--pax-motion-fast, 150ms ease);
  }

  .pax-color-swatch-button:hover {
    background:
      linear-gradient(180deg, rgba(28, 26, 16, 0.88), rgba(3, 26, 30, 0.94)) padding-box,
      var(--pax-ui-border-gradient) border-box;
    transform: translateY(-1px);
  }

  .pax-color-swatch-button--selected {
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--pax-ui-accent-warm) 18%, transparent),
      0 0 16px color-mix(in srgb, var(--pax-swatch-color) 30%, transparent);
  }

  .pax-color-swatch-button:disabled {
    cursor: not-allowed;
    opacity: 0.44;
    transform: none;
  }

  .pax-color-swatch-button__swatch {
    width: 24px;
    height: 24px;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text) 28%, transparent);
    border-radius: 999px;
    background: var(--pax-swatch-color);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--pax-swatch-color) 12%, transparent),
      0 0 14px color-mix(in srgb, var(--pax-swatch-color) 42%, transparent);
  }

  .pax-color-swatch-button__label,
  .pax-color-swatch-button__meta {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pax-color-swatch-button__label {
    color: var(--pax-ui-text);
    font-size: calc(0.68rem * var(--pax-ui-type-scale, 1));
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .pax-color-swatch-button__meta {
    color: var(--pax-ui-text-soft);
    font-family: var(--pax-ui-font-data);
    font-size: calc(0.62rem * var(--pax-ui-data-scale, 1));
    font-weight: 700;
  }
</style>
