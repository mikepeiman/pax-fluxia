---
date created: 2026-05-14
human reviewed: yes
acceptance level: 80-90%
---

# Pax Fluxia UI Component and Widget Inventory

**Purpose:** Extract and systematize every useful function, component, widget, element, icon, and control surfaced through the UI exploration so far, while grounding the system in the actual Pax Fluxia gameplay model.

**Audience:** UI implementation, gameplay design, roadmap planning, visual design, and coding agents.

**Scope:** Main in-game HUD, gameplay overlays, roadmap-ready modules, reusable design-system primitives, and potential future interface shells.

**Source basis:** This document is based on the current Pax Fluxia developer overview supplied in this chat, plus the visual/UI exploration work completed across the previous theme passes: Starglass Prime, Fleet Ops Brutalist, Neon Arcade Synthwave, Astral Cartographer, Xenobio Interface, Industrial Salvage, Imperial Holograph Luxe, and Tournament Broadcast Minimal.

---

## 1. Design North Star

Pax Fluxia is not a conventional unit-micro RTS. The player is commanding a pressure network. The user interface should therefore make **flow, topology, attrition, persistence, pressure, and timing** visible at a glance.

The core UI should not merely show widgets around a map. It should be a single command surface wrapped around the living star graph.

### 1.1 Core UX promises

1. **The graph is the battlefield.** The star graph, lane connectivity, chokepoints, escape routes, and fronts must remain visible and interpretable.
2. **Orders are persistent.** The HUD must show ongoing intent, not just transient clicks.
3. **Combat is remote and attritional.** Game visuals should convey pinning, active vs damaged ships, and repair suppression.
4. **Timing matters.** The synchronized tick and surge rhythm should be smooth, rhythmic, mesmerizing.
5. **Conquest changes topology.** Capture, scatter, retreat, and deferred orders should be readable as a chain reaction.
6. **Visual intelligence beats decorative spectacle.** Style can be rich, but every effect should clarify ownership, force flow, threat, or future intent.

### 1.2 Current gameplay anchors

The UI inventory should directly support these current mechanics:

- Click to select stars.
- Drag through stars to issue chained orders.
- Right-click a star to cancel outgoing orders.
- Owned stars are idle, reinforcing friendly stars, or attacking enemy stars.
- Orders persist until explicitly canceled.
- Ships have active and damaged states.
- Damaged ships can repair and contribute weakly to defense.
- Stars have type bonuses.
- Lanes are the only valid interaction route.
- Territories are owner-region fills and borders around connected same-owner stars.
- Combat pulses every tick, with ship surges along lanes.
- Conquest transfers part of the victor force and may trigger retreat, scatter, capture, and deferred orders.

### 1.3 Roadmap anchors

The same component system should be able to absorb future features:

- Algorithmic group orders: reinforce frontlines, shock and awe, territory hold.
- Constellation objectives and bonuses.
- Order splitting from one star to multiple targets.
- Transfer-rate or conquest-transfer percentage controls.
- Multiple ship types.
- Structures, starbases, planets, moons, upgrades, and research.
- Portals and multi-position stars.
- Alternative victory conditions: territory score, timed modes, campaigns, sector escalation.
- Map editor, theme editor, replay, and spectator modes.

---

## 2. Component Taxonomy

The Pax Fluxia UI system can be organized into families.

```text
PaxFluxiaUI
├─ Website/landing page design
├─ Steam Store & social media assets
├─ Main Menu UI, pre-game settings etc
  ├─ Single player options
  ├─ Multiplayer: lobbies, friends lists, leaderboards, chat, etc
├─ Game Shell and Layout
  ├─ Map Rendering and Visual Intelligence
  ├─ Selection and Order Interaction
  ├─ Tactical Readouts
  ├─ Command Surfaces
  ├─ Overlays and Settings
  ├─ Event, Alert, and Timeline Systems
  ├─ Game Over splash screen; stats, charts, visualizations, filters 
└─ Roadmap Feature Modules
```

Each family should be reusable across all visual themes. The theme should alter shell, color, ornamentation, typography, motion, and texture. The underlying information architecture should remain stable.

---

## 3. Game Shell and Layout Components

### 3.1 `GameShell`

**Function:** The root in-game layout container. Governs topbar, playfield, side docks, ribbons, bottom deck, and overlay layers.

**Current use:** Main gameplay screen.

**Roadmap use:** Campaign mode, replay mode, spectator mode, map editor, theme editor, mod panels.

**Functional requirements:**

- Holds the map as the primary area.
- Side panels dock without covering critical map routes unless expanded intentionally.
- Supports left/right mirroring.
- Supports compact, normal, expanded, and hidden states.
- Provides stable z-index ordering for map, orders, overlays, panels, tooltips, modals, and notifications.
- Treats topbar as part of layout, not as a separate floating overlay.

**Potential props:**

```ts
interface GameShellProps {
  leftDockState: 'closed' | 'rail' | 'compact' | 'expanded';
  rightDockState: 'closed' | 'badge' | 'compact' | 'expanded';
  bottomDockState: 'closed' | 'compact' | 'expanded';
  topbarMode: 'minimal' | 'resource' | 'match' | 'spectator' | 'editor';
  theme: HudTheme;
  layoutPreset: LayoutPreset;
}
```

### 3.2 Default layout: command surface

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: menu | match/tick | resources | selected context | collapse controls │
├──────────┬───────────────────────────────────────────────┬───────────────────┤
│ LEFT     │                                               │ RIGHT TACTICAL    │
│ RIBBON   │                 MAP / PLAYFIELD               │ leaderboard       │
│ settings │       stars, lanes, territory, orders         │ gamespeed         │
│ overlays │                                               │ selected star     │
│ commands │                                               │ quick widgets     │
├──────────┴───────────────────────────────────────────────┴───────────────────┤
│ BOTTOM DECK: selected context | command strip | quick access | minimap         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Minimal competitive layout

Best for actual play once the user knows controls.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ compact topbar: score/tick/resources/settings stubs                          │
├───────────────────────────────────────────────────────────────┬──────────────┤
│                                                               │ slim right   │
│                         MAP / PLAYFIELD                       │ tactical     │
│                                                               │ column       │
├───────────────────────────────────────────────────────────────┴──────────────┤
│ small bottom quickbar + contextual selected-star chip                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Map-primary layout

