<script lang="ts">
  import { PaxHudIconButton } from "$lib/design-system";

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

<PaxHudIconButton
  {icon}
  {title}
  {active}
  {danger}
  {disabled}
  {size}
  class={`pf-hud-icon-button ${className}`}
  {onclick}
/>
