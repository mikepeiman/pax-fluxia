# Second-Pass: Expanded Ontologies + Agent Council Ingestion

**Appends to:** `2026-03-25__1247 DEEP_INGESTION_FINDINGS.md` (first-round results preserved)

---

## Part 1: Expanded Ontology Brainstorming

### Why the first round was unbalanced

The first-round ontology proposals reflected my tunnel vision on the territory refactor. But this project has documentation covering:

- **Game design** (mechanics, conquest, balance, star types)
- **Ship lifecycle** (orbit, travel, attack, conquest, transport, damage, repair, destruction)
- **Stars & lanes** (rendering, labels, orders, contested states)
- **Territory** (geometry, transitions, constraints, rendering)
- **VFX & animation** (FX orchestrator, surge, timing, easing)
- **Audio** (system spec, implementation)
- **UI/Controls** (settings panels, layout, responsive design)
- **Engine/Architecture** (Colyseus, game loop, state management)
- **Visual design** (aesthetic targets, GDD visual spec, variant modes)
- **Post-mortems** (failure analysis, lessons)
- **Process** (defect prevention, development history, process improvements)
- **Agentic tooling** (prompts, rules, mental models, heuristics)
- **Session records** (daily notes, chat logs, sprint status)
- **Decisions** (D-nn log)
- **Feature tracking** (ideas, status, regressions, roadmap)
- **Research** (Perplexity, NotebookLM, Codex outputs)

That's 16 distinct categories. Any ontology that puts 4 of 6 slots on "territory" is failing the Architect(1) test for balanced abstraction.

---

### Ontology D: By Concern Domain (Flat)

The simplest possible structure. One folder per real concern. No nesting.

```
.agent/docs/
├── territory/           # Pipeline, geometry, transitions, constraints
├── ships/               # Ship lifecycle, orbit, travel, attack, conquest
├── stars/               # Star rendering, labels, types, selection
├── lanes/               # Lane rendering, orders, contested states
├── combat/              # Attack mechanics, damage, repair, destruction
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
- Contractor: 21 top-level folders is too many. Some will have 1-2 files. Navigating this is worse than the current mess.
- **Verdict:** Too flat. Territory, ships, stars, lanes, combat could be grouped.

---

### Ontology E: By Game System + Meta (Grouped)

Groups related game systems under `game/`, keeps meta-concerns separate.

```
.agent/docs/
├── game/                           # Everything about the game itself
│   ├── design/                     # Game mechanics, balance, conquest rules
│   ├── territory/                  # Pipeline, geometry, transitions, constraints
│   ├── combat/                     # Ships, attack, damage, repair, destruction FX
│   ├── map/                        # Stars, lanes, orders, contested states
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

### Ontology F: By Document Purpose (What-For)

Instead of organizing by *topic*, organizes by *why you'd reach for this doc*.

