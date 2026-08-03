<script lang="ts">
  import { PaxHudIconButton } from "$lib/design-system";

  interface Props {
    icon: string;
    title: string;
    active?: boolean;
    accent?: boolean;
    danger?: boolean;
    disabled?: boolean;
    size?: number;
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

</script>

<PaxHudIconButton
  {icon}
  {title}
  {active}
  {accent}
  {danger}
  {disabled}
  {size}
  {density}
  class={`pf-hud-icon-button ${className}`}
  {onclick}
/>
