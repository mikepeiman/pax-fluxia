---
description: How to get clean git diff output without encoding garbling
---

# Reliable Git Diff

PowerShell pipes can garble `git diff` output when files contain Unicode or special characters. Always redirect to a temp file and read it instead.

## Steps

// turbo-all

1. Run the diff and redirect to a temp file:
```powershell
git diff HEAD~1 HEAD -- <file_path> | Out-File -Encoding utf8 $env:TEMP\diff_output.txt
```

2. Read the temp file:
```powershell
# Use view_file tool on: $env:TEMP\diff_output.txt
# Or for quick view:
Get-Content $env:TEMP\diff_output.txt
```

## For unstaged changes:
```powershell
git diff -- <file_path> | Out-File -Encoding utf8 $env:TEMP\diff_output.txt
```

## For comparing specific commits:
```powershell
git diff <commit1> <commit2> -- <file_path> | Out-File -Encoding utf8 $env:TEMP\diff_output.txt
```

## Alternative: Use `git show` for single commit diffs:
```powershell
git show HEAD -- <file_path> | Out-File -Encoding utf8 $env:TEMP\diff_output.txt
```
