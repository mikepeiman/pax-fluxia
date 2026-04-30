# Takeaways - 2026-04-30

- A visible settings panel is not a tuning surface unless the user can actually reach it in the app and the render path consumes the value.
- Defaults are seed values, not runtime truth. Re-injecting them every frame is a state-ownership bug.
- Territory topology, geometry source selection, and visual presentation must have single owners in the UI. Duplicated ownership created the exact drift the user was objecting to.
- `Shared Edge Trim` is currently overloaded: it affects visible junction gaps and also contributes to fill pullback on the straight shared-edge control path. That is useful to know but architecturally impure.
- Detached-worktree development without immediate commits made it too easy to report progress that the user could not see in the checkout they were actually running.
- The process failure mattered as much as the code defects: completion was reported before user-visible verification and before required daily docs/commits existed.
- Parent panels and child panels must not both own subsection navigation. Duplicated navigation authority is the same class of defect as duplicated topology authority: two UI surfaces pretending to own one contract.
- Ignore rules must not be broader than the artifact paths they intend to suppress. A naked `sessions/` rule was catching required `.agent/docs/sessions/...` records and directly contradicting the repo protocol.
