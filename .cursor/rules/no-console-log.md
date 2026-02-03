---
description: Enforce Visual Telemetry standard (no raw console.log)
globs: "**/*.{ts,js,svelte}"
---

# Rule: No Raw Console Logs

You are forbidden from using `console.log`, `console.warn`, or `console.error` directly.

**Requirement:**
Use the `logger` utility (Visual Telemetry) for all logging.

## Why?
- **Structure:** Logs must be categorized (System, State, Net, Data).
- **Readability:** Color-coded outputs allow for rapid scanning.
- **Filtering:** Structured logs can be filtered by context.

## Compliant Pattern

```typescript
import { log } from '$lib/utils/logger';

log.sys('Auth', 'Initializing...');
log.state('Auth', 'User logged in', user);
log.error('Auth', 'Login failed', err);
```

## Non-Compliant Pattern

```typescript
console.log('Initializing...'); // ❌ FORBIDDEN
console.error(err);             // ❌ FORBIDDEN
```
