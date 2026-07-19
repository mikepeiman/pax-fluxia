<script lang="ts">
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import { PaxHudIconButton, PaxHudPanel, PaxHudSegmentedControl, type PaxHudSegmentedOption } from "$lib/design-system";
  import { formatHudNumber } from "$lib/components/game-hud/viewModels";
  import type { HudDockSide, PlayerStandingViewModel } from "$lib/components/game-hud/types";
  import { uiPreferences, setUiPreference, type ShipFocus } from "$lib/stores/uiPreferences.svelte";

  interface Props {
    players: PlayerStandingViewModel[];
    dockSide: HudDockSide;
    currentTick: number;
    /** Enemy standing id to secondary-highlight (a clicked enemy star's owner);
     *  null when nothing/neutral/own star is selected. */
    highlightedPlayerId?: string | null;
    onToggleDockSide: () => void;
    onCollapse: () => void;
  }

  let {
    players,
    dockSide,
    currentTick,
    highlightedPlayerId = null,
    onToggleDockSide,
    onCollapse,
  }: Props = $props();

  const shipFocusOptions: PaxHudSegmentedOption[] = [
    { value: "active", label: "Act", icon: "paper-plane", title: "Emphasize active ships" },
    { value: "total", label: "Tot", icon: "circle-nodes", title: "Emphasize total ships" },
  ];
  // Owned by uiPreferences (persisted); replaces the old direct localStorage.
  const shipFocus = $derived(uiPreferences.leaderboardShipFocus);

  function setShipFocus(nextFocus: ShipFocus) {
    setUiPreference("leaderboardShipFocus", nextFocus);
  }

  const sortedPlayers = $derived(
    [...players].sort((left, right) => {
      const focusDelta =
        shipFocus === "active"
          ? right.activeShips - left.activeShips
          : right.totalShips - left.totalShips;
      if (focusDelta !== 0) return focusDelta;
      return right.totalShips - left.totalShips;
    }),
  );

  const totals = $derived.by(() =>
    players.reduce(
      (acc, player) => {
        acc.active += player.activeShips;
        acc.total += player.totalShips;
        acc.stars += player.starCount;
        acc.production += player.production;
        return acc;
      },
      { active: 0, total: 0, stars: 0, production: 0 },
    ),
  );
</script>

<PaxHudPanel title="Player Standings" eyebrow="Live match" class="pf-hud-panel pf-standings">
  {#snippet actions()}
    <PaxHudIconButton
      icon={dockSide === "right" ? "dock-left" : "dock-right"}
      title={dockSide === "right" ? "Move tactical rail left" : "Move tactical rail right"}
      onclick={onToggleDockSide}
      class="pf-hud-icon-button"
    />
    <PaxHudIconButton icon="chevron-up" title="Collapse player standings" onclick={onCollapse} class="pf-hud-icon-button" />
  {/snippet}

  <div class="pf-standings__toolbar">
    <span class="pf-standings__tick">Tick <strong class="font-hud-data">{currentTick}</strong></span>
    <PaxHudSegmentedControl
      value={shipFocus}
      options={shipFocusOptions}
      ariaLabel="Ship emphasis"
      density="compact"
      class="pf-standings__focus"
      iconSize={13}
      onValueChange={(value) => setShipFocus(value as ShipFocus)}
    />
  </div>

  <div class="pf-standings__columns">
    <span>Player</span>
    <span title="Active ships"><HudIcon name="paper-plane" size={12} /> Act</span>
    <span title="Total ships"><HudIcon name="circle-nodes" size={12} /> Tot</span>
    <span title="Stars"><HudIcon name="atlas-star" size={12} /> Star</span>
    <span title="Production"><HudIcon name="economy" size={12} /> Prod</span>
    <span title="Active percent">%</span>
  </div>

  <ul class="pf-standings__list">
    {#each sortedPlayers as player, index}
      <li
        class="pf-standings__row"
        class:pf-standings__row--local={player.isLocal}
        class:pf-standings__row--selected={highlightedPlayerId != null &&
          player.id === highlightedPlayerId}
        style:--player-color={player.color}
      >
        <span class="pf-standings__player">
          <span class="pf-standings__rank font-hud-data">{index + 1}</span>
          <span class="pf-standings__dot"></span>
          <span class="pf-standings__name">{player.isLocal ? "You" : player.name}</span>
        </span>
        <span class="font-hud-data">{formatHudNumber(player.activeShips)}</span>
        <span class="font-hud-data">{formatHudNumber(player.totalShips)}</span>
        <span class="font-hud-data">{formatHudNumber(player.starCount)}</span>
        <span class="font-hud-data">+{formatHudNumber(player.production, 1)}</span>
        <span class="font-hud-data">{player.activePercent}%</span>
      </li>
    {:else}
      <li class="pf-standings__empty">No players</li>
    {/each}
  </ul>

  <div class="pf-standings__summary">
    <span class="pf-standings__summary-label">Totals</span>
    <span class="font-hud-data">{formatHudNumber(totals.active)}</span>
    <span class="font-hud-data">{formatHudNumber(totals.total)}</span>
    <span class="font-hud-data">{formatHudNumber(totals.stars)}</span>
    <span class="font-hud-data">+{formatHudNumber(totals.production, 1)}</span>
    <span></span>
  </div>
</PaxHudPanel>
