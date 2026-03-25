# Second-Pass: Expanded Ontologies + Agent Council Ingestion

**Appends to:** `2026-03-25__1247 DEEP_INGESTION_FINDINGS.md` (first-round results preserved)

---

## Part 1: Expanded Ontology Brainstorming

### O-0. Why the first round was unbalanced

The first-round ontology proposals reflected tunnel vision on the territory refactor. But this project has documentation covering:

1. **Game design** (mechanics, conquest, balance, star types)
2. **Ship lifecycle** (orbit, travel, attack, conquest, transport, damage, repair, destruction)
3. **Stars & lanes** (rendering, labels, orders, contested states)
4. **Territory** (geometry, transitions, constraints, rendering)
5. **VFX & animation** (FX orchestrator, surge, timing, easing)
6. **Audio** (system spec, implementation)
7. **UI/Controls** (settings panels, layout, responsive design)
8. **Engine/Architecture** (Colyseus, game loop, state management)
9. **Visual design** (aesthetic targets, GDD visual spec, variant modes)
10. **Theming** (category themes, presets, super-categories, file persistence)
11. **Post-mortems** (failure analysis, lessons)
12. **Process** (defect prevention, development history, process improvements)
13. **Agentic tooling** (prompts, rules, mental models, heuristics)
14. **Session records** (daily notes, chat logs, sprint status)
15. **Decisions** (D-nn log)
16. **Feature tracking** (ideas, status, regressions, roadmap)
17. **Research** (Perplexity, NotebookLM, Codex outputs)

That's 17 distinct categories. Any ontology that puts 4 of 6 slots on "territory" is failing the Architect(1) test for balanced abstraction.

---

### O-1. Ontology D: By Concern Domain (Flat)

The simplest possible structure. One folder per real concern. No nesting.

```
.agent/docs/
├── territory/           # Pipeline, geometry, transitions, constraints
├── ships/               # Ship lifecycle, orbit, travel, attack, conquest
├── stars/               # Star rendering, labels, types, selection
├── lanes/               # Lane rendering, orders, contested states
├── combat/              # Attack mechanics, damage, repair, destruction
├── theming/             # Category themes, presets, super-categories
├── vfx/                 # FX orchestrator, animation timing, easing, surge
├── audio/               # Audio system, sound design
├── ui/                  # Controls, settings, layout, responsive design
├── visual-design/       # Aesthetic targets, GDD visual spec, color
├── game-design/         # Mechanics, balance, conquest rules
├── engine/              # Colyseus, game loop, state, config
├── architecture/        # Cross-cutting: rendering runtime, mode registries
├── agentic/             # Prompts, heuristics, rules, mental models
├── decisions/           # D-nn entries
├── post-mortems/        # Failure analysis, lessons learned
├── process/             # Defect prevention, process improvements
├── features/            # Feature ideas, status, regressions, roadmap
├── sessions/            # Daily notes, chat logs
├── plans/               # Active and completed execution plans
├── research/            # Dated AI external outputs (Perplexity, Codex, etc.)
└── _archive/            # Everything superseded
```

**Tension analysis (Architect vs Contractor):**
- Architect: Clean separation. Each folder is self-contained. Easy to find things.
- Contractor: 22 top-level folders is too many. Some will have 1-2 files. Navigating this is worse than the current mess.
- **Verdict:** Too flat. Territory, ships, stars, lanes, combat could be grouped.

---

### O-2. Ontology E: By Game System + Meta (Grouped) ← SELECTED

Groups related game systems under `game/`, keeps meta-concerns separate.

