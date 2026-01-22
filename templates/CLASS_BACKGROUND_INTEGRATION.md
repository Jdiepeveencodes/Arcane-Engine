# 📚 Enhanced Ruleset Integration - Class & Background Attributes

## Overview

The character sheet now displays **three layers of ruleset information**:
- 🧬 **Racial Ability Bonuses** - From race selection
- 🎯 **Class Information** - Features and skill proficiencies
- 📖 **Background Details** - Skills, languages, and equipment

---

## Features

### 1. Class Information Display

When you select a class, displays:

**Class Features:**
```
⚔️ Class Features
Hit Die: d8
Saving Throws: Strength, Constitution
```

**Skill Proficiencies:**
```
🎯 Skill Proficiencies
✓ Acrobatics        ✓ Athletics
✓ Insight           ✓ Perception
```

**Classes Supported:**
- Barbarian, Bard, Cleric, Druid, Fighter
- Monk, Paladin, Ranger, Rogue, Sorcerer
- Warlock, Wizard

### 2. Background Attributes Display

When you select a background, displays:

**Background Details:**
```
📚 Skill Proficiencies
✓ Deception
✓ Stealth

🗣️ Languages
• Thieves' cant

🎒 Starting Equipment
Crowbar, dark common clothes, 15 gp
```

**Backgrounds Included:**
- Acolyte, Charlatan, Criminal, Entertainer
- Folk Hero, Guild Artisan, Hermit, Noble
- Outlander, Sage, Sailor, Soldier, Urchin

---

## Display Sections

### Section 1: Racial Bonuses
```
Location: Below race/class dropdowns
Style: Light orange background (#f9f5f0)
Shows: Ability score bonuses
Visible: When race selected
```

### Section 2: Class Information
```
Location: Below racial bonuses
Style: Light blue background (#f0f8f5)
Shows: Hit die, saving throws, skill proficiencies
Visible: When class selected
```

### Section 3: Background Details
```
Location: Below class information
Style: Light tan background (#faf8f3)
Shows: Skills, languages, equipment
Visible: When background selected
```

---

## Background Details Included

### Acolyte
- **Skills:** Insight, Religion
- **Languages:** One of your choice
- **Equipment:** Holy symbol, prayer book, 5 gp

### Charlatan
- **Skills:** Deception, Sleight of Hand
- **Languages:** Thieves' cant
- **Equipment:** Fine clothes, disguise kit, 15 gp

### Criminal
- **Skills:** Deception, Stealth
- **Languages:** Thieves' cant
- **Equipment:** Crowbar, dark common clothes, 15 gp

### Entertainer
- **Skills:** Acrobatics, Performance
- **Languages:** One of your choice
- **Equipment:** Costume, musical instrument, 15 gp

### Folk Hero
- **Skills:** Animal Handling, Survival
- **Languages:** One of your choice
- **Equipment:** Artisan's tools, shovel, 10 gp

### Guild Artisan
- **Skills:** Insight, Persuasion
- **Languages:** One of your choice
- **Equipment:** Artisan's tools, guild documents, 15 gp

### Hermit
- **Skills:** Medicine, Religion
- **Languages:** One of your choice
- **Equipment:** Scroll case, winter blanket, common clothes, 5 gp

### Noble
- **Skills:** Insight, Persuasion
- **Languages:** One of your choice
- **Equipment:** Fine clothes, signet ring, scroll of pedigree, 25 gp

### Outlander
- **Skills:** Athletics, Survival
- **Languages:** One of your choice
- **Equipment:** Bedroll, rope, 50 feet, common clothes, 10 gp

### Sage
- **Skills:** Arcana, History
- **Languages:** Two of your choice
- **Equipment:** Bottle of black ink, quill, small knife, letter book, 10 gp

### Sailor
- **Skills:** Athletics, Perception
- **Languages:** One of your choice
- **Equipment:** Belaying pin (club), silk rope (50 ft), lucky charm, common clothes, 10 gp

### Soldier
- **Skills:** Athletics, Intimidation
- **Languages:** One of your choice
- **Equipment:** Insignia of rank, gaming set, common clothes, 10 gp

### Urchin
- **Skills:** Sleight of Hand, Stealth
- **Languages:** Thieves' cant
- **Equipment:** Small knife, map of city streets, pet mouse, token to remember parents, 10 gp

---

## Complete Information Flow

### Race Selection
```
Select Race: "Elf"
↓
Display Shows:
🧬 Racial Ability Bonuses
Dexterity +2
Intelligence +1
```

### Class Selection
```
Select Class: "Ranger"
↓
Display Shows:
⚔️ Class Features
Hit Die: d10
Saving Throws: Strength, Dexterity

🎯 Skill Proficiencies
✓ Acrobatics
✓ Animal Handling
✓ Athletics
✓ Insight
✓ Perception
✓ Stealth
✓ Survival
```

