

# Git Version Control

You *must* use git commits, with sensible (not verbose) commit messages, with every chat exchange which results in a code or documentation change.
There is a global alias you can use `git ac "message"` which combines `git add .` and `git commit -m`.

After committing, always push to origin:
```
git push origin master
```

Remote origin: `https://github.com/mikepeiman/pax-fluxia.git`

**Branches:**
- `master` — development branch
- `live` — production branch (merge master → live for releases)

## Branching Strategy
Default: commit directly to `master`. Branch (`feat/`, `fix/`, `refactor/`) only for risky experiments or multi-day epics. Merge & delete promptly. No long-lived dev branches.