```
.agent/docs/
├── game/                           # Everything about the game itself
│   ├── design/                     # Game mechanics, balance, conquest rules
│   ├── territory/                  # Pipeline, geometry, transitions, constraints
│   ├── combat/                     # Ships, attack, damage, repair, destruction FX
│   ├── map/                        # Stars, lanes, orders, contested states
│   ├── theming/                    # Category themes, presets, super-categories
│   ├── visual/                     # Aesthetic targets, GDD visual spec, variant modes
│   ├── audio/                      # Audio system, sound design
│   └── ui/                         # Controls, settings, layout
│
├── engineering/                    # How the software works
│   ├── architecture/               # Rendering runtime, mode registries, 4-layer pipeline
│   ├── engine/                     # Colyseus, game loop, state, config
│   └── tech-stack/                 # Dependencies, frameworks, PIXI.js
│
├── agentic/                        # Agent improvement & tooling
│   ├── prompts/                    # Reusable prompt recipes, Agent Council
│   ├── heuristics/                 # Gold-mining, ingestion protocols
│   ├── rules/                      # Agent behavior rules
│   └── mental-models/              # Cognitive frameworks, articles
│
├── project/                        # Project management & history
│   ├── decisions/                  # D-nn log
│   ├── post-mortems/               # Failure analysis, lessons
│   ├── features/                   # Ideas, status, regressions, roadmap
│   ├── process/                    # Defect prevention, improvements
│   └── sessions/                   # Daily notes, chat logs
│
├── plans/                          # Active work (lifecycle: active → completed → archive)
│   ├── active/
│   └── completed/
│
├── research/                       # Dated external AI outputs
│   ├── 2026-03-24 Perplexity geometry/
│   ├── 2026-03-22 Codex rendering/
│   └── 2026-03-16 architecture V2/
│
└── _archive/                       # Everything superseded
```

