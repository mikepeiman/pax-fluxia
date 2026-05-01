# Takeaways - 2026-05-01

- Star extents are not the map contract. They are one input into presentation, not the authoritative world rectangle.
- Camera fit and territory renderers must consume the same map frame. If either side infers its own extents, asymmetry is inevitable.
- Using configured map width/height when available, with expansion fallback when live stars exceed them, is a safer invariant than star-bbox-only fitting.
- Debug maps and saved maps should seed the same world metadata as standard generated maps, or viewport bugs will reappear in non-standard flows.
- One authoritative world rect is not enough for this surface. The correct model here is:
  - star-fit camera rect
  - stable authored/display map rect
  - viewport-aligned territory presentation frame
- If the territory container is shifted into a viewport-aligned frame, the renderer inputs must be localized into that same frame. Offsetting the container alone is structurally wrong.
- Presentation invalidation must include the territory frame key. Otherwise a paused or quiescent scene can legally reuse a stale fill render even when the viewport-aligned territory frame changed.
- A viewport-aligned territory frame is not automatically the right presentation owner. If the authored map rect is supposed to fill and center the visible map area, enlarging the territory domain to the viewport will manufacture margins whenever geometry only covers the real map rect.
- For this preferred Phase Edges mode, the correct ownership is stricter than the earlier three-rect theory:
  - star-fit remains useful for diagnostics and gameplay reasoning
  - authoritative map rect owns visible fit/centering
  - territory presentation must share that same map rect
- Outer borders must never be inferred as a side effect of interior owner-owner edge collection. Owner-vs-world perimeter is its own rendering contract and needs its own toggle and pass.
