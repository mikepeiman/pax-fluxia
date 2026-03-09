# Perplexity Harness Prototype — Dual-Perspective Evaluation

**Date**: 2026-03-09  
**Source**: [Perplexity created Agentic Harness 2026-03-09/](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/SYSTEM/Perplexity%20created%20Agentic%20Harness%202026-03-09)  
**Files reviewed**: `agent-harness-schema.md` (989 lines), `implementation-reference.md` (947 lines), `project-scaffold.md` (774 lines), `script.py` (24 lines)

---

## What They Built

A near-complete harness prototype: **JSON-RPC 2.0 API schema**, **working TypeScript implementations** of all core services, and a **full project scaffold** ready to be instantiated. Total material: ~2,700 lines across 3 substantive documents, including ~1,500 lines of actual TypeScript code.

**Coverage**: workspace, file ops (atomic writes, anchor-based patching), process execution (Windows-safe), git ops, validation profiles, TypeScript AST ops, configuration, snapshots/rollback.

---

## Pass 1: Where I'm Smarter (Shortcomings & Fixes)

### 1. No IPC transport flexibility
They hardcoded stdio only. We planned **three transports** (stdio, named pipe, HTTP localhost). Named pipe gives persistent connections; HTTP gives debuggability. Their single-transport assumption limits adoption scenarios.

**Fix**: Abstract transport layer behind an interface. Swap stdio/pipe/HTTP as runtime config.

### 2. No lossless chat log or context persistence
The prototype has zero concept of conversation history, session continuity, or context rules. This is the biggest functional gap. It solves the *mechanical* reliability problem but not the *cognitive continuity* problem — rules falling out of context, prior decisions lost, same mistakes recurring.

**Fix**: Our Basic Harness plan's `chatlog.*` and `context.*` operations fill this entirely.

### 3. No methodology hooks at all
The prototype is a pure reliability harness with no concept of Atlas drift detection, emergent-behavior prechecks, assumption verification, or any of the Atlas Harness hooks. This is expected — they didn't have the PRISM-Atlas context — but it means the prototype is only Phase 0–5 of our Basic plan.

**Fix**: Our Atlas Harness plan layers on top.

### 4. Brace-counting for function body replacement
`TemplateStringEscape.replaceFunctionBody()` uses a naive brace-depth counter to find function boundaries. This breaks on:
- Braces inside string literals (`"{"`)
- Braces inside template literals (`` `${obj}` ``)
- Braces inside comments (`// }`)
- Arrow functions with single-expression bodies (no braces)

**Fix**: Use `ts-morph` for AST-level function body replacement. Fall back to anchor-based replacement (which is safer than brace-counting) if AST fails.

### 5. The RPC main loop has a concurrency hazard
```typescript
stdin.on('data', async (chunk) => {
  // ... for loop processes requests sequentially but
  // each iteration awaits handlers that may overlap
```
The `data` event fires again while prior requests are still awaiting. Input accumulates in `buffer` but handlers could interleave if multiple requests arrive simultaneously. There's no request queuing or ordering guarantee.

**Fix**: Add a request queue. Process requests sequentially: dequeue → handle → respond → dequeue next. Or use a mutex-per-workspace for mutation operations.

### 6. Error classes inconsistent with typed error model
They define typed error codes (1000–6000 ranges) in the schema, but the implementation throws plain objects (`throw { code: 2001, message: 'file_not_found' }`). No error class hierarchy. No `instanceof` checking. No structured `data` payloads consistently.

**Fix**: Define `HarnessError extends Error` with code, message, data. Use `instanceof` for catch discrimination. Every throw site uses the class.

### 7. Git status parser is incomplete
Their `git.status()` parses `--porcelain` output but:
- Doesn't parse branch tracking info (`[ahead N, behind M]`)
- Doesn't handle renamed files (`R  old -> new`)
- Doesn't handle copied files
- Uses simple string splitting that breaks on paths with spaces

**Fix**: Use `--porcelain=v2` format (more structured, handles renames cleanly). Or use `--null` to handle paths with spaces/special chars.

