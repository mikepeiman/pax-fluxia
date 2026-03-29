# Planning Mode Enforcement

## MANDATORY: Planning mode is read-only.

### Allowed in Planning Mode
- Read files
- Run query commands (`git status`, `git log`, `git remote -v`, etc.)
- Analyze code and configuration
- Report findings and recommendations

### NOT Allowed in Planning Mode
- Modify files
- Change configuration (git remotes, build settings, env vars)
- Run destructive or mutating commands
- Commit or push

### Transition to Execution
Present a plan and receive explicit user approval before making any changes. "Go ahead" or equivalent directive is required.
