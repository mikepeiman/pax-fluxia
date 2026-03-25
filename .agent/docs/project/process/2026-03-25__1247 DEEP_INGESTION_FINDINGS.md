# Deep Ingestion Findings — 2026-03-25

**Method:** Full read of 16 docs across 2 directories using the gold-mining heuristics.

---

## 🏆 Gold Nuggets — Ideas at Risk of Loss

### 1. MSR Expansion Proposals (from V2 Constraint Architecture Analysis)
Four concrete MSR enhancements that appear NOWHERE in later documents:
- **Dynamic MSR (fleet scaling):** `baseMSR × (1 + log₂(ships / avgNeighborShips))` — territory size tracks fleet strength
- **MSR Gravity (min area):** If region area < threshold, expand MSR until threshold met — kills micro-slivers
- **MSR Breathing Room (icon clearance):** Frontier ≥ N pixels from star icon edge — separate from MSR, controls clearance
- **Contested MSR (siege retreat):** `baseMSR × (ships / maxHistoricShips)` — territory visibly retreats during siege

**Risk:** These were specific, implementable formulas that would dramatically improve visual gameplay communication. None survived into any later plan.

### 2. Single-Path Fill+Stroke Mandate (from V3 Master Architecture)
> "Separate border rendering passes (where borders are drawn independently of fills) are strictly forbidden."

The V3 docs mandate that fills and borders must use `fill()` then `stroke()` on the SAME vertex path — not separate caches. The later geometry-refactor-plan assumes separate fill and border caches derived from the same truth. These are architecturally different approaches.

**My assumption:** I assumed separate fill/border caches are fine as long as they derive from the same canonical geometry. The V3 mandate says this is insufficient because the GPU interpolates filled and stroked polygons differently at sub-pixel level.

### 3. 20-Mode Semantic Taxonomy (from Codex System Audit)
The Codex docs define a complete 20-mode taxonomy covering the ENTIRE rendering system:
- Territory: 6 mode families (geometry, adjustment, fill style, border style, fill transition, border transition)
- Stars: 2 mode families (body style, state overlay)
- Lanes: 2 mode families (body style, order indicator)
- Ships: 10 mode families (orbit, departure, travel, arrival, attack, conquest, transport, damage, repair, destruction)

**Risk:** The geometry-refactor-plan only covers territory geometry. Stars, lanes, ships, and the broader naming ledger have no implementation plan.

### 4. Dirty-State Buckets (from V2-PRD and V3 Master Architecture)
Both define a 3-4 bucket change classification system:
1. **Topology change** (star owner, lane add/remove) → full recompute
2. **Geometry-family change** (straight/curved/segmented swap) → refit + rebuild
3. **Presentation-style change** (width, color, alpha) → uniforms only
4. **Transition-frame change** (animation tick) → per-frame interpolation

**Risk:** The current `TerritoryEngineController` uses fingerprint-based invalidation that doesn't distinguish these buckets. This is a performance and correctness concern that no later plan addresses.

### 5. Visual Variant Modes (from Codex Visual Spec GDD)
Three named visual presets:
- **Cinematic Flow:** stronger glows, bolder arcs, richer conquest bursts
- **Cartographic Command:** map-like borders, calmer fills
- **High-Spectacle Conflict:** richer attack surge, optional ship trails, border energy

**Risk:** These are product vision items with no implementation plan.

### 6. Missing FX Modules (from Codex System Audit)
Three game-state visuals exist in gameplay but have NO renderer:
- **Ship damage onset FX** — no visual for damage tick
- **Ship repair recovery FX** — no visual for repair
- **Ship destruction breakup FX** — no visual for ship loss

Also missing: **Contested lane visualization** — two-player lane occupancy has no renderer.

### 7. CX/DX Constraint Resolution (from V2 Constraint Architecture)
Clear verdicts on legacy constraints:
- **CX (Corridor Extension):** ❌ DELETE — analytical lane split formula replaces it entirely
- **DX (Disconnect Separation):** ⚠️ DEMOTE — move from metric-stage virtual sites to region-stage gap enforcement post-process
- **Lane-exclusivity:** ✅ The analytical lane split IS the implementation (O(E) pass, exact frontier positions)

**Status:** `computeCorridorVirtuals()` and `computeDisconnectVirtuals()` are still in the codebase. These verdicts were never acted on.

---

## 🔍 Assumptions I Made (for reconciliation)

