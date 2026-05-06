# Territory Transition Playtest Protocol v1

## Purpose

Evaluate PVV4 conquest transitions systematically, using one repeatable workflow for:
- visual evidence
- topology and transition diagnostics
- casebook matching
- pass/fail judgment

This protocol is separate from the plan. It is an execution workflow.

## Inputs

- PVV4 running build
- diagnostics toggle available
- recorder / package export enabled
- one exported transition package root or zip
- one casebook target from:
  - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\.agent\docs\sessions\2026-05-05\2026-05-05_territory-transition-casebook_v1.md`

## Required Runtime Settings

- render mode: PVV4
- diagnostics overlay enabled when needed
- recorder enabled before the conquest
- freeze-on-unclassified enabled for defect hunting passes

## Package Summary Command

```powershell
bun run territory:package:summary -- "C:\path\to\transition-package"
```

JSON form:

```powershell
bun run territory:package:summary -- "C:\path\to\transition-package" --json
```

Supported inputs:
- staged package root
- legacy package root
- debug subdirectory
- exported zip

## Standard Procedure

1. Choose one casebook case.
2. Reproduce that conquest in PVV4.
3. If the purpose is defect trapping, enable freeze-on-unclassified before the conquest.
4. Export the transition package immediately after the capture.
5. Run the package summary command.
6. Inspect:
   - `render\prev.png`
   - `render\frame_03_t050.png`
   - `render\next.png`
7. Compare the result against the chosen casebook entry.
8. Record a verdict.

## Required Evidence For Each Verdict

- case ID
- package path
- conquest label or event list
- visual result
- summary output
- expected result
- actual result
- verdict:
  - `pass`
  - `partial`
  - `fail`

## Fast Visual Checklist

- Does the changed frontier move locally, or does the whole region deform?
- Do unchanged tails stay fixed?
- Does any false corridor appear?
- Does any region collapse even though its final star set did not disappear?
- Does any boundary freeze because of an unclassified defect?
- Is the visible result actually better than plain snap behavior would be?

## Diagnostic Checklist

- `fronts`
- `collapse targets`
- `planned pairs`
- `topology gaps`
- `unsupported splits`
- `no-change-span pairs`
- `active sections`

Interpretation rule:
- high `planned pairs` with low defect counts is promising
- low `planned pairs` with high defect counts means the transition logic is still too sparse to be visibly convincing

## Immediate Fail Conditions

- blank territory rendering
- blank underlying-geometry diagnostics
- false full-region collapse
- whole-region deformation
- freeze-on-unclassified triggering on a routine conquest case

## Notes

- Legacy packages are still valid evidence and should be summarized instead of ignored.
- The package summary tool is:
  - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\tools\debug\summarize-transition-package.mjs`
