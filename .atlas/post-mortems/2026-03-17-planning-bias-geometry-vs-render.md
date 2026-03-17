# Post-Mortem: 2026-03-17 — Planning Bias: Geometry vs. Render

## What Happened

During planning for DY4/PVV2 geometry extraction, three incorrect classifications were made — all caught before execution by user review.

---

## Bias 1: Visual Effect → Render Assumption

**Mistake:** Chaikin smoothing was classified as "render-time" and placed in the renderer.

**Root cause:** Smoothing *looks like* a visual quality control — number of passes, roundness of corners. That surface appearance triggered a heuristic: "visual = presentation layer." But the invariant is: *anything that changes the position of a frontier pixel is geometry*, regardless of how it presents. Chaikin changes where the line is, not merely how it looks.

**Revealed bias:** When a function's output is visually soft or aesthetic, I prematurely assign it to the render layer without asking "does this change world coordinates?"

**Rule:** Ask geometrically, not visually: *Does this function change the position of frontier points in world space? If yes → geometry layer.*

---

## Bias 2: Preserving Existing Pattern Instead of Reading the Spec

**Mistake:** Proposed a `prevGeometry: PVV2GeometryData` polygon snapshot in the controller for transitions — mirroring the current PVV2 module-level snapshot pattern.

**Root cause:** I read the existing code (polygon snapshot on conquest), understood how it worked, and ported that mechanism into the new architecture. I didn't re-derive the transition model from the architecture spec — I inherited the legacy pattern.

**Revealed bias:** When porting code, I tend to preserve the current mechanism's shape rather than consulting the target architecture spec for what the mechanism *should* be. The spec was clear: interpolate frontier control data → rebuild frame-frontier → derive caches. That's fundamentally different from snapshot-and-lerp.

**Rule:** When porting any non-trivial mechanism, read the target architecture spec first. Do not derive the new design from the old implementation.

---

## Bias 3: Decomposition Without Architecture Validation

**Mistake:** The initial classification of what moves where was done by decomposing PVV2 into components and assigning each to a layer — without first checking whether the layer assignments matched the canonical architecture rules.

**Root cause:** Decomposition is the natural first move. But decomposition surfaces *what the parts are*, not *which layer they belong to*. I mapped the parts before I had a clear model of the layers.

**Revealed bias:** I treat "understand the parts" as equivalent to "understand the architecture." They're different operations. Parts → what exists. Architecture → where each thing lives and why.

**Rule:** Layer assignment must come from the architecture spec, not from a reading of the existing code. Decompose first, then validate each part against the layer rules before writing the plan.

---

## Corrective Action

All three errors were caught in planning before any code was written. The architectural transfer precheck (3 questions) and user review are the correct mechanisms. These biases should be actively countered at planning time, not caught during execution.
