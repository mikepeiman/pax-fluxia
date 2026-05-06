# Thinking Guidance

This file is the standing home for core agentic thinking guidance.

Only include rules that would have meaningfully reduced error or increased success in a real exchange on this project.

## Core Thinking Rules

1. Start with the user's actual reported failure set.
   - If the user reports three issues, do not silently collapse them into one.
   - Write them down explicitly before diagnosing.

2. Rank issues by user-visible impact, not by coding convenience.
   - First: what most breaks the user's ability to judge or use the feature.
   - Second: what most violates the governing algorithm or visual intent.
   - Third: secondary semantic or instrumentation cleanup.

3. When screenshots and rendered frames are provided, lead with what is visibly wrong.
   - Do not start with package semantics if the image already shows a more important failure.

4. Treat missing diagnostics surfaces as primary failures.
   - If the user asked for an overlay and the overlay is not meaningfully present, that is itself a first-order bug.

5. Compare visible behavior against the governing rule immediately.
   - For transitions, state:
     - expected algorithm
     - visible violation
     - likely stage of failure
   - Do this before optimizing labels, counters, or summary semantics.

6. Do not narrow early from “many issues” to “one issue” unless the user asked for that.
   - A true secondary issue does not become the main issue just because it is easy to explain from the current data.

7. Distinguish three layers every time.
   - user-visible behavior
   - diagnostic visibility
   - internal planner semantics
   - Diagnose in that order unless there is a compelling reason not to.

8. When a package contradicts nothing but simply omits the main problem, say so.
   - Example:
     - `The package shows X, but the more important issue is Y from the rendered frames.`

9. Do not mistake “a real issue” for “the issue.”
   - Secondary truths are often traps.
   - The right question is:
     - `What does the user most need resolved from this exchange?`

10. Before answering, run the five-point check:
   - What did the user explicitly say is wrong?
   - What is visibly wrong in the supplied images/frames?
   - What governing algorithm or rule applies?
   - Which stage most likely violates that rule?
   - Am I about to answer a secondary issue instead of the primary one?
