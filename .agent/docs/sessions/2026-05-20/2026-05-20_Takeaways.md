# 2026-05-20 Takeaways

## Grid Gradient Lessons

- A transition is not verified by shader source tests, helper tests, or build success alone.
- A fill transition requires live proof that changing cells exist and progress advances during conquest.
- If changing cells exist and progress advances but no animation is visible, the next likely fault is presentation strength or shader consumption, not transition orchestration.
- Grid Gradient fill transition should keep every changed cell visibly participating across the duration; narrow per-cell flip windows are too easy to read as snap with tiny point marks.
- Transition diagnostics must distinguish "cell classified as changed" from "cell survives presentation rules and is drawable." The Grid Gradient border offset can otherwise hide the exact frontier-adjacent cells expected to prove the animation.
- The stale `Pure Fill / Point Fill coordinate alignment` docket item should not be treated as open; it had already been addressed.

## Process Lessons

- Use the required daily docs from `.agent/AGENT.md` instead of creating one topical session file per issue.
- New separate files are appropriate for explicitly requested artifacts, real plan docs, architecture notes for unusual contracts, and required post-mortems.
- Do not create a chat-log file unless the human input can be preserved losslessly from the source transcript.
