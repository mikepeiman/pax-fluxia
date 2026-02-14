# QUICK REFERENCE — 10 Minute Fix

## 🎯 THE PROBLEM

Your reserved seat contains room options instead of `[sessionId, timestamp]`

```
WRONG: seatDetail=[{"playerCount":6,...}]
RIGHT: seatDetail=[["_gWsw2Gna", 1707941588191]]
```

---

## ⚡ THE FIX (4 STEPS)

### 1️⃣ SEARCH (1 min)
```bash
cd pax-server
grep -rn "_reservedSeats = " src/
```

### 2️⃣ FIND (1 min)
Look for line like:
```typescript
this._reservedSeats = options;  // ← THIS ONE
```

### 3️⃣ DELETE (30 sec)
Open file, delete the line

### 4️⃣ DEPLOY (5 min)
```bash
npm run build
npm run deploy
```

---

## ✅ VERIFY

**After deploy, check logs:**
```
seatDetail=[["_gWsw2Gna", 1707941588191]]  ✅ CORRECT
```

**Not:**
```
seatDetail=[{"playerCount":6,...}]  ❌ WRONG
```

---

## 📖 FILES

| File | Purpose | Read Time |
|------|---------|-----------|
| START_HERE.md | Navigation | 2 min |
| IMMEDIATE_ACTION.md | Step-by-step | 3 min |
| SEARCH_PATTERNS.md | Find code | 2 min |
| SOLUTION_SUMMARY.md | Understanding | 2 min |

---

## 🚀 GO DO IT

1. Open IMMEDIATE_ACTION.md
2. Follow steps
3. Done! ✅

**Total time: 10 minutes**
