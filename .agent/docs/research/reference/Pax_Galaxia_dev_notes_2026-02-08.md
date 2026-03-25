
# Key notes

It seems that I may need to target the AST, even with early text-based MVP for PRISM-Atlas. I'm getting far too much inconsistency from AI LLM parsing. I need the bidirectional documentation locked-in. I need real isomorphism. Within each project I'll need a filesystem watcher and a utility to parse the AST and update relevant documents and diagrams. 

Combat: Stars have unique properties, most importantly, their Type.
### Star Properties
- Type
- activationRate: 
	- how many newly-captured ships are rendered active vs damaged (0-1 as percentage) (this may be consistent for all star types, making it a non-variable, or it may be varied)
- defensivePosture:
	- determines how many ships are destroyed vs damaged in combat (0-1 as percentage)
- defenseStrength: 
	- determines overall the modifier for combat vs attackerStrength
- repairRate: 
	- the rate at which damaged ships are repaired per tick (used in calculations with by activeCombat flag, which puts a strong damping/slowing effect on repair)
- activeOrders: 
	- this is false if there are no movement or attack orders in place at that moment. If true, check whether target is self or other; if self, that means an active retreat is triggered if conquest occurs, vs. passive defeat or last-stand resistance defeat (had not included this option prior, it is new! That's when you fight back, down to the last ship)
- ships:
	- .total: all ships belonging to that star
	- .active: active ships valid for combat calculations
	- .damaged: damaged ships which need repair

### Star Types
Each star type has equal stats except for their one boosted stat which is doubled (base * 2).
1. GREY: BASIC: grey. No bonuses. All stats @ 1.0
2. YELLOW: production.
3. BLUE: movement. 
4. PURPLE: repair.
5. RED: defense.
6. GREEN: attack.

### AI rules of engagement

- They should tend to reinforce all points around enemies. As they conquer and capture, they may have a large force sitting "in the backwaters" away from frontlines. AI should be smart enough to reinforce front lines, and set movement channels to optimize for current state of play on the map.

### Multiplayer

- A human player should be able to join an existing game as a spectator
- A human should be able to join an existing game that has AI, and take over that AI player. If multiple AI players, the human joining should get to choose which one. If multiple humans joining, they get to choose on a first-come-first-served basis.
- We need a vote option so players can opt to change settings during a game (especially for playspeed), BUT it must be a vote so players cannot issue contradictory orders. 
	- Interim solution: only the host can change settings.

### Future Development

- Ships visuals: damaged ships should group in orbit just like regular ships; but the active ships should "defend" at every aspect that is under attack (or attacking), whether that is one or many aspects. It should appear that active ships are defending damaged ships; and that damaged ships are removed from combat. But as active ships decrease and damaged ships increase, it is visually apparent that defenses are nearing failure. 

## Feature ideas for expansion

- Spend a certain number of ships (either absolute or proportional) to upgrade the star. Size could be a visual indication.
	- Star hybrids - combinations - could be a great added feature! "multi-classing" stars.


[[2026-01-29]] Here is a new and pretty concise summary of the gameplay from Google AI Studio (Gemini 3) [[Pax Galaxia gameplay spec]]

![[Pasted image 20260205114118.png]]


# [[2026-02-08]]

I want the current implementation of animation to remain available indefinitely via a toggle button.
As we develop different animations/visuals, I want to collect different styles that can be applied and engaged with the click of a button/toggle. Create an in-game UI widget for this option.

SPM (single player mode)
- Multi-star attacks are AGAIN calculated wrong! To be clear: the sum of ALL attacking forces on a given tick determines if the star is conquered. The largest attacking force at that tick is the victor. The attacking force for any given player, which includes AI) is the sum of attacking forces from all their stars that are engaged on that target.  
	- Why does this keep breaking? It's happened several times on refactors. Our PRD must be incomplete. Ensure there are CRYSTAL-CLEAR SPECIFICATIONS for EVERY aspects of gameplay and mechanics and UI.
- BUG: when an enemy conquers a star I was also attacking, my attack orders REMAIN targeted at that star. Should be: attack order (and any subsequent chained orders) is cancelled the moment another player conquers my target.
- "Pause" should COMPLETELY pause the game; currently orbits animations continue. Ships should freeze.
- Ships are being animated to travel to target in an attack, this is wrong. We already have a great attack (surge) animation. No ships travel along lanes in an attack. They only travel in movement, conquest, and retreat (any non-attack order; because my ships cannot travel to an enemy star).
- When conquering, there is a ship transfer animation on the *folllwing tick*, this is wrong. The ships should move *immediately **with** the conequest*. The ships transfered in victory move in *as the cause* of the star changing ownership color. 
- Current behavior When conquering, the star:
	- 1. changes color
	-  2. the initial number of ships "blooms" out from the core of the star into orbit, as if they were just produced there
	- 3. following tick, there is a ship transfer animation from the victor star(s). I do not know if this is supposed to represent conquering ships, or just the next movement transfer.
- make the ships adjust their tone as they travel, fading towards white at the middle of travel and back to regular color when reaching orbit
- ...
- I like how damaged ships form a dense ring inside the star core; but large numbers look too similar to small numbers; let's try adding them in overlapping orbits when the initial orbit is full
MPM (multiplayer mode)
- spacebar still does nothing, it needs to control play/pause
- same erroneous victor conditions, not accounting for multiple stars of one player attacking
- Combat logs in-game showing nothing. Empty.
- 

Random map error: 
 - had previous specified that we need a minimum angle and offset between lanes; currently map can render lanes that overlap, making visual distinction for orders very difficult. Gives a bad *feel* to the game. 

