# AI DM System - Quick Reference Guide

## 🎮 For Users: How to Use the AI DM System

### Starting a Campaign

#### 1. Configure Campaign (DM Only)
Send WebSocket message:
```json
{
  "type": "ai.dm.setup",
  "campaign_name": "Dragon's Hoard",
  "setting": "Kingdom of Silverthorne, 300 years after the Great War",
  "bbeg": "Astraea, Ancient Red Dragon",
  "bbeg_motivation": "Reclaim her stolen hoard from the vault of Kings",
  "themes": ["revenge", "redemption", "political intrigue"],
  "main_chapters": [
    "Rumors of the Dragon's Return",
    "The Heist on the Vault",
    "Dragon's Lair: The Final Confrontation",
    "The New Age"
  ],
  "starting_location": "Tavern in Silverthorne"
}
```

**Result**: Campaign ready, stored in room. DM now sees the AIDMPanel.

---

#### 2. Generate Opening Scenarios (DM Only)
Send WebSocket message:
```json
{
  "type": "ai.dm.new_campaign"
}
```

**Result**: Receive 3 opening scenarios, each with:
- Name + Hook (narrative setup)
- Objective (clear goal)
- MAP_SEED (for map generation)

**Example Scenarios**:
- **Tavern Recruitment**: "A hooded figure slides a mysterious letter into your hand..."
- **Road Ambush**: "Your caravan rounds a bend when crossbow bolts whistle through the canopy!"
- **Festival Heist**: "The artifact is hidden in the Festival Master's tent. Tonight is your only chance..."

---

#### 3. Select Starting Scenario (DM Only)
Send WebSocket message:
```json
{
  "type": "ai.dm.select_scenario",
  "scenario_index": 0
}
```

**Result**: 
- All players load the scenario map
- Fog of War applies if enabled
- Combat doesn't start yet; free exploration phase

---

### Running Combat

#### 4. Initialize Combat (DM Only)
When you want to start combat, send:
```json
{
  "type": "ai.dm.combat_start",
  "actors": [
    {
      "actor_id": "player_001",
      "actor_name": "Thrall the Barbarian",
      "dex_modifier": 2
    },
    {
      "actor_id": "player_002",
      "actor_name": "Mira the Rogue",
      "dex_modifier": 4
    },
    {
      "actor_id": "npc_goblin_001",
      "actor_name": "Goblin Shaman",
      "dex_modifier": 1
    },
    {
      "actor_id": "npc_goblin_002",
      "actor_name": "Goblin Warrior",
      "dex_modifier": 0
    }
  ]
}
```

**What Happens**:
1. AI DM rolls 1d20 + DEX for each actor
2. Initiative sorted from highest to lowest
3. All players see turn order on screen
4. First actor gets highlighted (their turn)

**Example Turn Order**:
1. 🔵 Mira the Rogue (Initiative: 18)
2. 🔵 Thrall the Barbarian (Initiative: 17)
3. 🔴 Goblin Shaman (Initiative: 12)
4. 🔴 Goblin Warrior (Initiative: 8)

---

#### 5. Resolve Actions (During Combat)
Player acts, DM resolves:

```json
{
  "type": "ai.dm.action_resolve",
  "actor_id": "player_001",
  "action": "I swing my longsword at the Goblin Shaman!"
}
```

**What Happens**:
1. AI generates narration: "Your blade whistles through the air, catching the shaman's shoulder!"
2. Turn advances to next actor
3. All players see narration + turn change

**Example Sequence**:
```
Round 1, Turn 1: Mira the Rogue
  → "I draw my dagger and strike from the shadows!"
  → Narration: "Your blade finds an opening in the shaman's defenses!"
  
Round 1, Turn 2: Thrall the Barbarian
  → "I charge the warrior!"
  → Narration: "With a roar, you rush forward, your axe raised high!"

Round 1, Turn 3: Goblin Shaman
  → [AI controls NPC action]
  → "The shaman mutters incantations, casting Fireball!"

Round 1, Turn 4: Goblin Warrior
  → [AI controls NPC action]
  → "The warrior slashes wildly, his blade connecting with your armor!"
```

---

#### 6. End Combat (DM Only)
When combat concludes:

```json
{
  "type": "ai.dm.combat_end",
  "outcome": "The goblins flee in disarray, abandoning their leader's body.",
  "loot": [
    { "item": "Enchanted Dagger +1", "rarity": "uncommon", "value": 250 },
    { "item": "Potion of Healing", "rarity": "common", "value": 50 },
    { "item": "75 gold pieces", "rarity": "gold", "value": 75 }
  ]
}
```

**Result**: 
- Combat ends, tokens stay in place
- Loot appears in DM's loot bags
- Players can distribute items
- Campaign log updated

