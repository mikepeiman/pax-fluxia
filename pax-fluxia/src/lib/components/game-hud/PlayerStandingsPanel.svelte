<script lang="ts">
  import { browser } from "$app/environment";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import { PaxHudSegmentedControl, type PaxHudSegmentedOption } from "$lib/design-system";
  import HudIconButton from "./HudIconButton.svelte";
  import HudPanel from "./HudPanel.svelte";
  import { formatHudNumber } from "./viewModels";
  import type { HudDockSide, PlayerStandingViewModel } from "./types";

  interface Props {
    players: PlayerStandingViewModel[];
    dockSide: HudDockSide;
    currentTick: number;
    onToggleDockSide: () => void;
    onCollapse: () => void;
  }

  type ShipFocus = "active" | "total";

  let {
    players,
    dockSide,
    currentTick,
    onToggleDockSide,
    onCollapse,
  }: Props = $props();

  const FOCUS_KEY = "pax-leaderboard-ship-focus";
  const shipFocusOptions: PaxHudSegmentedOption[] = [
    { value: "active", label: "Act", icon: "paper-plane", title: "Emphasize active ships" },
    { value: "total", label: "Tot", icon: "circle-nodes", title: "Emphasize total ships" },
  ];
  let shipFocus = $state<ShipFocus>(
    browser && localStorage.getItem(FOCUS_KEY) === "active" ? "active" : "total",
  );

  function setShipFocus(nextFocus: ShipFocus) {
    shipFocus = nextFocus;
    if (browser) {
      localStorage.setItem(FOCUS_KEY, nextFocus);
    }
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
        return acc;
      },
      { active: 0, total: 0, stars: 0 },
    ),
  );
</script>

<HudPanel title="Player Standings" eyebrow="Live match" class="pf-standings">
  {#snippet actions()}
    <HudIconButton
      icon={dockSide === "right" ? "dock-left" : "dock-right"}
      title={dockSide === "right" ? "Move tactical rail left" : "Move tactical rail right"}
      onclick={onToggleDockSide}
    />
    <HudIconButton icon="chevron-up" title="Collapse player standings" onclick={onCollapse} />
  {/snippet}

  <div class="pf-standings__toolbar">
    <span>Focus</span>
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

  <div class="pf-standings__summary">
    <span><strong class="font-hud-data">{formatHudNumber(totals.active)}</strong> active</span>
    <span><strong class="font-hud-data">{formatHudNumber(totals.total)}</strong> total</span>
    <span><strong class="font-hud-data">{formatHudNumber(totals.stars)}</strong> stars</span>
    <span>Tick <strong class="font-hud-data">{currentTick}</strong></span>
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
        style={`--player-color:${player.color};`}
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
</HudPanel>
