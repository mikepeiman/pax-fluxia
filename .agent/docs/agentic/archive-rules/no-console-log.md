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

## Client (pax-fluxia)

```typescript
import { log } from '$lib/utils/logger';

log.sys('Auth', 'Initializing...');
log.state('Auth', 'User logged in', user);
log.net('Room', 'Connected', roomId);
log.data('Sync', 'State updated', payload);
log.error('Auth', 'Login failed', err);
log.success('Auth', 'Login succeeded');
log.combat('Battle', 'Resolved', result);
log.input('Click', { starId });
```

## Server (pax-server)

```typescript
import { log } from '../utils/logger';

log.sys('GameRoom', 'Room created');
log.game('Tick', `Tick ${tick} processed`);
log.combat('Battle', 'Resolved', result);
log.net('Client', `Joined: ${sessionId}`);
log.error('GameRoom', 'Failed to process', err);
```

## Non-Compliant Pattern

```typescript
console.log('Initializing...'); // ❌ FORBIDDEN
console.error(err);             // ❌ FORBIDDEN
console.warn('deprecated');     // ❌ FORBIDDEN
```

## Exception

The only files that may use `console.log` directly are the logger utilities themselves:
- `pax-fluxia/src/lib/utils/logger.ts`
- `pax-server/src/utils/logger.ts`
