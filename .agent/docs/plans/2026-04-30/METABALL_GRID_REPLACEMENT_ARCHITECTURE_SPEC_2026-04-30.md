# Metaball-Grid Replacement Architecture Spec - 2026-04-30

## Purpose

Replace the existing `metaball-grid` conquest-render mode with a non-metaball architecture that preserves the real value of the current mode:

- deterministic changed-region detection
- smooth conquest transitions
- strong visual emphasis on borders and frontiers
- fills that visually follow borders
- stable browser performance at 60 fps or better
- PixiJS 8 / WebGL compatibility
- suitability for low-end integrated GPUs

This document is written as an internal implementation spec for a coding agent working in the live repo.

## Repo Grounding

- Current mode path: `pax-fluxia/src/lib/territory/families/metaballGrid/`
- Current family contract: `pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts`
- Current family input builder: `pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts`
- Current render-family transition batching: `pax-fluxia/src/lib/territory/transitions/renderFamilyTransitionLifecycle.ts`
- Current mixed-runtime status reference: `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
- Current experimental cousin mode: `pax-fluxia/src/lib/territory/families/perimeterField/`

Important current-state fact: the repo already has the right scheduling substrate for a non-metaball replacement. `metaball_grid` is not just "32k metaballs." It is already:

- a deterministic `PREV/NEXT` ownership classifier
- a wave or phase planner (`planGridWave.ts`)
- a per-frame transition evaluator (`renderMetaballGridScene.ts`)

The expensive and misleading part is the presentation expression, not the scheduling model.

## 1. Reframe The Problem

### Why metaballs are the wrong primitive

- The current mode pays a presentation cost proportional to a dense field of virtual samples, even though the game problem is mostly about which local region changed and when each part should visually flip.
- Metaballs blur "who flips when" into "how do many overlapping blobs add up." That is the wrong optimization target.
- The desired end state is not "render metaballs cheaper." It is "preserve deterministic conquest organization and visual coherence without the metaball-source cost."

### What the system actually needs

- Algorithmic needs:
  - deterministic `PREV` and `POST` ownership truth
  - deterministic changed-region detection
  - deterministic transition order assignment
  - stable handling of chained or simultaneous conquests
- Visual needs:
  - a visible moving frontier
  - fills that stay attached to that frontier
  - an organic or at least convincing territorial wave
  - no obvious border/fill divergence
- Performance needs:
  - local work around the conquest zone
  - no compute shaders
  - no full-map heavy GPU passes every frame
  - no large per-frame CPU uploads

### Why PRE and POST border-point correspondence is brittle

- Border loops change topology under conquest: loops split, merge, are born, and die.
- Even when topology is nominally stable, vertex counts and vertex placement differ after smoothing and geometry-source tuning.
- Trying to pair border vertices directly turns the problem into a fragile geometry-matching exercise.
- Current repo history already shows repeated pain around frontier correspondence and fill/border drift. The problem is structural, not just an implementation detail.

### Why a field-based scheduling model is superior

- A local grid can store:
  - `prevOwner`
  - `postOwner`
  - `changed`
  - `phase in [0, 1]`
- Then the moving frontier is simply the contour `phase == progress`.
- This converts the hard problem from "which old vertex morphs into which new vertex" into "when does each local location visually transition."
- Scheduling fields are deterministic, inspectable, cacheable, and easy to debug with grayscale and contour overlays.

## 2. Candidate Replacement Architectures

### Candidate A - Local PRE/POST RenderTexture Composite + Conquest Phase Field

- Conceptual model:
  - Capture local `PRE` and `POST` territory visuals once per conquest batch.
  - Build a local event-grid phase field over the changed area.
  - Each frame, reveal `POST` over `PRE` according to `phase` and draw a frontier band where `abs(phase - progress)` is small.
- Data representation:
  - local `PRE` RT
  - local `POST` RT
  - local `phaseTexture`
  - local `changedMaskTexture`
- Changed-region detection:
  - from deterministic `prevOwner != postOwner` cell classification
  - optionally seeded from current `buildGridClassification` output, then cropped to local bounds
- Transition order assignment:
  - reuse current wave-planning ideas from `planGridWave.ts`
- Borders:
  - frontier band derived from `phase` versus progress
- Fills follow borders:
  - the same reveal function drives both the fill composite and the frontier band
- Expected visual character:
  - clean territorial wave
  - can be organic with noise-biased phase
  - less "blob" and more "moving ownership front"
- Expected runtime cost:
  - one-time local texture generation per conquest
  - one local shader pass per active conquest per frame
- Implementation complexity:
  - moderate
- Fit for PixiJS/WebGL/iGPU:
  - very good
- Verdict:
  - best first prototype

### Candidate B - Owner-Texture Shader + Phase Mask

- Conceptual model:
  - Instead of storing pre-rendered `PRE/POST` color RTs, store owner-index or owner-color textures and let the shader resolve palette and reveal.
- Data representation:
  - `preOwnerTexture`
  - `postOwnerTexture`
  - `phaseTexture`
  - palette uniform or palette texture
- Changed-region detection:
  - same local grid substrate as Candidate A
- Transition order assignment:
  - same local phase field
- Borders:
  - frontier band from phase contour
- Fills follow borders:
  - the same reveal mask chooses owner color
- Expected visual character:
  - same as Candidate A, but more data-oriented and easier to restyle
- Expected runtime cost:
  - slightly better memory and reuse characteristics than Candidate A
- Implementation complexity:
  - higher than Candidate A because palette and owner encoding become part of the shader contract
- Fit for PixiJS/WebGL/iGPU:
  - very good
- Verdict:
  - best likely production version

### Candidate C - Local BFS Frontier Propagation Field + Optional Frontier Geometry VFX

- Conceptual model:
  - Keep a conquest-local CPU phase grid and drive a very simple fill/frontier shader or even CPU-painted mask from it.
  - Use geometry only for optional frontier glow or particles, not for core transition truth.
- Data representation:
  - local CPU grid with `prevOwner`, `postOwner`, `phase`, `changed`
  - optional local mask texture generated from CPU
- Changed-region detection:
  - deterministic local classification
- Transition order assignment:
  - BFS wavefront from seeds
- Borders:
  - either CPU-extracted contour or phase-band shader
- Fills follow borders:
  - yes, if the same mask is used for reveal
- Expected visual character:
  - clean, readable conquest push
  - less organic unless noise or bias is added
- Expected runtime cost:
  - acceptable for small conquest-local grids
- Implementation complexity:
  - low to moderate
- Fit for PixiJS/WebGL/iGPU:
  - good
- Verdict:
  - strong fallback if shader-heavy work stalls

### Candidate D - Jump-Flood / Distance-Transform Territory Field

- Conceptual model:
  - Build a local signed or unsigned distance field and derive the frontier from distance ratios or nearest-owner propagation.
- Data representation:
  - local seed texture
  - local distance or nearest-site texture
- Changed-region detection:
  - can be deterministic, but setup is more complex than the repo currently needs
- Transition order assignment:
  - distance gradients or repeated propagation
- Borders:
  - naturally strong
- Fills follow borders:
  - yes
- Expected visual character:
  - smooth, potentially very polished
- Expected runtime cost:
  - good once established, but more passes and more GPU machinery
- Implementation complexity:
  - highest of the options here
- Fit for PixiJS/WebGL/iGPU:
  - possible, but not first-choice safe
- Verdict:
  - optional later research path, not the first implementation

## 3. Recommended Architecture

### Best first prototype

Use Candidate A:

- local `PRE/POST` RenderTexture composite
- conquest-local phase texture
- frontier band from `phase == progress`

Why:

- minimal disruption to the current render-family contract
- easy to debug
- no need to solve palette encoding and new global owner-texture contracts on day one
- reuses current `PREV/NEXT` geometry seams already present in `RenderFamilyInput`

### Best likely production version

Evolve the same substrate into Candidate B:

- keep the same conquest-local phase generation
- replace pre-rendered color RTs with owner-index or palette-driven textures where useful
- keep the local frontier shader logic

Why:

- separates transition logic from pretty rendering
- makes palette changes, theming, and border styling cheaper and cleaner
- avoids rebaking color RTs when only palette changes

### Optional later enhancements

- noise-biased propagation for a more organic edge
- optional frontier-only geometry overlay for sparks, glow, or particles
- local distance-to-frontier texture for richer border falloff
- JFA or distance-field research only if the simpler local phase system proves insufficient

## 4. Concrete Architecture Spec

### 4.1 Conquest event lifecycle

1. `GameCanvas` or the family lifecycle continues to produce `RenderFamilyTransitionSession` batches via `renderFamilyTransitionLifecycle.ts`.
2. On new active session start, capture:
   - `prevGeometry` from `RenderFamilyInput.prevGeometry`
   - `nextGeometry` from `RenderFamilyInput.geometry`
   - conquest events from `activeTransition.events`
3. Build a conquest-local transition substrate once for that session.
4. Reuse that substrate every frame until `progress >= 1`.
5. Release pooled textures and discard the local substrate when the session completes.

### 4.2 PRE and POST snapshot handling

- Continue to treat `RenderFamilyInput.prevGeometry` and `RenderFamilyInput.geometry` as authoritative family inputs.
- Do not rebuild `PREV` from scratch inside the shader path unless upstream truth is absent.
- If upstream `prevGeometry` is missing, allow a family-local fallback only as a cold-start or hot-reload recovery path.

### 4.3 Local bounds extraction

Prototype path:

1. Run deterministic changed-cell classification with the current grid substrate.
2. Find the axis-aligned bounds of all cells with `prevOwner != postOwner`.
3. Expand bounds by:
   - one to two seed rings
   - frontier feather width
   - optional debug padding
4. Build all local textures only for that padded bounds rectangle.

Production refinement:

- move from "classify full world then crop" to "classify only the conquest-local grid window"
- keep the external contract identical

### 4.4 Local grid generation

- Reuse the core idea from `buildGridClassification.ts`, but treat it as a transition substrate, not the final paint primitive.
- Each local cell stores:
  - `prevOwnerIdx`
  - `postOwnerIdx`
  - `changedFlag`
  - `phase`
  - optional `frontierDistance`
- Quantize owner indices to bytes where possible.
- Quantize phase to `0..255` for upload efficiency unless precision testing shows visible artifacts.

### 4.5 Phase assignment strategies

Phase generation plugs into the same conceptual slot currently filled by `planGridWave.ts`.

Required behavior:

- deterministic for fixed inputs
- local to the conquest zone
- independent of final pretty rendering
- debuggable as grayscale

### 4.6 GPU textures and render targets

Prototype texture set per active session:

- `preRt`: local PRE territory capture
- `postRt`: local POST territory capture
- `phaseTexture`: one channel used, stored in RGBA8 if single-channel is inconvenient in Pixi
- `changedMaskTexture`: optional separate mask, or pack into alpha of the phase texture

Production texture set:

- `preOwnerTexture`
- `postOwnerTexture`
- `phaseTexture`
- optional `frontierDistanceTexture`
- palette uniform or palette texture

### 4.7 Per-frame uniforms

- `uProgress`
- `uFrontierWidthPx`
- `uFrontierSoftness`
- `uFillFeather`
- `uBoundsOriginWorld`
- `uBoundsSizeWorld`
- `uNoiseAmount` or `uNoiseScale` if enabled
- palette data if using owner-texture mode

### 4.8 Shader logic

Core reveal:

```text
reveal = smoothstep(phase - feather, phase + feather, progress)
```

Frontier band:

```text
frontier = 1 - smoothstep(0, bandWidth, abs(phase - progress))
frontier *= changedMask
```

Composite behavior:

- fill color = `mix(pre, post, reveal)` for prototype RT mode
- or resolve `preOwner` / `postOwner` to palette colors and mix them in production owner-texture mode
- frontier draw uses either:
  - a blended border color between pre and post owners
  - or the post owner border color with an additive highlight

Important invariant:

- the same `phase` value must drive both fill reveal and frontier emphasis

### 4.9 Cleanup and finalization

- At `progress >= 1`, discard the session-local textures and show settled `POST` output only.
- Pool textures by size bucket to avoid churn under repeated conquests.
- If multiple sessions are active, keep one local sprite or mesh per session and retire them independently.

## 5. Phase Generation Methods

### Conquered-star radial

- Visual motion:
  - circular wave from the conquered star outward
- Gameplay meaning:
  - "capture radiates from the star core"
- Difficulty:
  - low
- Deterministic and debuggable:
  - yes
- Use:
  - good first smoke-test mode

### Victor-lane push

- Visual motion:
  - motion feels like pressure arriving along the attacker's lanes
- Gameplay meaning:
  - strong tie to source-of-conquest
- Difficulty:
  - medium
- Deterministic and debuggable:
  - yes, if lane-source attribution is stable
- Use:
  - good second mode once basic prototype works

### PRE-to-POST frontier ratio

- Visual motion:
  - transition feels anchored to the actual ownership delta
- Gameplay meaning:
  - best semantic fidelity
- Difficulty:
  - medium to high
- Deterministic and debuggable:
  - yes
- Use:
  - best default production mode if stable

### BFS wavefront

- Visual motion:
  - clear marching conquest front
- Gameplay meaning:
  - strong notion of territory being overtaken cell by cell
- Difficulty:
  - low to medium
- Deterministic and debuggable:
  - excellent
- Use:
  - safest baseline mode

### Noise-biased frontier propagation

- Visual motion:
  - more organic edge wobble
- Gameplay meaning:
  - mostly aesthetic
- Difficulty:
  - medium
- Deterministic and debuggable:
  - yes, if seeded noise is deterministic
- Use:
  - optional polish layer after baseline correctness

## 6. PixiJS / WebGL Implementation Details

### RenderTexture usage

- `PRE` and `POST` captures happen once per conquest session, not every frame.
- Use one local sprite per active conquest session.
- Render only the conquest-local bounds rectangle to those RTs.

### Custom Filter pipeline

- Apply a custom `PIXI.Filter` to the local conquest sprite or mesh.
- The filter samples `PRE`, `POST`, and `phase`.
- Keep filter math light and texture-count small.

### Local conquest sprites or meshes

- One local sprite per active session is the simplest path.
- If simultaneous sessions overlap visually, stack them by session age or session start time.
- Do not rebuild world-scale meshes every frame.

### Texture pooling

- Pool local RTs by width and height buckets.
- Pool phase textures separately if CPU-upload buffers are reused.
- Hard-cap maximum local texture size to protect integrated GPU memory.

### Texture upload strategy

- Upload phase and changed-mask data once on conquest start.
- Do not stream per-frame CPU texture changes.
- If phase mode changes from debug UI during a live transition, rebuild only that session's local substrate.

### Minimizing passes and overdraw

- Target:
  - 2 setup captures per session
  - 1 presentation pass per session per frame
- Avoid:
  - full-screen passes
  - blur-heavy multi-pass pipelines
  - per-owner repeated local draws

### Once per conquest vs per frame

- Once per conquest:
  - local bounds extraction
  - local grid build
  - phase assignment
  - RT capture
  - texture upload
- Per frame:
  - uniform update
  - one filtered sprite draw per active session

### Low-end integrated GPU safety

- local-only textures
- RGBA8 textures
- no compute shaders
- no float-texture dependency
- no large ping-pong chains
- clamp active-session count or texture resolution if stress testing shows spikes

## 7. Debuggability And Tooling

Build these debug views before polish work:

- changed mask
- phase field grayscale
- frontier contour overlay
- PRE owner visualization
- POST owner visualization
- local conquest bounds rectangle
- per-event timing and progress
- simultaneous-transition stress mode

Recommended surfaces:

- family-local debug snapshot object, similar in spirit to `PerimeterFieldFamily.debugSnapshot`
- optional store similar to `metaballGridStats`
- artifact hooks in `territory/devtools/` for exported transition snapshots

Debug rule:

- every phase mode must be inspectable without relying on subjective visual judgment alone

## 8. Coding-Agent-Ready Phased Plan

### Phase 1 - Carve out the replacement family shell

- Objective:
  - introduce a new comparison family without deleting `metaball_grid`
- Concrete tasks:
  - add new render-family id and catalog entry
  - scaffold a family adapter and debug store
  - wire it through the existing `RenderFamily` input path
- Expected intermediate result:
  - new mode selectable, even if it only shows debug bounds or a static local composite
- Validation checks:
  - mode dispatches cleanly
  - no changes to legacy or pipeline modes
- Rollback / fallback:
  - keep existing `metaball_grid` as the shipping fallback

### Phase 2 - Build the conquest-local truth substrate

- Objective:
  - produce deterministic local `prev/post/changed/phase` data
- Concrete tasks:
  - reuse or split `buildGridClassification` logic into a localizable substrate builder
  - compute changed bounds and padded local conquest bounds
  - build local phase payloads
- Expected intermediate result:
  - debug views show correct changed mask and phase field
- Validation checks:
  - scrub `progress=0` equals true `PRE`
  - scrub `progress=1` equals true `POST`
  - unchanged territory stays static
- Rollback / fallback:
  - fall back to full-world classification with crop if local-only classification is buggy

### Phase 3 - Ship the composite shader prototype

- Objective:
  - replace metaball presentation with local RT compositing
- Concrete tasks:
  - capture local `PRE` and `POST` RTs
  - upload phase and changed-mask textures
  - implement the reveal and frontier filter
- Expected intermediate result:
  - smooth conquest-local wave with no metaball renderer in the path
- Validation checks:
  - 60 fps on representative maps
  - fill and border move together
  - no full-map redraw requirement
- Rollback / fallback:
  - disable frontier band and keep fill-only reveal if border polish blocks progress

### Phase 4 - Add phase modes and frontier polish

- Objective:
  - make the transition readable and tunable
- Concrete tasks:
  - add BFS, radial, lane-push, and frontier-ratio modes
  - expose frontier width and fill feather controls
  - add deterministic noise option
- Expected intermediate result:
  - multiple replacement modes available for bakeoff
- Validation checks:
  - each mode is deterministic
  - debug views match visible motion
- Rollback / fallback:
  - ship with BFS plus one higher-fidelity mode only

### Phase 5 - Harden toward the production owner-texture path

- Objective:
  - reduce coupling to pre-rendered RT colors and improve long-term maintainability
- Concrete tasks:
  - replace `PRE/POST` color RT reliance where useful with owner-index textures and palette resolution
  - pool textures aggressively
  - add simultaneous-session stress testing
- Expected intermediate result:
  - same visuals, cleaner data contract, lower long-term maintenance cost
- Validation checks:
  - identical transition behavior versus prototype path
  - no regressions under 12 active conquest sessions
- Rollback / fallback:
  - keep the RT composite path available as a runtime or compile-time fallback

## Final Recommendation

Do not spend the next round trying to make metaballs less expensive.

Keep the current deterministic grid and wave-planning value, but demote it to what it should have been all along: a conquest scheduling substrate.

Then render that substrate with a conquest-local phase-field composite path that makes the moving frontier the primary truth surface.

