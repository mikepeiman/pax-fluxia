<!-- REVIEW: Add your comments inline using <!-- MIKE: comment --> markers -->
# Territory Engine V3 — Analysis Report & Design Questions

**Date**: 2026-03-15
**Purpose**: Pre-planning analysis for a new **five-mode** territory engine master plan, driven by [D-67](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.atlas/DECISIONS.md#L335) (Unify Static + Dynamic Methods).
**Source material reviewed**: All 6 root docs + 4 mode docs + 1 backend doc + task index from [master_plan_v2](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md), D-67 through D-71 in DECISIONS.md, [architectural-transfer-precheck](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/rules/architectural-transfer-precheck.md), [AI mental models article](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/SPECIFICATIONS/AI_mental_models_article.md).

---

## 1. What D-67 Actually Says

> A "static" map is just a dynamic map running at 60fps with no frontier changes. There should be ONE unified rendering pipeline that handles both steady-state and transition-state identically.

The current architecture has **three mode families** (static FG×5, dynamic DY×5, hybrid HY×5 = 15 modes), **three backends** (PVV2, PVV3, DF), and mutually exclusive route selection. This creates 75 theoretical combinations, but only FG2 is native end-to-end.

D-67 proposes collapsing the static/dynamic/hybrid axis entirely. The implication: **the 15 modes reduce to 5 unified methods**, each of which is always running as a continuous renderer that responds to ownership deltas.

---

## 2. What V2 Got Right (Preserve These)

| V2 Contribution | Why It Matters |
|---|---|
| Method ≠ Backend separation | Prevents confusion about what computes geometry vs what draws it |
| Canonical geometry = single source of truth | Eliminates the B-42 class of border/fill mismatch bugs |
| Route-truth concept | "What the UI shows" vs "what's actually running" must be explicit |
| Validation protocol (screenshots, fixtures, stop rules) | Without visual evidence, nothing is proven |
| Holding/component language over shell/hole | Keeps gameplay semantics distinct from render-time operations |
| PVV3 as active runtime, not legacy | Prevents routing new work away from the strongest current host |

---

## 3. What V2 Got Wrong (Eliminate These)

| V2 Problem | Why It's Wrong |
|---|---|
| Static/dynamic/hybrid as a top-level axis | Creates code duplication. Exactly the bug class D-67 identifies |
| 15 modes, 14 of which are placeholders | Organizational overhead massively exceeds implementation reality |
| Dynamic methods "anchor to" static methods | Implies the static geometry is computed first, then separately animated — but D-67 says the pipeline should be continuous |
| Hybrid as a category | If static and dynamic are unified, "hybrid" has no meaning at all |
| 75 theoretical route combinations | Untestable, unmaintainable, never-to-be-implemented combinatorial explosion |

---

## 4. Architectural Transfer Pre-Check (3 Questions)

Before collapsing 15 modes → 5, the [precheck rule](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/rules/architectural-transfer-precheck.md) requires answering three questions:

### 4.1 Counterfactual: What emergent properties change?

In v2, the static/dynamic split provides a **clean separation of concerns**: "compute the settled shape" (FG) is independent from "animate the transition" (DY). The hybrid layer composes them.

If we unify, we lose that separation. Each mode now owns both settled-shape computation AND transition behavior. The emergent risk: **transition logic becomes entangled with frontier generation**, making it harder to swap one without the other.

**Mitigation**: The unified pipeline should have internal stages (compute → diff → interpolate → render) even though it's one continuous loop. The stages replace the mode families as the separation boundary.

### 4.2 Perspective Simulation: What does the user experience?

The user sees territory that smoothly responds to ownership changes with no visual glitches. They switch between modes via a single dropdown (5 options, not 15). Each mode produces a visually distinct territory style. When nothing changes, the territory is still — no flicker, no unnecessary redraws.

This is **better** than v2's experience, where the UI had 15+ choices, many combinations were fake, and finding the "real" route required reading console logs.

### 4.3 Absence Test: What fills the void?

When we remove the "static rebuild" code path, what fills its role? In v2, static rebuild recomputes everything from scratch when the mode loads. In v3 unified, the pipeline just... runs. On the first frame, there's a delta from "nothing" to "current state." Subsequent frames have deltas from ownership changes.

**Key risk**: On first load, the "from nothing" delta must produce the same result as v2's static full-rebuild. If the dynamic pipeline can't handle "the entire map is new," it will produce garbage on initialization.

**Mitigation**: The first frame should be treated as a special case (or equivalently, the pipeline should handle "all stars changed ownership" as a normal delta that happens to touch everything).

---

## 5. Proposed Five-Mode Structure

> [!IMPORTANT]
> **This is my best interpretation. I need your confirmation or correction before proceeding.**

The five modes correspond to the five genuinely different **frontier generation strategies** from the FG column. The DY/HY layers collapse into a shared **transition engine** that all five use:

| Mode ID | Name | Core Algorithm | V2 Ancestor |
|---|---|---|---|
| **M1** | Adaptive Field | Biased influence field, frontier at balance point | FG1 |
| **M2** | Seed Graph | Discrete seeds, junctions, face/holding reconstruction | FG2 |
| **M3** | Implicit Trace | Pairwise implicit field, predictor-corrector contour tracing | FG3 |
| **M4** | Pairwise Arrangement | Bisector primitives, planar arrangement graph, face labeling | FG4 |
| **M5** | RT-Assisted Publish | Ownership RT pass, sub-texel extraction, vector publish | FG5 |

Each mode is a **continuously running renderer** that:
1. Computes canonical frontier geometry using its algorithm
2. Detects ownership deltas
3. Animates transitions using the shared transition engine (correspondence, interpolation, spawn/vanish)
4. Renders fills and borders from canonical geometry at all times

The **transition engine** (what v2 called DY1-DY5) becomes a shared library, not a mode axis.

---

## 6. Open Questions — Need Your Input

### Q1: Are these the right five?

The five FG methods are the most natural candidates because they represent genuinely different mathematical approaches. But you said "just five modes" — are these the five you meant? Or did you have a different grouping in mind?

### Q2: Shared transition engine vs per-mode transitions

The v2 DY methods had real algorithmic differences (span-graph morph vs local delta patch vs optimal transport). In the unified model, should there be:
- **(A)** One shared transition engine that all five modes use (simpler, but loses DY-specific intelligence), or
- **(B)** Each mode carries its own transition logic (more powerful, but re-entangles the concerns D-67 tried to separate)?

My recommendation is **(A)** — a shared transition engine that operates on the canonical geometry any mode produces. The DY-specific intelligence (like corridor event decomposition) can live as plugins/strategies within the shared engine rather than as separate modes.

### Q3: Backend consolidation

V2 maintained PVV2, PVV3, and DF as "equal backends." The reality: PVV3 is the active development surface and the only one consuming native artifacts. Should the v3 plan:
- **(A)** Keep all three as "equal" (continuity with v2),
- **(B)** Declare PVV3 as primary, PVV2/DF as reference/comparison, or
- **(C)** Reduce to PVV3-only and retire PVV2/DF from the plan?

### Q4: Naming vocabulary

D-70 introduced Territory/Front/Holding/Sector. Should the new plan:
- **(A)** Use D-70 vocabulary from the start, or
- **(B)** Keep v2 vocabulary for continuity with the codebase and migrate later?

### Q5: Additional context needed?

Are there documents I should review that I haven't seen? Specifically:
- The v1 master plan
- `TERRITORY_ARCHITECTURE_v3.md` (referenced in D-39)
- Current territory engine source code (to ground the plan in what actually exists)
- Any sketches, mockups, or visual references for the five-mode comparison UI

---

## 7. What The New Plan Will Contain (After Questions Are Resolved)

High-level structure for the v3 master plan:

1. **Executive overview** — what changed from v2 and why
2. **Five mode docs** — one per unified method, each covering algorithm + transition + validation
3. **Transition engine spec** — the shared substrate for ownership-delta animation
4. **Backend doc(s)** — updated backend responsibilities
5. **Validation protocol** — carried forward from v2 with unified-route adaptations
6. **Migration notes** — how existing FG2 code maps to the new structure

---

*Awaiting your responses before proceeding with the master plan draft.*