General:
- on the slowmo mode I mentioned - another way to check in on combat outcomes would be to initiate a pause state immediately on star capture, and present a pop-up card at that star's location showing all the stats, including destroyed, damaged, retreated, and captured - both for the victory tick, and for the total of that battle
- transfer rate is messed up; might be due to rounding. Some stars are sitting static at 8 ships, at 18 ships, and one hovering between 26-276 ships, all with move orders. All stars should reduce to 1 ship maximum if it has a sustained move order over time. 
- the "transfer rate" variable in UI control is not having effect. Check ALL control panel variables and ensure they are wired up to have the desired effect. 
...

- transferRate slider in UI controls is bound to 5% increments. Remove this limitation.
- variables are 
	- messed up: Conquest Threshold
	- inactive: Aggressor Advantage, Lethality, Damage Per Ship
...

- a lane should never pass under a star, it is visually obscured and changes gameplay perception by player.
- command arrows should not reach target star, but only halfway. Actually the termination point should be adjustable via control panel slider. 
- roadmap: AI should be able to order retreat before losing a star, minimizing losses. This should be a variable feature to make AI easier or harder.
- MP 
	- "restart" button does not work
	- can still draw order arrows to non-connected stars (no apparent effect)
- ...
- Deferred order arrows are obscured behind active orders; overlay the player's deferred orders overtop of any other order that may be beneath it (the enemy has orders going out from that star).
- we need a slider in controls for the variable (does it exist?) of how many of a defeated force's damaged ships are restored upon conquest. Currently it appears to be 100% - at least 100% for the victor. This should not be. Desired behavior: when I conquer a star with many damaged ships, I capture those ships *in their damaged state*. You'll provide a variable which can modify this from 0-100%.
# [[2026-02-07]]

- combat logs should show how many ships captured
- combat logs should have a filter for "you" (own battles)
- combat tuning variables should expose damaged ships defensive value (currently 1/7th by default)
- we need to develop a more comprehensive AI tuning panel. Some AI strategies to implement (or roadmap to implement):
	- Frontline Forces: distributing ships along the frontline - as "dumb" AI it often leaves a large concentration of ships in the backline, sitting idle. This could be a boolean setting to turn this strategy on; or it could be a variable(s), determining 
		- 1. How many of its ships it will allocate to frontline
		- 2. How closely it will match opposing forces
		- 3. another option is "evenly-distributed forces"
		- another option is "backline and pounce" - committing larger forces to battle when someone takes a frontline star
	- tactical choices to surround and capture enemy forces that are a suitable size
	- Star types: star types should be integral in both AI and human strategies. Ai should choose to attack from Greens and defend from Reds and Purples as much as possible.
- custom map editor - is it on roadmap yet? Make an implementation plan with effort estimate, lines of code estimate, number of functions/files touched etc complexity estimate
- Priorities
	- We need ship transfer animations, conquer-scatter animations, and retreat animations.
	- Ensure that every single idea, fix, or roadmap feature I share is documented. Institute a rule officially.
	- overall, continue to EXPAND the client logging. Tell me if there is a way to make it so we can have "levels of logging" which we can turn on or off enmasse - perhaps specific variables/flags in our custom log functions?
	- we need to get this multiplayer LIVE. Search our documents for mention of deployment, Vercel. I've raised the conversation before but don't think I saw the report I asked for. Let's ensure we have an implementation plan to get this demo deployed for alpha testing. Vercel command line makes sense to me. 
- Small bug - after issuing some orders, it takes several clicks on my stars before a star (that is NOT part of that order sequence) to be highlighted.
- ...
- multiplayer:
	- small bug: when dragging for orders from an owned star, we carry a "cancel" icon and drag orders are not applied until mouseup. Instead, every star a drag passes over should be issues a movement command (which *is* attack if that is non-self owned). Mouseup ends the drag chain, but orders are applied based on mouseover throughout the drag. 
	- combat logs not showing any. 
	- combat effect has changed dramatically for the worse. You changed something that needs to be undone. Control panel variables do not seem to be having effect. 
	- spacebar doesn't play/pause 
- singleplayer combat logs in UI: 
	- need to know how many ships are active and how many damaged each tick, in the logs.
	- the combat resolves on the map, I take possession of the star, but the combat logs don't update the final values until next tick. Updating combat logs should be concurrent with the action.
- Thoughts: 
	- if spacebar is not playing/pausing in multiplayer, we have some part of the game controls mismatched. For now they should be isomorphic - the same between both client/local and server/multi.
- ...
- small CSS issues with battle logs makes conclusions unreadable; not enough scroll area, bottom won't scroll into view. 
	- issue with data: showed correct sum of two attacking star until turn of conquest; then it only showed attacking ships of one of my stars, and showed 53 attacking and 59 captured. So the numbers were off.
- animations - n


# [[2026-02-05]]

- I had two players in a multiplayer game; had not yet unpaused to start play; and after several minutes when I came back to start play, the gameroom had been destroyed (not visibly, just on the server as reflected in the console logs). What is the standard timeout? I think if players are in the lobby, the lobby should remain in existence. Please figure out what is happening here.
- Attacks are STILL adding ships not inflicting damage
- ...
- Attacks now inflict damage, but far too little. It seems that "Aggressor Advantage" may not be applied.
	- For combat: we had a good system working before adding multiplayer. You need to review the code at that state and replicate the combat mechanics.
- Drag function degraded: you changed it at some point, cannot chain commands through stars. Click command function not working at all.
- cancel orders not working at all.
- when attacking a star and another player conquers it, that should void my attack orders to that star, but it currently does not.
- Player can issue orders to any star, disregarding connections.
- Not sure what this means yet, will have to look at it. Each attacker should take damage based on the combat formula, proportional to their specific number of ships and star type. Note: in future I'll want another variable to modify attacker strength when they are themselves under attack.

# [[2026-02-04]]
- movement orders should persist after conquest. Actually, use should have choices:
	- global default behavior: [ x ] Movement orders continue through star conquest
	- per-order control: a control key `ctrl-click` will cause orders to cease after conquest
	- this must also apply to orders queued *from* the newly conquered star
