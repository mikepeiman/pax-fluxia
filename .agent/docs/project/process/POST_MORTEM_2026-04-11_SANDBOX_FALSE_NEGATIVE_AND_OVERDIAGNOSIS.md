# Post-Mortem: Sandbox False Negative And Overdiagnosis

Date: 2026-04-11
Status: active lesson
Owner: Codex operating discipline

## Summary

I treated a sandbox-limited command failure as if it were strong evidence of a real machine-level atlas-harness problem.

That was a bad call.

It caused:

- unnecessary explanation and speculation
- incorrect intermediate documentation
- avoidable workflow churn
- wasted user attention

The underlying reality was much simpler:

- `atlas-harness` worked in the user's real terminal
- direct non-sandbox verification also worked
- the failing result came from the sandboxed agent shell context

## What I did wrong

### 1. I trusted the first failing shell result too much

I saw direct `atlas-harness` invocation fail inside the agent shell and treated that as meaningful evidence about atlas-harness itself before proving the failure reproduced outside the sandbox.

### 2. I escalated analysis before escalating execution

I spent too much effort building an explanatory model before doing the one decisive check that mattered:

- run the direct command outside the sandbox

That check should have happened almost immediately.

### 3. I let a temporary workaround harden into planning language

I updated repo docs and planning language around the `bun run <entrypoint>` workaround before the direct-command path had been properly revalidated.

That turned a local troubleshooting artifact into project-level policy too early.

### 4. I over-logged before resolving

Some logging was appropriate, but I created too much narrative around an unproven diagnosis.

The better sequence was:

1. verify direct command outside sandbox
2. fix config
3. then record the real lesson

## Failure pattern

This is the failure mode:

- a command fails in the sandboxed agent shell
- I infer too much from that failure
- I start modeling environment/tool causes
- I document or plan around the inferred cause
- only later do I run the decisive higher-confidence verification

This is specifically a **sandbox false-negative plus overdiagnosis** pattern.

## Why it was unacceptable

The user had already supplied strong contrary evidence:

- `atlas-harness` works in their terminal
- it works without elevation
- the problem therefore was likely in my execution context or invocation assumptions

At that point, the burden was on me to verify directly and quickly, not to keep theorizing.

## Correct operating rule

When a command fails in the agent shell but the user reports it works in their real terminal:

1. assume the agent execution context may be the problem
2. do the smallest decisive non-sandbox verification immediately
3. do not convert a workaround into project policy until that check is done
4. do not write broad failure claims about the tool before confirming the failure outside the sandbox

## Prevention checklist

Before diagnosing a shell/tool failure as a real project or machine issue:

- Has the user already stated the command works in their terminal?
- Could the failure be caused by sandboxing or tool-runner restrictions?
- Have I done one direct outside-sandbox verification yet?
- Am I about to document a workaround as if it were architecture?
- Am I writing more words than the problem has earned?

If any answer indicates uncertainty, stop and verify first.

## Concrete correction applied

- Revalidated `atlas-harness --transport mcp --help` outside the sandbox
- Restored `.agent/mcp_config.json` to the direct command form
- Corrected the planning docs
- Corrected the atlas-harness improvements ledger so it reflects the real cause

## Durable lesson

For local tooling issues, fast decisive verification beats clever diagnosis.

When the user says "it works here," I should privilege that evidence and disprove it before I build a theory around the opposite.