| # | My Assumption | Evidence Against | Needs User Input? |
|---|--|--|--|
| A1 | Separate fill/border caches are fine if derived from same truth | V3 mandates single-path fill+stroke (sub-pixel divergence) | **YES** — architectural choice |
| A2 | The 4-layer pipeline (Ownership→Geometry→Transition→Presentation) is final | V2-PRD had 6 layers; some (Geometry Fitting, Region Derivation) were collapsed into Geometry | Maybe — was the collapse intentional? |
| A3 | MSR is a fixed scalar | V2 proposes dynamic MSR from fleet strength | YES — game design decision |
| A4 | Stars/lanes/ships rendering is out of scope for current work | Codex defines 20-mode taxonomy covering all rendering | Confirm scope boundary |
| A5 | The geometry refactor plan covers all architecture work needed | Codex integrity audit identifies F1-F8 violations, some untouched by geometry plan | YES — broader scope exists |
| A6 | DX (disconnect virtual sites) is still the mechanism for gap enforcement | V2 says move to region-stage post-process | Design decision pending |

---

## 📁 Three Ontology Proposals

### Ontology A: By Lifecycle Stage

```
.agent/docs/
├── vision/                         # What we want to build (product goals)
│   ├── game-design/                # Mechanics, balance, conquest rules
│   ├── visual-design/              # GDD visual spec, aesthetic targets
│   └── audio-design/               # Audio system specs
│
├── architecture/                   # How the system should work (contracts)
│   ├── territory/                  # 4-layer pipeline, geometry, transitions
│   ├── rendering/                  # Full rendering system (stars, lanes, ships)
│   ├── fx/                         # FX orchestrator, VFX pipeline
│   ├── engine/                     # Game engine, simulation, Colyseus
│   └── ui/                         # Controls, settings, layout
│
├── plans/                          # What we're doing now (active work)
│   ├── 2026-03-24 geometry-refactor/
│   ├── 2026-03-20 frontier-topology/
│   └── _completed/
│
├── decisions/                      # Why we chose what we chose (D-nn log)
├── post-mortems/                   # What went wrong and what we learned
├── rules/                          # Design rules, session rules, agent rules
│
├── research/                       # External AI outputs, dated
│   ├── 2026-03-24 Perplexity geometry/
│   ├── 2026-03-22 Codex rendering/
│   └── 2026-03-16 architecture V2/
│
└── _archive/                       # Everything superseded
```

**Index categories:** vision, architecture, plan, decision, post-mortem, rule, research

### Ontology B: By Game System

```
.agent/docs/
├── territory/                      # Everything territory
│   ├── architecture.md             # Pipeline, contracts, layers
│   ├── geometry.md                 # Algorithms, compiler, utilities
│   ├── transitions.md              # Animation, morphing, OT
│   ├── constraints.md              # MSR, CX, DX, lane-exclusivity
│   ├── plans/                      # Active and completed refactor plans
│   └── research/                   # Perplexity/NotebookLM/Codex outputs
│
├── ships/                          # Ship lifecycle, FX
├── stars/                          # Star rendering, labels, types
├── lanes/                          # Lane rendering, orders, contested states
├── combat/                         # Attack, conquest, damage, repair, destruction
│
├── cross-cutting/                  # Spans multiple systems
│   ├── rendering-architecture.md   # RenderingRuntimeCoordinator, mode families
│   ├── fx-pipeline.md              # FXOrchestrator, VSM, event-driven FX
│   ├── vfx-timing.md              # Single clock, game time
│   ├── ui-controls.md             # Settings panels, config surface
│   └── visual-design.md           # GDD visual spec
│
├── game-design/                    # Mechanics, balance, rules
├── decisions/                      # D-nn log
├── post-mortems/                   # Failure analysis
├── rules/                          # Agent rules, design rules
└── _archive/
```

**Index categories:** system, concern (architecture/algorithm/animation/constraint/visual), status (active/completed/archived)

### Ontology C: Hybrid (Recommended)

