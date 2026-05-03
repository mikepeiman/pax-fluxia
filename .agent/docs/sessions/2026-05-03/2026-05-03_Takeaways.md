# Takeaways - 2026-05-03

- This pass is diagnostics-first, not another blind patch round.
- The accepted Phase Edges look is now the fixed contract.
- Any further performance work must be structural:
  - cache stability
  - buffer reuse
  - duplicate work removal
  - no visual compromise
- The current live settings file is not the original 6px repro anymore, so diagnostics have to separate:
  - structural hot-path behavior
  - user-selected current tuning
- Cheap, trustworthy diagnostics are worth adding directly to the live renderer when browser-side visibility is limited.
- Avoiding unnecessary array clones on the scene path is a safe win when no overlay append is happening.
