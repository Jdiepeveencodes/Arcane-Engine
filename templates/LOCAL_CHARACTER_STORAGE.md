# 💾 Local Character Storage & Download Guide

## Overview

Players can now **download and organize** their characters locally on their computer in a structured folder system!

---

## Two Download Options

### Option 1: JSON Only (Simple)
**Button**: `📥 Download as JSON`

Downloads just the character data:
```
charactername-playername-2026-01-22.json
```

**Good for**: Quick saves, backups, sharing with DM

---

### Option 2: Complete Package (Recommended)
**Button**: `📦 Download Package (JSON + PDF)`

Downloads character data + opens PDF print dialog:
```
1. character-data.json      ← Saved automatically
2. PDF print dialog opens   ← Save as PDF when prompted
```

**Good for**: Complete reference, organized archives, physical backup

---

## Recommended Directory Structure

After downloading, organize your characters like this:

```
MyCharacters/
├── Player_Name/
│   ├── Character_1/
│   │   ├── character-data.json
│   │   └── Character-Sheet.pdf
│   │
│   ├── Character_2/
│   │   ├── character-data.json
│   │   └── Character-Sheet.pdf
│   │
│   └── Character_3/
│       ├── character-data.json
│       └── Character-Sheet.pdf
│
├── Another_Player/
│   ├── Their_Character_1/
│   │   ├── character-data.json
│   │   └── Character-Sheet.pdf
│   │
│   └── Their_Character_2/
│       ├── character-data.json
│       └── Character-Sheet.pdf
│
└── [more players...]
```

---

## File Contents

### character-data.json

**Machine-readable character data:**

```json
{
  "player_name": "Jesse",
  "character_name": "Aragorn",
  "race": "Human",
  "class_name": "Ranger",
  "background": "Soldier",
  "alignment": "Neutral Good",
  "level": 1,
  "ability_scores": {
    "strength": 17,
    "dexterity": 16,
    "constitution": 14,
    "intelligence": 13,
    "wisdom": 12,
    "charisma": 9
  },
  "skills": ["Athletics", "Survival", "Perception"],
  "background_story": "...",
  "personality_traits": "...",
  "ideals": "...",
  "bonds": "...",
  "flaws": "...",
  "equipment_notes": "...",
  "created_at": "2026-01-22T12:34:56.789Z",
  "last_played": null
}
```

**Can be imported into Arcane Engine!**

---

### Character-Sheet.pdf

**Printable/readable character sheet with:**

- Character name, player name
- Race, class, background, alignment
- Ability scores (visual boxes)
- Skills checklist
- Personality traits
- Ideals, bonds, flaws
- Background story
- Equipment & notes
- Creation timestamp

**Perfect for:**
- Physical backup (print and keep at table)
- Quick reference while playing
- Sharing with DM
- Character portfolios

---

## Setup Instructions

### For Your Computer

**Step 1: Create Main Folder**
```
1. On your computer, create a new folder:
   Windows: C:\Users\YourName\Documents\MyCharacters
   Mac: /Users/YourName/Documents/MyCharacters
   Linux: /home/username/MyCharacters
```

**Step 2: Create Player Subfolder**
```
2. Inside MyCharacters, create a folder with your name:
   MyCharacters/Jesse/
```

**Step 3: Create Character Subfolders**
```
3. Inside your player folder, create character folders:
   MyCharacters/Jesse/Aragorn/
   MyCharacters/Jesse/Legolas/
   MyCharacters/Jesse/Gimli/
```

**Step 4: Download Characters**
```
4. Click "📦 Download Package"
5. Save character-data.json → MyCharacters/Jesse/Aragorn/
6. Save README.md → MyCharacters/Jesse/Aragorn/
```

---

## Complete Workflow

### Creating & Saving a Character

```
1. Fill out character form (all fields)
2. Roll ability scores or use standard array
3. Assign scores to abilities (drag & drop)
4. Review personality traits & background
5. Click "📦 Download Package"
6. JSON file downloads automatically
7. PDF print dialog opens
8. Click "Save as PDF"
9. Save both files to: MyCharacters/[PlayerName]/[CharacterName]/
```

### Result

```
MyCharacters/
└── Jesse/
    └── Aragorn/
        ├── character-data.json  ✓
        └── Character-Sheet.pdf  ✓
```

---

## Multiple Characters Example

### Before Downloads
```
MyCharacters/
└── (empty)
```

