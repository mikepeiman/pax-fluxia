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

### 2026-04-13 A6. Workspace file tools still initialize from `C:\WINDOWS\system32` in some Codex calls

- Status: open
- Category: tool initialization failure
- Surface: MCP workspace binding / file service bootstrap

#### Verified observation

At the start of this diagnostics UI slice, `atlas-harness file_read` again failed before reading any repo file. The first error was:

```text
No workspace open and auto-open from CWD failed: EPERM: operation not permitted, mkdir 'C:\WINDOWS\system32\.agent-harness'
```

Follow-on reads then failed with:

```text
null is not an object (evaluating 'fileService.read')
```

The live repository cwd for the task was:

```text
C:\Users\mikep\Desktop\WebDev\pax-fluxia
```

#### Impact

- ordinary file reads become unavailable even though the repo is already open in the active Codex thread
- tool selection gets forced back to raw shell reads
- this reduces the value of atlas-harness precisely in the â€œread local code quickly and safelyâ€ path where it should be strongest

#### Workaround

- use direct PowerShell `Get-Content` / `Select-String` in the repo workdir for the current slice

#### Desired fix or success condition

- atlas-harness file tools should bind to the actual thread workspace root, not `C:\WINDOWS\system32`
- if workspace bootstrap fails, the error should stop there cleanly instead of cascading into `fileService.read` null-object failures

### 2026-04-12 A5. `file_read` still fails in-session during ordinary documentation work

- Status: open
- Category: tool initialization failure
- Surface: MCP file service

#### Verified observation

During routine project-doc maintenance in this session, atlas-harness `file_read` failed again with:

```text
null is not an object (evaluating 'fileService.read')
```

This happened while attempting to read:

- `.agent/docs/project/sessions/notes/SESSION_2026-04-12.md`
- `.agent/docs/project/implementation-plans/2026-04-12/MASTER_PROGRAM_PLAN_2026-04-12.md`
- `.agent/docs/project/features/FEATURE_AND_TASK_QUEUE_2026-04-12.md`

The same failure class had already been observed earlier in the session family, so this is not a one-off.

#### Impact

- breaks ordinary doc maintenance, not just code editing
- forces fallback to PowerShell reads even when atlas-harness should be the safer/cleaner tool surface
- makes harness comparison difficult because the file-service layer can fail before higher-level evaluation even starts

#### Workaround

- use plain PowerShell or other non-atlas file reads for the affected task
- continue logging each recurrence with the exact surface and task type

#### Desired fix or success condition

- atlas-harness should expose a reliable initialization/health state for `fileService`
- `file_read` should fail with a specific startup-state error if the service is unavailable
- ordinary text/doc reads should be boringly reliable

#### Notes

- this failure happened after the broader Windows shell situation had already improved, so it should not be conflated with the earlier Codex sandbox command-execution issue

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

### 2026-04-12 A4. `file_readRange` still crashes with null `fileService` in active project session

- Status: open
- Category: tool initialization failure
- Surface: atlas-harness MCP file line-range reads

#### Verified observation

Attempting to read line ranges from:

- `pax-fluxia/src/lib/components/ui/MainMenu.svelte`

through the atlas file tool failed repeatedly with:

```text
null is not an object (evaluating 'fileService.readRange')
```

This occurred in a valid Pax Fluxia workspace where the same file was immediately readable through PowerShell fallback.

#### Impact

- blocked precise line-based inspection during a live UI refactor
- forced fallback to shell reads and a bulk-edit workaround
- prevented atlas-harness from serving as the trusted surgical read surface it is meant to provide

#### Workaround

- use shell-based file reads when range reads fail
- continue the refactor via alternate tooling, then record the failure here

#### Desired fix or success condition

- `file_readRange` should either work or fail with a workspace/service initialization error that explains what must be re-opened or re-initialized
- `fileService` should not remain in a null-crash state after startup
- an explicit atlas-harness readiness/health command should expose file-service status before read operations are attempted

### 2026-04-12 A5. `file_patchLines` crashes with null `fileService` during live refactor work

- Status: open
- Category: tool initialization failure
- Surface: atlas-harness MCP surgical file editing

#### Verified observation

Attempting to use the atlas file patch tool against:

- `pax-fluxia/src/lib/components/ui/MainMenu.svelte`

failed with:

```text
null is not an object (evaluating 'fileService.patchLines')
```

This happened in the same valid project workspace where shell-based edits and `apply_patch` alternatives continued to work.

#### Impact

- blocked the preferred line-range editing path during a large UI cleanup
- forced fallback to scripted text replacement for damaged spans
- reduced trust that atlas-harness can serve as the safe surgical editor during exactly the kind of refactor it should help with

#### Workaround

- use `apply_patch` where possible
- fall back to deterministic shell scripting when atlas file patch tools are unavailable

#### Desired fix or success condition

- `file_patchLines` should either work or fail with a concrete initialization/health error
- file read and file patch readiness should be surfaced together in a single harness health report
- null-object crashes should never be the first signal an agent receives from a core file tool

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

