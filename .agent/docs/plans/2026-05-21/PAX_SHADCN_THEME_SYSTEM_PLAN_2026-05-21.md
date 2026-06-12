# Pax Fluxia Shadcn Theme System Plan - 2026-05-21

## Purpose

Bring the user's high-level Pax Fluxia shadcn theme-system approach to implementation readiness, while keeping the HUD redesign direction intact: one authored game-native HUD style, protected playfield, coherent shell tokens, wrapper-owned components, and no uncontrolled generator overwrite of existing CSS.

## Current Repo Reality

- Client app is already SvelteKit, not plain Svelte: `pax-fluxia/package.json` uses `@sveltejs/kit`, `@sveltejs/adapter-static`, and `sveltekit()` in Vite.
- It is configured as a static SPA for Tauri, not a server-rendered SvelteKit app: `pax-fluxia/src/routes/+layout.ts` sets `ssr = false`, and `pax-fluxia/svelte.config.js` uses `adapter-static` with `fallback: "index.html"`.
- Tauri builds static output from `pax-fluxia/build` via `beforeBuildCommand: "bun run build"` and `frontendDist: "../build"`.
- Tailwind is currently absent: no Tailwind dependency, config file, `postcss.config`, `components.json`, or `@tailwind` directives were found in the current worktree.
- shadcn-svelte is not installed or initialized.
- Existing theme files are settings snapshots that apply `GAME_CONFIG` values. They are not a HUD visual preset system.
- Existing HUD styles and tokens live in `pax-fluxia/src/app.css`; this file must not be overwritten by setup tooling.

## Architecture Decision

Use shadcn-svelte as editable primitive source, not as the game HUD API.

```text
shadcn-svelte generated primitives
  -> pax-fluxia/src/lib/components/ui/shadcn/

Pax-owned wrappers
  -> pax-fluxia/src/lib/components/ui/pax/

Pax HUD theme and layout preset state
  -> pax-fluxia/src/lib/components/game-hud/theme/

Theme CSS and token bridges
  -> pax-fluxia/src/lib/styles/themes/
```

Rules:

- Active HUD components import Pax wrappers only.
- Only Pax wrappers import raw shadcn primitives.
- Existing settings themes remain supported.
- Add a separate `PaxHudThemePreset` type for authored HUD visuals, layout defaults, density, shell style, icon style, motion profile, and optional settings patches.
- Apply visual themes through root data attributes on the real HUD root, not a nested settings panel.
- Preserve user dock/collapse/layout overrides when switching themes unless the user explicitly applies the theme layout.
- Bridge existing `--hud-*` tokens to new `--pf-*` tokens instead of doing a risky all-at-once rename.

## SvelteKit, Colyseus, And Tauri Implications

Do not add "full SvelteKit server app" behavior for this pass. The project already uses SvelteKit as the frontend router/build layer, with SSR disabled and static output for Tauri.

Safe SvelteKit usage:

- Svelte routes, layouts, stores, and client components.
- `adapter-static` SPA output.
- Client-only HUD/theme code.
- Dev-only preview routes such as a HUD Theme Lab, if they do not expose secrets and can safely ship or be gated.

Avoid for Tauri/Steam static builds:

- Server `load` as a runtime dependency.
- `+server.ts` endpoints as required production APIs.
- SvelteKit form actions, server cookies/sessions, or server-only modules.
- Assuming Vite dev middleware exists in packaged builds.

Colyseus has no inherent conflict with this setup if it remains the separate authoritative multiplayer server and the Svelte/Tauri client connects through `@colyseus/sdk` over WebSocket.

Gotchas:

- Production must use an explicit Colyseus URL, preferably `wss://`, not hard-coded localhost.
- Server origin/TLS policy must allow the Tauri WebView client.
- If Steam distribution needs an embedded local server, use a Tauri sidecar deliberately; that adds process lifecycle, port, firewall, updater, and crash-recovery work.
- Do not move authoritative Colyseus gameplay logic into SvelteKit routes.
- Dev-only Vite endpoints in `vite.config.js` are not available in packaged Tauri output.

Tauri/Steam fit:

- The current static SPA SvelteKit setup bundles well with Tauri because it emits static HTML/CSS/JS.
- Tailwind and shadcn-svelte are compatible with this model because Tailwind is build-time CSS generation and shadcn components are source files.
- Main release risks are not SvelteKit itself; they are asset paths, CSP hardening, WebSocket connectivity, update strategy, and whether the multiplayer server is remote or bundled.

## Implementation Plan

### Phase 0 - Tailwind Recovery Audit

Before reinstalling Tailwind, inspect history so the merge agent understands whether Tailwind removal was deliberate or accidental.

Recommended commands:

```powershell
git log --all -- pax-fluxia/package.json pax-fluxia/bun.lock pax-fluxia/tailwind.config.* pax-fluxia/postcss.config.* pax-fluxia/src/app.css
git log --all -S "tailwind" -- pax-fluxia
git log --all -S "@tailwind" -- pax-fluxia
```

Output should be summarized in the session handoff before implementation.

### Phase 1 - Protected Tailwind And shadcn Setup

Goal: add setup without changing active HUD behavior.

Tasks:

