

# Tech Stack Compliance

## CRITICAL: This project uses **Bun** as its package manager and runtime.

**ALWAYS use:**
- `bun install` (not npm install)
- `bun run dev` (not npm run dev)
- `bun run build` (not npm run build)
- `bun run <script>` (not npm run / npx)
- `bun add <package>` (not npm install <package>)
- `bunx <tool>` (not npx <tool>)

**In documentation, examples, and README files:**
- Always reference `bun`, never `npm` or `npx`

## Full Stack
| Layer | Technology |
|-------|-----------|
| **Runtime/PM** | Bun |
| **Frontend** | SvelteKit (Svelte 5 with Runes) |
| **Rendering** | PixiJS (WebGL canvas) |
| **Game Engine** | Custom stateless tick processor |
| **Multiplayer** | Colyseus |
| **Monorepo** | `common/` · `pax-fluxia/` · `pax-server/` |
