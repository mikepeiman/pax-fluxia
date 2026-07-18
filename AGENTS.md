# Thinking — primary control (read first, applies to everything)

Thinking is asking a question and then **finding out** the answer — by reading the
code, running a probe that actually measures the thing, or asking — and **testing
that the answer is true**. Thinking is NOT guessing, NOT assuming, and NOT
concluding because a conclusion is available or convenient. Concluding ≠ thinking.
Assuming ≠ thinking.

A conclusion you have not verified is a hypothesis, not a fact. Say so.

Rules (enforce these on yourself before you speak or act):

1. **Separate observation / hypothesis / guess, and label them.** "I observed X"
   requires evidence you actually gathered. "I hypothesize X" means untested.
   Never present a hypothesis or a guess as a conclusion. If you don't know, say
   "I don't know yet" — then go find out.

2. **No claim without verification.** Before asserting a cause or fact:
   (a) write the claim; (b) write what evidence would confirm OR refute it;
   (c) obtain that evidence; (d) only then assert — otherwise report it as still
   unverified. Reasoning forward from an assumption is not evidence.

3. **Verify the instrument before you trust the reading.** Confirm your probe
   actually measures the real thing in the relevant context before concluding
   anything from it. A reading that contradicts the user's direct, repeated
   observation is most likely a broken instrument — fix/replace the instrument;
   do not use it to override the user.

4. **Ground truth wins.** The user's direct observation and the actual source code
   outrank any convenient signal, prior belief, or tool output. On conflict, the
   signal is suspect, not the ground truth.

5. **Do not assert about anything you have not verified — including the user.**
   Take the user's words literally. Do not tell them what they mean, feel, or are
   "really" saying. If unsure, ask.

6. **When you catch yourself concluding, assuming, or pattern-matching: stop.**
   Convert it into a question you can answer by finding out, answer that question
   against ground truth, then proceed.

7. **One reliable probe beats ten fast guesses.** If you cannot measure the real
   thing, build the instrument that can (e.g. log the real state in the app the
   user is actually running) instead of guessing from a proxy.

---

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Current graph scope: `graphify-out/graph.json` is an AST-only source graph built from `common/src`, `pax-server/src`, and `pax-fluxia/src` source files. It excludes docs, HTML prototypes, JSON theme/config data, static assets, and semantic/LLM extraction. Use it for code-structure discovery; use `rg` and source reads for exact text, docs, config data, and verification.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code in `common/src`, `pax-server/src`, or `pax-fluxia/src`, run `bun run agentic:graphify:build` to rebuild the code-only graph. Do not use `graphify update .` for this repo unless the extraction scope is changed deliberately; the root contains docs, prototypes, config data, assets, and ignored paths that do not match the tested graph.

---

## Project — Pax Fluxia

Real-time multiplayer galactic strategy game. Monorepo, Bun-only, Windows/PowerShell.

| Package | Stack | Role |
|---|---|---|
| `pax-fluxia/` | SvelteKit 5 + PixiJS 8 + TypeScript, Tauri 2, adapter-static SPA | Client (HUD, menu, settings, render, simulation host) |
| `pax-server/` | Colyseus 0.15 + Bun | Multiplayer server |
| `common/` | `@pax/common` | Shared schema/config |

### Architecture boundaries (do not blur)

- **Render engine** (`pax-fluxia/src/lib/components/game/GameCanvas.svelte`, `lib/renderers`, `lib/territory`, `lib/fx`) — PixiJS/WebGL canvas. Out of scope for UI redesigns.
- **UI chrome** (`lib/components/{game,game-hud,ui/hud,ui/main-menu,ui/settings}`, `lib/design-system`) — Svelte DOM. The redesign target.
- **Simulation/netcode** (`lib/stores/gameStore`, `multiplayerStore`, `activeGameStore`) — UI reads these; do not move sim behavior into UI stores.
- **Settings data layer** (`lib/components/ui/settingsStore.svelte.ts`, `panelSync.ts`, `settingsDefs.ts`, `settingsRegistry.ts`) — recently rebuilt and test-guarded; redesign presentation, not the data layer.
- **Shared tokens** (`lib/design-system/pax-theme.css` Tier 1+2, `app.css`) — see `.agent/docs/engineering/DESIGN_SYSTEM_TOKENS.md`.

### Authoritative commands (Bun only; PowerShell — never chain with `&&`)

