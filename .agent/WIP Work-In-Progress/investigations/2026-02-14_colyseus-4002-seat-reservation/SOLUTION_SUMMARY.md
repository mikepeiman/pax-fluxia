# Colyseus 4002 — SOLUTION SUMMARY

## What Was Wrong

Your diagnostic logs showed the smoking gun:

```
seatDetail=[{"playerCount":6,"mapType":"standard","starsPerPlayer":5,...}]
```

**This is corrupted.** A valid seat detail must be:
```
seatDetail=[["_gWsw2Gna", 1707941588191]]  // [sessionId, timestamp]
```

---

## Why It Failed

Colyseus's `hasReservedSeat()` function does:

```javascript
const isValid = seatDetail[1] > Date.now() - this.seatReservationTimeout * 1000;
```

It expects `seatDetail[1]` to be a **timestamp** (a number like `1707941588191`).

But your code set it to **an object** (`{playerCount: 6, ...}`).

When JavaScript tries to evaluate:
```
{playerCount: 6} > 1707941588191
```

It always returns `false` → seat validation fails → "seat reservation expired" error.

---

## Where the Corruption Comes From

**Somewhere in your codebase, you're doing:**

```typescript
// ❌ WRONG - This overwrites the seat tuple with room options
room._reservedSeats[sessionId] = roomOptions;
// or
room._reservedSeats = roomOptions;
```

This is most likely in:
- **pax-server/src/rooms/GameRoom.ts** (onCreate, onAuth, onJoin)
- **pax-server/src/prod.ts** (server setup)

---

## The Fix

### Find It
```bash
cd pax-server
grep -rn "_reservedSeats = " src/
```

Look for any **assignment** (using `=`), not just reading.

### Delete It

Remove whatever line is assigning room options to `_reservedSeats`.

Typical culprits:
```typescript
this._reservedSeats = options;              // DELETE THIS
room._reservedSeats = roomOptions;          // DELETE THIS
room._reservedSeats[sessionId] = data;      // DELETE THIS
```

### Verify

```bash
npm run build
npm run deploy
```

Check logs for:
```
seatDetail=[["_gWsw2Gna", 1707941588191]]  ✅ CORRECT
```

Not:
```
seatDetail=[{"playerCount":6,...}]  ❌ WRONG
```

---

## Why Local Worked But Docker Failed

- **Local (Bun)**: Different memory/GC behavior may have preserved the data longer
- **Docker (Node.js)**: Garbage collection happens faster, invalidating the corrupted data at ~96ms

---

## How to Verify the Fix

1. **Search for corruption**: `grep -rn "_reservedSeats = " pax-server/src/`
2. **Find the line**: It will show you exactly where
3. **Delete it**: Remove that line completely
4. **Rebuild**: `npm run build`
5. **Deploy**: `npm run deploy`
6. **Test**: Create 20 rooms
7. **Check logs**: Look for correct seatDetail format

---

## Success Criteria

After the fix, you should see:
- ✅ Logs show: `seatDetail=[["sessionId", timestamp]]`
- ✅ ALL 20 room creation attempts succeed
- ✅ NO "seat reservation expired" errors
- ✅ Clients join rooms successfully

---

**Next Steps**: Open IMMEDIATE_ACTION.md and follow the 3-minute fix guide.

You've got the answer. Go implement it! 🎯