- note: we'll need a "scatter" animation (works the same for retreat) in addition to normal ship movement animations, as with scatter and retreat, a bunch of ships are moved at once.
- need a hotkey for pause/play: `spacebar`
- currently not possible to cancel orders extending from enemy stars, we need this
- click orders are not applying from enemy stars, they should (rather than only drag). Note: when implementing orders-related development, it's essential that we have both click-to-order and drag-to-order implemented at once.
- game should start in paused state, with a large button "START" along the top of the control widget, which disappears once activated.
- we need a way to limit the accumulation of ships visually in the game. We'll need to cap the orbit layers at 10, for now. After that cap, start adding ships again from the lowest layer, but with a noticeable white tint to indicate they now represent 2X ships `one dot = 2 ships`. If the orbit cap is reached again, start again with a whiter tone at `one dot = 4 ships`
- When StarA is victorious over StarB, there should be a movement link established/retained (the attack vector/order becomes a movement vector/order) by default. 
	- establish a control toggle in the in-game UI for this. Also put it into the pre-game Settings Menu.
- "Start" text in button is black on black. Always note contrast for text in UI elements. Add this note to design guidelines document.
- There is a bug where star connections can overlap due to them being in the same position and angle. This must be checked for and changed.
- There is a bug for orders from enemy stars: they are not getting checked for contradictory orders. So when conquest occurs, I can now have StarA <-> StarB. This should be impossible. As with self-owned stars, most recent orders must overwrite previous orders.
- critical gameplay bug: massed forces (multiple attackers) are not winning a competitive battle. Eg. 
	- Target star: B (200 ships)
	- Attackers:
		- Red_star12 200
		- Green_star33 150
		- Green_star55 150
	- Red wins. Green should win.
