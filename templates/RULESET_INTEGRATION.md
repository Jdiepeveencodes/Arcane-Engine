# 📚 Ruleset Integration - Character Sheet

## Overview

The character creation sheet now **integrates with the D&D 5e ruleset** to display:
- 🧬 **Racial Ability Bonuses** - Automatic bonuses for selected race
- 🎯 **Class Skill Proficiencies** - Skills your class is proficient in
- 📖 **Live Updates** - Information updates automatically when you change race/class

---

## Features

### 1. Racial Ability Bonuses

When you select a race, the sheet displays automatic ability score bonuses:

**Display:**
```
🧬 Racial Ability Bonuses

┌─────────────┬─────────────┬────────────┐
│ Strength    │ Dexterity   │ Wisdom     │
│    +2       │    +1       │    +1      │
└─────────────┴─────────────┴────────────┘
```

**How It Works:**
1. Select a race from the dropdown
2. System checks ruleset for racial bonuses
3. Displays bonus amounts for relevant abilities
4. Updates live as you change races

**Supported Races:**
- Dragonborn
- Dwarf
- Elf
- Gnome
- Half-Elf
- Half-Orc
- Halfling
- Human
- Tiefling

### 2. Class Skill Proficiencies

When you select a class, the sheet displays class-specific skill proficiencies:

**Display:**
```
🎯 Class Skill Proficiencies

✓ Acrobatics        ✓ Animal Handling
✓ Athletics         ✓ Perception
✓ Stealth           ✓ Survival
```

**How It Works:**
1. Select a class from the dropdown
2. System checks ruleset for proficiencies
3. Displays all skills your class is proficient in
4. Updates live as you change classes

**Supported Classes:**
- Barbarian
- Bard
- Cleric
- Druid
- Fighter
- Monk
- Paladin
- Ranger
- Rogue
- Sorcerer
- Warlock
- Wizard

---

## Display Details

### Racial Bonuses Section

