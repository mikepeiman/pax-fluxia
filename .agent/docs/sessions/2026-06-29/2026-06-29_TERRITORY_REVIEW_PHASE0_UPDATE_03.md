# Territory Review Update 03

Timestamp: 2026-06-29T12:50:00-04:00

Status: review phase only. No product remediation has been applied.

## Full Player-Route Result

I ran `/play?bench=1` on the original baseline, current master, and the review branch using the same large saved map and the same modes.

The result does not prove "worse in every mode" by raw frame timing. Many p95/p99 frame numbers are better on the review branch.

But it does reveal a better explanation for the user's report: visible territory presentation can be delayed much longer even when frame timing improves. In plain English, the game can draw frames regularly while the territory layer shown inside those frames is stale or late.

## Strongest Current Leads

1. Presentation scheduling and commit delay: several transition rows improved frame timing but had much worse delay before the territory update was displayed.
2. Phase Field: worse than both baseline and current master on important gameplay and transition measures.
3. Benchmark coverage: direct mode setting still bypasses human topbar switching and saved settings.

## Lowered Suspects

1. Repeated physical-map checking is not a current primary suspect on the review branch.
2. Pixi probes are not supported as a strong standalone cause after a five-run confirmation.
3. A global "render territory immediately" policy is not viable; it can harm Cell Grid transitions.

## Next Step

Add or design a human mode-switch measurement and isolate presentation scheduling by mode and transition state.
