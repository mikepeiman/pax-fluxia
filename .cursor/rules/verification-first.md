# Verification-First Policy

## CRITICAL RULE: Never Declare Something "Fixed" Without Verification

**The AI agent MUST NOT claim an issue is resolved without actual evidence or verification.**

## The Problem This Prevents

**BAD BEHAVIOR:**
1. User reports issue (e.g., "decimals showing in combat logs")
2. Agent searches code, finds related code
3. Agent ASSUMES code is correct
4. Agent declares "Already Fixed ✅" without verification
5. **User is gaslit - their real issue is dismissed**

**CORRECT BEHAVIOR:**
1. User reports issue
2. Agent investigates code
3. Agent finds uncertainty or cannot reproduce
4. Agent responds: "I cannot find the problem in the code. **Can you provide an example or screenshot so I can locate the exact issue?**"
5. User provides evidence
6. Agent actually fixes the issue

## Rules

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
- ❌ Gaslight users by contradicting their direct observations

### Appropriate Responses

**When you find the code looks correct:**
> "I see the code has `.toFixed(0)` for ship counts, which should prevent decimals. However, you're reporting decimals are still showing. Can you provide a screenshot or example so I can locate where the issue is occurring?"

**When you make a fix:**
> "I've updated [files] to round ship counts. Please verify this fixes the issue you're seeing."

**When you cannot reproduce:**
> "I cannot reproduce this issue. Can you provide steps to reproduce or a screenshot of the problem?"

## Why This Matters

Users see the actual running application. When they report an issue:
- **They are right** - the issue exists in reality
- **You are working from code** - which may have bugs
- **Never assume your code is correct over user observation**

## Exception

The ONLY time you can declare something fixed without user verification:
- You found an obvious compile error or syntax error
- You fixed a typo that clearly could not work
- The fix is trivial and objective (e.g., missing import)

Even then, prefer: "Fixed [issue]. Please verify."
