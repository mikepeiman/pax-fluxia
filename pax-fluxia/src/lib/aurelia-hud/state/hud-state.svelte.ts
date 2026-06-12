/**
 * Pax Fluxia — HUD state.
 *
 * One reactive store (Svelte 5 runes) that every HUD component reads from.
 * Game-engine integration happens through `hud.bridge`: register callbacks
 * from your PixiJS/engine layer and the HUD will call them; push engine
 * updates back by mutating the store fields (they are plain $state).
 *
 * Everything marked TODO is a stub for you to wire up.
 */

export type FactionTone = 'teal' | 'amber' | 'ice' | 'nova';
export type GameSpeed = 0 | 1 | 2 | 4;
export type HudMode = 'fleet' | 'order' | 'build' | 'research' | 'diplomacy' | 'intel';
export type OrderKind = 'move' | 'develop' | 'garrison' | 'fortify' | 'hold';
export type StarKind = 'sun' | 'planet' | 'star';

export interface Faction {
  id: string;
  name: string;
  tone: FactionTone;
  sigil: 'luminara' | 'vaelari' | 'neutral';
  score: number;
  victory: number; // 0–100
}

export interface StarSummary {
  id: string;
  name: string;
  epithet?: string; // e.g. "Capital Star"
  kind: StarKind;
  ownerId: string | null;
  control: number; // 0–1
  population: number;
  populationMax: number;
  defense: number;
  defenseMax: number;
  development: number;
  pressure: number; // 0–1
  fluxPerTick: number;
  influencePerTick: number;
  intelLevel: 'None' | 'Low' | 'Medium' | 'High';
}

export interface Order {
  id: string;
  kind: OrderKind;
  starId: string;
  starName: string;
  targetName?: string;
  via?: string;
  eta?: number; // ticks
}

export interface GameEvent {
  id: string;
  tick: number;
  tone: FactionTone | 'neutral';
  /** Segments allow inline emphasis without HTML strings. */
  parts: { text: string; accent?: boolean }[];
}

export interface OverlayDef {
  key: string;
  label: string;
  glyph: 'swatch' | 'dash' | 'gradient' | 'dots' | 'lane' | 'link' | 'reticle' | 'startype' | 'tag';
  on: boolean;
}

/** Callbacks the host game engine can register. All optional. */
export interface EngineBridge {
  onSetSpeed?(speed: GameSpeed): void;
  onSetMode?(mode: HudMode): void;
  onSelectStar?(starId: string | null): void;
  onIssueOrder?(kind: OrderKind, starId: string): void;
  onCancelOrder?(orderId: string): void;
  onOverlayChange?(key: string, on: boolean): void;
  onZoom?(level: number): void;
  onRecenter?(): void;
  onSearch?(): void;
  onRailAction?(action: string): void;
  onTopbarAction?(action: string): void;
}

let uid = 0;
const nextId = (p: string) => `${p}-${++uid}`;

export class HudState {
  /* ------------------------------------------------ simulation clock */
  tick = $state(128);
  matchSeconds = $state(18 * 60 + 42);
  speed = $state<GameSpeed>(1);
  /** speed before the last pause, restored on unpause */
  #lastRunningSpeed: Exclude<GameSpeed, 0> = 1;

  matchTime = $derived.by(() => {
    const m = Math.floor(this.matchSeconds / 60);
    const s = this.matchSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  });

  /* ------------------------------------------------ factions */
  playerFactionId = 'luminara';
  factions = $state<Faction[]>([
    { id: 'luminara', name: 'Luminara Accord', tone: 'teal', sigil: 'luminara', score: 32, victory: 42 },
    { id: 'vaelari', name: 'Vaelari Combine', tone: 'amber', sigil: 'vaelari', score: 27, victory: 38 },
  ]);

  player = $derived(this.factions.find((f) => f.id === this.playerFactionId) ?? this.factions[0]);
  rivals = $derived(this.factions.filter((f) => f.id !== this.playerFactionId));
  standings = $derived([...this.factions].sort((a, b) => b.score - a.score));