Best for screenshots, experienced players, and intense combat.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ very slim topbar                                                             │
├───┬──────────────────────────────────────────────────────────────────────┬───┤
│ < │                            MAP / PLAYFIELD                           │ > │
│   │                   contextual panels appear on selection              │   │
└───┴──────────────────────────────────────────────────────────────────────┴───┘
```

### 3.5 Bottom command-deck layout

Best for order-heavy play.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ topbar                                                                       │
├───────────────┬──────────────────────────────────────────────┬───────────────┤
│ compact rail   │                map/playfield                 │ tactical rail │
├───────────────┴──────────────────────────────────────────────┴───────────────┤
│ selected star | order controls | group modes | transfer % | quick access     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.6 Spectator/broadcast layout

Best for future replay, tournament, or AI-battle viewing.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ scorebug: player A | score | timer | score | player B | game speed           │
├────────────────────────────────────────────────────────────┬─────────────────┤
│                       map/playfield                        │ live standings  │
│                                                            │ event ticker    │
├────────────────────────────────────────────────────────────┴─────────────────┤
│ lower thirds | tactical ticker | economy deltas | player card                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.7 Editor/config layout

Best for theme, map, and tuning tools.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ editor topbar: save | load | theme | map | diagnostics                       │
├─────────────────────┬──────────────────────────────────────┬─────────────────┤
│ tool categories      │ map preview                          │ properties      │
│ layers/settings      │ live render                          │ selected item   │
├─────────────────────┴──────────────────────────────────────┴─────────────────┤
│ timeline/log | validation | performance | export                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Topbar and Global Header Components

### 4.1 `Topbar`

**Function:** Compact structural spine for match context and global status.

**Current use:** Menu, FPS, ship count, tick, resources, mode chips, collapse controls.

**Roadmap use:** Spectator scorebug, campaign sector header, editor toolbar, multiplayer status.

**Should include:**

- Menu button.
- Compact resource/status cluster.
- Tick or timer.
- Current player/faction.
- Selected star context chip.
- Left and right dock collapse/reopen controls.
- Optional overlay mode chips.

**Should avoid:**

- Becoming a dumping ground for every button.
- Long prose labels.
- Duplicate settings that belong in a ribbon.

**Variants:**

1. Compact structural spine.
2. Segmented resource bar.
3. Center-anchored match info.
4. Faction banner / identity bar.
5. Mode-chip topbar.
6. Spectator scorebug.
7. Editor toolbar.
8. Minimal HUD spine.

### 4.2 `ResourceSummaryCluster`

**Function:** Shows total force and economic/tactical resources at a glance.

**Current fields:**

- Total ships.
- Active ships.
- Damaged ships.
- Production rate.
- Territory share.
- Stars owned.
- Tick count / game time.

**Roadmap fields:**

- Influence.
- Region area.
- Research points.
- Starbase count.
- Fleet cap.
- Constellation progress.
- Campaign meta-resource.

**Display options:**

- Icon + value + delta.
- Compact chip row.
- Segmented resource meter.
- Faction color coded.
- Threshold glow: green good, amber unstable, red critical.

### 4.3 `ModeChipStrip`

**Function:** Quick switching among map render modes or overlays.

**Overlays:**

- Territory view.
- borders visible, style
- fill visible, style
- Star labels.
- ... more possible

**Theme/mode select:**

- render modes
- mode themes (styles)
- transition themes (style of conquest animation)
- ...more in development

### 4.4 `CollapseControl`

**Function:** Obvious open/close control for side panels and ribbons.

**Options:**

- Chevron button.
- Rail tab with label.
- Topbar badge.
- Dock-handle grip.
- Keyboard shortcut indicator.

**Rules:**

- Collapse should never be hidden behind ambiguous close icons.
- Reopen should always be discoverable.
- State should persist across sessions.

---

## 5. Map Rendering and Visual Intelligence Components

### 5.1 `MapViewport`

**Function:** Primary interactive rendering surface.

**Responsibilities:**

- Pan/zoom.
- Star hit testing.
- Drag-through path capture.
- Hover feedback.
- Selection state.
- Overlay composition.
- Tooltip and context layer positioning.
- Performance-aware culling and level of detail.

**Roadmap support:**

- Replay camera.
- Spectator zoom regions.
- Map editor object handles.
- Split-screen and minimap sync.

### 5.2 `StarNode`

**Function:** Visual and interactive representation of a star.

**Current data:**

- Star ID/name.
- Owner.
- Star type.
- Active ships.
- Damaged ships.
- Active order.
- Deferred order.
- Connected lanes.
- Combat state.
- Production/repair/transfer modifiers.

**Render layers:**

```text
StarNode
├─ type glyph/core shape
├─ owner color ring
├─ active ship orbit dots
├─ damaged ship orbit dots or broken ring
├─ selection halo
├─ order status badge
├─ combat/pinning badge
├─ label/tag
└─ hover/drag-through hit ring
```

**Current variants:**

- Neutral star.
- Owned idle star.
- Owned reinforcing star.
- Owned attacking star.
- Enemy star under attack.
- Selected star.
- Star under attack.
- Captured this tick.

**Roadmap variants:**
(these are overlay candidates)
- Portal star.
- Constellation star.
- Star with starbase.
- Star with structure slots.
- Star with multiple ship types.
- Star with hidden/scouted state.
- Star with special anomaly.
- Star with victory objective marker.

### 5.3 `StarTypeIcon`

**Function:** Stable symbolic language for star specialization.

**Safe component approach:**

```ts
interface StarTypeDefinition {
  id: string;
  label: string;
  shape: 'circle' | 'square' | 'triangle' | 'hexagon' | 'pentagon' | 'plain';
  colorRole: 'blue' | 'red' | 'green' | 'purple' | 'yellow' | 'grey';
  bonusAxis: 'transit' | 'attack' | 'defense' | 'repair' | 'production' | 'none';
  shortIcon: string;
  tooltip: string;
}
```

**Icon options:**

- Septagon: transit/logistics.
- Square: defense.
- Triangle: attack.
- Hexagon: repair.
- Pentagon: production.
- Grey, circle: basic star.

**Supporting icons:**

- Transit: arrow ring, lane arrow, orbital gate.
- Attack: lance, crosshair, burst, chevron strike.
- Defense: shield, bastion, ring fortification.
- Repair: wrench, plus, regeneration spiral.
- Production: factory star, pentagon core, ship bloom.
- Basic: simple luminous dot.

### 5.4 `ShipOrbitRenderer`

**Function:** Shows ships stored at a star as abstract dots orbiting in rings.

**Current use:** Active and damaged ship visualization.

**Visual modes:**

- Static dot rings.
- Slow rotation.
- Pulsing damaged layer.
- Active dots bright, damaged dots dim/flicker.
- Density compression for large values.
- Heat ring for overloaded stars.

**Roadmap support:**

- Multiple ship classes with ring bands.
- Fleet readiness icon overlays.
- Repair animation returning dots to active layer.
- Capture transfer animation.

### 5.5 `LaneRenderer`

**Function:** Draws connections between stars and clarifies valid interaction routes.

**Current states:**

- Neutral/inactive lane.
- Friendly internal lane.
- Attack lane.
- Reinforcement lane.
- Contested lane.
- Selected path lane.

**Visual options:**

- Thin graph line.
- Directional chevrons.
- Pulse marks per tick.
- Owner-color edge glow.
- Dashed ghost for deferred order.
- Warning strip for third-party intrusion prevention.

**Roadmap support:**

- Portal lanes.
- Multi-order split lanes.
- High-capacity logistics lanes.
- Blockaded/disrupted lanes.
- Sensor-revealed hidden lanes.

### 5.6 `OrderPathRenderer`

**Function:** Shows persistent order intent from origin to destination.

**Current needs:**

- Attacking enemy star.
- Reinforcing friendly star.
- Drag-chain route.
- Cancellation preview.
- Order persists through empty origin.

**Roadmap needs:**

- Deferred order through enemy-held star.
- Order splitting.
- Algorithmic group order destinations.
- Transfer percentage override.
- Retreat route.

**Recommended visual grammar:**

```text
Solid bright pulsing arrow chain       = active order
Dotted arrow             = deferred/ghost order
Wide pulsing arrow       = active combat surge
Thin low-alpha arrow     = preview while dragging
Broken/dim arrow         = order blocked or invalid
Branching arrows         = split order or group order
```

### 5.7 `FleetSurgeEffect`

**Function:** Tick-synchronized surge of ships along attack lane.

**Current use:** Combat rhythm and remote combat feel.

**Visual requirements:**

- Surge pulses on tick.
- Moves mass of ships visually toward enemy and back, a partial distance along the lane, without implying permanent physical transfer until conquest.
- Clearly distinguishes attacking from reinforcing (reinforcing = transfer; this has its own range of animation/presentation options)

**Options:**

- Chevrons along lane.
- Dots flowing in bursts.
- Wavefront line.
- Lane bloom pulse.
- Compression ripple from origin to target.

### 5.8 `UnderSiegeIndicator`

**Function:** Shows repair suppression caused by being under attack.

**Why it matters:** Pinning is a subtle, high-leverage mechanic. The UI should make it visible without needing tutorial prose.

**Possible displays:**

- Target star repair icon dimmed or crossed.
- Damaged ring stops recovering and flashes amber/red.
- “Repair suppressed” icon near StarView.
- Lane pressure badge: small attacker count can still glow as pressure.
- Tooltip explains: “Under attack: repair suppressed.”

**Panel fields:**

- Incoming attackers.
- Active defenders.
- Damaged defenders.
- Repair suppression percent.
- Expected recovery if attack is canceled.

### 5.9 `TerritoryRegionRenderer`

**Function:** Fills and borders connected same-owner regions.

**Current use:** Regions of owned stars and neutral areas.

**Visual responsibilities:**

- Owner fill.
- Owner border.
- - borders blend the color of nieghboring opponents
- Internal lanes still visible.
- Border clarity around empty space.
- Region split/merge updates after conquest.

**Options:**

- Voronoi fill.
- Metaball fill.
- Dot-field fill.
- Contour membrane fill.
- Hard tactical polygon fill.
- Soft nebula fill.
- Organic veil fill.
- Broadcast minimal flat tint.

**Roadmap support:**

- Region area economy.
- Constellation control.
- Campaign sectors.
- Fog of war / scouting.
- Influence gradient.

### 5.10 `LaneTerritoryCorridor`

**Function:** Ensures lanes visually belong to one owner or are contested by two owners. Prevents third-player visual intrusion.
This is a geometry constraint that occurs in code prior to rendering. This is not a render-time adjustment or style.

### 5.11 `FrontlineOverlay`

**Function:** Highlights the boundary between opposing owners.

**Current use:** Tactical readability.

**Ideas:**

- Pressure heatmap by enemy active force.
- Chokepoint marker.
- “about to fall” badge.
- ... more ideas welcome.

**Roadmap support:**

- Algorithmic reinforce-frontlines command.
- Threat board.
- AI suggestions.
- Mission objectives.

### 5.12 `Minimap`

**Function:** Compact region overview and navigation.

**Current use:** Optional in bottom-right or panel.

**Roadmap use:** 
- Spectator viewport
- Player map navigation
- campaign sectors
- higher-level galactic theatre overview

**Modes:**

- Territory overview.
- Threat overview.
- Fleet flow overview.
- Objective/constellation overview.
- Fog-of-war overview.

**Controls:**

- Zoom in/out.
- Recenter.
- Toggle labels.
- Jump to selected star.
- Show viewport rectangle.

### 5.13 `MapLabelSystem`

**Function:** Names, IDs, values, and owner tags on the map.

**Needs:**

- Avoid clutter at high zoom out.
- Preserve strategic readability.
- Reveal more detail on hover/zoom.
- Never obscure critical lane crossings.

**Label levels:**

Levels Of Detail:
```text
1: star circle/icon + owner/type ring
2: active ship count
3: active/damaged count
4: name + type + current order
5: full tactical tooltip
```

---

## 6. Selection and Order Interaction Components

### 6.1 `StarSelectionRing`

**Function:** Shows current selected/active star.

**States:**

- Hovered.
- Selected.
- Drag-entered.
- Drag-origin.
- Drag-terminal.
- Multi-selected group.
- Invalid target.

**Visual options:**

- Concentric ring.
- Crosshair brackets.
- Glow bloom.
- Small owner/type badge locked to ring.
- Selection tether line to StarView panel.

### 6.2 `DragOrderPreview`

**Function:** Shows the route being constructed during click-drag.

**Current behavior:** Orders are issued from starting star through subsequent stars to final drag release star.

**Display:**

```text
[origin] => [entered star] => [entered star] => [release target]
```

**Needed feedback:**

- Valid step.
- Invalid non-connected step.
- Friendly reinforcement vs enemy attack switch.
- Potential deferred order if enemy star is in chain.
- Order chain will persist.

### 6.3 `OrderBreadcrumb`

**Function:** Displays selected path as small chain chips.

**Example:**

```text
Solace → Quorin → Nexus Prime → Draco
REINFORCE      ATTACK       DEFERRED
```

**Uses:**

- Drag preview.
- Selected active order.
- Deferred chain inspection.
- Future group order summary.

### 6.4 `CancelOrderControl`

**Function:** Right-click cancellation plus visible UI affordance.

**Options:**

- Right-click star cancels outgoing order.
- StarView button: cancel outgoing.
- Order path close icon.
- Hotkey: `X` or `Backspace` while selected.
- Context menu item: “Cancel outbound order.”

**Feedback:**

- Order lane fades.
- Origin star status returns to idle.
- Toast: “Outbound order canceled.”

### 6.5 `ContextOrderWheel`

**Function:** Optional radial menu for commands.


**Roadmap commands:**

- Hold.
- Retreat.
- Split order.
- Set deferred order.
- Set conquest transfer percent.
- Reinforce frontlines.
- Shock and awe.
- Territory hold.
- Build/starbase.
- ALTERNATIVE: scrollwheel could adjust the potential option for percentage of ships to allocate to reinforcements or attack for a given command.

**Use carefully:** Fast drag-ordering should remain primary. The wheel is for discoverability and power commands, not mandatory play.

### 6.6 `GroupOrderPalette`

**Function:** Encapsulates future algorithmic order modes.

**Modes:**

- Reinforce Frontlines: distribute to friendly stars adjacent to enemies.
- Reinforce Equal: equal allocation among eligible targets.
- Reinforce Proportional: proportional to enemy forces.
- Shock & Awe: concentrate force toward selected enemy star(s).
- Territory Hold: distribute evenly across owned territory including backlines.
- Deep Breakthrough: chain orders through likely capture path.
- Evacuate Risk: retreat damaged or low-odds fronts.

**Display options:**

- Bottom command deck buttons.
- Command palette search.
- Contextual suggestions.
- Side ribbon category.

### 6.7 `OrderSplitControl`

**Function:** Future control allowing one star to issue multiple simultaneous orders.

**UI options:**

- Branch handles on origin star.
- Split percentage sliders.
- Drag from star multiple times while modifier key held.
- Small pie chart around origin.
- StarView “split outgoing” panel.

**Example display:**

```text
Origin: Nexus Prime
├─ 50% -> Quorin [reinforce]
├─ 30% -> Draco  [attack]
└─ 20% -> Bastion [reinforce]
```

### 6.8 `TransferPercentageControl`

**Function:** Future control for conquest-transfer amount or ongoing transfer rate.

**Possible placements:**

- Bottom command bar.
- StarView advanced drawer.
- Order path tooltip.
- Per-match settings.
- Global tactical preference.

**Display:**

```text
Transfer on capture: [ 25% | 50% | 75% | Max ]
Ongoing dispatch:    [ Slow | Normal | Fast | Flood ]
```

### 6.9 `RetreatScatterControl`

**Function:** Future explicit control for retreat behavior or expected scatter outcome.

**Current gameplay:** Retreat, scatter, or complete capture are outcomes of conquest conditions and defender orders.

**UI value:** Make these outcomes forecastable.

**Options:**

- Escape route arrows from threatened star.
- Retreat order button.
- “No exits: capture risk” warning.
- Scatter preview to friendly neighbors.
- Toast notification card when scatter resolves.

### 6.10 `DeferredOrderGhost`

**Function:** Visualizes orders that will activate after conquest.

**Display grammar:**

- Dotted future path.
- Ghost chevrons through enemy star.
- Small hourglass/flag badge on enemy target.
- Chain preview in tooltip.

**Example:**

```text
Nexus Prime => Draco [attack]
Draco ....> Umbra [deferred after capture]
```

---

## 7. Tactical Readout Components

### 7.1 `LeaderboardPanel`

**Function:** Primary side-column anchor for comparative state.

**Current columns:**

- Rank.
- Commander/player.
- Stars.
- Territory.
- Ships (total/active/damaged)
- Active ships vs total ships toggle.

**Roadmap columns:**

- Score.
- Constellations/objectives.
- Economy.
- Fleet cap.
- Win condition progress.
- APM/spectator metrics.
- Threat rating.

**Variants:**

- Active ships focus.
- Total ships focus.
- Stars / territory / ships.
- Compact collapsed badge.
- Tournament standings.
- Spectator score table.
- Imperial rankings / theme-flavored row shell.

**Rules:**

- Columns align cleanly.
- Row highlight for player.
- No title/subtitle overlap.
- Faction colors and icons are consistent.

### 7.2 `LeaderboardBadge`

**Function:** Collapsed leaderboard topbar-height badge.

**Contents:**

- Player rank.
- Player icon/color.
- Active ship count.
- Stars owned or territory share.
- Expand chevron.

**Example:**

```text
#1  You  686 active  18 stars  ▾
```

### 7.3 `StarViewPanel`

**Function:** Primary selected-star tactical dossier.

**Current must-have data:**

- Star name/ID.
- Owner.
- Star type icon and label.
- Active ships.
- Damaged ships.
- Current order state.
- Incoming/outgoing pressure.
- Defense value or control.
- Production/repair/transit/attack bonus depending on type (or, in future, a full readout of star stats, as they may be customized/upgraded/buffed/sabotaged/damaged)

**Roadmap fields:**

- Structures/starbase.
- Ship type composition.
- Repair suppression.
- Transfer capacity.
- Constellation membership.
- Portal pair status.
- Upgrade slots.
- Mission/objective status.

**Recommended substructure:**

```text
┌ StarView ──────────────────────────┐
│ [type icon] Star Name     [owner]   │
│ status chip | current order         │
├─────────────────────────────────────┤
│ Active ships   Damaged ships        │
│ 120 / 150      18 / 150             │
├─────────────────────────────────────┤
│ Type bonus | repair | production    │
│ incoming pressure | outgoing order  │
├─────────────────────────────────────┤
│ [focus view] [cancel order] [more]   │
└─────────────────────────────────────┘
```

### 7.4 `StarTypeDossier`

**Function:** Explains the selected star’s specialization.

**Options:**

- Simple icon + bonus label.
- Mini radar chart.
- Boost axis badge.
- “Why it matters” tooltip.
- Roadmap upgrade slot preview.

### 7.5 `ActiveDamagedShipMeter`

**Function:** Shows active vs damaged ship counts in an instantly readable way.

**Current use:** Critical for attrition depth.

**Visual options:**

- Two horizontal bars.
- Ring split around star icon.
- Stack count badges.
- Active dots and damaged broken dots.
- Ratio pill: `120 active / 18 damaged`.

**Roadmap support:**

- Multiple ship classes.
- Repair queue.
- Captured damaged pool.
- Retreat/scatter survivors.

### 7.6 `CombatPressureWidget`

**Function:** Shows incoming and outgoing combat pressure.

**Fields:**

- Incoming attackers.
- Outgoing attackers.
- Defense strength.
- Attack strength.
- Damage rate.
- Repair suppression state.
- Capture forecast (ticks to capture at current rate).
- - this is an important option to consider, this information changes gameplay/gamefeel substantially.

**Modes:**

- Simple pressure chip.
- Expanded pinning panel.
- Lane tooltip.
- Selected-star subpanel.

### 7.7 `CaptureRiskIndicator`

**Function:** Forecasts likely conquest state.

**States:**

- Stable.
- Pinned.
- Losing active force.
- Capture risk.
- No escape route.
- Likely retreat.
- Likely scatter.
- Likely complete capture.

**Display options:**

- Small colored shield/crown/skull icon.
- Progress ring around star.
- StarView warning row.
- Tooltip with outcome forecast.

### 7.8 `TickPhaseIndicator`

**Function:** Shows synchronized tick rhythm and progress.

**Display options:**

- Small topbar tick clock.
- Timeline in replay/debug mode only.

**Gameplay mode version:**

```text
Tick 142  ▓▓▓░░  
```

### 7.9 `RegionSummaryCard`

**Function:** Shows aggregate state for a connected owner region.

**Current use:** Optional hover/selection on territory region.

**Fields:**

- Owner.
- Stars in region.
- Active ships.
- Damaged ships.
- Production per tick.
- Frontline count.
- Exposed chokepoints.

**Roadmap use:**

- Region area economy.
- Constellation membership.
- Region bonuses.
- Campaign sectors.

### 7.10 `PortalStatusPanel`

**Function:** Future component for portal stars.

**Fields:**

- Portal pair locations.
- Shared active/damaged ships.
- Which portal endpoint is issuing current order.
- Incoming attacks at both endpoints.
- Defense pressure combined.

**Map display:**

- Paired glyph on both map locations.
- Shared force badge.
- Subtle tether between endpoints, visible on hover or selected.

---

## 8. Command Surface Components

### 8.1 `BottomCommandDeck`

**Function:** Main contextual action strip for selected star, selected fleet/order, or group command.

**Modes:**

- No selection.
- Star selected.
- Dragging order.
- Order path selected.
- Multiple stars selected.
- Replay/spectator mode.
- Editor mode.

**Current commands:**

- Move/reinforce.
- Attack.
- Hold/cancel.
- Focus view.
- Toggle overlays.

**Roadmap commands:**

- Split.
- Retreat.
- Set deferred order.
- Reinforce frontlines.
- Shock and awe.
- Territory hold.
- Build starbase.
- Upgrade star.
- Set transfer percent.

### 8.2 `QuickAccessStrip`

**Function:** Global icons that need constant access without competing with the map.

**Suggested icons:**

- Focus selected star.
- Toggle territory view.
- Toggle lanes.
- Toggle orders.
- Toggle labels.
- Alerts/events.
- Settings.
- Help/keybinds.
- Screenshot/replay.

**Variants:**

- Bottom-right strip.
- Bottom dock family width matched to right column.
- Icon-only rail.
- Hotkey-labeled strip.
- Radial quick cluster.

### 8.3 `CommandPalette`

**Function:** Keyboard-first command search.

**Roadmap-friendly because:** It can expose growing feature count without cluttering HUD.

**Example commands:**

```text
> reinforce frontlines
> show pinning pressure
> cancel all outgoing from selected
> focus nearest contested star
> set conquest transfer 50%
> toggle constellation overlay
```

### 8.4 `HotkeyStrip`

**Function:** Optional visual guide to key commands.

**Use cases:**

- Tutorial.
- Spectator explanation.
- Streamer overlay.
- Accessibility.
- Debug builds.

Accessible modal full list via a standard always-there bottom-right `?` or `#` icon. Has an optional persistent shortcut ribbon that can be shown or hidden by toggle. This compact shortcut strip can also be clicked to toggle full view. 

