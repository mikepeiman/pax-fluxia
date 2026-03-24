# Semantic Frontier Topology — Project Overview

**Status:** PLANNING  
**Created:** 2026-03-23  
**Goal:** Replace anonymous polygon geometry with semantic frontier topology for robust conquest transitions.

---

## The Problem

Territory transitions fail because the geometry compiler outputs anonymous vertex arrays with no identity, orientation, or structural correspondence between frames. The transition layer must guess which vertices correspond to which — and gets it wrong for orientation, rotational alignment, and multiple regions per owner.

## The Solution

Make the geometry compiler output **semantic frontier topology**: identified frontier vertices, identified frontier sections (shared edges between owners), and region loops defined as ordered section references. Transitions then diff at the section/vertex level with guaranteed correspondence.

## Project Structure

```
.agent/SPECIFICATIONS/frontier-topology-project/
├── 00-PROJECT-OVERVIEW.md          ← you are here
├── 01-PHASE-1-TYPES.md             ← new type definitions (Sprint 1)
├── 02-PHASE-2-COMPILER-EMIT.md     ← make compiler emit topology (Sprint 2)
├── 03-PHASE-3-TRANSITION-PLANNER.md ← section-aware planner (Sprint 3)
├── 04-PHASE-4-FRAME-SAMPLER.md     ← CDF-based frame sampler (Sprint 4)
├── 05-PHASE-5-PRESENTATION.md      ← consume topology for rendering (Sprint 5)
└── CODE-MAP.md                     ← precise file/function/type reference
```

## Phases

| Phase | Sprint | Goal | Risk |
|-------|--------|------|------|
| 1 | Types | Define `FrontierTopology`, `FrontierVertex`, `FrontierSection`, `RegionLoop` types | Low — pure type definitions |
| 2 | Compiler Emit | Make `Geometry_0319.ts` populate `FrontierTopology` alongside existing output | Medium — compiler is complex |
| 3 | Transition Planner | Build section-aware planner: vertex matching → section matching → anchor plans → OT transport maps | High — core algorithmic work |
| 4 | Frame Sampler | Sample transition plan at progress t, rebuild frame sections and loops | Medium — uses planner output |
| 5 | Presentation | Wire `FillTransitionFrame` and `BorderTransitionFrame` from sampled frontier | Low — interface already exists |

## Critical Constraints

1. **Backwards compatible** — existing rendering must continue working while new code is built alongside
2. **No PIXI in compiler/transition** — strict layer separation
3. **Static borders zero-jitter** — unchanged sections pass through bit-identical
4. **Fills derive from borders** — both rebuilt from same frame-t frontier sections
5. **DY4 sacrosanct** — do not alter DY4 visual behavior without explicit approval

## Key Invariant

> A `FrontierSection` exists exactly once. Two owners do not get separate copies of the same shared border. Region loops reference sections; they do not own copied points.
