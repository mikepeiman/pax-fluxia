# Docs-First Policy

## CRITICAL RULE: Consult official documentation BEFORE implementing library features

When working with any external library (Colyseus, PIXI.js, Svelte, etc.):

1. **ALWAYS read official docs first** before writing any integration code
2. **If you hit an error with a library API**, stop and read the docs before trying a different approach
3. **Never guess at APIs** — use `read_url_content` on the official docs URL
4. **Never assume** that an API from an older version still exists in the current version

## Anti-Pattern (What NOT to do)

```
1. Try client.getAvailableRooms() → fails
2. Try createEndpoint() custom route → fails
3. Finally read the docs → discover built-in LobbyRoom
```

## Correct Pattern

```
1. Need room listing feature
2. Read https://docs.colyseus.io/room/built-in/lobby
3. Implement the documented LobbyRoom approach
```

## Key Documentation URLs

- Colyseus Lobby: https://docs.colyseus.io/room/built-in/lobby
- Colyseus Server: https://docs.colyseus.io/server/
- PIXI.js: https://pixijs.download/release/docs/
- Svelte 5: https://svelte.dev/docs