### 8.5 `FleetStatusStrip`

**Function:** Shows state of selected group/order chain.

**Current use:** If the player selects a path or star with outgoing order.

**Fields:**

- Origin star.
- Destination star.
- Friendly/enemy relation.
- Active ships committed.
- Damaged ships at origin.
- Time/tick until major event if available.
- Order persistence state.

### 8.6 `MapLegendPanel`

**Function:** Teaches symbols without overwhelming the map.

**Contents:**

- Star types.
- Owner colors.
- Lane styles.
- Order arrows.
- Active/damaged ship icons.
- Contested/pinned/capture-risk badges.

**States:**

- Collapsed icon.
- Compact legend.
- Full legend.
- Tutorial overlay.

---

## 9. Overlay and Settings Components

### 9.1 `SettingsRibbon`

**Function:** Collapsible settings and map-view controls.

**Current use:** Replaces grid/menu of settings icons with a coherent ribbon.

**Sections:**

- Theme controls.
- Map/view controls.
- Gameplay settings.
- Game options (audio, graphics, filesystem options etc)
- Overlay toggles.
- Performance/diagnostics.
- Accessibility.
- Keybindings.

**States:**

- Horizontal compact.
- Expanded with labels.
- Collapsed to topbar stub.
- Docked left or right.

### 9.2 `ThemeControlBlock`