**Location:** Below Race/Class selectors  
**Visibility:** Shows only when race selected + bonuses available  
**Style:** Light orange background (#f9f5f0)  
**Layout:** Grid with up to 3 columns

**Content:**
```
┌─ Ability Name ─┐
│     +X bonus   │
└────────────────┘
```

### Class Proficiencies Section

**Location:** Below Racial Bonuses  
**Visibility:** Shows only when class selected + proficiencies available  
**Style:** Light blue background (#f0f8f5)  
**Layout:** Grid with 2 columns

**Content:**
```
┌─ ✓ Skill Name ─┐
│                │
└────────────────┘
```

---

## Offline Mode

If the ruleset API is not available (offline/disconnected):

**Racial Bonuses Display:**
```
🧬 Racial Ability Bonuses

No bonuses found (offline mode)
```

**Class Proficiencies Display:**
```
🎯 Class Skill Proficiencies

No proficiencies found (offline mode)
```

**User Impact:**
- ✅ Form still works perfectly
- ✅ Can still create characters
- ℹ️ Just won't show ruleset information
- 🔗 Automatically loads when API available

---

## How Ruleset Integration Works

### Backend APIs Used

**1. Fetch Races**
```
GET /api/rules/races?limit=50
```
Returns list of races with:
- name
- description
- ability_bonuses (parsed from data_json)

**2. Fetch Classes**
```
GET /api/rules/classes?limit=50
```
Returns list of classes with:
- name
- description
- skill_proficiencies (parsed from data_json)

### Data Flow

```
1. Page loads
   ↓
2. loadRulesetData() called
   ↓
3. Fetch /api/rules/races
   ↓
4. Store in rulesetData.races
   ↓
5. User selects race
   ↓
6. displayRacialBonuses() called
   ↓
7. Search rulesetData.races for match
   ↓
8. Extract ability bonuses
   ↓
9. Display in UI
```

---

## JavaScript Functions

### Load Ruleset Data

```javascript
async function loadRulesetData()
```
- Called on page load
- Fetches races and classes from API
- Stores in `rulesetData` object
- Handles offline gracefully

### Get Racial Bonuses

```javascript
function getRacialBonuses(raceName)
```
- Input: Race name (string)
- Returns: Object with ability bonuses
- Example: `{ str: 2, dex: 1, wis: 1 }`

### Get Class Proficiencies

```javascript
function getClassProficiencies(className)
```
- Input: Class name (string)
- Returns: Array of skill names
- Example: `["Acrobatics", "Athletics", "Stealth"]`

### Display Racial Bonuses

```javascript
function displayRacialBonuses()
```
- Called when race changes
- Gets bonuses via `getRacialBonuses()`
- Renders UI with bonus display
- Shows/hides section based on availability

### Display Class Proficiencies

```javascript
function displayClassProficiencies()
```
- Called when class changes
- Gets proficiencies via `getClassProficiencies()`
- Renders UI with skill list
- Shows/hides section based on availability

---

## User Workflow

### Step 1: Start Character Creation
```
1. Open character-sheet-template.html
2. Page loads
3. Ruleset data fetches in background
```

### Step 2: Select Race
```
1. Click Race dropdown
2. Select "Elf" (example)
3. Section appears showing:
   - Dexterity +2
   - Intelligence +1
4. Info auto-updates
```

### Step 3: Select Class
```
1. Click Class dropdown
2. Select "Ranger" (example)
3. Section appears showing:
   - ✓ Acrobatics
   - ✓ Animal Handling
   - ✓ Athletics
   - ✓ Perception
   - ✓ Stealth
   - ✓ Survival
4. Info auto-updates
```

### Step 4: Continue Character Creation
```
1. Fill other details (name, abilities, etc.)
2. Racial bonuses and class skills are reference only
3. You assign abilities and skills as desired
4. Download character when complete
```

---

## Features & Characteristics

✅ **Live Updates** - Changes instantly when you select race/class  
✅ **Offline Friendly** - Works without API connection  
✅ **Non-Blocking** - Doesn't prevent form submission if unavailable  
✅ **Clean UI** - Subtle display that doesn't clutter form  
✅ **Professional** - Color-coded sections (orange for race, blue for class)  
✅ **Accessible** - Clear labels and icons  
✅ **Educational** - Helps new players understand D&D 5e mechanics  

---

## Example Scenarios

### Scenario 1: Elf Fighter

```
Race: Elf selected
↓
🧬 Racial Ability Bonuses
┌──────────────┬──────────────┐
│ Dexterity    │ Intelligence │
│     +2       │      +1      │
└──────────────┴──────────────┘

Class: Fighter selected
↓
🎯 Class Skill Proficiencies
✓ Acrobatics          ✓ Animal Handling
✓ Athletics           ✓ Insight
✓ Intimidation        ✓ Perception
✓ Survival
```

### Scenario 2: Dwarf Cleric

```
Race: Dwarf selected
↓
🧬 Racial Ability Bonuses
┌──────────────┬──────────────┐
│ Constitution │ Wisdom       │
│     +2       │      +1      │
└──────────────┴──────────────┘

Class: Cleric selected
↓
🎯 Class Skill Proficiencies
✓ Insight             ✓ Medicine
✓ Persuasion          ✓ Religion
```

### Scenario 3: Offline Mode

```
Race: Human selected
↓
🧬 Racial Ability Bonuses
No bonuses found (offline mode)

Class: Wizard selected
↓
🎯 Class Skill Proficiencies
No proficiencies found (offline mode)

Note: User can still complete character sheet normally!
```

---

## Integration Points

### API Endpoints Used

**1. Races Endpoint**
```
GET /api/rules/races
```
Response includes race data with ability bonuses

**2. Classes Endpoint**
```
GET /api/rules/classes
```
Response includes class data with skill proficiencies

### Data Parsing

**Ability Bonuses Format:**
```json
{
  "str": 0,
  "dex": 2,
  "con": 0,
  "int": 1,
  "wis": 0,
  "cha": 0
}
```

**Skill Proficiencies Format:**
```json
["Acrobatics", "Animal Handling", "Athletics", ...]
```

---

## Limitations & Notes

⚠️ **Offline Mode** - Shows "offline" message if ruleset unavailable  
⚠️ **Display Only** - Information is reference; user must assign abilities/skills  
⚠️ **API Dependent** - Requires backend ruleset data  
⚠️ **No Caching** - Fetches fresh data each page load  

---

## Future Enhancements

Potential improvements:

- 🔄 Cache ruleset data in localStorage
- 🎯 Auto-apply bonuses to ability scores
- ✓ Auto-select proficient skills
- 🔗 Link to full ruleset entries
- 🌍 Support for multiple ruleset versions
- 📱 Mobile-optimized displays

---

## Technical Details

**Dependencies:**
- None (vanilla JavaScript)
- Uses modern fetch API
- Supports async/await

**Browser Compatibility:**
- All modern browsers (ES6+)
- Graceful degradation if API unavailable

**Performance:**
- Fetch happens on page load (non-blocking)
- Display renders instantly on selection
- Minimal DOM manipulation

---

## Summary

Your character sheet now knows D&D 5e rules!

✅ **Automatic bonuses** displayed for races  
✅ **Skill lists** shown for classes  
✅ **Live updates** as selections change  
✅ **Offline safe** - works without API  
✅ **Reference only** - you still control everything  

**Professional ruleset-aware character creation!** 📚🎯