- We need a control slider for percentage of ships moved in regular move orders
- Add to Commanders Panel (game overview) current total production per player. Keep on same line. Also show active/damaged ships.`
- for increased ship density visuals: it goes to pure white too quickly, we need more distinction. Hue shift? Outlines? Center dots? Shapes? Give me a few in-game controls to explore different effects.
- ROADMAP: 
	- Multiple targets: we need the ability to issue branching orders: stars can move or attack to multiple targets.
	- Conditional orders: we should be able to set certain conditions, liker "once this star is conquered, this other star issues this order"
	- Strategic patterns: we should be able to select algorithms (perhaps user-defined in pseudocode or symbolic/logical language?) to select for some automatic behaviors. These should probably be fairly limited, like "concentrate all forces to frontlines"
- make star label much more visible so I can easily identify stars.
- for random map layouts, similar to the overlapping paths issue, sometimes the paths/connections are simply too close. Let's implement and angle check and institute a minimum-angle-difference value slider in pre-game, so I can evaluate what the right default value should be. 
	- The way it works is that you check the angles; if < min_angle, that star is moved to another hex origin - moved intelligently in the right direction to increase the angle. Then angle check again, etc.
- within the combat logs, you are still showing floating-point number of ships - there should be no decimals! Ships are ALWAYS whole numbers, and calculations on ships must always round up or down! )
- Endgame screen (with charts) should be much larger by default, taking up most of the screen. The charts should be much more visible. The tabs up top should be visually more noticeable.
- Single player game still works fine, but multiplayer is still increasing ships with attack. The players were identified separately and individual player control does work! Commit for sure. And push. It's a night.  
  
But still to fix next session: attacks are having paradoxical results (increasing ships on both sides).  
  
Simply acknowledge for now, so I can pick up immediately tomorrow.


# [[2026-02-03]]

### Bugs

- [[2026-02-03]] 
	- Pause button appears as "play" button icon both at start of game, and when paused.
	- "Stars" panel obscures gameplay. Ensure map/gameplay area is scaled to CSS Grid gameboard area. Have a listener for resize specifically on that element, not the entire body or window.
	- Conquest is not factoring in multiple sources of attack. 
	- ...
	- gameboard still obscured by Stars UI. 
	- Gameboard does NOT respond responsively to browser zoom or resize (but you DID implement a log function for this listener, good job, that is correct!)
	- Pause button still shows "play" button when paused - it should not, as there is a "play" button right next to it, and the active mode already has a bg highlight to indicate which is active. Pause button should always have pause icon.
	- MAJOR BUG: the resizing work seems to have broken control; I cannot click on a star, I cannot play.
	- ...
	- When game ends, it now presents an empty black screen. We need the "Game Over" screen back. Also note, I've previously asked for a graph showing power over time in the Game Over screen; what is the status of this? Does it exist in the roadmap or PRD anywhere?
	- ...
	- Some attack/move order arrows are still getting "stuck" on screen, remaining in place even after their orders are clearly fulfilled or cancelled. I can see this also due to stars sometimes having two order vectors originating from them, which is supposed to be constrained impossible.
	- SURRENDER button inactive, needs to generate Game Over screen with charts included to that point. Option from there to Restart (with current settings) or return to main menu.
	- ...
	- Click to command is not working; drag-through does work for commands, but I should also be able to click from a selected star to an adjacent star to issue that (move or attack) command.
	- SCATTER is not working; stars are always 100% captured. Please dialogue before working: describe precisely how this feature should work (should be in source documents somewhere)
	- .
	- Greater attacking force (from multiple stars of same player) still does not seem to apply. A single star won the conquest vs. my two stars.
	- Playspeed/pause buttons not highlighted when selected; only the default play 1x button is highlighted. functions work but UI not showing it (this note was prior your last work)
	- Game is starting paused now (new thing) and play controls no longer work (this happened after your most recent changes)
	- player should be able to set deferred orders when attacking an enemy star that go *through* or beyond it; such that when it is captured, subsequent attacks or move orders are enacted immediately.
	- When UI is resized (eg devtools panel) it squishes gameboard!
	- .
	- Variables in control panel are not showing any changes when sliders are used. 
	- Variabes in control panel should save and load from localStorage
	- Commanders: total ship numbers are not updating realtime, not correct.
	- AI: we need some variables to adjust AI behavior.
		- 1. Most basic: attack threshold: at what ratio of power will it initiate attack?
		- 2. Random Aggression: likelihood on a given turn it will make a random attack
		- 3. Attack desist threshold: at what ratio does it stop attacking?
		- 4. Tactical aggression: when it might attack, in order to tempt other players into attacking the same target by reducing its numbers
	- In either/both(?) console logs and UI combat logs: I need to see number of ships damaged, destroyed, and/or captured in any engagement (each tick)

### Improvements
- [[2026-02-03]]
	- UI overall, especially Stars panel: fonts too small, too much empty space, too linear. This is supposed to be visual intelligence, not just meeting a standard of "does it display the correct information"; but rather, "does it make the right information perfectly intuitive to understand, and is it super-easy to read, and is it very thoughtfully organized, and is the comprehensible amount of data maximized?"
	- Gameboard DOES now resize to area, good! But it has too much padding, and resolution is scaling down in sync. It does not remain crisply-rendered. Also, the size of elements should have some degree of responsiveness also - not to extreme sizes, but for a case of scaling up or down x 3.
	- Default settings
		- Aggressor Adv: 0.8
		- Ship dmg: 0.1
		- Lethality: 0.25
		- Force Ratio: 0
		- Conquest: 8
		- Transfer: 50%
	- Improved, thanks. More to do.  
	- Combat Tuning should not have a dropdown function. The contents of that panel should be IN the right sidebar column. It fits. No need to have a compressed UI with scroll.  Combat log: poor use of space. Fonts are improved.  
		- Usings visual pseudocode:
			- `P${player number}`(in a circle of player's color) `: ${numShips} attacking P${defender player number}`(in a circle of that player's color) `: ${numShips}`: `${icon.destroyed}: ${ships.destroyed} | ${icon.damaged}: ${ships.damaged}`
	- Combat Logs still does not drawer-up to full height of page and it should. Also it should not scroll with every attack, instead, each battle is a card within the logs, that has its own inner drawer effect - if I click a specific battle card, it expands with a scrollable full log of the battle.
	- stars max out at 30. Remove limit.
	- multi-star attacks are not evaluated for conquest conditions - a single star with less than two stars combined, attacking the same star, won the conquest. This is wrong; the largest total attacking force should win.
	- Combat Log vertical drawer must extend to max/full height of page/game. Gameboard will have to be adjusted so it is not obscured. Make this a responsive, realtime adjustment. Actually, make the  Combat Log a left drawer, that expands from the leftmost, compressing the gameboard, which responds responsively (maintaining interactivity and same crisp resolution.)
	- ...
	- We need more map variety now; ensure some percentage of links are single or double linked. Ensure there is a max as well, let's try 6. Expose these settings in pre-game settings - you'll need to create the UI element/menu/view.
	- The attack animations for ships is passable to now, but needs a key improvement: as it is, the orbiting ring of ships moves as one towards the target. As it should be, ships will not move any closer to their origin planet - in other words, the back part of the orbiting ships should not move, should not cross the planetary valence. The front arc of ships should pulse incrementally by their position relative to the direct vector connecting the stars. Thus, it would pulse in an egg/distorted ellipsis shape. The result of this change should be subtle and small in magnitude, but produce a much more elegant and clean visual effect.
	- change main menu stars-per-player slider to limits 1-20
	- add "tick length" variable to control panel
	- ...
	- eliminate the individual stars status from right column. Settings/control panel to fill remaining space.

----


- 
- 
- Run the same calculation on all engaged forces each tick:
	- runDamageAssessment = isForceFighting ? true : false
		- forEach star that is attacking target, attackingForce += star.force.active
		- defendingForce = targetStar.force
		- combatRatio = attackingForce / defendingForce
		- smallerForce = Math.min(attackingForce, defendingForce)
		- largerForce = Math.max(attackingForce, defendingForce)
		- largerFleet = my.fleetSize > enemy.fleetSize ? true : false
		- shipsDamaged = largerFleet ? combatModifier * smallerForce : combatModifier * largerForce
		- shipsDestroyed = Star.defensivePosture * (largerFleet ? enemy.fleetSize : my.fleetSize)
		- defendersRetreating or not? modifies survivors and capture.
			- if there are escape routes and a player orders an active retreat; if that order is active on the tick of capture, they preserve ownership of many more ships. 
			- if a player does not order a retreat, but there are escape routes, they lose more ships but not all
			- if a player has no escape routes, capture is total
			- captureRate = defendersRetreating ? 0.35 : 0.7
		- starCaptured = combatRatio >= 7 ? true : false
			- if captured, victor = player with largest force attacking
			- conqueredStar.owner = victor.id
			- shipsCaptured = defendingForce.total * captureRate
			- shipsCapturedActive = defendingForce.active * captureRate
			- shipsCapturedDamaged = defendingForce.damaged * captureRate
			- newlyRepairedShips = shipsCapturedDamaged * star.activationRate
			- conqueredStar.force.damaged += shipsCapturedDamaged - newlyRepairedShips
			- conqueredStar.force.active += shipsCapturedActive + newlyRepairedShips
			- for each attacking star belonging to the victor:
				- normalTransferAmount = star.force.active * star.transferRate
				- conquestTransferAmount = normalTransferAmount * conquestTransferModifier
				- shipsToTransfer = conquestTransferAmount <= 1 ? conquestTransferAmount : normalTransferAmount

# [[2026-01-31]]

This entire section represents a misunderstanding. There is no "ship state". This is 100% pure added confusion. @03_EVENT_MATRIX.md#L74

Let's work on planning now. Planning mode, markdown file creation/edits only.  
- I want the "metronome" to be changed to a pulsing orb, soft and gentle.  
- current game is not doing well with star layout and connections. You must completely and thoroughly review and comprehend @../../PRISM-Atlas-DART v1/pax-fluxia-reference implementation, and conduct a major restructure to use what worked from my previous demo. NOTE: still just planning mode! This item deserves a separate planning file.  
- ensure that all docs in @../../PRISM-Atlas-DART v1/.atlas are fully updated. I note that @02_IO_REGISTRY.md is only partially updated with live links.

- found a bug: when the game ends
	1. the "game over" (win/lose) screen disappeared, we previously had one
	2. the game continues running - console logs continue piling up even though we're in between games
1. carry over the tweakpane/debugging features where I can toggle to see underlying hex grid
2. layout is degraded in that stars are hidden behind UI elements. You must be strict about what part of the visible viewport is gameboard
3. your "orb" is a box, and it is a janky animation. I want butter-smooth pulsing. 
4. The creation and addition of ships to orbit is visually disjointed and disruptive. Despite the tick-based nature of the game, every action and effect should still be smooth, with animation/transition, and no disconnected/disjointed states.
5. We need ship travel animations now, it's essential for human visual comprehension of what's happening
6. Stars should have a permanent field for both active and damaged ships. If no damaged ships, keep a zero there
7. I want the action arrows in the UI to match the SVG arrows I used in the reference demo
8. ships spawning animation is disjointed by its nature, so you need a different approach. As it is you are calculating the new number of ships per orbit and simply instantaneously moving them all. But instead they must be transitioned. The new ship should arise from the star and enter orbit smoothly. Fellow ships should gracefully transition to allow room. They can bump up against each other or it could be mathematically perfect spacing. The original game clearly put a lot of effort into this detail; ships crowded and collected in very organic kind of way. To implement this correctly you may need to refactor from ground zero/first principles the way you handle ships.
9. ensure tweakpane settings are reactive and effective. I note that 
	1. hex grid does NOT display
	2. production variable has no effect
10. Ship repair seems to not function. Ensure it does.
11. Previously I'd specified tracking ships and stars per player at intervals in order to create an end-game power graph. This was put in a plan but never implemented. 
12. Click A > click B does not work anymore for self-owned stars. It works for attack, not move order. Also click target seems a bit small, enlarge so I get active on first click. 
13. We need ship movement animations now. Ships must retain contiguous, smooth transitions from one star to the next. The entire travel must occur between ticks, whatever number of ships are meant to travel that turn (remember, there is NO "in-between stars" state)
14. Your last updates removed ship damage. No ships are getting damaged in attacks, only removed entirely. Both sides of a conflict need ships damaged. 
15. defense is messed up; I appear to be doing no damage to a star
16. AI is not doing anything now, zero attacks. Fix it.
	1. AI should ALWAYS attack (at least at default difficulty level) when a valid target has 1/2 or less the ships
17. Click target for stars is too small. Enlarge so it's easier to click - the boundary should be beyond the star radius, include 5 orbit levels (just use a distance, perhaps 2x radius) 
18. Controls are messed up. rt-click is supposed to cancel orders, but it created a move order.
	1. stars of same player can be transferring in opposite directions; this should be impossible. The most recent move command wins.
19. One of your recent edits changed command behavior; there is a delay between issuing command click and seeing the resultant vector. commands should be applied immediately.
20. Click target seems unchanged. still small, less than star size.
21. You claimed "- **Fleet Animations**: Ships are now visible moving between stars during transfers!
- **Damaged Ships**: Visual indication of damaged ships in orbit."
	- this is false. No ship travel is shown. And no damaged ships are indicated either in number or visual. 
	- Also, pane variables for defense mult and damage % appear to do nothing. I suppose conquer ratio the same. 

1. game mechanics update (update documentation!): 
	1. damaged ships are never destroyed in combat; they are out of combat after being damaged, and will either repair, be captured and repair, or be destroyed as a portion of the attrition upon loss (star is conquered)
	2. enemy AI should cease attacking when they go below 1:1 power ratio (total of all attacking stars on that target)
2. new bugs this turn:
	1. tweakpane "stars per player" variable was working but now is not
	2. there is no visible command result, no move or attack arrows
3. unresolved
	1. still no attack or ship transfer visuals
	2. click radius still small, identical. show me where the code is that touches this function
4. add: 
	1. select stars per player in main menu before game, and select number of ships per star to begin with

Big job for you: update functional stories and all Atlas docs to match.

# [[2026-01-30]]
This comment 
> "Resolve combat where multiple fleets arrive at a star simultaneously" 

reveals a stubborn misunderstanding. There is NO TRAVEL. Combat, and everything, occurs ON THE TICK. The visuals are synchronized TO THE TICK, and have smooth easing into and out of the tick moment. 

What is this? 
> "* 1. Largest Force Wins: The faction with the most total ships (Defenders + Arriving) wins."

What does that even mean? Do you think it is unambiguous, or ambiguous? P1 starA is defending with X ships. Let's say x = 100. P2 starB attacks with 120. P3 starC and starD attack with 50 and 100 respectively. starA attrition is calculated from all attacks simultaneously: (120+50+100) against 100. When he is defeated (as he will be with 270:100) the larger attacking force conquers: P3 in this case.

...

> This brings up the question of the attackers, and how the "50% occupy, 50% remain" stipulation fits with "instant travel" flow dynamics. I think it means the other 50% will return to the source star. It seems to align with a bi-directional "flow" model.

>do attackers remain at the target, return to the source, or what? The new phrasing ("1,000 damaged ships and 1 active") suggests a siege scenario, but I need to integrate with the "instant travel" flow. It appears fleets remain at the target _damaged_, which impacts both stars. This, and repair impedence, requires integration.

What the hell does this even mean??? 
Let me clarify further: I need you to COMPLETELY ABANDON YOUR MENTAL MODEL so that you can understand and integrate THE CORRECT ONE.

You are obsessively fixated on travel and places "between" stars. THERE IS NOTHING BETWEEN STARS, mechanically. Only in presentation. Combat is CALCULATED and then represented between stars. Nothing more. It is a numbers game with graphics attached.
> It appears fleets remain at the target _damaged_

This statement literally does not make sense. There is no "fleet" "at" the target. One star attacks another. Everything is calculated on the tick: movement, production, attrition damage, attrition destruction, victory conditions. An attacking force is split 50/50 between its originating star and the newly-conquered star, on the tick that victory is determined. 

Again you demonstrate a fundamental mental model error:
> I am now focusing on what happens to the attacker if they fail to capture, specifically the implications of the "1,000 damaged ships" remark. It appears the damaged ships _return to the Source_, but this doesn't fully make sense. If they become damaged at the destination, they would logically belong to the defender. I need to consider where those ships are and how they affect the source.

This exemplifies your error. There ARE NO ATTACKING SHIPS ***AT*** a "destination". They are *attacking* the target so to speak; but for our calculations, the Star1 is attacking Star2 with each having available forces. Stop trying to couch thes game mechanics in ANY concrete or familiar or game-related terms. These are not complicated ideas AT ALL, it is just that you refuse to process them as they are, instead constantly mutating and assuming without a single question to me to clarify. 

In your latest response directly:
>### 4. **Return Logic**
> - **Victory**: 50% of survivors occupy the new star (Active). The remaining 50% are added to the star's pool (effectively preserving them).
> - **Defeat**: Survivors of a failed attack are returned to their source star as **Damaged Ships**, impeded by the repair penalty.

I hope by now you could correct this yourself: there *is no failed attack*. Not that you/our code needs to create or engage with. That is a player decision only. 
Who are these "survivors" you keep talking about? I never specified this. Clarify your language. Define your terms. Quit your assumptions.
"added to the star's pool" did you fail English? An ambiguous reference which could mean either the attacker or defender. You MUST use only DISAMBIGUATED language. 

...

- You must log total ship numbers, plus the fractions of total & per-turn damaged and destroyed.
- Combat is still bugged. Largest force is not winning.

...

- retreat order makes a difference vs passive loss. More ships are captured if the loser fails to retreat.

# V2 # Product Requirements Document (PRD): Pax Fluxia (MVP)

## 1. Executive Summary

**Pax Fluxia** is a high-fidelity web remake of the 2007 indie strategy game Pax Galaxia. It is a realtime, tick-based strategy game focused on territory control, flow management, and attrition.

**Core Value Proposition:** A hypnotic, rhythmic strategy experience where military force is a fluid mechanic.  
**Platform:** Web Browser (Desktop).  
**Target:** Multiplayer focus (2-8 players).


## 2. Gameplay

### 1. Visual Specification: The "Orbit & Surge" System

**1.1. Ship Representation**

- **Scale:** All ships are rendered as small dots of identical radius.
    
- **Active Ships:** Rendered as **Solid Dots** (Filled) in the owner's color.
    
- **Damaged Ships:** Rendered as **Hollow Rings** (Outlines) in the owner's color.
    
- **Visibility:** All ships (Active and Damaged) are always visible.
    

**1.2. Ship Behaviors (The Animation State)**

- **State: Idle / Defending**
    
    - Both Active (Solid) and Damaged (Hollow) ships **orbit** their host Star in a chaotic or circular swarm. They remain tight to the Star's radius.
        
- **State: Attacking (The Surge)**
    
    - **Damaged Ships:** Remain in orbit (they do not move).
        
    - **Active Ships:**
        
        - They do not "travel" across the screen in independent linear paths.
            
        - Instead, on the **Tick**, the Active ships participating in the attack **surge** outward from the Source Star toward the Target Star.
            
        - **The Pulse:** This creates a rhythmic, piston-like animation.
            
            - Tick Start: Active dots expand/stretch toward the enemy.
                
            - Tick End: The force is calculated instantly. Survivors/Remainders snap back or retract slightly before the next pulse.
                
        - **Amplitude:** The distance and density of the "Surge" cloud visually represent the strength of the attack relative to the defense.
            

### 2. Input & Control Specification

**2.1. Issuing Orders (Overwriting)**

- **Action:** Left-Click Drag from Source to Target.
    
- **Logic:** This establishes a **Flow Link**.
    
- **Overwrite Rule:** If a Star already has an active Flow Link to Target A, and the player orders it to Target B, the link to A is instantly severed and replaced by the link to B. A star can only output to one target at a time.
    

**2.2. Cancellation**

- **Action:** Right-Click on a specific Star.
    
- **Logic:** Instantly cancels the outgoing Flow Link from that star. The star enters "Idle/Defending" mode (ships return to orbit).
    

### 3. Network Architecture & Feasibility

**3.1. Tick Rate Analysis**

- **Base Rhythm:** 80 BPM = 0.75 seconds (750ms) per tick.
    
- **Max Speed (10x):** 10X speed = 0.075 seconds (75ms) per tick (approx. 13.3 Hz).
    

**3.2. Technical Confirmation**

- **Feasibility:** **Yes, this is trivial for modern web technology.**
    
    - 75ms (13.3 Hz) is well within the "safe zone" for WebSocket communication (Socket.io or raw WebSockets).
        
    - Standard real-time multiplayer games often run at 20Hz, 30Hz, or 60Hz. Running at ~13Hz max is extremely lightweight.
        
- **Implementation Strategy:**
    
    - **Server:** Authoritative Loop. Calculates Production -> Flow -> Combat -> Repair every 750ms (or 75ms). Broadcasts the "Snapshot" of ship counts and ownership to all clients.
        
    - **Client:** Interpolation. The client receives the snapshot and plays the "Surge" animation to fill the time between ticks. This ensures the game feels rhythmic and smooth (the "Pulse") rather than choppy, even at slow speeds.
        

### 4. Gameplay Loop Corrections

**4.1. Win Condition**

- **Goal:** Full Conquest (Eliminate all opposing colors).
    
- **Stalemate Resolution:** (Deferred to Roadmap).
    

**4.2. Initial State**

- **Map Gen:** All stars are owned by players or AI at start.
    
- **No Neutrals:** Default mode has 0 Neutral stars. (Neutrals moved to Roadmap/Settings).
    

**4.3. Damaged Ship Feedback**

- **Visual Feedback:** The ratio of **Hollow Rings** vs **Solid Dots** orbiting a star provides immediate, intuitive read on the Damaged pool size. No secondary UI bars are required; the density of the outlines tells the story.
    

---

This specification now accurately reflects the **Rhythmic/Pulsing** nature of the game, rather than a standard "streaming unit" RTS. The distinction between the Orbiting damaged ships and Surging active ships is the key visual driver of the game's "Flow."

---

## UI/UX Specification: Pax Fluxia

### 1. Design System
*   **Theme:** "Cyber-Flux". Dark void backgrounds, neon accent borders, glassmorphism panels (blurred backgrounds).
*   **Typography:**
    *   *Headings:* futuristic wide sans-serif (e.g., *Orbitron* or *Exo 2*).
    *   *Data/Numbers:* Strict Monospace (e.g., *JetBrains Mono* or *Roboto Mono*) to prevent jitter when numbers change rapidly.
*   **Color Palette:**
    *   **UI Backgrounds:** `#0a0a12` (Deep Void) with 80% Opacity.
    *   **Interactive Elements:** `#00ffff` (Cyan) for hover states.
    *   **Text:** `#ffffff` (White) and `#8888aa` (Muted).

