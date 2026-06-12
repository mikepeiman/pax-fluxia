# Takeaways - 2026-06-12

- A visible transition-data path is not enough; frame-to-frame timing must also be stable across preview and active transition ownership.
- Star glow is a separate presentation surface from territory fill. It needs explicit transition input rather than relying on delayed owner state.
- Pending conquest preview state must keep a stable first-seen time when pre-consume frames repeat.
- Conquest transition visuals must share the same duration source unless a separate user-facing control explicitly says otherwise.
- A transition terminal frame must use the same coordinate, sizing, offset, and seed path as the settled NEXT frame.