**Function:** Current theme selector and theme library.

**Rules:**

- Theme selection belongs in top settings utility area.
- Do not mix unrelated controls into theme cluster.
- Theme library should scroll, newest to oldest, single-line rows, ellipsis truncation, no subcategory grouping for now.

**Roadmap support:**

- Theme import/export.
- Theme preview.
- Favorite themes & ratings.
- Per-player faction skins.
- Accessibility palettes.
- Theme marketplace and/or sharing.

### 9.3 `OverlayControlPanel`

**Function:** Fine-grained map rendering controls.

**Options:**

- Territory fill opacity.
- Border glow intensity.
- Lane visibility.
- Fleet path visibility.
- Star label density.
- Influence heatmap.
- Combat pressure overlay.
- Sensor range.
- Background nebula intensity.

### 9.4 `LayerChecklist`

**Function:** Manage visibility and order of tactical layers.

**Layers:**

- Territory control.
- Influence heatmap.
- Fleet movements.
- Persistent orders.
- Deferred orders.
- Sensor ranges.
- Star labels.
- Resource nodes.
- Constellations.
- Combat zones.
- Capture risk.
- Pinning pressure.

### 9.5 `DiagnosticsPanel`

**Function:** Developer/performance insights without polluting gameplay HUD.

**Fields:**

