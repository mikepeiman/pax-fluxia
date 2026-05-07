# Territory Transition Diagnosis v19

Date: 2026-05-07
Branch: `codex/render-infra/pvv4-transition-bets`

## Prompt

The snap-transition package had the live active overlay, including red defect lines and defect anchors, but the diagnostic render bundle did not show that information. The user asked what the render package most needs in order to make snap cases diagnosable and actionable.

## Conclusion

The package needed one dedicated frontier-reference render plus a consistent legend on every exported transition frame.

Most helpful render for a snap package:

1. `PRE` front path
2. `POST` front path
3. active front span
4. change anchors
5. defect anchors
6. monotonic change-vertex correspondence lines
7. the same legend on every transition frame, so any frame can be read in isolation

## Implemented

- Added exporter support for supplemental diagnostic canvases in:
  - `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`
  - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
- Added dedicated render:
  - `render/front_reference.png`
- This frame now shows:
  - dashed `PRE` front paths
  - solid `POST` front paths
  - active front spans
  - change anchors
  - defect anchors
  - monotonic vertex correspondence lines
- Replaced the old summary-only AF panel on exported transition frames with the full AF legend HUD.
- Updated `README.md` generation in the package exporter so the extra render is listed explicitly.
- Updated `communication.md` with a mandatory ambiguity test before responding.

## Validation

- `bun vitest run src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts src/lib/territory/devtools/TransitionBundleSerializer.test.ts`
- `bun run build`

## Result

A snap package should now contain one render that directly answers:

- what the `PRE` front was
- what the `POST` front was
- where the active front span should have been
- where the defect anchors are
- whether the monotonic change-vertex correspondence is obvious or broken
