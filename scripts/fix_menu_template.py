"""Rewrite MainMenu.svelte template: reorganize columns per user spec."""
import re

FILE = r"c:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\components\ui\MainMenu.svelte"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# === 1. Rename "STANDARD" label to "RANDOMIZED" ===
content = content.replace('label: "STANDARD"', 'label: "RANDOMIZED"')

# === 2. Replace Col 1 (menu-sidebar) ===
# Find: from <!-- Col 1 to </section> for col 1
col1_start = content.find('<!--  Col 1: Menu + Settings  -->')
col1_end = content.find('<!--  Col 2: Map + Players + Config  -->')

new_col1 = '''<!--  Col 1: Options  -->
                <section class="panel menu-sidebar">
                    <h2 class="panel-title">OPTIONS</h2>

                    <div class="options-list">
                        <label class="checkbox-label">
                            <input type="checkbox" bind:checked={retainOrderOnConquest} />
                            <span>Retain orders after conquest</span>
                            <span class="tooltip">Attack orders become movement orders when target is captured</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" checked disabled />
                            <span>Auto-select new conquests</span>
                            <span class="tooltip">Automatically select newly captured stars</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Fog of war</span>
                            <span class="tooltip">Only see stars within sensor range (coming soon)</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Show production rates</span>
                            <span class="tooltip">Display ship production numbers on each star</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Show movement trails</span>
                            <span class="tooltip">Visualize ship movement paths between stars</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Auto-pause on combat</span>
                            <span class="tooltip">Pause game speed when battles occur</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" disabled />
                            <span>Surrender when hopeless</span>
                            <span class="tooltip">AI declares surrender when defeat is certain (coming soon)</span>
                        </label>
                    </div>
                </section>

                '''

# === 3. Replace Col 2 (config-panel) ===
col2_end = content.find('<!--  Col 3: Multiplayer')

new_col2 = '''<!--  Col 2: Game Setup  -->
                <section class="panel config-panel">
                    <h2 class="panel-title">GAME SETUP</h2>

                    <!-- Map Selection -->
                    <div class="control-group">
                        <label>MAP</label>
                        <div class="map-card-row">
                            {#each MAP_DEFS as m}
                                <button
                                    class="map-card"
                                    class:active={mapType === m.id}
                                    class:debug={m.id.startsWith("debug")}
                                    onclick={() => (mapType = m.id)}
                                >
                                    <svg
                                        class="map-thumb"
                                        viewBox="0 0 64 48"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        {#each m.connections as [a, b]}
                                            <line
                                                x1={m.stars[a].x}
                                                y1={m.stars[a].y}
                                                x2={m.stars[b].x}
                                                y2={m.stars[b].y}
                                                stroke={mapType === m.id
                                                    ? "#4488ff44"
                                                    : "#334466"}
                                                stroke-width="1"
                                            />
                                        {/each}
                                        {#each m.stars as star}
                                            <circle
                                                cx={star.x}
                                                cy={star.y}
                                                r="3"
                                                fill={star.color}
                                                opacity={mapType === m.id
                                                    ? 1
                                                    : 0.6}
                                            />
                                        {/each}
                                    </svg>
                                    <span class="map-card-label">{m.label}</span>
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- Links + Spacing (side by side) -->
                    <div class="config-dual-row">
                        <div class="control-group">
                            <label>LINKS</label>
                            <div class="config-dual-row compact">
                                <div class="config-item">
                                    <span class="mini-label">MIN</span>
                                    <div class="slider-container">
                                        <input type="range" min="1" max="4" bind:value={minLinks} />
                                        <span class="value">{minLinks}</span>
                                    </div>
                                </div>
                                <div class="config-item">
                                    <span class="mini-label">MAX</span>
                                    <div class="slider-container">
                                        <input type="range" min="2" max="8" bind:value={maxLinks} />
                                        <span class="value">{maxLinks}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>SPACING</label>
                            <div class="slider-container">
                                <span class="mini-label">DENSE</span>
                                <input type="range" min="0.5" max="5.0" step="0.1" bind:value={starSpacing} />
                                <span class="mini-label">SPARSE</span>
                                <span class="value">{starSpacing.toFixed(1)}x</span>
                            </div>
                        </div>
                    </div>

                    <!-- Players + Stars + Ships (one row) -->
                    <div class="config-triple-row">
                        <div class="control-group">
                            <label>PLAYERS</label>
                            <div class="button-row">
                                {#each PLAYERS as p}
                                    <button
                                        class:active={playerCount === p}
                                        onclick={() => (playerCount = p)}
                                    >{p}</button>
                                {/each}
                            </div>
                        </div>
                        <div class="config-item">
                            <label>STARS/P</label>
                            <div class="slider-container">
                                <input type="range" min="1" max="20" bind:value={starsPerPlayer} />
                                <span class="value">{starsPerPlayer}</span>
                            </div>
                        </div>
                        <div class="config-item">
                            <label>SHIPS/S</label>
                            <div class="slider-container">
                                <input type="range" min="10" max="200" step="10" bind:value={shipsPerStar} />
                                <span class="value">{shipsPerStar}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Player Configuration (inline AI settings) -->
                    <div class="control-group player-config-section">
                        <div class="player-config-header">
                            <label>PLAYERS</label>
                            <div class="hue-offset-inline">
                                <span class="mini-label">Hue offset</span>
                                <input type="range" min="10" max="120" bind:value={hueOffset} />
                                <span class="value">{hueOffset}</span>
                            </div>
                        </div>
                        <div class="player-config-list">
                            {#each playerConfigs as cfg, i}
                                <div class="player-config-row inline-row">
                                    <span
                                        class="player-swatch"
                                        style:background-color="hsl({cfg.hue}, 70%, 55%)"
                                    ></span>
                                    <span class="player-label-inline">
                                        {i === 0 ? "YOU" : `P${i + 1}`}
                                    </span>
                                    <input
                                        type="range"
                                        class="hue-slider compact"
                                        min="0"
                                        max="360"
                                        bind:value={playerConfigs[i].hue}
                                        style:--hue={cfg.hue}
                                    />
                                    {#if i > 0}
                                        <select class="inline-select" bind:value={playerConfigs[i].difficulty}>
                                            {#each DIFFICULTIES as d}
                                                <option value={d}>{d}</option>
                                            {/each}
                                        </select>
                                        <select class="inline-select" bind:value={playerConfigs[i].strategy}>
                                            {#each AI_STRATEGIES as s}
                                                <option value={s.id}>{s.label}</option>
                                            {/each}
                                        </select>
                                    {:else}
                                        <span class="human-badge">HUMAN</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Speed + Start -->
                    <div class="speed-start-row">
                        <div class="config-item speed-control">
                            <label>SPEED</label>
                            <div class="button-row">
                                {#each [1, 2, 4, 10] as s}
                                    <button
                                        class:active={gameSpeed === s}
                                        onclick={() => (gameSpeed = s)}
                                    >{s}x</button>
                                {/each}
                            </div>
                        </div>
                        <button class="start-btn" onclick={startSPGame}>
                            <span class="btn-glow"></span>
                            START GAME
                        </button>
                    </div>
                </section>

                '''

# Replace col1 + col2 template
before = content[:col1_start]
after = content[col2_end:]
content = before + new_col1 + new_col2 + after

with open(FILE, "w", encoding="utf-8", newline="\n") as f:
    f.write(content)

print("Template reorganized successfully")
print(f"Col1 range: {col1_start}")
print(f"Col2 end: {col2_end}")
print(f"New file length: {len(content)}")
