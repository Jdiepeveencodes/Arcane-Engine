# Interactive Items System Implementation Guide

## 🎯 Overview

The **Interactive Items System** adds 6 categories of battlefield objects to Arcane Engine maps, making combat more dynamic, tactical, and memorable. Players can trigger, interact with, and even create custom traps using their environment.

---

## ✅ What Was Added

### 1. System Documentation
- **`INTERACTIVE_ITEMS_SYSTEM.md`** (400+ lines)
  - Complete mechanics for all 6 item categories
  - DM adjudication guide
  - Combat scenario examples
  - Design philosophy

### 2. Backend Module
- **`backend/app/interactive_items.py`** (300+ lines)
  - Interactive item dataclass
  - Item template definitions
  - Damage rolling and parsing
  - Triggering and effect application
  - Improvised trap creation
  - Environmental condition definitions
  - Height and gravity mechanics
  - Narration generation
  - Item generation for MAP_SEEDs

### 3. Updated AI Prompt
- **`AI_DM_SYSTEM_PROMPT.md`** (Updated)
  - Added `interactive_items` to MAP_SEED format
  - 6 item category reference
  - Mechanics summary

---

## 🎮 The 6 Item Categories

### 1. **Flammable Objects** 🔥
Objects that can ignite, explode, or spread fire.

**Examples**: Oil barrels, alcohol kegs, alchemical supplies, tapestries, hay piles

**Mechanics**
- Trigger: Fire, spark, impact, heat
- Damage: 2-3d6 fire
- Zone: 10-15 ft difficult terrain (fire)
- Save: Dexterity (half damage)

**Narration**: "The barrel erupts in flame, scorching everything nearby!"

---

### 2. **Collapsible Structures** 💥
Objects that fall, crush, block, or pin combatants.

**Examples**: Shelves, bookcases, market stalls, chandeliers, scaffolding

**Mechanics**
- Trigger: Shove, force, damage threshold
- Damage: 2-3d8 bludgeoning
- Effect: Prone or restrained
- Terrain: Difficult terrain + cover
- Save: Dexterity (to dodge)

**Narration**: "The shelf crashes down, pinning the goblin beneath wood!"

---

### 3. **Environmental Control Hazards** ⚙️
Objects that change battlefield control via forced movement, isolation, terrain shifts.

**Examples**: Levers, winches, floodgates, portcullis, trapdoors, drawbridges

**Mechanics**
- Trigger: Action or ability check
- Check DC: 10-15
- Effect: Forced movement (10-30 ft), terrain shift, isolation
- Save: Strength or Dexterity (varies)
- Duration: Permanent until reset

**Narration**: "With a wrench of the lever, iron bars slam down!"

---

### 4. **Improvised Traps (Player-Created)** 🎯
Players can create traps dynamically during combat using environment.

**Examples**: Rigged falling crates, oil traps, disguised pits, deadfalls

**Mechanics**
- Setup: 1 action + check (DC 10-15)
- Trigger: 1 action or automatic
- Resolution: Single roll
- Benefit: Advantage if creative

**Narration**: "The rigged crates tumble down in a deafening crash!"

**Adjudication**
```
Setup Phase → Trigger Phase → Resolution Phase
   ↓              ↓                ↓
DM checks    Player describes   Single roll
setup DC     activation         for effect
```

---

### 5. **Height & Gravity Interactions** 🏔️
Verticality creates tactical advantage/disadvantage and falling hazards.

**Examples**: Ledges, balconies, stairs, cliffs, rooftops

**Mechanics**
- Advantage: +1 bonus from higher position
- Disadvantage: -1 penalty from lower position
- Fall Damage: 1d6 per 10 ft fallen
- Ranged Benefit: Advantage for elevated ranged attackers
- Forced Saves: Strength DC save when pushed

**Narration**: "The shove sends him over the railing with a sickening thud!"

---

### 6. **Environmental Status Effects** 🌫️
Terrain that applies **conditions** rather than raw damage.

**Examples**: Smoke, mud, ice, fog, webbing, toxic gas, quicksand

**Mechanics**
- Entry: Make save to avoid condition
- Condition: Obscured, restrained, prone, poisoned, etc.
- Repeat Save: End of turn (if applicable)
- Duration: 1-4 rounds or escape (varies)

**Conditions Reference**
| Terrain | Condition | Save DC | Effect |
|---------|-----------|---------|--------|
| Smoke | Heavily obscured | 12 Wis | Disadvantage on attacks |
| Mud | Restrained | 12 Str | Movement halved |
| Ice | Prone | 12 Dex | Movement halved, risk falling |
| Webbing | Difficult terrain | 12 Str | Can become restrained |
| Toxic Gas | Poisoned | 12 Con | 1d4 damage/round |
| Quicksand | Sinking | 15 Str | Potential death (5 round limit) |

