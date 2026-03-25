# Task Packet Template

Use this fixed schema when turning any item from the master plan into a one-shot execution packet for a strong LLM agent.

## Packet Schema

### Task ID

- Unique ID from `TASK_INDEX.md`

### Objective

- One exact deliverable stated in implementation terms

### Reason

- Why this task matters now
- What larger epic or route it unlocks

### Inputs

- Existing docs, code paths, screenshots, fixtures, or route-truth facts required before starting

### Dependencies

- Upstream tasks or assumptions that must already be true

### Exact Files

- Exact files expected to change
- Exact files expected to be read for validation

### Implementation Steps

1. Concrete step 1
2. Concrete step 2
3. Concrete step 3

### Acceptance Checks

- Code/build/check requirements
- Runtime/route-truth requirements
- Artifact publication requirements

### Browser/Screenshot Steps

- Exact mode family
- Exact route
- Exact backend
- Fixture/map type
- Screenshot names or paths to save

### Non-Goals

- Explicitly state what this task does not attempt to solve

### Fallback/Stop Conditions

- When to stop rather than guessing
- What evidence or blocker should be reported if the task cannot be completed cleanly

## Packet Quality Bar

A packet is ready for delegation when:

- it targets one subsystem or one tightly related slice
- it does not mix method invention, backend refactor, and validation design in one ticket
- it is clear enough that route truth and acceptance are not ambiguous
