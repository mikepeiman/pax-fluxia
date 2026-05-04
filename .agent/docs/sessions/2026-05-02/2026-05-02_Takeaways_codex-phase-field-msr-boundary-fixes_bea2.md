# 2026-05-02 Takeaways

- The broken geometry overlay was real current geometry, not a scrub/transition overlay artifact.
- For the live phase-field mode, Diagnostics was exposing `power_voronoi_0319`-adapted owner shell loops derived from `mergedTerritories`.
- The core fault was not phase-field paint logic. It was the shared owner-boundary chain walk using insertion-order junction selection.
- A greedy "first candidate" owner walk is unacceptable anywhere LP/CX virtual-site seams can create 3+ outgoing choices.
- The repo already contained the right conceptual utility in `planarWalk.ts`; the chain-walk core simply had not been upgraded to use it.
- Closed-loop-first harvesting matters. Otherwise an open spur can consume the real frontier chain before the valid owner loop is assembled.
- `MSR` cannot be allowed to act as a hidden multiplexer for unrelated geometry controls like power-diagram weight scale or contested midpoint spacing.
- Owner-local post-processing is not an acceptable authority surface for shared borders. If adjacent owners each mutate their own copy of a boundary, later render alignment becomes guesswork.
- When a mode needs one truthful border/fill/diagnostics seam, the resolver must be able to ignore prebuilt owner loops and rebuild from shared frontiers.
- A geometry reset is only complete when the authority seam moves upstream. If renderers and diagnostics still each re-resolve their own version, the system remains untrustworthy even if screenshots look temporarily better.
- For `power_voronoi_0319`, the live seam must be: raw shared/world frontiers -> resolved shared-boundary seam -> resolved regions -> display borders.
- Diagnostics must name the exact stage they draw. â€œShow geometryâ€ without a stage label invites false conclusions and downstream patching.
- Raw owner-local `mergedTerritories` can remain useful context, but they must not be silently adapted as the live canonical snapshot if shared-frontier truth is the real authority.