  /* ------------------------------------------------ overview (player empire) */
  starsByKind = $state([
    { kind: 'sun' as StarKind, tone: 'amber' as FactionTone, count: 7 },
    { kind: 'star' as StarKind, tone: 'teal' as FactionTone, count: 5 },
    { kind: 'planet' as StarKind, tone: 'ice' as FactionTone, count: 3 },
    { kind: 'star' as StarKind, tone: 'nova' as FactionTone, count: 2 },
  ]);
  fleets = $state({ moving: 6, holding: 2, engaged: 0 });
  economy = $state([
    { key: 'flux', label: 'Flux', icon: 'flux', tone: 'amber' as FactionTone, perTick: 42, total: 312 },
    { key: 'influence', label: 'Influence', icon: 'influence', tone: 'teal' as FactionTone, perTick: 28, total: 186 },
    { key: 'intel', label: 'Intelligence', icon: 'intel', tone: 'nova' as FactionTone, perTick: 16, total: 94 },
  ]);

  /* ------------------------------------------------ selection */
  selectedStar = $state<StarSummary | null>({
    id: 'aurelia',
    name: 'Aurelia',
    epithet: 'Capital Star',
    kind: 'sun',
    ownerId: 'luminara',
    control: 1,
    population: 3,
    populationMax: 3,
    defense: 3,
    defenseMax: 5,
    development: 4,
    pressure: 0.18,
    fluxPerTick: 36,
    influencePerTick: 24,
    intelLevel: 'High',
  });

  /* ------------------------------------------------ orders */
  currentOrder = $state<Order | null>({
    id: 'ord-current',
    kind: 'move',
    starId: 'aurelia',
    starName: 'Aurelia',
    targetName: 'Orionis',
    via: 'Direct Lane',
    eta: 2,
  });
  orderQueue = $state<Order[]>([
    { id: 'ord-q1', kind: 'move', starId: 'aurelia', starName: 'Aurelia', targetName: 'Orionis', eta: 2 },
    { id: 'ord-q2', kind: 'develop', starId: 'aurelia', starName: 'Aurelia', eta: 3 },
    { id: 'ord-q3', kind: 'garrison', starId: 'aurelia', starName: 'Aurelia', eta: 4 },
  ]);
  /** order awaiting cancel confirmation (drives the dialog) */
  pendingCancel = $state<Order | null>(null);

  /* ------------------------------------------------ events */
  events = $state<GameEvent[]>([
    {
      id: nextId('ev'),
      tick: 128,
      tone: 'teal',
      parts: [{ text: 'You have gained control of ' }, { text: 'Delta Pavonis', accent: true }, { text: '.' }],
    },
    {
      id: nextId('ev'),
      tick: 128,
      tone: 'amber',
      parts: [
        { text: 'Vaelari Combine', accent: true },
        { text: ' completed Development on ' },
        { text: 'Thalor Prime', accent: true },
        { text: '.' },
      ],
    },
    {
      id: nextId('ev'),
      tick: 127,
      tone: 'neutral',
      parts: [{ text: 'Trade convoy detected near ' }, { text: 'Quorin Belt', accent: true }, { text: '.' }],
    },
  ]);

  /* ------------------------------------------------ map overlays */
  overlays = $state<OverlayDef[]>([
    { key: 'territories', label: 'Territories', glyph: 'swatch', on: true },
    { key: 'borders', label: 'Borders', glyph: 'dash', on: true },
    { key: 'pressure', label: 'Pressure', glyph: 'gradient', on: true },
    { key: 'influence', label: 'Influence', glyph: 'dash', on: false },
    { key: 'flux-income', label: 'Flux Income', glyph: 'dots', on: false },
    { key: 'intel-range', label: 'Intel Range', glyph: 'dots', on: false },
    { key: 'lanes', label: 'Lanes', glyph: 'lane', on: true },
    { key: 'connections', label: 'Connections', glyph: 'link', on: true },
    { key: 'orders', label: 'Orders', glyph: 'reticle', on: true },
    { key: 'star-types', label: 'Star Types', glyph: 'startype', on: true },
    { key: 'labels', label: 'Labels', glyph: 'tag', on: true },
  ]);

  /* ------------------------------------------------ HUD chrome state */
  mode = $state<HudMode>('order');
  zoom = $state(1);
  panels = $state({
    overview: true,
    legend: false,
    rightStack: true,
    standings: true,
    starView: true,
    events: true,
    dock: true,
  });
  alerts = $state(2);
  unreadMessages = $state(1);

  /* ------------------------------------------------ engine bridge */
  bridge: EngineBridge = {};

  /* ================================================================
     Actions — HUD calls these; they update local state and forward
     to the engine bridge. Wire the TODOs to your game logic.
     ================================================================ */

