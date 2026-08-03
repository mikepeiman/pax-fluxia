<script lang="ts">
  import { ToggleGroup } from "@ark-ui/svelte/toggle-group";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import {
    hudSegmentedControl,
    type HudSegmentedControlVariants,
  } from "$lib/design-system/variants/hud";

  export interface PaxHudSegmentedOption {
    value: string;
    label: string;
    icon?: string;
    title?: string;
    disabled?: boolean;
    /**
     * Per-option accent (any CSS colour, usually a `var(--pax-ui-speed-*)`).
     * Lets a segment carry SEMANTIC meaning — game speed reads as a colour ramp
     * from calm to urgent, not five identical buttons distinguished by position.
     * Omitted options fall back to the control's normal active styling.
     */
    tone?: string;
  }

  interface Props {
    value: string;
    options: PaxHudSegmentedOption[];
    ariaLabel: string;
    density?: HudSegmentedControlVariants["density"];
    iconSize?: number;
    class?: string;
    onValueChange: (value: string) => void;
  }

  let {
    value,
    options,
    ariaLabel,
    density = "balanced",
    iconSize = 15,
    class: className = "",
    onValueChange,
  }: Props = $props();

  const styles = $derived(hudSegmentedControl({ density }));

  function handleValueChange(details: { value: string[] }) {
    const nextValue = details.value[0];
    if (nextValue != null && nextValue !== value) {
      onValueChange(nextValue);
    }
  }
</script>

<ToggleGroup.Root
  value={[value]}
  onValueChange={handleValueChange}
  class={styles.root({ class: className })}
  aria-label={ariaLabel}
>
  {#each options as option}
    <ToggleGroup.Item
      value={option.value}
      disabled={option.disabled}
      title={option.title ?? option.label}
      aria-label={option.title ?? option.label}
      class={`pax-hud-segment ${styles.item()}`}
      style={option.tone ? `--pax-segment-tone: ${option.tone}` : undefined}
      data-toned={option.tone ? "" : undefined}
    >
      {#if option.icon}
        <HudIcon name={option.icon} size={iconSize} />
      {/if}
      <span>{option.label}</span>
    </ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>

<style>
  /* Icon and label have to sit on ONE optical baseline. The icon is an SVG
     block box whose glyph is centred in its viewBox, while the label is a text
     line box with ascender/descender space — matching their heights is what
     stops the pairing looking a pixel off, which it did on every toggle.
     Padding lives here, not on the Tailwind `px-*` utility: those sit in
     `@layer utilities` and lose the cascade to unlayered CSS, so they computed
     to 0 and the labels sat flush against the border. */
  /* All :global — the class rides on a child component (ToggleGroup.Item), so
     Svelte's scoping class never reaches the rendered element. */
  :global(.pax-hud-segment) {
    padding-inline: var(--pax-segment-pad-x, 0.85rem);
    line-height: 1;
  }
  :global(.pax-hud-segment svg) {
    display: block;
    flex-shrink: 0;
  }
  :global(.pax-hud-segment > span) {
    display: inline-flex;
    align-items: center;
    line-height: 1;
    /* Uppercase tracking adds a trailing space after the last letter; pulling it
       back re-centres the label against the icon. */
    margin-right: -0.08em;
  }
  :global(.pax-hud-segment.h-8) { --pax-segment-pad-x: 0.7rem; }
  :global(.pax-hud-segment.h-9) { --pax-segment-pad-x: 0.9rem; }
</style>
