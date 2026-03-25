# Task Queue Discipline

## RULE: Never interrupt work in progress with new items.

When the user reports a new bug, feature request, or feedback while you are mid-task:

1. **Document it** in the Daily Session notes under "Queued"
2. **Acknowledge it** briefly ("Noted, queued for after current task")
3. **Continue** with the current task
4. **Do NOT** stop what you're doing to investigate or fix the new item

## RULE: After completing a task, reference docs — don't ask "what's next?"

When you finish a task:

1. Check **Daily Session notes** → Queued items
2. Check **FEATURE_STATUS.md** → Open bugs and planned features
3. Check any recent **Implementation Plans**
4. **Suggest** the next item from the queue with context
5. Let the user confirm or redirect

## Bad Pattern
```
"Task complete! What would you like me to work on next?"
```

## Good Pattern
```
"Task complete. From the queue:
- Next: Remove duplicate panel vars (Conquest Speed in multiple tabs)
- Then: UI layout improvements (F-59)
- Open bugs: B-89 (surge hiccup)
Proceeding with panel dedup unless you'd prefer something else."
```