- FPS.
- Tick time.
- Render mode.
- Entity counts.
- Visible stars/lanes.
- Draw calls.
- Texture memory.
- Event queue size.

**Placement:** Hidden behind settings or developer mode. Do not show debug text under gameplay buttons.

### 9.6 `AccessibilityPanel`

**Function:** Make dense strategy readable across displays and player needs.

**Controls:**

- Colorblind-safe palettes.
- High contrast mode.
- Reduce bloom.
- Increase line thickness.
- Increase label size.
- Reduce motion.
- Simplified VFX.
- Enlarged hit areas.
- Audio cue volume.
- Tooltip verbosity.

---

## 10. Event, Alert, and Timeline Components

### 10.1 `AlertToastStack`

**Function:** Transient notifications for critical events.

**Current candidates:**

- Star captured.
- Under attack.
- Conquest imminent.
- Order canceled.
- Deferred order activated.
- Player eliminated.
- Game paused/resumed.

**Roadmap candidates:**

- Constellation complete.
- Research complete.
- Starbase finished.
- Portal contested.
- Campaign objective updated.

**Severity levels:**

- Info.
- Success.
- Warning.
- Critical.
- System.

### 10.2 `Battlefeed`

**Function:** Timeline of combat and map events.

**Useful entries:**

- Attack started.
- Star pinned.
- Star captured.
- Defenders scattered.
- Defenders retreated.
- Complete capture.
- Reinforcements arrived.
- Deferred order activated.

