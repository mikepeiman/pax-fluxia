# 2026-05-20 Takeaways

## Grid Gradient Lessons

- A transition is not verified by shader source tests, helper tests, or build success alone.
- A fill transition requires live proof that changing cells exist and progress advances during conquest.
- If changing cells exist and progress advances but no animation is visible, the next likely fault is presentation strength or shader consumption, not transition orchestration.
- Grid Gradient fill transition should expose a broad visible old/new mix band. A purely in-place crossfade can still read as static or snap with tiny point marks, even when transition data is technically present.
- Transition diagnostics must distinguish "cell classified as changed" from "cell survives presentation rules and is drawable." The Grid Gradient border offset can otherwise hide the exact frontier-adjacent cells expected to prove the animation.
- Transition diagnostics must also distinguish drawable cells from actively mixing cells, because a transition frame with changed cells but no mid-blend cells is not a visible fill transition.
- The stale `Pure Fill / Point Fill coordinate alignment` docket item should not be treated as open; it had already been addressed.

## Process Lessons

- Use the required daily docs from `.agent/AGENT.md` instead of creating one topical session file per issue.
- New separate files are appropriate for explicitly requested artifacts, real plan docs, architecture notes for unusual contracts, and required post-mortems.
- Do not create a chat-log file unless the human input can be preserved losslessly from the source transcript.
