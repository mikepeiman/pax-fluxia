# Clickable Code References on Completion

## MANDATORY: Every completion report MUST include clickable references

When you complete any work, your final message to the user MUST include a section listing **all modified functions, data structures, and files** as clickable code references.

## Format

Use the markdown link syntax with line ranges:

```markdown
### Modified Code
- [functionName](file:///absolute/path/to/file.ts#L123-L145) — brief description of change
- [ClassName.method](file:///absolute/path/to/file.ts#L200-L230) — what was changed
- [CONSTANT_NAME](file:///absolute/path/to/config.ts#L15) — new/modified value
```

## Rules

1. **Every function** you modified or created gets a clickable link
2. **Every data structure** (interface, type, config object) you changed gets a link
3. **Every component** you modified gets a link to its template/script section
4. Links MUST include line ranges (`#L123-L145`) so the user jumps to the exact code
5. Group by file, ordered by importance of change
6. Include a 5-10 word description of what changed

## Why

The user needs to quickly verify and understand all changes. Clickable links eliminate friction and enable rapid course correction.
