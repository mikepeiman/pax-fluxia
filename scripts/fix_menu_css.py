"""Add new CSS styles for restructured menu layout."""

FILE = r"c:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\components\ui\MainMenu.svelte"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Find the </style> tag to insert new CSS before it
style_end = content.rfind("</style>")

new_css = """
    /* -- Options List (left column) -- */
    .options-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .options-list .checkbox-label {
        font-size: 0.65rem;
        padding: 4px 0;
    }

    /* -- Triple Row (Players | Stars | Ships) -- */
    .config-triple-row {
        display: grid;
        grid-template-columns: auto 1fr 1fr;
        gap: 12px;
        align-items: end;
    }

    .config-dual-row.compact {
        gap: 8px;
    }

    /* -- Player Config Inline -- */
    .player-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .hue-offset-inline {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .hue-offset-inline input[type="range"] {
        width: 60px;
    }

    .inline-row {
        display: grid;
        grid-template-columns: 20px 36px 1fr auto auto;
        grid-template-areas: "swatch name slider diff strat";
        gap: 8px;
        align-items: center;
        padding: 6px 10px;
    }

    .player-label-inline {
        font-size: 0.7rem;
        font-weight: 600;
        color: #cce8ff;
        white-space: nowrap;
    }

    .hue-slider.compact {
        height: 6px;
    }

    .inline-select {
        background: rgba(5, 15, 30, 0.6);
        border: 1px solid rgba(100, 220, 255, 0.15);
        color: #cce8ff;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 0.65rem;
        cursor: pointer;
        min-width: 60px;
    }

    .inline-select:focus {
        outline: 1px solid rgba(100, 220, 255, 0.4);
    }

    .human-badge {
        font-size: 0.5rem;
        padding: 2px 8px;
        border-radius: 3px;
        font-weight: 700;
        letter-spacing: 1px;
        background: rgba(0, 255, 255, 0.1);
        color: #00ffff;
        border: 1px solid rgba(0, 255, 255, 0.2);
    }

    /* -- Speed + Start Row -- */
    .speed-start-row {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-areas: "speed start";
        gap: 16px;
        align-items: end;
    }

    .speed-control {
        grid-area: speed;
    }

    .speed-control .button-row {
        gap: 0;
    }

"""

# Remove old unused CSS selectors
old_css_to_remove = [
    # .hue-control and related (replaced by inline layout)
    ".hue-control {",
    ".hue-control label {",
    # .ai-setting and related (replaced by .inline-select)
    ".ai-setting {",
    ".ai-setting label {",
    ".ai-setting select {",
    ".ai-setting select:focus {",
    # .player-header (replaced by inline)
    ".player-header {",
    ".player-header:hover {",
    # .player-details (replaced by inline)
    ".player-details {",
    ".player-expand {",
    # Old hue-offset-row
    ".hue-offset-row {",
]

content = content[:style_end] + new_css + content[style_end:]

# Remove old CSS blocks that reference removed template elements
# We'll do this carefully by removing each block
for selector in old_css_to_remove:
    idx = content.find("    " + selector)
    if idx == -1:
        continue
    # Find closing brace
    depth = 0
    end = idx
    found_open = False
    for i in range(idx, len(content)):
        if content[i] == '{':
            depth += 1
            found_open = True
        elif content[i] == '}':
            depth -= 1
            if found_open and depth == 0:
                end = i + 1
                break
    # Also remove trailing newlines
    while end < len(content) and content[end] in ('\n', '\r'):
        end += 1
    content = content[:idx] + content[end:]

with open(FILE, "w", encoding="utf-8", newline="\n") as f:
    f.write(content)

# Verify
with open(FILE, "r", encoding="utf-8") as f:
    verify = f.read()

checks = {
    ".config-triple-row": ".config-triple-row" in verify,
    ".inline-row": ".inline-row" in verify,
    ".inline-select": ".inline-select" in verify,
    ".speed-start-row": ".speed-start-row" in verify,
    ".options-list": ".options-list" in verify,
    ".human-badge": ".human-badge" in verify,
    "no .ai-setting": ".ai-setting {" not in verify,
    "no .hue-control {": ".hue-control {" not in verify,
}

for k, v in checks.items():
    print(f"{k}: {v}")

lines = verify.count('\n') + 1
print(f"Total lines: {lines}")