### Background Selection
```
Select Background: "Criminal"
↓
Display Shows:
📚 Skill Proficiencies
✓ Deception
✓ Stealth

🗣️ Languages
• Thieves' cant

🎒 Starting Equipment
Crowbar, dark common clothes, 15 gp
```

---

## JavaScript Functions

### Get Class Attributes
```javascript
function getClassAttributes(className)
```
Returns:
- hit_die: The d6, d8, d10, or d12
- saving_throws: Array of saving throw proficiencies
- class_features: Array of feature names

### Get Background Attributes
```javascript
function getBackgroundAttributes(backgroundName)
```
Returns:
- skill_proficiencies: Array of skills
- languages: Array of languages
- equipment: String of starting equipment

### Display Class Info
```javascript
function displayClassProficiencies()
```
- Called when class changes
- Shows hit die, saving throws, skill proficiencies
- Automatically formatted and styled

### Display Background Info
```javascript
function displayBackgroundAttributes()
```
- Called when background changes
- Shows skills, languages, equipment
- Automatically formatted and styled

---

## Offline Mode

All three layers work in offline mode:

**Racial Bonuses:** ✅ Hardcoded in template  
**Class Info:** ✅ Hardcoded in template  
**Background Info:** ✅ Fully hardcoded with all 13 backgrounds

```
No API needed!
Works completely offline.
All information available locally.
```

---

## User Workflow

### Step 1: Character Basics
```
1. Select Race (see bonuses)
2. Select Class (see features & skills)
3. Select Background (see details)
4. All information displays live
```

### Step 2: Use Information
```
1. See racial ability bonuses
   → Add to ability scores
2. See class skill proficiencies
   → Select appropriate skills
3. See background details
   → Understand starting equipment & languages
```

### Step 3: Complete Form
```
1. Fill remaining details
2. Roll/assign ability scores
3. Download character
4. Share with DM
```

---

## UI/UX Details

### Color Coding

**Racial Bonuses:** Light orange (#f9f5f0)  
```
Easy to distinguish: "These are racial bonuses"
```

**Class Info:** Light blue (#f0f8f5)  
```
Easy to distinguish: "These are class features"
```

**Background Info:** Light tan (#faf8f3)  
```
Easy to distinguish: "These are background details"
```

### Icons Used

- 🧬 = Racial traits
- 🎯 = Class skills
- ⚔️ = Class features
- 📚 = Background skills
- 🗣️ = Languages
- 🎒 = Equipment

### Responsive Layout

- ✅ Desktop: All sections visible
- ✅ Tablet: Stacked sections
- ✅ Mobile: Expandable sections
- ✅ All sizes: Information clear and readable

---

## Features & Characteristics

✅ **Three-Layer Information** - Race, class, and background details  
✅ **Live Updates** - Changes instantly when selections change  
✅ **Completely Offline** - Works with zero API calls needed  
✅ **Comprehensive Data** - All 13 backgrounds fully detailed  
✅ **Clean UI** - Color-coded and organized  
✅ **Professional** - D&D 5e authentic information  
✅ **Educational** - Teaches game mechanics  
✅ **Non-Blocking** - Doesn't interfere with form  

---

## Example: Dwarf Cleric from Temple

```
RACE SELECTION: Dwarf
🧬 Racial Ability Bonuses
Constitution +2
Wisdom +1

CLASS SELECTION: Cleric
⚔️ Class Features
Hit Die: d8
Saving Throws: Wisdom, Charisma

🎯 Skill Proficiencies
✓ Insight
✓ Medicine
✓ Persuasion
✓ Religion

BACKGROUND SELECTION: Acolyte
📚 Skill Proficiencies
✓ Insight
✓ Religion

🗣️ Languages
• One of your choice

🎒 Starting Equipment
Holy symbol, prayer book, 5 gp

CHARACTER KNOWS:
- Constitution naturally high (dwarf bonus)
- Can heal & support (cleric)
- Religious background fits cleric
- Start with holy symbol
```

---

## Benefits for Players

### New Players
- Learn D&D 5e mechanics instantly
- See what each choice provides
- Understand synergies (dwarf cleric, elf ranger, etc.)

### Experienced Players
- Quick reference while creating
- Confirm details they know
- Optimize character builds

### DMs
- Can see what players have
- Quick reference for balance
- Understand character capabilities

---

## Technical Implementation

**No API Required:**
- All data is hardcoded
- Works offline completely
- No network calls needed
- Fast instant display

**Simple Logic:**
- Lookup by name
- Display formatted data
- Show/hide sections
- Minimal JavaScript

**Graceful Display:**
- Only show when selected
- Hide when not relevant
- Professional formatting
- Easy to read

---

## Summary

Your character sheet is now a complete **D&D 5e reference tool**:

✅ **Race bonuses** displayed automatically  
✅ **Class features** shown with hit die and saves  
✅ **Class skills** listed for quick reference  
✅ **Background skills** included  
✅ **Languages** shown by background  
✅ **Equipment** provided for each background  

**Comprehensive character creation with built-in D&D 5e rules!** 📚✨

Perfect for new and experienced players alike!