**Modes:**

- Compact live feed.
- Full event log.
- Replay timeline.
- Spectator ticker.

### 10.3 `CombatRecapCard`

**Function:** Summarizes resolved conquest or major battle.

**Fields:**

- Winning owner.
- Captured star.
- Attacker losses.
- Defender losses.
- Damaged survivors.
- Retreat/scatter/capture outcome.
- Transfer amount.
- Deferred orders activated.

### 10.4 `ObjectivePanel`

**Function:** Supports future victory conditions and missions.

**Current win condition:** Total conquest.

**Roadmap conditions:**

- Constellation capture.
- Timed score.
- Territory threshold.
- Economy threshold.
- Sector campaign objective.
- Multi-sector escalation.

**Display options:**

- Small objective chip.
- Left panel checklist.
- Topbar progress strip.
- Map overlay labels.

### 10.5 `TimelineControl`

**Function:** Replay or debug timeline.

**Roadmap use:** Replay, spectator, postmatch analysis, AI training.

**Fields:**

- Tick number.
- Major events.
- Ownership changes.
- Ship count curves.
- Combat peaks.

---

## 11. Roadmap Feature Modules

### 11.1 `ConstellationObjectiveSystem`

**Function:** Groups stars into objective sets with bonuses or win conditions.

**Components:**

- Constellation overlay lines.
- Constellation progress card.
- Star badges showing membership.
- Completion toast.
- Bonus tooltip.
- Objective tracker.

**Example:**

```text
Constellation: The Meridian Crown
Owned: 4 / 6 stars
Bonus preview: +15% repair in connected region
Status: contested by AI 3
```

### 11.2 `ResearchTreePanel`

**Function:** Future technology progression.

**Possible categories:**

- Production.
- Transfer/logistics.
- Repair.
- Combat.
- Territory/region.
- Portal control.
- Structures.
- Sensor/intel.

**Interface options:**

- Compact progress strip.
- Full tree modal.
- Research complete toast.
- Topbar research chip.

### 11.3 `StarbaseBuildPanel`

**Function:** Future structures on stars.

**Components:**

- Build queue.
- Structure slots.
- Starbase level badge.
- Construction progress.
- Resource cost chip.
- Upgrade tree.

**Potential structures:**

- Starbase: defense.
- Shipyard: production.
- Relay: transfer speed.
- Repair lattice: repair.
- Sensor array: visibility.
- Gate anchor: portal/long-range special variant.

### 11.4 `ShipTypeCompositionPanel`

**Function:** Future multiple ship types.

**Composition display:**

- Donut chart.
- Ring bands around star.
- Small ship glyph rows.
- Compact counts.

**Ship type ideas:**

- Fighter/dot swarm: fast, low value.
- Frigate: baseline.
- Cruiser: durable.
- Siege ship: strong attack, slower transfer.
- Repair drone: boosts damaged recovery.
- Interdictor: suppresses enemy transfer.

### 11.5 `PortalControlPanel`

**Function:** Portal-specific interface.

**Current portal rule:** A portal star can exist at multiple map positions while sharing one force.

**Panel display:**

- Endpoint A and endpoint B.
- Attacks incoming at each endpoint.
- Shared active/damaged force.
- Current outgoing endpoint.
- Endpoint under threat.

### 11.6 `CampaignSectorPanel`

**Function:** Future campaign and multi-sector UI.

**Fields:**

- Sector name.
- Map seed or author.
- Objective type.
- Player faction modifiers.
- Carryover rewards.
- Sector difficulty.
- Victory condition.

### 11.7 `MapEditorToolset`

**Function:** Editor for authored/generated maps (already implemented).

**Tools:**

- Add star.
- Delete star.
- Connect lane.
- Assign owner.
- Set star type.
- Define neutral force.
- Define territory algorithm preview.
- Define constellations.
- Define portals.
- Validate lane readability.
- Export map.

### 11.8 `ThemeEditorToolset`

**Function:** Future customization of the visual system.

**Tools:**

- Palette editor.
- Shell style editor.
- Border/fill opacity controls.
- Node glow settings.
- Lane style editor.
- Typography selection.
- VFX intensity.
- Accessibility preview.

---

## 12. Icon System

### 12.1 Core icon families

```text
World icons
├─ star type
├─ player/faction
├─ neutral
├─ region
├─ constellation
└─ portal

Order icons
├─ reinforce
├─ attack
├─ cancel
├─ deferred
├─ split
├─ retreat
├─ hold
└─ group mode

State icons
├─ active ships
├─ damaged ships
├─ pinned
├─ repairing
├─ production
├─ transit
├─ defense
├─ capture risk
└─ secure/contested

UI icons
├─ menu
├─ collapse
├─ expand
├─ focus view
├─ settings
├─ overlays
├─ alerts
├─ help
└─ screenshot/replay
```

### 12.2 Icon style rules

- Use a consistent line weight.
- Use shape language to reinforce mechanics.
- Use color and shape redundantly, not color alone.
- Keep icons readable at small sizes.
- Avoid emoji or mixed icon sources.
- Theme variants may ornament icons, but should not alter meaning.

### 12.3 Recommended icon mappings

| Concept | Base icon | Notes |
|---|---|---|
| Active ships | solid small ship/dot cluster | player color by default |
| Damaged ships | broken ship/dot cluster | grey/neutral by default |
| Reinforce | arrow into shield/star | Friendly action |
| Attack | crosshair/lance/chevrons | Enemy action |
| Deferred order | dotted flag/hourglass | Future intent |
| Cancel order | crossed arrow/X | Must be obvious |
| Pinning | suppressed wrench/repair icon | Shows repair blocked |
| Repair | plus/spiral/wrench | Purple star bonus candidate |
| Production | pentagon/factory/bloom | Yellow star bonus candidate |
| Transit | circle/arrow ring | Blue star bonus candidate |
| Defense | shield/bastion | Red star |
| Attack strength | burst/triangle/crosshair | Green star |
| Portal | paired rings/infinity gate | Shared force |
| Constellation | connected star cluster | Objective or bonus |
| Capture risk | cracked shield/crown | Outcome forecast |

---

## 13. Theme System

The themes explored are aesthetic skins over the same underlying component grammar. They should not require separate gameplay components. The code should separate **semantic role** from **visual skin**.

### 13.1 Theme tokens

```ts
interface HudTheme {
  id: string;
  name: string;
  palette: SemanticPalette;
  typography: TypographySet;
  shell: ShellStyle;
  iconStyle: IconStyle;
  effects: EffectStyle;
  mapRendering: MapRenderStyle;
}
```

### 13.2 Theme variants from exploration

#### Starglass Prime

