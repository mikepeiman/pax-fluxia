<script lang="ts">
  import type { GameSpeed } from "$lib/types/game.types";
  import type { TerritoryModeShortcutOption } from "$lib/territory/ui/territoryModeShortcuts";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import { PaxHudButton } from "$lib/design-system";
  import HudIconButton from "./HudIconButton.svelte";
  import { formatHudNumber } from "./viewModels";
  import { gameHudStatsStore } from "$lib/stores/gameHudStatsStore";
  import type { PlayerStandingViewModel, SelectedStarViewModel } from "./types";

  interface Props {
    settingsOpen: boolean;
    standingsCollapsed: boolean;
    players: PlayerStandingViewModel[];
    selectedStar: SelectedStarViewModel | null;
    currentTick: number;
    speed: GameSpeed;
    isPaused: boolean;
    mapName: string | null;
    modeOptions: TerritoryModeShortcutOption[];
    activeModeId: string;
    onMenuClick: () => void;
    onSettingsClick: () => void;
    onToggleStandings: () => void;
    onModeSelect: (modeId: string) => void;
  }

  let {
    settingsOpen,
    standingsCollapsed,
    players,
    selectedStar,
    currentTick,
    speed,
    isPaused,
    mapName,
    modeOptions,
    activeModeId,
    onMenuClick,
    onSettingsClick,
    onToggleStandings,
    onModeSelect,
  }: Props = $props();

  const localPlayer = $derived(players.find((player) => player.isLocal) ?? players[0] ?? null);
  const tacticalOverview = $derived(
    [...players].sort((a, b) => b.totalShips - a.totalShips).slice(0, 5),
  );
</script>

<header class="pf-hud-topbar">
  <div class="pf-hud-topbar__brand">
    <HudIconButton icon="menu" title="Main menu" onclick={onMenuClick} />
    <span class="pf-hud-topbar__mark"><HudIcon name="yellow" size={19} /></span>
    <span class="pf-hud-topbar__title">Pax Fluxia</span>
    {#if mapName}
      <span class="pf-hud-topbar__map-divider" aria-hidden="true"></span>
      <span class="pf-hud-topbar__map" title={`Map: ${mapName}`}>{mapName}</span>
    {/if}
  </div>

  {#if localPlayer && !standingsCollapsed}
    <div
      class="pf-hud-topbar__player-summary"
      style:--player-color={localPlayer.color}
    >
      <div class="pf-hud-topbar__summary-cell">
        <span>You</span>
        <strong>{localPlayer.isLocal ? "Command" : localPlayer.name}</strong>
      </div>
      <div class="pf-hud-topbar__summary-cell">
        <span>Active</span>
        <strong class="font-hud-data">{formatHudNumber(localPlayer.activeShips)}</strong>
      </div>
      <div class="pf-hud-topbar__summary-cell">
        <span>Total</span>
        <strong class="font-hud-data">{formatHudNumber(localPlayer.totalShips)}</strong>
      </div>
      <div class="pf-hud-topbar__summary-cell">
        <span>Stars</span>
        <strong class="font-hud-data">{formatHudNumber(localPlayer.starCount)}</strong>
      </div>
    </div>
  {/if}

  {#if standingsCollapsed && tacticalOverview.length}
    <div class="pf-hud-topbar__tactical" aria-label="Tactical overview">
      {#each tacticalOverview as player}
        <span
          class="pf-hud-topbar__tactical-player"
          style:--player-color={player.color}
          title={player.name}
        >
          <span class="pf-hud-topbar__tactical-dot"></span>
          <strong class="font-hud-data">{formatHudNumber(player.activeShips)}</strong>
          <span class="font-hud-data">{formatHudNumber(player.starCount)}</span>
        </span>
      {/each}
    </div>
  {/if}

  <div class="pf-hud-topbar__status">
    <div class="pf-hud-topbar__status-item">
      <span>Tick</span>
      <strong class="font-hud-data">{currentTick}</strong>
    </div>
    <div class="pf-hud-topbar__status-item">
      <span>Speed</span>
      <strong class="font-hud-data">{isPaused ? "Pause" : `${speed}x`}</strong>
    </div>
    <div class="pf-hud-topbar__status-item">
      <span>Selected</span>
      <strong>{selectedStar?.label ?? "None"}</strong>
    </div>
    <div class="pf-hud-topbar__status-item pf-hud-topbar__perf" title="Render frames per second">
      <span>FPS</span>
      <strong class="font-hud-data">{$gameHudStatsStore.fps}</strong>
    </div>
    <div class="pf-hud-topbar__status-item pf-hud-topbar__perf" title="Total ships drawn this frame">
      <span>Ships</span>
      <strong class="font-hud-data">{formatHudNumber($gameHudStatsStore.visualShips)}</strong>
    </div>
  </div>

  <div class="pf-hud-topbar__modes" role="group" aria-label="Territory render mode shortcuts">
    {#each modeOptions as option}
      <PaxHudButton
        class="pf-hud-topbar__mode"
        active={activeModeId === option.id}
        onclick={() => onModeSelect(option.id)}
        title={option.displayLabel}
      >
        <span>{option.shortLabel}</span>
      </PaxHudButton>
    {/each}
  </div>

  <div class="pf-hud-topbar__actions">
    {#if localPlayer}
      <span
        class="pf-hud-topbar__player-badge-scope"
        style:--player-color={localPlayer.color}
      >
        <PaxHudButton
          class={`pf-hud-topbar__player-badge ${standingsCollapsed ? "pf-hud-topbar__player-badge--collapsed" : ""}`}
          active={standingsCollapsed}
          onclick={onToggleStandings}
          title={standingsCollapsed ? "Expand player standings" : "Collapse player standings"}
        >
          <span class="pf-hud-topbar__player-dot"></span>
          <span>{localPlayer.isLocal ? "You" : localPlayer.name}</span>
          <strong class="font-hud-data">{formatHudNumber(localPlayer.totalShips)}</strong>
          <HudIcon name={standingsCollapsed ? "chevron-down" : "chevron-up"} size={14} />
        </PaxHudButton>
      </span>
    {/if}
  </div>
</header>

<style>
  .pf-hud-topbar__tactical {
    display: flex;
    align-items: center;
    gap: var(--pax-gap-xs);
    min-width: 0;
    overflow: hidden;
  }

  .pf-hud-topbar__tactical-player {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px var(--pax-space-2);
    border-radius: 999px;
    background: color-mix(in srgb, var(--pax-color-void) 55%, transparent);
    font-size: var(--pax-type-2xs);
  }

  .pf-hud-topbar__tactical-dot {
    width: 7px;
    height: 7px;
    border-radius: 99px;
    background: var(--player-color);
    box-shadow: 0 0 8px var(--player-color);
  }

  .pf-hud-topbar__tactical-player strong {
    color: var(--pax-ui-text-strong);
  }

  .pf-hud-topbar__tactical-player > span:last-child {
    color: var(--pax-ui-text-dim);
  }
</style>
