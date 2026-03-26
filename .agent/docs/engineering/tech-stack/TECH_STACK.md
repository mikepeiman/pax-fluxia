# Pax Fluxia — Tech Stack & Documentation

## Core Stack

| Technology | Version | Docs |
|-----------|---------|------|
| SvelteKit | 5.x | https://svelte.dev/docs/kit |
| Svelte | 5.x (Runes) | https://svelte.dev/docs/svelte |
| Vite | 6.x | https://vite.dev/guide/ |
| TypeScript | 5.7 | https://www.typescriptlang.org/docs/ |
| Bun | 1.x | https://bun.sh/docs |

## Networking

| Technology | Version | Docs |
|-----------|---------|------|
| Colyseus Server | ^0.17.8 | https://docs.colyseus.io/ |
| Colyseus SDK | ^0.17.31 | https://docs.colyseus.io/ |
| @colyseus/schema | ^4.0.0 | https://docs.colyseus.io/ |

### Key Colyseus APIs
- **Room listing**: `client.getAvailableRooms("game_room")` — requires `.enableRealtimeListing()` on server-side `.define()`
- **Room metadata**: `this.setMetadata({...})` in Room class — exposed to room listing
- **Match-maker (server)**: `matchMaker.create()`, `.joinOrCreate()`, `.query()` — server-side only
- **Schema**: Use `defineTypes()` instead of decorators when using esbuild/tsx

## Rendering

| Technology | Version | Docs |
|-----------|---------|------|
| PixiJS | 8.x | https://pixijs.com/8.x/guides |

### Key PixiJS APIs
- `ParticleContainer` — for ship rendering
- `Graphics` — for connections, orbs, drag preview
- `Container` — for z-ordering layers

## Architecture References
- Design decisions: `.agent/docs/project/decisions/DECISIONS.md`
- Feature status and roadmap: `.agent/docs/project/features/FEATURE_STATUS.md`
- Territory architecture: `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
