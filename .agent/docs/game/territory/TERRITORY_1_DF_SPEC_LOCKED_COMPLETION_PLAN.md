# Territory #1: Spec-Locked Completion Plan (DF Canonical + Two-Pass Dual Track)

## 1. Scope and Locked Decisions

- Canonical deliverable is Distance Field mode in `pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts`.
- Other territory renderers remain frozen (no behavior changes).
- Dual track:
  - Ship deterministic single-pass DF completion.
  - Run isolated two-pass alignment track for B-37 without regressing canonical pass.
- Locked rules:
  - Disconnect (DX) uses component connectivity (Union-Find), not direct-edge-only.
  - Influence tie handling is deterministic with lexical owner-id tie-break.
  - Correctness and alignment are prioritized over performance targets.

## 2. Non-Negotiable Acceptance Constraints

- Territory fills and borders align with star map coordinates.
- Stars are visually centered in owned territory.
- Graph-aware influence remains authoritative (not pure Euclidean mode).
- Disconnected same-owner components are separated by enemy territory.
- Borders are thick, blended, and lane-consistent.
- Temporal morph is smooth on topology/geometry changes and stable otherwise.
- No ownership-free holes between territories.

## 3. Implementation Plan

### Step A: Alignment Contract and Diagnostics

- Add a small internal alignment-contract helper in DF renderer.
- Validate one coordinate space for:
  - display stars
  - world dimensions
  - data-texture packing
  - mesh geometry
  - shader sampling
- Add diagnostic payloads for sampled points and pass mapping checks.
- Guard content bounds and padding invariants before rebuild.

### Step B: Deterministic Input Canonicalization

- Canonicalize stars and connections before all DF fingerprints and compute:
  - stable star ordering by id
  - stable connection normalization and sort
- Canonicalize virtual-site order and dedupe output.
- Classify changes into:
  - `geometry`
  - `topology`
  - `visual`
- Morph only on `geometry`/`topology`; visual-only updates do not restart morph.

### Step C: Single-Pass DF Feature Completion

- Harden corridor site generation:
  - deterministic spacing/count mode behavior
  - deterministic ordering and dedupe
- Fix disconnect site generation (DX) under component-connectivity rule:
  - ensure non-zero generation where expected
  - deterministic nearest-enemy owner assignment
  - deterministic tie resolution
- Keep minimum-star-radius behavior deterministic and artifact-safe.
- Preserve blended border behavior from shared influence data.

### Step D: Two-Pass Dual Track (B-37)

- Isolate two-pass path behind internal flag (no UI toggle required).
- Instrument and compare sampled ownership/mapping against canonical single-pass.
- Fix known misalignment contributors incrementally:
  - content-bounds overwrite path first
  - then remaining coordinate-mapping deltas
- Two-pass must not change canonical path behavior while in progress.

### Step E: Regression Safety and Verification

- Add spec harness tests for deterministic helpers:
  - canonicalization stability
  - change classification stability
  - DX generation determinism and non-zero representative case
  - tie-break determinism
- Maintain manual scenario matrix for:
  - alignment
  - connectivity truthfulness
  - border behavior
  - morph stability

## 4. Planned Deliverables by Commit

1. Plan document commit (this file).
2. Alignment contract + diagnostics scaffolding.
3. Deterministic canonicalization + invalidation-classification path.
4. Corridor/DX deterministic generation and fix.
5. Shader tie-break and morph-gating updates.
6. Two-pass isolated instrumentation track and incremental B-37 fixes.
7. Spec harness tests + scenario matrix doc.

## 5. Out of Scope for This Completion

- Functional behavior changes to Voronoi/Power/Modified/Pixel/Lane/Graph/Contour renderers.
- New user-facing mode toggles.
- Performance optimization beyond regression prevention, unless correctness changes force it.