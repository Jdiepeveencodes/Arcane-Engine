# Interactive Items System for Arcane Engine Maps

## Overview

Interactive items are battlefield objects that players and NPCs can use during combat to create dynamic, tactical encounters. Each item has **mechanical effects**, **trigger conditions**, and **narrative descriptions**.

---

## 6 Core Categories

### 1. Flammable Objects

**Definition**: Objects that can ignite, explode, or spread fire.

**Examples**
- Oil barrels
- Alcohol kegs
- Dry crates
- Hanging tapestries
- Alchemical supplies
- Hay piles
- Torches and candles
- Explosive powder kegs

**Mechanical Pattern**

| Aspect | Details |
|--------|---------|
| Trigger | Fire, spark, impact, spell, heat source |
| Effect | Burst damage (2d6 or 3d6) + lingering fire zone |
| Zone Effect | Creates 10-ft radius difficult terrain (fire) |
| Damage Type | Fire |
| Duration | 1d4 rounds (fire spreads then subsides) |
| Save | Dexterity (half damage on success) |
| Adjacent Effect | Nearby flammable objects may catch fire |

**Tactical Use**
- Ranged attack to trigger from distance
- Use against grouped enemies
- Control battlefield positioning
- Create escape routes by burning terrain
- Risk: can damage allies if not careful

**Narration Pattern** (1-2 sentences)
```
"The barrel erupts in flame, scorching everything nearby as fire spreads across the floor."
"Oil ignites with a tremendous WHOOSH, engulfing the chamber in searing heat."
"The tapestry catches fire, collapsing in a shower of embers and ash."
```

**Stat Block Template**
```json
{
  "type": "flammable",
  "name": "Oil Barrel",
  "trigger": ["fire", "spark", "impact"],
  "damage": "2d6",
  "damage_type": "fire",
  "zone_radius_ft": 10,
  "zone_type": "difficult_terrain",
  "duration_rounds": "1d4",
  "save_dc": 12,
  "save_type": "dexterity",
  "on_fail": "full_damage",
  "on_success": "half_damage"
}
```

---

### 2. Collapsible Structures

**Definition**: Objects that fall, crush, block, or pin combatants.

**Examples**
- Shelves / racks
- Bookcases
- Market stalls
- Rotted balconies
- Scaffolding
- Mine supports
- Tavern chandeliers
- Statues
- Wooden frames
- Support beams

**Mechanical Pattern**

| Aspect | Details |
|--------|---------|
| Trigger | Shove, force, damage (20+ HP), failed save |
| Effect | Bludgeoning damage (2d8 or 3d8) |
| Secondary | Target knocked prone or restrained (DC save) |
| Terrain Change | Creates difficult terrain and half cover |
| Duration | Stays collapsed until cleared (bonus action) |
| Save | Dexterity (to dodge) or Strength (to resist) |
| Adjudication | 1 action to trigger, 1 round for effect |

**Tactical Use**
- Block doorways/corridors
- Separate enemies
- Create cover
- Damage multiple enemies
- Control movement
- Trap pursuers

**Narration Pattern** (1-2 sentences)
```
"The shelf crashes down with a deafening CRUNCH, pinning the goblin beneath splintered wood."
"The chandelier swings free from the ceiling, scattering debris and blocking the passage."
"Market stalls topple like dominoes, creating a wall of rubble between you and the archers."
```

**Stat Block Template**
```json
{
  "type": "collapsible",
  "name": "Wooden Shelf",
  "trigger": ["shove", "force", "damage_threshold:20"],
  "damage": "2d8",
  "damage_type": "bludgeoning",
  "secondary_effect": "prone_or_restrained",
  "terrain_created": "difficult_terrain",
  "cover_provided": "half_cover",
  "clear_dc": 10,
  "clear_action": "bonus_action",
  "save_dc": 12,
  "save_type": "dexterity"
}
```

---

### 3. Environmental Control Hazards

**Definition**: Objects that change battlefield control rather than deal raw damage.

**Examples**
- Rope bridges
- Winches
- Floodgates
- Sewer valves
- Portcullis levers
- Trapdoors
- Drawbridges
- Prison cell gates
- Sluice gates
- Mechanical locks

