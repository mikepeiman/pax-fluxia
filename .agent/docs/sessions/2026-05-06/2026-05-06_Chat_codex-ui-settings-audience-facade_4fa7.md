# Chat Log - 2026-05-06

## User

You are the worktree agent tasked with, and owner (under myself) of developing:
> A new player/developer split, making it easy to set default modes, update UI and features etc as a developer, but to ship a proper user-facing product, with a modified UI with all the developer options hidden. This architecture must accommodate, without any friction, all future development, so I can task agents to work on renderers, mechanics, UI etc. I want you to share your thinking on this; I do not believe it is perfectly attainable; I think it might be a hard task.

 You'll make a plan - but don't get hung up on "plan", it's also a vision and ideas document. Save it in project. Produce daily docs as per AGENT.md  as well as immediately beginning the handoff doc which will eventually save great time and effort when merging back to master.

## Assistant

- Proposed a global player/developer mode split.

## User

Corrections:
1. Custom map editor is also player facing
2. Rework MainMenu.svelte: No, do not. Game setup is player facing.
3. Actually I do want to expose dev tools with a deep link/toggle/advanced options.

I'm rethinking the entire thrust here.

I do not think we're going to make a mode architecture. It feels too invasive and prone to divergence. What's an approach that will make publishing to live with the player-facing facade and stable codebase easy, while not hindering extensive development and refactoring on the dev side?

WTF are you using "canonical" for here? 
`Make map-editor, benchmark, recorder/bundle tools, ruler/measurement tools, startup diagnostics, and territory mode diagnostics canonical developer-only surfaces.`
Tell me literally and exactly what you mean and why you used that term.

## Assistant

- Clarified that `canonical` was the wrong term for the problem and reframed the approach as a publish facade over one runtime.
- Proposed `public | advanced | devtool/internal` shell exposure instead of a second mode architecture.

## User

`Add a shared exposure type, e.g. Exposure = "public" | "advanced" | "internal".` = "audience"?
Plan looks good. Let's go.

## Assistant

- Accepted `audience` as the better name and implemented the first pass:
  - shared audience policy
  - shell/query/persistence wiring
  - settings section audience classification
  - main-menu command bar wiring