  setSpeed(speed: GameSpeed) {
    if (speed !== 0) this.#lastRunningSpeed = speed;
    this.speed = speed;
    this.bridge.onSetSpeed?.(speed);
    // TODO(engine): apply tick-rate multiplier in the simulation loop.
  }

  togglePause() {
    this.setSpeed(this.speed === 0 ? this.#lastRunningSpeed : 0);
  }

  setMode(mode: HudMode) {
    this.mode = mode;
    this.bridge.onSetMode?.(mode);
    // TODO(engine): switch map interaction mode (fleet select, order target…).
  }

  selectStar(star: StarSummary | null) {
    this.selectedStar = star;
    this.bridge.onSelectStar?.(star?.id ?? null);
    // TODO(engine): focus/highlight the star entity on the map.
  }

  issueOrder(kind: OrderKind) {
    const star = this.selectedStar;
    if (!star) return;
    this.orderQueue.push({
      id: nextId('ord'),
      kind,
      starId: star.id,
      starName: star.name,
      eta: this.orderQueue.length + 2,
    });
    this.bridge.onIssueOrder?.(kind, star.id);
    // TODO(engine): validate + enqueue the order in the simulation.
  }

  requestCancel(order: Order) {
    this.pendingCancel = order;
  }

  confirmCancel() {
    const order = this.pendingCancel;
    if (!order) return;
    if (this.currentOrder?.id === order.id) this.currentOrder = null;
    this.orderQueue = this.orderQueue.filter((o) => o.id !== order.id);
    this.pendingCancel = null;
    this.bridge.onCancelOrder?.(order.id);
    // TODO(engine): abort the order in the simulation.
  }

  dismissCancel() {
    this.pendingCancel = null;
  }

  removeQueued(orderId: string) {
    const order = this.orderQueue.find((o) => o.id === orderId);
    if (order) this.requestCancel(order);
  }

  setOverlay(key: string, on: boolean) {
    const ov = this.overlays.find((o) => o.key === key);
    if (ov) ov.on = on;
    this.bridge.onOverlayChange?.(key, on);
    // TODO(engine): toggle the matching PixiJS layer.
  }

  zoomIn() {
    this.zoom = Math.min(4, +(this.zoom + 0.25).toFixed(2));
    this.bridge.onZoom?.(this.zoom);
    // TODO(engine): tween camera zoom.
  }

  zoomOut() {
    this.zoom = Math.max(0.25, +(this.zoom - 0.25).toFixed(2));
    this.bridge.onZoom?.(this.zoom);
  }

  recenter() {
    this.zoom = 1;
    this.bridge.onRecenter?.();
    // TODO(engine): pan camera to home star / fit bounds.
  }

  openSearch() {
    this.bridge.onSearch?.();
    // TODO(engine/HUD): open a star search palette.
  }

  railAction(action: string) {
    if (action === 'stars') this.panels.overview = !this.panels.overview;
    else if (action === 'overlays') this.panels.legend = !this.panels.legend;
    this.bridge.onRailAction?.(action);
    // TODO(HUD): route remaining rail actions (settings, stats, players…).
  }

  topbarAction(action: string) {
    this.bridge.onTopbarAction?.(action);
    // TODO(HUD): open alerts tray, message log, diplomacy, victory screens.
  }

  pushEvent(ev: Omit<GameEvent, 'id'>) {
    this.events.unshift({ ...ev, id: nextId('ev') });
    if (this.events.length > 40) this.events.length = 40;
  }

  /* ================================================================
     Demo ticker — drives the clock so the HUD feels alive without an
     engine. Remove once your simulation pushes real ticks.
     ================================================================ */
  #timer: ReturnType<typeof setInterval> | null = null;

  startDemoTicker() {
    this.stopDemoTicker();
    this.#timer = setInterval(() => {
      if (this.speed === 0) return;
      this.matchSeconds += 1;
      // 1 tick per 8 real seconds at 1×, scaled by speed
      if (this.matchSeconds % Math.max(1, Math.round(8 / this.speed)) === 0) {
        this.tick += 1;
        this.economy[0].total += this.economy[0].perTick;
        this.economy[1].total += this.economy[1].perTick;
        this.economy[2].total += this.economy[2].perTick;
      }
    }, 1000);
  }

  stopDemoTicker() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
  }
}

/** Singleton shared by every HUD component. */
export const hud = new HudState();
