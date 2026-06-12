<script lang="ts">
  import { PaxHudButton } from "$lib/design-system";
  import type { BottomCommandBarAction } from "./types";

  interface Props {
    items: BottomCommandBarAction[];
    class?: string;
  }

  let { items, class: className = "" }: Props = $props();
</script>

<nav class={`pf-bottom-command-bar ${className}`.trim()} aria-label="Bottom command controls">
  {#each items as item}
    <PaxHudButton
      icon={item.icon}
      label={item.label}
      title={item.title}
      active={item.active}
      disabled={item.disabled}
      pressed={item.active}
      size="lg"
      iconSize={23}
      class="pf-bottom-command-bar__button"
      onclick={() => item.onClick()}
    />
  {/each}
</nav>
