# Agent Context Distillation — Consolidating 55 Files into 8

## Problem

The current agent context system has **55 files** (45 memory + 10 rules) totaling ~55KB. No AI agent can reasonably load all of these. The result:
- Most files are never loaded and therefore never followed
- Rules that *are* loaded compete for attention (everything marked "CRITICAL")
- Redundancy wastes tokens — 5 files say "expose tuning variables" in different words
- PRISM-Atlas-DART adds ceremony (identity rituals, 5-view Atlas updates before every change) that creates friction and gets skipped

## Diagnosis: What's Wrong with Current PRISM-Atlas-DART

### PRISM (5 Orthogonal Layers)
- ✅ **Good**: Structure/State/Flow/Driver/Correction as analytical lenses
- ❌ **Bad**: "You are BEAM" identity, "Confirmation Ritual" — pure token waste
- ❌ **Bad**: The PRISM LOOP is aspirational but never enforced practically

### Atlas (5 Required Views)
- ✅ **Good concept**: Architecture docs that stay in sync with code
- ❌ **Bad**: 5 separate Mermaid-heavy files that quickly go stale
- ❌ **Bad**: Trigger matrix rule says "update ALL Atlas views before code" — this never happens
- 🔄 **Fix**: Replace with a single living architecture doc, updated incrementally

### DART (Verify Assumptions)
- ✅ **Solid** — "30 seconds of search prevents 30 minutes of rework"
- 🔄 **Fix**: Keep the principle, lose the acronym ceremony

### User's Own Meta-Analysis (2026-02-18)
The user's [PRISM critique](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/SYSTEM/PRISM%20critique%20improvements%202026-02-18.md) independently identified every problem this plan addresses, plus three key additions:

1. **Variable Rigour** — PRISM needs gears, not an on/off switch:
   - **Gear 1 (Hotfix)**: Code first → agent auto-updates docs
   - **Gear 2 (Feature)**: Standard loop
   - **Gear 3 (Deep Work)**: Atlas-first, strict protocol
2. **Entropy Defense** — Atlas Rot is the existential threat. Prompt-level enforcement is soft; system-level enforcement is hard. Until CI/CD hooks exist, the agent must self-enforce.
3. **Meta-Work Warning** — "STOP DEFINING. Build the Atlas manually for one real feature." This distillation is the **last** meta-work before we return to implementation mode.

All three are incorporated into the design below.

## Design: The New System

> **Core Principles**:
> - Fewer files, denser content, tiered importance, load-on-demand
> - Variable Rigour: 3 gears, not binary on/off
> - This is the LAST meta-work — after this, we build

### New Directory Structure

```
.agent/
├── AGENT.md                     # THE master file (~300 lines). Always load.
├── context/                     # Domain-specific deep dives (load as needed)
│   ├── code-standards.md        # Naming, DRY, file sizes, logging, refactoring
│   ├── debugging.md             # Investigation methodology, user trust, forensics
│   ├── game-design.md           # Attack≠Transfer, animations, game time, orders, specs
│   ├── ui-patterns.md           # Layout map, dark theme, responsive, CSS, reactivity
│   ├── architecture.md          # Shared engine, monorepo, Colyseus, schemas, convergence
│   ├── workflow.md              # Git, commits, task discipline, session docs
│   └── tech-gotchas.md          # Colyseus module resolution, Bun quirks, etc.
├── rules/                       # KEPT — these inject into system prompt via MEMORY[]
│   └── (6 distilled files)      # Consolidated from 10 → 6
├── .skills/                     # KEPT — on-demand skill loading
│   ├── atlas-protocol/          # Evolved: simpler, single-doc architecture
│   └── prism-architect/         # Evolved: analytical framework without ceremony
└── workflows/                   # KEPT as-is
```

### The Master File: `AGENT.md`

This single file replaces loading dozens of memory files. It contains the **distilled essence** of all 55 files in ~300 lines, organized into sections:

