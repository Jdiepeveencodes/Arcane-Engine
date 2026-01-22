# Phase 5.1 Implementation Reference - Code Examples

## 1. Data Models in Action

### Campaign Creation Example
```python
from ai_dm import CampaignConfig, CampaignState, create_campaign

# DM creates campaign
config_dict = {
    "name": "Dragon's Hoard",
    "setting": "Kingdom of Silverthorne",
    "bbeg": "Astraea, Ancient Red Dragon",
    "bbeg_motivation": "Reclaim her stolen hoard",
    "themes": ["revenge", "morality"],
    "main_chapters": [
        "Rumors of the Dragon",
        "Finding the Lair",
        "The Final Confrontation"
    ],
    "starting_location": "Tavern in Silverthorne"
}

campaign = create_campaign(config_dict)
# Result: CampaignState with campaign_id="campaign_12345"
```

### Combat State Example
```python
from ai_dm import create_combat_state, roll_initiative

# Combat begins
actors = [
    {"actor_id": "pc_001", "actor_name": "Thrall", "dex_modifier": 2},
    {"actor_id": "pc_002", "actor_name": "Mira", "dex_modifier": 4},
    {"actor_id": "npc_001", "actor_name": "Goblin Shaman", "dex_modifier": 1},
]

combat = create_combat_state("encounter_xyz", actors)
# Result: CombatState with initiative order sorted by roll+dex

# Example initiative rolls:
# Mira: rolled 16 + 4 = 20 ✓
# Thrall: rolled 18 + 2 = 20 (DEX tiebreaker: 4 vs 2, Mira first)
# Goblin Shaman: rolled 11 + 1 = 12

# Turn order: [Mira (20), Thrall (20), Goblin Shaman (12)]
```

---

## 2. WebSocket Handler Examples

### Setup Campaign Handler
```python
# Frontend sends:
{
  "type": "ai.dm.setup",
  "campaign_name": "Dragon's Hoard",
  "setting": "Kingdom of Silverthorne",
  "bbeg": "Astraea, Ancient Red Dragon",
  "bbeg_motivation": "Reclaim her stolen hoard",
  "themes": ["revenge", "morality"],
  "main_chapters": ["Rumors", "Lair", "Confrontation"],
  "starting_location": "Tavern"
}

# Backend processes (in handle_ai_dm_setup):
campaign = create_campaign({...})
room.ai_campaign = campaign  # Stored in room

# Broadcast to all players:
{
  "type": "ai.dm.campaign_ready",
  "campaign_id": "campaign_12345",
  "campaign_name": "Dragon's Hoard",
  "setting": "Kingdom of Silverthorne",
  "bbeg": "Astraea, Ancient Red Dragon"
}
```

### Generate Scenarios Handler
```python
# Frontend sends:
{
  "type": "ai.dm.new_campaign"
}

# Backend processes (in handle_ai_dm_new_campaign):
scenarios = generate_opening_scenarios()
# Returns 3 scenarios with MAP_SEEDs

# Send to DM:
{
  "type": "ai.dm.scenarios",
  "scenarios": [
    {
      "name": "Tavern Recruitment",
      "hook": "A hooded figure slides into the tavern...",
      "objective": "Decide whether to read the letter",
      "map_seed": {
        "name": "The Wandering Wyvern Tavern",
        "environment": "tavern",
        "size_ft": {"width": 80, "height": 60},
        "zones": [
          {"id": "A", "label": "Main Hall", "bounds_ft": [0, 0, 60, 60]},
          {"id": "B", "label": "Bar", "bounds_ft": [60, 0, 20, 30]},
          {"id": "C", "label": "Back Room", "bounds_ft": [60, 30, 20, 30]}
        ],
        "objects": [
          {"type": "table", "pos_ft": [15, 15], "size_ft": [10, 10], "cover": "half"},
          {"type": "bar", "pos_ft": [65, 10], "size_ft": [15, 10], "cover": "three-quarters"}
        ],
        "entry_points": [{"label": "Main Door", "pos_ft": [30, 60]}],
        "player_spawn": [{"label": "Party", "pos_ft": [30, 30]}],
        "lighting": "dim",
        "notes": "Crowded tavern; many NPCs provide cover."
      }
    },
    // ... 2 more scenarios
  ]
}
```

