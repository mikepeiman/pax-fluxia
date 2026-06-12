/** Pax Fluxia HUD — public API */
export { hud, HudState } from './state/hud-state.svelte';
export type {
  EngineBridge,
  Faction,
  FactionTone,
  GameEvent,
  GameSpeed,
  HudMode,
  Order,
  OrderKind,
  OverlayDef,
  StarSummary,
} from './state/hud-state.svelte';

export { default as PaxHud } from './PaxHud.svelte';

// Individual surfaces, if you'd rather compose your own layout:
export { default as TopBar } from './TopBar.svelte';
export { default as LeftRail } from './LeftRail.svelte';
export { default as OverviewPanel } from './OverviewPanel.svelte';
export { default as TacticalStandings } from './TacticalStandings.svelte';
export { default as StarViewPanel } from './StarViewPanel.svelte';
export { default as GameSpeedPanel } from './GameSpeedPanel.svelte';
export { default as EventFeed } from './EventFeed.svelte';
export { default as OverlayLegend } from './OverlayLegend.svelte';
export { default as BottomDock } from './BottomDock.svelte';
export { default as ZoomControls } from './ZoomControls.svelte';
export { default as CancelOrderDialog } from './CancelOrderDialog.svelte';

// Primitives for building new panels in the same language:
export { default as HudPanel } from './primitives/HudPanel.svelte';
export { default as HudButton } from './primitives/HudButton.svelte';
export { default as IconButton } from './primitives/IconButton.svelte';
export { default as Icon } from './primitives/Icon.svelte';
export { default as FactionSigil } from './primitives/FactionSigil.svelte';
export { default as StatRow } from './primitives/StatRow.svelte';
export { default as Pips } from './primitives/Pips.svelte';
export { default as MeterBar } from './primitives/MeterBar.svelte';
export { default as HudTooltip } from './primitives/HudTooltip.svelte';