```
.agent/docs/
├── specs/                          # Authoritative, evergreen (ONE doc per topic)
│   ├── territory-pipeline.md       # 4-layer pipeline, contracts
│   ├── territory-constraints.md    # MSR, DX, lane-exclusivity, invariants
│   ├── territory-transitions.md    # Transition inventory, modes, timing
│   ├── rendering-architecture.md   # Full system: 20 mode families, registries
│   ├── visual-design.md            # GDD visual spec, aesthetic targets
│   ├── fx-pipeline.md              # FX orchestrator, VFX timing
│   ├── game-mechanics.md           # Conquest, combat, ships, stars
│   ├── ui-controls.md              # Settings panels, config keys
│   └── tech-stack.md               # Dependencies, frameworks
│
├── plans/                          # Lifecycle: active → completed → archive
│   ├── active/
│   │   └── 2026-03-24 geometry-refactor/
│   └── completed/
│
├── inventories/                    # Living reference indexes
│   ├── geometry-atlas.md           # All geometry code cataloged
│   ├── renderer-audit.md           # All renderers: status, migration disposition
│   └── transition-inventory.md     # All transition types, call flows
│
├── decisions/                      # D-nn entries
├── post-mortems/                   # What went wrong
├── rules/                          # Design rules, agent rules

├── research/                       # Dated AI external outputs (kept for provenance)
│   ├── 2026-03-24 Perplexity geometry/
│   ├── 2026-03-22 Codex rendering/
│   └── 2026-03-16 architecture V2/
│
└── _archive/                       # Everything superseded
```

**Index categories:** spec, plan, inventory, decision, post-mortem, rule, research
**Distinguishing feature:** `specs/` has ONE doc per topic (no duplicates). `inventories/` are living reference indexes. `research/` keeps dated provenance.

---

## Document-by-Document Index (New Directories)

### 2026-03-22 Rendering Refactor Plan (Codex) — 15,700 tokens

| Tokens | File | Gold? | Summary |
|--------|------|-------|---------|
| 3,404 | `RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md` | ⭐⭐⭐ | F1-F8 integrity failures. Covers territory, stars, lanes, ships, FX. Complete corrections list. |
| 2,610 | `RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md` | ⭐⭐⭐ | Target runtime layout tree (20 registries). 6-phase migration. Naming ledger. Module migration map. Live geometry-control policy. |
| 4,066 | `RENDERING_SYSTEM_AUDIT_MASTER.md` | ⭐⭐⭐ | Complete semantic taxonomy (20 modes). Status table for EVERY renderer/mode/FX. Identifies 3 missing FX modules. |
| 2,964 | `RENDERING_TECHNICAL_CANDIDATES_MATRIX.md` | ⭐⭐ | External library evaluation. Core/support/optional/do-not-use classification. Research notes by concern. |
| 2,620 | `RENDERING_VISUAL_SPEC_GDD.md` | ⭐⭐⭐ | Player-facing visual spec. 3 variant modes. Ship lifecycle descriptions. Non-negotiable visual rules. |

### 2026-03-16 Render Architecture V2 — 22,200 tokens

| Tokens | File | Gold? | Summary |
|--------|------|-------|---------|
| 1,316 | `Analytical Lane Split.md` | ⭐ | Lane frontier formula `t = (dV(v)−dU(u)+w)/(2w)`. Already implemented. |
| 596 | `LEGACY_fg2SeedGraph_EXTRACTION.md` | ○ | FG2 extraction companion. Short. Superseded by geometry-refactor-plan Step 5. |
| 3,997 | `NEW MASTER ARCHITECTURE PRD.md` | ⭐⭐ | 6-layer architecture with explicit Geometry Fitting and Region Derivation layers. Dirty-state buckets. Decision priority rules. LaTeX formulas. |
| 1,185 | `Territory System Intent.md` | ⭐ | Concise distillation of core principles. Good reference but mostly absorbed. |
| 2,508 | `CONSTRAINT_ARCHITECTURE_ANALYSIS.md` | ⭐⭐⭐ | MSR expansion proposals (4 formulas). CX/DX verdicts. Architectural placement diagram. |

#### Perplexity V3 Subdirectory — 6 files
| Tokens | File | Gold? | Summary |
|--------|------|-------|---------|
| 244 | `ARCHITECTURE_README.md` | ○ | Index for this directory |
| 2,138 | `MASTER_TERRITORY_ARCHITECTURE.md` | ⭐⭐ | Single-path fill+stroke mandate. Testing invariants checklist. |
| 1,712 | `RENDER_AND_TRANSITIONS.md` | ⭐ | Transition pass pseudocode. Class encapsulation examples. |
| 1,403 | `COMPILER_CONTRACTS.md` | ⭐ | Stage-specific typed contracts. Failure policy with `CompileError`. |
| 866 | `LEGACY_QUARANTINE.md` | ○ | Quarantine directives. Largely superseded. |
| 6,277 | `script.py` | ○ | Python script. Not architecture documentation. |