**Mechanical Pattern**

| Aspect | Details |
|--------|---------|
| Trigger | Action or ability check |
| Effect | Repositions combatants, isolates groups, or shifts terrain |
| Check DC | 10-15 (difficulty based) |
| Movement | Forced movement (10-30 ft) |
| Damage | Optional (if violent) |
| Save | Strength or Dexterity (situation-based) |
| Duration | Permanent until reset |
| Strategic Impact | Creates choke points or escape routes |

**Tactical Use**
- Separate enemies from allies
- Create escape routes
- Block reinforcements
- Force vulnerable positioning
- Control resource flow
- Isolate casters or archers

**Narration Pattern** (1-2 sentences)
```
"With a wrench of the lever, iron bars SLAM down, cutting the room in half."
"You trigger the winch—the rope bridge groans and collapses, sending two cultists plummeting."
"The floodgate opens with a terrible rushing sound as water pours in, sweeping enemies downstream."
```

**Stat Block Template**
```json
{
  "type": "control_hazard",
  "name": "Portcullis Lever",
  "trigger": "action",
  "check_dc": 12,
  "check_type": "strength_or_dexterity",
  "effect": "forced_movement",
  "movement_distance_ft": 20,
  "movement_type": "push",
  "creates_terrain": "choke_point",
  "damage_optional": false,
  "strategic_impact": "separates_groups"
}
```

---

### 4. Improvised Traps (Player-Created)

**Definition**: Allow players to create traps using the environment dynamically during combat.

**Examples**
- Tipping a shelf to block a doorway
- Rigging a rope to drop crates on approaching enemies
- Jamming a door with furniture
- Spreading oil before igniting it
- Luring enemies beneath unstable structures
- Disguising pit traps with cloth
- Triggering cave-ins
- Creating deadfall traps

**Adjudication Rules**

| Phase | Time | Requirement |
|-------|------|-------------|
| Setup | 1 action | Describe trap, make check (DC 10-15) |
| Trigger | Situational | Enemy action or position |
| Resolution | 1 round | Single roll to determine effectiveness |
| Benefit | Advantage/Disadvantage | Based on creativity and preparation |

**Success/Failure Results**

**Success**: Full effect (damage, condition, positioning)  
**Partial Success**: Half damage or weaker condition  
**Failure**: Trap doesn't activate, trap may be obvious  

**Narration Pattern** (1-2 sentences)
```
"As the cultists rush forward, the rigged crates tumble down in a deafening CRASH."
"The oil spreads across the floor—you light it, and the entire corner erupts in flames."
"The goblin runs straight into your trap: the shelf comes down, and he's buried beneath it."
```

**Stat Block Template** (For trap created by player)
```json
{
  "type": "improvised_trap",
  "created_by": "player_001",
  "base_object": "wooden_shelf",
  "trap_type": "collapse",
  "setup_dc": 12,
  "setup_action_cost": 1,
  "trigger_condition": "enemy_passes_point",
  "trigger_point": [45, 50],
  "damage": "2d8",
  "damage_type": "bludgeoning",
  "effect": "prone",
  "effect_dc": 12,
  "activation_cost": 1,
  "narration": "As the goblin runs past, the shelf collapses on top of him."
}
```

**Player Creativity Examples**
- "I use a rope and the chandelier to create a swinging trap"
  - Damage: 2d6 bludgeoning
  - Effect: Knocked back 10 ft
  - Situational: Only works once, chandelier breaks after

- "I pour oil around the room and set it on fire"
  - Creates difficult terrain
  - 1d6 fire damage for entering area
  - Lasts until extinguished

- "I collapse the scaffolding on top of them"
  - Damage: 3d8 bludgeoning
  - Effect: Restrained until they escape (DC 12 Strength)
  - One-time use, scaffolding destroyed

---

### 5. Height & Gravity Interactions

**Definition**: Verticality matters—height advantage provides tactical benefits and falling poses risks.

