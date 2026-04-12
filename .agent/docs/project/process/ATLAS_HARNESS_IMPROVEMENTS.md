# Atlas-Harness Improvements

Status: active permanent ledger
Owner: project workflow and tooling track
Started: 2026-04-11

## Purpose

This is the permanent active record of atlas-harness failures, shortcomings, integration problems, improvement opportunities, and feature ideas observed while working on Pax Fluxia.

The intent is constructive and operational:

- protect atlas-harness quality with grounded evidence
- distinguish package-core issues from wrapper or environment issues
- prevent repeated rediscovery of the same failures
- capture agent-facing pain points that atlas-harness is explicitly meant to eliminate
- make it easier to prioritize fixes and verify improvement over time
- accumulate worthwhile feature ideas in the same operational stream

## Update Protocol

Add entries when a problem is:

- directly observed in live use
- reproducible enough to describe clearly
- impactful to agent reliability, correctness, or workflow quality

Also add entries when a feature or quality-of-life improvement would materially improve agent reliability, observability, ergonomics, or maintenance.

For each entry, prefer this structure:

- date
- status
- category
- surface
- verified observation
- impact
- workaround
- desired fix or success condition

For proactive improvement ideas, prefer:

- date
- status
- category
- surface
- motivation
- proposed improvement
- expected benefit
- notes or constraints

Keep speculation separate from verified facts.

## Categories

- wrapper or launcher failure
- MCP transport or protocol issue
- tool initialization failure
- incorrect or misleading error reporting
- capability gap
- ergonomics or observability shortcoming
- performance or stability issue
- feature idea
- workflow improvement

## Active Entries

### 2026-04-11 A1. Sandboxed agent shell produced a false negative for direct `atlas-harness` invocation

- Status: resolved
- Category: wrapper or launcher failure
- Surface: direct command invocation path for `atlas-harness`

#### Verified observation

In the sandboxed Codex execution context, direct invocation failed:

```text
atlas-harness --help
```

Observed error:

```text
error: could not create process

Bun failed to remap this bin to its proper location within node_modules.
This is an indication of a corrupted node_modules directory.
```

In the same sandboxed Codex execution context, the published installed package entrypoint worked:

```text
bun run C:/Users/mikep/.bun/install/global/node_modules/atlas-harness/dist/index.js --help
```

That command successfully returned the atlas-harness help output.

The user separately verified that direct interactive-shell invocation works normally on this machine:

```text
atlas-harness
...
Status: healthy
```

The direct command was then verified outside the sandbox from this agent session and it worked:

```text
atlas-harness --transport mcp --help
```

#### Impact

- the initial diagnosis was wrong if interpreted as a real atlas-harness launcher failure
- the actual issue was the sandboxed execution context used by this agent shell
- relying on sandbox-only evidence caused unnecessary workaround logic and documentation drift

#### Workaround

Temporary workaround while inside the sandboxed shell was to invoke the published entrypoint through Bun.

#### Desired fix or success condition

- keep the repo MCP config on the simple direct command form:
  - `atlas-harness --transport mcp`
- remember that sandboxed shell failures are not sufficient evidence of a real machine-level launcher problem
- only log future launcher issues after confirming them outside the sandbox when possible

#### Notes

This entry is resolved as a false negative caused by sandboxed agent execution.

### 2026-04-11 A2. MCP file-read path failed with uninitialized file service

- Status: open
- Category: tool initialization failure
- Surface: atlas-harness MCP file read in this Codex session

#### Verified observation

Attempting to read project files through the atlas-harness file-read tool failed with:

```text
null is not an object (evaluating 'fileService.read')
```

This occurred when trying to read:

- `.agent/docs/project/implementation-plans/2026-04-11/MASTER_PROGRAM_PLAN_2026-04-11.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-04-11.md`

The same files were immediately readable through shell fallback using `Get-Content -Raw`, confirming the files themselves were present and accessible.

#### Impact

- atlas-harness could not be used as the primary file-reading surface in that step
- work had to fall back to shell commands, which is exactly the sort of friction atlas-harness is intended to reduce
- reliability of MCP-based document inspection is weakened until initialization health is more trustworthy

#### Workaround

Use shell fallback for file reads when the atlas-harness file tool is unavailable.

#### Desired fix or success condition

- file tools initialize correctly in Codex MCP sessions
- failed initialization produces a specific and actionable health error instead of a null-object crash
- a lightweight health check makes it obvious when file services are ready

### 2026-04-11 A3. Workspace auto-open fell back to `C:\\WINDOWS\\system32` and broke file tools

- Status: open
- Category: tool initialization failure
- Surface: workspace binding / auto-open behavior

#### Verified observation

During a later file-read attempt in this same project session, atlas-harness returned:

```text
No workspace open and auto-open from CWD failed: EPERM: operation not permitted, mkdir 'C:\WINDOWS\system32\.agent-harness'
```

