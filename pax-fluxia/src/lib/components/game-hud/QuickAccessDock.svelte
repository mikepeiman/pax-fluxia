<script lang="ts">
  import HudIconButton from "./HudIconButton.svelte";
  import type { QuickAccessAction } from "./types";

  interface Props {
    actions: QuickAccessAction[];
    class?: string;
  }

  let { actions, class: className = "" }: Props = $props();
</script>

<nav class={`pf-quick-access-dock ${className}`} aria-label="Quick access">
  {#each actions as action}
    <HudIconButton
      icon={action.icon}
      title={action.title}
      active={action.active}
      danger={action.danger}
      onclick={action.onClick}
    />
  {/each}
</nav>
