# Pax Fluxia — HUD package

A complete Svelte 5 + Tailwind v4 + Ark UI implementation of the Aurelia Drift
command interface: top bar with faction wing plates and tick clock, command
rail, overview, tactical standings, star view with order management, game
speed, event feed, overlay legend, mode dock, zoom cluster, and the cancel-order
dialog. Tick-based throughout (`/tick`, `Tick N` — no turns).

The repo is also a runnable demo: `npm install && npm run dev` shows the full
HUD over a stand-in starfield where your PixiJS map would render.

## Drop-in integration

1. **Copy the library** into your project:

   ```
   src/lib/hud/        → your src/lib/hud/
   src/hud-theme.css   → your src/ (import it once, e.g. in main.ts)
   ```

2. **Install the one runtime dependency:**

   ```sh
   npm install @ark-ui/svelte
   ```

   Requirements you likely already meet: `svelte >= 5.20`, `tailwindcss >= 4`
   via `@tailwindcss/vite` (no `tailwind.config.js` needed — all tokens live in
   `hud-theme.css` under `@theme`).

3. **Mount the HUD** above your map canvas:

   ```svelte
   <script lang="ts">
     import { PaxHud, hud } from '$lib/hud';
   </script>

   <!-- your PixiJS canvas, z-index below 30 -->
   <PaxHud />
   ```

   The root is `position: fixed; inset: 0; pointer-events: none` — only the
   panels themselves capture the pointer, so map interaction passes through.

4. **Wire the engine bridge.** All HUD intents flow through `hud.bridge`:

   ```ts
   import { hud } from '$lib/hud';

   hud.bridge = {
     onSetSpeed: (s) => sim.setSpeedMultiplier(s),
     onSetMode: (m) => map.setInteractionMode(m),
     onSelectStar: (id) => map.focusStar(id),
     onIssueOrder: (kind, starId) => sim.enqueue(kind, starId),
     onCancelOrder: (orderId) => sim.abort(orderId),
     onOverlayChange: (key, on) => map.layers[key].visible = on,
     onZoom: (z) => camera.zoomTo(z),
     onRecenter: () => camera.home(),
   };
   ```

   Push engine → HUD updates by mutating the store (plain `$state`):

   ```ts
   sim.onTick((t) => {
     hud.tick = t;
     hud.selectedStar = mapStarToSummary(sim.selected);
     hud.pushEvent({ tick: t, tone: 'teal', parts: [{ text: 'Fleet arrived at ' }, { text: 'Orionis', accent: true }] });
   });
   ```

5. **Remove the demo ticker.** `<PaxHud demoTicker />` (used in `App.svelte`)
   drives a fake clock; omit the prop in production and drive `hud.tick` /
   `hud.matchSeconds` from your simulation.

Everything marked `TODO(engine)` or `TODO(HUD)` in
`src/lib/hud/state/hud-state.svelte.ts` is a deliberate stub: settings, stats,
players, bookmarks, objectives rail actions; alerts/messages/diplomacy/victory
topbar trays; and the star-search palette.

## Architecture

```
src/lib/hud/
  index.ts                     barrel — PaxHud, hud store, all panels & primitives
  state/hud-state.svelte.ts    runes store + EngineBridge + stubs
  PaxHud.svelte                full-screen overlay layout
  TopBar / LeftRail / OverviewPanel / TacticalStandings / StarViewPanel /
  GameSpeedPanel / EventFeed / OverlayLegend / BottomDock / ZoomControls /
  CancelOrderDialog
  primitives/
    HudPanel        framed, bevel-cut plate w/ header, collapse, close
    HudButton       teal / gold / ghost / danger command buttons
    IconButton      framed square icon button with diamond badge
    Icon, icons.ts  ~40 hand-authored stroke icons (zero icon deps)
    FactionSigil    procedural Luminara / Vaelari crests
    StatRow, Pips, MeterBar, HudTooltip
```

State is a single `HudState` class (`hud` singleton). Components read it
directly; your engine talks to it through `hud.bridge` and direct mutation.
Prefer multiple HUD instances? `new HudState()` and pass it down yourself —
the singleton is a convenience, not a requirement.

## Design system

Defined entirely in `hud-theme.css`:

- **Tokens** (`@theme`): `void/hull/hull-2/hull-3/line` surfaces, `gold-0..3`
  chrome, `teal-0..3` (Luminara), `amber-0..3` (Vaelari), `ice`, `nova`,
  `danger`, text tiers, glow shadows.
- **Type**: Cinzel (display — title, star names) + Rajdhani (UI labels and
  tabular numerals), loaded via Google Fonts `@import`. Swap the import for
  self-hosted `@font-face` if you ship offline.
- **Ornament utilities**: `bevel` (TL/BR corner cuts, depth via `--bv`),
  `bevel-sym`, `wing-l`/`wing-r` (top-bar plates), `dock-plate`, `hud-label`,
  `hud-num`, plus `.hud-frame*` (1px gradient hairline that survives
  clip-path), `.hud-bracket-*` corner ticks, `.hud-stud` diamonds, and gilded
  `.hud-scroll` scrollbars.

Quality floor built in: visible gold focus rings, `aria` labels/expanded/live
on interactive chrome, `prefers-reduced-motion` honored, panels scroll rather
than overflow at small heights.

## Ark + Shark UI note

Interactive behavior is Ark UI headless parts (`Dialog`, `Menu`, `Tooltip`,
`Checkbox`, `ToggleGroup`) styled with Tailwind data-attribute variants
(`data-[state=on]:…`) — the same composition convention Shark UI uses. Shark
UI itself is not a dependency: its stock styling would fight the bespoke
gold/teal chrome, so the package follows its Ark-plus-Tailwind pattern with
this design system instead. If you already use Shark UI elsewhere, both can
coexist; they share the same Ark foundation.

## Verified

- `npm run check` — svelte-check: 0 errors, 0 warnings
- `npm run build` — vite production build passes (CSS ~50 kB, JS ~251 kB pre-gzip)
