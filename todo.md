# TODO

2023-03-23

- [x] refactor pixel hitTest to separate function
- [x]  solve the ghost-ships bug,
- [ ]  make the x/y orbit adjustment work again
- [ ] disable ability to have bidreictional ship transfers (with selfsame player)
- [ ]  make localStorage work
- [ ]  set up and explore a flow in node-red
- [ ]  set up and explore a flow in totaljs
- [ ] fix phantom ships without stars artifact on reload
- [ ] add a control button to nullify all transfer orders (a ctrl-right click would be a good command)
- [ ] add a keystroke watcher so  I can use keyboard commands
- [ ] add naming and labeling of hex sectors (for debugging, also for future gameplay enhancements)
- [ ] figure out how to make custom console.logs with styling that work across files

--- 
### Longer term possibilities

- [ ] allow single star to attack/transfer to multiple stars. Equal distribution makes the most sense, is easiest; allowing varied distribution would provide a very interesting UI challenge and strategy nuance

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
