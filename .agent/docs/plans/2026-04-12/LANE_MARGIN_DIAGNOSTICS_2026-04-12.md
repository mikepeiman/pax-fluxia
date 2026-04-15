# Lane Margin Diagnostics - 2026-04-12

## Purpose

Stop guessing about lane-margin behavior and capture runtime evidence from the real `/common` map generator across a repeatable sweep.

## Tooling

- Diagnostic script: `bun run debug:lane-margin`
- Source: [tools/debug/diagnose-lane-margin.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/tools/debug/diagnose-lane-margin.ts)
- Outputs:
  - `.agent-harness/metrics/lane-margin-diagnostics-latest.ndjson`
  - `.agent-harness/metrics/lane-margin-diagnostics-latest.md`

The script follows the `debug-agent` evidence-first approach even though the package installer itself is interactive. Instead of patching the browser runtime first, it drives the shared `/common` generator with seeded sweeps and writes repeatable NDJSON evidence.

## Baseline Used

- width: `1600`
- height: `900`
- playerCount: `6`
- starsPerPlayer: current live config (`7`)
- neutralStars: `0`
- spacingMultiplier: `1.0`
- boardFit: `0.55`
- laneMode: `curved`
- curveVsPruneBias: current live config (`1.0`)
- seeds: `12001..12008`

## Confirmed Findings

1. The dramatic behavior is **not primarily topology pruning** in the current live config.
With `curveVsPruneBias = 1.0`, effective topology prune clearance is `margin * (1 - bias) = 0`, so pass-through pruning is effectively off. Across the sweep, average connection count stayed flat at about `97.75`.

2. The main pathology is **unsafe straight fallback** in the lane solver.
As margin rises, more chords are blocked by nearby stars, but the solver increasingly fails to find a valid curved/detour path and falls back to `straight` anyway.

3. The break is abrupt, not gradual.
On the current baseline:
- peak average curved count is around `80px`
- unsafe straight fallback begins around `60px`
- by `95px`, almost every blocked chord is already falling back to straight

4. This explains the “weird band” feeling the user reported.
The system moves through three regimes:
- low margin: mostly straight, as expected
- middle margin: many blocked chords become curved
- high margin: blocked chords spike, but curves collapse and most lanes revert to straight fallback

5. `boardFit` is also interacting with lane behavior far too sharply.
Using the same seed and current live settings:
- `boardFit = 0.95` produced `0` curved lanes
- `boardFit = 1.0` produced `88` curved lanes

That is too dramatic to treat as normal variation. It is a real cross-knob bug and a strong clue that the placement geometry at the full-board case is pushing the lane solver into a very different regime.

## Key Evidence

From `.agent-harness/metrics/lane-margin-diagnostics-latest.md`:

- `80px`: average curved count `63.25`, average unsafe straight `9.25`
- `95px`: average curved count `1.75`, average unsafe straight `93`
- `140px`: average curved count `1.88`, average unsafe straight `93`
- `160px`: average curved count `0.88`, average unsafe straight `95.88`
- `245px+`: average curved count `0`, average unsafe straight `97.75`

This means the current solver is not preserving the intended meaning of “higher lane margin.” It is demanding more clearance, but then failing to satisfy that demand with alternative geometry.

## Practical Interpretation

- If the user sees “lanes disappearing,” the first suspect is no longer broad topology removal.
- The confirmed first suspect is: **final lane geometry is falling back to straight when it should either curve successfully or be pruned explicitly and intelligibly.**
- Because the connection count stays nearly constant, renderer-level perception issues may still exist, but the root generator/scheduler problem is already confirmed independently of rendering.

## Next Fix Target

1. Instrument or rework the solver path that handles blocked chords at higher margins.
2. Replace unsafe straight fallback with one of:
   - a valid outward curve
   - a valid smoothed detour
   - an explicit prune decision
3. Keep the diagnostic sweep as the regression guard after every lane-solver change.
