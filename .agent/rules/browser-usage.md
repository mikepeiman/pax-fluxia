---
description: Browser usage rules for web page reading and interaction
globs: "**/*"
---

# Browser Usage

When reading web pages for information:
- Prefer `read_url_content` for static content/documentation (faster, no browser needed)
- Use `browser_subagent` only when JavaScript execution, login, or visual inspection is needed
- For reading documentation: always try `read_url_content` first

When using the browser for verification:
- Capture screenshots to confirm visual changes
- Navigate to `localhost:5173` (or the active dev server port) for the game client
