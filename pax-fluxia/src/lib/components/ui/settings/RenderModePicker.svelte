<script lang="ts">
  /**
   * Render-mode picker — replaces the plain <select> that hid six visually
   * distinct renderers behind a dropdown showing only their names.
   *
   * The render-mode buttons were removed from the topbar permanently, so this
   * IS the place a player chooses how territory is drawn. That makes "clear"
   * a requirement, not a nicety: every tile paints a miniature of what the mode
   * actually renders — flat owner regions, glowing boundaries, particle
   * lattice, smooth influence field, gradient grid, bare starfield — so the
   * choice is made by looking, not by reading jargon.
   *
   * The previews are CSS gradients rather than screenshots: they re-tint with
   * the theme, stay crisp at any zoom, and cost nothing to ship.
   */
  import type { ResolvedTerritoryRenderModeOption } from "$lib/territory/ui/territoryRenderModeCatalog";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import PaxInfoHint from "$lib/design-system/components/PaxInfoHint.svelte";

  interface Props {
    value: string;
    options: ResolvedTerritoryRenderModeOption[];
    label?: string;
    hint?: string;
    onValueChange: (value: string) => void;
  }

  let {
    value,
    options,
    label = "Render mode",
    hint,
    onValueChange,
  }: Props = $props();

  const active = $derived(options.find((option) => option.id === value) ?? null);
</script>

