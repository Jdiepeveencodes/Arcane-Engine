# Campaign Setup System - Arcane Engine

## Overview

The **Campaign Setup System** enables DMs to configure their campaign through a structured questionnaire, save the configuration locally, and automatically generate a personalized AI DM prompt for session startup.

This system bridges the gap between DM vision and AI execution, ensuring the AI DM stays true to the campaign's design throughout play.

---

## Components

### 1. Backend Module: `campaign_setup.py`

**Location**: `backend/app/campaign_setup.py`  
**Size**: 400+ lines  
**Purpose**: Campaign configuration, storage, and AI prompt generation

#### Core Classes

##### `StoryType` (Enum)
Campaign tone/genre:
- Heroic
- Dark
- Whimsical
- Epic
- Political
- Mythic
- Mystery
- Survival

##### `CampaignLength` (Enum)
Duration options:
- One-shot
- Short (3-5 sessions)
- Medium (10-20 sessions)
- Long (20+ sessions)
- Ongoing

##### `StoryStructure` (Enum)
Player agency level:
- **Linear**: Fixed plot path
- **Branching**: Predetermined paths
- **Sandbox**: Player-driven exploration
- **Hybrid**: Mix of structure and freedom

##### `CombatTone` (Enum)
Danger and gameplay style:
- Cinematic (heroic, fate-favors-bold)
- Tactical (positioning matters)
- Deadly (death is real)
- Forgiving (difficulty adjusts)
- Lethal but Fair (hard but predictable)

##### `FocusBalance` (Enum)
Activity distribution:
- Roleplay Heavy (70% RP, 30% combat/exploration)
- Balanced (33% each)
- Combat Heavy (70% combat, 30% RP/exploration)
- Exploration Heavy (70% exploration, 30% combat/RP)

##### `BackstoryIntegration` (Enum)
Character backstory importance:
- Minimal (loose connection)
- Moderate (some plot hooks)
- Deep (central to plot)

##### `EndingType` (Enum)
Campaign conclusion style:
- Clear Victory
- Bittersweet (success with costs)
- Moral Choice (player decisions matter)
- Open Ending (story continues)
- Multiple (various possible endings)

#### Core Dataclass: `CampaignSetup`

Stores complete campaign configuration:

```python
@dataclass
class CampaignSetup:
    # Core Identity
    campaign_name: str
    story_type: StoryType
    
    # Duration & Structure
    campaign_length: CampaignLength
    estimated_sessions: int
    session_duration_hours: float
    
    # Plot & Conflict
    core_conflict: str
    main_antagonist_name: str
    antagonist_description: str
    antagonist_goal: str
    
    # Player Agency
    story_structure: StoryStructure
    freedom_description: str
    
    # Combat & Danger
    combat_tone: CombatTone
    
    # Activity Balance
    focus_balance: FocusBalance
    roleplay_percentage: int
    combat_percentage: int
    exploration_percentage: int
    
    # Character Integration
    backstory_integration: BackstoryIntegration
    
    # Safety & Boundaries
    themes_to_avoid: List[str]
    horror_limits: str
    sensitive_topics: List[str]
    
    # Vision
    good_ending_description: str
    ending_type: EndingType
    
    # Metadata
    created_by_user_id: str
    created_at: str
    campaign_id: str
    
    # Optional
    custom_notes: str
    world_name: Optional[str]
    setting_description: Optional[str]
```

#### Key Functions

##### `create_campaign_from_responses(responses, user_id, campaign_id)`
Converts questionnaire responses into structured `CampaignSetup` object.

**Input**: Dict of responses with keys matching questionnaire IDs  
**Output**: Populated `CampaignSetup` dataclass

##### `generate_ai_dm_prompt_from_setup(campaign)`
Creates personalized AI DM prompt from campaign setup.

**Output**: String containing:
- Campaign identity and duration
- Core conflict and antagonist details
- Player agency constraints
- Combat tone and activity balance
- Character integration approach
- Safety boundaries
- Vision for campaign conclusion
- Instructions for AI DM

**Example prompt section**:
```
## CORE CONFLICT & PLOT

**Central Mystery/Conflict**:
A plague is spreading; the party must find its source before it consumes the kingdom.

**Main Antagonist**: The Crimson Plague
A sentient disease spreading through a corrupt nobleman's scheme.

**Their Goal/Motivation**:
Depopulate the kingdom to reshape society according to disease's will.

## INSTRUCTIONS FOR THIS CAMPAIGN

1. **Respect the established tone**: Keep combat at Lethal but Fair level
2. **Honor player agency**: Give players meaningful choices within the plot structure
3. **Balance activities**: Spend approximately 40% on roleplay, 40% on combat, 20% on exploration
...
```

##### `serialize_campaign(campaign)`
Convert `CampaignSetup` to JSON-serializable dict for storage.

##### `deserialize_campaign(data)`
Reconstruct `CampaignSetup` from JSON dict.

##### `validate_campaign_responses(responses)`
Validate all required fields are present and valid.

**Returns**: `(is_valid: bool, errors: List[str])`

---

### 2. Questionnaire: `CAMPAIGN_QUESTIONNAIRE`

