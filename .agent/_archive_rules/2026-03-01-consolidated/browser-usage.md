---
description: Browser usage rules for web page reading and interaction
globs: "**/*"
---

# Browser Usage

## Dev Server
- **Port 1420** — `http://localhost:1420/` (Tauri dev server). Never use 5173 or any other port.
- **Screenshots** — ask the USER for screenshots, never use browser subagent for screenshotting. It is too slow and disrupts workflow. Reference images are at `reference/images/`.

## Web Content
- Prefer `read_url_content` for static content/documentation (faster, no browser needed)
- Use `browser_subagent` only when JavaScript execution, login, or visual inspection is truly needed
- For reading documentation: always try `read_url_content` first
