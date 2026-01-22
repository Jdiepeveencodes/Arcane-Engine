# 🎯 Drag-and-Drop Ability Score Assignment

## Overview

Players can now **drag ability scores directly to ability boxes** for a smoother, more intuitive experience!

---

## How to Use

### Method 1: Drag & Drop (NEW!) 🎯

1. **Roll the Dice**: Click "🎲 Roll 4d6 Drop Lowest"
2. **See Scores**: Six purple buttons appear (17, 16, 14, 13, 8, 7)
3. **Drag Score**: Click and hold a score button
4. **Drop on Ability**: Drag over an ability box (glows orange)
5. **Release**: Drop the score on the ability box
6. **Success!**: Ability box fills with that score ✓

### Method 2: Click to Assign (Original) ⚡

1. Click a score button
2. Confirm assignment
3. Done!

### Method 3: Manual Edit 📝

1. Click directly on an ability box
2. Type a new value (3-18)
3. Done!

---

## Visual Feedback

### While Dragging:
- Score button becomes semi-transparent (opacity 0.7)
- Cursor changes to "grabbing" hand
- Ability boxes ready to receive

### Hovering Over Ability Box:
- Box glows with **orange border** (3px)
- Background tints **light yellow** `#fff9e6`
- Box slightly expands (scale 1.05)
- Shows this is a valid drop target

### After Dropping:
- Ability box fills with the score
- **Green pulse animation** radiates from the box
- Visual confirmation of successful assignment
- Score instantly saved

---

## Features

✅ **Intuitive**: Drag-and-drop is natural, familiar  
✅ **Visual Feedback**: Orange glow shows drop zones  
✅ **Animation**: Green pulse confirms success  
✅ **Multiple Methods**: Drag, click, or type  
✅ **Flexible**: Assign in any order  
✅ **Responsive**: Works on all browsers  
✅ **Touch-Friendly**: Long-press drag on mobile  

---

## Step-by-Step Example

```
STEP 1: Open character sheet
           ↓
STEP 2: Click "🎲 Roll 4d6 Drop Lowest"
           ↓
STEP 3: See scores appear: [17] [16] [14] [13] [8] [7]
           ↓
STEP 4: Press and hold [17]
           ↓
STEP 5: Drag over "STRENGTH" ability box
           ↓
STEP 6: Box glows orange, expands slightly
           ↓
STEP 7: Release mouse
           ↓
STEP 8: Green pulse animation! ✓
           ↓
STEP 9: STRENGTH now shows: 17
           ↓
STEP 10: Repeat for other scores
```

---

## Tips & Tricks

💡 **Tip 1**: Drag high scores to your primary ability  
💡 **Tip 2**: You can drag multiple times - reassign anytime  
💡 **Tip 3**: Manual editing still works - click box and type  
💡 **Tip 4**: All methods auto-save to your browser  
💡 **Tip 5**: On mobile, press and hold to drag  

---

## Browser Support

✅ **Desktop**: Chrome, Firefox, Safari, Edge  
✅ **Mobile**: iOS Safari, Chrome Mobile, Firefox Mobile  
✅ **Tablet**: All major browsers  

---

## Accessibility

- ✅ Keyboard navigable (Tab to move between fields)
- ✅ Works with screen readers
- ✅ Semantic HTML structure
- ✅ High contrast colors
- ✅ Click alternative (no need to drag)

---

## Comparison: All Methods

| Method | Speed | Ease | Fun |
|--------|-------|------|-----|
| **Drag & Drop** | ⚡⚡⚡ Fast | ⭐⭐⭐⭐⭐ Very easy | 🎮 Most fun |
| **Click to Assign** | ⚡⚡ Medium | ⭐⭐⭐⭐ Easy | 🎮 Fun |
| **Manual Type** | ⚡ Slower | ⭐⭐⭐ Medium | ⚙️ Technical |

**Recommendation**: Use drag-and-drop for fastest, most intuitive experience!

---

## FAQ

**Q: Will drag-and-drop work on my phone?**  
A: Yes! Long-press to grab, drag, and drop.

**Q: Can I still manually edit after dragging?**  
A: Yes! Click any ability box and type a new value.

**Q: What if I drop on the wrong ability?**  
A: Just drag again to move it, or manually edit.

**Q: Does dragging save my progress?**  
A: Yes! Changes are auto-saved to your browser.

**Q: Can I drag scores to rearrange them?**  
A: The scores themselves aren't rearrangeable, but you can reassign them.

**Q: What if dragging isn't working?**  
A: Try refreshing the page, or use click/manual methods as alternatives.

---

## Visual Design

### Drag & Drop States:

```
INITIAL STATE:
[17] [16] [14] [13] [8] [7]     (Purple buttons)
[  ] [  ] [  ] [  ] [  ] [  ]     (Empty ability boxes)

DRAGGING STATE:
[17] [16] [14] [13] [8] [7]     (17 is semi-transparent)
             ↓
             Cursor: "grabbing" hand

HOVERING OVER DROP ZONE:
           ↓
[────────────────]     (Orange glow, yellow background)
| STRENGTH: [10] |     (Box expands slightly)
[────────────────]

AFTER DROP:
[17] [16] [14] [13] [8] [7]     (Scores still available)
[17] [  ] [  ] [  ] [  ] [  ]     (Ability box filled)
     ✨ Green pulse animation! ✨
```

---

## How It Works (Technical)

### Drag Events:
1. **dragstart**: Record score, show it as dragging
2. **dragover**: Show valid drop zone (orange glow)
3. **dragleave**: Remove drop zone highlight
4. **drop**: Assign score to ability, show success animation
5. **dragend**: Clean up

### Visual Effects:
- **Orange Glow**: `box-shadow: 0 0 10px rgba(243, 156, 18, 0.6)`
- **Green Pulse**: CSS keyframe animation
- **Scale Effect**: `transform: scale(1.05)` on hover

---

## Perfect For

✨ Players who like intuitive interfaces  
✨ Fast character creation  
✨ Minimal clicking  
✨ Visual feedback lovers  
✨ D&D veterans who want speed  

---

**Drag & Drop makes ability score assignment fast, fun, and intuitive!** 🎯✨
