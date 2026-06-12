<script lang="ts">
  import { hud } from './state/hud-state.svelte';
  import Icon from './primitives/Icon.svelte';

  const buttons = [
    { icon: 'search', label: 'Find star', fn: () => hud.openSearch() },
    { icon: 'minus', label: 'Zoom out', fn: () => hud.zoomOut() },
  ];
</script>

<div class="pointer-events-auto relative">
  <div class="hud-frame bevel" style="--bv: 9px; --panel-bv: 9px">
    <div class="hud-plate bevel flex h-10 items-center gap-0.5 px-1.5">
      {#each buttons as b (b.icon)}
        <button
          type="button"
          class="grid size-7 place-items-center text-text-dim transition-colors hover:text-gold-3"
          aria-label={b.label}
          title={b.label}
          onclick={b.fn}
        >
          <Icon name={b.icon} size={14} />
        </button>
      {/each}
      <span class="hud-num w-12 text-center text-[11px] font-semibold text-text select-none">
        {Math.round(hud.zoom * 100)}%
      </span>
      <button
        type="button"
        class="grid size-7 place-items-center text-text-dim transition-colors hover:text-gold-3"
        aria-label="Zoom in"
        title="Zoom in"
        onclick={() => hud.zoomIn()}
      >
        <Icon name="plus" size={14} />
      </button>
      <span class="mx-0.5 h-4 w-px bg-gold-0" aria-hidden="true"></span>
      <button
        type="button"
        class="grid size-7 place-items-center text-text-dim transition-colors hover:text-teal-2"
        aria-label="Recenter map"
        title="Recenter map"
        onclick={() => hud.recenter()}
      >
        <Icon name="locate" size={14} />
      </button>
    </div>
  </div>
</div>
