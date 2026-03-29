# Verify CLI Output

## MANDATORY: Never act on CLI output without verifying it is complete.

When using `run_command` to execute a query command (e.g. `git remote -v`, `git status`, `git log`, `ls`, `cat`), the returned output may be incomplete or contain only the command echo.

### Before Acting on Output

1. **Check the output has data lines** — not just the command echo
2. If the output looks empty, truncated, or suspiciously short: **MUST** call `read_terminal` to get the real terminal contents before proceeding
3. **NEVER** declare a state of affairs ("remote was lost", "file doesn't exist", etc.) based on empty or echo-only output

### Expected Minimums

| Command | Expected output |
|---------|----------------|
| `git remote -v` | At least 1 `origin` line with URL |
| `git status` | At least "On branch X" line |
| `git log` | At least 1 commit line |
| `dir` / `ls` | At least 1 file/directory entry |

### If Output Appears Incomplete

```
1. Call read_terminal with the process ID
2. Review the FULL terminal output
3. THEN proceed with analysis
```

### Rationale

On 2026-03-29, `git remote -v` returned only the command echo. The agent declared "the remote was lost" without verifying — a fabricated conclusion from incomplete data. This rule prevents that class of error.
