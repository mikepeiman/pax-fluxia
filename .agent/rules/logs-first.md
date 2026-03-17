# Logs First Rule

## MANDATORY: When a bugfix fails to resolve on the first attempt, use LOGS before further code analysis.

Code path analysis is valuable for forming hypotheses, but live log data is the only ground truth about what is actually executing at runtime.

## Rule

If a bug is not resolved after the first fix attempt:
1. **Stop theorizing from code**
2. **Add diagnostic logs** at every data handoff point in the relevant pipeline
3. **Ask the user to reproduce the bug** and share log output
4. **Only then** form a verified hypothesis and fix

## What to Log

For rendering/geometry bugs, log at minimum:
- Which render path is executing (canonical vs legacy)
- Point counts and bounding box of fill polygons per owner
- Point counts and bounding box of border polylines per owner pair
- Any non-obvious early returns or conditional branches taken

## Bad Pattern
```
// Bug not fixed → analyze more code → form new hypothesis → fix → still wrong → repeat
```

## Good Pattern
```
// Bug not fixed → add logs at data handoffs → user runs game → read logs → verified root cause → fix
```

## Why

The AI agent cannot observe the running application. The user can.
Log output is more reliable than any amount of static code reasoning.
