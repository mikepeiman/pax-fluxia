# Browser Usage Policy

## CRITICAL RULE: Do NOT use browser without explicit permission

**The AI agent MUST NOT attempt to use the browser subagent or any browser-related tools unless the user has EXPLICITLY requested it in the current message.**

### Why This Rule Exists

Browser operations frequently fail due to:
- Connection timeouts
- Browser initialization issues  
- Page load failures
- System-level browser conflicts

These failures cause the agent to waste significant time in retry loops, providing no value to the user.

### When Browser Usage IS Permitted

Browser tools may be used ONLY when:
1. The user explicitly asks to "open the browser", "check the website", "verify in browser", etc.
2. The user asks you to interact with a web page
3. The user requests a screenshot of the running application

### When Browser Usage is FORBIDDEN

Do NOT use browser tools for:
- "Verification" of your own work (the dev server running is sufficient)
- Automatic testing without explicit request
- Proactive checking "to make sure it works"
- Any scenario where the user has not explicitly mentioned browser/visual verification

### Correct Workflow

If you complete an implementation:
1. ✅ Make the changes
2. ✅ Commit with git
3. ✅ Report completion to user
4. ❌ Do NOT attempt browser verification

The user will verify visually on their own and report any issues.
