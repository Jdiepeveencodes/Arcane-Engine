# 🎲 Dice Simulator & Standard Array Feature

## Overview

The character sheet template now includes two quick ways to generate ability scores:
1. **🎲 Dice Roller** - Roll 4d6 drop lowest (standard D&D method)
2. **⚡ Standard Array** - Apply the balanced 15, 14, 13, 12, 10, 8 array

---

## How to Use

### Method 1: Roll the Dice 🎲

1. Click **"🎲 Roll 4d6 Drop Lowest"** button
2. Six scores appear below (displayed highest to lowest)
3. Click on each score to assign it to an ability
4. Example:
   - Roll gets: 16, 14, 13, 12, 10, 9
   - Click "16" → Pick which ability gets 16 (Strength? Dexterity?)
   - Repeat for each score

**Perfect For**: Players who want randomness but control

---

### Method 2: Standard Array ⚡

1. Click **"⚡ Apply Standard Array"** button
2. All abilities instantly filled:
   - Strength: 15
   - Dexterity: 14
   - Constitution: 13
   - Intelligence: 12
   - Wisdom: 10
   - Charisma: 8
3. Edit any values by clicking the input boxes
4. Rearrange as needed for your character

**Perfect For**: Balanced, proven array that works for any build

---

## Rolling Mechanics

### How the Dice Roller Works:

```
For each of 6 abilities:
1. Roll 4 six-sided dice (4d6)
2. Drop the lowest result
3. Sum the remaining 3 dice
4. Result: Score between 3-18

Example roll:
- Roll: 6, 5, 3, 2
- Drop: 2 (lowest)
- Sum: 6 + 5 + 3 = 14
```

### Results:
- All rolls are shown (highest to lowest)
- Click any score to assign to an ability
- Scores stay until you refresh or roll again
- Can assign in any order

---

## Features

### 🎲 Dice Roller
✅ Rolls 6 times (one per ability)  
✅ 4d6 drop lowest (official method)  
✅ Shows sorted results  
✅ Click to assign scores  
✅ Can assign in any order  
✅ Realistic randomness  

### ⚡ Standard Array
✅ Instant application  
✅ Proven balanced array  
✅ Easy to memorize  
✅ No randomness  
✅ Can still edit manually  
✅ Great for first-time players  

---

## Tips

💡 **Tip 1**: Use standard array for consistent, balanced characters  
💡 **Tip 2**: Use dice roller for more varied characters  
💡 **Tip 3**: You can assign scores in any order (assign high scores where they matter most)  
💡 **Tip 4**: If you get bad rolls, you can always use the standard array instead  
💡 **Tip 5**: After assigning, you can still manually edit any score  

---

## Best Practices

### With Dice Roller:
1. Roll once
2. Note the 6 scores
3. Assign highest scores to your class's primary abilities
4. Save the file
5. If unhappy, roll again

### With Standard Array:
1. Click "Apply Standard Array"
2. Manually swap values to optimize for your build
3. Save the file

### Example - Fighter Build:
```
Standard Array: 15, 14, 13, 12, 10, 8

Rearranged for Fighter:
Strength:      15 (primary)
Constitution:  14 (hit points)
Dexterity:     13 (armor class)
Wisdom:        12 (perception)
Intelligence:  10 (dump stat)
Charisma:      8 (dump stat)
```

---

## Frequently Asked Questions

**Q: Can I use both roller and standard array?**  
A: Yes! Roll first, then use standard array if you don't like the rolls.

**Q: What's better, rolling or standard array?**  
A: Standard array is balanced and reliable. Rolling is more fun but risky.

**Q: What if I get really bad rolls?**  
A: Just click "Apply Standard Array" - it's still a good set of scores!

**Q: Can I manually edit after clicking a button?**  
A: Yes! Click on any ability score box to manually enter a value.

**Q: Do the rolls save?**  
A: No, but the form auto-saves to your browser. Just download as JSON to back up.

**Q: What if I want a different standard array?**  
A: Manually edit the numbers after applying. You can use any array you want!

**Q: Can I roll again if I don't like my scores?**  
A: Yes, just click "🎲 Roll 4d6 Drop Lowest" again for a new set.

---

## D&D 5e Context

### Why 4d6 Drop Lowest?
- Official D&D 5e method
- More likely to get higher scores (average ~13-14)
- Fun and engaging
- Allows for varied characters

### Why Standard Array?
- Official D&D 5e alternative
- Balanced for all character types
- No bad luck scenarios
- Predictable and fair

### Choosing Your Method:

**Use Dice Roller If You**:
- Want exciting, unique scores
- Like taking chances
- Want varied ability scores
- Love the randomness of D&D

**Use Standard Array If You**:
- Want guaranteed balanced scores
- Don't want randomness
- Want predictable character power
- Are new to D&D

---

## Visual Guide

### Dice Roller Button:
```
🎲 Roll 4d6 Drop Lowest
 ↓
Shows 6 scores
 ↓
Click score to assign
 ↓
Pick ability (Strength, Dexterity, etc.)
 ↓
Score assigned!
```

### Standard Array Button:
```
⚡ Apply Standard Array
 ↓
All scores filled: 15, 14, 13, 12, 10, 8
 ↓
Edit manually if desired
 ↓
Done!
```

---

## Keyboard Shortcuts

After clicking a score:
- `Tab` - Move to next ability score
- `Shift+Tab` - Move to previous ability score
- `↑/↓` - Increase/decrease value
- `Enter` - Confirm entry

---

## Troubleshooting

**Buttons not working?**
- Make sure you're using a modern browser
- Try refreshing the page
- Check JavaScript is enabled

**Scores not saving?**
- Form auto-saves to browser
- Use "Download as JSON" to backup
- Try clearing browser cache

**Want to undo rolls?**
- Just use "Apply Standard Array" to reset
- Or manually edit the fields
- Or refresh and start over

---

## Comparison: D&D Official Methods

| Method | Pros | Cons |
|--------|------|------|
| **4d6 Drop Lowest** | Fun, varied, engaging | Can get bad rolls |
| **Standard Array** | Balanced, no randomness | Less exciting, predetermined |
| **Point Buy** | Very balanced, optimization | Less fun, numbers feel dry |
| **Manual Entry** | Complete control | Risk of overpowered characters |

---

**This feature makes character creation fast, fun, and fair!** 🎲✨
