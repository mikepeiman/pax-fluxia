# Takeaways - 2026-05-02

## Technical

- The decisive bug was not the slider math by itself. It was ownership drift:
  - blended border mode had its own fill-shaping path
  - boundary fill controls were tied to transition scene roles instead of the ownership frontier
- `Centered-blended borders` must stay border-only. When a border-style toggle starts owning fill geometry, the renderer becomes impossible to reason about.
- For this surface, `native` / `dispossessed` / `emergent` / `vacating` are transition semantics, not steady frontier ownership semantics. They are the wrong owner for steady-state fill contraction.
- A border-only contract is still insufficient if the border path coordinates are owned by a different geometry than the visible fill. Border ownership includes the stroke path, not just the layer toggle.

## Process

- The user's comparison of two visible modes was the highest-value debugging input:
  - `centered-blended off` = working reference
  - `centered-blended on` = broken branch
- That should have driven a direct code diff much earlier.

## Pending

- Live visual verification is still required.
- Transition-end jank remains queued after this fix.