**Examples**
- Ledges (10-30 ft high)
- Stairs (multi-level combat)
- Ladders (slow vertical movement)
- Balconies (ranged advantage)
- Rooftops (high ground)
- Cliffs (extreme fall distance)
- Bridges (hazardous crossing)
- Catwalks (narrow high passages)

**Mechanical Effects**

| Scenario | Effect | Advantage |
|----------|--------|-----------|
| Attack from above | +1 to hit (high ground) | Attacker |
| Attack from below | -1 to hit (disadvantage) | Defender (elevated) |
| Ranged advantage | No penalty for range | Elevated ranged attacker |
| Falling 10 ft | 1d6 damage | None |
| Falling 20 ft | 2d6 damage | None |
| Falling 30+ ft | 3d6+ damage | None |
| Push over edge | Forced saving throw | Trigger (Strength DC save) |
| Forced movement | Can trigger fall | Opportunity for control |

**Tactical Use**
- Control high ground (better defense and attack)
- Push/shove enemies off ledges
- Use stairs for difficult terrain
- Ranged characters should occupy high positions
- Fall damage can defeat weakened enemies
- Create vertical chokepoints

**Narration Pattern** (1-2 sentences)
```
"The shove sends him over the railing—he vanishes with a sickening thud, crashing 20 feet below."
"You leap down from the rafters, landing behind the enemies with the element of surprise."
"The archers on the balcony have the high ground—arrows rain down from above."
```

**Stat Block Template**
```json
{
  "type": "height_hazard",
  "name": "Balcony",
  "height_ft": 20,
  "elevation_bonus": 1,
  "elevation_penalty_below": -1,
  "fall_damage_per_10ft": "1d6",
  "access": ["stairs", "ladder"],
  "tactical_advantage": "high_ground",
  "ranged_benefit": true,
  "melee_penalty_from_below": true
}
```

---

### 6. Environmental Status Effects

**Definition**: Terrain that applies **conditions** rather than raw damage, creating tactical challenges.

**Examples**
- Smoke (heavily obscured, disadvantage on perception)
- Mud (restrained on failed save)
- Ice (prone on failed save)
- Fog (lightly obscured, vision impaired)
- Webbing (difficult terrain, restrained on fail)
- Quicksand (gradually sinking, restrained, potential drowning)
- Toxic gas (poisoned, damage at end of turn)
- Cursed ground (frightened, negation effects)
- Slime (difficult terrain, grappled on fail)

**Mechanical Effects**

| Terrain | Effect | Entry Trigger | Duration |
|---------|--------|---------------|----------|
| Smoke | Heavily obscured (disadvantage on attacks) | Auto | 1d4 rounds or until cleared |
| Mud | Restrained on fail (DC 12 Strength save) | On enter | Until exit or escape |
| Ice | Prone on fail (DC 12 Dexterity save) | On enter or movement | Until stand up |
| Fog | Lightly obscured (no advantage/disadvantage) | Auto | Permanent until cleared |
| Webbing | Difficult terrain, restrained on fail (DC 12 Strength save) | On enter | Until destroyed/escaped |
| Quicksand | Sinking (restrained at start, potential death) | On enter | Permanent (escape DC 15) |
| Toxic gas | Poisoned (1d4 damage at end of turn) | Inhalation | Until exit zone |
| Cursed ground | Frightened (DC 12 Wisdom save) | On enter | Until leave area |

**Save & Repeat**

- Initial save when entering area
- Repeat save at **end of turn** if applicable
- Success = no condition or condition ends
- Failure = condition persists

**Adjudication**

```
Round 1: Enemy enters smoke cloud
  → Make Wisdom save DC 12 (to avoid obscured penalty)
  → On fail: disadvantage on attacks this round
  
Round 2: Enemy still in smoke
  → Repeat save at end of turn
  → Success: disadvantage ends
  → Failure: disadvantage continues
```

**Narration Pattern** (1-2 sentences)
```
"Smoke fills the chamber, turning silhouettes into shadows."
"Your feet slip on the ice—you struggle to maintain your footing."
"The webbing constricts around you, pulling you down into the sticky strands."
```

