---
trigger: always_on
---

# Git Version Control

You *must* use git commits, with sensible (not verbose) commit messages, with every chat exchange which results in a code or documentation change.
There is a global alias you can use `git ac "message"` which combines `git add .` and `git commit -m`.

After committing, always push to origin:
```
git push origin master
```

Remote origin: `https://github.com/mikepeiman/pax-galaxia-redux.git`