### 2. Screen 1: The Main Menu (Lobby)
*   **Layout:** Centered "Command Console" card.
*   **Elements:**
    1.  **Title Header:** "PAX FLUXIA" (Large, glowing).
    2.  **Game Setup Panel:**
        *   **Map Selector:** Dropdown [ "Empire (Standard)", "Random Cluster (TODO)" ].
        *   **Player Count:** Segmented Control [ 2 | 3 | 4 | 5 | 6 ].
        *   **Difficulty:** Segmented Control [ Easy | Normal | Hard | Expert ] (Console log only for MVP).
    3.  **Action Buttons:**
        *   `[ START GAME ]` (Primary, Large, Pulsing).
        *   `[ MULTIPLAYER ]` (Secondary, console.log "Connecting to lobby...").
        *   `[ MAP EDITOR ]` (Tertiary, console.log "Opening Editor...").
        *   `[ SETTINGS ]` (Icon, console.log "Audio/Video Settings").

### 3. Screen 2: The In-Game HUD
*   **Layering:** Svelte HTML overlay **on top** of the PixiJS Canvas.
*   **Top-Left (Telemetry):**
    *   **Tick Metronome:** A small horizontal bar that fills from 0% to 100% every tick (750ms). Visualizes the "Heartbeat" of the server.
    *   **FPS Counter:** Small, muted text.
