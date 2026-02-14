# File Size Limits

## CRITICAL: Enforce strict file line-count limits.

| Target | Lines |
|--------|-------|
| **Ideal max** | 300 lines |
| **Hard max** | 500 lines |
| **Most files** | 300 lines or less |

## Rules

1. **Before creating or editing a file**, check its line count
2. **If a file exceeds 500 lines**, it MUST be refactored before adding more code
3. **If approaching 300 lines**, consider splitting into imports/modules
4. **New code** should be written as importable modules from the start

## How to Split

- Extract functions into utility modules
- Extract constants/config into dedicated files
- Extract sub-components (Svelte) into their own `.svelte` files
- Move shared game logic into `common/` package
- Use barrel exports (`index.ts`) for clean import paths

## Priority Violations (known)

- `GameCanvas.svelte` — MASSIVE, needs component extraction
- `GameRoom.ts` — game logic should import from `common/`, not duplicate
- `MainMenu.svelte` — large, could extract sub-panels
- `GameEngine.ts` — check line count