### 8. No `file.stat` implementation
Listed in schema, absent from implementation. The `FileService` only has `read`, `write`, `patch`.

**Fix**: Trivial to add — `fs.stat()` + `LineEndings.detect()` on content.

### 9. `npm` used throughout despite Windows `.cmd` concern
Their `ValidationService` calls `npx` and `npm` directly via `spawnDirect`. But `npm` on Windows is `npm.cmd` — it must go through `cmd.exe`. This is the exact bug class the harness is supposed to prevent, and it's in the harness itself.

**Fix**: `proc.which` must resolve `.cmd`/`.bat` and auto-route through `spawnBatch`. This should be transparent — the caller shouldn't need to know whether the target is `.exe` or `.cmd`.

### 10. `which` as external dependency
They import `which` as an npm package. This introduces an external dependency for a critical path operation. The harness should be as self-contained as possible.

**Fix**: Implement `which` inline — walk `PATH`, check extensions (`.exe`, `.cmd`, `.bat`, `.com`) in order. ~30 lines, zero dependencies.

---

## Pass 2: Where They're Smarter (What I Can Learn)

### 1. They shipped concrete schemas with real examples
Every API method has full JSON request/response examples using **actual project code** (Pax Fluxia's `DistanceFieldTerritoryRenderer.ts`). My plans have operation tables and descriptions but no request/response schemas. Their schema document is immediately testable — you can paste a request and verify the shape.

**Lesson**: Schema-first development. Their `agent-harness-schema.md` is a contract that implementations are built against. My plans describe *what* but their schema specifies *exactly how*.

**Action**: Adopt their schema document as the starting point. Extend it with our additional operations (`chatlog.*`, `context.*`, atlas hooks).

### 2. They implemented a complete edit session example
Lines 917–976 show a full 8-step edit session: open → preflight → snapshot → read → patch → validate → add → commit. This is a **runnable integration test specification**, not just a description.

**Lesson**: The session example is more valuable than architectural description because it's verifiable.

**Action**: Add similar session examples for our new operations (chat log append, context.rules query, atlas drift check).

### 3. Their `AnchorMatcher` design is cleaner than mine
They separated anchor matching into its own class with `findAnchor`, `replaceBetween`, `insertBefore`, `insertAfter`. My plan describes these as file-level operations. Their decomposition is better — the matcher is reusable and unit-testable independently of the file system.

**Lesson**: The anchor matching logic should be a pure function class that operates on strings, not a file service method.

**Action**: Adopt `AnchorMatcher` as a standalone utility class.

### 4. Build scripts are concrete
`esbuild` → bundle → `pkg` → Windows executable. My plan describes this as "Bundle as single distributable" without specifying tooling. Their pipeline is copy-paste-ready.

**Lesson**: Distribution isn't vague — it's esbuild + pkg, and they show exactly how.

**Action**: Adopt their build pipeline (substituting Bun-equivalent where applicable).

### 5. The `escapeCommandLine` function handles real Windows quoting
Their `cmd.exe` quoting function covers spaces, `&`, `|`, `<`, `>`, `^`, and embedded quotes. This isn't a theoretical design — it's a real function that handles real Windows shell metacharacters.

**Lesson**: Windows quoting is specific and tested, not left as "use a tested quoting function."

**Action**: Adopt their `escapeCommandLine` implementation, extend with additional test cases for edge cases they missed (e.g., `%` in paths, UNC paths).

### 6. Project structure is well-decomposed
```
src/
  services/     ← business logic
  windows/      ← platform-specific
  git/          ← git domain
  rpc/          ← transport
  logging/      ← observability
  utils/        ← shared utilities
```
This separation is better than a flat service layout. Platform-specific code is isolated in `windows/`, making future cross-platform support cleaner.

**Lesson**: The `windows/` isolation pattern should be adopted — if you ever port to macOS/Linux, only that folder changes.

**Action**: Adopt their `src/` directory structure directly.

### 7. Their type definitions are comprehensive and ready to use
~300 lines of TypeScript interfaces covering every request/response shape. These are directly compilable. My plans specify types in prose.

**Lesson**: Types ARE the spec. Their `types/index.ts` is the most valuable single file in the prototype.

**Action**: Adopt `types/index.ts` wholesale. Extend with our new types (`ChatLogEntry`, `ContextRulesResponse`, `AtlasDriftResult`, etc.).

### 8. They included a testing strategy with specific test cases
Unit tests for `ProcessLauncher` (spawn exe, handle .bat, normalize env) and `LineEndings` (detect CRLF/LF/mixed, normalize). These are immediately runnable with Vitest.

**Lesson**: Test cases are specs. Their tests answer "what does correct behavior look like?" more precisely than prose.

**Action**: Adopt their test cases as the starting test suite. Extend with tests for our additional operations.

---

## Synthesis: What to Adopt, Modify, and Add

### Adopt Directly (their work → our project)
| Item | Source File | What |
|------|-------------|------|
| Type definitions | `project-scaffold.md` → `types/index.ts` | ~300 lines of compilable interfaces |
| Project structure | `project-scaffold.md` | `src/` directory layout with `windows/` isolation |
| `AnchorMatcher` | `implementation-reference.md` | Standalone anchor matching utility |
| `LineEndings` | `implementation-reference.md` | EOL detection + normalization |
| `FileWriter` | `implementation-reference.md` | Atomic write implementation |
| `escapeCommandLine` | `implementation-reference.md` | Windows cmd.exe quoting |
| Config schema | `agent-harness-schema.md` | `.agent-harness.json` structure |
| Build pipeline | `implementation-reference.md` | esbuild → pkg workflow |
| Test cases | `implementation-reference.md` | ProcessLauncher + LineEndings tests |

### Modify (their work, our improvements)
| Item | Modification |
|------|-------------|
| `ProcessLauncher` | Auto-detect `.cmd`/`.bat` and route through `spawnBatch` transparently |
| Git status parser | Use `--porcelain=v2` + `--null` for robust parsing |
| RPC main loop | Add request queue to prevent concurrent handler interleaving |
| Error handling | Create `HarnessError` class hierarchy instead of thrown plain objects |
| `which` resolution | Implement inline instead of npm dependency |
| `TemplateStringEscape.replaceFunctionBody` | Replace with `ts-morph` AST approach |

### Add (our original, not in their prototype)
| Item | Plan |
|------|------|
| Named pipe transport | Atlas Harness needs persistent connections |
| HTTP localhost transport | Debug and testing ergonomics |
| `chatlog.*` operations | Lossless conversation logging |
| `context.*` operations | Persistent rules engine (rules never fall out of context) |
| Atlas drift detection | Commit-blocking trigger matrix |
| Emergent-behavior precheck | Cross-architecture porting gate |
| Assumption verification | Typed claim validation |
| Atomic scope limiter | Transaction scope limits |
| Repair loop automator | Post-mortem detection + heuristic extraction |
| Thinking recipe injector | Cognitive operation sequencing |
| Design quality gate | UX latency + interaction step checks |

---

## Conclusion

**The Perplexity prototype is a strong starting point for the Basic Harness.** It provides ~1,500 lines of working TypeScript that covers the mechanical reliability layer. The type definitions alone save significant effort.

**It is not a starting point for the Atlas Harness.** It has no concept of methodology enforcement, context persistence, or cognitive tooling. That's our original contribution.

**Recommended approach**:

1. **Fork the Perplexity prototype** as the initial codebase for Basic Harness
2. **Fix the 10 shortcomings** identified in Pass 1 (especially the `.cmd` routing bug — it's ironic)
3. **Add our Phase 4 operations** (chatlog, context persistence) — these are the biggest differentiators
4. **Layer the Atlas Harness hooks** on top as Phases A–E after the Basic Harness is working
5. **Replace Bun for Node** where specified by user decision (Bun first, npm backup) — their prototype is Node-only

The prototype proves the core design is implementable. Our contribution is the *purpose* layer — not just "safe operations" but "safe operations that enforce a coherent development methodology."
