# Territory Engine Executive Overview For Non-CS Readers

## What Problem We Are Solving

Pax Fluxia is a stars-and-lanes strategy game. Players own stars. The map is always fully filled with player territory colors. There should never be empty gaps, loose fragments, or borders that disagree with the territory fill underneath them.

The hard part is not choosing a color. The hard part is computing the exact shared boundary between neighboring players so that:

- the fill and border use the same shape
- the whole map stays covered
- the territory can animate correctly when ownership changes
- the engine can switch between different frontier-generation methods for comparison

## Why This Has Been Difficult

Several older approaches let fills, borders, and animation derive their geometry in different ways. That creates the same family of problems over and over:

- borders look smooth but fills poke past them
- one part of the map updates before another
- a territory animates in a strange way because its “before” and “after” shapes do not match correctly
- a control combination looks meaningful in the UI even though it is not the real live route

The core lesson is simple:

> One canonical territory geometry source must drive everything else.

## The 15 Modes

There are 15 named planning contracts:

- 5 static frontier methods: `FG1` to `FG5`
- 5 dynamic update methods: `DY1` to `DY5`
- 5 hybrid orchestrations: `HY1` to `HY5`

These names are stable. They are useful because they let the team compare methods without renaming the whole system every time implementation changes.

## What A Backend Is

A backend is the execution surface that actually consumes territory data and draws the result.

In this plan, the maintained backends are:

- `PVV2`
- `PVV3`
- `DF`

These are not the same thing as the 15 method IDs.

Example:

- `FG2` means a specific frontier-generation strategy
- `DY5` means a specific dynamic update strategy
- `PVV3` means a runtime/backend that can execute and display the resolved route

## Current Reality In Plain Language

- `FG2 Seed Graph` is the only method that currently has a native end-to-end implementation.
- The other methods are still mostly placeholders or adapter-backed routes.
- `PVV3` is already doing active work and directly consuming native FG2 artifacts.
- `static`, `dynamic`, and `hybrid` are live-route choices, and only one of them is active at a time.

That means some settings combinations that look meaningful are not truly combined in the live route.

## Why This Bundle Exists

This bundle turns all of that into a cleaner planning system:

- methods stay stable
- backends are treated as equal maintained execution surfaces
- current reality is documented honestly
- future tasks are broken down into one-shot packets

It is meant to help both humans and AI agents understand not just what to do, but why the work is organized this way.

## The Main Mental Model

Think of the territory engine as five layers:

1. A static method decides what the settled frontier should be.
2. A dynamic method decides how that frontier updates during change.
3. A hybrid plan combines those two ideas.
4. A backend renders the result.
5. Validation tools prove that what the player sees is actually correct.

If those layers are mixed together carelessly, bugs become hard to isolate.

If they are separated cleanly, each piece becomes easier to test, compare, and improve.

## What Success Looks Like

The plan is successful when:

- every mode has an honest status
- every backend has a clear role
- every task is small enough to hand to an agent without extra decision-making
- the live route is explainable to a player and a developer
- territory visuals become trustworthy enough that comparison can focus on quality, not basic correctness
