# 📋 Character Template Guide - Arcane Engine

## Overview

Players can now **plan and prepare their D&D 5e characters ahead of time** using our downloadable templates. Fill them out before the campaign starts, and import them directly into Arcane Engine!

---

## 📥 Available Templates

### 1. **Interactive HTML Form** ⭐ RECOMMENDED
**File**: `character-sheet-template.html`

**Features**:
- ✨ Beautiful, interactive form with live preview
- 🖨️ Print to PDF directly from the browser
- 💾 Auto-saves progress to browser (never lose your work!)
- 📥 Download as JSON file
- 📦 Download complete package (JSON + README)
- ✅ Real-time validation
- 🎨 Professional D&D-themed styling
- 🎲 Roll 4d6 Drop Lowest or apply standard array
- 🎯 Drag-and-drop ability scores (no duplicates!)

**How to Use**:
1. Download `character-sheet-template.html`
2. Open in any web browser
3. Fill out your character details
4. Auto-saves as you type
5. Roll/apply ability scores and assign them
6. Click **"📦 Download Package"** (recommended) or **"📥 Download as JSON"**
7. Save to local folder: `MyCharacters/[PlayerName]/[CharacterName]/`
8. Import into Arcane Engine when ready

**Best For**: Players who want a smooth, professional experience with organized local storage

---

### 2. **JSON Template**
**File**: `character-template.json`

**Structure**:
```json
{
  "player_name": "Your Name",
  "character_name": "Character Name",
  "race": "Human",
  "class_name": "Fighter",
  "background": "Soldier",
  "alignment": "Neutral Good",
  "level": 1,
  "ability_scores": {
    "strength": 15,
    "dexterity": 14,
    // ... more abilities
  },
  "skills": ["Athletics", "Intimidation"],
  "background_story": "...",
  "personality_traits": "...",
  // ... more fields
}
```

**How to Use**:
1. Copy `character-template.json`
2. Edit in any text editor
3. Fill in your character data
4. Save as `my-character.json`
5. Import into Arcane Engine

**Best For**: Players comfortable with JSON/technical formats

---

### 3. **CSV (Spreadsheet)**
**File**: `character-template.csv`

**Format**: Single row with all character data

**How to Use**:
1. Open in Excel, Google Sheets, or any spreadsheet app
2. Fill in the columns for your character
3. Save as `my-character.csv`
4. Import into Arcane Engine

**Best For**: Organized players who like spreadsheets

---

## 🎯 Field Reference

### Basic Information
| Field | Required | Range | Notes |
|-------|----------|-------|-------|
| Player Name | ✅ | Text | Your real name |
| Character Name | ✅ | Text | Your character's name |

### Character Attributes
| Field | Required | Options | Notes |
|-------|----------|---------|-------|
| Race | ✅ | Dragonborn, Dwarf, Elf, Gnome, Half-Elf, Half-Orc, Halfling, Human, Tiefling | Defines racial traits |
| Class | ✅ | Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard | Defines class abilities |
| Background | ✅ | Acolyte, Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan, Hermit, Noble, Outlander, Sage, Sailor, Soldier, Urchin | Adds personality & skill bonuses |
| Alignment | ✅ | 9 alignments (LG, NG, CG, LN, TN, CN, LE, NE, CE) | Guides roleplay decisions |

### Ability Scores
| Ability | Range | Typical Values | Notes |
|---------|-------|-----------------|-------|
| Strength | 3-18 | 15-17 | Melee, Athletics |
| Dexterity | 3-18 | 14-16 | Ranged, Stealth, AC |
| Constitution | 3-18 | 13-15 | Hit Points, Endurance |
| Intelligence | 3-18 | 10-14 | Knowledge, Investigation |
| Wisdom | 3-18 | 10-14 | Perception, Insight |
| Charisma | 3-18 | 8-14 | Persuasion, Deception |

**Standard Array**: 15, 14, 13, 12, 10, 8 (distribute as desired)