- Premium glassmorphism.
- Calm, luminous, refined.
- Best for default high-end game UI.
- Works well for legible map-first play.

#### Fleet Ops Brutalist

- Dense tactical command-center.
- Dark metal, amber, red, teal.
- Good for hardcore mode, military campaign, or diagnostics-heavy skin.

#### Neon Arcade Synthwave

- High-energy esports flavor.
- Magenta/cyan/orange.
- Good for arcade mode, spectator, streamer overlays.

#### Astral Cartographer

- Ornate celestial map aesthetic.
- Gold filigree, astrolabe, star charts.
- Good for deluxe fantasy-science campaign skin.

#### Xenobio Interface

- Living organic biotech UI.
- Membranes, veins, bioluminescent nodes.
- Good for alien faction skin or experimental mode.

#### Industrial Salvage

- Rugged utility, shipyard grime, worn metal.
- Good for scavenger campaign, maintenance mode, survival variant.

#### Imperial Holograph Luxe

- Regal, jewel-toned, ceremonial.
- Good for empire faction identity or premium presentation.

#### Tournament Broadcast Minimal

- Clean esports broadcast package.
- Good for replay, spectator, tournaments, tutorial clarity.

### 13.3 Theme-safe rule

Every theme can alter presentation, but these semantic components should remain stable:

- Star type meaning.
- Owner color assignment.
- Active/damaged distinction.
- Attack/reinforce distinction.
- Persistent/deferred order distinction.
- Pinning/repair suppression.
- Capture risk.
- Lane ownership and contested corridor readability.

---

## 14. Potential Layout Catalog

### 14.1 Default play layout

```text
┌ Topbar ─────────────────────────────────────────────────────────────────────┐
│ menu | fps/tick | resources | mode chips | selected star | collapse controls │
├ Left Ribbon ┬────────────────────────────────────────────┬ Right Tactical ──┤
│ settings    │                                            │ leaderboard      │
│ overlays    │              MapViewport                   │ gamespeed        │
│ theme       │                                            │ StarView         │
│ legend      │                                            │ alerts/minimap   │
├─────────────┴────────────────────────────────────────────┴──────────────────┤
│ selected chip | command deck | group modes | quick access                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Beginner/tutorial layout

```text
┌ Topbar: objective | tick | resources | help                                  │
├ Tutorial prompts ┬──────────────────────────────────────┬ Star explainers    │
│ order steps      │ map with large labels                 │ selected star      │
│ legend           │ highlighted valid lanes               │ what this means    │
└──────────────────┴──────────────────────────────────────┴───────────────────┘
```

### 14.3 Expert compact layout

```text
┌ slim topbar ────────────────────────────────────────────────────────────────┐
│ map/playfield fills nearly all space                                         │
│ small right badge: rank | selected | speed                                   │
│ bottom mini command strip                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 14.4 Spectator layout

```text
┌ scorebug: player A | score | timer | score | player B | speed               │
├──────────────────────────────────────────────────────────────┬──────────────┤
│ map/playfield                                                  │ standings    │
│                                                               │ event feed   │
├──────────────────────────────────────────────────────────────┴──────────────┤
│ lower-third | economy delta | battle recap | minimap                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 14.5 Map editor layout

```text
┌ editor topbar: save | load | validate | export | theme                      │
├ tool rail ┬──────────────────────────────────────┬ properties panel          │
│ add star  │ map canvas                            │ selected star/lane        │
│ add lane  │ region preview                        │ constraints/checks        │
│ owner     │                                     │ constellation/portal      │
└───────────┴──────────────────────────────────────┴─────────────────────────┘
```

### 14.6 Theme editor layout

```text
┌ theme topbar: theme library | save | duplicate | preview                    │
├ tokens ┬ live gameplay preview ┬ component preview                           │
│ color  │ actual map/HUD        │ topbar/StarView/leaderboard                │
│ shell  │                       │ icons/buttons/forms                        │
└────────┴───────────────────────┴────────────────────────────────────────────┘
```

---

## 15. Data and Derived Metrics for UI

### 15.1 Core data per star

```ts
interface StarUIState {
  id: string;
  name: string;
  ownerId: string | 'neutral';
  typeId: string;
  activeShips: number;
  damagedShips: number;
  totalShips: number;
  currentOrder?: OrderState;
  deferredOrders?: OrderState[];
  connectedStarIds: string[];
  regionId?: string;
  isSelected: boolean;
  isHovered: boolean;
  isUnderAttack: boolean;
  repairSuppressed: boolean;
  captureRisk?: CaptureRiskState;
}
```

### 15.2 Derived map metrics

- Frontline stars.
- Border lanes.
- Contested lanes.
- Interior lines.
- Chokepoints.
- Region active ships.
- Region damaged ships.
- Region production.
- Repair capacity.
- Transfer throughput.
- Capture risk clusters.
- Pinning pressure clusters.
- Constellation progress.

### 15.3 Player aggregate metrics

- Stars owned.
- Regions owned.
- Total active ships.
- Total damaged ships.
- Total ships.
- Production per tick.
- Repair per tick.
- Attacking orders count.
- Reinforcing orders count.
- Pinned stars.
- Stars under threat.
- Territory share.

### 15.4 Order metrics

- Origin.
- Target.
- Relation: friendly/enemy/neutral.
- Order type: reinforce/attack/deferred/split/group.
- Persistent status.
- Ships eligible to dispatch.
- Transfer rate.
- Estimated pressure.
- Cancellation available.

---

## 16. MVP vs Roadmap Component Priorities

### 16.1 Build first: core gameplay readability

1. GameShell.
2. MapViewport.
3. StarNode.
4. LaneRenderer.
5. TerritoryRegionRenderer.
6. OrderPathRenderer.
7. ShipOrbitRenderer.
8. StarSelectionRing.
9. DragOrderPreview.
10. StarViewPanel.
11. LeaderboardPanel.
12. GameSpeedControl.
13. QuickAccessStrip.
14. SettingsRibbon.
15. MapLegendPanel.
16. AlertToastStack.

### 16.2 Build second: advanced tactical clarity

1. PinningIndicator.
2. CombatPressureWidget.
3. CaptureRiskIndicator.
4. DeferredOrderGhost.
5. RegionSummaryCard.
6. Battlefeed.
7. Minimap.
8. TickPhaseIndicator.
9. OverlayControlPanel.
10. LayerChecklist.

### 16.3 Build third: roadmap feature shells

1. GroupOrderPalette.
2. OrderSplitControl.
3. TransferPercentageControl.
4. RetreatScatterControl.
5. ConstellationObjectiveSystem.
6. ResearchTreePanel.
7. StarbaseBuildPanel.
8. ShipTypeCompositionPanel.
9. PortalStatusPanel.
10. CampaignSectorPanel.
11. MapEditorToolset.
12. ThemeEditorToolset.

---

## 17. Recommended Component Tree

```text
<GameShell>
  <Topbar>
    <MenuButton />
    <TickStatus />
    <ResourceSummaryCluster />
    <ModeChipStrip />
    <SelectedContextChip />
    <DockCollapseControls />
  </Topbar>

  <LeftDock>
    <SettingsRibbon />
    <MapLegendPanel />
    <OverlayControlPanel />
  </LeftDock>

  <MapViewport>
    <TerritoryRegionLayer />
    <LaneLayer />
    <OrderPathLayer />
    <FleetSurgeLayer />
    <StarNodeLayer />
    <SelectionLayer />
    <TooltipLayer />
  </MapViewport>

  <RightTacticalColumn>
    <LeaderboardPanel />
    <GameSpeedControl />
    <StarViewPanel />
    <Battlefeed compact />
  </RightTacticalColumn>

  <BottomDock>
    <SelectedSummaryChip />
    <BottomCommandDeck />
    <QuickAccessStrip />
    <Minimap optional />
  </BottomDock>

  <NotificationLayer>
    <AlertToastStack />
  </NotificationLayer>
