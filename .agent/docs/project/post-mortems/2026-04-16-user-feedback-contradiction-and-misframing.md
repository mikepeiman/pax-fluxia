# Post-Mortem: 2026-04-16 - User Feedback Contradiction And Misframing

## What Happened

I repeatedly argued against the user's controlled observations instead of treating them as ground truth.

After the user explicitly said they had:

- cleared local storage
- reloaded the same settings/theme
- matched map topology
- matched ownership topology and player count
- checked the issue at game-load timing where tick drift was irrelevant
- corrected earlier screenshot mismatches with later controlled screenshots

I still reused stale earlier arguments:

- that the branches must be running different session state because they were on different localhost origins
- that screenshot metadata like theme count, selected theme, tick, commander totals, or topology explained the divergence
- that the defect was being framed as a territory-render-mode problem after the user explicitly told me to stop framing it that way

That was not just a diagnostic error. It was a conversational failure. I forced the user to re-litigate facts they had already established and I responded to corrections by defending earlier bad reasoning instead of discarding it.

## Root Cause

### 1. I failed to invalidate obsolete evidence

I treated earlier noisy screenshots and earlier branch-state hypotheses as still relevant after the user had already done controlled reruns that superseded them.

I should have explicitly said:

- the earlier screenshot-based evidence is now obsolete
- the controlled rerun is the only evidence that matters
- all prior hypotheses depending on origin drift, theme mismatch, topology mismatch, or tick mismatch are dead

I did not do that.

### 2. I argued from inferred environment state against direct user verification

The repo rule is explicit: user observations are ground truth. I violated that by treating my inferred explanation of localStorage/origin behavior as stronger than the user's direct report that they had cleared storage and reloaded matching settings.

### 3. I kept the wrong problem statement alive

The user explicitly instructed me to stop reframing the issue as a territory-render-mode claim. I continued to reuse that framing in later analysis. That created a strawman around the defect and pulled the investigation away from the actual question: identical intended settings, same renderer family, different rendered result.

### 4. I optimized for defending prior analysis instead of converging on the live defect

Once I had produced a flawed explanation, I spent too much effort reconciling new evidence with that explanation instead of discarding the explanation and tracing the next real candidate path.

## Impact

- I wasted the user's time with arguments they had already disproven experimentally.
- I made the conversation adversarial by repeatedly implying the user was mistaken when they were correct.
- I polluted the written record with wrong explanations that then had to be corrected later.
- I delayed the clean identification of the actual bug even though the live fix eventually converged on the renderer/cache path.

## Corrective Actions

- When a user reports a controlled rerun, explicitly mark all contradictory earlier evidence as obsolete in the working notes.
- Maintain a dead-hypotheses list during debugging. Once the user falsifies a hypothesis, do not reuse it.
- If the user says "stop framing it as X," remove X from the active problem statement immediately.
- Before sending any causal claim, check whether it contradicts an explicit user verification already given in-thread.
- If I realize I argued against verified user feedback, say "I was wrong" directly and stop defending the old analysis.

## Lessons

- "Different localhost origin" is not a valid live explanation once the user has already controlled for persisted state and rerun the test.
- Early screenshots are not durable evidence after later controlled reproductions supersede them.
- A bug fix landing in the same area does not retroactively justify bad reasoning used earlier.
- Correct diagnosis is not enough. Repeatedly contradicting verified user feedback is itself a failure that needs to be treated as a defect in method.
