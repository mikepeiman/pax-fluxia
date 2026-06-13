<script lang="ts">
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import HudIconButton from "./HudIconButton.svelte";
  import HudPanel from "./HudPanel.svelte";
  import { formatHudNumber, formatStarLabel } from "./viewModels";
  import type { SelectedStarViewModel } from "./types";

  interface Props {
    star: SelectedStarViewModel | null;
    onCenterStar: (starId: string) => void;
    onFitMap: () => void;
    onPreviousOwnedStar: () => void;
    onNextOwnedStar: () => void;
    canCycleOwnedStars?: boolean;
  }

  let {
    star,
    onCenterStar,
    onFitMap,
    onPreviousOwnedStar,
    onNextOwnedStar,
    canCycleOwnedStars = false,
  }: Props = $props();
</script>

<HudPanel title="Star View" eyebrow="Selection" class="pf-selected-star-panel">
  {#snippet actions()}
    <HudIconButton
      icon="chevron-left"
      title="Previous owned star"
      disabled={!canCycleOwnedStars}
      onclick={onPreviousOwnedStar}
    />
    <HudIconButton
      icon="focus"
      title={star ? "Zoom selected star" : "Select an owned star first"}
      disabled={!star}
      onclick={() => {
        if (star) onCenterStar(star.id);
      }}
    />
    <HudIconButton
      icon="fit-view"
      title="Fit map"
      onclick={onFitMap}
    />
    <HudIconButton
      icon="chevron-right"
      title="Next owned star"
      disabled={!canCycleOwnedStars}
      onclick={onNextOwnedStar}
    />
  {/snippet}

  {#if star}
    <div class="pf-star-card">
      <div
        class="pf-star-card__type"
        style:--star-type-color={star.starType.color}
        style:--player-color={star.owner?.color ?? star.starType.color}
      >
        <span class="pf-star-card__orb">
          <HudIcon name={star.starType.icon} size={30} />
        </span>
      </div>

      <div class="pf-star-card__identity">
        <h3>{star.label}</h3>
        <span style:color={star.starType.color}>{star.starType.label}</span>
        <small>{star.owner ? (star.owner.isLocal ? "You" : star.owner.name) : star.source.ownerId}</small>
      </div>

      <div class="pf-star-card__metrics">
        <div class="pf-star-metric">
          <span><HudIcon name="paper-plane" size={13} /> Active</span>
          <strong class="font-hud-data">{formatHudNumber(star.activeShips)}</strong>
        </div>
        <div class="pf-star-metric">
          <span><HudIcon name="burst" size={13} /> Damaged</span>
          <strong class="font-hud-data">{formatHudNumber(star.damagedShips)}</strong>
        </div>
        <div class="pf-star-metric">
          <span><HudIcon name="economy" size={13} /> Production</span>
          <strong class="font-hud-data">{formatHudNumber(star.productionRate, 1)}</strong>
        </div>
        <div class="pf-star-metric">
          <span><HudIcon name="reset" size={13} /> Repair</span>
          <strong class="font-hud-data">{formatHudNumber(star.repairRate, 1)}%</strong>
        </div>
        <div class="pf-star-metric">
          <span><HudIcon name="route" size={13} /> Transfer</span>
          <strong class="font-hud-data">{formatHudNumber(star.transferRate, 1)}%</strong>
        </div>
        <div class="pf-star-metric">
          <span><HudIcon name="stopwatch" size={13} /> Activation</span>
          <strong class="font-hud-data">{formatHudNumber(star.activationRate, 1)}%</strong>
        </div>
      </div>

      {#if star.targetId || star.queuedOrderTargetId}
        <div class="pf-star-card__route">
          <span>Current target</span>
          <strong>{star.targetId ? formatStarLabel(star.targetId) : "None"}</strong>
          <span>Queued target</span>
          <strong>{star.queuedOrderTargetId ? formatStarLabel(star.queuedOrderTargetId) : "None"}</strong>
        </div>
      {/if}
    </div>
  {:else}
    <div class="pf-selected-star-panel__empty">
      <HudIcon name="grey" size={32} />
      <h3>Select a star</h3>
      <p>Click a star on the map to inspect ships, type, owner, and current route state.</p>
    </div>
  {/if}
</HudPanel>