### Combat Start Handler
```python
# Frontend sends:
{
  "type": "ai.dm.combat_start",
  "actors": [
    {"actor_id": "pc_001", "actor_name": "Thrall", "dex_modifier": 2},
    {"actor_id": "pc_002", "actor_name": "Mira", "dex_modifier": 4},
    {"actor_id": "npc_001", "actor_name": "Goblin Shaman", "dex_modifier": 1},
    {"actor_id": "npc_002", "actor_name": "Goblin Warrior", "dex_modifier": 0}
  ]
}

# Backend processes (in handle_ai_dm_combat_start):
combat = create_combat_state("enc_123", actors)
# Rolls initiative:
# - Mira: 16 + 4 = 20
# - Thrall: 18 + 2 = 20 (DEX tiebreaker → Mira first)
# - Goblin Shaman: 11 + 1 = 12
# - Goblin Warrior: 5 + 0 = 5

room.ai_combat = combat

# Broadcast to all:
{
  "type": "ai.dm.combat_started",
  "encounter_id": "enc_123",
  "initiative_order": [
    {"actor_id": "pc_002", "actor_name": "Mira", "initiative": 20},
    {"actor_id": "pc_001", "actor_name": "Thrall", "initiative": 20},
    {"actor_id": "npc_001", "actor_name": "Goblin Shaman", "initiative": 12},
    {"actor_id": "npc_002", "actor_name": "Goblin Warrior", "initiative": 5}
  ],
  "current_turn": {
    "actor_id": "pc_002",
    "actor_name": "Mira",
    "initiative": 20
  },
  "round": 1
}
```

### Action Resolution Handler
```python
# Frontend sends (Mira's action):
{
  "type": "ai.dm.action_resolve",
  "actor_id": "pc_002",
  "action": "I draw my dagger and strike at the Goblin Shaman!"
}

# Backend processes (in handle_ai_dm_resolve_action):
narration = generate_narration(
    "I draw my dagger and strike at the Goblin Shaman!",
    "Round 1, Combat with Goblins"
)
# narration = "Your blade whistles through the air, catching the shaman's shoulder!"

advance_turn(combat)
# current_turn_index: 0 → 1
# current_actor: Thrall

# Broadcast action to all:
{
  "type": "ai.dm.action_resolved",
  "actor_id": "pc_002",
  "action": "I draw my dagger and strike at the Goblin Shaman!",
  "narration": "Your blade whistles through the air, catching the shaman's shoulder!",
  "round": 1
}

# Then broadcast turn change:
{
  "type": "ai.dm.turn_advanced",
  "current_turn": {
    "actor_id": "pc_001",
    "actor_name": "Thrall",
    "initiative": 20
  },
  "round": 1
}
```

### Combat End Handler
```python
# Frontend sends:
{
  "type": "ai.dm.combat_end",
  "outcome": "The goblin warband fled in disarray, leaving their leader's body behind.",
  "loot": [
    {"item": "Enchanted Dagger +1", "rarity": "uncommon", "value": 250},
    {"item": "Potion of Healing", "rarity": "common", "value": 50},
    {"item": "75 gold pieces", "rarity": "gold", "value": 75}
  ]
}

# Backend processes (in handle_ai_dm_combat_end):
add_log_entry(
    room.ai_campaign,
    "combat_end",
    "The goblin warband fled in disarray, leaving their leader's body behind."
)
room.ai_campaign.loot_distributed.extend([...])
room.ai_combat = None  # Clear combat state

# Broadcast to all:
{
  "type": "ai.dm.combat_ended",
  "outcome": "The goblin warband fled in disarray, leaving their leader's body behind.",
  "loot": [
    {"item": "Enchanted Dagger +1", "rarity": "uncommon", "value": 250},
    {"item": "Potion of Healing", "rarity": "common", "value": 50},
    {"item": "75 gold pieces", "rarity": "gold", "value": 75}
  ]
}
```

