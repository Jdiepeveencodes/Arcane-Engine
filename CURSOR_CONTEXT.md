# Arcane Engine - Project Context for Cursor

## Project Overview
**Arcane Engine** is a D&D 5e campaign management system with real-time collaboration, loot distribution, character sheets, and interactive maps.

**Stack**: 
- Backend: Python FastAPI + SQLite
- Frontend: React + TypeScript + Vite + Pixi.js (maps)
- Protocol: WebSocket for real-time sync

**Location**: `c:\Users\jesse\Desktop\Coding-Dev\Projects\PortfolioGame\arcane-engine\dnd-console`

---

## Current Status

### ✅ Phase 2: COMPLETE
Refactoring work finished with zero regressions:
- Extracted message handlers to dedicated module
- Refactored WebSocket dispatcher 
- Split frontend hooks
- Updated all component imports
- Comprehensive regression testing

### ✅ Phase 3: COMPLETE (Map System & Loot)
**Completed**:
- ✅ Interactive map with Pixi.js rendering
- ✅ Token system (Player, NPC, Object types) with drag-and-drop
- ✅ Fog of War with player discovery tracking
- ✅ Real-time token movement sync across all players
- ✅ Vision-based fog carving with 5e darkvision rules
- ✅ Player View toggle for DM to see discovered areas only
- ✅ Loot generation system with configurable filters
- ✅ Loot distribution with drag-and-drop to players
- ✅ Inventory synchronization across players

**Test Report**: `PHASE_3_TEST_REPORT.md`

### 🟡 Phase 4: IN-PROGRESS (AI & Map Expansion)
**Goal**: Add AI DM features and expand map capabilities

**Completed**:
- ✅ Map expansion from 50x50 to 100x100 grid
- ✅ AI service layer (ai_service.py)
- ✅ OpenAI integration for narration & map generation
- ✅ WebSocket handlers for AI requests
- ✅ REST API endpoints for AI features
- ✅ AIPanel UI component for DM

**Features**:
- 🤖 **AI Narration Generation**: Generate vivid scene descriptions (epic, mysterious, comedic, dark, hopeful)
- 🗺️ **AI Map Generation**: Generate dungeon/location maps using DALL-E
- ⚙️ **Configuration**: Environment variable setup for OpenAI API key
- 📡 **Real-time Sync**: Narration and maps broadcast to all players

**Next**:
1. Combat initiative tracking
2. Advanced map features (walls, obstacles)
3. Environmental effects

### 🟡 Phase 5: IN-PROGRESS (AI DM System)
**Goal**: Implement AI Dungeon Master with combat mechanics and campaign management

**Completed**:
- ✅ `ai_dm.py` module with campaign state management
- ✅ Combat mechanics (initiative, turns, damage rolls)
- ✅ Opening scenario generation with MAP_SEEDs
- ✅ Campaign logging and persistence
- ✅ WebSocket handlers for AI DM commands
- ✅ Combat state initialization and turn management

**New Files**:
- `AI_DM_SYSTEM_PROMPT.md` - Comprehensive AI DM system prompt optimized for Arcane Engine
- `PHASE_5_AI_DM_PLAN.md` - Detailed implementation roadmap
- `backend/app/ai_dm.py` - Core AI DM logic (dataclasses, combat mechanics, scenario generation)
- `PHASE_5_BACKEND_STATUS.md` - Backend integration documentation

**Data Models** (in `ai_dm.py`):
- `CampaignConfig` - DM-provided campaign settings (setting, BBEG, chapters, themes)
- `CampaignState` - Persistent campaign state (log, NPCs, locations, loot)
- `CombatState` - Active combat state (initiative, turns, effects, action economy)

