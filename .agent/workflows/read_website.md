---
description: How to read a website content reliably using the browser subagent, including media and visual analysis
---

# Website Reading & Analysis Protocol

This workflow defines the standard procedure for accessing external websites, handling dynamic content, and performing media/visual analysis.

## Core Principles
1. **Never Give Up**: If standard reading fails, use the browser.
2. **Dynamic First**: Assume modern sites are SPAs (Single Page Apps). Wait for elements.
3. **Visual Verification**: Use screenshots when layout or visual state matters.

## Procedures

### 1. Standard Text Extraction
**Use when:** Reading documentation, blogs, or articles.
- **Action**: `browser_subagent`
- **Prompt Template**:
  > Navigate to [URL]. Wait for text matching "[Key Phrase]" to appear. Scroll to bottom to trigger lazy loading. Return the full text content of [Selector/Section].

### 2. Media & Video Analysis (YouTube/Video)
**Use when:** Analyzing video content, timestamps, or visual feedback.
- **Action**: `browser_subagent`
- **Prompt Template**:
  > Navigate to [URL]. Wait for video player to load.
  > [Optional] Scan the transcript if available (click 'Show Transcript').
  > [Optional] Take a screenshot of the video player at [Timestamp].
  > Return a summary of the video title, description, and [Specific Detail].

### 3. Frame-by-Frame / Visual Debugging
**Use when:** Debugging UI animations, canvas rendering, or video details.
- **Action**: `browser_subagent`
- **Prompt Template**:
  > Navigate to [URL]. 
  > 1. Wait for canvas/video to load.
  > 2. Take a screenshot (RecordingName: 'initial_state').
  > 3. Press [Key (e.g., 'Right Arrow', 'Space')] or Click [Button] to advance state.
  > 4. Take a screenshot (RecordingName: 'next_frame').
  > 5. Compare findings and return a visual analysis.

## Fallback
If the subagent reports a failure:
1. **Retry** with a longer wait time.
2. **Simplification**: Ask for just the page title or a specific selector.
3. **Manual Request**: Only then ask the user for help.
