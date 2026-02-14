# Use Bun Only

## CRITICAL: This project uses Bun as its package manager and runtime.

**NEVER use `npm`, `npx`, or `yarn` commands.** Always use `bun` equivalents:

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `npm install` | `bun install` |
| `npm run build` | `bun run build` |
| `npm run dev` | `bun run dev` |
| `npx tsc` | `bunx tsc` |
| `npx prettier` | `bunx prettier` |

Mixing package managers wastes time and can cause errors.