**WebSocket Handlers** (in `message_handlers.py`):
- `ai.dm.setup` - Configure campaign
- `ai.dm.new_campaign` - Generate 3 opening scenarios
- `ai.dm.select_scenario` - DM chooses starting scenario
- `ai.dm.combat_start` - Initialize combat with actors
- `ai.dm.action_resolve` - Resolve player actions and advance turn
- `ai.dm.combat_end` - Conclude combat and distribute loot
- `ai.dm.show_log` - Retrieve campaign summary

**Next (Phase 5.2)**:
1. Frontend `AIDMPanel.tsx` - DM interface for campaign setup and control
2. Frontend `CombatInitiativeTracker.tsx` - Combat UI with turn management
3. Frontend `NarrationDisplay.tsx` - Real-time narration stream
4. Integrate OpenAI GPT-4 for `generate_narration()` and `generate_map_seed()`
5. Frontend scenario selector UI

---

## What's Working

### 5e Rulesets System (Complete)
- **Location**: `backend/app/rules5e_data.py`
- **Data Source**: Open5e API (https://api.open5e.com)
- **Storage**: SQLite tables (rules_races, rules_feats, rules_skills, rules_attacks)
- **Sync**: Auto on startup via ARCANE_RULES_SYNC_ON_STARTUP=1
- **Offline**: All data persists locally for offline play

### Database Schema
```
rules_races: slug, name, source, data_json, synced_at
rules_feats: slug, name, prerequisites, source, data_json, synced_at
rules_skills: slug, name, ability, source, data_json, synced_at
rules_attacks: slug, name, attack_type, damage_dice, damage_type, properties, range_text, source, data_json, synced_at
```

### Frontend Component Created
- **File**: `frontend/src/components/RulesSync.tsx`
- **Features**: Status display, manual sync UI, last sync timestamps, checkboxes for selective sync
- **Status**: UI ready, waiting for API endpoints to work

### Integration Done
- Added RulesSync to `frontend/src/App.tsx` (lines 1-15 imports, inserted in leftCol)
- Component displays rules counts and sync status
- Manual sync button ready to trigger POST /api/rules/sync

---

## Current Blocker: Rules Endpoints Return 404

### Endpoint Definitions (Confirmed Present)
```python
# backend/app/main.py lines 683-693
@app.post("/api/rules/sync")
def api_rules_sync(req: RulesSyncReq):
    counts = rules5e_data.sync_open5e(db(), req.kinds)
    return {"synced": counts}

@app.get("/api/rules/status")
def api_rules_status():
    return rules5e_data.rules_status(db())

@app.get("/api/rules/{kind}")
def api_rules_list(kind: str, full: int | None = None, limit: int | None = None):
    return rules5e_data.list_rules(db(), kind, full=bool(full), limit=limit)
```

### Debug Logging Added
- Added print() and _append_loot_debug() calls to each handler
- Endpoints not being called (no debug output when accessed)
- FastAPI server is running and responding to other endpoints

### What We Know
- Server running on http://127.0.0.1:8000
- GET /api/rooms → 200 OK ✅
- GET /api/rules/status → 404 ❌
- Routes shown in startup logs as registered ✅
- Rules data in database ✅
- RulesSyncReq model defined (line 161) ✅

### Hypotheses to Test
1. Routes registered but not actually bound to handlers
2. Middleware intercepting /api/rules/* requests
3. Route ordering issue (specific route shadowed by pattern)
4. Reload cycle cutting off handler execution

---

## Key Files

### Backend
- `backend/app/main.py` - FastAPI app, routes (1336 lines)
- `backend/app/rules5e_data.py` - Rules sync logic from Open5e API
- `backend/app/message_handlers.py` - WebSocket message handlers
- `backend/app/rooms.py` - Room state management
- `backend/app/dice.py` - Dice rolling logic
- `backend/app/item_db.py` - Item database
- `backend/requirements.txt` - Dependencies

### Frontend
- `frontend/src/App.tsx` - Main app component
- `frontend/src/components/RulesSync.tsx` - **NEW** Rules status & sync UI
- `frontend/src/hooks/useRoomSocket.ts` - WebSocket hook
- `frontend/src/components/` - Other UI components

### Database
- `backend/app/rooms.db` - SQLite database (persists all data)

### Configuration
- `backend/.env` - Environment variables (ARCANE_RULES_SYNC_ON_STARTUP, etc)

---

## Environment Setup

### Backend
```bash
cd backend
.\.venv\Scripts\activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend  
```bash
cd frontend
npm run dev  # Runs on http://localhost:5173
```

### Both
```bash
cd dnd-console
.\run-dev.ps1  # Starts both in separate windows
```

**URLs**:
- Backend: http://127.0.0.1:8000
- Frontend: http://localhost:5173
- API Docs: http://127.0.0.1:8000/docs

## AI Configuration (Phase 4)

### Enable AI Features
```bash
# In PowerShell or system environment variables
$env:ARCANE_AI_MODE = "auto"  # or "assist" | "off"
$env:ARCANE_AI_PROVIDER = "openai"
$env:ARCANE_OPENAI_API_KEY = "sk-..."  # From platform.openai.com
```

### Models
- **Narration**: `gpt-4-turbo` (for scene description)
- **Map Generation**: `dall-e-3` (for 1024x1024 map images)

### Features
- **Narration Tones**: epic, mysterious, comedic, dark, hopeful
- **Map Styles**: fantasy dungeon, tavern, wilderness, city, cave, forest

### API Endpoints
- `GET /api/ai/status` - Check AI service status
- `POST /api/ai/narration` - Generate scene narration
- `POST /api/ai/map` - Generate map image

### WebSocket Messages
- `ai.narration` - Request narration (DM only)
- `ai.map_generation` - Request map (DM only)
- `ai.status` - Get service status

---

## Next Steps

### Immediate (Unblock Rules Endpoints)
1. **Debug endpoint handlers**: Check if handlers are actually executing
   - Look at backend/app/loot-debug.log for debug output
   - Verify handlers called when accessing /api/rules/status
   - If not called: Check FastAPI route registration order

2. **Verify FastAPI initialization**: 
   - Ensure handlers defined after app = FastAPI()
   - Check for any route conflicts or overrides
   - Test with simpler endpoint to isolate issue

3. **Once endpoints working**:
   - Test RulesSync component in frontend
   - Verify manual sync triggers sync_open5e()
   - Confirm data persists to SQLite

### Phase 3 Tasks (ALL COMPLETE)
1. ✅ Interactive map rendering with Pixi.js
2. ✅ Token system with drag-and-drop
3. ✅ Fog of War with player discovery
4. ✅ Generate loot feature implementation
5. ✅ Real-time multi-player synchronization
6. ✅ Inventory management with drag-and-drop distribution

---

## Testing Checklist

- [ ] GET /api/rules/status returns 200 with counts and timestamps
- [ ] POST /api/rules/sync with {"kinds": ["races"]} triggers sync
- [ ] RulesSync component displays current counts
- [ ] "Sync Selected" button calls backend endpoint
- [ ] Offline play works without API access
- [ ] All Phase 2 features still working (regression test)

---

## Important Notes

- **Rules data is working**: 20 races, 74 feats, 18 skills, 68 weapons confirmed in database
- **404 issue is routing, not logic**: The backend functionality is correct, just endpoints not accessible
- **Frontend UI is ready**: RulesSync component created and integrated
- **No data loss risk**: All changes are additive, no breaking changes to existing features

---

## Related Discussions

**Phase 2 Completion**: All refactoring tasks complete, zero regressions found through comprehensive testing across all domains (dice, chat, loot, map, WebSocket, database operations).

**5e Ruleset Implementation**: Complete rules system already implemented with Open5e API integration, local SQLite persistence, and offline support. Just needs endpoint access fix.

**Current Session Focus**: Unblock API endpoint 404 issue to enable manual ruleset sync UI and proceed with Phase 3.
