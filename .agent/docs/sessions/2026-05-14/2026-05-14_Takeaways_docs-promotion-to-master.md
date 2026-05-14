# Takeaways - 2026-05-14 - Docs Promotion To Master

## Lessons
- Before promoting docs across worktrees, verify actual git ancestry rather than relying on commit labels.
- A dirty `master` worktree is not an automatic blocker if the existing changes are unrelated and remain untouched, but that relationship should be checked explicitly.

## Rule
- When a branch is functionally reconciled and only docs remain unique, promote docs by exact commit ancestry and preserve any unrelated files already present in the target worktree.
