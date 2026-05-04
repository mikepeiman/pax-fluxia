# Architectural Audit: Worktree-Friendly Feature Separation

## Purpose

Enable **parallel worktrees** that can work independently on different feature areas for indefinite periods and merge back via clean fast-forward merges, with minimal conflicts.

Guiding question per area: *"What would it take for work on this feature area to be ~95% separate from the other areas?"*

---

## Current Architecture

```
pax-fluxia/              (monorepo root)
â”œâ”€â”€ common/              â† @pax/common: SharedEngine, AI, combat, mapgen, schema
â”‚   â””â”€â”€ src/             (18 files)
â”œâ”€â”€ pax-fluxia/          â† SvelteKit client
â”‚   â””â”€â”€ src/lib/         (20 subdirectories â€” the hot zone)
â”‚       â”œâ”€â”€ renderers/   (34 files, 15 renderer classes, 6 workers)
â”‚       â”œâ”€â”€ territory/   (18 subdirs: compiler, families, transitions, render, contracts, layersâ€¦)
â”‚       â”œâ”€â”€ fx/          (FXRegistry, handlers, orchestrator, phases)
â”‚       â”œâ”€â”€ stores/      (9 files â€” gameStore 86KB)
â”‚       â”œâ”€â”€ components/  (game/, ui/, editor/, landing/)
â”‚       â”œâ”€â”€ config/      (game.config 99KB, themes, maps)
â”‚       â””â”€â”€ [lanes, perf, utils, debug, bench, workers, â€¦]
â”œâ”€â”€ pax-server/          â† Colyseus (already independent âœ…)
â””â”€â”€ website_cursor_pencil/ â† Landing page (already separate âœ…)
```

---

## The 4 Coupling Barriers