**Tension analysis:**
- Architect(1): Clean grouping. The `game/` tree maps to what-we're-building, `engineering/` to how-it's-built, `agentic/` to how-we-think-about-it.
- Contractor(5): 4 top-level groups is navigable. `game/territory/` still exists for deep-dives.
- Game Designer(3): `game/combat/` merging ships+attack+damage+repair makes sense — they're one lifecycle.
- Historian(9): `research/` preserves provenance with dates and tool names (user's requirement).
- **Verdict:** Strong. Balanced. Respects user's date/tool naming preference.

---

### O-3. Ontology F: By Document Purpose (What-For)

Instead of organizing by *topic*, organizes by *why you'd reach for this doc*.

```
.agent/docs/
├── north-star/                     # Vision documents — the WHAT and WHY
│   ├── game-design.md
│   ├── visual-design.md
│   ├── audio-design.md
│   └── territory-intent.md
│
├── contracts/                      # Authoritative technical specs — the HOW
│   ├── territory-pipeline.md
│   ├── territory-constraints.md
│   ├── rendering-architecture.md
│   ├── theming-architecture.md
│   ├── transition-inventory.md
│   ├── fx-pipeline.md
│   ├── engine-architecture.md
│   └── ui-controls.md
│
├── inventories/                    # Living catalogs — WHAT EXISTS
│   ├── geometry-atlas.md
│   ├── renderer-audit.md
│   ├── feature-status.md
│   └── tech-stack.md
│
├── plans/                          # Active work — WHAT WE'RE DOING
│   ├── active/
│   └── completed/
│
├── agentic/                        # How we think & work
│   ├── prompts/
│   ├── heuristics/
│   ├── rules/
│   └── mental-models/
│
├── learnings/                      # What we've learned
│   ├── decisions/
│   ├── post-mortems/
│   ├── process/
│   └── development-history.md
│
├── sessions/                       # Daily records
│   ├── notes/
│   └── chats/
│
├── research/                       # Dated external AI outputs
│
└── _archive/
```

**Tension analysis:**
- UX Psychologist(7): When you reach for a doc, you're in a *mode*: "What should this look like?" (north-star) vs "What's the technical contract?" (contracts) vs "What exists?" (inventories). This maps to mental mode, not topic.
- Contractor(5): Pragmatic grouping. No folder has only 1 file.
- 2nd-Order Analyst(4): Risk — "contracts" vs "inventories" vs "north-star" blurs when a doc is both a spec and an audit.
- **Verdict:** Elegant but requires discipline about what goes where.

---

### O-4. Ontology G: Minimal Viable (Contractor's Choice)

The absolute simplest restructure that fixes the main problems.

```
.agent/docs/
├── specs/                          # What the system should be (evergreen)
├── plans/                          # What we're working on now
├── research/                       # External AI outputs (dated, tool-named)
├── learnings/                      # Decisions, post-mortems, process
├── agentic/                        # Prompts, rules, heuristics, mental models
├── sessions/                       # Daily notes + chat logs
└── _archive/                       # Dead docs
```

**7 folders. That's it.** Specs contains everything authoritative. Plans contains everything active. Research contains everything external. The tradeoff is that `specs/` will have ~15 files and needs an `_INDEX.md`.

---

### O-5. Comparison Matrix

| Criterion | D (Flat) | E (Game System) | F (Purpose) | G (Minimal) |
|-----------|----------|-----------------|-------------|-------------|
| Balance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Navigability | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Scalability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Migration effort | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| "Where does X go?" clarity | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Keeps dates & tool names | ✅ | ✅ | ✅ | ✅ |

**Recommendation:** Ontology E. User has confirmed this choice.

---

## Part 2: Second-Pass Ingestion (Agent Council Lenses)

### Method

Re-read the same 16 documents through Agent Council persona lenses. First-round gold nuggets preserved; this adds new findings from different perspectives.

### S1. Systems Architect (Persona 1) — Hidden Coupling

**Finding:** The V3 Master Architecture's "Single-Path" mandate creates a hidden coupling between fill and border rendering. If fills and borders must use the same `fill()` then `stroke()` call, then:
- S1a. Border width becomes a function of fill alpha (stroked borders at 0.5 alpha blend with the fill beneath)
- S1b. You can never have independent border visual treatments (glow, SDF softness) without abandoning single-path
- S1c. The transition layer must produce *exactly one geometry path* per region, not separate fill polygons and border polylines

This is a much stronger constraint than "derive from same truth." It means the rendering API contract is fundamentally different. The current `OwnerFillLayerRenderer` + `BorderLayerRenderer` split would need to collapse into a single `TerritoryRegionRenderer` that draws fill+stroke per region.

**Architect verdict:** The single-path mandate may have been correct for preventing sub-pixel divergence, but it creates coupling that blocks future visual richness (independent border glow, SDF borders, mesh-based borders).

> **USER DECISION (S1):** Independence. Separate fill/border caches, derived from same canonical truth. (See also S7 for testing the divergence claim.)

### S2. Game Systems Designer (Persona 3) — Emergent Behavior

**Finding:** Dynamic MSR from fleet strength creates a feedback loop. If territory visually expands when fleet grows:
- S2a. Players who are already winning get more visual territory → psychological "snowball" advantage
- S2b. Retreating territory during siege (Contested MSR) communicates vulnerability to the attacker
- S2c. This may or may not be desired — it's a game-feel question, not just a rendering question

The V2 Constraint Analysis has four MSR formulas but no playtest hypothesis. These need game-design evaluation:
- S2d. Does fleet-scaled territory make the game more readable or more intimidating?
- S2e. Does siege retreat make losing feel fair (honest feedback) or punishing (amplifies loss)?
- S2f. How do MSR expansion proposals interact with DY4 optimal transport transitions?

> **USER DECISION (S2):** Not a concern for now. Deferred.

### S3. Pragmatic Contractor (Persona 5) — Simpler?

**Finding:** The Codex audit identifies 20 mode families but the project has 1 developer. Implementing all 20 as separate registries is a multi-month effort.

The practical path might be: adopt the *naming* from the 20-mode taxonomy, but only build *registries* for territory (already in progress) and ship lifecycle (where mode switching is most gameplay-visible). Stars and lanes can stay as they are — direct renderer classes with config keys — until there's a concrete reason to modularize them.

### S4. Reliability Engineer (Persona 2) — Silent Failures

**Finding:** The V2-PRD's dirty-state bucket model reveals a reliability gap. The current fingerprint-based invalidation (`JSON.stringify(input.config ?? {})`) treats all config changes identically. But:
- S4a. A **smoothing change** should be near-instant (live recompute)
- S4b. A **topology swap** should warn the user about reset cost
- S4c. A **presentation-only change** (color, alpha, width) should never trigger a full recompile

Without bucket classification, there's no way to detect when a "cheap" change accidentally triggers an expensive full recompile. The user experience degrades silently — territory flickers or lags when you're just adjusting a slider.

**Example:** Right now, changing `VORONOI_LIGHTNESS` (a pure presentation concern — just changes fill alpha) triggers the same fingerprint invalidation as changing `MODIFIED_VORONOI_CORRIDOR_ENABLED` (a topology change that requires full geometry recompute). The first should take 0ms. The second might take 50-200ms. Both currently take the same path.

> **USER FOLLOW-UP REQUESTED:** Does this match your experience? Do you notice lag when adjusting visual-only sliders?

### S5. Visionary Futurist (Persona 10) — Theming System

**Finding (CORRECTED):** Three documents independently envision visual variant modes, but these in fact converge on the **already-implemented theming system**, which is more mature than any of them acknowledged:

**Existing theming infrastructure:**
- S5a. `categoryThemes.ts` — 748 lines, 11 theme categories (timing, combat, ships, surge, conquest, territory, ai, rules, debug, audio), super-categories
- S5b. `themePresets.ts` — full save/load/snapshot system with denylist, 4 built-in presets (Default, Neon Blitz, Arrow Capture, Minimal)
- S5c. `themes.ts` + `builtinThemes.ts` — core theme operations + curated presets
- S5d. `CategoryThemeBar.svelte` — per-category theme UI component
- S5e. `themeStore.svelte.ts` — Svelte 5 reactive theme store
- S5f. Feature items: F-48 (per-player VFX themes), F-63 (theme selector, DONE), F-73 (save/load, DONE), F-77 (theme sub-modules), R-122 (custom game themes, 🟡), R-123 (community content hub, 🔵), R-126 (category theme file persistence, 🔴)

**My earlier assumption was wrong.** This isn't a future idea — it's a first-class system with substantial implementation. The Codex "Cinematic Flow / Cartographic Command / High-Spectacle Conflict" variants map naturally to built-in theme presets.

### S6. Red Team Adversary (Persona 11) — Destructive Inputs

**Finding:** The analytical lane split formula `t = (dV(v)−dU(u)+w)/(2w)` has edge cases:
- S6a. **Division by zero** when `w = 0` (zero-weight lane) → produces `NaN` frontier positions
- S6b. **∞/∞** when both `dV(v)` and `dU(u)` are `Infinity` (no player owns either endpoint)

> **USER DECISION (S6):** Guard against NaN/divide-by-zero. Lanes must imperatively never be unowned — they can be owned by "neutral" by default.

### S7. Empiricist (Persona 6) — Show Me the Evidence

**Finding:** The single-path fill+stroke mandate claims sub-pixel divergence as the rationale. But:
- S7a. No benchmark or screenshot demonstrates this divergence
- S7b. The claim is "graphics APIs interpolate filled polygons differently than stroked polylines at the sub-pixel rendering level"
- S7c. PIXI.js v8 `Graphics` uses `fill()` and `stroke()` on the same path object — is the divergence still present in v8's API?

This should be tested, not assumed. A 15-minute experiment drawing a filled polygon and a stroked polygon from identical vertices would either confirm or kill the mandate.

> **USER DECISION (S7):** YES, test this. User notes: "I'm super tired of hearing about 'sub-pixel divergence' when the divergences have been HUNDREDS OF PIXELS and mass chaos. This is an example of post-hoc rationalization."

### S8. Domain Historian (Persona 9) — Prior Art

**Finding:** The CX/DX verdict from V2 Constraint Architecture was never acted on. `computeCorridorVirtuals()` and `computeDisconnectVirtuals()` are still in the codebase, being invoked, and producing geometry that may conflict with the analytical lane split.

> **USER NOTE (S8):** No concrete alternative to virtual stars has been validated for CX/DX. User is interested but cannot dispense with them without an alternative.

### S9. Second-Order Analyst (Persona 4) — Goodhart's Law

**Finding:** "One doc per topic" (first-round ontology principle #3) risks Goodhart's Law. If we consolidate aggressively, we create monolithic docs that become too large to read, too tangled to update, and too valuable to refactor.

> **USER IMPROVEMENT (S9):** Better heuristic: "One doc per topic, per scope, per audience." Some topics are so large that we may need high-level, plus mid and/or low-level docs.

---

## Part 2 Summary: New Gold from Second Pass

| ID | Finding | Source Persona | Status |
|----|---------|---------------|--------|
| S1 | Single-path mandate creates fill/border *coupling* | Architect (1) | ✅ Decision: Independence |
| S2 | Dynamic MSR creates snowball feedback loop | Game Designer (3) | ⏸ Deferred |
| S3 | 20-mode taxonomy useful as *naming*, not 20 *registries* | Contractor (5) | 📋 Noted |
| S4 | Missing dirty-state buckets → silent expensive recompiles | Reliability (2) | ❓ Awaiting user feedback |
| S5 | Theming system already substantially implemented (CORRECTED) | Visionary (10) | ✅ Corrected |
| S6 | Lane split formula has `w=0` and `∞/∞` edge cases | Red Team (11) | 🔧 Fix: guard + neutral default |
| S7 | Single-path divergence claim should be *tested* | Empiricist (6) | 🧪 To test |
| S8 | CX/DX still in codebase competing with analytical lane split | Historian (9) | ⏸ No alternative yet |
| S9 | "One doc per topic" → "per topic, per scope, per audience" | 2nd-Order (4) | ✅ Accepted |