**Stat Block Template**
```json
{
  "type": "environmental_effect",
  "name": "Smoke Cloud",
  "condition": "heavily_obscured",
  "entry_trigger": true,
  "save_dc": 12,
  "save_type": "wisdom",
  "save_on_fail": "heavily_obscured",
  "repeat_save": "end_of_turn",
  "visibility": "disadvantage_on_attacks",
  "duration": "1d4_rounds",
  "clear_action": "strong_wind_or_spell",
  "effect_damage": 0
}
```

---

## Integration with MAP_SEED

### Updated MAP_SEED Format

```json
MAP_SEED: {
  "name": "Alchemist's Lab",
  "environment": "dungeon",
  "size_ft": {"width": 80, "height": 60},
  "interactive_items": [
    {
      "id": "item_001",
      "type": "flammable",
      "name": "Alchemical Supplies",
      "pos_ft": [20, 30],
      "size_ft": [5, 5],
      "trigger": ["fire", "spark"],
      "damage": "2d6",
      "damage_type": "fire",
      "zone_radius_ft": 15,
      "narration": "The alchemical supplies EXPLODE in a burst of multi-colored flame!"
    },
    {
      "id": "item_002",
      "type": "collapsible",
      "name": "Bookcase",
      "pos_ft": [50, 20],
      "size_ft": [10, 8],
      "damage": "2d8",
      "damage_type": "bludgeoning",
      "effect": "prone",
      "narration": "The bookcase crashes down, burying everything beneath it."
    },
    {
      "id": "item_003",
      "type": "control_hazard",
      "name": "Winch",
      "pos_ft": [75, 40],
      "size_ft": [3, 3],
      "check_dc": 12,
      "effect": "forced_movement",
      "movement_distance_ft": 20,
      "narration": "The winch groans—the gate slams down with a metallic CLANG."
    },
    {
      "id": "item_004",
      "type": "height_hazard",
      "name": "Chandelier",
      "pos_ft": [40, 50],
      "size_ft": [5, 5],
      "height_ft": 15,
      "fall_damage": "1d6",
      "narration": "The chandelier sways overhead, a deadly weapon waiting to drop."
    },
    {
      "id": "item_005",
      "type": "environmental_effect",
      "name": "Toxic Gas Vent",
      "pos_ft": [30, 15],
      "size_ft": [10, 10],
      "condition": "poisoned",
      "save_dc": 12,
      "damage_per_turn": 1,
      "narration": "Toxic gas hisses from the vent, filling the chamber with noxious fumes."
    }
  ]
}
```

---

## DM Adjudication Guide

### Player Interaction with Items

**Player Action**
```
"I want to shove the goblin into that flammable barrel."
```

**DM Resolution** (30 seconds max)
1. Determine if action is possible (is it adjacent? Is barrel accessible?)
2. Make appropriate check if needed (Strength for shove, Dexterity for ranged trigger)
3. Apply effect if successful
4. Narrate outcome

**Example**
```
Player: "I shove the goblin into the oil barrel."
DM: "Make a Strength check... 14, good! The goblin tumbles backward—he's now in contact with the barrel. As it tips over, oil spills everywhere. What do you do?"
Player: "I light it on fire with my torch."
DM: "The oil IGNITES—everyone within 10 feet takes 2d6 fire damage. Make Dexterity saves. The goblin fails—he takes full damage and is now on fire!"
```

### Complexity & Spotlight

**Keep It Fast**
- Don't require unnecessary rolls
- Narrate environment but move quickly
- Give players control of their creativity
- Reserve DM adjudication for edge cases

**Provide Opportunities**
- Highlight interactive items in initial description
- Encourage player imagination
- Reward tactical thinking
- Don't punish creative failure—adjust difficulty instead

### Safety Valves

**If interaction seems OP:**
- Add DC to activation
- Require multiple setup actions
- Limit duration or effect size
- Make failure interesting ("Now they know you're here")

**If interaction seems weak:**
- Offer advantage if creative
- Combo with other effects
- Allow reroll if DM feels miscalculated

---

## Examples: Combat Scenarios

### Scenario 1: Tavern Brawl
**Interactive Items Present**
- Flammable: Alcohol kegs (damage 2d6 fire, 10-ft zone)
- Collapsible: Wooden tables (damage 2d8 bludgeoning, creates difficult terrain)
- Height: Balcony 15 ft up (advantage for ranged)

