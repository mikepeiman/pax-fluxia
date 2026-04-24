# Post-Mortem - 2026-04-23 - Wrong Worktree Integration Boundary

## Summary

I implemented the territory performance work in an existing populated worktree that was not a clean "today only" branch surface. When it came time to merge back to `master`, I initially treated the whole feature branch as the integration unit. That was wrong and created an unnecessary merge/conflict surface against commits that were not part of today's requested work.

## Cause

- I used an existing worktree because it already contained the relevant perf branch context and files.
- I did not verify the branch ancestry against current `master` before continuing work there.
- The feature branch contained older perimeter-field commits that were patch-equivalent to `master` but not actual ancestors of `master`.
- That made a naive branch merge look much larger and riskier than the real "today's work" delta.

## Mistaken Reasoning

- I optimized for local continuity instead of validating the isolation boundary first.
- I treated "populated and relevant" as if it meant "safe integration surface."
- I delayed the ancestry check that should have been the first step:
  - what is on this branch that is not on `master`
  - are those commits actually today's work
- Once that check was skipped, the later merge attempt was framed around the wrong unit of integration.

## Diagnostic Method

1. Stop the bad merge attempt and clear the merge state.
2. Compare branch ancestry and patch identity instead of relying on branch names.
3. Run `git cherry master codex/perimeter-field-metaball` to distinguish:
   - older commits already represented on `master`
   - the actual new commits from today's work
4. Identify the real integration set as the five new commits from 2026-04-23.
5. Replay only that work onto `master` and keep the generated settings artifact out of the result.

## Impact

- I created avoidable merge anxiety and an unnecessarily large apparent conflict set.
- Integration took longer than it should have.
- The risk of accidental regression increased until the merge surface was corrected back to the actual five commits.

## Fix

- Reframe the integration around today's actual commits only.
- Replay that work onto `master` in commit order.
- Restore the generated settings file so it is not carried as intentional source history.
- Leave the completion and continuation docs on `master` so tomorrow's work can continue directly there.

## Derived Rule

- Never start substantial work in an existing worktree without first proving its ancestry boundary against current `master`.
- Before doing any merge-back planning, always check both:
  - `git log master..HEAD`
  - `git cherry master <branch>`
- If a branch is not a clean task-isolation surface, do not use the whole branch as the merge unit. Integrate only the verified commit set or rebuild the work on a fresh branch from current `master`.