**Narration**: "Smoke fills the chamber, turning silhouettes into shadows!"

---

## 📋 MAP_SEED Integration

### Updated Format

```json
MAP_SEED: {
  "name": "Alchemist's Lab",
  "environment": "dungeon",
  "interactive_items": [
    {
      "id": "item_001",
      "type": "flammable",
      "name": "Oil Barrels",
      "pos_ft": [20, 30],
      "size_ft": [5, 5],
      "damage": "2d6",
      "damage_type": "fire",
      "effect": "lingering fire (10 ft zone)",
      "narration": "The barrels EXPLODE in flame!"
    },
    {
      "id": "item_002",
      "type": "collapsible",
      "name": "Bookshelf",
      "pos_ft": [50, 20],
      "size_ft": [10, 8],
      "damage": "2d8",
      "effect": "prone or restrained",
      "narration": "Books and wood bury everything!"
    }
  ]
}
```

### Automatic Item Generation

When AI generates a map for an environment:
```python
# Example: Generate items for "tavern" environment
items = generate_items_for_environment("tavern", num_items=3)
# Returns: [alcohol kegs, wooden tables, balcony]

# Example: Generate items for "dungeon" environment
items = generate_items_for_environment("dungeon", num_items=3)
# Returns: [oil barrels, portcullis, toxic gas]
```

---

## 🔧 Backend Integration

### Interactive Items Module

Location: `backend/app/interactive_items.py`

**Core Components**
1. `InteractiveItem` dataclass - Represents a single item
2. `ITEM_TEMPLATES` - Stat blocks for each category
3. `parse_and_roll_damage()` - Dice rolling engine
4. `apply_item_effect()` - Apply effects to targets
5. `create_improvised_trap()` - Player-created traps
6. `calculate_fall_damage()` - Height damage calculation
7. `generate_items_for_environment()` - Auto-generate items
8. `generate_narration()` - Create vivid descriptions

### Key Functions

```python
# Check if item triggers
if check_if_triggered(barrel, "fire"):
    effect = apply_item_effect(barrel, ["npc_001", "npc_002"])
    # Returns: {damage, conditions, narration}

# Create improvised trap
trap = create_improvised_trap(
    player_id="pc_001",
    base_object="shelf",
    trap_type="collapse",
    setup_dc=12
)

# Calculate fall damage
damage = calculate_fall_damage(distance_ft=25)
# Returns: "2d6" (2d6 damage for 25 ft fall)

# Check elevation advantage
advantage = check_elevation_advantage(attacker_height=20, defender_height=10)
# Returns: {advantage: True, modifier: +1, ...}
```

---

## 🎯 Usage Examples

### Example 1: Tavern Combat
**Scene**: Party fights mercenaries in a tavern

**Interactive Items Present**
- Alcohol kegs (flammable, 2d6 fire damage)
- Wooden tables (collapsible, 2d8 bludgeoning)
- Balcony 15 ft high (height advantage for archers)

**Player Action**
```
Player: "I want to push the bandit into the keg and light it!"
DM: "Make a Strength check to shove. [Player rolls 16, succeeds]
     The bandit tumbles backward into the keg.
     Now you want to light it? Do you have fire?"
Player: "I'll use my torch!"
DM: "The oil ignites with a WHOOSH. Everyone within 10 feet—make Dexterity saves DC 12.
     The bandit fails and takes 2d6 fire damage. [Rolls 9 damage]
     The mercs are now scattered."
```

### Example 2: Dungeon Encounter
**Scene**: Party fights cultists in a lab filled with alchemical supplies

**Interactive Items Present**
- Volatile chemicals (flammable, 3d6 fire damage, 15 ft zone)
- Shelves (collapsible, 2d8 bludgeoning)
- Toxic gas vent (environmental, poisoned condition)

**Player Strategy**
```
Player 1: "I want to knock the crate into the gas vent"
DM: "Make a Strength check... 14, success! The crate tumbles into the vent opening—
     the toxic gases are sealed but build up pressure..."

Player 2: "I light a torch near it!"
DM: "The pressure releases with a violent EXPLOSION.
     Everyone in the lab makes Dexterity saves DC 13 for 3d6 fire damage.
     The cultists are panicking!"
```

### Example 3: Creative Trap
**Scene**: Party preparing ambush, player creates trap

