---
description: Never declare something fixed without verification
trigger: always_on
---

# Verification-First Policy

## CRITICAL RULE: Never Declare Something "Fixed" Without Verification

**The AI agent MUST NOT claim an issue is resolved without actual evidence or verification.**

### When User Reports a Bug

**DO:**
- ✅ Investigate the code
- ✅ If you find potential issues, propose fixes
- ✅ If you cannot find the issue, **ask for examples/screenshots**
- ✅ Say "I've made changes that should fix this - please verify"
- ✅ Wait for user confirmation before declaring success

**DO NOT:**
- ❌ Declare something "Already Fixed ✅" based on code inspection alone
- ❌ Assume your code is correct when user reports otherwise
- ❌ Dismiss user reports with "this should work" or "it's already handled"

### Exception

The ONLY time you can declare something fixed without user verification:
- Obvious compile/syntax errors
- Trivial typo fixes
- Missing imports

Even then, prefer: "Fixed [issue]. Please verify."
