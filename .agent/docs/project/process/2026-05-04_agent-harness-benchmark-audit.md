# Agent Harness Benchmark Audit

## Purpose

Explain the remaining untracked `pax-fluxia/.agent-harness/` output, preserve the human-useful artifact in committed docs, and keep generated runtime output out of `master` status noise.

## Findings

- The currently dirty path was `pax-fluxia/.agent-harness/`, not the repo-root `.agent-harness/`.
- The file being written there was:
  - `pax-fluxia/.agent-harness/metrics/frontier-techniques-benchmark-latest.json`
- The writer is:
  - `pax-fluxia/tools/debug/benchmark-frontier-techniques.test.ts`
- The write path is defined there as:
  - `ROOT = path.resolve(THIS_DIR, '..', '..')`
  - `METRICS_DIR = path.join(ROOT, '.agent-harness', 'metrics')`
  - `OUTPUT_PATH = path.join(METRICS_DIR, 'frontier-techniques-benchmark-latest.json')`
- The file is created with Node filesystem calls:
  - `mkdirSync(METRICS_DIR, { recursive: true })`
  - `writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf8')`

## Why It Exists

The benchmark test writes a latest local frontier-techniques comparison report so runtime rendering techniques can be compared without manually copying results out of test output.

## Reconciliation

- Preserved the generated benchmark artifact as committed documentation at:
  - `.agent/docs/project/benchmarks/2026-05-03_frontier-techniques-benchmark-latest.json`
- Ignored the generated nested runtime output path:
  - `pax-fluxia/.agent-harness/`

## Related Dirt

The remaining parent-repo dirt from `.claude/worktrees/goofy-raman` was a dirty nested repo, not ordinary source work:

- local live settings drift in `common/resources/settings-live/current-settings.json`
- a damaged local edit in `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- untracked local Claude settings under `.claude/`

That nested repo was restored to its tracked commit so the parent gitlink returned clean.
