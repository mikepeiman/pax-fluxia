Below is a Windows-first spec for a deterministic local-agent harness. It is designed to eliminate the exact fragility classes you saw: shell quoting failures, patch mismatch from line endings, regex replacement accidents, hook breakage, and ambiguous process execution semantics.[[git-scm](https://git-scm.com/docs/githooks)]​[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

## Goal

The harness should give any agent a **small, typed, transactional API** for workspace operations so that it rarely needs to emit raw shell commands. That matters because Node’s process APIs distinguish direct execution from shell execution, and shell execution introduces quoting, metacharacter, and Windows `.cmd`/`.bat` behavior differences that are explicitly platform-sensitive.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

The design target is not “works most of the time.” The target is: same request, same repo state, same harness version, same result or same classified error on any supported Windows machine.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

## Principles

The harness should follow these rules:

- Never prefer shell strings when an executable path plus argument array will do, because `exec()` runs through a shell while `execFile()` does not by default.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Treat `.cmd` and `.bat` as special Windows cases, because they cannot be launched the same way as ordinary executables and may require `cmd.exe` or shell mode.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Treat file edits as structured operations with verification, not ad hoc text replacement.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Treat Git hooks as an external, potentially hostile integration boundary, because Git allows hooks to be redirected with `core.hooksPath` and many commit-time hooks can abort operations.[[git-scm](https://git-scm.com/docs/githooks)]​
    
- Normalize line endings through repository policy, because the observed patch failures were tied to line-ending mismatches.[[learn.openwaterfoundation](https://learn.openwaterfoundation.org/owf-learn-git/eol/)]​[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    

## System shape

Build one local service, for example `agent-harness.exe` or `agent-harness.ps1` bootstrapping a bundled Node binary, exposing JSON-RPC over stdio or a localhost named pipe. The model never talks to PowerShell directly unless calling a dedicated “shell fallback” operation that is disabled by default.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

Recommended implementation stack:

- Runtime: Node.js LTS bundled with the harness, so behavior does not depend on system Node.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Language: TypeScript.
    
- Packaging: single distributable for Windows.
    
- IPC: JSON-RPC 2.0 over stdio for simplest agent integration.
    
- Persistence: local `.agent-harness/` state directory per workspace.
    

## Required capabilities

The harness API should expose only a narrow set of operations:

## Workspace

- `workspace.open(rootPath)`
    
- `workspace.preflight()`
    
- `workspace.snapshot()`
    
- `workspace.rollback(snapshotId)`
    
- `workspace.status()`
    

`preflight()` should check Git availability, repo root, write permissions, line-ending policy, package-manager health, and validator availability before any edit session starts. That prevents the agent from discovering corruption or hook issues halfway through the task.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

## Files

- `file.read(path, encoding?)`
    
- `file.stat(path)`
    
- `file.write(path, content, {encoding,eol,atomic,expectedHash?})`
    
- `file.patch(path, operations[], {expectedHash?})`
    
- `file.replaceBetween(path, startAnchor, endAnchor, replacement, options)`
    
- `file.insertAt(path, anchor, position, content, options)`
    
- `file.deleteRange(path, startAnchor, endAnchor, options)`
    

All file writes must be atomic: write temp file, fsync, verify content hash, preserve or explicitly set newline mode, then rename into place. That directly avoids the “inline PowerShell mutation” class of failures in your log.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

## AST edits

For supported languages, especially TypeScript:

- `ts.findSymbol(path, symbolName)`
    
- `ts.renameSymbol(...)`
    
- `ts.insertImport(...)`
    
- `ts.replaceFunctionBody(...)`
    
- `ts.addInterfaceField(...)`
    
- `ts.getDiagnostics(paths[])`
    

This should use AST tooling, not regex. Regex edits remain as a fallback but must be explicitly marked low-confidence. The log shows regex and string replacement causing broken template literals and partial application.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

## Diff and verification

- `diff.unstaged()`
    
- `diff.file(path)`
    
- `verify.fileHash(path)`
    
- `verify.anchors(path, anchors[])`
    
- `verify.compiles(profile)`
    
- `verify.tests(profile)`
    

Every mutating call should optionally include postconditions, for example “anchor A exists exactly once,” “diagnostics count did not increase,” or “file hash changed exactly once.”

## Processes

- `proc.execFile(file, args[], options)`
    
- `proc.execShell(command, shellKind, options)` disabled by default
    
- `proc.which(name)`
    
- `proc.kill(runId)`
    
- `proc.stream(runId)`
    

Default policy should be:

- Prefer `execFile()` / `spawn()` without shell.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Use shell only for built-ins like `dir`, compound pipelines, or `.cmd`/`.bat` wrappers where Windows requires it.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Always capture `stdout`, `stderr`, exit code, start/end time, cwd, resolved executable, and normalized env diff.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    

## Git

- `git.status()`
    
- `git.diff(paths?)`
    
- `git.add(paths[])`
    
- `git.restore(paths[])`
    
- `git.commit(message, {verifyMode})`
    
- `git.branch(name)`
    
- `git.checkout(ref)`
    
- `git.stash(label?)`
    

`verifyMode` should support:

- `repo-default`
    
- `no-verify`
    
- `isolated-hooks`
    

Git documents that hooks can be bypassed with `--no-verify` for relevant commit flows, and that hook location can be changed with `core.hooksPath`.[[git-scm](https://git-scm.com/docs/githooks)]​  
For agent use, `isolated-hooks` is the best default: point `core.hooksPath` at a harness-managed Windows-safe hook directory containing only approved wrappers. That keeps some policy while avoiding arbitrary repo scripts.[[git-scm](https://git-scm.com/docs/githooks)]​

## Validation

- `validate.run(profile, targets?)`
    
- `validate.parse(output, toolKind)`
    
- `validate.classify(failures)`
    

Profiles should be standardized:

- `fast`: file-level diagnostics only
    
- `targeted`: package or project subset
    
- `full`: repo-wide
    
- `precommit`: exact policy required before agent commit
    

That directly addresses the “39m 52s focused check” problem by making validation intentional and scoped.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

## Determinism model

The harness should explicitly define what “deterministic” means:

A command is deterministic if, given the same:

- harness version
    
- workspace snapshot
    
- operation input
    
- config
    
- toolchain bundle
    
- environment allowlist
    

it produces the same:

- file mutations
    
- stdout/stderr classification
    
- exit status
    
- artifact hashes
    

Absolute determinism is impossible once you invoke arbitrary third-party tools, but _harness-level determinism_ is achievable by controlling inputs and classifying nondeterministic boundaries.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

Use three trust tiers:

|Tier|Example|Policy|
|---|---|---|
|A|Built-in file ops, AST ops, hash checks|Deterministic, always allowed|
|B|Bundled Node/TS, direct `git.exe` calls|Allowed with structured capture|
|C|Repo tools like `bun`, custom scripts, hooks|Sandboxed, classified as external|

## Windows-specific rules

These should be hardcoded, not left to model judgment:

- Never invoke a command as a single shell string if it can be expressed as executable plus arg array.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- On Windows, resolve `.exe`, `.com`, `.cmd`, and `.bat` distinctly; if target is `.cmd` or `.bat`, route through `cmd.exe /d /s /c` with a tested quoting function.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Set `windowsHide: true` by default to avoid console window flashes.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Normalize env keys so only one casing of `PATH` is passed, because Windows env keys are case-insensitive and Node warns that duplicate variants like `PATH` and `Path` can cause issues.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- For `cwd`, verify existence before launch and return a typed `cwd_not_found` error instead of raw `ENOENT`.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- For long-running jobs, use explicit timeout plus process-tree kill.
    

## File-edit contract

Every file mutation should return:

- `beforeHash`
    
- `afterHash`
    
- `appliedOperations`
    
- `newlineModeBefore`
    
- `newlineModeAfter`
    
- `anchorsMatched`
    
- `verificationPassed`
    
- `reversiblePatch`
    

Supported mutation operations should be things like:

- `replace_exact`
    
- `replace_between_anchors`
    
- `insert_before_anchor`
    
- `insert_after_anchor`
    
- `delete_between_anchors`
    
- `ast_transform`
    
- `format_region`
    

Forbidden by policy:

- free-form regex replacement on source files unless `dangerouslyAllowRegex=true`
    
- blind overwrite without `expectedHash` or explicit force flag
    
- multiple unrelated file edits in one operation without a transaction
    

## Transactions

All edit sessions should be transactional.

Transaction flow:

1. `snapshot`
    
2. `apply edits`
    
3. `run targeted verification`
    
4. `if fail -> rollback or keep for inspection`
    
5. `stage`
    
6. `run commit profile`
    
7. `commit`
    

A transaction should be abortable at any point, and rollback should restore both file content and staged Git state where possible. Git plus a temp backup directory is enough for a robust first version.

## Error model

Every failure should be typed and machine-readable. Example classes:

- `patch_anchor_not_found`
    
- `patch_anchor_ambiguous`
    
- `newline_policy_conflict`
    
- `encoding_unknown`
    
- `process_spawn_failed`
    
- `command_not_found`
    
- `cwd_not_found`
    
- `timeout_exceeded`
    
- `tool_corrupt_install`
    
- `git_hook_failed`
    
- `git_hook_incompatible_windows`
    
- `validator_too_slow`
    
- `postcondition_failed`
    

This is critical. Your log was painful partly because the agent had to infer what happened from shell text. A good harness should return structured errors, not prose.

## Git policy

For reliability, I’d define this default policy:

- Read status and diffs with normal Git.
    
- Stage with normal Git.
    
- Commit with `isolated-hooks` unless repo explicitly opts into `repo-default`.
    
- Never let arbitrary repo hooks be the first thing an agent encounters on Windows. Git’s hook system is flexible by design, but that flexibility is exactly why it is nondeterministic across machines.[[git-scm](https://git-scm.com/docs/githooks)]​
    

The isolated hook directory can contain:

- message validation wrapper
    
- whitespace check
    
- optional project validator launcher
    

All must be Windows-native, preferably Node or PowerShell 7 only.

## Repository policy

Each repo that wants reliable agent work should include:

## `.gitattributes`

Use a repo-controlled policy so line endings are not left to personal Git configs. Git guidance widely points to `.gitattributes` as the place to control end-of-line handling consistently across users.[[learn.openwaterfoundation](https://learn.openwaterfoundation.org/owf-learn-git/eol/)]​

Example:

text

`* text=auto *.ts text eol=lf *.tsx text eol=lf *.js text eol=lf *.json text eol=lf *.md text eol=lf *.ps1 text eol=crlf *.bat text eol=crlf *.cmd text eol=crlf`

## `.agent-harness.json`

Example policy:

json

`{   "version": 1,  "os": "windows",  "defaultShellFallback": "disabled",  "git": {    "commitVerifyMode": "isolated-hooks"  },  "files": {    "defaultEncoding": "utf8",    "defaultEol": "preserve",    "atomicWrites": true  },  "validation": {    "fast": ["ts:diagnostics-changed-files"],    "targeted": ["bun:check-package", "tests:related"],    "full": ["bun:check", "tests:all"]  },  "tools": {    "node": "bundled",    "bun": "workspace",    "git": "system"  } }`

## Agent operating protocol

The agent itself should be instructed to use this sequence:

1. Open workspace.
    
2. Run preflight.
    
3. Read target files only.
    
4. Plan edit operations.
    
5. Apply smallest valid structured edits.
    
6. Verify anchors and diagnostics.
    
7. Run targeted validation.
    
8. Stage.
    
9. Commit with isolated hooks if authorized.
    

It should be prohibited from:

- writing temporary one-off shell scripts unless through harness temp-script API
    
- editing source via inline PowerShell replacement
    
- calling `exec`/shell mode for normal binaries
    
- running full repo validation when targeted validation suffices
    

## Fallback ladder

When ideal operations fail, the harness should degrade in a controlled order:

1. AST transform
    
2. Anchor-based text edit
    
3. Exact string replace
    
4. Temporary full-file rewrite with hash guard
    
5. Shell fallback, explicit approval required
    

That ladder matters because it preserves determinism as long as possible before entering the least reliable mode.

## Security and trust

Even if your main goal is reliability, security and reliability align here.

- Shell mode is dangerous and should require `allowShell=true`, because shell metacharacters are interpreted by the shell and Node explicitly warns against passing unsanitized input when shell execution is enabled.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Environment variables should be allowlisted, not blindly inherited.
    
- Network should be disabled by default for repo-local tasks.
    
- Destructive commands should require a capability token.
    
- Every mutating call should be journaled.
    

## Minimal v1 build plan

I’d build it in this order:

1. `workspace`, `file.read`, `file.write`, `file.patch`, `diff.file`
    
2. `proc.execFile` with Windows-safe resolution
    
3. `git.status`, `git.add`, `git.commit` with isolated hooks
    
4. `validate.run`
    
5. TypeScript AST edit layer
    
6. Rollback and snapshots
    
7. Named profiles and repo policy file
    

That v1 already eliminates most of the failures in your Codex log.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​

## Opinionated defaults

If you want the shortest “watertight” defaults, I would choose these:

- Bundled Node runtime
    
- No raw shell by default
    
- Direct process execution everywhere possible
    
- `.cmd`/`.bat` routed through a tested Windows command launcher only when necessary.[[ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/d50263db-7aa3-44a9-b041-2c4cee579bd5/paste.txt)]​
    
- Atomic writes only
    
- `.gitattributes` required
    
- Commit with isolated hooks by default.[[git-scm](https://git-scm.com/docs/githooks)]​
    
- AST edits for TS/JS first
    
- Fast validation after every edit batch, targeted validation before commit
    
- Structured logs and typed errors only
    

If you want, next I can turn this into one of two deliverables:

1. a concrete JSON-RPC API spec with request/response schemas, or
    
2. a practical TypeScript project scaffold for `agent-harness` on Windows.