# 🔒 One-Time Use Rule - Score Prevention System

## Overview

**Each rolled score can now only be assigned once!** Players can no longer use the same high score for every ability.

This enforces the D&D 5e fair play rule: each rolled score must be used exactly once.

---

## How It Works

### What Changed:

**BEFORE** (Broken):
```
Player rolls: [17, 16, 14, 13, 12, 9]
Player can drag 17 to ALL boxes (cheating!)
Result: 17, 17, 17, 17, 17, 17 ❌ INVALID
```

**AFTER** (Fixed):
```
Player rolls: [17, 16, 14, 13, 12, 9]
Player drags 17 to Strength ✓
Score 17 becomes GRAYED OUT and disabled
Player must use 16 for next ability
Result: 17, 16, 14, 13, 12, 9 ✓ VALID
```

---

## Visual Indicators

### Available Score:
```
[17]  ← Purple button, clickable, draggable
```

### Used Score (After Assignment):
```
[17] ✓  ← Grayed out (40% opacity), disabled, shows checkmark
       └─ Tooltip: "✓ Already assigned to Strength"
```

### Full Set:
```
Initial:    [17] [16] [14] [13] [12] [9]
After 1st:  [17]✓ [16] [14] [13] [12] [9]  (17 grayed out)
After 2nd:  [17]✓ [16]✓ [14] [13] [12] [9]  (16 grayed out)
After 3rd:  [17]✓ [16]✓ [14]✓ [13] [12] [9]  (all assigned)
```

---

## How Each Score Gets Locked

### Method 1: Drag & Drop
1. Drag score to ability box
2. Score automatically **disabled** (grayed out)
3. Shows ✓ checkmark
4. Tooltip shows which ability it's assigned to

### Method 2: Click to Assign
1. Click score button
2. Confirm ability
3. Score automatically **disabled**
4. Shows ✓ checkmark

### Method 3: Manual Edit
1. If player manually types a rolled value
2. Score is **disabled**
3. If player clears it, score becomes **available** again

---

## Preventing Cheating

### What Players CAN'T Do:
```
❌ Drag the same score multiple times
❌ Use a score after it's been assigned
❌ Click a disabled score button
❌ Trick the system by manual editing
```

### What Players CAN Do:
```
✓ Edit any ability to a non-rolled value (3-18)
✓ Roll again for new scores
✓ Use standard array instead
✓ Manually reassign scores (clear & retype)
✓ Change their mind before finalizing
```

---

## Rules Enforcement

### Automatic Blocking:
- **Drag Prevention**: Can't drag disabled scores
- **Button Disabling**: Disabled scores have `cursor: not-allowed`
- **Hover Prevention**: Hovering disabled scores shows they're unavailable
- **Alert Feedback**: Attempting to use a score twice shows warning

### Visual Feedback:
```
User tries to use score twice:
⚠️ "This score has already been assigned! 
    Please choose a different score."
```

---

## Reset Scenarios

### Scenario 1: Roll Again
```
1. Click "🎲 Roll 4d6 Drop Lowest"
2. usedScores clears automatically
3. All previous scores are re-enabled
4. New scores appear and are available
```

### Scenario 2: Apply Standard Array
```
1. Click "⚡ Apply Standard Array"
2. usedScores clears
3. Rolled score buttons re-enable
4. Standard array values fill abilities
```

### Scenario 3: Manual Reassignment
```
1. Edit ability box directly
2. Clear the old score
3. That score becomes available again!
4. Can be used for another ability
```

---

## Examples

### Example 1: Clean Assignment
```
ROLLS: [17, 16, 14, 13, 12, 9]

Step 1: Drag 17 → Strength box
        Result: Strength = 17 ✓
        [17]✓ [16] [14] [13] [12] [9]

Step 2: Drag 16 → Constitution box
        Result: Constitution = 16 ✓
        [17]✓ [16]✓ [14] [13] [12] [9]

Step 3: Drag 14 → Dexterity box
        Result: Dexterity = 14 ✓
        [17]✓ [16]✓ [14]✓ [13] [12] [9]

Step 4: Drag 13 → Wisdom box
        Result: Wisdom = 13 ✓
        [17]✓ [16]✓ [14]✓ [13]✓ [12] [9]

Step 5: Drag 12 → Intelligence box
        Result: Intelligence = 12 ✓
        [17]✓ [16]✓ [14]✓ [13]✓ [12]✓ [9]

Step 6: Drag 9 → Charisma box
        Result: Charisma = 9 ✓
        [17]✓ [16]✓ [14]✓ [13]✓ [12]✓ [9]✓

✓ All scores used exactly once!
```