---

### Campaign Management

#### 7. View Campaign Log (DM Only)
```json
{
  "type": "ai.dm.show_log"
}
```

**Result**: Get formatted campaign summary:
```
## Campaign: Dragon's Hoard
**Setting**: Kingdom of Silverthorne
**BBEG**: Astraea, Ancient Red Dragon

### Main Story Progress
→ Rumors of the Dragon's Return (current)
○ The Heist on the Vault
○ Dragon's Lair: The Final Confrontation
○ The New Age

### Recent Events
- Campaign 'Dragon's Hoard' has begun!
- Scenario 'Tavern Recruitment' selected
- Combat started with 4 actors
- The goblins fled in disarray
```

---

## 🔧 For Developers: Integration Points

### Backend Storage
```python
room.ai_campaign: CampaignState        # Main campaign object
room.ai_combat: CombatState or None    # Current combat or None
room.chosen_scenario: Dict             # Selected scenario
room.current_map_seed: Dict            # MAP_SEED for current location
```

### WebSocket Message Types
All messages broadcast to all players in the room:
- `ai.dm.campaign_ready` - Campaign initialized
- `ai.dm.scenarios` - Scenario options
- `ai.dm.scenario_selected` - Campaign started
- `ai.dm.combat_started` - Combat initialized
- `ai.dm.action_resolved` - Action narrated
- `ai.dm.turn_advanced` - Turn changed
- `ai.dm.combat_ended` - Combat concluded
- `ai.dm.log` - Campaign summary

### Frontend Responsibilities (Phase 5.2)

#### AIDMPanel Component
```tsx
// Display campaign setup form
<AIDMPanel 
  onSetupCampaign={(config) => sendWebSocket("ai.dm.setup", config)}
  onNewCampaign={() => sendWebSocket("ai.dm.new_campaign")}
  onSelectScenario={(index) => sendWebSocket("ai.dm.select_scenario", {scenario_index: index})}
/>
```

#### CombatInitiativeTracker Component
```tsx
// Display turn order and manage combat
<CombatInitiativeTracker
  initiative={combat.initiative_order}
  currentTurnIndex={combat.current_turn_index}
  roundNumber={combat.round_number}
  onResolveAction={(actorId, action) => sendWebSocket("ai.dm.action_resolve", {...})}
/>
```

#### NarrationDisplay Component
```tsx
// Show real-time narration
<NarrationDisplay
  narrations={narrationHistory}
  currentNarration={latestNarration}
  speaker={currentSpeaker}
/>
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     DM Interface (Frontend)                  │
└─────────────────────────────────────────────────────────────┘
                              ↑↓ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                   Message Handlers (Backend)                 │
│  • handle_ai_dm_setup()      • handle_ai_dm_combat_start()  │
│  • handle_ai_dm_new_campaign() • handle_ai_dm_resolve_action()│
│  • handle_ai_dm_select_scenario() • handle_ai_dm_combat_end()│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    AI DM Module (Backend)                    │
│  • CampaignState  • CombatState  • Combat Mechanics         │
│  • Scenario Generation  • Campaign Logging                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Room State (Backend)                      │
│  room.ai_campaign  room.ai_combat  room.current_map_seed    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Broadcast to All Players (WebSocket)            │
│  • Initiative order  • Narration  • Combat state changes    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               Player Displays (All Frontends)                │
│  • Initiative Tracker  • Narration Stream  • Map Updates    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### "No active campaign" error
- DM must send `ai.dm.setup` first
- Campaign must be created before any other AI DM command

### Combat doesn't start
- Actors list must include at least 1 actor
- Each actor must have: `actor_id`, `actor_name`, `dex_modifier`

### Turn order incorrect
- Check DEX modifiers are correct
- Initiative = 1d20 + DEX modifier
- Sorted descending by initiative

### Narration doesn't appear
- Check OpenAI API key is set (`ARCANE_OPENAI_API_KEY`)
- Check `ARCANE_AI_NARRATION_ENABLED=1`
- Placeholder returns "The DM narrates: ..." if not configured

---

## 🎯 Next: OpenAI Integration

To enable full AI narration and map generation:

1. Get OpenAI API key from https://platform.openai.com
2. Set environment variable:
   ```powershell
   $env:ARCANE_OPENAI_API_KEY = "sk-..."
   ```
3. Update in `ai_dm.py`:
   - `generate_narration()` → Call OpenAI GPT-4
   - `generate_map_seed()` → Call OpenAI GPT-4 for JSON

3. Test via `ai.dm.action_resolve` - narration should flow naturally

---

**Status**: Backend complete. Frontend UI coming in Phase 5.2! 🚀
