# Takeaways - 2026-05-04

- The menu-exit bug is a shell-ownership problem, not just a missing dialog.
- The mode-persistence bug is off-spec by design today:
  - the docs describe three distinct mode-local settings surfaces
  - the implementation still persists one shared settings blob
- The territory regressions have to be treated as invariant failures:
  - borders and fills must share one geometry truth
  - owners with surviving stars must not silently lose drawable regions
- Do not patch the missing-region symptom until the ownership snapshot, geometry snapshot, and renderer-consumer contracts are mapped end-to-end.