**Combat Flow**
```
Round 1: Enemies charge
  → Rogue shoves enemy toward keg
  → Barbarian lights keg with torch
  → 3 enemies in area take 2d6 fire damage
  
Round 2: Enemies scatter
  → Fighter pushes table to create barrier
  → Creates difficult terrain between party and archers
  → Archers now have disadvantage from height
  
Result: Party controls terrain, enemies fragmented
```

### Scenario 2: Alchemist's Lab
**Interactive Items Present**
- Flammable: Volatile chemicals (damage 3d6 fire, 15-ft explosion)
- Environmental: Toxic gas vent (poisoned condition, 1d4 damage/round)
- Collapsible: Shelves (damage 2d8 bludgeoning)

**Combat Flow**
```
Round 1: Caster tries to reach chemicals
  → Rogue intercepts
  → Caster moves to toxic vent (failed save, poisoned)
  
Round 2: Caster continues
  → Fighter pushes caster into shelves (collapsible)
  → Damage 2d8, now restrained by rubble
  
Round 3: Caster still poisoned, restrained
  → Takes 1d4 poison damage at turn end
  → Must use action to escape restraint
  
Result: Caster neutralized for 3 rounds, chemistry of combat changes every round
```

### Scenario 3: Mineshaft Encounter
**Interactive Items Present**
- Collapsible: Mine supports (damage 3d8, creates chokepoint)
- Height: Various ledges 20-30 ft (fall damage 2d6-3d6)
- Control: Pulley system (forced movement 25 ft)
- Environmental: Debris field (difficult terrain)

**Player Strategy**
```
Ranger: "I want to shoot the supports to cause a cave-in."
DM: "Smart! Make a ranged attack against DC 12. The target is large and stationary, so you have advantage."

Ranger rolls: 16 (hit!)

DM: "The support CRACKS. The ceiling groans and collapses—everyone in the area makes Dexterity saves DC 14. Those who fail take 3d8 damage. Those who succeed take half. The now-blocked corridor becomes difficult terrain and half-cover."

Result: Enemies separated, reinforcements blocked, tactical control achieved
```

---

## Design Philosophy

**Interactive Items Should Be**
- ✅ **Obvious** - Clearly described in initial scene
- ✅ **Accessible** - Reachable within 1-2 turns of setup
- ✅ **Impactful** - Change the battle, not just deal extra damage
- ✅ **Fair** - Work for enemies too (create dynamic scenarios)
- ✅ **Fast** - Resolve in 1-2 rolls, narrate in 1 sentence
- ✅ **Fun** - Reward creativity, punish carelessness

**Interactive Items Should NOT Be**
- ❌ **Mandatory** - Party shouldn't need items to win
- ❌ **Tedious** - Don't require 5 rolls to set up
- ❌ **Unbalancing** - Don't let one item win the fight
- ❌ **Confusing** - Keep mechanics simple
- ❌ **Invisible** - Make them part of the scene description

---

## Quick Reference: Mechanics by Type

| Type | Damage | Effect | Trigger | DC |
|------|--------|--------|---------|-----|
| **Flammable** | 2-3d6 fire | Zone effect (difficult terrain) | Fire/spark | 12 Dex save |
| **Collapsible** | 2-3d8 bludgeoning | Prone/restrained | Shove/force | 12 Dex save |
| **Control** | 0 (optional) | Forced movement, isolation | Action/check | 10-15 |
| **Height** | 1-3d6 falling | None (condition of position) | Push/fall | 15 Str save |
| **Environmental** | 0-1d4 per turn | Condition (restrained, poisoned, etc.) | Enter area | 12 save |
| **Improvised** | Varies | Varies | Player-created | Player-decided |

---

## Summary

Interactive items transform combat from "stand and hit things" to "use the environment tactically." They reward:
- Observation (noticing items in description)
- Creativity (combining items in novel ways)
- Teamwork (coordinating item usage)
- Positioning (standing near useful objects)

**Result**: More memorable, fun, and dynamic D&D combat! 🎲
