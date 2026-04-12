# Full-Access Safety Policy

This repo may be operated with full filesystem and shell access, but full access does not mean unrestricted behavior.

## Hard rules

- Do not delete, reset, revert, or overwrite broadly without explicit user approval.
- Do not revert unrelated user changes.
- Do not use destructive git commands like `reset --hard` or `checkout --` unless explicitly requested.
- Prefer targeted edits with `apply_patch` over broad file rewrites.
- Prefer repo scripts and documented commands over improvised one-off shell mutations.

## Confirmation required

Pause and confirm before:

- destructive filesystem actions
- irreversible data migrations
- changing public APIs across packages without necessity
- removing large subsystems or archives
- changing workflow/tooling defaults with non-obvious team impact

## Working norms

- Keep changes scoped and inspectable.
- Update the active planning/session docs each round.
- Log tool failures and workflow shortcomings in the process docs.
- Commit completed slices with `git ac`.
- Run validation where practical before closing a slice.

## Recovery boundary

- Git history is the primary recovery mechanism.
- Prefer small checkpoint commits over large unbroken work spans.
- If safety and speed conflict, choose safety and surface the tradeoff clearly.
