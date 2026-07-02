<p align="center">
  <img src="https://img.shields.io/badge/status-playable%20alpha-blueviolet?style=for-the-badge" alt="Status: Playable Alpha">
  <img src="https://img.shields.io/badge/stack-svelte%205%20%C2%B7%20pixi%208%20%C2%B7%20colyseus-00e0ff?style=for-the-badge" alt="Stack">
  <img src="https://img.shields.io/badge/runtime-bun-f472b6?style=for-the-badge" alt="Runtime: Bun">
  <img src="https://img.shields.io/badge/desktop-tauri-ff6b35?style=for-the-badge" alt="Desktop: Tauri">
</p>

# 🌌 Pax Fluxia

> **Real-time conquest by attrition.** Command the fleets orbiting your stars, apply relentless
> pressure to enemy fronts, and grind them down tick by tick — destroying ships, nursing your repair
> pool, and turning broken defenders into captured territory. Every star is production; every front
> is a decision; the last commander holding a star wins.

**Pax Fluxia** is a real-time, tick-based strategy game of territorial conquest — a modern descendant
of **Pax Galaxia**. You issue standing orders from the stars you hold across a network of lanes, and
every tick the whole sector resolves at once: stars produce ships, locked fronts trade damage, and
the wounded crawl back toward repair. There is no single decisive battle — there is **pressure**.
Commit to a front and *both* sides bleed continuously: some ships destroyed for good, the rest
**disabled** into a slowly-healing pool. You take a front by out-massing and out-repairing it while
feeding reinforcements from the rear — and you lose one by overcommitting and leaving another exposed.

Break a defender and its star **flips to you**; the survivors **scatter** down escape lanes or
**retreat** if they had somewhere to run — some captured, some destroyed. A capture hands you that
star's production and can spring a **deferred order** you pre-placed, so one breakthrough can cascade
across the map. The depth is in *where* you apply pressure and *when* you commit: juggling several
attrition fronts at once, exploiting **star specializations** (production, logistics, repair, defense,
attack), defending the **territory** that is simultaneously your economy and your exposure, and
reading the balance of force before it tips.

It runs on a **single deterministic engine shared between client and server**, so a solo match
against the AI and a live multiplayer game are the *same game*, tick for tick.

---

## ⚔️ How it actually plays

You start with a cluster of stars. Every star quietly builds ships. You give orders; the sector does
the rest.

- **Select** a star you own, **click a connected star** to give it a standing order.
- Order a **friendly** star → **reinforce** it: ships physically stream down the lane.
- Order an **enemy** star → **attack** it: your ships *hold position* and project force across the
  frontier, a pressure wave surging and receding between the two stars each tick.
- **Right-click** cancels. **Ctrl-click** issues a one-shot order. **Drag from any star** — even one
  you don't own yet — to pre-place a **deferred order** that fires the instant you capture it, so you
  can choreograph a whole offensive before the first shot lands.

Combat is **symmetric attrition**: when two stars are locked, *both* sides take damage every tick —
some ships destroyed outright, the rest **disabled** into a repair pool that trickles back to active
if the star survives. There are no magic lane ambushes and no first-strike advantage; you win a front
by out-massing and out-repairing it, or by out-maneuvering it entirely.

When a defender finally breaks, the star **flips to your color** and its survivors **scatter** down
escape lanes (or make an orderly **retreat** if their owner had somewhere to run) — some captured,
some lost to the void. Chain a deferred order off the capture and your momentum never stops.

**Last commander holding a star wins.** (Configurable victory thresholds are on the roadmap — see below.)

---

## ✨ What makes it distinct

**Attrition you manage, not micro you spam.** Battles aren't clicks — they're sustained fronts. Both
sides bleed every tick, damage splits into permanent kills and repairable wounds, and repair slows
under fire, so winning a front is a *rate* problem: can you destroy and reinforce faster than they
can heal and feed? That turns every engagement into a commitment decision, not a coin flip.

**Territory is the strategy, not the scenery.** Your holding is at once your economy (every star
produces) and your liability (every frontier is a front you must defend). Lanes are exclusive — a
contested lane belongs to at most two players — so fronts form at real boundaries you can pressure,
pinch, or abandon. **Deferred orders** let you pre-stage an offensive so a single breakthrough
cascades across the map.

**A sector you can read at a glance.** Because ownership is computed geometry — fields resolve into
regions, regions meet at frontiers, frontiers re-flow through conquest as continuous shapes — the map
*is* a live strategic readout: you can see pressure massing before the numbers spell it out. The
renderer ships **multiple territory "families"** you can switch between live, each a different way of
drawing the same underlying truth:

| Render family | Character |
|---|---|
| **Power Voronoi (PVV4)** | Crisp weighted-Voronoi regions — the exact-geometry reference look |
| **Cell Grid · Phase Edges · Ember Lattice** | Dense ownership mass with contour-derived, smoothed frontier seams |
| **Phase Field** | Soft field-based ownership shading |
| **Grid Gradient** | Shader-driven gradient fills |
| **Metaball · Perimeter Field** | Organic blob / perimeter-sampled boundary styles |

Every family shares the same HSLA fill/border language and the same conquest-transition pipeline, so
you can dial the sector's entire visual identity — from clinical vector borders to a molten neon
haze — without touching gameplay.

**Six star archetypes.** Grey (baseline), **Yellow** (2× production), **Blue** (2× logistics),
**Purple** (2× repair), **Red** (2× defense), **Green** (2× attack). A neutral faction holds real
territory across the map until someone takes it. Classic *Pax Galaxia* maps import directly,
including **portal stars** — capture one and you seize every star in its portal group at once,
bridging otherwise-disconnected regions.

