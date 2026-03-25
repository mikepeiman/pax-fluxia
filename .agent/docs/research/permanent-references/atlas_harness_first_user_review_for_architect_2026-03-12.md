# Atlas-Harness First-User Review For Architect

**Date:** 2026-03-12  
**Audience:** Architect / maintainer of atlas-harness MCP  
**Context:** First sustained real-world use inside a Windows repo workflow for Pax Fluxia / PRISM territory-engine development. This included MCP startup/configuration, workspace opening, targeted code reads, hash-guarded patching, git staging/commit, repeated typecheck loops, artifact writing, and worktree-based isolation.

## Executive Summary

Atlas-harness is already useful enough to be worth using.

The core value proposition is good:
- explicit workspace targeting
- structured file access
- hash-guarded edits
- integrated git operations
- lightweight process execution
- artifact-friendly workflow

Once it was operational, it improved the quality of my work materially.

The biggest issue is not capability. It is **activation friction**. The first-run and recovery path from MCP/config/startup problems is too opaque. A second issue is **error quality**: a few failures expose internal implementation details instead of operator-meaningful causes. A third is **Windows execution robustness**.

If you improve those three areas, the product gets disproportionately better without needing a major architectural rewrite.

## Overall Product Assessment

### What is already strong

1. **Workspace-scoped repo operations feel correct**
   - `workspace_open`, `workspace_preflight`, `git_status`, `git_add`, and `git_commit` create a clear model.
   - In a multi-worktree or branch-heavy environment, explicit workspace targeting is a real advantage.

2. **Hash-guarded editing is a real quality feature**
   - `file_patchLines` and `file_patchMulti` are not just nice-to-have. They reduce stale-write risk during long-running refactor sessions.
   - This matters especially for single large files edited in multiple passes.

3. **Artifact writing fits real agent workflows well**
   - Being able to save notes, session logs, and architecture references through the same system as code changes is a strong design choice.
   - It encourages durable documentation because it is low-friction once the system is up.

4. **The tool surface is directionally right for serious repo work**
   - The system is strongest when the workflow is deliberate and structured, not exploratory shell chaos.
   - That is a good niche.

## Highest-Leverage Improvements

## Priority 1: MCP startup and connectivity diagnostics

This is the most important improvement.

### Problem

I encountered multiple startup-stage failures before the system became usable. The failures were real, but the main issue was that the system did not make the next step obvious enough.

Examples of failure modes encountered:
- `The directory name is invalid. (os error 267)`
- `Method not found: initialize`
- transport/config mismatch issues that only became obvious after multiple iterations
- need for session reload after config changes, without the product making that state sufficiently explicit

### Why this matters

When the operator cannot quickly distinguish between:
- bad transport
- bad cwd
- server launch failure
- non-MCP JSON-RPC server
- stale session registry

then trust in the whole system drops, even if the core tools are good.

### Recommendation

Implement an explicit startup health model with first-class statuses.

Suggested model:
- `config_loaded`
- `process_launch_succeeded`
- `cwd_validated`
- `transport_selected`
- `mcp_initialize_sent`
- `mcp_initialize_succeeded`
- `tool_registry_loaded`
- `session_reload_required`

For each failure, emit:
- `failure_stage`
- `operator_meaning`
- `likely_causes`
- `recommended_next_action`

### Example of the message quality target

Instead of:
- `Method not found: initialize`

Prefer something like:
- `The configured process responded to JSON-RPC but did not implement MCP initialize. This usually means the server is not running in MCP mode, or the wrong executable/transport was configured. Recommended next steps: verify transport, verify entry command, then restart the client session.`

### Specific product feature suggestion

Add a dedicated `mcp doctor` or startup report view that shows:
- exact command launched
- resolved working directory
- transport in use
- whether initialize was attempted
- whether initialize succeeded
- capabilities returned
- whether current session has stale registry state

This is probably the single highest-return improvement in the whole product.

## Priority 2: Error messages must describe operator-relevant failure, not internal implementation failure

### Problem

Some tools fail in ways that leak internal exceptions rather than useful causes.

Concrete example observed:
- patch helper failure: `undefined is not an object (evaluating 'anchor.substring')`

This is an implementation detail, not an actionable error.

### Recommendation

Introduce an error normalization layer for all user-facing tool failures.

For every tool, errors should classify into stable categories such as:
- invalid input shape
- target not found
- ambiguous target
- stale hash / concurrent modification
- encoding or EOL mismatch
- sandbox/policy denial
- process launch failure
- command resolution failure
- directory/file type mismatch

Then include:
- machine category
- human explanation
- suggested next action

### Patch-tool specific recommendation

For `file_patch` and related operations, explicitly detect and report:
- missing anchor
- multiple matching anchors
- zero-length anchor
- file changed since read
- unsupported encoding
- line ending mismatch if relevant

That would turn patching from “sometimes excellent, sometimes mysterious” into a much more dependable surface.

## Priority 3: Make Windows command execution boring and predictable

### Problem

I hit command execution issues on Windows that should not have required operator workarounds.

