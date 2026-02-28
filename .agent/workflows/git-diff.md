---
description: How to get clean git diff output without encoding garbling
---

# Git Diff Best Practice

**NEVER** pipe `git diff` output directly through the terminal — it gets garbled by PowerShell encoding.

**ALWAYS** redirect to a temporary file, then read with `view_file`:

```powershell
# Output diff to a temp file
git diff <ref1> <ref2> -- path/to/file > C:\tmp\diff_output.txt 2>&1

# Then read the file
# Use view_file tool on C:\tmp\diff_output.txt
```

This applies to:
- `git diff`
- `git show`
- `git log -p`
- Any git command that produces large or multi-line output

// turbo-all
