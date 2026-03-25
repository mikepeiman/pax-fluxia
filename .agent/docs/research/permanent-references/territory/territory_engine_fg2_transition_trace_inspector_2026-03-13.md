# FG2 Transition Trace Inspector — 2026-03-13

## Summary
This slice extends the Territory Trace Inspector so it exposes holding-transition diagnostics directly in the UI instead of forcing inspection through raw artifact dumps.

## What Changed
- Added `getOwnerHoldingTransitionSummary(...)` in `ControlsSection-Territory.svelte`.
- Added `getOwnerHoldingTransitionPreviewEntries(...)` in `ControlsSection-Territory.svelte`.
- Added a new `Holding Transitions` section to the Trace Inspector.

## Displayed Data
The new section summarizes the transition artifact already published by FG2 animation stage, including:
- total holding transitions
- matched, spawned, vanished, grown, and shrunk counts
- split-anchored spawn count
- merge-anchored vanish count
- geometry fallback count
- hole-transition count

It also previews individual transitions with:
- owner
- transition kind
- anchor relation
- confidence
- mean/max contour distance
- previous/current hole counts

## Why
The trace UI already exposed owner-region loops, owner shells, stage artifacts, and step summaries, but it did not surface the most important dynamic geometry data when evaluating bad territory motion. This addition makes it easier to answer:
- which holdings are actually animating
- whether the system thinks a change is a persist/grow/shrink/spawn/vanish
- whether the transition is anchored to a split or merge relation
- whether geometry fallback is occurring

## Verification
- Filtered diagnostics for the modified files came back clean.
- Production build completed successfully.

## Next
- Add visual correlation between inspector entries and rendered holdings/frontiers.
- Add explicit displayed-geometry diagnostics so the inspector can distinguish interpolated vs fallback-rendered holdings per frame.
- Use browser screenshots with trace mode enabled to compare inspector state against the actual canvas output.
