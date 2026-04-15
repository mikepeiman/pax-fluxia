# Tomorrow's Kickstarter — 2026-03-30

> Load at session start. This captures EVERYTHING from 2026-03-29 that connects together.

## What Was Done Today

### 1. UI Design Branch Merge (Complete ✅)
Surgically merged 12 files from `feat/pax-fluxia-ui-design` into master:
- `MainMenu.svelte` (v2 redesign), `StarRenderer.ts` (pill labels), `ControlsSection-Ships.svelte`, `multiplayerStore.svelte.ts`, `GameRoom.ts`
- `settingsDefs.ts` (star label slider defs + `PANEL_CONFIG_MAP` entries added)
- `game.config.ts` (20 new star label config keys, branch fonts/layout, master audio preserved)

### 2. Merge Bug Fix (Complete ✅)
Branch's `ControlsSection-Ships.svelte` used legacy prop-passing pattern (`values/enabled/updateValue/toggle`) for density coloring. Master's parent (`GameSettingsPanel.svelte`) had removed these props (line 246 comment: "all density values now flow through panel state"). Refactored density section to master's idiomatic `panel/updatePanel/GAME_CONFIG` pattern. Commit `aa74743`.

### 3. Architecture Rules Added to agent.md (Complete ✅)
Two new rules in Section 4:
- **Architecture-First Rule**: Always prefer master's current best architecture over legacy patterns. Never regress.
- **Single-Pattern Enforcement**: One domain = one implementation pattern. Never introduce duplicates.

### 4. Territory Rendering Deep Audit (Complete ✅)
Comprehensive audit of all territory rendering, transitions, and geometry code. Full report at artifact `territory_audit_report.md` in this conversation's brain dir.

---

## Critical Audit Findings (For Tomorrow)

### Dead Code
| Item | Status |
|------|--------|
| `renderModifiedVoronoi()` in `ModifiedVoronoiRenderer.ts` | No consumer — completely unwired to any dispatch |
| 5× `getDistanceField*Diagnostics()` exports | Exported but never imported externally |

### Dead Config
| Config Key | UI Label | Problem |
|-----------|----------|---------|
| `TERRITORY_MORPH_CONTROL_POINTS` | Morph Control Points | UI slider exists, NO renderer reads it |
| `TERRITORY_FILL_TRANSITION_MODE` | Fill Transition | Not read by any renderer — only `TerritorySettingsBridge` |

### Duplication
- `mergeSameOwnerCells` has **3 internal copies** (PowerVoronoi, ModifiedVoronoi, PVV3) — canonical exists at `geometry/mergeUtils.ts`
- 5 `VORONOI_*` params read independently by 4 renderers with no shared abstraction

### Misplaced Controls (User Correction)
- **Blur** (`DF_BLUR`) and **Edge Fade** (`DF_EDGE_FADE`) trapped in Distance Field settings — user wants them promoted to shared territory controls
- Each renderer (DF/Graph/Pixel/Metaball/Voronoi) has its own blur/fade — should be consolidated
- **"Geometry Smooth Passes"** (`VORONOI_BORDER_SMOOTH`) actually smooths **fills**, not borders — config key is a misnomer

### Parallel Transition Systems
1. **Legacy**: Internal to `PowerVoronoiRenderer.ts` — easing/resample/overshoot controls
2. **Modular**: `territory/transitions/OptimalTransportBorderTransition.ts` + `territory/layers/transition/` modes

### Architecture Gaps for PVV2 Extraction
- PVV2 easing controls not ported to modular layer
- PVV3Renderer is a 26-symbol barrel re-export — a code smell
- `renderPowerVoronoi()` is the most-connected renderer (3 callers)

---

## What Needs Doing Tomorrow

### Priority 1: Update PVV2 Excavation Plan
File: `.agent/plans/PVV2_EXCAVATION_PLAN.md`
- Integrate audit findings into extraction phases
- Update prerequisites (merge ✅, audit ✅, `RefactoredPVV2Renderer.ts` — still needs audit)
- Add misplaced controls consolidation as Phase 0

### Priority 2: Immediate Cleanup (Optional, User's Call)
- Remove dead `renderModifiedVoronoi()`
- Consolidate `mergeSameOwnerCells` to single import
- Wire or remove `TERRITORY_MORPH_CONTROL_POINTS`
- Promote blur/fade to shared controls

### Priority 3: PVV2 Excavation (Main Event)
The 5-phase extraction plan in `.agent/plans/PVV2_EXCAVATION_PLAN.md`:
1. Audit & Map (done via deep audit)
2. Geometry Layer extraction
3. Transition Layer extraction
4. Presentation Layer extraction
5. Verification (side-by-side with commit `8dce88c`)

---

## Key Files & References

| Reference | Path |
|-----------|------|
| PVV2 reference commit | `8dce88c` — documented in `PVV2_REFERENCE_COMMIT.md` (project root) |
| PVV2 excavation plan | `.agent/plans/PVV2_EXCAVATION_PLAN.md` |
| Territory audit report | Brain artifact `territory_audit_report.md` |
| Architecture rules | `.agent/agent.md` Section 4 (Architecture-First, Single-Pattern) |
| Session notes | `.agent/WIP Work-In-Progress/SESSION_2026-03-29.md` |
| Main monolith target | `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts` (1,529 LOC) |
| Territory UI controls | `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte` (1,839 LOC) |
| Canonical default | DY4 Optimal Transport — do NOT alter without explicit user approval |

## User Preferences Noted Today
- **No "sacrosanct" term** — user has demanded it removed multiple times. Use "canonical default" instead.
- **Architecture-first always** — incoming code must be refactored to match master's best pattern. Never regress.
- **Single pattern per domain** — never introduce a second implementation for the same concern.
- **Mid-work messages are fine** — zero derailment cost, user can send anytime.
- **Interruptions queued by default** — user prefers async note-taking style.
