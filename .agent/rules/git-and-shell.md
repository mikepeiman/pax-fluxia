---
description: Git version control and PowerShell command conventions
globs: "**/*"
---

# Git & Shell

## Git
- Commit after every code/doc change: `git ac "message"`
- Push after every commit: `git push origin master`
- Branches: `master` (dev), `live` (production)
- Branch only for risky experiments (`feat/`, `fix/`, `refactor/`). Merge & delete promptly.

## PowerShell
- **No `&&` chaining** — PowerShell doesn't support it
- **No `cd` commands** — use `Cwd` parameter on `run_command` instead
- Use semicolons or separate commands for sequential operations
