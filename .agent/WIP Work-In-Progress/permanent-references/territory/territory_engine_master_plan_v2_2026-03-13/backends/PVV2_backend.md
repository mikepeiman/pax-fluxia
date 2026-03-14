# PVV2 Backend

## Purpose

`PVV2` is a maintained backend for territory rendering, comparison, and fallback behavior. It is not the long-term identity of any `FG*`, `DY*`, or `HY*` method, but it remains a useful execution surface for baseline comparison and compatibility checks.

## Strengths

- Stable comparison surface for older territory behavior
- Helpful for detecting regressions against pre-native routes
- Useful as a maintained fallback backend while native method coverage expands

## Weaknesses

- Still heavily adapter-backed for the 15-mode system
- Not the active frontier-first renderer host
- More likely than `PVV3` to diverge from canonical artifact expectations if not checked explicitly

## Current Live Routes

Today `PVV2` is the active backend for these route families:

- `FG1 Adaptive Field`
- `FG4 Pairwise Arrangement`
- `DY4 Optimal Transport`
- `HY1 Static Backbone + Dynamic Refine`
- `HY4 Pairwise + Patch + Transport`

These are current runtime facts, not target architecture endorsements.

## Target Parity Responsibilities

`PVV2` should be able to:

- consume canonical frontiers when available
- consume holdings when available
- render settled borders and fills without drift from route truth
- participate in route-truth and backend-parity demos
- fall back explicitly when a route is still adapter-backed

## Artifact Consumption Requirements

The planning target expects `PVV2` to consume:

- canonical frontier polylines
- holding/component fill artifacts
- identity or correspondence hints when dynamic routes mature
- trace metadata sufficient to explain whether the backend is rendering canonical data or a fallback path

## Render Responsibilities

`PVV2` is responsible for:

- fill rendering
- border rendering
- mode-correct playback of dynamic or hybrid routes when selected
- visibly honoring backend parity expectations for demo-ready paths

## Debug Hooks

Useful debug hooks for `PVV2` should include:

- route/backend labeling in trace output
- border-path vs fill-path source identification
- explicit indication when adapter fallback is in use
- screenshot-friendly validation states

## Acceptance Tests

`PVV2` backend work is acceptable when:

- the active route is correctly identified in-browser
- demo-ready methods render without visible gap or settled-state border/fill mismatch
- fallback behavior is explicit rather than silent
- backend-parity comparison screenshots can be produced against `PVV3` and `DF` where relevant