### Skills
Select up to 5 proficient skills:
- Acrobatics, Animal Handling, Arcana
- Athletics, Deception, History
- Insight, Intimidation, Investigation
- Medicine, Nature, Perception
- Performance, Persuasion, Religion
- Sleight of Hand, Stealth, Survival

---

## 💡 Tips for Character Creation

### Before You Fill Out the Form

1. **Know Your Role**
   - What does your character DO?
   - Frontline fighter? Sneaky rogue? Wise cleric?
   - This guides Race, Class, and Ability Scores

2. **Plan Your Backstory**
   - Who were you before adventuring?
   - What motivates you?
   - What secrets do you hide?

3. **Choose Ability Scores**
   - Prioritize 1-2 abilities for your class
   - Keep Constitution moderate (more HP)
   - Balance dump stats for personality

4. **Select Meaningful Skills**
   - Choose skills that match your background
   - Pick 1-2 "useful" combat skills
   - Pick 1-2 "roleplay" skills

### Recommended Starting Builds

#### Melee Fighter
- Race: Human or Half-Orc
- Ability Scores: Strength (15), Constitution (14), Dexterity (13)
- Skills: Athletics, Intimidation, Perception

#### Sneaky Rogue
- Race: Halfling or Half-Elf
- Ability Scores: Dexterity (15), Intelligence (14), Constitution (13)
- Skills: Stealth, Sleight of Hand, Perception

#### Wise Cleric
- Race: Human or Dwarf
- Ability Scores: Wisdom (15), Strength (14), Constitution (13)
- Skills: Medicine, Insight, Perception

#### Arcane Wizard
- Race: Elf or Gnome
- Ability Scores: Intelligence (15), Dexterity (14), Constitution (13)
- Skills: Arcana, Investigation, Insight

---

## 📤 Exporting & Organizing Your Character

### From HTML Form (Recommended)

**Option 1: Single JSON Download**
1. Click **"📥 Download as JSON"**
2. File saves as `[CharacterName]-[PlayerName]-[Date].json`
3. Save to your local folder

**Option 2: Complete Package** ⭐ BEST
1. Click **"📦 Download Package (JSON + README)"**
2. Two files download automatically:
   - `character-data.json` (machine-readable data)
   - `README.md` (human-readable reference card)
3. Save both to local folder for complete backup

### Local Organization (Recommended)

After downloading, organize like this:

```
MyCharacters/
├── Jesse/
│   ├── Aragorn/
│   │   ├── character-data.json
│   │   └── README.md
│   └── Legolas/
│       ├── character-data.json
│       └── README.md
└── Sarah/
    └── Galadriel/
        ├── character-data.json
        └── README.md
```

**Benefits**:
- 📁 All characters organized by player
- 🔐 Backed up locally on your computer
- 📖 README gives quick reference card
- 🔄 Ready to import into campaign
- 💾 Safe from website issues

### From Spreadsheet
1. File > Download As > JSON/CSV
2. Send to your DM

### Backup Your Work
- The HTML form **auto-saves to your browser**
- Use browser's "Save Page As" to backup locally
- Export JSON regularly as additional backup
- **Store in organized local folders** (recommended)

---

**See**: `LOCAL_CHARACTER_STORAGE.md` for detailed organization guide!

---

## 🚀 Importing into Arcane Engine

### Step 1: Create Account & Join Game
1. Open Arcane Engine
2. Select "Player" role
3. Enter your name
4. Join the DM's campaign room

### Step 2: Load Your Character
1. Click **"Load Character"** or **"Import Character"**
2. Select your saved JSON file
3. Confirm character details
4. Character loaded and ready to play! ⚔️

---

## ✅ Pre-Campaign Checklist

Before the first session, make sure you have:

