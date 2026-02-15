"""Replace speed button row with tick duration slider."""

FILE = r"c:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\components\ui\MainMenu.svelte"

with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the "Speed + Start" comment and replace the block
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if "Speed + Start" in line:
        start_idx = i
    if start_idx is not None and line.strip() == "</div>" and i > start_idx + 5:
        # Check if this closes the speed-start-row
        if "speed-start-row" in lines[start_idx + 1] or (i > start_idx + 10):
            end_idx = i
            break

print(f"Found speed block: lines {start_idx+1} to {end_idx+1}")

if start_idx is not None and end_idx is not None:
    new_block = [
        '                    <!-- Tick Duration + Start -->\n',
        '                    <div class="speed-start-row">\n',
        '                        <div class="config-item speed-control">\n',
        '                            <label>TICK DURATION</label>\n',
        '                            <div class="slider-container">\n',
        '                                <span class="mini-label">FAST</span>\n',
        '                                <input\n',
        '                                    type="range"\n',
        '                                    min="0"\n',
        '                                    max="3000"\n',
        '                                    step="250"\n',
        '                                    bind:value={tickDuration}\n',
        '                                />\n',
        '                                <span class="mini-label">SLOW</span>\n',
        '                                <span class="value">{(tickDuration / 1000).toFixed(2)}s</span>\n',
        '                            </div>\n',
        '                        </div>\n',
        '                        <button class="start-btn" onclick={startSPGame}>\n',
        '                            <span class="btn-glow"></span>\n',
        '                            START GAME\n',
        '                        </button>\n',
        '                    </div>\n',
    ]
    
    lines = lines[:start_idx] + new_block + lines[end_idx + 1:]
    
    with open(FILE, "w", encoding="utf-8", newline="\n") as f:
        f.writelines(lines)
    
    print("Replaced successfully")
    
    # Verify
    with open(FILE, "r", encoding="utf-8") as f:
        content = f.read()
    print(f"tickDuration in template: {'tickDuration' in content}")
    print(f"gameSpeed in template: {'gameSpeed' in content}")
    print(f"TICK DURATION label: {'TICK DURATION' in content}")
else:
    print("Could not find speed block!")
