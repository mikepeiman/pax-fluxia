# Takeaways - 2026-05-01

- Star extents are not the map contract. They are one input into presentation, not the authoritative world rectangle.
- Camera fit and territory renderers must consume the same map frame. If either side infers its own extents, asymmetry is inevitable.
- Using configured map width/height when available, with expansion fallback when live stars exceed them, is a safer invariant than star-bbox-only fitting.
- Debug maps and saved maps should seed the same world metadata as standard generated maps, or viewport bugs will reappear in non-standard flows.