1. **Project Identity** (~20 lines) — what this is, tech stack, repo structure
2. **Variable Rigour** (~15 lines) — the 3 gears, when to use each
3. **Hard Rules** (~40 lines) — non-negotiable behavioral constraints
4. **Code Standards** (~30 lines) — naming, file sizes, logging, DRY
5. **Design Principles** (~40 lines) — tunability, backwards-compat, animation modes
6. **Debugging Protocol** (~30 lines) — trust user, multiple hypotheses, verify
7. **Game Domain** (~30 lines) — attack≠transfer, game time, orders, specs
8. **UI/UX** (~20 lines) — layout rules, dark theme, responsive
9. **Architecture** (~30 lines) — shared engine, convergence status
10. **Workflow** (~20 lines) — git, sessions, task queue
11. **Repeated Failures** (~20 lines) — things agents keep getting wrong

### Consolidation Map

| New File | Absorbs These Old Files |
|----------|------------------------|
| `AGENT.md` | ALL files below (distilled summary of each) |
| `context/code-standards.md` | `semantic-naming.md` (×2), `no-console-log.md`, `file-size-limits.md`, `modularize-large-files.md`, `dry-principles.md`, `no-special-case-exceptions.md`, `exhaustive-reference-cleanup.md`, `mandatory-search-before-refactor.md` |
| `context/debugging.md` | `deep-thinking-protocol.md`, `trust-user-feedback.md`, `verification-first.md`, `problem-solving-integrity.md`, `multiple-hypotheses.md`, `debug-forensics-scope.md`, `fresh-start-debugging.md`, `verify-assumptions.md`, `ask-user-for-visuals.md` |
| `context/game-design.md` | `pax-fluxia-gdd-context.md`, `animation-imperative.md`, `use-gametime-only.md`, `opposing-orders-rule.md`, `spec-compliance.md`, `backwards-compat-effects.md`, `collect-dont-rewrite.md`, `expose-tuning-variables.md`, `maximum-tuning.md`, `scaffold-first.md`, `scope-shared-functions.md`, `pax-galaxia-vs-fluxia.md` |
| `context/ui-patterns.md` | `verify-ui-placement.md`, `ui-dark-theme-contrast.md`, `css-grid-named-areas.md`, `slider-reactivity.md`, `no-goalpost-moving.md` |
| `context/architecture.md` | `shared-engine-architecture.md`, `engine-convergence.md`, `tech-stack.md`, `use-bun-only.md`, `colyseus-module-resolution.md` |
| `context/workflow.md` | `git-version-control.md` (×2), `git-branching.md`, `task-queue-discipline.md`, `session-documents.md`, `docs-first-policy.md`, `clickable-code-refs.md`, `repeated-instructions-tracker.md`, `user-words-are-specs.md`, `active-settings-reference.md`, `theme-versioning.md`, `document-everything.md` |
| `context/tech-gotchas.md` | `colyseus-module-resolution.md`, `powershell-no-chain.md` |

### Rules Consolidation (10 → 6)

| New Rule File | Absorbs |
|---------------|---------|
| `browser-usage.md` | KEEP as-is |
| `document-everything.md` | KEEP as-is |
| `git-version-control.md` | Merge with `powershell-no-chain.md` |
| `code-quality.md` | Merge `no-console-log.md` + `semantic-naming.md` |
| `trust-user-feedback.md` | Merge with `verification-first.md` + `verify-assumptions.md` |
| `trigger-matrix.md` | EVOLVE — simpler pre-flight check |

### PRISM-Atlas-DART Evolution

**Atlas Protocol** evolves from 5 mandatory Mermaid-heavy views to:
- A single `/.atlas/ARCHITECTURE.md` living document
- Updated incrementally (not "all 5 views before any code")
- The 5 existing Atlas view files remain but are reference artifacts, not gates

