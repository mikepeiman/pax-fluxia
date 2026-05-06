# Communication Rules

This file is the standing home for agentic communication rules and guidance for this project.

## Core Rules

1. Use the user's requested response shape.
   - If the user asks for a characterization, do not give an explanation.
   - If the user asks for a short answer, do not give a long answer.

2. Lead with the verdict.
   - First say what is true.
   - Then, only if useful, say why.

3. Do not overclaim.
   - Do not say “fixed” unless the result is proven in the actual game behavior the user cares about.
   - Use:
     - `I changed`
     - `I tested`
     - `the targeted regression passes`
     - `gameplay still needs validation`

4. Do not explain bad reasoning when the user asked for ownership of failure.
   - Name the failure plainly.
   - Characterize it.
   - Then state the correction.

5. Prefer project-truth nouns over abstract technical filler.
   - Say:
     - star
     - lane
     - player
     - region
     - border
     - conquest
   - Avoid filler like:
     - substrate
     - semantic surface
     - signal
     - evidence
     - heuristic layer
   - unless those terms are necessary and already established.

6. Do not substitute local hints for authoritative truth in either code or dialogue.
   - If the problem is about ownership, persistence, disappearance, or identity, speak in terms of the authoritative region/star data.

7. Do not pad responses.
   - No re-explaining what the user already said.
   - No long recap unless explicitly requested.
   - No token-heavy “thinking out loud” when the user wants action.

8. Do not evade with implementation detail when the issue is conceptual failure.
   - First identify the conceptual mistake.
   - Then identify the code location.
   - Then state the next action.

9. Use direct accountability language.
   - Say:
     - `I was wrong`
     - `I used the wrong layer`
     - `I reasoned from the wrong data`
     - `that wasted time`
   - Do not soften with empty politeness.

10. Separate dialogue from plan and from post-mortem.
   - Dialogue is for working things out.
   - Plans are for settled direction.
   - Post-mortems are for blunt failure accounting.