This was followed by file-read failures such as:

```text
null is not an object (evaluating 'fileService.read')
```

The active project workspace was actually:

```text
C:\Users\mikep\Desktop\WebDev\pax-fluxia
```

So the auto-open attempt was resolving against an invalid/non-project current directory for atlas-harness purposes.

#### Impact

- file tools became unavailable even though the project workspace itself was valid
- work had to fall back to direct shell reads again
- the agent could not trust atlas-harness file operations without re-proving workspace state

#### Workaround

- fall back to direct shell reads in the affected thread
- re-check atlas-harness workspace binding before trusting file tools

#### Desired fix or success condition

- atlas-harness should reliably bind to the actual project workspace in Codex MCP sessions
- if auto-open fails from an invalid CWD, the error should point clearly at the workspace-binding problem
- `fileService.read` should never remain in a null-crash state after the root workspace-open failure

### 2026-04-11 S1. Error reporting should better separate wrapper failures from package-runtime failures

- Status: open
- Category: incorrect or misleading error reporting
- Surface: launcher and user diagnosis

#### Verified observation

The failing global launcher reported Bun remap corruption language that strongly suggests a broken project `node_modules` state, while the installed package entrypoint itself still worked correctly.

#### Impact

- agents may waste time trying to repair the wrong layer
- maintainers may misattribute blame to atlas-harness core, Bun project state, or the consuming repo
- debugging gets slower and noisier than it should be

#### Desired fix or success condition

- launcher-path failures clearly identify whether the issue is:
  - global wrapper or shim state
  - missing runtime dependency
  - package install corruption
  - project-local environment corruption

### 2026-04-11 S2. Atlas Harness would benefit from an explicit health-check surface

- Status: open
- Category: ergonomics or observability shortcoming
- Surface: diagnostics and operator confidence

#### Verified observation

In this session, there was no obvious first-class atlas-harness health command or MCP-facing diagnostic surface that could quickly answer questions like:

- is fileService initialized
- which tools are ready
- which workspace roots are active
- whether wrapper invocation is healthy

#### Impact

- diagnosis falls back to trial-and-error tool calls
- agents infer too much from symptoms
- the fastest route to clarity becomes shell probing rather than harness-native health reporting

#### Desired fix or success condition

- provide a simple health-check command or tool surface
- report subsystem readiness and degraded capabilities clearly
- give agents one obvious first stop before they start guessing

### 2026-04-11 F1. Atlas Harness should be judged against CLI-Anything by explicit keep-vs-eject criteria

- Status: open
- Category: workflow improvement
- Surface: strategic harness direction

#### Motivation

Pax Fluxia now needs a real harness evaluation process rather than continuing atlas-harness development by default.

CLI-Anything is now the higher-priority harness candidate to evaluate:

- [CLI-Anything](https://clianything.net/)

#### Proposed improvement

Compare atlas-harness against CLI-Anything on:

- command-surface quality
- structured output quality
- breadth of useful control
- project-aware rule enforcement
- code-intelligence value
- maintenance burden
- extension burden

Then:

- keep atlas-harness only for unique value worth developing
- narrow it if only a subset is uniquely strong
- retire it if it is mostly redundant

#### Expected benefit

- prevents sunk-cost bias
- clarifies whether atlas-harness should remain a core investment
- keeps the final workflow stack simpler and more honest

#### Active-circulation method

Atlas-harness should not be mothballed during evaluation.

- keep it as the live default MCP/tool path during the evaluation window
- run real Pax Fluxia work through it while CLI-Anything is tested in parallel
- record comparisons by capability bucket:
  - commodity
  - differentiator
  - not worth ongoing investment

This keeps the comparison honest and prevents judging atlas-harness only against stale memory or hypothetical use.

## Resolved Entries

- 2026-04-11 A1. Sandboxed agent shell produced a false negative for direct `atlas-harness` invocation

## Active Entries

### 2026-04-11 A2. Atlas file and git wrappers intermittently initialize as null in live sessions

#### Observed behavior

- `mcp__atlas_harness__file_readRange` failed repeatedly with:
  - `null is not an object (evaluating 'fileService.readRange')`
- `mcp__atlas_harness__file_read` also failed in a later session with:
  - `null is not an object (evaluating 'fileService.read')`
- `mcp__atlas_harness__git_status` failed in the same session with:
  - `null is not an object (evaluating 'gitWrapper.status')`

#### Practical impact

- forces fallbacks to raw shell reads for routine inspection
- slows down work precisely when atlas-harness is meant to reduce command fragility
- weakens confidence in atlas-harness as the default reliable inspection layer during workflow evaluation

#### Improvement direction

- add a first-class server health/init guard before exposing file/git methods
- return a targeted initialization error instead of a null-object runtime error
- expose a lightweight `health` or `services` status method that reports which subsystems are ready
