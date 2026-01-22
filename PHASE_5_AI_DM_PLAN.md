# ARCANE ENGINE - AI DM IMPLEMENTATION PLAN

## Overview
Integrate the AI Dungeon Master system into Arcane Engine, enabling real-time AI-driven D&D 5e campaigns with map generation, combat management, and multiplayer synchronization.

---

## Phase 5: AI DM System Implementation

### 5.1: Backend AI Service Integration
**Goal**: Enable backend to communicate with OpenAI API for narration and tactical decisions

**Tasks**:
1. Create `backend/app/ai_dm.py` module
   - Store the system prompt
   - Implement `generate_narration()` for player actions
   - Implement `generate_map_seed()` for encounters
   - Implement `roll_initiative()` and `resolve_action()` for combat

2. Extend `backend/app/ai_service.py`
   - Add GPT-4 integration for complex tactical reasoning
   - Cache system prompt to reduce token usage
   - Implement token counting to respect rate limits

3. Add AI DM WebSocket handlers in `backend/app/message_handlers.py`
   - `ai.dm.setup`: Configure campaign (BBEG, chapters, setting)
   - `ai.dm.new_campaign`: Request opening scenarios
   - `ai.dm.action_resolve`: Narrate player action + resolve mechanics
   - `ai.dm.combat_start`: Initialize combat, roll initiative
   - `ai.dm.map_seed`: Generate MAP_SEED for new encounter
   - `ai.dm.log`: Retrieve campaign log

### 5.2: Frontend AI DM Panel
**Goal**: DM interface for campaign setup, narration, and combat management

**Tasks**:
1. Create `frontend/src/components/AIDMPanel.tsx`
   - Campaign setup form (BBEG, setting, chapters)
   - NEW_CAMPAIGN scenario selector
   - Narration display (read-only text)
   - Initiative tracker (for combat)
   - Action resolver (resolve player actions via AI)
   - MAP command to generate battle maps

2. Create `frontend/src/components/CombatInitiativeTracker.tsx`
   - Display turn order (sorted by initiative + DEX)
   - Show current actor's action options
   - Queue player actions
   - Display combat state (HP, conditions, effects)

3. Create `frontend/src/components/NarrationDisplay.tsx`
   - Real-time narration stream
   - Scroll to latest narration
   - Highlight important mechanics (rolls, damage, effects)
   - Speaker name (DM, NPC, System)

### 5.3: Combat Mechanics Integration
**Goal**: Link AI DM combat decisions to Arcane Engine's token and grid system

**Tasks**:
1. Create combat state tracker
   - Initiative order (player objects + NPC tokens)
   - Current turn actor
   - Action economy (action, bonus action, reaction used)
   - Active conditions and effects (tied to tokens)
   - Hit points (stored in token metadata)

2. Implement combat lifecycle
   - `COMBAT_START`: Create NPC tokens, roll initiative
   - Turn execution: Player acts → AI resolves → next actor
   - Damage application: Reduce token HP, broadcast to all players
   - Death/surrender: Remove token, narrate outcome
   - `COMBAT_END`: Distribute loot, return to exploration

3. Token state updates
   - Position updates for movement (via existing token.move)
   - HP display (token metadata overlay)
   - Status effects (token tooltip or marker)
   - Damage numbers (floating text animation)

### 5.4: Map Generation & Rendering
**Goal**: Generate MAP_SEEDs and render them on the 100x100 grid

**Tasks**:
1. MAP_SEED parsing
   - Create `frontend/src/utils/mapSeedParser.ts`
   - Parse MAP_SEED JSON blocks from narration
   - Extract spawn points, terrain, objects
   - Auto-create NPC tokens at enemy_spawn positions

2. Map image generation
   - When `MAP` command is issued, send MAP_SEED to DALL-E
   - Render generated image on map background
   - Overlay grid, tokens, terrain effects

3. Terrain & object rendering
   - Difficult terrain as texture overlay (darker squares)
   - Hazards (fire, water) as colored overlays with tooltips
   - Objects (pillars, doors) as sprite placeholders
   - Cover indicators (half/three-quarters) on object tooltips

### 5.5: Campaign State Persistence
**Goal**: Save and load campaign progress

**Tasks**:
1. Campaign database schema
   - Table: campaigns (id, room_id, setting, bbeg, main_chapters, subchapters, created_at)
   - Table: campaign_log (id, campaign_id, entry, chapter, timestamp)
   - Table: encounter_history (id, campaign_id, map_name, enemy_types, loot_distributed)

