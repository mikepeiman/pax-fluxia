---
trigger: always_on
---

# PowerShell Compatibility

**NEVER use `&&` to chain commands** - PowerShell does not support this syntax.

DO NOT:
```powershell
git add . && git commit -m "message"  # FAILS
```

DO:
```powershell
git ac "message"  # Use the provided alias
```

Or run commands separately as two tool calls.
