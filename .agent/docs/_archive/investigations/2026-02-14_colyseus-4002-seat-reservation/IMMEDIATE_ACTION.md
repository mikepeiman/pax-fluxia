# 🚨 IMMEDIATE ACTION — 3 Minutes to Fix

## The Problem

Your `seatDetail` is corrupted:

**Current (BROKEN)**:
```
seatDetail=[{"playerCount":6,"mapType":"standard",...}]  ❌ This is room options, not [sessionId, timestamp]!
```

**Should be**:
```
seatDetail=[["_gWsw2Gna", 1707941588191]]  ✅ This is [sessionId, timestamp]
```

When Colyseus checks the seat with `seatDetail[1]`, it gets `{playerCount: 6}` instead of a timestamp number, so the validation fails → "seat reservation expired"

---

## Step 1: Find the Corruption (1 minute)

### In Terminal

```bash
cd pax-server
grep -rn "_reservedSeats = " src/
```

**Look for any lines that ASSIGN (not read):**
```
❌ this._reservedSeats = options
❌ room._reservedSeats = roomOptions
❌ this._reservedSeats[sessionId] = data
```

### Most Likely Location: pax-server/src/rooms/GameRoom.ts

Open this file and search for `_reservedSeats`. Check:
- `onCreate()` method
- `onAuth()` method
- `onJoin()` method

---

## Step 2: Delete the Corrupting Code (1 minute)

**If you find code like:**

```typescript
// ❌ IN FILE: pax-server/src/rooms/GameRoom.ts
export class GameRoom extends Room {
  onCreate(options: any) {
    // THESE ARE THE PROBLEM:
    this._reservedSeats = options;                    // DELETE THIS
    // or
    this._reservedSeats[sessionId] = roomOptions;     // DELETE THIS
  }
}
```

**Delete those lines completely. Don't replace them. Just delete.**

---

## Step 3: Rebuild and Deploy (5 minutes)

```bash
npm run build
npm run deploy
```

---

## Step 4: Verify It's Fixed (1 minute)

```bash
# Create a room via HTTP
curl -X POST http://localhost:2567/matchmake/create/game_room \
  -H "Content-Type: application/json" \
  -d '{"playerCount":6,"mapType":"standard"}'

# Check the logs for:
# seatDetail=[["sessionIdHere", 1707941588191]]  ✅ CORRECT
# NOT:
# seatDetail=[{"playerCount":6,...}]  ❌ WRONG
```

If you see `seatDetail=[["_gWsw2Gna", 1707941588191]]`:
- **✅ YOU'RE FIXED!** Deploy to production.

---

## Quick Checklist

- [ ] Ran `grep -rn "_reservedSeats" src/` and found what's corrupting it
- [ ] Deleted the corrupting line(s)
- [ ] Ran `npm run build`
- [ ] Deployed to Northflank
- [ ] Verified logs show correct `seatDetail` format
- [ ] Created 20 rooms successfully

---

## Expected Timeline

- **Find it**: 1 minute
- **Delete it**: 30 seconds
- **Rebuild**: 2-3 minutes
- **Deploy**: 2-5 minutes
- **Verify**: 1 minute

**Total: 7-12 minutes**

---

## Why This Works

When the seat reservation data is corrupted with room options instead of `[sessionId, timestamp]`, the `hasReservedSeat()` check fails because:

```javascript
// What Colyseus tries to do:
const isValid = seatDetail[1] > Date.now() - timeout;

// What it gets instead:
const isValid = {playerCount: 6} > 1707941588191;  // ❌ Always false!
```

Once you remove the corruption, the seat validation works correctly.

---

**Go do it! You've got this. 🎯**

Report back with:
1. What line you deleted
2. Whether logs now show correct seatDetail format
3. Whether room creation succeeds 20/20 times
