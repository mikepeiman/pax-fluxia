# Git Branching Rule

## CRITICAL: Develop on a branch, NOT master

Every push to `master` triggers a production rebuild on Northflank. Therefore:

1. **Create a feature/dev branch** for all work: `git checkout -b dev` or `git checkout -b feature/description`
2. **Commit and push to the branch**: `git push origin dev`
3. **Only merge to master** when changes are ready for production deployment
4. **Never push directly to master** during development

### Workflow
```powershell
# Start work
git checkout -b dev

# During work
git ac "commit message"
git push origin dev

# When ready for production
git checkout master
git merge dev
git push origin master
```
