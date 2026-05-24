<script lang="ts">
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import type { BottomCommandBarAction } from "./types";

  interface Props {
    items: BottomCommandBarAction[];
    class?: string;
  }

  let { items, class: className = "" }: Props = $props();
</script>

<nav class={`pf-bottom-command-bar ${className}`.trim()} aria-label="Bottom command controls">
  {#each items as item}
    <button
      type="button"
      class="pf-bottom-command-bar__button"
      class:pf-bottom-command-bar__button--active={item.active}
      disabled={item.disabled}
      title={item.title}
      aria-label={item.title}
      aria-pressed={item.active ? "true" : undefined}
      onclick={() => item.onClick()}
    >
      <HudIcon name={item.icon} size={23} />
      <span>{item.label}</span>
    </button>
  {/each}
</nav>