### After Multiple Downloads
```
MyCharacters/
├── Jesse/
│   ├── Aragorn/
│   │   ├── character-data.json
│   │   └── Character-Sheet.pdf
│   │
│   ├── Legolas/
│   │   ├── character-data.json
│   │   └── Character-Sheet.pdf
│   │
│   └── Gimli/
│       ├── character-data.json
│       └── Character-Sheet.pdf
│
└── Sarah/
    └── Galadriel/
        ├── character-data.json
        └── Character-Sheet.pdf
```

---

## Use Cases

### ✅ Local Backup
```
Purpose: Keep characters safe on your computer
Method: Download → Save to local folder
Result: Characters stay even if website goes down
```

### ✅ Campaign Archive
```
Purpose: Keep record of all campaign characters
Method: Create campaign folder, organize by character
Result: Easy to reference past adventures
```

### ✅ Character Portfolio
```
Purpose: Show off characters you've created
Method: Organize by type (Rogues, Paladins, etc.)
Result: Quick reference for statistics and builds
```

### ✅ DM Reference
```
Purpose: DM needs to check PC stats quickly
Method: Share README.md with DM
Result: DM has quick reference card
```

### ✅ Import Later
```
Purpose: Prepare characters ahead of time
Method: Download with organized naming
Result: Can be imported into campaign when ready
```

---

## Naming Conventions

### Automatic Naming
When you download, the JSON filename is auto-generated:
```
charactername-playername-2026-01-22.json
```

**Example:**
```
Aragorn-Jesse-2026-01-22.json
```

### After Organization
After download, organize with consistent naming:
```
DOWNLOADS FOLDER:
  Aragorn-Jesse-2026-01-22.json
  (PDF browser print dialog -> Save as...)

LOCAL FOLDER:
  MyCharacters/Jesse/Aragorn/
  ├── character-data.json   (renamed from download)
  └── Aragorn-Character-Sheet.pdf  (renamed from print)
```

**Suggested naming**:
- JSON: `character-data.json` (standard for imports)
- PDF: `[CharacterName]-Character-Sheet.pdf` (descriptive)

---

## Best Practices

### ✅ DO

- ✅ Create player folders (organize by player)
- ✅ Create character subfolders (keep files together)
- ✅ Use descriptive character names in folder path
- ✅ Keep README.md with JSON (easy reference)
- ✅ Download complete package (more info)
- ✅ Archive old characters in date folders

### ❌ DON'T

- ❌ Mix different players' characters in one folder
- ❌ Rename character-data.json (breaks imports)
- ❌ Scatter JSON files everywhere
- ❌ Forget which character is which
- ❌ Lose your folder structure

---

## Advanced: Date-Based Archives

### Year-Based Organization
```
MyCharacters/
├── 2025/
│   ├── Campaign1_Dragonslair/
│   │   ├── Jesse_Barbarian/
│   │   │   ├── character-data.json
│   │   │   └── README.md
│   │   └── Sarah_Wizard/
│   │       ├── character-data.json
│   │       └── README.md
│   │
│   └── Campaign2_UnderdarkDelve/
│       ├── Jesse_Rogue/
│       │   ├── character-data.json
│       │   └── README.md
│       └── Sarah_Cleric/
│           ├── character-data.json
│           └── README.md
│
└── 2026/
    └── Campaign3_Waterdeep/
        └── [characters...]
```

### Campaign-Based Organization
```
MyCharacters/
├── Waterdeep_Campaign/
│   ├── Jesse_Ranger/
│   │   ├── character-data.json
│   │   └── README.md
│   └── Sarah_Paladin/
│       ├── character-data.json
│       └── README.md
│
└── Underdark_Campaign/
    └── [characters...]
```

---

## Summary

| Feature | Details |
|---------|---------|
| **Download JSON** | Single file, quick save |
| **Download Package** | JSON auto-downloads + PDF print dialog |
| **Directory Structure** | MyCharacters/Player/Character/ |
| **File Types** | .json (data), .pdf (reference) |
| **Backups** | Local copies safe on computer |
| **Organization** | By player, then character |
| **PDF Printing** | Print-friendly character sheet |
| **Import Ready** | character-data.json ready to upload |

---

## Perfect for Fair Play!

Your characters are now:
- 🔐 **Backed Up**: Safely stored locally
- 📁 **Organized**: Clear folder structure  
- 📋 **Printed**: PDF for reference and table use
- 🔄 **Portable**: Can be imported anywhere
- 💾 **Persistent**: Never lost even if online issues

**Your characters, organized locally with digital and physical copies!** 💾✨