### Example 2: Attempting Cheating
```
ROLLS: [17, 16, 14, 13, 12, 9]

Step 1: Drag 17 → Strength
        [17]✓ [16] [14] [13] [12] [9]

Step 2: Try to drag 17 → Constitution
        ❌ Can't drag disabled score!
        Button is grayed out, cursor shows "not-allowed"

Step 3: Drag 16 → Constitution
        [17]✓ [16]✓ [14] [13] [12] [9]
        ✓ Allowed!
```

### Example 3: Manual Reassignment
```
ROLLS: [17, 16, 14, 13, 12, 9]

Step 1: Drag 17 → Strength
        Strength = 17
        [17]✓ [16] [14] [13] [12] [9]

Step 2: Regret decision, click Strength box
        Clear the value: Strength = 0
        
Step 3: [17] re-enables automatically!
        [17] [16] [14] [13] [12] [9]
        
Step 4: Drag 17 → Dexterity instead
        [17]✓ [16] [14] [13] [12] [9]
        ✓ Score reassigned!
```

---

## Technical Details

### Tracking Mechanism:
```javascript
usedScores = new Set()  // Stores scores that have been assigned

When score is assigned:
  usedScores.add(score)
  disableScoreButton(score)

When roll resets:
  usedScores.clear()
  enableScoreButton(all)

When manually cleared:
  usedScores.delete(oldScore)
  enableScoreButton(oldScore)
```

### Prevention Logic:
```javascript
handleDragStart(e) {
  if (usedScores.has(score)) {
    e.preventDefault()  // ❌ Can't drag!
    return
  }
  // ✓ Can drag
}
```

---

## Player Experience

### Benefits:
✅ **Fair Play**: No more cheating with high scores  
✅ **Intuitive**: Visual feedback shows what's available  
✅ **Flexible**: Can still manually reassign  
✅ **Clear Rules**: No ambiguity about what's allowed  
✅ **Educational**: Teaches proper D&D 5e rules  

### Flow:
```
1. Roll dice (or apply standard array)
2. Drag highest score to primary ability
3. Drag next highest to secondary ability
4. Continue with remaining scores
5. All scores used exactly once ✓
6. Character creation complete!
```

---

## FAQ

**Q: What if I assign wrong and want to redo?**  
A: Click the ability box and clear it. The score becomes available again!

**Q: Can I use the same ability score twice if I manually type it?**  
A: Only if it's NOT a rolled value. You can type 15 twice if you rolled standard array, for example.

**Q: What happens if I roll twice?**  
A: Used scores clear, and all new rolled scores become available.

**Q: Can I reassign rolled values?**  
A: Yes! Clear an ability box and the score becomes available for reassignment.

**Q: Does this work with standard array?**  
A: Standard array uses pre-defined values (15,14,13,12,10,8), so each is used once by design.

**Q: What if I apply standard array after rolling?**  
A: All rolled scores are re-enabled, and standard array fills the boxes.

---

## Rules Enforcement Summary

| Action | Result |
|--------|--------|
| **Drag available score** | ✓ Assigned, score disabled |
| **Drag disabled score** | ❌ Prevented, not draggable |
| **Click to assign used score** | ⚠️ Alert: "Already assigned" |
| **Manually type used score** | ✓ Accepted, score marked used |
| **Clear ability box** | ✓ Score re-enabled for reuse |
| **Roll again** | ✓ All scores reset and available |
| **Apply standard array** | ✓ All scores reset and available |

---

## Perfect for Fair D&D 5e Play!

This one-time-use rule ensures:
- ⚔️ **Fair Character Creation**: No exploits
- 🎯 **Strategic Choices**: Players must think about placements
- 🎮 **Authentic Experience**: Follows D&D 5e rules
- ✅ **Rules Enforcement**: System enforces fairness

**Characters created with integrity!** 🏆