*   **Top-Right (Leaderboard):**
    *   Vertical list of players.
    *   Format: `[Color Dot] PlayerName: [Total Ships] / [Star Count]`.
    *   *Note: Use Svelte Runes to reactively update this every tick.*
*   **Bottom-Left (Command Deck):**
    *   **Speed Controls:** Row of Toggle Buttons `[ || ] [ > ] [ >> ] [ >>> ]`.
        *   Logic: Pause, 1x (80 BPM), 2x (160 BPM), 4x (320 BPM).
    *   **System:** `[ RESTART ]` `[ SURRENDER ]`.
*   **Center-Screen (Notifications):**
    *   Toast messages: "Red Player Eliminated", "Speed Bonus Acquired".

### 4. Screen 3: Game Over (Modal)
*   **Trigger:** When `Engine.winner` is set.
*   **Layout:** Full-screen backdrop blur. Central Modal.
*   **Elements:**
    *   **Header:** "VICTORY" (Green) or "DEFEAT" (Red).
    *   **Stats:** "Time Elapsed: 3:45", "Peak Fleet Size: 1,204".
    *   **Actions:**
        *   `[ PLAY AGAIN ]` (Restarts Engine with same settings).
        *   `[ MAIN MENU ]` (Destroys Engine, returns to Screen 1).

