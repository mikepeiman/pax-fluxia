<p align="center">
  <img src="https://img.shields.io/badge/status-alpha-blueviolet?style=for-the-badge" alt="Status: Alpha">
  <img src="https://img.shields.io/badge/engine-custom-ff6b35?style=for-the-badge" alt="Engine: Custom">
  <img src="https://img.shields.io/badge/stack-svelte%20%2B%20pixi%20%2B%20colyseus-00e0ff?style=for-the-badge" alt="Stack">
  <img src="https://img.shields.io/badge/runtime-bun-f472b6?style=for-the-badge" alt="Runtime: Bun">
</p>

# 🌌 Pax Fluxia

> A real-time space conquest strategy game with symmetric combat, territory control, and AI opponents — rendered in a neon-void aesthetic.

**Pax Fluxia** is a fast-paced, browser-based strategy game where players compete to conquer a procedurally generated star map. Command fleets, issue orders, and outmaneuver AI opponents across a network of connected stars.

---

## ✨ Features

| Feature | Status |
|---------|--------|
| **Procedural star maps** with Delaunay-connected topology | ✅ |
| **V4 Symmetric Damage Model** — attritional combat with tunable parameters | ✅ |
| **Real-time game engine** with configurable tick rate | ✅ |
| **AI opponents** with greedy strategy and tunable aggression | ✅ |
| **Combat tuning panel** — live-adjust 15+ combat variables | ✅ |
| **Combat log** with battle grouping, "My Battles" filter, and conquest breakdown | ✅ |
| **Ship production, repair, and conquest mechanics** | ✅ |
| **Scatter/retreat system** on conquest with escape routes | ✅ |
| **Deferred orders** — queue attacks on enemy stars before capture | ✅ |
| **Multiplayer** via Colyseus (local dev) | 🔧 |
| **Ship transfer animations** | 🔜 |
| **Custom map editor** | 📋 |

---

## 🎮 How to Play

1. **Select** a star you own (click)
2. **Order** ships to a connected star (click target)
3. **Right-click** to cancel an order
4. **Ctrl-click** to issue a one-time (non-persistent) order
5. **Conquer** all enemy stars to win

Ships transfer continuously along active orders. Combat resolves automatically when your ships reach an enemy star.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | [SvelteKit](https://kit.svelte.dev/) (Svelte 5 with Runes) |
| **Rendering** | [PixiJS](https://pixijs.com/) — WebGL canvas |
| **Game Engine** | Custom stateless tick processor (shared client/server) |
| **Multiplayer** | [Colyseus](https://colyseus.io/) — authoritative server |
| **Monorepo** | `common/` (shared types + engine) · `pax-fluxia/` (client) · `server/` (Colyseus) |

---

## 🚀 Getting Started

### Prerequisites

- **Bun** 1.0+

### Install & Run

```bash
# Clone
git clone https://github.com/mikepeiman/pax-galaxia-redux.git
cd pax-galaxia-redux

# Install dependencies
bun install

# Start the dev server (single-player)
cd pax-fluxia
bun run dev
```

Open `http://localhost:5173` in your browser.

### Multiplayer (Local Dev)

```bash
# Terminal 1: Start Colyseus server
cd pax-server
bun run src/index.ts

# Terminal 2: Start client
cd pax-fluxia
bun run dev
```

---

## 📁 Project Structure

```
pax-fluxia/
├── common/              # Shared types, schemas, combat logic
│   └── src/
│       ├── combat.ts        # V4 Symmetric Damage Model
│       ├── types.ts         # Canonical type definitions
│       └── schema/          # Colyseus state schemas
├── pax-fluxia/          # SvelteKit client application
│   └── src/lib/
│       ├── components/      # UI + game canvas
│       ├── config/          # game.config.ts (40+ tunable vars)
│       ├── engine/          # GameEngine.ts, AI.ts
│       ├── stores/          # Svelte stores (game state, combat log)
│       └── utils/           # Logger, helpers
├── server/              # Colyseus game server
├── .atlas/              # Project documentation (PRD, specs, decisions)
└── .agent/              # AI agent rules and skills
```

---

## ⚙️ Combat System

Pax Fluxia uses a **V4 Symmetric Damage Model**:

- Both sides deal damage simultaneously each tick
- **5 core variables**: Aggressor Advantage, Damage Per Ship, Lethality, Force Ratio Effect, Conquest Threshold
- Damaged ships contribute fractional defensive value (configurable)
- Conquest triggers **scatter/retreat** — surviving defenders flee to connected escape routes
- All parameters tunable in real-time via the Combat Debug Panel

---

## 🎨 Visual Style

**"Neon Void"** aesthetic — dark space background with glowing star nodes, pulsing ship clusters, and color-coded ownership. Stars are rendered as concentric rings of ship dots orbiting a central glow.

---

## 📜 Documentation

| Document | Description |
|----------|-------------|
| [Game Specification](.atlas/GAME_SPECIFICATION.md) | Complete technical spec for all systems |
| [Development History](.atlas/DEVELOPMENT_HISTORY.md) | Chronological build log and roadmap |
| [Feature Status](.agent/docs/project/features/FEATURE_STATUS.md) | Current state of all features |
| [Design Decisions](.atlas/DECISIONS.md) | Architectural decision records |
| [PRD](.atlas/PRD_ACTIVE.md) | Product requirements document |

---

## 🗺️ Roadmap

- [ ] Ship transfer & combat animations
- [ ] Advanced AI strategies (frontline, tactical surround, backline-and-pounce)
- [ ] Custom map editor
- [ ] Multiplayer deployment (Vercel + Railway)
- [ ] Star type–aware AI behavior
- [ ] Sound effects & music

---

## 📄 License

This project is proprietary and released under an **All Rights Reserved**
license. No permission is granted to use, copy, modify, distribute, or create
derivative works without prior written permission from the copyright holder.

See [LICENSE](LICENSE) for the full terms.

---

<p align="center">
  <sub>Built with 🌌 by <a href="https://github.com/mikepeiman">@mikepeiman</a></sub>
</p>
