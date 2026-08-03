<script lang="ts">
  import { Portal } from "@ark-ui/svelte/portal";
  import { Tooltip } from "@ark-ui/svelte/tooltip";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import { hudButton, hudTooltip } from "$lib/design-system/variants/hud";

  interface Props {
    icon: string;
    title: string;
    active?: boolean;
    accent?: boolean;
    danger?: boolean;
    disabled?: boolean;
    /** Glyph size in px. */
    size?: number;
    /**
     * Button footprint. `compact` (28px) is for crowded action clusters — a
     * five-button header beside a title does not fit a narrow rail at 36px.
     */
    density?: "comfortable" | "compact";
    class?: string;
    onclick?: () => void;
  }

  let {
    icon,
    title,
    active = false,
    accent = false,
    danger = false,
    disabled = false,
    size = 17,
    density = "comfortable",
    class: className = "",
    onclick,
  }: Props = $props();

  const buttonClass = $derived(
    hudButton({
      intent: danger ? "danger" : active ? "selected" : accent ? "primary" : "neutral",
      size: density === "compact" ? "icon-sm" : "icon",
      class: `${className} ${active ? "pf-hud-icon-button--active active" : ""} ${accent ? "pf-hud-icon-button--accent" : ""} ${danger ? "pf-hud-icon-button--danger danger" : ""}`,
    }),
  );
</script>

<Tooltip.Root openDelay={100} closeDelay={50} positioning={{ placement: "top", gutter: 10 }}>
  <Tooltip.Trigger
    class={buttonClass}
    {disabled}
    aria-label={title}
    aria-pressed={active ? "true" : undefined}
    onclick={() => onclick?.()}
  >
    <HudIcon name={icon} {size} />
  </Tooltip.Trigger>
  <Portal>
    <Tooltip.Positioner>
      <Tooltip.Content class={hudTooltip()}>{title}</Tooltip.Content>
    </Tooltip.Positioner>
  </Portal>
</Tooltip.Root>
