<script lang="ts">
  import { Portal } from "@ark-ui/svelte/portal";
  import { Tooltip } from "@ark-ui/svelte/tooltip";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import { hudButton, hudTooltip } from "$lib/design-system/variants/hud";

  interface Props {
    icon: string;
    title: string;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    size?: number;
    class?: string;
    onclick?: () => void;
  }

  let {
    icon,
    title,
    active = false,
    danger = false,
    disabled = false,
    size = 17,
    class: className = "",
    onclick,
  }: Props = $props();

  const buttonClass = $derived(
    hudButton({
      intent: danger ? "danger" : active ? "selected" : "neutral",
      size: "icon",
      class: `${className} ${active ? "pf-hud-icon-button--active active" : ""} ${danger ? "pf-hud-icon-button--danger danger" : ""}`,
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
