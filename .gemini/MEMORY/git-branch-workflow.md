

# Git Branch Workflow

**CRITICAL: NEVER force-push to any branch. Especially `live`.**

## Branch Structure
- `master` — development branch, every commit pushes here
- `live` — production branch, deployed automatically

## Deploying to Production

When the user says "push live" or "deploy to production":

```powershell
# Step 1: Checkout live branch
git checkout live

# Step 2: Merge master into live (proper merge, NOT force push)
git merge master

# Step 3: Push live
git push origin live

# Step 4: Return to master
git checkout master
```

## NEVER DO THIS
```powershell
# FORBIDDEN — destroys live branch history
git push origin master:live --force
```

## Rules
- Always use `git merge`, never `git push --force`
- The `live` branch may have its own commits/history — respect it
- If merge conflicts occur, resolve them properly or ask the user
