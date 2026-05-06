# Multi-Lane Worktree Guide

Last revised: `2026-04-27`

This is the live guide for concurrent worktree work in this repo.

Use this document for:
- lane assignment
- branch/worktree boundaries
- ownership rules
- expected validation

Do not use the dated worktree audit docs as the day-to-day operating sheet. Those remain historical rationale. This file is the current execution guide.

## 1. Goal

The goal is not abstract architecture purity.

The goal is to let multiple agents work in parallel with:
- minimal merge conflicts
- fast-forward-friendly merges when possible
- clear ownership
- predictable instructions
- predictable outputs

## 2. Current Repo Truth

The following splits are now real and authoritative in this working tree.

### 2.1 Render-family primary paths

- `pax-fluxia/src/lib/territory/families/metaball/`
- `pax-fluxia/src/lib/territory/families/metaballGrid/`
- `pax-fluxia/src/lib/territory/families/perimeterField/`

Family-local config now belongs in:
- `pax-fluxia/src/lib/territory/families/metaball/config.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/config.ts`
- `pax-fluxia/src/lib/territory/families/perimeterField/config.ts`

Shared family aggregation remains:
- `pax-fluxia/src/lib/config/territory.config.ts`
- `pax-fluxia/src/lib/territory/families/renderFamilyRegistry.ts`
- `pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts`

### 2.2 UI-surface primary paths

New work must target these primary surfaces:

- main menu: `pax-fluxia/src/lib/components/ui/main-menu/`
- HUD: `pax-fluxia/src/lib/components/ui/hud/`
- map editor surface: `pax-fluxia/src/lib/components/map-editor/`
- landing site surface: `pax-fluxia/src/lib/components/landing-site/`

Backing editor state/model code remains:
- `pax-fluxia/src/lib/editor/`

### 2.3 Compatibility shim rule

These old flat files still exist only as compatibility shims:
- `pax-fluxia/src/lib/components/ui/MainMenu.svelte`
- `pax-fluxia/src/lib/components/ui/menuDefs.ts`
- `pax-fluxia/src/lib/components/ui/menuTheme.ts`
- `pax-fluxia/src/lib/components/ui/Leaderboard.svelte`
- `pax-fluxia/src/lib/components/ui/ResultsModal.svelte`
- `pax-fluxia/src/lib/components/ui/SpeedControls.svelte`
- `pax-fluxia/src/lib/components/ui/StarInfoPanel.svelte`
- `pax-fluxia/src/lib/components/ui/StarNav.svelte`
- `pax-fluxia/src/lib/components/ui/StarsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/StatusBar.svelte`
- `pax-fluxia/src/lib/components/ui/TopBar.svelte`

Rules:
- do not target those shim files for new feature work
- do not add new files back into the old flat layout
- if a caller still uses a shim path, update it when you are already touching that caller for related work

## 3. Shared Choke Points

These files remain the main merge-conflict risk:

- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/config/territory.config.ts`
- `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/stores/themeStore.svelte.ts`

Rules:
- one owner lane per choke point at a time
- everyone else stays behind lane-owned modules
- if you must cross the boundary, keep the change mechanical and call it out explicitly

## 4. Lane Inventory

Use these as the standard lane definitions.

### 4.1 `ai`

Owns:
- `common/src/ai/`
- AI-facing seams in `common/src/engine/`

Typical work:
- decision quality
- aggression and expansion tuning
- difficulty behavior

### 4.2 `gameplay`

Owns:
- `common/src/engine/`
- gameplay truth and mutation in `pax-fluxia/src/lib/stores/`

Primary guarded file:
- `pax-fluxia/src/lib/stores/gameStore.svelte.ts`

Typical work:
- rules
- conquest
- economy
- save/load behavior
- simulation perf

### 4.3 `render-infra`

Owns:
- `pax-fluxia/src/lib/components/game/`
- shared rendering plumbing in `pax-fluxia/src/lib/renderers/`

Primary guarded files:
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`

Typical work:
- frame cadence
- shared presentation
- camera/viewport
- order-arrow shared path
- shared render perf

### 4.4 `render-family/metaball`

Owns:
- `pax-fluxia/src/lib/territory/families/metaball/`

Typical work:
- metaball correctness
- metaball tuning
- metaball performance

### 4.5 `render-family/metaballGrid`

Owns:
- `pax-fluxia/src/lib/territory/families/metaballGrid/`

Typical work:
- startup fill correctness
- density tuning
- ownership wave behavior
- family-local performance

### 4.6 `render-family/perimeterField`

Owns:
- `pax-fluxia/src/lib/territory/families/perimeterField/`

Typical work:
- geometry
- transitions
- playback/debug bundles
- family-local performance

### 4.7 `vfx`

Owns:
- `pax-fluxia/src/lib/fx/`
- `pax-fluxia/src/lib/animations/`
- effect helpers under `pax-fluxia/src/lib/territory/`

Typical work:
- conquest feedback
- animation polish
- event-driven impact and transition visuals

### 4.8 `ui-settings`

