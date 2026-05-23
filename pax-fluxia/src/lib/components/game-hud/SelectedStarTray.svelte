<script lang="ts">
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import HudIconButton from "./HudIconButton.svelte";
  import { formatHudNumber, formatStarLabel } from "./viewModels";
  import type { SelectedStarViewModel } from "./types";

  interface Props {
    star: SelectedStarViewModel | null;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onCenterStar: (starId: string) => void;
    onFitMap: () => void;
    onCancelOrder: (starId: string) => void;
  }

  let {
    star,
    collapsed,
    onToggleCollapsed,
    onCenterStar,
    onFitMap,
    onCancelOrder,
  }: Props = $props();
</script>

{#if star}
  <section
    class="pf-selected-star-tray"
    class:pf-selected-star-tray--collapsed={collapsed}
    style={`--star-type-color:${star.starType.color}; --player-color:${star.owner?.color ?? star.starType.color};`}
    aria-label="Selected star tray"
  >
    <div class="pf-selected-star-tray__identity">
      <span class="pf-selected-star-tray__orb"><HudIcon name={star.starType.icon} size={22} /></span>
      <div>
        <span class="pf-selected-star-tray__label">Selected Star</span>
        <strong>{star.label}</strong>
      </div>
      <span class="pf-selected-star-tray__ships font-hud-data">
        {formatHudNumber(star.activeShips)}
      </span>
    </div>

    {#if !collapsed}
      <div class="pf-selected-star-tray__hint">
        {#if star.targetId}
          Routing to {formatStarLabel(star.targetId)}
        {:else}
          Click a connected star to assign a route.
        {/if}
      </div>

      <div class="pf-selected-star-tray__actions">
        <HudIconButton icon="fit" title="Center selected star" onclick={() => onCenterStar(star.id)} />
        <HudIconButton icon="topology" title="Fit full map" onclick={onFitMap} />
        {#if star.targetId}
          <HudIconButton
            icon="close"
            title="Cancel current route"
            danger
            onclick={() => onCancelOrder(star.id)}
          />
        {/if}
      </div>
    {/if}

    <button
      type="button"
      class="pf-selected-star-tray__collapse"
      title={collapsed ? "Expand selected star tray" : "Collapse selected star tray"}
      aria-label={collapsed ? "Expand selected star tray" : "Collapse selected star tray"}
      onclick={onToggleCollapsed}
    >
      <HudIcon name={collapsed ? "chevron-up" : "chevron-down"} size={15} />
    </button>
  </section>
{/if}