**Setup**
```
Player: "I want to rig a shelf to drop on enemies"
DM: "Describe how you set it up?"
Player: "I balance it on crates with rope, so it falls when they pass underneath"
DM: "Make an Intelligence check DC 12 to rig it properly"
Player: [Rolls 17, succeeds]

DM: "The trap is set. When enemies run underneath..."
```

**Trigger**
```
Player: "When the first goblin passes, I cut the rope!"
DM: "The shelf CRASHES down! The lead goblin makes a Dexterity save DC 12...
     [Rolls 8, fails]
     He takes 2d8 bludgeoning damage [Rolls 11 total]
     and is knocked prone under the rubble."
```

---

## 🎨 Design Philosophy

### Items Should Be

✅ **Obvious** - Clearly described in scene (part of map seed)  
✅ **Accessible** - Reachable within 1-2 turns of setup  
✅ **Impactful** - Change the battle, not just extra damage  
✅ **Fair** - Work for NPCs too, create dynamic scenarios  
✅ **Fast** - Resolve in 1-2 rolls, narrate in 1 sentence  
✅ **Fun** - Reward creativity, encourage tactical thinking  

### Items Should NOT Be

❌ **Mandatory** - Party shouldn't need items to win  
❌ **Tedious** - Don't require 5 rolls to set up  
❌ **Unbalancing** - Don't let one item win the fight  
❌ **Confusing** - Keep mechanics simple  
❌ **Invisible** - Make them part of scene description  

---

## 📊 Quick Reference Table

| Type | Damage | Trigger | Effect | Save |
|------|--------|---------|--------|------|
| **Flammable** | 2-3d6 fire | Fire/spark | Zone effect | DC 12 Dex |
| **Collapsible** | 2-3d8 bludg | Shove/force | Prone/restrain | DC 12 Dex |
| **Control** | 0 | Action/check | Movement shift | DC 10-15 Str/Dex |
| **Height** | 1-3d6 falling | Push/fall | Positioning | DC 15 Str |
| **Environmental** | 0-1d4/turn | Enter area | Condition | DC 12 varies |
| **Improvised** | Varies | Player setup | Varies | Player-decided |

---

## 🚀 Implementation Status

### ✅ Completed
- [x] System documentation (400+ lines)
- [x] Backend module (300+ lines)
- [x] All 6 item categories implemented
- [x] Narration templates
- [x] Item generation for environments
- [x] Height and gravity mechanics
- [x] Environmental conditions
- [x] Improvised trap framework
- [x] No linter errors

### 🔜 Next Steps
1. Integrate into WebSocket handlers
2. Add to MAP_SEED generation
3. Create UI for item interaction
4. Add particle effects for visuals
5. Create audio cues for triggers

---

## 💡 Advanced Features

### Combo Attacks
```
Player 1: "I light the oil"
Player 2: "I push enemies into the fire"
Result: Oil barrel + forced movement = tactical synergy
```

### Environmental Puzzles
```
DM: "The room is full of toxic gas"
Players: "We need to solve this without taking damage"
Solution: Use collapsible structure to block gas vent
```

### Dynamic Terrain
```
Each item triggered changes battlefield shape:
- Fire spreads → reduces available space
- Collapse creates rubble → provides cover
- Flood gates open → divides party from enemies
```

---

## 📝 Adjudication Tips for DMs

### Keep It Moving
- Don't require unnecessary rolls
- Let players describe actions broadly
- Reserve checks for uncertain outcomes

### Reward Creativity
- Offer advantage if setup is clever
- Allow combinations (oil + fire, shove + fall)
- Don't punish imaginative failures

### Make It Fair
- Let NPCs use items too
- Don't use items just to hurt players
- Create opportunities, not just obstacles

### Add Flavor
- Describe environment vividly
- Use narration templates for consistency
- Make each item feel special

---

## 📚 Files Included

1. **INTERACTIVE_ITEMS_SYSTEM.md** - Complete system documentation
2. **backend/app/interactive_items.py** - Python backend module
3. **AI_DM_SYSTEM_PROMPT.md** (Updated) - AI prompt with items
4. **INTERACTIVE_ITEMS_IMPLEMENTATION.md** - This guide

---

## 🎉 Summary

The Interactive Items System transforms combat from static positioning to **dynamic, environmental storytelling**. Every map now has built-in tactical opportunities that:

- ✅ Reward observation and creativity
- ✅ Encourage teamwork and coordination
- ✅ Create memorable moments
- ✅ Make every combat feel unique
- ✅ Give players agency over their environment

**Status**: ✅ Complete and ready to integrate into maps!

🎲 **Let's make combat more fun!** ✨