```powershell
bun install                                   # install
bun run dev                                   # full stack (client+server) via tools/dev/dev-full.ts
bun run dev:client                            # client only (vite dev, port 1420)
bun run dev:server                            # server only
bun run --cwd pax-fluxia check                # svelte-check (0 errors/0 warnings expected)
bun run --cwd pax-fluxia build                # vite production build (adapter-static)
bun test --cwd pax-fluxia <path>              # Vitest (no `test` script in package.json)
bun run --cwd pax-fluxia tauri dev            # Tauri dev
bun run --cwd pax-fluxia tauri build          # Tauri release build
bun run agentic:graphify:build                # rebuild code-only graph after structural changes
```

Note: `bun --cwd <dir> run <script>` is INVALID in Bun 1.3.5 — `--cwd` must follow `run` (`bun run --cwd <dir> <script>`). Tests run via `bun test --cwd <dir>`, not `bun run test`.

### Project invariants

- **Bun only.** Never `npm`/`npx`/`yarn` for the project. (`npx` is used only to launch Devin MCP servers, not to build the app.)
- **No raw `console.log`** — use `import { log } from '$lib/utils/logger'` (`log.sys/state/data/error/...`), gated by `logFlags` and the in-app Logging panel.
- **Sliders read `panel.xxx`** ($state), never `GAME_CONFIG` in templates. See `.agent/AGENT.md` §3.4.
- **Never remove user-facing controls** tied to `GAME_CONFIG` without explicit instruction.
- **Protected persistence** — never clear `pax_savedMaps`, `pax_savedGames`, gameplay preset payloads (`pax-game-themes`, `pax_composedThemes`, `pax_categoryThemes_*`, `pax_starredThemes_*`), or map-editor storage (`pax-map-editor-*`). Use `clearResettableSettingsStorage` for resets.
- **Never push to `live`.** Commit by explicit pathspec (shared index); push to `origin/master` after committing.
- **Game time in game code** uses `gameNowMs`/FX clock, not `performance.now()`.
- **Ground truth wins.** User observation and source code outrank tool output. Don't claim fixed without evidence; say "implemented; please verify."

### Files/outputs agents must not modify

- `graphify-out/**` — generated; rebuilt by `bun run agentic:graphify:build`.
- `.agent-harness/**` — Atlas harness state/cache.
- `common/resources/settings-live/current-settings.json` — live settings snapshot; do not waste time on it (per `.agent/AGENT.md`).
- `.claude/worktrees/**` — linked worktrees.
- `bun.lock` — only via `bun install`.
- Generated build output: `build/`, `dist/`, `.svelte-kit/`.

### Tooling integrations (configured in `.devin/`)

- **Graphify** — consult BEFORE broad grep/file-reading when: learning an unfamiliar subsystem, tracing calls/imports/data flow, planning cross-file changes, estimating refactor impact, or finding architectural hubs. Use `graphify query "<question>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concept>"`. Refresh after structural changes only.
- **Context7 MCP** — verify unfamiliar or version-sensitive library APIs (Svelte 5, Ark UI, PixiJS 8, Tailwind 4, Tauri 2, Vitest 4) through Context7 before implementing. Add a free `CONTEXT7_API_KEY` to `.devin/config.local.json` (gitignored) for higher limits.
- **GitHub MCP** — read-only remote server for issues/PRs/reviews/checks/Actions. Use native `git` for local status/diff/commit/branch/history. Requires one-time `devin mcp login github` (browser OAuth).
- **Playwright MCP** — UI reproduction/verification for the SvelteKit DOM chrome. Does NOT understand PixiJS/WebGL/canvas game state — use deterministic tests, debug-state APIs, and screenshots for canvas behavior.
- **Atlas Harness MCP** (already configured globally) — guardrailed file/git/exec with rule enforcement; see `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md`.

### Verification protocol (every implementation task)

1. Inspect Graphify and relevant source.
2. State affected systems and acceptance criteria.
3. Make the smallest coherent change.
4. Run relevant checks: `bun run --cwd pax-fluxia check`, targeted `bun test --cwd pax-fluxia <path>`, `bun run --cwd pax-fluxia build` if routes/imports/tokens/bundling changed.
5. Review the resulting diff.
6. Report: commands run, results, remaining risks, files changed. Say "implemented; please verify" for user-visible changes.

### Work isolation

One agent per working tree. Before editing, read and claim on `.agent/intra-agent-coordination.md`. Commit by explicit pathspec. Release the claim when done. See `.agent/AGENT.md` for the full master context.