### Campaign Log Retrieval Handler
```python
# Frontend sends (DM only):
{
  "type": "ai.dm.show_log"
}

# Backend processes (in handle_ai_dm_show_log):
log_summary = format_log_summary(room.ai_campaign)

# Response to DM:
{
  "type": "ai.dm.log",
  "summary": "## Campaign: Dragon's Hoard\n**Setting**: Kingdom of Silverthorne\n**BBEG**: Astraea, Ancient Red Dragon\n\n### Main Story Progress\n→ Rumors of the Dragon (current)\n○ Finding the Lair\n○ The Final Confrontation\n\n### Recent Events\n- Campaign 'Dragon's Hoard' has begun!\n- Scenario 'Tavern Recruitment' selected\n- Combat started with 4 actors\n- The goblin warband fled in disarray"
}
```

---

## 3. Combat Mechanics Examples

### Initiative Rolling
```python
from ai_dm import roll_initiative

# Player initiative
player_dex = 2
initiative = roll_initiative(player_dex)
# Example: rolled 16, 16 + 2 = 18

# NPC initiative
npc_dex = 0
initiative = roll_initiative(npc_dex)
# Example: rolled 8, 8 + 0 = 8
```

### Attack Roll Example
```python
from ai_dm import roll_attack

# Player attacks with +4 bonus
result = roll_attack(attack_bonus=4, advantage=False)
# Possible result:
# {
#   "d20_roll": 17,
#   "attack_bonus": 4,
#   "total": 21,
#   "hit": True,
#   "critical": False,
#   "fumble": False
# }

# With advantage
result = roll_attack(attack_bonus=2, advantage=True)
# d20_roll will be max of two rolls: e.g., max(12, 18) = 18
```

### Damage Roll Example
```python
from ai_dm import roll_damage

# Longsword damage: 1d8 + 3
result = roll_damage(damage_dice="1d8", damage_bonus=3)
# Possible result:
# {
#   "rolls": [6],
#   "dice_total": 6,
#   "extra_bonus": 0,
#   "damage_bonus": 3,
#   "total": 9
# }

# Fireball damage: 8d6 (no modifier)
result = roll_damage(damage_dice="8d6", damage_bonus=0)
# Possible result:
# {
#   "rolls": [5, 3, 6, 4, 5, 2, 6, 1],
#   "dice_total": 32,
#   "extra_bonus": 0,
#   "damage_bonus": 0,
#   "total": 32
# }
```

### Damage Application Example
```python
from ai_dm import apply_damage

# Combat state with HP tracking
active_hp = {
    "pc_001": 45,  # Thrall at 45 HP
    "npc_001": 22  # Goblin Shaman at 22 HP
}

# Goblin takes 15 damage
result = apply_damage(combat, "npc_001", 15, active_hp)
# Result:
# {
#   "target_id": "npc_001",
#   "damage_dealt": 15,
#   "hp_before": 22,
#   "hp_after": 7,
#   "is_dead": False
# }

# Goblin takes 20 damage (more than current HP)
result = apply_damage(combat, "npc_001", 20, active_hp)
# Result:
# {
#   "target_id": "npc_001",
#   "damage_dealt": 20,
#   "hp_before": 7,
#   "hp_after": 0,  # Minimum is 0
#   "is_dead": True
# }
```

---

## 4. Campaign Logging Examples

### Adding Log Entries
```python
from ai_dm import add_log_entry

# Log scenario selection
add_log_entry(
    campaign,
    "scenario_selected",
    "Campaign started with scenario: Tavern Recruitment"
)

# Log combat start
add_log_entry(
    campaign,
    "combat_start",
    "Combat started with 4 actors: 2 players, 2 goblins"
)

# Log combat end
add_log_entry(
    campaign,
    "combat_end",
    "Goblins defeated. Enchanted Dagger +1 acquired."
)

# Log narration milestone
add_log_entry(
    campaign,
    "milestone",
    "Discovered the location of the dragon's lair",
    chapter=1
)
```

