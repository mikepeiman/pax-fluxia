import type { GameSpeed, PlayerState, StarState, StarType } from "$lib/types/game.types";

export type HudDockSide = "left" | "right";

export interface HudLayoutState {
  controlsSide: HudDockSide;
  tacticalSide: HudDockSide;
  settingsOpen: boolean;
  settingsRibbonExpanded: boolean;
  standingsCollapsed: boolean;
  quickAccessOpen: boolean;
  settingsWidth: number;
  tacticalWidth: number;
  toggleControlsSide: () => void;
  toggleTacticalSide: () => void;
  toggleSettingsOpen: () => void;
  closeSettings: () => void;
  toggleSettingsRibbonExpanded: () => void;
  toggleStandingsCollapsed: () => void;
  toggleQuickAccessOpen: () => void;
}

export interface PlayerStandingViewModel {
  id: string;
  name: string;
  color: string;
  isLocal: boolean;
  activeShips: number;
  damagedShips: number;
  totalShips: number;
  starCount: number;
  production: number;
  activePercent: number;
  source: PlayerState;
}

export interface StarTypeViewModel {
  id: StarType;
  label: string;
  icon: string;
  color: string;
}

export interface SelectedStarViewModel {
  id: string;
  label: string;
  starType: StarTypeViewModel;
  owner: PlayerStandingViewModel | null;
  activeShips: number;
  damagedShips: number;
  totalShips: number;
  productionRate: number;
  repairRate: number;
  transferRate: number;
  activationRate: number;
  targetId: string | null;
  queuedOrderTargetId: string | null;
  source: StarState;
}

export interface QuickAccessAction {
  id: string;
  icon: string;
  title: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}

export interface BottomCommandBarAction {
  id: string;
  icon: string;
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface GameSpeedPanelActions {
  speed: GameSpeed;
  isPaused: boolean;
  hasStarted: boolean;
  /** Base tick duration in ms (the simulation heartbeat at 1x speed). */
  tickIntervalMs: number;
  onSpeedChange: (speed: GameSpeed) => void;
  onPause: () => void;
  onResume: () => void;
  onStart: () => void;
  onTickIntervalChange: (ms: number) => void;
}
