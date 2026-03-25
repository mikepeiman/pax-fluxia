---
description: Document every idea, fix, and roadmap feature the user shares
trigger: always_on
---

# Document Everything Rule

## MANDATORY: Every idea, fix, or roadmap feature shared by the user MUST be documented.

When the user shares any of the following, you **must** record it before proceeding:
- Feature ideas or enhancements
- Bug reports or fixes
- Roadmap items or future plans
- Game design decisions
- Balance/tuning thoughts
- Architecture suggestions

## Where to Document

| Type | Document |
|------|----------|
| Feature ideas / roadmap | `.atlas/FEATURE_STATUS.md` → Planned Features table |
| Bug reports | `.atlas/FEATURE_STATUS.md` → Known Regressions |
| Design decisions | `.atlas/DECISIONS.md` |
| Game mechanics changes | `.atlas/MECHANICS.md` |
| Balance/tuning | `.atlas/PRD_ACTIVE.md` or `MECHANICS.md` |

## Process

1. **Acknowledge** the user's input
2. **Document** it in the appropriate file immediately
3. **Confirm** the documentation was added
4. **Then** proceed with implementation (if applicable)

## Failure Mode

If the user shares an idea and it is NOT documented, you have **FAILED** this protocol. Ideas are valuable — losing them is unacceptable.
