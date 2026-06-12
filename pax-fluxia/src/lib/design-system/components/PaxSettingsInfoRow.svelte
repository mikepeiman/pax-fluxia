<script lang="ts">
  interface Props {
    label: string;
    value?: string | number | null;
    valueAlign?: "left" | "right";
    class?: string;
  }

  let {
    label,
    value = null,
    valueAlign = "right",
    class: className = "",
  }: Props = $props();
</script>

<div
  class={`pax-settings-info-row ${className}`}
  class:pax-settings-info-row--value-left={valueAlign === "left"}
>
  <span class="pax-settings-info-row__label">{label}</span>
  <strong class="pax-settings-info-row__value">{value ?? ""}</strong>
</div>

<style>
  .pax-settings-info-row {
    min-width: 0;
    min-height: 40px;
    display: grid;
    grid-template-columns: minmax(88px, 0.42fr) minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    border: 1px solid transparent;
    border-radius: var(--hud-radius-xs);
    clip-path: var(--hud-rounded-corner-xs);
    background:
      linear-gradient(180deg, rgba(0, 18, 21, 0.86), rgba(0, 10, 13, 0.94)) padding-box,
      var(--hud-control-border-gradient) border-box;
    color: var(--hud-text-soft);
    font-family: var(--hud-font-ui);
  }

  .pax-settings-info-row__label {
    min-width: 0;
    overflow: hidden;
    color: var(--hud-text-soft);
    font-size: calc(0.74rem * var(--hud-type-scale, 1));
    font-weight: 700;
    letter-spacing: 0.04em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pax-settings-info-row__value {
    min-width: 0;
    overflow: hidden;
    color: var(--hud-accent-warm-strong);
    font-family: var(--hud-font-data);
    font-size: calc(0.72rem * var(--hud-data-scale, 1));
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pax-settings-info-row--value-left .pax-settings-info-row__value {
    text-align: left;
  }
</style>
