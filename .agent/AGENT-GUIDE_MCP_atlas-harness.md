# Atlas Harness — Agent Guide

> **Read this first.** This is your complete reference for the Atlas Harness MCP server.

---

## Your Tools

You have **13 tools available directly** — the ones that cover ~80% of typical work:

### File Operations
| Tool | What It Does |
|------|-------------|
| `file_read` | Read file contents (returns hash for safe writes) |
| `file_write` | Atomic write — auto-scanned against project rules |
| `file_readRange` | Read specific line range from large files |
| `file_patchLines` | Replace a line range (hash-guarded to prevent stale writes) |
| `file_list` | List directory contents with sizes and timestamps |

### Git
| Tool | What It Does |
|------|-------------|
| `git_status` | Branch, staged/unstaged/untracked files |
| `git_commit` | Commit — auto-blocked if documentation is stale |

### Process
| Tool | What It Does |
|------|-------------|
| `proc_execFile` | Run a command — auto-blocked if it violates shell rules |

### Code Analysis (AST-Powered via Tree-sitter)
| Tool | What It Does |
|------|-------------|
| `code_outline` | Symbol tree: functions, classes, types with line ranges |
| `code_exports` | Exported symbols with kinds and modifiers |
| `code_dependencies` | Import dependencies (named, namespace, default) |
| `code_references` | Find all files that import a given symbol |
| `code_diff_semantic` | Semantic diff — added/removed/changed symbols only |

### More Tools (42 additional — use `atlas_tools_discover` for full schemas)

**Workspace**
- `workspace_open` — open a project root
- `workspace_preflight` — health checks (git, config, uncommitted changes)
- `workspace_snapshot` — create rollback point
- `workspace_rollback` — restore to snapshot

**File** (beyond the 5 above)
- `file_stat` — metadata: size, hash, line count, modified time
- `file_patch` — anchor-based edits (replace/insert/delete by text match)
- `file_patchMulti` — multiple non-contiguous line edits in one atomic op

**Git** (beyond status/commit)
- `git_diff` — file diffs, staged or unstaged
- `git_add` — stage files
- `git_log` — commit history
- `git_stash` — push, pop, or list stashes

**Process** (beyond execFile)
- `proc_which` — resolve command path
- `proc_kill` — kill by PID

**Chat Log**
- `chatlog_append` — append to lossless log
- `chatlog_query` — search history
- `chatlog_session` — start/end sessions
- `chatlog_export` — export as markdown

**Context**
- `context_rules` — get compiled project rules
- `context_projectConfig` — runtime, package manager, shell, git aliases

**Atlas Methodology** (use `atlas_tools_discover("atlas")` for full schemas)
- `atlas_rules_check` — scan content against project rules
- `atlas_rules_list` — list active rules
- `atlas_drift_check` — is documentation in sync with source?
- `atlas_drift_markUpdated` — mark a doc as updated
- `atlas_scope_start` — begin scoped transaction (file/line budget)
- `atlas_scope_status` — current usage vs limits
- `atlas_scope_expand` — increase limits with reason
- `atlas_scope_end` — end transaction, get stats
- `atlas_repair_record` — log a failure for pattern tracking
- `atlas_repair_postmortem` — structured post-mortem
- `atlas_repair_search` — search past failures
- `atlas_repair_heuristics` — learned rules from past fixes
- `atlas_recipes_list` — cognitive debugging sequences
- `atlas_recipes_get` — get recipe by ID or problem type
- `atlas_recipes_suggest` — auto-suggest based on failure patterns
- `atlas_emergent_start` — cross-system porting safety check
- `atlas_emergent_respond` / `atlas_emergent_bypass` / `atlas_emergent_status`
- `atlas_claims_register` — register a factual assertion
- `atlas_claims_verify` — verify or contradict with evidence
- `atlas_claims_list` / `atlas_claims_summary` / `atlas_claims_unverified`
- `atlas_ux_setLatencyBudget` / `atlas_ux_recordLatency` — latency tracking
- `atlas_ux_setInteractionLimit` / `atlas_ux_recordInteraction` — step limits
- `atlas_ux_checks` / `atlas_ux_runGate` — run all UX quality checks

---

## What This Server Does For You

Atlas Harness is a **guardrailed workspace API**. It wraps standard operations with automatic enforcement:

- **`file_write`** → writes the file **and** scans content against project rules
- **`proc_execFile`** → runs the command **and** blocks if it violates shell rules (e.g., `npm` in a bun-only project)
- **`git_commit`** → commits **and** blocks if documentation is stale

**You don't need to remember project rules.** They're enforced at execution time. If blocked, the error tells you why and what to do instead.

---

## Key Practices

1. **Use hashes for writes** — the `hash` from `file_read` prevents stale edits when passed to `file_write`/`file_patchLines`
2. **Prefer AST tools** — `code_outline` and `code_exports` understand code structure; don't scan raw text
3. **When blocked, read the error** — violations include rule ID, reason, and suggested fix
4. **Commit often** — drift detection runs at commit time

## Workspace Auto-Open

The workspace **auto-opens** from your IDE's project root. No `workspace_open` call needed.

## Configuration

Project rules live in `.agent-harness.json` at the workspace root:

```jsonc
{
  "rules": [
    { "id": "no-npm", "pattern": "npm ", "replacement": "bun ", "level": "block", "context": "shell_command" }
  ],
  "atlas": {
    "triggers": [
      { "condition": "new_export", "glob": "src/**/*.ts", "atlasFile": "docs/API.md" }
    ]
  }
}
```
