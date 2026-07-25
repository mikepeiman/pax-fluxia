<script lang="ts">
  import type { Snippet } from "svelte";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import { hudButton, type HudButtonVariants } from "$lib/design-system/variants/hud";

  interface Props {
    label?: string;
    icon?: string;
    title?: string;
    intent?: HudButtonVariants["intent"];
    size?: HudButtonVariants["size"];
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    pressed?: boolean;
    iconSize?: number;
    accentId?: string;
    style?: string;
    class?: string;
    onclick?: () => void;
    children?: Snippet;
  }

  let {
    label,
    icon,
    title,
    intent = "neutral",
    size = "md",
    active = false,
    danger = false,
    disabled = false,
    pressed,
    iconSize = 17,
    accentId,
    style,
    class: className = "",
    onclick,
    children,
  }: Props = $props();

  const buttonClass = $derived(
    hudButton({
      intent: danger ? "danger" : active ? "selected" : intent,
      size,
      class: className,
    }),
  );
</script>

<button
  type="button"
  class={`pax-hud-btn ${buttonClass}`}
  class:active={active}
  {style}
  {disabled}
  data-accent-id={accentId}
  title={title ?? label}
  aria-label={title ?? label}
  aria-pressed={pressed ?? (active ? "true" : undefined)}
  onclick={() => onclick?.()}
>
  {#if icon}
    <HudIcon name={icon} size={iconSize} />
  {/if}
  {#if label}
    <span>{label}</span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  /* Horizontal padding lives here, not on a Tailwind px-* utility: utilities sit
     in @layer utilities and were losing to unlayered rules, so the label ended up
     flush against the border. Scoped component CSS is unlayered and always wins. */
  .pax-hud-btn { padding-inline: var(--pax-btn-pad-x, 1.15rem); }
  :global(.pax-hud-btn.h-8) { --pax-btn-pad-x: 0.95rem; }
  :global(.pax-hud-btn.h-12) { --pax-btn-pad-x: 1.5rem; }
  /* icon-only buttons stay square */
  :global(.pax-hud-btn.w-9) { --pax-btn-pad-x: 0; }
</style>