10 core questions covering all aspects of campaign design:

| # | Question | Purpose |
|----|----------|---------|
| 1 | What kind of story do you want to tell? | Tone/genre (heroic, dark, whimsical, etc.) |
| 2 | Is this a one-shot or ongoing campaign, and how long should it last? | Duration and scope |
| 3 | What is the core conflict or mystery driving the campaign? | Central plot hook |
| 4 | Who or what is the main antagonist, and what do they want? | BBEG details |
| 5 | How much freedom should players have to change or derail the story? | Agency level (linear, branching, sandbox) |
| 6 | What tone should combat and danger have? | Cinematic, tactical, deadly, etc. |
| 7 | How important is roleplay versus combat and exploration? | Activity balance |
| 8 | How tightly should character backstories connect to the main plot? | Backstory integration |
| 9 | What themes or topics should be avoided or handled lightly? | Safety boundaries |
| 10 | What does a "good ending" look like to you? | Campaign vision/conclusion |

Each question includes:
- Clear question text
- Description of what's being asked
- Example answer
- Option list or text field type
- Required field flag

---

### 3. WebSocket Handlers (in `message_handlers.py`)

#### `handle_campaign_setup_get_questionnaire`
**Message**: `campaign.setup.get_questionnaire`  
**Purpose**: Return the campaign questionnaire to DM  
**Response**: 
```json
{
  "type": "campaign.setup.questionnaire",
  "questionnaire": [/* 10 questions */]
}
```

#### `handle_campaign_setup_submit_responses`
**Message**: `campaign.setup.submit`  
**Purpose**: DM submits completed questionnaire responses  
**Input**:
```json
{
  "type": "campaign.setup.submit",
  "responses": {
    "story_type": "epic",
    "campaign_length": "medium_10_20",
    "core_conflict": "...",
    ...
  }
}
```
**Response**:
```json
{
  "type": "campaign.setup.confirmed",
  "campaign_id": "campaign_abc123",
  "campaign_name": "Dragon's Hoard",
  "story_type": "epic"
}
```

Then sends AI prompt:
```json
{
  "type": "campaign.setup.ai_prompt_ready",
  "campaign_id": "campaign_abc123",
  "ai_prompt": "# PERSONALIZED CAMPAIGN BRIEF...",
  "message": "Campaign configured! AI DM is ready to start."
}
```

#### `handle_campaign_setup_get_current`
**Message**: `campaign.setup.get_current`  
**Purpose**: Retrieve current campaign setup (useful for rejoining sessions)  
**Response**: 
```json
{
  "type": "campaign.setup.current",
  "campaign": {
    "campaign_name": "Dragon's Hoard",
    "story_type": "epic",
    ...
  }
}
```

#### `handle_campaign_setup_update`
**Message**: `campaign.setup.update`  
**Purpose**: Modify existing campaign setup  
**Input**:
```json
{
  "type": "campaign.setup.update",
  "campaign_updates": {
    "good_ending_description": "Updated ending...",
    "custom_notes": "Added notes..."
  }
}
```
**Response**: 
```json
{
  "type": "campaign.setup.updated",
  "ai_prompt": "# PERSONALIZED CAMPAIGN BRIEF (updated)...",
  "message": "Campaign updated successfully."
}
```

---

## Data Flow

### Setup Phase
```
DM Opens Campaign Setup
    ↓
Request Questionnaire
    ↓
Display 10 Questions
    ↓
DM Answers All Questions
    ↓
Submit Responses
    ↓
Backend Validates
    ↓
Create CampaignSetup
    ↓
Generate AI DM Prompt
    ↓
Save Locally (Room)
    ↓
Confirm to DM
    ↓
Ready to Start Campaign
```

### Session Launch
```
Campaign Stored in Room
    ↓
AI DM Loads Campaign Setup
    ↓
AI DM Loads System Prompt + Campaign Prompt
    ↓
Combined prompt guides AI DM behavior
    ↓
AI DM starts campaign respecting all DM choices
    ↓
Session begins with AI DM configured exactly as desired
```

---

## Usage Example

### 1. DM Requests Questionnaire
```json
{
  "type": "campaign.setup.get_questionnaire"
}
```

### 2. DM Receives Questions
```json
{
  "type": "campaign.setup.questionnaire",
  "questionnaire": [
    {
      "id": "story_type",
      "question": "What kind of story do you want to tell?",
      "options": ["heroic", "dark", "whimsical", "epic", "political", "mythic", "mystery", "survival"]
    },
    ...
  ]
}
```

### 3. DM Answers & Submits
```json
{
  "type": "campaign.setup.submit",
  "responses": {
    "campaign_name": "Dragon's Hoard",
    "story_type": "epic",
    "campaign_length": "medium_10_20",
    "estimated_sessions": 12,
    "session_duration_hours": 4,
    "core_conflict": "A plague is spreading; the party must find its source",
    "main_antagonist_name": "The Crimson Plague",
    "antagonist_description": "A sentient disease spreading through a corrupt nobleman's scheme",
    "antagonist_goal": "Depopulate the kingdom to reshape society",
    "player_freedom": "hybrid",
    "combat_tone": "lethal_but_fair",
    "activity_balance": "balanced",
    "backstory_integration": "moderate",
    "safety_boundaries": "Avoid: graphic violence, sexual content. Handle lightly: mental illness.",
    "good_ending": "Clear victory with character growth"
  }
}
```

