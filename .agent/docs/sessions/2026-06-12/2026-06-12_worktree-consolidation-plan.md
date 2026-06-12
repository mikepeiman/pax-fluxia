---
date created: 2026-06-12
last updated: 2026-06-12
last updated by: AI
relevant prior docs:
  - .agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md
  - .agent/docs/plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md
  - .agent/MULTI_LANE_WORKTREE_GUIDE.md
  - .agent/docs/plans/2026-06-12/HANDOFF_2026-06-12_DEMO_READINESS.md
superseding docs:
---

# 2026-06-12 — Worktree Consolidation Plan (Outline)

## Purpose

In the user's words:

> "We must first establish success, and get all working modes together (spread across worktrees currently) so we are on the same page — the same branch and repo. Then we can determine what is truly ready for the trashbin, and what we keep as prototype for future work. Some old modes may have value for future still — or not, I don't know."

Consolidation first, judgment second, deletion last. Nothing is deleted in this plan.

## Corrections adopted from user feedback (2026-06-12)

1. **Render families are the current architecture direction.** The 4-layer pipeline (ownership → geometry → transition → presentation) applies to the vector route. `TERRITORY_RENDER_SYSTEM_CURRENT.md` is the governing current-state doc; three runtime shapes coexist deliberately (pipeline runtime, render-family runtime, direct legacy renderers).
2. **No geometry generator has been selected as best.** The "legacy" volume is intentional: many things in development, not finished. Earlier audit framing of this as deletable debt was wrong.
3. **Rendering constrains geometry.** Finalizing/deleting geometry generators requires the rendering decision first, because the surviving render families dictate the shape of geometry/ownership data needed.
4. **No deletions of geometry generators or territory renderers** until all working modes are merged onto one branch and success is established by the user in the UI.

## Branch and worktree

- Branch: `claude/worktree-consolidation` (from `master` at `a3fd4ac42`)
- Worktree: `.claude/worktrees/consolidation`
- This is integration-lane work, not a feature lane; choke-point edits (GameCanvas, gameStore, configs) happen only as merge-conflict resolution, never as refactoring.

## Phase 1 — Worktree and branch census (no code changes)

Inventory all ~22 worktrees / ~40 branches. For each branch:

- merge-base vs `master`, commits ahead/behind
- areas touched (lane classification per `MULTI_LANE_WORKTREE_GUIDE.md`)
- choke-point exposure (`GameCanvas.svelte`, `GameContainer.svelte`, `gameStore.svelte.ts`, `game.config.ts`, `territory.config.ts`, `GameSettingsPanel.svelte`, `themeStore.svelte.ts`)
- working-mode content: which render families / geometry generators / transition modes the branch carries or fixes
- user's verdict needed: merge / hold / abandon (the user knows which worktrees hold working modes; the census surfaces the data for that call)

Output: one census matrix doc in this session dir (CSV or MD table). User reviews and marks the merge set + order before any merge happens.

## Phase 2 — Sequenced merges into the consolidation branch

- One branch at a time, ordered by: (a) user priority, (b) family-local before choke-point-heavy, (c) smallest conflict surface first.
- Per-merge gate: `bun run build` in `pax-fluxia/` + `bun run check` + user visual verification in the UI of the mode(s) that branch carries ("implemented; please verify" — never self-declared success).
- Conflict rules:
  - family-local conflicts: take the branch (family lanes own their folders)
  - choke-point conflicts: resolve mechanically, call out every choke-point edit explicitly in the merge note
  - modify/delete conflicts vs the cleanup commit: keep the branch's file, re-evaluate later
- Each merge gets a short merge note in this session dir: branch, conflicts hit, resolution choices, gate results.

## Phase 3 — Mode and generator matrix (the "same page" artifact)

After merges, build one inventory covering every territory path on the consolidated branch:

- render families (`metaball`, `metaballGrid`, `perimeterField`, future)
- pipeline-runtime modes (geometry, fill/border transition, style)
- direct legacy renderers (the ~9 GameCanvas-dispatched ones)
- geometry generators (Geometry_0319 / power Voronoi, fg2SeedGraph, and any arriving from worktrees)

Per entry: status (working / broken / prototype), entry point, UI reachability (exact control + panel), input data consumed (ownership/geometry shape), transition support (identity stability across conquest), and known liabilities. No verdicts in this phase — facts only.

## Phase 4 — Success definition and evaluation

- User defines "success" for geometry → transition → rendering (candidate criteria, to be confirmed: fills and borders move together from the same sampled data; no gaps/overlaps during conquest; unchanged frontier spans stay pixel-stable; smoothness without temporal undersampling per the 2026-04-28 non-negotiables).
- User evaluates each candidate mode in the UI against those criteria; verdicts recorded in the matrix.
- Geometry evaluation is scored **per render family**: a generator is viable only relative to the data shape and identity guarantees the surviving families need.

## Phase 5 — Triage (user decision, explicit per item)

Only after Phase 4: classify each mode/generator as **keep (shipping)**, **prototype (quarantined, documented why)**, or **trashbin**. Every deletion requires explicit user confirmation per item. The geometry data contract is finalized from the surviving families' needs at this point — not before.

## Risks and constraints

- `GameCanvas.svelte` (~8k lines) is the dominant conflict magnet; many branches touch it. Its decomposition is FROZEN per the 2026-06-12 demo-readiness handoff — conflict resolution only.
- Precedence question (open): this consolidation vs the demo-readiness handoff phases — user to confirm ordering/interleaving.
- Master currently carries an uncommitted `GameCanvas.svelte` modification (clearInteractionOverlaySurface) plus untracked agent-tooling files — not part of this plan; user to disposition.
- Settings churn (`current-settings.json`): per AGENT.md, commit or ignore freely, never spend attention on it.

## Open questions for the user

1. Which worktrees/branches are in the merge set, and is there a priority order you already know?
2. Does the demo-readiness handoff take precedence over consolidation, or does consolidation feed it?
3. Where should the consolidated branch land when stable — straight merge to `master`?