**A deep, live tuning surface.** Nearly every number in the game is a slider. Combat, timing, travel
and orbit motion, AI aggression and strategy, territory rendering, ship look, audio — all adjustable
in-game and saveable as **themes**. A unified Search jumps to any control (and pulses it so you can
find it); render mode lives on the topbar so the settings surface stays stable whatever you're
running.

**Fleet swarms with weight.** Ships orbit their stars in layered rings, depart from the near side,
arc down lanes, and settle into formation — rendered through a batched particle pool that stays fluid
into the tens of thousands of ships, with density-driven color grading so a fortress *reads* as a
fortress.

---

## 🧠 The AI

Opponents evaluate every star each tick and commit to fronts using a three-zone attack model
(must-attack / may-attack / desist) with anti-oscillation stickiness, plus selectable postures
— **aggressive, opportunistic, expansionist, defensive** — and fully tunable thresholds. Smarter,
star-type-aware and multi-source behaviors are on the roadmap.

---

## 🛠️ Architecture

One engine, two front ends, zero divergence.

| Layer | What it is |
|---|---|
| **Shared engine** | `common/` — `@pax/common`: the authoritative, deterministic tick engine + AI + types. **No client duplicate.** Client renders it; server arbitrates it. |
| **Client** | `pax-fluxia/` — SvelteKit 5 (Runes) + PixiJS 8 (WebGL). Presentation only. |
| **Server** | `pax-server/` — Colyseus authoritative rooms (lobby browser, mid-game join with AI-slot takeover). |
| **Desktop** | Tauri build — native `.exe` / `.msi` / installer. |

Territory rendering follows a strict **4-layer pipeline** — *Ownership → Geometry → Transition →
Presentation* — so "who owns what" never gets tangled with "how it's drawn." Because the simulation
is deterministic, a replay of the same inputs reproduces the same tick-by-tick outcome, which is how
the project regression-tests gameplay.

---

## 🚀 Getting started

**Prerequisite:** [Bun](https://bun.sh) 1.0+. (This project is Bun-only — no npm/npx/yarn.)

```bash
git clone https://github.com/mikepeiman/pax-fluxia.git
cd pax-fluxia
bun install

# Single-player (client only)
cd pax-fluxia
bun run dev            # open the printed localhost URL
```

**Multiplayer (local):**

```bash
# Terminal 1 — Colyseus server (listens on :2567)
cd pax-server
bun run src/index.ts

# Terminal 2 — client
cd pax-fluxia
bun run dev
```

The client auto-detects a local Colyseus server on `:2567`; the lobby browser lists open rooms, and
you can join a game already in progress by taking over an AI seat.

---

## 📁 Project structure

```
pax-fluxia/
├── common/            # @pax/common — shared deterministic engine, AI, types, schemas
├── pax-fluxia/        # SvelteKit 5 + PixiJS 8 client
│   └── src/lib/
│       ├── components/    # HUD, settings surface, game canvas
│       ├── territory/     # render families, frontier geometry, conquest transitions
│       ├── renderers/     # stars, lanes, ships (particle-pool), overlays
│       ├── config/        # game.config.ts — the tunable-variable source of truth
│       ├── stores/        # game / multiplayer / animation state (Svelte 5 runes)
│       └── utils/         # telemetry logger, helpers
├── pax-server/        # Colyseus authoritative game + lobby rooms
└── .agent/docs/       # design specs, mechanics, feature tracker, session history
```

---

## 🗺️ Roadmap

**Near-term**
- Territory conquest-transition performance pass (immediate correct ownership + deadline-bounded
  decoration; two-stage presentation) and Frontier-FX blending with the smooth frontier.
- Configurable victory conditions (win by ship count, star count, or specific targets) with a
  "view results or keep playing" endgame.
- Custom map editor (reproducible territory / corridor / conquest scenarios).

**Gameplay systems**
- Deeper AI: star-type awareness, multi-source coordination, frontline & surround behaviors, saved AI personalities.
- Orbital structures (satellites, shields, mines), a production/economy layer, and star upgrades.
- Travel-time game mode: at >1× travel, fleets exist mid-lane and opposing fleets can pass — or fight — en route.

**Presentation & platform**
- Scatter/retreat and capture VFX language; conquest flair (pulsing frontiers, heartbeat stars).
- Sound design (tick, conquest, arrival) and selectable visual style packs.
- Community content hub for sharing themes and maps; multiplayer deployment.

*(Full living tracker: [`.agent/docs/project/features/FEATURE_STATUS.md`](.agent/docs/project/features/FEATURE_STATUS.md). Cross-day task-of-record: [`.agent/docs/MASTER_TASK_LIST.md`](.agent/docs/MASTER_TASK_LIST.md).)*

---

## 📜 Documentation

| Document | Description |
|---|---|
| [Mechanics](.agent/docs/game/design/MECHANICS.md) | Definitive spec of every gameplay rule |
| [Game Specification](.agent/docs/game/design/GAME_SPECIFICATION.md) | System-level technical spec |
| [Terminology](.agent/docs/game/design/TERMINOLOGY.md) | Territory / frontier / front / holding glossary |
| [Territory Architecture](.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md) | The 4-layer rendering pipeline |
| [Feature & Regression Tracker](.agent/docs/project/features/FEATURE_STATUS.md) | Current state of everything |

---

## 📄 License

Proprietary — **All Rights Reserved.** No permission is granted to use, copy, modify, distribute, or
create derivative works without prior written permission from the copyright holder. See
[LICENSE](LICENSE).

---

<p align="center">
  <sub>Built in the neon void by <a href="https://github.com/mikepeiman">@mikepeiman</a></sub>
</p>