2. Save campaign state
   - Auto-save after each major plot event
   - Save after combat ends
   - Save after chapter milestone

3. Load campaign state
   - On room load, fetch campaign for this room
   - Display current subchapter & plot state
   - Resume at last known position

### 5.6: Testing & Validation
**Goal**: Ensure AI DM behaves correctly and integrates with Arcane Engine

**Tasks**:
1. Unit tests
   - Test narration generation (valid D&D 5e outcomes)
   - Test MAP_SEED parsing (valid JSON structure)
   - Test initiative calculation (correct sorting)
   - Test damage application (correct HP reduction)

2. Integration tests
   - Test combat flow (initiative → turns → resolution)
   - Test map generation and rendering
   - Test WebSocket synchronization of combat state
   - Test multi-player action queueing

3. E2E tests
   - Full campaign: setup → exploration → combat → loot
   - Fog of War with discovery (map fog + NPC under fog)
   - Initiative and turn order accuracy
   - Player/NPC interactions

---

## Technical Architecture

### AI DM Communication Flow

```
Player Action
    ↓
[Frontend: AIDMPanel or Combat UI]
    ↓
WebSocket: ai.dm.action_resolve
    ↓
[Backend: ai_dm.py → OpenAI API]
    ↓
GPT-4 responds with:
  - Narration (1-3 sentences)
  - Mechanics (roll results, damage, effects)
  - Optional MAP_SEED (if new location)
    ↓
[Backend: Parse response, apply effects]
    ↓
Broadcast to all players:
  - Narration message
  - Token updates (HP, conditions, position)
  - New map if applicable
    ↓
[All Clients: Update display, re-render]
```

### Combat State Synchronization

```
DM: COMBAT_START
    ↓
[Backend: Create NPC tokens, calculate initiative]
    ↓
Broadcast: combat_state { turn_order, current_actor, initiative }
    ↓
[All Clients: Display initiative tracker, highlight current actor]
    ↓
Player: "I attack the goblin"
    ↓
[DM/System: Roll attack, narrate hit/miss, resolve damage]
    ↓
Broadcast: token_update { token_id, hp, conditions }
    ↓
[Next actor's turn]
```

---

## Implementation Priority

1. **Phase 5.1 (Backend)**: AI service + WebSocket handlers
2. **Phase 5.2 (Frontend)**: AI DM Panel + Narration Display
3. **Phase 5.3 (Combat)**: Combat mechanics integration + initiative
4. **Phase 5.4 (Maps)**: MAP_SEED rendering + terrain overlays
5. **Phase 5.5 (Persistence)**: Campaign save/load
6. **Phase 5.6 (Testing)**: Full E2E validation

---

## Configuration Options

### Host-Set Parameters
- `ROLL_MODE`: "server" (AI rolls) or "player" (player rolls)
- `COMBAT_AUTO_INITIATIVE`: true (auto-roll) or false (request rolls)
- `MAP_GEN_ENABLED`: true (generate maps) or false (manual maps)
- `DARK_CAMPAIGN`: false (general) or true (mature themes)

### Campaign Settings (SETUP command)
- Campaign name
- Setting description
- BBEG name and motivations
- Main Chapters (plot milestones)
- Desired themes and tone
- Starting location

---

## Success Criteria

✅ DM can configure campaign via SETUP  
✅ NEW_CAMPAIGN generates 3 distinct scenarios with MAP_SEEDs  
✅ Combat initializes, tracks initiative, resolves turns  
✅ Player actions narrated by AI in 1–3 sentences  
✅ Token positions update in real-time during combat  
✅ Maps generate and render with terrain/objects  
✅ Campaign state persists across sessions  
✅ All players see same combat state synchronously  
✅ Fog of War integrates with NPC/enemy visibility  
✅ Loot distribution via Arcane Engine loot system  

---

## Notes for Implementation

- **OpenAI Rate Limiting**: Use exponential backoff and request caching
- **Token Efficiency**: Cache system prompt; use few-shot examples in prompt
- **Error Handling**: If AI generation fails, fall back to templates
- **Latency**: Narration should arrive within 2–3 seconds for smooth play
- **Scalability**: Consider prompt optimization for long campaigns (token buildup)

---

**Ready to revolutionize D&D campaigns!** 🎲✨
