# PVV3 Backend

## Purpose

`PVV3` is an active runtime/backend and the primary frontier-first renderer host under active development. It must be treated as a first-class maintained backend in the territory-engine architecture, not as a legacy bucket.

## Strengths

- Already consumes native `FG2` artifacts directly
- Best current host for frontier-first iteration and renderer integration
- Strongest current path for demonstrating canonical geometry concepts in a live renderer

## Weaknesses

- Still carries mixed semantics from both native and adapter-backed routes
- Route/backend truth can remain implicit unless trace and validation are explicit
- Dynamic and hybrid parity is not yet fully rebuilt on canonical artifacts

## Current Live Routes

Today `PVV3` is the active backend for these route families:

- `FG2 Seed Graph`
- `DY1 Span Graph Morph`
- `DY5 Corridor Event Decomposition`
- `HY2 Seed Graph + Local Delta`

This makes `PVV3` the most important backend for near-term territory execution work.

## Target Parity Responsibilities

`PVV3` should become the clearest first-class consumer of canonical artifacts. Its target responsibilities are to:

- consume canonical frontier geometry directly
- consume holdings/components directly
- support native static, dynamic, and hybrid routes as they mature
- expose route and backend truth clearly in trace and step tooling
- provide the most faithful frontier-first presentation of the territory engine

## Artifact Consumption Requirements

`PVV3` should consume or expose:

- canonical frontiers
- holdings/components
- dynamic identity and correspondence artifacts as they emerge
- trace metadata that shows route, backend, and artifact provenance
- step-mode outputs for staging and playback diagnosis

## Render Responsibilities

`PVV3` is responsible for:

- high-quality fill rendering
- high-quality border rendering
- clear dynamic playback and transition behavior
- accurate reflection of canonical artifact changes in the visible game

## Debug Hooks

Useful debug hooks for `PVV3` should include:

- live route labeling
- backend labeling
- artifact provenance display
- trace inspector integration
- step-mode progression through artifact stages
- screenshot-friendly benchmark states

## Acceptance Tests

`PVV3` backend work is acceptable when:

- it renders demo-ready canonical routes without visible gaps
- settled-state borders and fills align visually
- route truth in code matches route truth in the browser
- trace and step tools identify canonical artifacts vs fallback paths clearly
- backend-parity screenshots can be compared against `PVV2` and `DF`
