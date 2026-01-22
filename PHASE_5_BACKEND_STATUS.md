# ARCANE ENGINE - AI DM BACKEND INTEGRATION GUIDE

## Backend Implementation Status

### ✅ Completed: Phase 5.1 - Backend AI Service

#### New Files Created:
1. **`backend/app/ai_dm.py`** - Core AI DM logic
   - Campaign configuration and state management
   - Combat mechanics (initiative, turns, damage)
   - Opening scenario generation
   - Campaign logging and serialization

#### Updated Files:
1. **`backend/app/message_handlers.py`** - WebSocket handlers
   - `handle_ai_dm_setup()` - Configure campaign
   - `handle_ai_dm_new_campaign()` - Generate scenarios
   - `handle_ai_dm_select_scenario()` - Player chooses scenario
   - `handle_ai_dm_combat_start()` - Initialize combat
   - `handle_ai_dm_resolve_action()` - Resolve player actions
   - `handle_ai_dm_combat_end()` - Conclude combat
   - `handle_ai_dm_show_log()` - Retrieve campaign log

### AI DM Module Structure

#### **Data Models** (`ai_dm.py`)

```python
# Campaign Configuration (provided by DM)
CampaignConfig:
  - name: str
  - setting: str
  - bbeg: str (Big Bad Evil Guy)
  - bbeg_motivation: str
  - themes: List[str]
  - main_chapters: List[str]
  - starting_location: str
  - roll_mode: str ("server" or "player")
  - dark_campaign: bool

# Campaign Persistent State
CampaignState:
  - campaign_id: str (auto-generated)
  - config: CampaignConfig
  - current_chapter: int
  - current_subchapter: int
  - log_entries: List[Dict] (narrative events)
  - npcs_met: Dict[str, Dict] (NPC metadata)
  - locations_discovered: List[str]
  - current_combat: Optional[CombatState]
  - loot_distributed: List[Dict]
  - created_at: str (ISO timestamp)

# Active Combat
CombatState:
  - encounter_id: str
  - initiative_order: List[{actor_id, actor_name, initiative}]
  - current_turn_index: int
  - round_number: int
  - active_effects: Dict[str, List[Effect]]
  - action_used: Dict[str, bool]
  - bonus_action_used: Dict[str, bool]
  - reaction_used: Dict[str, bool]
```

#### **Core Functions** (`ai_dm.py`)

| Function | Purpose |
|----------|---------|
| `generate_opening_scenarios()` | Create 3 distinct starting scenarios with MAP_SEEDs |
| `generate_narration()` | AI-generated narration for player actions (GPT-4) |
| `generate_map_seed()` | Create structured MAP_SEED for new locations |
| `roll_initiative()` | Calculate initiative: 1d20 + DEX modifier |
| `roll_attack()` | Resolve attack roll with advantage/disadvantage |
| `roll_damage()` | Parse damage dice and calculate total |
| `create_combat_state()` | Initialize combat from actors list |
| `get_current_actor()` | Retrieve the current turn's actor |
| `advance_turn()` | Move to next actor, increment rounds as needed |
| `apply_damage()` | Reduce target HP and return result |
| `add_log_entry()` | Record narrative event in campaign |
| `format_log_summary()` | Generate bullet-point campaign summary |
| `create_campaign()` | Initialize new campaign from config |

### WebSocket Message Flow

#### **1. Campaign Setup**

```
Frontend: POST WebSocket
{
  "type": "ai.dm.setup",
  "campaign_name": "Dragon's Hoard",
  "setting": "Kingdom of Silverthorne",
  "bbeg": "Astraea, Ancient Red Dragon",
  "bbeg_motivation": "Reclaim her stolen hoard",
  "themes": ["revenge", "morality"],
  "main_chapters": ["Rumors of Dragon", "Finding the Lair", "Final Confrontation"],
  "starting_location": "Tavern in Silverthorne"
}

Backend: Campaign created in room.ai_campaign

Frontend Receives:
{
  "type": "ai.dm.campaign_ready",
  "campaign_id": "campaign_12345",
  "campaign_name": "Dragon's Hoard",
  "setting": "Kingdom of Silverthorne",
  "bbeg": "Astraea, Ancient Red Dragon"
}
```

#### **2. Generate Opening Scenarios**

```
Frontend: POST WebSocket
{
  "type": "ai.dm.new_campaign"
}

Backend: Generates 3 scenarios

Frontend Receives:
{
  "type": "ai.dm.scenarios",
  "scenarios": [
    {
      "name": "Tavern Recruitment",
      "hook": "A hooded figure...",
      "objective": "Decide whether to read the letter",
      "map_seed": { /* MAP_SEED JSON */ }
    },
    // ... 2 more scenarios
  ]
}
```

#### **3. Select Scenario**

```
Frontend: POST WebSocket
{
  "type": "ai.dm.select_scenario",
  "scenario_index": 0
}

Backend: Stores scenario in room

Frontend Receives (Broadcast to all):
{
  "type": "ai.dm.scenario_selected",
  "scenario_name": "Tavern Recruitment",
  "hook": "A hooded figure slides into the tavern...",
  "objective": "Decide whether to read the letter",
  "map_seed": { /* MAP_SEED */ }
}
```

#### **4. Combat Initialization**

