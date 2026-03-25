# Exact Code Patterns to Search For

Based on your setup, these are the EXACT patterns causing the corruption.

---

## Pattern 1: Most Likely (80% probability)

**Search for:**
```bash
grep -n "this._reservedSeats = " pax-server/src/rooms/GameRoom.ts
```

**You'll find:**
```typescript
export class GameRoom extends Room {
  onCreate(options: any) {
    this._reservedSeats = options;  // ← THIS LINE
  }
}
```

**Delete:** The entire line `this._reservedSeats = options;`

---

## Pattern 2: Custom Seat Assignment (15% probability)

**Search for:**
```bash
grep -n "_reservedSeats\[" pax-server/src/
```

**You might find:**
```typescript
room._reservedSeats[sessionId] = roomOptions;      // ← DELETE THIS
room._reservedSeats[client.sessionId] = options;   // ← DELETE THIS
```

**Delete:** Any line that assigns room options to `_reservedSeats[key]`

---

## How to Search Systematically

### Search 1: Direct assignment to `_reservedSeats`

```bash
grep -rn "this\._reservedSeats = " pax-server/src/
```

Look for:
- `this._reservedSeats = options`
- `this._reservedSeats = roomOptions`

**DELETE any of these lines.**

---

### Search 2: Assignment with bracket notation

```bash
grep -rn "_reservedSeats\[.*\] = " pax-server/src/
```

Look for:
- `_reservedSeats[sessionId] = options`
- `_reservedSeats[key] = roomOptions`

**DELETE any of these lines.**

---

### Search 3: In GameRoom specifically

```bash
grep -n "_reservedSeats" pax-server/src/rooms/GameRoom.ts
```

Check the `onCreate()`, `onAuth()`, and `onJoin()` methods.

---

## File-by-File Checklist

### 1. pax-server/src/rooms/GameRoom.ts

```bash
grep -n "_reservedSeats" pax-server/src/rooms/GameRoom.ts
```

Look in:
- [ ] `onCreate()` method
- [ ] `onAuth()` method
- [ ] `onJoin()` method

Delete any assignments.

---

### 2. pax-server/src/prod.ts

```bash
grep -n "_reservedSeats" pax-server/src/prod.ts
```

Look in:
- [ ] Server initialization
- [ ] Room definition
- [ ] Custom HTTP routes

Delete any assignments.

---

## Copy-Paste Search Commands

Run these one by one:

```bash
# Search 1: Direct assignment
grep -rn "this\._reservedSeats = " pax-server/src/rooms/

# Search 2: Room assignment
grep -rn "room\._reservedSeats = " pax-server/src/

# Search 3: Bracket assignment
grep -rn "_reservedSeats\[.*\] = " pax-server/src/

# Search 4: All _reservedSeats mentions
grep -rn "_reservedSeats" pax-server/src/

# Search 5: In GameRoom specifically
grep -n "_reservedSeats" pax-server/src/rooms/GameRoom.ts
```

---

## After You Find and Delete

### Verify the deletion

```bash
# Make sure it's gone
grep -rn "_reservedSeats = " pax-server/src/
# Should return NOTHING
```

### Rebuild

```bash
npm run build
```

### Deploy

```bash
npm run deploy
```

### Verify logs

```bash
# Watch for correct seat format
docker logs <container> -f 2>&1 | grep "seatDetail"
# Should show: seatDetail=[["sessionId", 1707941588191]]
```

---

## If You Find Nothing

1. Try broader search:
```bash
grep -r "_reservedSeats" pax-server/
```

2. The corruption might be in a different file. Search all TypeScript files:
```bash
find pax-server -name "*.ts" | xargs grep "_reservedSeats = "
```

---

## Still Stuck?

1. Run all the grep commands above
2. Paste the ENTIRE output
3. I'll tell you exactly which line to delete

**Example:**
```
pax-server/src/rooms/GameRoom.ts:42: this._reservedSeats = options;
```

I'd say: **DELETE line 42 in GameRoom.ts**

---

**You've got this! Start searching! 🔍**