- ✅ Character name and concept finalized
- ✅ Ability scores assigned
- ✅ Race and class selected
- ✅ Background story written (2-3 paragraphs minimum)
- ✅ Personality traits identified
- ✅ Ideals and bonds established
- ✅ Character flaws noted (for roleplay depth)
- ✅ Starting equipment listed
- ✅ Skills selected
- ✅ **Downloaded package (JSON + README)**
- ✅ **Organized in local folder** `MyCharacters/[YourName]/[CharacterName]/`
- ✅ Backup copy stored safely
- ✅ Ready to import into campaign

---

## 🎓 Character Building Guide

### Background Story - What to Include

**Good backstories answer**:
- Where were you born?
- Who raised you?
- What was your childhood like?
- What triggered your adventuring journey?
- Do you have any regrets?
- What are your long-term goals?

**Example (Good)**: 
> "I was born in a small farming village in the northern reaches. My family worked the land for generations, but I always felt the call of adventure. When bandits raided our village, I helped organize the defense and realized I had a talent for leadership. Since then, I've been training with the local militia, and when recruiting started for this expedition, I knew it was my moment to make a real difference in the world."

**Example (Better)**:
> "Born to a merchant family in Waterdeep, I grew up surrounded by traders and adventurers. My father pushed me toward business, but I was captivated by my uncle's tales of exploration. When I came of age, I secretly began training with a local sword master. My break came when a rival merchant family burned our warehouse, destroying my father's reputation. Now I adventure to earn enough coin to restore our family name and find those responsible for the fire."

### Personality Traits - Make Them Memorable

- Pick 2-3 distinctive characteristics
- Make them tie to your class/background
- Use them to guide roleplay decisions

**Examples**:
- "I speak in riddles when nervous"
- "I always help those in need, even if it endangers me"
- "I'm obsessed with collecting rare maps"
- "I tap my fingers when thinking (nervous habit)"

### Ideals - Define Your Morality

- What do you believe in?
- What would you die for?
- What would you never do?

**Examples**:
- "Justice: Laws are meant to protect, not control"
- "Loyalty: My friends are my family"
- "Knowledge: Understanding is more valuable than gold"
- "Freedom: No one should be enslaved or oppressed"

### Bonds - Create Connections

- Link yourself to other players or NPCs
- Creates story hooks for DM
- Gives reasons to work together

**Examples**:
- "I owe my life to [other player's character]"
- "I'm searching for my missing sibling"
- "I have a rivalry with [NPC name]"
- "I protect those who cannot protect themselves"

### Flaws - Add Depth and Drama

- Nobody's perfect
- Flaws create roleplay opportunities
- Can lead to interesting consequences

**Examples**:
- "I'm terrified of magic, despite adventuring with wizards"
- "I gamble away my earnings recklessly"
- "I trust easily and am often betrayed"
- "I have a terrible temper and act without thinking"

---

## ❓ FAQ

**Q: Can I edit my character after importing?**  
A: Yes! Your DM can update character details in-game.

**Q: What if I don't know D&D 5e rules?**  
A: The template is simple enough for new players. Your DM will help with rules!

**Q: Can I use an existing character sheet?**  
A: Yes! Fill in our template with data from your existing sheet.

**Q: What if I want to randomize ability scores?**  
A: Roll 4d6 drop lowest for each ability, or use an online roller.

**Q: Can I change my character after the first session?**  
A: Talk to your DM. Usually minor tweaks are OK, major changes need DM approval.

**Q: Do I need to print the character sheet?**  
A: No, but many players like having a printed copy at the table.

---

## 🎮 Ready to Play?

1. **Download a template** (HTML recommended!)
2. **Fill out your character details** (30-60 minutes)
3. **Export your character file** (JSON format)
4. **Send to your DM** (so they can prepare)
5. **Join the campaign room** and load your character
6. **Start adventuring!** ⚔️

---

**Questions? Need Help?**
- Contact your DM with questions about character creation
- Check the [D&D 5e Player's Handbook](https://dnd.wizards.com/) for official rules
- Join our community Discord for help from other players!

**Have fun creating your hero!** 🌟
