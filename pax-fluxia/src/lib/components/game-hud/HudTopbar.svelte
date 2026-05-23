<script lang="ts">
  import type { GameSpeed } from "$lib/types/game.types";
  import type { TerritoryModeShortcutOption } from "$lib/territory/ui/territoryModeShortcuts";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import HudIconButton from "./HudIconButton.svelte";
  import { formatHudNumber } from "./viewModels";
  import type { PlayerStandingViewModel, SelectedStarViewModel } from "./types";

  interface Props {
    settingsOpen: boolean;
    standingsCollapsed: boolean;
    players: PlayerStandingViewModel[];
    selectedStar: SelectedStarViewModel | null;
    currentTick: number;
    speed: GameSpeed;
    isPaused: boolean;
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
    modeOptions,
    activeModeId,
    onMenuClick,
    onSettingsClick,
    onToggleStandings,
    onModeSelect,
  }: Props = $props();

  const localPlayer = $derived(players.find((player) => player.isLocal) ?? players[0] ?? null);
</script>

<header class="pf-hud-topbar">
  <div class="pf-hud-topbar__brand">
    <HudIconButton icon="menu" title="Main menu" onclick={onMenuClick} />
    <span class="pf-hud-topbar__mark"><HudIcon name="yellow" size={19} /></span>
    <span class="pf-hud-topbar__title">Pax Fluxia</span>
  </div>

  {#if localPlayer}
    <div class="pf-hud-topbar__player-summary" style={`--player-color:${localPlayer.color};`}>
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
  </div>

  <div class="pf-hud-topbar__modes" role="group" aria-label="Territory render mode shortcuts">
    {#each modeOptions.slice(0, 6) as option}
      <button
        type="button"
        class="pf-hud-topbar__mode"
        class:active={activeModeId === option.id}
        onclick={() => onModeSelect(option.id)}
        title={option.displayLabel}
      >
        <span>{option.shortLabel}</span>
      </button>
    {/each}
  </div>

  <div class="pf-hud-topbar__actions">
    {#if localPlayer}
      <button
        type="button"
        class="pf-hud-topbar__player-badge"
        class:pf-hud-topbar__player-badge--collapsed={standingsCollapsed}
        onclick={onToggleStandings}
        title={standingsCollapsed ? "Expand player standings" : "Collapse player standings"}
        style={`--player-color:${localPlayer.color};`}
      >
        <span class="pf-hud-topbar__player-dot"></span>
        <span>{localPlayer.isLocal ? "You" : localPlayer.name}</span>
        <strong class="font-hud-data">{formatHudNumber(localPlayer.totalShips)}</strong>
        <HudIcon name={standingsCollapsed ? "chevron-down" : "chevron-up"} size={14} />
      </button>
    {/if}
    <HudIconButton
      icon="tune"
      title={settingsOpen ? "Close settings ribbon" : "Open settings ribbon"}
      active={settingsOpen}
      onclick={onSettingsClick}
    />
  </div>
</header>
