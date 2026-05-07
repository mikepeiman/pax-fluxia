# Takeaways - 2026-05-06

- The repo does not want a second app personality; it wants a cleaner exposure boundary.
- `audience` is a better code term than `mode` or `canonical` for this problem.
- The right choke points are shell/UI surfaces, not shared engine/config state.
- Legacy deep links should be normalized through one policy module instead of being removed outright.
- `MainMenu` and `/map-editor` must remain product surfaces even while internal tooling is hidden.
- Validation in this repo currently requires separating:
  - build truth
  - targeted changed-file truth
  - broad pre-existing `svelte-check` drift