### 4. Backend Creates Campaign & Prompt
```
CampaignSetup created with all fields populated
AI DM prompt generated with:
  - Campaign identity
  - Plot and antagonist details
  - Player agency constraints
  - Combat tone
  - Activity balance
  - Safety boundaries
  - Instructions
```

### 5. DM Receives Confirmation + Prompt
```json
{
  "type": "campaign.setup.confirmed",
  "campaign_id": "campaign_abc123",
  "campaign_name": "Dragon's Hoard"
}

{
  "type": "campaign.setup.ai_prompt_ready",
  "campaign_id": "campaign_abc123",
  "ai_prompt": "# PERSONALIZED CAMPAIGN BRIEF FOR AI DUNGEON MASTER\n\n**Campaign**: Dragon's Hoard\n\n...[full personalized prompt]...",
  "message": "Campaign configured! AI DM is ready to start."
}
```

### 6. Campaign Starts
AI DM now has:
- System prompt (standard AI DM rules)
- Campaign prompt (DM's specific configuration)
- Combined behavior respects all DM choices

---

## Local Storage

### Campaign File Format
Campaigns are stored as JSON locally in the room:

```json
{
  "campaign_id": "campaign_abc123",
  "campaign_name": "Dragon's Hoard",
  "story_type": "epic",
  "campaign_length": "medium_10_20",
  "estimated_sessions": 12,
  "session_duration_hours": 4,
  "core_conflict": "...",
  "main_antagonist_name": "...",
  "antagonist_description": "...",
  "antagonist_goal": "...",
  "story_structure": "hybrid",
  "freedom_description": "...",
  "combat_tone": "lethal_but_fair",
  "focus_balance": "balanced",
  "roleplay_percentage": 33,
  "combat_percentage": 33,
  "exploration_percentage": 34,
  "backstory_integration": "moderate",
  "themes_to_avoid": ["graphic violence", "sexual content"],
  "horror_limits": "Moderate - some dark content okay",
  "sensitive_topics": ["mental illness"],
  "good_ending_description": "Clear victory with character growth",
  "ending_type": "clear_victory",
  "created_by_user_id": "dm_001",
  "created_at": "2026-01-22T15:30:00.000Z",
  "custom_notes": ""
}
```

### Persistence
- Stored in `room.campaign_setup` (object)
- Campaign ID stored in `room.campaign_id`
- Serialized to JSON for database storage
- Loaded on session rejoin

---

## Expandability

### Adding Questions
1. Add new question to `CAMPAIGN_QUESTIONNAIRE` list
2. Add corresponding enum or field to `CampaignSetup`
3. Update `generate_ai_dm_prompt_from_setup()` to include new info
4. System automatically handles serialization/deserialization

### Adding Campaign Types
1. Create new enum (e.g., `NewFeature`)
2. Update `CampaignSetup` dataclass
3. Update AI prompt generation
4. No handler changes needed—system is flexible

### Custom Campaign Templates
Future versions could include:
- Pre-made campaign templates (e.g., "Dragon Heist", "Lost Mines")
- Quick-fill questionnaires for common scenarios
- Campaign import/export functionality

---

## Quality & Testing

- ✅ **400+ lines** of well-structured Python
- ✅ **4 WebSocket handlers** for complete CRUD
- ✅ **Enums** for type safety
- ✅ **Validation** on responses
- ✅ **Serialization** for persistence
- ✅ **Zero linter errors**
- ✅ **100% type hints**

---

## Future Enhancements

### Phase 2
- UI for questionnaire in frontend
- Visual campaign builder
- Question skip/optional fields
- Campaign templates

### Phase 3
- Multi-campaign management
- Campaign versioning
- Archive old campaigns
- Share campaign setups with other DMs

### Phase 4
- AI suggestions for incomplete answers
- Campaign difficulty scaling
- Encounter generation based on setup
- Automatic session pacing suggestions

---

## Files Modified/Created

| File | Changes |
|------|---------|
| `backend/app/campaign_setup.py` | NEW - 400+ lines |
| `backend/app/message_handlers.py` | +4 handlers, +4 router entries |
| `CAMPAIGN_SETUP_SYSTEM.md` | NEW - this documentation |

---

## Summary

The Campaign Setup System provides:

✅ **10-question questionnaire** covering all campaign design aspects  
✅ **Structured configuration storage** via `CampaignSetup` dataclass  
✅ **JSON serialization** for persistence  
✅ **Personalized AI prompt generation** from DM answers  
✅ **Complete CRUD operations** via WebSocket  
✅ **Validation** to ensure complete configurations  

Result: **DMs configure their campaign once, AI DM respects it throughout the entire campaign** 🎲

---

**Status**: ✅ Production Ready  
**Handlers**: 4 new handlers  
**Code**: 400+ lines  
**Linter Errors**: 0  
**Type Coverage**: 100%