Concrete example observed:
- `proc_execFile` on `rg` failed with an `EPERM` spawn issue involving a WindowsApps/Codex-packaged path

I recovered by falling back to PowerShell-native search, but the point is that the tool should have handled this class of issue more gracefully.

### Recommendation

Treat Windows process execution as a first-class product surface.

Specific improvements:
1. Resolve command lookup explicitly and report the resolved path before execution when useful.
2. Distinguish clearly between:
   - command not found
   - permission denied on resolved binary
   - sandbox/policy block
   - working directory problem
3. Add a fallback resolution strategy for common utilities where appropriate.
4. Improve the error string so the operator can tell whether the issue is environment, packaging, or tool policy.

### Ideal behavior

If a command resolution points into a location that is known to cause spawn issues, either:
- resolve to a safer alternative automatically, or
- emit a targeted recommendation immediately

Example:
- `Resolved rg to <path>, but execution was denied by platform policy. Consider using an absolute binary path or shell fallback.`

## Priority 4: Add proper directory-aware filesystem operations

### Problem

Some file tools appear strongly file-oriented, and using them against directories gives awkward results.

Example observed:
- a directory metadata request surfaced as an `EISDIR` style read problem rather than a clean directory-aware response

### Recommendation

Provide clearer separation between:
- file stat
- directory stat
- directory listing

Suggested additions or semantics:
- `path_stat` that works for both files and directories and returns `kind: file|directory|missing`
- `dir_list` for child enumeration
- explicit `file_read` refusing directories with a clean, user-facing explanation

This is not a major blocker, but it would improve ergonomics noticeably.

## Priority 5: Improve patch ergonomics for large-file workflows

### Problem

Large-file incremental editing is common in real refactor work. The hash-guarded tools are conceptually strong, but the ergonomics can still be brittle when multiple regions are being changed and the operator is iterating quickly.

### Recommendation

Add at least one of the following:
- patch dry-run / preview mode
- richer mismatch diagnostics for `file_patchMulti`
- a helper that can return nearest-anchor context when a patch target fails
- optional “apply if unchanged in these ranges only” semantics

A patch preview is especially attractive because it would improve confidence without forcing full manual diff reconstruction.

## Priority 6: Improve session-reload clarity after MCP config changes

### Problem

In practice, changing server configuration often implies a client/session reload, but that requirement is too implicit.

### Recommendation

If the system detects that MCP config changed since session start, surface a clear state like:
- `MCP config changed; active session is still using previous server registry. Restart or reload required to apply changes.`

This should be visible at the time of failure, not something the operator has to infer.

## Product-Level Recommendations By Layer

## A. Onboarding and Startup

Build a tiny opinionated startup path:
- validate config schema
- validate cwd exists
- validate entry command exists
- validate transport choice
- test initialize handshake
- show live result

If you implement nothing else, implement this.

## B. Error UX

Standardize every tool failure into:
- stable error category
- concise explanation
- probable root causes
- next-step instruction

This will make the product feel far more mature without changing the core tools.

## C. Process Execution

Invest specifically in Windows reliability.

This session strongly suggests that Windows is not a peripheral environment. It is a primary one. That means command resolution and spawn behavior deserve product-level polish, not incidental support.

## D. Filesystem Surface

Unify the mental model:
- paths should be queryable consistently
- directories should not error like malformed files
- the operator should not need shell fallback for basic introspection

## E. Editing Surface

Preserve the current strength of hash-guarded editing, but make failures easier to recover from.

## Concrete Changes I Would Ship First

If I were sequencing actual implementation work, I would do this in order:

1. **Startup diagnostics pass**
   - MCP startup report
   - explicit initialize-handshake status
   - session-reload-needed detection

2. **Error normalization pass**
   - patch-tool errors first
   - process execution errors second
   - directory/file mismatch errors third

3. **Windows execution pass**
   - command resolution diagnostics
   - better spawn failure classification
   - common utility fallback strategy where appropriate

4. **Filesystem ergonomics pass**
   - unified stat semantics
   - explicit directory listing tool or improved existing semantics

5. **Patch ergonomics pass**
   - dry run / preview
   - clearer anchor mismatch reporting

## Features That Already Feel Right

These should be preserved and leaned into:
- explicit workspace root model
- hash-guarded file edits
- narrow line-range reads
- integrated git checkpointing
- lightweight artifact writing
- predictable MCP tool names and roles

Do not lose those strengths while improving startup and error handling.

## Final Assessment To Architect

The product direction is good.

The current system feels like infrastructure built by someone who understands the real workflow of code agents, but not all of the operator pain has been translated into polished product behavior yet.

The encouraging part is that the gaps are highly actionable. This does not feel like a wrong architecture. It feels like a solid architecture with a weak first-run/control-plane layer.

That is fixable.

If you improve:
- startup diagnostics
- error quality
- Windows command reliability

then atlas-harness will stop feeling like “good tools with friction” and start feeling like “serious production tooling.”

That is a reachable upgrade, and it would have changed this session noticeably for the better.
