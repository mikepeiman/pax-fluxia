# Modularize Large Files

## RULE: If a file is too large for a single write, it MUST be modularized.

The agent's output token limit serves as a natural smell test. If a file cannot be written or fully rewritten in one pass, it is too monolithic and should be split into smaller modules/components.

### For Svelte Components
- Each section/panel should be its own child component
- Parent orchestrates layout and passes props/callbacks
- Example: `CombatDebugPanel.svelte` → parent + `<BattleControls>`, `<ShipsMotionControls>`, etc.

### For TypeScript Modules
- Split by domain responsibility
- Extract helpers, types, and constants into separate files
- Keep each file under ~400 lines

### Threshold
If a `.svelte` or `.ts` file exceeds **~500 lines**, proactively consider splitting it.
