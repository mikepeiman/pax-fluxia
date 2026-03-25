# Territory Engine 15-Mode Plan Review (2026-03-13)

## Executive Result

Yes. There is now strong cause to write a revised plan.

The original 5x5x5 method framing is still useful and should be kept. What no longer fits reality is the way runtime/render backends have been mentally bundled into those method families.

The important correction is:

- `FG/DY/HY` are algorithm families and contracts.
- `PVV3` is an active runtime/backend and renderer host.
- `PVV2` and `DF` are also backends/adapters, but not the same kind of architectural target as the method IDs.

So the right move is not to replace the 15-mode model. It is to rewrite the plan around a cleaner separation of concerns.

## What Still Holds

- Keep the 15 stable IDs: `FG1..FG5`, `DY1..DY5`, `HY1..HY5`.
- Keep the registry-driven modular engine.
- Keep runtime mode selection as exclusive: `static`, `dynamic`, `hybrid`.
- Keep step-debugging and trace inspection as first-class requirements.
- Keep FG2 as the first native end-to-end geometry path.

These were good decisions and still fit the codebase.

## What Has Changed

### 1. FG2 is no longer just a concept

FG2 now has a real native pipeline and real artifacts:

- metric
- world extension
- seed
- topology
- geometry
- loop
- animation
- render

That means the plan can now be written around actual native data products instead of only around future abstractions.

### 2. PVV3 is not just an old adapter

Current code shows PVV3 doing active, non-trivial work:

- running the FG2 pipeline directly
- consuming FG2 shell/loop/animation artifacts
- rendering canonical fills from those artifacts
- handling playback/display geometry
- falling back to its own internal merged-cell path when FG2 artifacts are unavailable

That is not "legacy" in the useful sense. It is an active execution surface.

### 3. The current registry vocabulary is now partially misleading

The registry still describes adapters as:

- `legacy_pvv2`
- `legacy_pvv3`
- `legacy_df`

That was acceptable during the bootstrap phase, but it is now conceptually inaccurate for PVV3 specifically.

### 4. Runtime exclusivity is real

The browser-confirmed route behavior matters for planning:

- `static` mode runs the selected static method
- `dynamic` mode runs the selected dynamic method, and that method pins its own static anchor
- `hybrid` mode runs the selected hybrid plan, which pins both legs

This means many apparent UI combinations are not true live combinations.

## Revised Architecture Model

The next plan should separate the system into five distinct layers:

### A. Static Frontier Method

This is the `FG` family.

Question answered:
- How is the authoritative frontier geometry or territorial partition derived for a settled state?

### B. Dynamic Update Method

This is the `DY` family.

Question answered:
- How is the territory state updated across ownership changes, conquest events, or morph windows?

### C. Hybrid Orchestration

This is the `HY` family.

Question answered:
- How are the static and dynamic strategies combined into one runtime route?

### D. Runtime / Backend / Renderer Host

This is where `PVV3`, `PVV2`, and `DF` belong.

Question answered:
- What execution surface consumes artifacts and produces displayed fills, borders, transitions, and debug views?

### E. Diagnostics Surface

This includes:

- trace mode
- step mode
- route inspector
- browser diagnostics
- artifact publication

Question answered:
- How do we inspect the pipeline and compare methods safely?

## How PVV3 Fits

PVV3 should now be modeled as:

- the main active frontier-first runtime/backend
- the primary renderer host for native territory-engine outputs
- a temporary adapter surface for still-partial modes

PVV3 is not one of the 15 methods.

It is the active runtime that can host one or more of those methods.

More concretely:

- `FG2` is a geometry-production method
- `DY5` is a dynamic update strategy
- `PVV3` is the active runtime that can execute and display them

This resolves the earlier false framing where `FG2` and `PVV3` sounded like competing systems.

## Recommendation on the 15-Mode Plan

### Keep

- the 15 IDs
- the modular registry
- the stage model
- the benchmark/toggle-oriented evaluation approach

### Rewrite

Write a `15-mode plan v2` that explicitly distinguishes:

1. method identity
2. implementation status
3. anchor relationships
4. runtime/backend used today
5. intended runtime/backend long term

Without that rewrite, the plan will keep mixing "what the method is" with "what currently runs it."

## Updated Status Framing

The plan should now report modes in two dimensions:

### Method maturity

- native
- adapter-backed
- planned

### Runtime maturity

- active in PVV3
- active in PVV2
- active in DF
- trace-only
- planned

That is more accurate than the current single-axis "full / partial / not yet" language.

## Immediate Planning Consequences

### 1. Rename adapter vocabulary

Recommended:

- `legacy_pvv3` -> `pvv3_runtime`
- `legacy_pvv2` -> `pvv2_adapter`
- `legacy_df` -> `df_adapter`

This is not just cosmetic. It prevents bad architectural reasoning.

### 2. Reclassify the current shipped state

Current reality is closer to:

- `FG2`: native method
- `DY5`: adapter-backed dynamic route running on PVV3
- `PVV3`: active runtime/backend with dual capability:
  - consume canonical FG2 artifacts
  - fall back to older merged-field/merged-cell logic

### 3. Treat PVV3 development as part of the same territory-engine roadmap

The plan should stop treating PVV3 work as external to the 15-mode effort.

Instead:

- native methods feed PVV3
- PVV3 exposes the artifacts
- PVV3 hosts debug playback and comparison

## Recommended Next Plan Shape

The new plan should have four tables:

### Table 1: Method Contracts

- all 15 IDs
- intended frontier/update behavior
- anchor assumptions

### Table 2: Current Implementation Reality

- native stages implemented
- fallback/adapters still in use
- runtime/backend actually used today

### Table 3: Backend Role Matrix

- PVV3
- PVV2
- DF

For each:

- canonical consumer?
- bootstrap adapter?
- benchmark comparator?
- slated for removal?

### Table 4: Next Delivery Sequence

Suggested order:

1. harden FG2 canonical geometry and fill/border coincidence
2. define native DY5 against FG2 holdings and events
3. extract PVV3 runtime/backend contract from current mixed implementation
4. decide whether FG1 remains a real target or is replaced/reframed
5. review which HY plans remain meaningful after native DY work begins

## Final Judgment

There is good cause to write a new plan.

Not because the 15-mode idea failed.

Because the system has advanced enough that the old plan no longer describes the actual architecture cleanly, especially around PVV3.

The correct revision is:

- keep the 15-mode framework
- rewrite the plan around method-vs-backend separation
- explicitly place PVV3 as an active runtime/backend in the new architecture
