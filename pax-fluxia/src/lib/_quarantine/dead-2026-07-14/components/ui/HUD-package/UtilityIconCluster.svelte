<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import IconButton from './IconButton.svelte';

  export let railSide: 'left' | 'right' = 'right';
  export let bottomMode: 'full' | 'compact' | 'hidden' = 'full';
  export let leftPanelCollapsed = false;
  export let tacticalRailCollapsed = false;
  export let floatingLegendOpen = true;

  const dispatch = createEventDispatcher();
</script>

<div class="flex items-center justify-end gap-2">
  <IconButton icon="⇄" label={`Swap rails. Tactical rail is ${railSide}.`} active={railSide === 'left'} on:click={() => dispatch('swap-rails')} />
  <IconButton icon="◨" label="Toggle utility panel" active={!leftPanelCollapsed} on:click={() => dispatch('toggle-left-panel')} />
  <IconButton icon="◧" label="Toggle tactical rail" active={!tacticalRailCollapsed} on:click={() => dispatch('toggle-tactical-rail')} />
  <IconButton icon="▤" label={`Cycle bottom dock. Current mode ${bottomMode}.`} active={bottomMode !== 'hidden'} on:click={() => dispatch('cycle-bottom-dock')} />
  <IconButton icon="◇" label="Toggle floating legend" active={floatingLegendOpen} on:click={() => dispatch('toggle-floating-legend')} />
  <IconButton icon="?" label="Help" />
  <IconButton icon="☰" label="Menu" />
</div>