```
Frontend: POST WebSocket
{
  "type": "ai.dm.combat_start",
  "actors": [
    { "actor_id": "pc_001", "actor_name": "Thrall (Player)", "dex_modifier": 2 },
    { "actor_id": "pc_002", "actor_name": "Mira (Player)", "dex_modifier": 1 },
    { "actor_id": "npc_001", "actor_name": "Goblin Shaman", "dex_modifier": 0 },
    { "actor_id": "npc_002", "actor_name": "Goblin Warrior", "dex_modifier": -1 }
  ]
}

Backend: Rolls initiative for all actors, sorts by DEX tiebreaker

Frontend Receives (Broadcast to all):
{
  "type": "ai.dm.combat_started",
  "encounter_id": "enc_xyz",
  "initiative_order": [
    { "actor_id": "pc_001", "actor_name": "Thrall", "initiative": 18 },
    { "actor_id": "pc_002", "actor_name": "Mira", "initiative": 16 },
    { "actor_id": "npc_001", "actor_name": "Goblin Shaman", "initiative": 12 },
    { "actor_id": "npc_002", "actor_name": "Goblin Warrior", "initiative": 8 }
  ],
  "current_turn": { "actor_id": "pc_001", "actor_name": "Thrall", "initiative": 18 },
  "round": 1
}
```

#### **5. Resolve Action**

```
Frontend: POST WebSocket
{
  "type": "ai.dm.action_resolve",
  "actor_id": "pc_001",
  "action": "I swing my longsword at the Goblin Shaman!"
}

Backend: Generates narration, advances turn

Frontend Receives (Broadcast to all):
{
  "type": "ai.dm.action_resolved",
  "actor_id": "pc_001",
  "action": "I swing my longsword at the Goblin Shaman!",
  "narration": "Your blade whistles through the air...",
  "round": 1
}

{
  "type": "ai.dm.turn_advanced",
  "current_turn": { "actor_id": "pc_002", "actor_name": "Mira", "initiative": 16 },
  "round": 1
}
```

#### **6. End Combat**

```
Frontend: POST WebSocket
{
  "type": "ai.dm.combat_end",
  "outcome": "The goblin warband fled in disarray",
  "loot": [
    { "item": "Goblin Dagger", "rarity": "common" },
    { "item": "50 gold pieces", "rarity": "gold" }
  ]
}

Backend: Clears combat state, logs outcome

Frontend Receives (Broadcast to all):
{
  "type": "ai.dm.combat_ended",
  "outcome": "The goblin warband fled in disarray",
  "loot": [ /* loot items */ ]
}
```

#### **7. Retrieve Campaign Log**

```
Frontend: POST WebSocket
{
  "type": "ai.dm.show_log"
}

Backend: Formats campaign history

Frontend Receives:
{
  "type": "ai.dm.log",
  "summary": "## Campaign: Dragon's Hoard\n**Setting**: Kingdom of Silverthorne\n..."
}
```

---

## Integration Points with Existing Systems

### Room Persistence
- Campaign state stored in `room.ai_campaign` (CampaignState object)
- Combat state stored in `room.ai_combat` (CombatState object)
- Scenario choice stored in `room.chosen_scenario` and `room.current_map_seed`

### Token System
- Combat actors linked to existing token IDs
- Actor positions pulled from token positions during combat
- HP tracking can be stored in token metadata

### Loot System
- Combat loot awards populate `room.loot_bags`
- Loot distribution recorded in campaign log
- Loot visibility tied to player/DM view

### Grid System
- MAP_SEEDs reference 100x100 grid coordinates
- Terrain overlays applied via existing grid system
- Objects rendered as sprite placeholders on grid

---

## Placeholder Functions (To Be Integrated with OpenAI)

### `generate_narration()` 
**Status**: Placeholder  
**Integration**: Call OpenAI GPT-4 with:
- System prompt: `SYSTEM_PROMPT` constant
- User message: Action description + context
- Parameters: `temperature=0.8` (creative), `max_tokens=150`

### `generate_map_seed()`
**Status**: Placeholder  
**Integration**: Call OpenAI GPT-4 with:
- Prompt: "Create a MAP_SEED JSON for: [location_name]"
- Parse JSON response
- Validate structure against MAP_SEED schema

---

## Next Steps (Phase 5.2 - Frontend)

1. Create `AIDMPanel.tsx` - DM interface for:
   - Campaign setup form
   - Scenario selector UI
   - Combat initialization UI
   - Action resolver display
   
2. Create `CombatInitiativeTracker.tsx` - Combat UI for:
   - Turn order display
   - Current actor highlight
   - Action input field
   - Round counter

3. Create `NarrationDisplay.tsx` - Narration stream for:
   - Real-time narration messages
   - Speaker attribution
   - Mechanical highlights (rolls, damage, effects)

---

## Testing Checklist

- [ ] Campaign creation stores config correctly
- [ ] Opening scenarios generated with valid MAP_SEEDs
- [ ] Scenario selection broadcasts to all players
- [ ] Combat initialization rolls initiative correctly
- [ ] Turn advancement cycles through actors
- [ ] Action resolution narration generated
- [ ] Combat end clears state
- [ ] Campaign log entries recorded
- [ ] Log summary formatted correctly

---

**Status**: ✅ Backend implementation complete. Ready for frontend integration.
