<script lang="ts">
  // Small inline "i" info trigger that reveals help text in a portal-safe
  // tooltip on hover/focus. Use this to keep explanatory copy OUT of the
  // always-visible settings flow (one canonical pattern for every panel).
  // Portal-based (via PaxHudTooltip) so it is never clipped by a card's
  // clip-path/overflow.
  import PaxHudTooltip from "./PaxHudTooltip.svelte";

  interface Props {
    /** Help text shown in the tooltip. */
    text: string;
    placement?: "top" | "right" | "bottom" | "left";
    class?: string;
  }

  let { text, placement = "top", class: className = "" }: Props = $props();
</script>

<PaxHudTooltip
  label={text}
  {placement}
  class={`pax-info-hint ${className}`.trim()}
>
  <span class="pax-info-hint__glyph">i</span>
</PaxHudTooltip>

<style>
  /* The trigger element is rendered by PaxHudTooltip, so target it globally. */
  :global(button.pax-info-hint) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--pax-ui-text-soft) 36%, transparent);
    border-radius: 999px;
    background: transparent;
    color: var(--pax-ui-text-dim);
    cursor: help;
    flex: 0 0 auto;
    transition:
      color var(--pax-motion-fast, 150ms ease),
      border-color var(--pax-motion-fast, 150ms ease);
  }

  :global(button.pax-info-hint:hover),
  :global(button.pax-info-hint:focus-visible) {
    color: var(--pax-ui-text);
    border-color: color-mix(in srgb, var(--pax-ui-accent) 58%, transparent);
  }

  .pax-info-hint__glyph {
    font-family: var(--pax-ui-font-ui);
    font-size: 9px;
    font-weight: var(--pax-weight-bold);
    font-style: italic;
    line-height: 1;
  }
</style>