---

## Revised Atomic Development Tasks (Visual-First)

This roadmap builds the UI *shell* first, then injects the game into it.

### **Phase 1: The Scaffold & UI Shell**
*   **Goal:** A working Svelte 5 app with navigation between Menu, Game, and Result screens. No Pixi/Engine yet.
*   **Commands:**
    ```bash
    bun create tauri-app pax-fluxia -- --template svelte-ts
    cd pax-fluxia
    bun add pixi.js @pixi/ui
    bun install
    ```
*   **Task:**
    1.  Create a global state manager `gameStore.svelte.ts` using runes (`currentView = 'menu' | 'game' | 'results'`).
    2.  Create `MainMenu.svelte`, `GameHUD.svelte`, and `ResultsModal.svelte` with the buttons defined above.
    3.  Wire the buttons to switch `currentView`.
    4.  Add the CSS for the "Cyber-Flux" theme.

### **Phase 2: The "Ghost" Engine & Tick Loop**
*   **Goal:** The HUD numbers move, but there is no graphical game board.
*   **Task:**
    1.  Create `GameEngine.ts`.
    2.  Implement the `tick()` loop.
    3.  Expose `engine.state` (Svelte Rune).
    4.  Connect the **Tick Metronome** in the HUD to the engine's timer.
    5.  Connect **Speed Controls** to the engine's interval duration.
    *   *Success Criteria:* You press "Start", the HUD appears, the Metronome pulses. You press ">>", the Metronome pulses faster.

