# TODO

2023-03-23

- [x] refactor pixel hitTest to separate function
- [x]  solve the ghost-ships bug,
- [x]  make the x/y orbit adjustment work again
- [ ]  fix right click redrawing arrows which stack when not animated
- [ ]  fix right click not removing arrow when not animated
- [ ]  fix multiple active star states drawn when static
- [ ]  add a ctrl-click function (and button) to remove all star directives
- [ ] disable ability to have bidreictional ship transfers (with selfsame player)
- [ ]  make localStorage work
- [ ]  set up and explore a flow in node-red
- [ ]  set up and explore a flow in totaljs
- [ ] fix phantom ships without stars artifact on reload
- [ ] add a control button to nullify all transfer orders (a ctrl-right click would be a good command)
- [ ] add a keystroke watcher so  I can use keyboard commands
- [ ] add naming and labeling of hex sectors (for debugging, also for future gameplay enhancements)
- [ ] figure out how to make custom console.logs with styling that work across files
- [ ] player should be able to click and drag through multiple stars to set a longer attack/movement path
- [ ] provide ctrl-z "undo" function and store a history of commands (attackMove commands) along with the previous state

--- 
### Longer term possibilities

- [ ] allow single star to attack/transfer to multiple stars. Equal distribution makes the most sense, is easiest; allowing varied distribution would provide a very interesting UI challenge and strategy nuance (see other notes on algorithmic attack-move patterns)
- [ ] allow player to create and save (and name and preview) multiple attackMove patterns to select and activate at one click
- [ ] allow player to develop attackMove algorithms with conditional logic 

### Carried over from first project paxgalaxia

- [ ] generate a hex-grid coordinate system
- [ ] assign stars to one of the coordinates; remove that coordinate from the "emp	tyCoords" array and add to "occupiedCoords" array
- [ ] create a tick-based turn system
- [ ] generate ships movement on tick
- [ ] generate new ships on tick
- [ ] implement star types with different ship generation rates
- [ ] create a tick-rate adjustment option
- [ ] create a save/load game function (at least for map to begin with)
- [ ] implement drag-and-drop star placement for map creation
- [ ] allow to save permanent maps
- [ ] implement drag-vector ship movement between stars
- [ ] implement multiple player identities and zone-of-control background colors
- [ ] implement attack dynamics between stars of opposing players
- [ ] button to reset all destination star IDs for vector arrows
- [ ] option for player to save multiple tactical maps (set of vector assignments for a given map), name them, and switch between them at a click
- [ ] when two stars are attacking each other, draw arrows to meet in middle
- [ ] when two stars are attacking each other, draw arrows at a distance in proportion to star power (num ships)

FlowCode.dev "Decrease demands on working memory, transfer to computer memory. Increase visual intelligence: form, color, space, size - RELATIONSHIPS & CONTEXT."

## General TODO

- [ ] create a small utility for custom console.logs
- [ ] determine correct keybindings/key names for MacOS keyboards

### Gameplay questions
* On a click-and-drag operation, do I want each star to enact the attack-move instructions as soon as next star is activated, or wait until final mouseup and execute all at once?
* if player click is NOT a hit, BUT they do drag over a star and yield a hit, will the previous active star remain (and create an attack-move) OR will the new star become the origin active star?