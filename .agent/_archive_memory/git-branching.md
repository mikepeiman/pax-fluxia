

# Git Branching Strategy

## Solo Dev Workflow: Master-First

**Default**: Commit directly to `master` for most work (bug fixes, UI, config, incremental features).

**Branch only when needed**:
- Risky/experimental changes you might revert
- Multi-day epics where master should stay deployable
- Naming: `feat/name`, `fix/name`, `refactor/name`

**After branching**: Merge back to master promptly, delete the branch.

**No long-lived dev branch** — it's extra ceremony without value for a solo dev.