### **Phase 3: PixiJS Integration (The View)**
*   **Goal:** The Game Board appears behind the HUD.
*   **Task:**
    1.  Create `GameView.svelte`. Initialize `PIXI.Application`.
    2.  Implement `resize` handler to keep Canvas full screen.
    3.  Draw static mock data (e.g., 5 random circles for Stars) just to prove the rendering pipeline works.
    4.  Ensure click events pass through the transparent parts of the HUD to the Canvas.

### **Phase 4: Gameplay Logic (The Guts)**
*   **Goal:** The Stars become real entities with logic.
*   **Task:**
    1.  Implement `Star` class and `Production` logic in `GameEngine`.
    2.  Update Pixi render loop to read `engine.stars` and draw them at correct X/Y.
    3.  Implement the **Surge Animation** in Pixi (interpolating ship counts).
    *   *Success Criteria:* You see stars generating numbers. The numbers go up.

### **Phase 5: Interaction & Flow**
*   **Goal:** Playable Loop.
*   **Task:**
    1.  Implement Raycasting in Pixi (Mouse over Star).
    2.  Implement Drag-and-Drop to create Links.
    3.  Implement the **Flow Logic** in Engine (transferring numbers).
    4.  Implement **Combat/Capture** logic.

### **Phase 6: Win State & Polish**
*   **Goal:** Closing the loop.
*   **Task:**
    1.  Detect `ActiveStars == 0` for a player.
    2.  Trigger `gameStore.currentView = 'results'`.
    3.  Pass stats to the Results Modal.



# V1


Based on your corrections and the instruction to analyze the specific visual behaviors, here is the corrected specification for the Visuals, Controls, and Network Architecture.

### 1. Visual Specification: The "Orbit & Surge" System

**1.1. Ship Representation**
*   **Scale:** All ships are rendered as small dots of identical radius.
*   **Active Ships:** Rendered as **Solid Dots** (Filled) in the owner's color.
*   **Damaged Ships:** Rendered as **Hollow Rings** (Outlines) in the owner's color.
*   **Visibility:** All ships (Active and Damaged) are always visible.

**1.2. Ship Behaviors (The Animation State)**
*   **State: Idle / Defending**
    *   Both Active (Solid) and Damaged (Hollow) ships **orbit** their host Star in a chaotic or circular swarm. They remain tight to the Star's radius.
*   **State: Attacking (The Surge)**
    *   **Damaged Ships:** Remain in orbit (they do not move).
    *   **Active Ships:**
        *   They do not "travel" across the screen in independent linear paths.
        *   Instead, on the **Tick**, the Active ships participating in the attack **surge** outward from the Source Star toward the Target Star.
        *   **The Pulse:** This creates a rhythmic, piston-like animation.
            *   *Tick Start:* Active dots expand/stretch toward the enemy.
            *   *Tick End:* The force is calculated instantly. Survivors/Remainders snap back or retract slightly before the next pulse.
        *   **Amplitude:** The distance and density of the "Surge" cloud visually represent the strength of the attack relative to the defense.

### 2. Input & Control Specification

**2.1. Issuing Orders (Overwriting)**
*   **Action:** Left-Click Drag from Source to Target.
*   **Logic:** This establishes a **Flow Link**.
*   **Overwrite Rule:** If a Star already has an active Flow Link to Target A, and the player orders it to Target B, the link to A is instantly severed and replaced by the link to B. A star can only output to one target at a time.

**2.2. Cancellation**
*   **Action:** Right-Click on a specific Star.
*   **Logic:** Instantly cancels the outgoing Flow Link from that star. The star enters "Idle/Defending" mode (ships return to orbit).

### 3. Network Architecture & Feasibility

**3.1. Tick Rate Analysis**
*   **Base Rhythm:** 80 BPM $\approx$ 0.75 seconds (750ms) per tick.
*   **Max Speed (10x):** $\approx$ 0.075 seconds (75ms) per tick (approx. 13.3 Hz).

**3.2. Technical Confirmation**
*   **Feasibility:** **Yes, this is trivial for modern web technology.**
    *   75ms (13.3 Hz) is well within the "safe zone" for WebSocket communication (Socket.io or raw WebSockets).
    *   Standard real-time multiplayer games often run at 20Hz, 30Hz, or 60Hz. Running at ~13Hz max is extremely lightweight.
*   **Implementation Strategy:**
    *   **Server:** Authoritative Loop. Calculates `Production -> Flow -> Combat -> Repair` every 750ms (or 75ms). Broadcasts the "Snapshot" of ship counts and ownership to all clients.
    *   **Client:** Interpolation. The client receives the snapshot and plays the "Surge" animation to fill the time *between* ticks. This ensures the game feels rhythmic and smooth (the "Pulse") rather than choppy, even at slow speeds.

### 4. Gameplay Loop Corrections

**4.1. Win Condition**
*   **Goal:** Full Conquest (Eliminate all opposing colors).
*   **Stalemate Resolution:** (Deferred to Roadmap).

**4.2. Initial State**
*   **Map Gen:** All stars are owned by players or AI at start.
*   **No Neutrals:** Default mode has 0 Neutral stars. (Neutrals moved to Roadmap/Settings).

**4.3. Damaged Ship Feedback**
*   **Visual Feedback:** The ratio of **Hollow Rings** vs **Solid Dots** orbiting a star provides immediate, intuitive read on the `Damaged` pool size. No secondary UI bars are required; the density of the outlines tells the story.

---

This specification now accurately reflects the **Rhythmic/Pulsing** nature of the game, rather than a standard "streaming unit" RTS. The distinction between the *Orbiting* damaged ships and *Surging* active ships is the key visual driver of the game's "Flow."