| # | File | Size | Importers | Role |
|---|------|------|-----------|------|
| 1 | [game.config.ts](file:///c:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/config/game.config.ts) | 99KB | **75** | Every feature area's config in one mutable object |
| 2 | [gameStore.svelte.ts](file:///c:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/stores/gameStore.svelte.ts) | 86KB | 3 direct + many indirect | AI + engine + maps + lanes + perf in one store |
| 3 | [GameCanvas.svelte](file:///c:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/components/game/GameCanvas.svelte) | 278KB | Central | All renderer dispatch from one component |
| 4 | [GameSettingsPanel.svelte](file:///c:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte) | 90KB | UI hub | Every feature's controls mixed together |

---

## Extended Feature Area Ontology (8 Lanes)

| # | Lane | Shortcode | Primary Directories |
|---|------|-----------|-------------------|
| 1 | **AI** | `ai` | `common/src/ai/`, `pax-fluxia/src/lib/engine/AI.ts` |
| 2 | **Renderer Infrastructure** | `render-infra` | `renderers/` shared utils, `RenderContext.ts`, `containerFactory.ts`, scheduling |
| 3 | **Renderer Families** | `render-family/*` | `territory/families/metaball/` (5 files), `perimeterField/` (9 files), `metaballGrid/` (13 files), each legacy `*Renderer.ts` |
| 4 | **Gameplay & Engine** | `gameplay` | `common/src/engine/`, `combat.ts`, `conquest.ts`, `production.ts` |
| 5 | **VFX & Animation** | `vfx` | `fx/`, `animations/`, `territory/transitions/` (19 files), `territory/vfx/` |
| 6 | **UI: Settings** | `ui-settings` | `GameSettingsPanel.svelte`, `settingsDefs.ts` (39KB), `panelSync.ts`, `settingsState.ts` |
| 7 | **UI: Surfaces** | `ui-surfaces` | Main Menu, Map Editor, landing page, in-game HUD, Leaderboard, StatusBar |
| 8 | **Diagnostics & Perf** | `diag` | `perf/` (3 files), `bench/`, `debug/`, `territory/devtools/` (16 files) |

**Why split Renderer into Infrastructure vs Families?** Families are already self-contained (metaballGrid: 13 files, perimeterField: 9 files with own tests/workers/types). They rarely touch shared infra. Infrastructure changes are rare and additive.

**Why elevate Diagnostics?** `territory/devtools/` alone has 16 files / 190KB+. Combined with `perf/`, `bench/`, `debug/`, this is substantial and should never block other lanes.

---

## Alternative Approaches Analysis

Per the innovative thinking model â€” four solutions evaluated:

### A. The Obvious Solution: Split the God-Objects

Decompose the 4 coupling barriers into domain-namespaced modules (config split â†’ store split â†’ canvas split â†’ settings split).

| Criterion | Rating |
|---|---|
| Correctness | âœ… Structurally eliminates conflicts |
| Simplicity | âš ï¸ 6-9 sessions, many files touched |
| Impl cost | Medium-High |
| Extensibility | âœ… Excellent â€” each domain is independently evolvable |
| Failure modes | Risk of regression during large mechanical refactor |
| Reversibility | Low â€” structural change |

### B. The Robust Solution: Convention-Based Separation (Zero Refactor)

Leave the god-objects intact but establish **strict editing conventions**: each lane owns defined line ranges or sections within shared files, uses comment markers `// @lane:ai`, and conflicts are resolved by lane-specific merge drivers.

| Criterion | Rating |
|---|---|
| Correctness | âš ï¸ Depends on discipline, not structure |
| Simplicity | âœ… Zero code changes |
| Impl cost | Very Low |
| Extensibility | âŒ Fragile â€” conventions drift |
| Failure modes | Convention violations cause merge conflicts despite rules |
| Reversibility | âœ… Instant â€” just remove convention |

### C. The Elegant Solution: Hybrid (Convention First, Structure Later)

Start with conventions for lanes that are *already* well-separated (AI, Gameplay, UI Surfaces, Diagnostics â€” all >70% today). Only structurally refactor the truly entangled surfaces (Config + Settings Panel) where convention alone can't help because 75 importers are editing the same flat namespace.

| Criterion | Rating |
|---|---|
| Correctness | âœ… Convention where safe, structure where needed |
| Simplicity | âœ… Minimum code change needed |
| Impl cost | **Low** â€” 2-3 sessions total |
| Extensibility | âœ… Convention can upgrade to structure as friction appears |
| Failure modes | Lower risk: smaller change surface |
| Reversibility | Good â€” convention is reversible, config split is additive |

### D. The Weird Solution: Monorepo Package Split

Extract each lane into its own `packages/*` workspace package with explicit `package.json` dependencies. The import graph enforces separation at the package manager level.

| Criterion | Rating |
|---|---|
| Correctness | âœ… Machine-enforced boundaries |
| Simplicity | âŒ Major restructure of SvelteKit paths, imports, build |
| Impl cost | Very High â€” weeks of work |
| Extensibility | âœ… Excellent long-term |
| Failure modes | SvelteKit + Vite monorepo tooling is painful |
| Reversibility | Very Low |

> [!IMPORTANT]
> **Recommendation: Approach C (Elegant Hybrid).** Convention-first for already-clean lanes. Structural config split only for the `GAME_CONFIG` god-object and settings panel, which are the actual merge-conflict generators.

---

## Recommended Plan: Elegant Hybrid

### Phase 0: Convention Layer (Immediate, Zero Code Changes)

Establish file ownership, branch naming, and merge rules. This alone handles lanes that are already >70% separated.

**Estimated gain: 50% â†’ 75% weighted average separation.**

### Phase 1: Config Namespace Split (2-3 sessions)

Split `game.config.ts` defaults into domain files. The runtime `GAME_CONFIG` object stays unified but domain files are edited independently.

```
config/
â”œâ”€â”€ game.config.ts         â† re-export aggregator (stays, backward compat)
â”œâ”€â”€ ai.config.ts            â† AI defaults
â”œâ”€â”€ renderer.config.ts      â† shared renderer defaults  
â”œâ”€â”€ territory.config.ts     â† territory/geometry
â”œâ”€â”€ vfx.config.ts           â† VFX/animation timing
â”œâ”€â”€ gameplay.config.ts      â† engine, combat, production
â”œâ”€â”€ audio.config.ts         â† audio
â””â”€â”€ ui.config.ts            â† theme, panel chrome
```

Each renderer family contributes local defaults:
```
territory/families/metaball/config.ts
territory/families/perimeterField/config.ts
territory/families/metaballGrid/config.ts
```

**Estimated gain: 75% â†’ 90% weighted average separation.**

### Phase 2: Settings Panel Split (1 session)

Split `GameSettingsPanel.svelte` (90KB) + `settingsDefs.ts` (39KB) into per-area sections:

```
components/ui/
â”œâ”€â”€ GameSettingsPanel.svelte   â† thin shell composing sections
â”œâ”€â”€ settings/
â”‚   â”œâ”€â”€ AISettingsSection.svelte
â”‚   â”œâ”€â”€ RendererSettingsSection.svelte
â”‚   â”œâ”€â”€ TerritorySettingsSection.svelte
â”‚   â”œâ”€â”€ VFXSettingsSection.svelte
â”‚   â”œâ”€â”€ GameplaySettingsSection.svelte
â”‚   â””â”€â”€ AudioSettingsSection.svelte
```

**Estimated gain: 90% â†’ 93% weighted average.**

### Deferred: Store + Canvas Decomposition (3-4 sessions, only if needed)

These are the most invasive changes and provide diminishing returns. Defer until actual merge friction is observed in practice:
- `gameStore` split into `engineLoop`, `aiManager`, `mapManager`
- `GameCanvas` split into layer managers

**Would reach: 93% â†’ 95% if friction warrants.**

---

## Per-Lane Separation Summary

| Lane | Current | After Phase 0+1 | Target | Residual |
|---|---|---|---|---|
| AI | 85% | 95% | 98% | Engine interface reads |
| Render Infra | 35% | 80% | 90% | Canvas-is-the-infra |
| Render Families | 60% | 90% | 95% | Shared contracts |
| Gameplay | 75% | 92% | 95% | Shared types |
| VFX | 65% | 88% | 93% | Geometry snapshots |
| UI Settings | 20% | 85% | 92% | Shell composition |
| UI Surfaces | 70% | 90% | 95% | Game state reads |
| Diagnostics | 70% | 90% | 95% | Observes targets |

---

## Post-Refactor Conflict Matrix

| â†“ Lane \ â†’ | AI | R.Infra | R.Family | Gameplay | VFX | UI Set. | UI Surf. | Diag |
|---|---|---|---|---|---|---|---|---|
| **AI** | â€” | âœ… | âœ… | âš ï¸Â¹ | âœ… | âœ… | âœ… | âœ… |
| **R.Infra** | âœ… | â€” | âš ï¸Â² | âœ… | âœ… | âœ… | âœ… | âœ… |
| **R.Family** | âœ… | âš ï¸Â² | âœ…Â³ | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Gameplay** | âš ï¸Â¹ | âœ… | âœ… | â€” | âœ… | âœ… | âœ… | âœ… |
| **VFX** | âœ… | âœ… | âœ… | âœ… | â€” | âœ… | âœ… | âœ… |
| **UI Settings** | âœ… | âœ… | âœ… | âœ… | âœ… | â€” | âœ… | âœ… |
| **UI Surfaces** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | â€” | âœ… |
| **Diagnostics** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | â€” |

âœ… Clean FF merge | âš ï¸ Rare minor conflict
Â¹ Different files in `common/src/` Â² Shared `RenderContext.ts` (rare) Â³ Families never conflict with each other

---

## Worktree Operating Rules

### Branch Naming
```
worktree/ai/feature-name
worktree/render-infra/feature-name
worktree/render-family/metaball/feature-name
worktree/gameplay/feature-name
worktree/vfx/feature-name
worktree/ui-settings/feature-name
worktree/ui-surfaces/feature-name
worktree/diag/feature-name
```

### File Ownership

Each lane has primary directories. Editing outside the primary set is a **boundary violation** â€” log it, minimize it. If a violation is necessary, aim for **append-only** changes to shared files (new exports, new sections, never modifying existing lines).

### Merge Protocol
1. Rebase onto `master` before merging
2. Last committer resolves conflicts
3. Pass lane smoke-test before push
4. Fast-forward merge only â€” no merge commits

### Smoke-Test Gates

| Lane | Gate |
|---|---|
| AI | `bun test` in `common/` + game starts with AI |
| Render Infra / Family | `bun run check` + target mode renders |
| Gameplay | `bun test` in `common/` + SP game completes |
| VFX | `bun run check` + conquest animation plays |
| UI Settings | `bun run check` + panel opens, sliders work |
| UI Surfaces | `bun run check` + target surface loads |
| Diagnostics | `bun run check` + diagnostic panel opens |

---

## Effort Summary

| Phase | Sessions | Gain | Risk |
|-------|----------|------|------|
| **Phase 0: Conventions** | 0 (document only) | +25% | None |
| **Phase 1: Config Split** | 2-3 | +15% | Low (mechanical) |
| **Phase 2: Settings Split** | 1 | +3% | Low |
| **Deferred: Store+Canvas** | 3-4 | +2% | Medium |

**Practical target: ~93% with 3-4 sessions of work.** The remaining 7% is correct architectural coupling (shared types, contracts, read-only state).

---

## What 100% Would Require (And Why 95% Is Better)

True 100% would need: versioned `common/` package with semver contracts, message-bus architecture eliminating all cross-lane store reads, frozen `territory/contracts/` API. This adds significant complexity for marginal gain â€” the remaining coupling represents **correct design** (shared types, stable contracts, read-only consumers).

---

## Existing Strengths to Preserve

The territory system already has excellent separation infrastructure:
- `territory/contracts/` â€” typed interfaces for the 4-layer pipeline (9 files) âœ…
- `territory/integration/` â€” bridge pattern already in use (`GameCanvasTerritoryBridge.ts`, `TerritorySettingsBridge.ts`, `TerritoryFxBridge.ts`) âœ…
- `territory/layers/` â€” follows geometry/ownership/presentation/transition model âœ…
- `territory/families/` â€” each family is internally cohesive (metaballGrid: 13 files, perimeterField: 9 files) âœ…

These patterns should be extended, not replaced.

