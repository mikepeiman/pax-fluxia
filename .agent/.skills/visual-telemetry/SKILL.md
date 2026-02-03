---
name: visual-telemetry
description: |
  Semantic logging standard for observable, scannable console output. Use when
  implementing logging, debugging, or observability features. Replaces raw console.log
  with color-coded, categorized breadcrumbs mapped to PRISM dimensions.
metadata:
  author: metabrain
  version: "1.0"
---

# Visual Telemetry Standard

**Rule:** No raw `console.log`. Use semantic logging that maps to PRISM dimensions.

---

## The Color Spectrum

| Mode | Context | Tag | Color |
|------|---------|-----|-------|
| **STRUCTURE** | Lifecycle / Init | `[SYSTEM]` | 🔵 Blue `#3b82f6` |
| **STATE** | Logic / Transitions | `[STATE]` | 🟣 Purple `#a855f7` |
| **FLOW** | Data / Pipes | `[DATA]` | 🟢 Emerald `#10b981` |
| **NETWORK** | API / IO | `[NET]` | 🟡 Amber `#f59e0b` |
| **CORRECTION** | Errors / Fixes | `[ERROR]` | 🔴 Red `#ef4444` |
| **SUCCESS** | Verification | `[OK]` | ✅ Green `#22c55e` |

---

## Logger Implementation

```typescript
// src/lib/logger.ts

const styles = {
  sys: 'background: #3b82f6; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
  state: 'background: #a855f7; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
  data: 'background: #10b981; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
  net: 'background: #f59e0b; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
  err: 'background: #ef4444; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
  ok: 'background: #22c55e; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
  reset: 'color: inherit;'
};

export const log = {
  sys: (context: string, msg: string) => 
    console.log(`%cSYSTEM%c [${context}] ${msg}`, styles.sys, styles.reset),
  
  state: (context: string, msg: string, state?: any) => 
    console.log(`%cSTATE%c [${context}] ${msg}`, styles.state, styles.reset, state || ''),
  
  data: (context: string, msg: string, data?: any) => 
    console.log(`%cDATA%c [${context}] ${msg}`, styles.data, styles.reset, data || ''),
  
  net: (context: string, msg: string, data?: any) => 
    console.log(`%cNET%c [${context}] ${msg}`, styles.net, styles.reset, data || ''),
  
  error: (context: string, msg: string, err?: any) => 
    console.error(`%cERROR%c [${context}] ${msg}`, styles.err, styles.reset, err || ''),
  
  success: (context: string, msg: string) => 
    console.log(`%cSUCCESS%c [${context}] ${msg}`, styles.ok, styles.reset)
};
```

---

## Usage Rules

### Rule A: No `console.log`
You are forbidden from using raw `console.log`. Use the `log` utility.

### Rule B: The Breadcrumb Structure
Every log must provide:
1. **Category** - The method call (sys, state, data, net, error, success)
2. **Context** - The function/component name
3. **Message** - What happened
4. **Payload** - Optional data snapshot

---

## Example Usage

```typescript
function handleSave() {
  log.sys('UserProfile', 'Save sequence initiated');
  
  if (!isValid) {
    log.state('UserProfile', 'Guard: Validation failed', { formErrors });
    return;
  }
  
  log.net('UserProfile', 'POST /api/profile', payload);
  
  api.save(payload)
    .then(res => {
      log.success('UserProfile', 'Profile updated');
    })
    .catch(err => {
      log.error('UserProfile', 'Save failed', err);
    });
}
```

---

## Console Output (Human Scanning)

```
🔵 SYSTEM  [App] Initializing
🟣 STATE   [AuthStore] Session Restored
🟡 NET     [Dashboard] Fetching Widgets...
🔴 ERROR   [Dashboard] Widget 3 failed to load
✅ SUCCESS [Dashboard] Remaining widgets rendered
```

*Colors enable instant filtering by brain.*
