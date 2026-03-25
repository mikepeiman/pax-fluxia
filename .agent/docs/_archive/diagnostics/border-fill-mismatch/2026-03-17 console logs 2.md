builtinMaps.ts:61 [BuiltinMaps] Loaded 8 built-in maps
gameStore.svelte.ts:757 [MAP] Merged 8 built-in map(s) from /maps/
tick.wav:1  GET http://localhost:1420/sounds/tick/tick.wav 503 (Service Unavailable)
client.js:3209 Avoid using `history.pushState(...)` and `history.replaceState(...)` as these will conflict with SvelteKit's router. Use the `pushState` and `replaceState` imports from `$app/navigation` instead.
warn @ client.js:3209
warn @ client.js:95
history.replaceState @ client.js:108
GameContainer @ GameContainer.svelte:260
(anonymous) @ hmr.js:50
update_reaction @ runtime.js:255
update_effect @ runtime.js:454
create_effect @ effects.js:124
branch @ effects.js:419
(anonymous) @ hmr.js:41
update_reaction @ runtime.js:255
update_effect @ runtime.js:454
create_effect @ effects.js:124
block @ effects.js:396
wrapper @ hmr.js:30
$.add_svelte_meta.componentTag @ +page.svelte:44
add_svelte_meta @ context.js:49
consequent @ +page.svelte:42
(anonymous) @ branches.js:193
update_reaction @ runtime.js:255
update_effect @ runtime.js:454
create_effect @ effects.js:124
branch @ effects.js:419
ensure @ branches.js:193
update_branch @ if.js:55
(anonymous) @ if.js:63
(anonymous) @ +page.svelte:43
(anonymous) @ if.js:61
update_reaction @ runtime.js:255
update_effect @ runtime.js:454
traverse_effect_tree_fn @ batch.js:285
process @ batch.js:197
flush_effects @ batch.js:640
flush @ batch.js:355
(anonymous) @ batch.js:528
run_all @ utils.js:46
run_micro_tasks @ task.js:10
(anonymous) @ task.js:28
gameStore.svelte.ts:855 [B43/MAP] Factions found: [player-A, player-B, player-C, player-D, player-E, player-F]
gameStore.svelte.ts:856 [B43/MAP] Player IDs: [human-player, ai-1, ai-2, ai-3, ai-4, ai-5]
gameStore.svelte.ts:858 [B43/MAP]   player-A → human-player
gameStore.svelte.ts:858 [B43/MAP]   player-B → ai-1
gameStore.svelte.ts:858 [B43/MAP]   player-C → ai-2
gameStore.svelte.ts:858 [B43/MAP]   player-D → ai-3
gameStore.svelte.ts:858 [B43/MAP]   player-E → ai-4
gameStore.svelte.ts:858 [B43/MAP]   player-F → ai-5
logger.ts:292 CANVAS [WorldBounds] stars=87 min=(396,160) max=(1480,833) content=(316,80 1244x832) transpose=false 
logger.ts:292 CANVAS [WorldBounds] stars=87 min=(396,160) max=(1480,833) content=(316,80 1244x832) transpose=false 
logger.ts:292 CANVAS [handleResize] container=1255x1271 content=(316,80 1244x832) baseScale=1.0089 dpr=1 cssGrid(el)=1255x1271 viewport=1935x1271 
logger.ts:445 RENDERER [PVV2] cache reset 
logger.ts:445 RENDERER [PVV2] cache reset 
logger.ts:445 RENDERER [PVV3] cache reset 
GameCanvas.svelte:1136 [Territory Style Dispatch] TERRITORY_RENDER_MODE="territory_engine" → activeMode="territory_engine"
logger.ts:445 RENDERER [TerritoryEngine] active mode=dynamic static=fg1_adaptive_field dynamic=dy4_optimal_transport hybrid=hy2_seed_graph_local_delta adapter=legacy_pvv2 
logger.ts:445 RENDERER [TerritoryEngine] bootstrap adapter path mode=dynamic adapter=legacy_pvv2 static=fg1_adaptive_field dynamic=dy4_optimal_transport hybrid=hy2_seed_graph_local_delta 
logger.ts:445 RENDERER [PVV2] ⚠️ LEGACY path: canonicalData=false, shells=0 (no canonical shells → falling through to d3-weighted-voronoi) 
logger.ts:445 RENDERER [PVV2] mode=smooth smoothTransition=false segmentTransition=false 
logger.ts:445 RENDERER [PVV2] REBUILD | shapeChanged=true visualChanged=true | t+0.1ms 
logger.ts:445 RENDERER [PVV2] STAGE OUTPUT | cells=392 merged=7 edges=120 polylines=20 enclaves=0 chaikinPasses=0 
logger.ts:445 RENDERER [PVV2] FILLS | enclaves=0 territories to draw=7 
logger.ts:445 RENDERER [PVV2] STEADY-STATE FILLS | drawing 7 territories 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=110 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=31 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=39 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=33 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=26 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=32 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=33 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] ◀ rebuild complete | total=17.9ms 
logger.ts:292 CANVAS [WorldBounds] stars=87 min=(396,160) max=(1480,833) content=(316,80 1244x832) transpose=false 
logger.ts:292 CANVAS [handleResize] container=1255x1271 content=(316,80 1244x832) baseScale=1.0089 dpr=1 cssGrid(el)=1255x1271 viewport=1935x1271 
logger.ts:445 RENDERER [PVV2] REBUILD | shapeChanged=true visualChanged=false | t+0.0ms 
logger.ts:445 RENDERER [PVV2] STAGE OUTPUT | cells=401 merged=7 edges=125 polylines=24 enclaves=0 chaikinPasses=0 
logger.ts:445 RENDERER [PVV2] FILLS | enclaves=0 territories to draw=7 
logger.ts:445 RENDERER [PVV2] STEADY-STATE FILLS | drawing 7 territories 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=111 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=31 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=37 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=33 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=38 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=38 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=26 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] TRANSITION STARTED | prev=20 target=24 | transitionMs=400 
logger.ts:445 RENDERER [PVV2] ◀ rebuild complete | total=10.2ms 
logger.ts:445 RENDERER [PVV2] mode=smooth smoothTransition=true segmentTransition=true 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.008 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.023 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.038 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.054 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.072 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.091 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.112 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.136 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.162 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.202 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.241 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.281 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.313 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.351 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.389 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.433 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.481 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.525 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.569 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.609 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.651 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.688 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.718 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.751 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.780 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.822 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.883 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.906 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.930 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.947 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.961 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.977 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.985 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.992 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.997 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.999 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=1.000 | prev=20 target=24 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=252 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=73 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=89 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=62 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=106 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] geometric morph complete - returning to steady state 
logger.ts:445 RENDERER [PVV2] mode=smooth smoothTransition=false segmentTransition=true 
logger.ts:445 RENDERER [PVV2] REBUILD | shapeChanged=true visualChanged=false | t+0.0ms 
logger.ts:445 RENDERER [PVV2] STAGE OUTPUT | cells=406 merged=7 edges=127 polylines=22 enclaves=0 chaikinPasses=0 
logger.ts:445 RENDERER [PVV2] FILLS | enclaves=0 territories to draw=7 
logger.ts:445 RENDERER [PVV2] STEADY-STATE FILLS | drawing 7 territories 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=104 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=32 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=37 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=44 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=38 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=37 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=27 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] TRANSITION STARTED | prev=24 target=22 | transitionMs=400 
logger.ts:445 RENDERER [PVV2] ◀ rebuild complete | total=15.1ms 
logger.ts:445 RENDERER [PVV2] mode=smooth smoothTransition=true segmentTransition=true 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.007 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.016 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.024 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.035 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.048 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.064 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.079 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.098 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.120 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.141 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.167 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.193 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.221 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.252 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.287 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.328 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.382 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.433 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.477 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.517 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.559 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.596 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.637 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.670 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.706 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.741 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.770 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.799 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.823 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.848 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.872 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.899 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.918 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.941 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.958 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.973 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.985 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=0.998 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=1.000 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] GEOMETRIC MORPH frame t=1.000 | prev=24 target=22 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=neutral color=0x666666 alpha=0.30 pts=216 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=human-player color=0x69d3 alpha=0.30 pts=40 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-3 color=0x69d300 alpha=0.30 pts=169 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-5 color=0xd3 alpha=0.30 pts=97 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-4 color=0xd3d3 alpha=0.30 pts=143 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-1 color=0xd30000 alpha=0.30 pts=47 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2:fill]   filled+stroked ownerId=ai-2 color=0xd39d00 alpha=0.30 pts=58 holes=0 bw=3 ba=1 
logger.ts:445 RENDERER [PVV2] geometric morph complete - returning to steady state 
logger.ts:445 RENDERER [PVV2] mode=smooth smoothTransition=false segmentTransition=true 
