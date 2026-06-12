<script lang="ts">
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import { hudButton } from "$lib/design-system";

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
      class: `pf-hud-icon-button ${className}`,
    }),
  );
</script>

<button
  type="button"
  class={buttonClass}
  class:pf-hud-icon-button--active={active}
  class:pf-hud-icon-button--danger={danger}
  {disabled}
  {title}
  aria-label={title}
  onclick={() => onclick?.()}
>
  <HudIcon name={icon} {size} />
</button>