<div class="pf-render-modes">
  <div class="pf-render-modes__head">
    <span class="pf-render-modes__label">
      {label}
      {#if hint}<PaxInfoHint text={hint} />{/if}
    </span>
  </div>

  <div class="pf-render-modes__grid" role="radiogroup" aria-label={label}>
    {#each options as option (option.id)}
      <button
        type="button"
        role="radio"
        class="pf-render-mode"
        class:pf-render-mode--active={option.id === value}
        aria-checked={option.id === value}
        disabled={!option.selectable}
        title={option.disabledReason ?? option.shortDescription ?? option.label}
        onclick={() => onValueChange(option.id)}
      >
        <span class="pf-render-mode__preview" data-mode={option.id} aria-hidden="true">
          {#if option.id === value}
            <span class="pf-render-mode__check"><HudIcon name="check" size={12} /></span>
          {/if}
        </span>
        <span class="pf-render-mode__label">{option.shortLabel}</span>
      </button>
    {/each}
  </div>

  {#if active}
    <p class="pf-render-modes__desc">
      <strong>{active.label}</strong>
      {#if active.shortDescription}— {active.shortDescription}{/if}
    </p>
  {/if}
</div>

<style>
  .pf-render-modes {
    display: grid;
    gap: var(--pax-gap-sm);
    min-width: 0;
  }

  .pf-render-modes__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pax-gap-sm);
  }

  .pf-render-modes__label {
    display: inline-flex;
    align-items: center;
    gap: var(--pax-space-1);
    color: var(--pax-ui-text-muted);
    font-family: var(--pax-ui-font-label);
    font-size: var(--pax-type-3xs);
    font-weight: var(--pax-weight-extrabold);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .pf-render-modes__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--pax-gap-xs);
  }

  .pf-render-mode {
    display: grid;
    gap: 7px;
    min-width: 0;
    padding: 6px;
    cursor: pointer;
    background: var(--pax-ui-button-bg);
    border: 1px solid var(--pax-ui-border);
    border-radius: var(--pax-ui-radius-sm);
    transition:
      border-color var(--pax-ui-motion-fast),
      box-shadow var(--pax-ui-motion-fast),
      transform var(--pax-ui-motion-fast);
  }

  .pf-render-mode:hover:not(:disabled) {
    border-color: var(--pax-ui-border-strong);
    transform: translateY(-1px);
  }

  .pf-render-mode:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  .pf-render-mode--active {
    border-color: var(--pax-ui-accent);
    box-shadow:
      inset 0 0 0 1px var(--pax-ui-accent),
      0 0 16px color-mix(in srgb, var(--pax-ui-accent) 30%, transparent);
  }

  .pf-render-mode:focus-visible {
    outline: 2px solid var(--pax-ui-accent-strong);
    outline-offset: 2px;
  }

  .pf-render-mode__preview {
    position: relative;
    display: block;
    height: 42px;
    overflow: hidden;
    border-radius: var(--pax-ui-radius-xs);
    /* The previews stand for what the MAP looks like, so they keep the map's
       own dark ground on every theme — including the light one, where a white
       preview would show nothing at all. */
    background: #0a0e1a;
  }

  .pf-render-mode__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    color: var(--pax-ui-text-muted);
    font-size: var(--pax-type-3xs);
    font-weight: var(--pax-weight-semibold);
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
  }

  .pf-render-mode--active .pf-render-mode__label {
    color: var(--pax-ui-accent-strong);
    font-weight: var(--pax-weight-extrabold);
  }

  .pf-render-mode__check {
    position: absolute;
    top: 3px;
    right: 3px;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: var(--pax-ui-accent);
    color: var(--pax-color-void);
    box-shadow: 0 0 10px color-mix(in srgb, var(--pax-ui-accent) 60%, transparent);
  }

  /* ---- one treatment per mode, each showing what that renderer draws ---- */

  /* Power Vector: flat filled regions meeting at crisp owner borders. */
  .pf-render-mode__preview[data-mode="power_vector"] {
    background: linear-gradient(118deg, #4aa3ff 0 46%, #ff9a4a 46% 74%, #34e0a0 74% 100%);
  }

  /* Phase Edges: only the boundaries are drawn, and they glow. */
  .pf-render-mode__preview[data-mode="phase_edges"] {
    background:
      linear-gradient(118deg, transparent 44%, #6fe6ff 44.5% 47%, transparent 47.5%),
      linear-gradient(118deg, transparent 72%, #ffb36b 72.5% 75%, transparent 75.5%),
      #0a0e1a;
    box-shadow: inset 0 0 12px rgba(111, 230, 255, 0.35);
  }

  /* Ember Lattice: a dense particle lattice standing in for the regions. */
  .pf-render-mode__preview[data-mode="ember_lattice"] {
    background:
      radial-gradient(circle 1.4px at 22% 30%, #6fe6ff 60%, transparent),
      radial-gradient(circle 1.4px at 44% 62%, #4aa3ff 60%, transparent),
      radial-gradient(circle 1.4px at 68% 28%, #ff9a4a 60%, transparent),
      radial-gradient(circle 1.4px at 78% 66%, #34e0a0 60%, transparent),
      radial-gradient(circle 1.4px at 34% 80%, #b16bff 60%, transparent),
      radial-gradient(circle 1.4px at 60% 46%, #ffc24a 60%, transparent),
      #0a0e1a;
  }

  /* Phase Field: smooth influence falloff, no hard edge anywhere. */
  .pf-render-mode__preview[data-mode="phase_field"] {
    background:
      radial-gradient(circle at 28% 36%, rgba(74, 163, 255, 0.9), transparent 58%),
      radial-gradient(circle at 72% 62%, rgba(255, 154, 74, 0.85), transparent 58%),
      radial-gradient(circle at 54% 24%, rgba(52, 224, 160, 0.8), transparent 55%),
      #0a0e1a;
    filter: saturate(1.1);
  }

  /* Grid Gradient: a gradient fill sampled on a visible grid. */
  .pf-render-mode__preview[data-mode="grid_gradient"] {
    background:
      repeating-linear-gradient(0deg, transparent 0 5px, rgba(255, 255, 255, 0.06) 5px 6px),
      repeating-linear-gradient(90deg, transparent 0 5px, rgba(255, 255, 255, 0.06) 5px 6px),
      linear-gradient(118deg, #b16bff, #4aa3ff 55%, #34e0a0);
  }

  /* Off: no overlay at all — bare starfield. */
  .pf-render-mode__preview[data-mode="none"] {
    background:
      radial-gradient(circle 1px at 30% 40%, rgba(255, 255, 255, 0.5), transparent),
      radial-gradient(circle 1px at 62% 66%, rgba(255, 255, 255, 0.35), transparent),
      radial-gradient(circle 1px at 78% 30%, rgba(255, 255, 255, 0.4), transparent),
      #0a0e1a;
  }

  .pf-render-modes__desc {
    margin: 0;
    color: var(--pax-ui-text-soft);
    font-size: var(--pax-type-2xs);
    line-height: 1.4;
  }

  .pf-render-modes__desc strong {
    color: var(--pax-ui-accent-strong);
  }

  @media (prefers-reduced-motion: reduce) {
    .pf-render-mode {
      transition: none;
    }
    .pf-render-mode:hover:not(:disabled) {
      transform: none;
    }
  }
</style>