- Add Tailwind in the smallest SvelteKit-compatible way using Bun only.
- Initialize shadcn-svelte so generated primitives land in `src/lib/components/ui/shadcn`.
- Do not point any generator at `src/app.css` if it would overwrite existing app/HUD tokens.
- Create or review `components.json`.
- Add only initial primitives: `button`, `badge`, `separator`, `tooltip`, and maybe `input`.
- Build after setup.

Acceptance:

- `src/app.css` is preserved.
- App builds.
- Active HUD imports are unchanged.

### Phase 2 - Pax Wrapper Foundation

Goal: establish the only allowed component API for game HUD work.

Create:

- `PaxButton`
- `PaxIconButton`
- `PaxBadge`
- `PaxPanel`
- `PaxTooltip`
- `PaxSelect` when needed by Theme Library
- wrapper barrel `src/lib/components/ui/pax/index.ts`

Acceptance:

- New HUD work imports from `$lib/components/ui/pax`.
- Search gate catches raw `$lib/components/ui/shadcn` imports outside wrapper files.
- Wrappers consume CSS variables, not one-off hard-coded colors.

### Phase 3 - HUD Token And Preset Layer

Goal: allow visual theme switching before active HUD migration.

Create:

- `src/lib/styles/themes/hud-theme-base.css`
- `src/lib/styles/themes/starglass-prime.css`
- `src/lib/styles/themes/neon-arcade.css`
- `src/lib/styles/themes/aurelia-drift.css`
- `src/lib/styles/themes/broadcast-minimal.css`
- `src/lib/components/game-hud/theme/theme-presets.ts`
- `src/lib/components/game-hud/theme/layout-presets.ts`
- `src/lib/components/game-hud/theme/hud-theme-store.svelte.ts`
- `src/lib/components/game-hud/theme/root-attributes.ts`

Preset roles:

- `Starglass Prime`: default premium heroic sci-fi HUD.
- `Neon Arcade`: high-energy competitive theme.
- `Aurelia Drift`: warmer prestige theme.
- `Broadcast Minimal`: low-chrome spectator/screenshot theme.

Acceptance:

- Changing `data-pax-theme` changes shell visuals.
- Star/player colors remain game signals, not generic UI decoration.
- Existing `--hud-*` consumers still work through aliases.

### Phase 4 - Theme Library Integration

Goal: integrate authored HUD presets without breaking existing imported/user settings themes.

Tasks:

- Show authored HUD presets separately from settings-snapshot themes, or with an unambiguous segment label.
- Preserve existing import/export behavior.
- Add apply modes: visual only, keep current layout, use theme layout.
- Protect user layout overrides by default.
- Theme list must scroll, sort newest first where applicable, truncate long names with ellipsis, and avoid category clutter for now.

Acceptance:

- Existing user themes still apply.
- Authored HUD presets apply visual root attributes.
- Theme layout does not silently overwrite user dock/collapse choices.

### Phase 5 - Theme Lab

Goal: make UI QA possible without entering a live match.

Create:

- `src/routes/dev/hud-theme-lab/+page.svelte`
- `src/routes/dev/hud-theme-lab/mock-hud-data.ts`

Theme Lab should render:

- all starter themes
- all layout presets
- wrappers
- topbar, settings ribbon, leaderboard, gamespeed, Star View, command tray, quick access, and Theme Library states
- long player names, large numbers, long theme names, collapsed and expanded states

Acceptance:

- Visual QA works at 1280x720, 1600x900, and 1920x1080.
- The HUD reads as one authored game interface instead of mixed app fragments.

### Phase 6 - Active HUD Migration

Recommended order:

1. Theme Library and selector.
2. Quick access icons.
3. Gamespeed.
4. Leaderboard.
5. Star View shell and selection wiring only.
6. Settings ribbon.
7. Topbar.
8. Bottom selected-star command tray.

Rules:

- Keep combat-value semantics out of this pass.
- Star View must follow selected-star state.
- No emoji, corrupted glyphs, mixed symbol fonts, or browser-default fieldset/legend shells.
- Quick access has no visible `Quick Tools` heading.
- `Load Map` does not belong in the Theme cluster.

## First Implementation PR Scope

Keep the first source PR narrow:

- Tailwind recovery audit summary.
- Tailwind and shadcn-svelte setup.
- `components.json`.
- first primitive batch.
- first Pax wrappers.
- base token bridge.
- Theme Lab shell with static examples.

Do not migrate `GameContainer.svelte`, `GameSettingsPanel.svelte`, or live HUD behavior in the setup PR.

## Acceptance Gates

- `bun run --cwd pax-fluxia build` passes.
- `bun run --cwd pax-fluxia check` passes or failures are documented if pre-existing.
- No HUD file imports raw shadcn primitives outside Pax wrappers.
- No setup command overwrites `src/app.css`.
- Tauri static build still points to `../build`.
- No production-critical code depends on SvelteKit server routes.
- No Colyseus server authority is moved into frontend routes.

## Open Decisions

- Whether to restore Tailwind from historical project config if it exists, or add fresh Tailwind setup.
- Whether authored HUD presets appear in the existing Theme Library list or a distinct HUD Presets segment.
- Whether Theme Lab routes ship in production builds or are gated to development.
- Whether Steam release uses a remote Colyseus server only or a Tauri sidecar for local/offline modes.