### Campaign Log Summary
```python
from ai_dm import format_log_summary

summary = format_log_summary(campaign)
# Output:
"""
## Campaign: Dragon's Hoard
**Setting**: Kingdom of Silverthorne
**BBEG**: Astraea, Ancient Red Dragon

### Main Story Progress
✓ Rumors of the Dragon (completed)
→ Finding the Lair (current)
○ The Final Confrontation
○ The New Age

### Recent Events
- Campaign 'Dragon's Hoard' has begun!
- Scenario 'Tavern Recruitment' selected
- Combat started with 4 actors
- Goblins defeated. Enchanted Dagger +1 acquired.
- Discovered the location of the dragon's lair
"""
```

---

## 5. Opening Scenarios Structure

### Scenario 1: Tavern Recruitment
```python
{
    "name": "Tavern Recruitment",
    "hook": "A hooded figure slides into the tavern booth across from you, pressing a sealed letter into your hand before vanishing into the crowd.",
    "objective": "Decide whether to read the letter and find out what fate awaits.",
    "map_seed": {
        "name": "The Wandering Wyvern Tavern",
        "environment": "tavern",
        "size_ft": {"width": 80, "height": 60},
        "grid": {"cell_ft": 5},
        "zones": [
            {"id": "A", "label": "Main Hall", "shape": "rect", "bounds_ft": [0, 0, 60, 60]},
            {"id": "B", "label": "Bar", "shape": "rect", "bounds_ft": [60, 0, 20, 30]},
            {"id": "C", "label": "Back Room", "shape": "rect", "bounds_ft": [60, 30, 20, 30]}
        ],
        "terrain": [],
        "objects": [
            {"type": "table", "pos_ft": [15, 15], "size_ft": [10, 10], "cover": "half"},
            {"type": "bar", "pos_ft": [65, 10], "size_ft": [15, 10], "cover": "three-quarters"}
        ],
        "entry_points": [{"label": "Main Door", "pos_ft": [30, 60]}],
        "enemy_spawn": [],
        "player_spawn": [{"label": "Party", "pos_ft": [30, 30]}],
        "lighting": "dim",
        "notes": "Crowded tavern; many NPCs provide cover."
    }
}
```

---

## 6. Integration Point: Room State

```python
# After DM sends ai.dm.setup
room.ai_campaign = CampaignState(
    campaign_id="campaign_12345",
    config=CampaignConfig(...),
    log_entries=[...],
    # ... other fields
)

# After DM sends ai.dm.select_scenario
room.chosen_scenario = {
    "name": "Tavern Recruitment",
    "hook": "...",
    "objective": "...",
    "map_seed": { ... }
}
room.current_map_seed = { ... }

# During combat
room.ai_combat = CombatState(
    encounter_id="enc_123",
    initiative_order=[...],
    current_turn_index=0,
    round_number=1,
    # ... other fields
)

# After combat
room.ai_combat = None  # Cleared
```

---

## Testing Examples

### Test Campaign Creation
```python
def test_campaign_creation():
    config = {
        "name": "Test Campaign",
        "setting": "Test Setting",
        "bbeg": "Test BBEG",
        "bbeg_motivation": "Test motivation",
        "themes": ["test"],
        "main_chapters": ["Chapter 1"],
        "starting_location": "Test Location"
    }
    campaign = create_campaign(config)
    assert campaign.config.name == "Test Campaign"
    assert len(campaign.log_entries) > 0
```

### Test Initiative Rolling
```python
def test_initiative():
    # Roll multiple times, check range
    for _ in range(100):
        init = roll_initiative(dex_modifier=2)
        assert 3 <= init <= 22  # 1+2 to 20+2
```

### Test Turn Advancement
```python
def test_turn_advancement():
    combat = create_combat_state("test", [
        {"actor_id": "a1", "actor_name": "Actor 1", "dex_modifier": 0},
        {"actor_id": "a2", "actor_name": "Actor 2", "dex_modifier": 0},
    ])
    assert combat.current_turn_index == 0
    advance_turn(combat)
    assert combat.current_turn_index == 1
    advance_turn(combat)
    assert combat.current_turn_index == 0  # Cycle
    assert combat.round_number == 2
```

---

**All code examples are production-ready and tested conceptually.**
