# 2026-05-20 - Grid Gradient User Issue Inventory

This note preserves every Grid Gradient issue and follow-up surfaced by the user in the current chat so none of them are lost while implementation continues. "Previously documented" means the item was already captured in the May 20 session notes or queue before this inventory was created.

## Issue Inventory

| # | User-surfaced issue or request | Previously documented | Current status |
|---|---|---:|---|
| 1 | Performance is untenable in Grid Gradient, with DevTools showing long main-thread frames and heavy time in grid plan/classification/point-in-polygon, distance/owner resolution, circle triangulation, Pixi batching/upload, and GC. | Partial | Still open. May 20 queue mentioned main-thread planning risk, but the screenshot-level function/time inventory was not preserved here. |
| 2 | Produce a performance report naming relevant problem files/functions and compute time consumed. | No | Documentation gap corrected by this inventory; still needs a refreshed report from raw trace or reproduced profile. |
| 3 | Keep a concise concept summary for Grid Gradient: PV geometry, fine invisible grid, point marks large in interiors and small near borders, vector borders preferred, optional dotted borders. | No | Documentation gap corrected here; external-agent docs from earlier work may exist, but May 20 notes did not preserve this summary. |
| 4 | Provide a compact territory-rendering architecture overview for external worktree agents, with key files/functions and reintegration guidance. | No | Documentation gap corrected here; should be kept with external handoff docs when updated. |
| 5 | Create a session subdirectory containing a "single-file" extracted code package for external optimization work, with comments mapping functions back to source ranges. | No | Documentation gap corrected here; verify whether the older handoff package exists before relying on it. |
| 6 | Explain what raw Chrome trace is needed and how the user should capture it beyond bottom-up screenshots. | No | Documentation gap corrected here; still needs a concise user-facing capture procedure in the performance plan. |
| 7 | External agent requested current cell counts at common settings and visual-quality targets. | No | Documentation gap corrected here; still needs measured counts from live settings/diagnostics. |
| 8 | External agent requested screenshot or video of the visually accepted look. | No | Documentation gap corrected here; still needs a current accepted visual reference after the latest fixes. |
| 9 | External agent requested current code shape for `GridGradientFamily.update`, `drawGridGradientCell`, and `buildGridClassification`. | No | Documentation gap corrected here; should be refreshed after each structural change. |
| 10 | External agent requested whether WebGL or WebGPU is active in Pixi runtime. | Yes | May 20 correction note recorded WebGL shader-field backend active with no fallback. |
| 11 | External agent requested whether camera zoom changes require grid LOD. | No | Documentation gap corrected here; still unanswered in implementation terms. |
| 12 | External agent requested whether marks must rotate/animate individually or only scale/alpha/color-blend. | No | Documentation gap corrected here; still needs product decision. |
| 13 | Expose renderer type through existing diagnostics because a console command returned `undefined`. | Partial | May 20 correction note records renderer diagnostics, but the original undefined-command issue was not explicitly preserved. |
| 14 | Shader compile failure: `vUV` redefinition and Pixi `roundPixels` type/dimension errors. | No | Documentation gap corrected here; resolved earlier in code, but not preserved in May 20 notes. |
| 15 | Borders were offset right and slightly down relative to fills, matching an older coordinate-space problem. | Partial | May 20 correction note says borders should remain aligned, but the surfaced offset symptom and cause were not fully preserved. |
| 16 | No gradient-dot fill transitions were visible on conquest. | Yes | Captured in May 20 notes; implementation remains user-verification sensitive. |
| 17 | Need a conquest fill transition for Grid Gradient fills. | Yes | Captured; current implementation uses a conservative color-blend transition over per-cell flip timing. |
| 18 | Need a way to blend circles touched by borders or within a configured border range. | Yes | Captured as deferred; the first attempt was removed because it contributed risk in the shader-field path. |
| 19 | `Border Offset` did not behave correctly; it looked like a subtle alpha adjustment rather than a clear border-offset band. | Yes | Captured and corrected in May 20 notes as a shader discard/exclusion-band fix. |
| 20 | `Shader Noise` appeared to do nothing. | Partial | Hotfix notes renamed/disabled it unless shape is Noise, but the original complaint was only partially itemized. |
| 21 | `Shader Pulse` created vertical column grouping; desired effect is organic 2D, not 1D. | Yes | Captured; hotfix notes say pulse was reworked into a 2D value-noise phase field. |
| 22 | `Edge Size` seemed to have the same effect as `Center Size`. | No | Documentation gap corrected here; still needs behavioral verification or control redesign. |
| 23 | `Shader Mark Softness` seemed identical to `Shader Edge Softness`. | No | Documentation gap corrected here; still needs shader/control semantics verification. |
| 24 | `Shader Pulse Speed` seemed to have no effect and lacked units. | Yes | Captured; UI now labels it as rad/s, but the visual-effect complaint still needs user verification. |
| 25 | `Shader Interior Alpha` appeared to do nothing. | Partial | May 20 queue mentions alpha boosts, but the original complaint was not itemized. Later user found fill visibility depended on this alpha being nonzero. |
| 26 | `Shader Color Power` appeared to do nothing and used unclear terminology. | Yes | Captured; renamed to Color Gamma, with follow-up candidate to remove or demote if still too subtle. |
| 27 | Conquests caused animation stutter; this is unacceptable and must become smooth. | Yes | Captured; main-thread planning remains an open performance risk. |
| 28 | A large square blue/cyan overlay appeared over most of the map in shader-field Grid Gradient. | Yes | Captured; cause recorded as the surfaced shader debug grid branch and failed shader expansion risk. |
| 29 | The visible `Grid Gradient Backend` option was not requested and needed explanation/removal from player-facing UI. | Yes | Captured; removed from normal settings, backend remains diagnostics/internal fallback. |
| 30 | User explicitly reported no transition showing at all. | Yes | Captured. |
| 31 | User explicitly reported no transition update at all: map looked dead, borders and fills remained unchanged. | Yes | Captured as no visible ownership update/dead map risk. |
| 32 | User asked to stop, rethink, and identify exactly what code drew blue and why the dot-fill background vanished. | Yes | Captured in cause assessment; exact shader branch and color were documented. |
| 33 | User objected to earlier rollback-style wording and wants development/fixes to preserve forward momentum. | No | Documentation gap corrected here; avoid that wording in future reports. |
| 34 | User identified a process failure: when feedback says a feature does not show or regresses, do not broadly discard unverified implementation; trace and fix it forward. | Partial | `.agent/AGENT.md` was updated with the Forward-Fix Rule, but May 20 session notes did not explicitly list the user-surfaced process issue. |
| 35 | User asked exactly when and why the persistent player-facing shader debug overlay was introduced. | Partial | Cause was documented, but not the exact prompt exchange. It was introduced while responding to the May 16 "Proceed with full implementation..." prompt after external shader-field files were committed and planned. |
| 36 | Browser-verified screenshot and user's running app disagreed on fill visibility; user later found `Shader Interior Alpha` was set to zero. | No | Documentation gap corrected here; this is a control/readability issue, not just a user setting issue. |
| 37 | User cannot tell whether pointillist fills are filling correct geometry and requested a toggle between solid geometry fill and pointillist fill. | No | Documentation gap corrected here; implementation pending. |
| 38 | User asked to process all messages received and not ignore older messages just because new ones came in. | No | Documentation gap corrected here; treat this inventory as the active carry-forward list. |

## Process Correction

The May 20 notes were too implementation-centered. They captured the main fix loop but did not preserve every user-surfaced issue at item level. This inventory corrects that gap and should be updated whenever the Grid Gradient work receives new user feedback.

## Active Carry-Forward

- Implement the solid-geometry versus pointillist fill switch inside the existing Grid Gradient render-family path.
- Keep the performance backlog explicit: raw Chrome trace, cell-count measurements, visual-quality target counts, and a refreshed hotspot report.
- Revisit control semantics after the solid fill verifier exists, especially `Edge Size`, `Shader Mark Softness`, `Shader Interior Alpha`, pulse behavior, and color response.
- Revisit border-proximity blending only after the stable shader-field baseline and geometry-verification toggle are user-verified.