**PRISM Architect** evolves from:
- ❌ "You are BEAM" identity → stripped
- ❌ "Confirmation Ritual" → stripped
- ✅ 5 Orthogonal Layers → kept as analytical framework
- ✅ PRISM LOOP (Intent → Map → Code → Heal) → kept but simplified

## What Gets Cut (Not Merged — Removed)

| Cut | Reason |
|-----|--------|
| "You are BEAM" identity text | Token waste, no behavioral impact |
| "Confirmation Ritual" response | Token waste |
| Priority inflation ("CRITICAL" on everything) | Replaced with tiered importance |
| Duplicate git rules (3 files → 1) | Pure redundancy |
| `use-bun-only.md` standalone | Merged into tech stack section |
| CSS conflict (flex-first vs grid-first) | Resolved into single coherent rule |

## CSS Rule Resolution

> [!IMPORTANT]
> Current conflict: `DESIGN_RULES.md` says "Flex for simple layouts, Grid for complex." `css-grid-named-areas.md` says "CSS Grid with named areas is the DEFAULT for all layouts."
>
> **Resolution**: Grid with named areas is the default. Flex is acceptable for trivial single-axis layouts (e.g., a row of buttons). This matches the user's most recent instruction.

## Proposed Changes

### `.agent/` directory

#### [NEW] [AGENT.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/AGENT.md)
Master context file — ~300 lines, always load first. Contains distilled essence of all 55 files.

#### [NEW] [context/code-standards.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/context/code-standards.md)
Deep dive: naming conventions, file size limits, logging, DRY, refactoring rules.

#### [NEW] [context/debugging.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/context/debugging.md)
Deep dive: investigation methodology, trust user, multiple hypotheses, forensics.

#### [NEW] [context/game-design.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/context/game-design.md)
Deep dive: attack≠transfer, animation rules, game time, orders, tunability.

#### [NEW] [context/ui-patterns.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/context/ui-patterns.md)
Deep dive: layout map, dark theme, responsive breakpoints, CSS patterns, Svelte 5 reactivity.

#### [NEW] [context/architecture.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/context/architecture.md)
Deep dive: shared engine, monorepo structure, Colyseus, engine convergence status.

#### [NEW] [context/workflow.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/context/workflow.md)
Deep dive: git workflow, task discipline, session docs, completion reports, settings reference.

#### [NEW] [context/tech-gotchas.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/context/tech-gotchas.md)
Specific technical traps: Colyseus module resolution, PowerShell syntax, Bun-only.

### Rules consolidation

#### [MODIFY] Consolidate 10 rule files → 6 rule files
Merge overlapping rules, keep system-prompt-injected MEMORY[] files lean.

### Skills evolution

#### [MODIFY] [atlas-protocol SKILL.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/.skills/atlas-protocol/SKILL.md)
Evolve from 5-view ceremony to incremental architecture doc approach.

#### [MODIFY] [prism-architect SKILL.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/.skills/prism-architect/SKILL.md)
Strip identity/ritual, keep analytical framework and PRISM LOOP.

### Old files

#### [DELETE] `.agent/memory/` — entire directory (45 files)
All content absorbed into `AGENT.md` + `context/` files.

> [!WARNING]
> The old `.agent/memory/` and `.agent/rules/` directories should be kept temporarily (renamed to `.agent/_archive_memory/` and `.agent/_archive_rules/`) until you confirm the new system works. They can be deleted in a future cleanup pass.

## Verification Plan

### Manual Verification
1. **Token count check**: Verify `AGENT.md` is under 350 lines
2. **Coverage check**: For each of the 55 original files, verify its key rules appear in either `AGENT.md` or the appropriate `context/` file
3. **No-loss check**: User reviews the consolidation and confirms no critical knowledge was dropped
4. **CSS conflict resolved**: Verify the UI patterns doc has a single coherent CSS rule
5. **Loading test**: In a new conversation, load only `AGENT.md` and verify it provides sufficient context for basic work
