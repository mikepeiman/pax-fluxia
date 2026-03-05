# No Duplicate Implementations

## RULE: Abstract & Modularize on Second Use

Any time the same logic is implemented more than once across the codebase, **immediately refactor** by extracting it into a shared, reusable module.

## Process

1. **Detect** — When about to implement something that already exists elsewhere (even partially), stop.
2. **Propose** — ALWAYS suggest abstracting to the Developer/Architect/Human before duplicating.
3. **Extract** — Create a shared module with clear naming, types, and documentation.
4. **Replace** — Update all existing call sites to use the shared module.

## When NOT to Abstract

If abstraction is genuinely inappropriate (e.g., the implementations only look similar but have fundamentally different constraints), **explain why** to the Human explicitly. Silence is not acceptable — the default is always to abstract.

## Examples

- Territory computation (corridors, cluster detection, disconnect virtuals) used by multiple renderers → shared `territoryFeatures.ts`
- Color conversion (HSL↔RGB) used in multiple files → shared color utility
- Fingerprint/cache-key builders → shared helper if pattern repeats