</GameShell>
```

---

## 18. Component-to-Mechanic Crosswalk

| Mechanic | Components needed |
|---|---|
| Select star | StarNode, StarSelectionRing, StarViewPanel |
| Drag-through order | DragOrderPreview, OrderPathRenderer, OrderBreadcrumb |
| Right-click cancel | CancelOrderControl, OrderPathRenderer feedback |
| Persistent orders | OrderPathRenderer, StarNode order badge, StarView order row |
| Reinforcement | LaneRenderer, OrderPathRenderer, FleetSurgeEffect, StarView |
| Remote attack | FleetSurgeEffect, CombatPressureWidget, PinningIndicator |
| Active/damaged ships | ShipOrbitRenderer, ActiveDamagedShipMeter, StarView |
| Repair suppression | PinningIndicator, CombatPressureWidget, StarView |
| Conquest | CaptureRiskIndicator, CombatRecapCard, RegionRenderer update |
| Scatter/retreat | RetreatScatterControl, Battlefeed, path preview |
| Deferred orders | DeferredOrderGhost, OrderBreadcrumb, StarView |
| Star types | StarTypeIcon, StarTypeDossier, map labels |
| Territory | TerritoryRegionRenderer, RegionSummaryCard, minimap |
| Lane constraints | LaneRenderer, LaneTerritoryCorridor, invalid target feedback |
| Portals | PortalStatusPanel, Portal star glyph, paired map marker |
| Constellations | Constellation overlay, objective tracker, bonus tooltip |

---

## 19. Implementation Notes

### 19.1 Separate semantic state from visual skin

The code should not know whether the current theme is organic, regal, industrial, or minimal. It should know that something is `attack`, `repair`, `activeShips`, `damagedShips`, or `captureRisk`. The theme maps those semantic roles to colors, shapes, effects, and frames.

### 19.2 Do not treat labels as the solution

Labels help, but Pax Fluxia needs visual intelligence. A player should see pressure, flow, pinning, repair, and capture risk through shape, motion, glow, rhythm, and placement before reading text.

### 19.3 Design for zoom levels

The map can be information-dense. Use level of detail:

```text
Zoomed out: owner, territory, major pressure, top-level ship density
Medium: node counts, order arrows, frontlines, selected/star labels
Zoomed in: active/damaged dots, type icons, repair/pinning, exact labels
Hover/selected: full StarView details
```

### 19.4 Build themeable components, not theme-specific components

Bad:

```text
<ImperialLeaderboard />
<XenobioStarView />
```

Better:

```text
<LeaderboardPanel theme="imperial-holograph-luxe" />
<StarViewPanel theme="xenobio-interface" />
```

### 19.5 Maintain one shell grammar per theme

Within a theme, panels, buttons, chips, tables, icons, and sliders should share one structural language. Mixed shells are noisy. Mixed icon styles are worse. The interface should feel like a single command organism, not a drawer full of space trinkets.

---

## 20. Suggested Naming Inventory

### Layout

- `GameShell`
- `Topbar`
- `LeftDock`
- `RightTacticalColumn`
- `BottomCommandDeck`
- `QuickAccessStrip`
- `MapViewport`
- `NotificationLayer`

### Map

- `StarNode`
- `StarNodeLabel`
- `StarTypeIcon`
- `ShipOrbitRenderer`
- `LaneRenderer`
- `OrderPathRenderer`
- `FleetSurgeEffect`
- `TerritoryRegionRenderer`
- `LaneTerritoryCorridor`
- `FrontlineOverlay`
- `Minimap`
- `MapTooltip`

### Interaction

- `StarSelectionRing`
- `DragOrderPreview`
- `OrderBreadcrumb`
- `CancelOrderControl`
- `ContextOrderWheel`
- `GroupOrderPalette`
- `OrderSplitControl`
- `TransferPercentageControl`
- `RetreatScatterControl`
- `DeferredOrderGhost`

### Tactical panels

- `LeaderboardPanel`
- `LeaderboardBadge`
- `StarViewPanel`
- `StarTypeDossier`
- `ActiveDamagedShipMeter`
- `CombatPressureWidget`
- `CaptureRiskIndicator`
- `TickPhaseIndicator`
- `RegionSummaryCard`
- `PortalStatusPanel`

### Settings and overlays

- `SettingsRibbon`
- `ThemeControlBlock`
- `ThemeLibraryList`
- `OverlayControlPanel`
- `LayerChecklist`
- `DiagnosticsPanel`
- `AccessibilityPanel`
- `MapLegendPanel`

### Events

- `AlertToastStack`
- `Battlefeed`
- `CombatRecapCard`
- `ObjectivePanel`
- `TimelineControl`
- `PostMatchRecap`

### Roadmap

- `ConstellationObjectiveSystem`
- `ResearchTreePanel`
- `StarbaseBuildPanel`
- `ShipTypeCompositionPanel`
- `CampaignSectorPanel`
- `MapEditorToolset`
- `ThemeEditorToolset`

---

## 21. Final Recommendation

Build the UI system around this hierarchy:

1. **Map first:** star graph, lanes, territory, ship state, orders.
2. **Intent second:** persistent orders, drag chains, deferred orders, cancellation.
3. **Pressure third:** pinning, active/damaged states, capture risk, repair suppression.
4. **Context fourth:** selected star, leaderboard, tick/speed, objectives.
5. **Tools fifth:** overlays, settings, diagnostics, theme controls.
6. **Roadmap sixth:** constellations, structures, research, portals, ship classes, campaign.

The most important reusable idea from all visual explorations is not any single theme. It is the **coherent command surface**: the playfield is the main instrument, and every HUD component exists to make the graph’s dynamic flow/pressure system easier to read, command, and enjoy.