```
.agent/docs/
├── north-star/                     # Vision documents — the WHAT and WHY
│   ├── game-design.md              # Mechanics, balance, conquest
│   ├── visual-design.md            # GDD visual spec, aesthetic targets
│   ├── audio-design.md             # Audio system spec
│   └── territory-intent.md        # What territory should feel like
│
├── contracts/                      # Authoritative technical specs — the HOW
│   ├── territory-pipeline.md       # 4-layer pipeline, canonical contracts
│   ├── territory-constraints.md    # MSR, DX, lane-exclusivity, invariants
│   ├── rendering-architecture.md   # 20-mode taxonomy, registries
│   ├── transition-inventory.md     # All transition types, call flows
│   ├── fx-pipeline.md              # FX orchestrator, VFX timing
│   ├── engine-architecture.md      # Colyseus, game loop, state
│   └── ui-controls.md              # Settings panels, config keys
│
├── inventories/                    # Living catalogs — WHAT EXISTS
│   ├── geometry-atlas.md           # All geometry code cataloged
│   ├── renderer-audit.md           # All renderers: status, disposition
│   ├── feature-status.md           # Feature ideas, status, regressions
│   └── tech-stack.md               # Dependencies, frameworks
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
│   ├── decisions/                  # D-nn entries
│   ├── post-mortems/               # Failure analysis
│   ├── process/                    # Defect prevention, improvements
│   └── development-history.md      # Timeline narrative
│
├── sessions/                       # Daily records
│   ├── notes/                      # SESSION_YYYY-MM-DD.md
│   └── chats/                      # CHAT_YYYY-MM-DD.md
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

### Ontology G: Minimal Viable (Contractor's Choice)

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

### Comparison Matrix

| Criterion | D (Flat) | E (Game System) | F (Purpose) | G (Minimal) |
|-----------|----------|-----------------|-------------|-------------|
| Balance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Navigability | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Scalability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Migration effort | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| "Where does X go?" clarity | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Keeps dates & tool names | ✅ | ✅ | ✅ | ✅ |

**My recommendation:** Ontology E. It balances structure with navigability, respects the game-system mental model, and has clear places for everything including the new `agentic/` category.

---

## Part 2: Second-Pass Ingestion (Agent Council Lenses)

### Method

Re-read the same 16 documents through Agent Council persona lenses. First-round gold nuggets preserved; this adds new findings from different perspectives.

### Systems Architect (Persona 1) — Hidden Coupling

**Finding: The V3 Master Architecture's "Single-Path" mandate creates a hidden coupling between fill and border rendering.** If fills and borders must use the same `fill()` then `stroke()` call, then:
- Border width becomes a function of fill alpha (stroked borders at 0.5 alpha blend with the fill beneath)
- You can never have independent border visual treatments (glow, SDF softness) without abandoning single-path
- The transition layer must produce *exactly one geometry path* per region, not separate fill polygons and border polylines

This is a much stronger constraint than "derive from same truth." It means the rendering API contract is fundamentally different. The current `OwnerFillLayerRenderer` + `BorderLayerRenderer` split would need to collapse into a single `TerritoryRegionRenderer` that draws fill+stroke per region.

**Architect verdict:** The single-path mandate may have been correct for preventing sub-pixel divergence, but it creates coupling that blocks future visual richness (independent border glow, SDF borders, mesh-based borders). This deserves explicit decision-log treatment: **is sub-pixel alignment worth sacrificing border independence?**

### Game Systems Designer (Persona 3) — Emergent Behavior

**Finding: Dynamic MSR from fleet strength creates a feedback loop.** If territory visually expands when fleet grows:
- Players who are already winning get more visual territory → psychological "snowball" advantage
- Retreating territory during siege (Contested MSR) communicates vulnerability to the attacker
- This may or may not be desired — it's a game-feel question, not just a rendering question

**The V2 Constraint Analysis has four MSR formulas but no playtest hypothesis.** These need game-design evaluation:
1. Does fleet-scaled territory make the game more readable or more intimidating?
2. Does siege retreat make losing feel fair (honest feedback) or punishing (amplifies loss)?
3. How do MSR expansion proposals interact with DY4 optimal transport transitions?

### Pragmatic Contractor (Persona 5) — Simpler?

**Finding: The Codex audit identifies 20 mode families but the project has 1 developer.** Implementing all 20 as separate registries is a multi-month effort. The first-round findings treated this as "broader scope exists" — but the contractor lens asks: **do we actually need 20 registries, or is the taxonomy useful mainly as a naming reference?**

The practical path might be: adopt the *naming* from the 20-mode taxonomy, but only build *registries* for territory (already in progress) and ship lifecycle (where mode switching is most gameplay-visible). Stars and lanes can stay as they are — direct renderer classes with config keys — until there's a concrete reason to modularize them.

### Reliability Engineer (Persona 2) — Silent Failures

**Finding: The V2-PRD's dirty-state bucket model reveals a reliability gap.** The current fingerprint-based invalidation (`JSON.stringify(input.config ?? {})`) treats all config changes identically. But:
- A smoothing change should be near-instant (live recompute)
- A topology swap should warn the user about reset cost
- A presentation-only change should never trigger a full recompile

**Without bucket classification, there's no way to detect when a "cheap" change accidentally triggers an expensive full recompile.** This is a silent performance failure that degrades user experience without any error.

### Visionary Futurist (Persona 10) — What's Being Built For?

**Finding: Three documents independently envision visual variant modes:**
- V2-PRD: border families (straight, curved, segmented)
- Codex Visual Spec: Cinematic Flow, Cartographic Command, High-Spectacle Conflict
- V3 Master Architecture: presentation families as config

These all point to a **theme system** — a meta-setting that configures multiple visual parameters simultaneously. This is a natural extensibility corridor that would make the game's visual identity player-customizable. None of the implementation plans address it, but it's a strong future feature that should influence architecture now (e.g., making sure visual parameters are grouped into coherent theme-able sets rather than scattered across 50 config keys).

### Red Team Adversary (Persona 11) — Destructive Inputs

**Finding: The analytical lane split formula `t = (dV(v)−dU(u)+w)/(2w)` has a division-by-zero edge case when `w = 0`.** This represents a zero-weight lane, which may or may not be possible in the game model. If it is possible, the formula silently produces `NaN` frontier positions.

Also: what happens when `dV(v)` and `dU(u)` are both `Infinity` (no player owns either endpoint)? The formula produces `NaN/NaN`. Early-game states with unowned stars need explicit handling.

### Empiricist (Persona 6) — Show Me the Evidence

**Finding: The single-path fill+stroke mandate claims sub-pixel divergence as the rationale.** But:
- No benchmark or screenshot demonstrates this divergence
- The claim is "graphics APIs interpolate filled polygons differently than stroked polylines at the sub-pixel rendering level"
- PIXI.js v8 `Graphics` uses `fill()` and `stroke()` on the same path object — is the divergence still present in v8's API?

**This should be tested, not assumed.** A 15-minute experiment drawing a filled polygon and a stroked polygon from identical vertices would either confirm or kill the mandate.

### Domain Historian (Persona 9) — Prior Art

**Finding: The CX/DX verdict from V2 Constraint Architecture was never acted on.** This means `computeCorridorVirtuals()` and `computeDisconnectVirtuals()` are still in the codebase, being invoked, consuming compute, and producing geometry that may conflict with the analytical lane split. This is not just a cleanup item — it's a potential source of bugs where two competing mechanisms both influence the same frontier positions.

### Second-Order Analyst (Persona 4) — Goodhart's Law

**Finding: "One doc per topic" (ontology principle #3 from the first round) risks Goodhart's Law.** If we consolidate aggressively, we create monolithic docs that become too large to read, too tangled to update, and too valuable to refactor. The *metric* (fewer docs) becomes a *target* that degrades the *goal* (less context bloat).

Better heuristic: **one doc per topic per audience**. A "territory constraints" doc for the architect is different from a "territory constraints" doc for the game designer. The architect cares about MSR implementation (seed offsets in Dijkstra). The game designer cares about "does territory size track fleet strength?"

---

## Part 2 Summary: New Gold from Second Pass

| # | Finding | Source Persona | Impact |
|---|---------|---------------|--------|
| S1 | Single-path mandate creates fill/border *coupling*, not just alignment | Architect (1) | Architecture decision needed |
| S2 | Dynamic MSR creates snowball feedback loop — needs game-design evaluation | Game Designer (3) | Game design decision |
| S3 | 20-mode taxonomy is useful as *naming*, not necessarily as 20 *registries* | Contractor (5) | Scope decision |
| S4 | Missing dirty-state buckets → silent expensive recompiles | Reliability (2) | Performance bug risk |
| S5 | Three docs all point to a theme system (visual variants) | Visionary (10) | Future architecture |
| S6 | Lane split formula has `w=0` and `∞/∞` edge cases | Red Team (11) | Correctness bug |
| S7 | Single-path divergence claim should be *tested*, not assumed | Empiricist (6) | Decision validation |
| S8 | CX/DX still in codebase, competing with analytical lane split | Historian (9) | Active bug risk |
| S9 | "One doc per topic" risks monolithic docs (Goodhart) — better: "per topic per audience" | 2nd-Order (4) | Ontology refinement |
