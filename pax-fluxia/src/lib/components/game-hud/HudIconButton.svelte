<script lang="ts">
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

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
</script>

<button
  type="button"
  class={`pf-hud-icon-button ${className}`}
  class:pf-hud-icon-button--active={active}
  class:pf-hud-icon-button--danger={danger}
  {disabled}
  {title}
  aria-label={title}
  onclick={() => onclick?.()}
>
  <HudIcon name={icon} {size} />
</button>