Owns:
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/settings/`
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
- `pax-fluxia/src/lib/components/ui/settingsState.ts`
- `pax-fluxia/src/lib/components/ui/panelSync.ts`

Typical work:
- controls
- schemas
- persistence
- presets
- theme/category application wiring

### 4.9 `ui-main-menu`

Owns:
- `pax-fluxia/src/lib/components/ui/main-menu/`

Typical work:
- start flow
- menu presentation
- preview UX
- player/setup flow

### 4.10 `ui-hud`

Owns:
- `pax-fluxia/src/lib/components/ui/hud/`

Typical work:
- commander panel
- top bar
- status readouts
- leaderboard
- results modal
- in-game HUD readability

### 4.11 `ui-map-editor`

Owns:
- surface/UI: `pax-fluxia/src/lib/components/map-editor/`
- backing editor systems: `pax-fluxia/src/lib/editor/`
- route: `pax-fluxia/src/routes/map-editor/`

Typical work:
- map authoring UI
- import/export UX
- validation and selection tools

### 4.12 `ui-landing-site`

Owns:
- `pax-fluxia/src/lib/components/landing-site/`
- landing route wiring in `pax-fluxia/src/routes/+page.svelte`

Optional isolated extension:
- `website_cursor_pencil/`

Typical work:
- marketing-facing landing page
- CTA flow
- website polish

### 4.13 `diag` support lane

Owns:
- `pax-fluxia/src/lib/perf/`
- `pax-fluxia/src/lib/bench/`
- `pax-fluxia/src/lib/debug/`
- `pax-fluxia/src/lib/territory/devtools/`
- `tools/`

Role:
- harnesses
- logging
- metrics
- benchmark plumbing
- debug surfaces

Non-role:
- `diag` is not the owner of gameplay, renderer, or UI fixes

## 5. Branch And Worktree Naming

Use the `codex/` prefix.

Examples:
- `codex/ai/<task>`
- `codex/gameplay/<task>`
- `codex/render-infra/<task>`
- `codex/render-family/metaball/<task>`
- `codex/render-family/metaballGrid/<task>`
- `codex/render-family/perimeterField/<task>`
- `codex/vfx/<task>`
- `codex/ui-settings/<task>`
- `codex/ui-main-menu/<task>`
- `codex/ui-hud/<task>`
- `codex/ui-map-editor/<task>`
- `codex/ui-landing-site/<task>`
- `codex/diag/<task>`

One worktree per active lane is preferred.

## 6. Standard Assignment Template

Use this exact structure when assigning an agent:

1. `You own these paths: ...`
2. `You do not edit these shared choke points unless absolutely necessary: game.config.ts, territory.config.ts, gameStore.svelte.ts, GameCanvas.svelte, GameContainer.svelte, GameSettingsPanel.svelte`
3. `If you must cross a boundary, keep it mechanical or append-only and call it out explicitly`
4. `Your task is exactly: ...`
5. `Deliver: code changes, validation results, artifact paths if relevant, and one short boundary note`
6. `Do not leave any local server, preview, worker, or benchmark process running`

## 7. Expected Output By Lane

- `ai`: behavior summary + validation
- `gameplay`: behavior summary + smoke/tests
- `render-infra`: timing note or benchmark + visual smoke
- `render-family/*`: screenshot or artifact + family-specific validation
- `vfx`: screenshot/capture + runtime smoke
- `ui-settings`: panel smoke + theme/settings smoke
- `ui-main-menu`: screenshot + start-flow smoke
- `ui-hud`: screenshot + gameplay HUD smoke
- `ui-map-editor`: screenshot + editor smoke
- `ui-landing-site`: screenshot + route smoke
- `diag`: artifact paths + interpretation

## 8. Validation Rules

Minimum for almost every lane:
- `bun run build` in `pax-fluxia/`

Also require lane-specific smoke:
- gameplay lanes: single-player start or rules-specific validation
- render lanes: real surface validation, screenshot, or benchmark artifact
- UI lanes: route/surface smoke and screenshot if visuals changed
- diag lane: harness runs and leaves no orphaned processes

Do not claim a fix is verified without evidence.

## 9. Compatibility And Boundary Rules

### 9.1 New work targets primary surfaces only

Use:
- `ui/main-menu`
- `ui/hud`
- `components/map-editor`
- `components/landing-site`
- family-local render folders

Do not start new work in:
- flat `ui/` shim files
- retired `components/landing/` paths
- retired `components/editor/` paths

### 9.2 Performance ownership

Performance work belongs to the owning lane:
- shared frame cadence -> `render-infra`
- family-local territory performance -> `render-family/*`
- simulation performance -> `gameplay`
- panel or route performance -> `ui-settings` or the relevant `ui-*` lane

### 9.3 Process cleanup

Every agent must clean up:
- dev servers
- preview servers
- benchmark runners
- workers launched out-of-process

No lingering processes after reporting back.

## 10. Recommended Concurrency

Practical limits:
- `8` active feature lanes: low risk
- `10` active feature lanes: comfortable
- `12` active feature lanes: supportable with discipline

`diag` should usually run as a support lane, not as a permanent competing feature lane.

My recommended always-on mix:
- `gameplay`
- `render-infra`
- one or more `render-family/*`
- `ui-settings`
- one or two `ui-*` surface lanes
- `ai`

## 11. Merge-Safety Goal

The operating goal is:
- family work stays inside family folders
- surface work stays inside primary surface folders
- only the owning lane edits the big shared files
- cross-lane merge conflicts should become uncommon and mechanical

If two lanes repeatedly need the same choke point, that is an architectural smell and should trigger a follow-up split.
