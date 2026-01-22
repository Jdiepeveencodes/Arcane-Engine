# Campaign Setup System - Quick Reference

## 🎯 The 10 Questions

### Question 1: Story Type
**What kind of story do you want to tell?**
- Heroic (good vs evil, clear heroes)
- Dark (grim, low survival odds, moral ambiguity)
- Whimsical (lighthearted, comedic, absurd)
- Epic (grand scale, world-changing events)
- Political (intrigue, factions, diplomacy)
- Mythic (legends, prophecies, ancient powers)
- Mystery (solving a puzzle or uncovering truth)
- Survival (against harsh environment/odds)

### Question 2: Campaign Length
**One-shot or ongoing? How long?**
- One-shot (single session)
- Short (3-5 sessions)
- Medium (10-20 sessions)
- Long (20+ sessions)
- Ongoing (open-ended)

Example: "Medium campaign, 12 sessions, 4 hours each"

### Question 3: Core Conflict
**What is the central problem driving the campaign?**
Examples:
- A plague is spreading; find its source
- A cult is recruiting followers for a ritual
- A war is beginning; choose a side or stop it
- A prophecy is coming true; prevent or fulfill it
- A secret could destroy someone's life; reveal or hide it

### Question 4: Main Antagonist
**Who/what opposes the party and what do they want?**
Specify:
- Name and nature (person, faction, force, ideology)
- Motivation (why they want what they want)
- End goal (what victory looks like for them)

Example: "The Crimson Plague - a sentient disease. Wants to depopulate the kingdom."

### Question 5: Player Freedom
**How much can players deviate from the story?**
- Linear (fixed plot path, players follow story)
- Branching (multiple predetermined paths exist)
- Sandbox (player-driven world, DM reacts)
- Hybrid (main plot is fixed, side content flexible)

### Question 6: Combat Tone
**How serious is danger? How do combats feel?**
- Cinematic (dramatic, fate favors the bold, less lethality)
- Tactical (positioning matters, strategy required)
- Deadly (death is real and common)
- Forgiving (difficulty adjusts for party)
- Lethal but Fair (hard but predictable)

### Question 7: Activity Balance
**What percentage of time on each activity?**
- Roleplay Heavy (70% RP, 30% other)
- Balanced (33% each)
- Combat Heavy (70% combat, 30% other)
- Exploration Heavy (70% exploration, 30% other)

### Question 8: Backstory Integration
**How important are character backstories to the plot?**
- Minimal (generic adventurers, loose connection)
- Moderate (each PC has one plot hook)
- Deep (backstories are central to campaign)

### Question 9: Safety Boundaries
**What should be avoided or handled carefully?**
Examples:
- Avoid: graphic violence, sexual content
- Handle lightly: mental illness, betrayal, addiction
- Never: [specific content]

### Question 10: Good Ending
**What does success look like?**
- Clear Victory (villain defeated, problem solved)
- Bittersweet (success with costs)
- Moral Choice (player choices determine outcome)
- Open Ending (story continues beyond campaign)
- Multiple Endings (no single "right" ending)

---

## 🔄 WebSocket Message Flow

### Get Questionnaire
```json
→ {"type": "campaign.setup.get_questionnaire"}
← {"type": "campaign.setup.questionnaire", "questionnaire": [...]}
```

### Submit Responses
```json
→ {"type": "campaign.setup.submit", "responses": {...}}
← {"type": "campaign.setup.confirmed", "campaign_id": "..."}
← {"type": "campaign.setup.ai_prompt_ready", "ai_prompt": "..."}
```

### Get Current Setup
```json
→ {"type": "campaign.setup.get_current"}
← {"type": "campaign.setup.current", "campaign": {...}}
```

### Update Setup
```json
→ {"type": "campaign.setup.update", "campaign_updates": {...}}
← {"type": "campaign.setup.updated", "ai_prompt": "..."}
```

---

## 📊 Data Structure

### CampaignSetup Fields
```python
# Core
campaign_name: str
story_type: StoryType
world_name: Optional[str]
setting_description: Optional[str]

# Duration
campaign_length: CampaignLength
estimated_sessions: int
session_duration_hours: float

# Plot
core_conflict: str
main_antagonist_name: str
antagonist_description: str
antagonist_goal: str

# Structure
story_structure: StoryStructure
freedom_description: str

# Combat
combat_tone: CombatTone

# Balance
focus_balance: FocusBalance
roleplay_percentage: int
combat_percentage: int
exploration_percentage: int

# Characters
backstory_integration: BackstoryIntegration

# Safety
themes_to_avoid: List[str]
horror_limits: str
sensitive_topics: List[str]

# Vision
good_ending_description: str
ending_type: EndingType

# Metadata
campaign_id: str
created_by_user_id: str
created_at: str
custom_notes: str
```

---

## 🤖 AI Prompt Generation

The system generates a personalized prompt containing:

1. **Campaign Identity**
   - Name, setting, duration

2. **Core Plot**
   - Main conflict, antagonist, their goal

3. **Player Agency**
   - Freedom level, structure, flexibility

4. **Tone & Balance**
   - Combat tone, activity percentages, priorities

5. **Character Integration**
   - Backstory hooks, integration level

6. **Safety Boundaries**
   - Themes to avoid, horror limits, sensitive topics

7. **Success Vision**
   - Ending type, how to recognize success

8. **Instructions**
   - 6 specific guidelines for AI DM to follow

**AI DM then loads**: System Prompt + Campaign Prompt → Personalized behavior

---

## 💾 Storage

### In Memory (Room)
```python
room.campaign_setup: CampaignSetup  # Current config
room.campaign_id: str               # Campaign ID
```

### On Disk (JSON)
```json
{
  "campaign_id": "campaign_abc123",
  "campaign_name": "Dragon's Hoard",
  "story_type": "epic",
  ...all fields...
}
```

### Persistence
- Survives session reload
- Can be exported/shared
- Easy to version control

---

## ✅ Validation Rules

- All 10 questions must have responses
- Percentages (if provided) must sum to 100
- Campaign name required
- Conflict and antagonist descriptions required
- At least one ending type required

---

## 🎮 Example Campaign

### Question Responses
```
1. Story Type: Epic
2. Length: Medium (12 sessions, 4 hours each)
3. Core Conflict: A plague spreads; find its source
4. Antagonist: The Crimson Plague - sentient disease, wants to reshape society
5. Freedom: Hybrid - main plot fixed, side content flexible
6. Combat: Lethal but Fair
7. Balance: Balanced (33% each)
8. Backstories: Moderate - each PC has one hook
9. Safety: Avoid graphic violence; handle betrayal lightly
10. Ending: Clear victory with character growth
```

### Generated AI Prompt Section
```
## CORE CONFLICT & PLOT

Central Mystery: A plague is spreading; the party must find its source 
before it consumes the kingdom.

Main Antagonist: The Crimson Plague
A sentient disease spreading through a corrupt nobleman's scheme.

Their Goal: Depopulate the kingdom to reshape society according to 
disease's will.

## INSTRUCTIONS FOR THIS CAMPAIGN

1. Respect the established tone: Lethal but Fair
2. Honor player agency: Meaningful choices within main plot
3. Balance activities: 33% roleplay, 33% combat, 33% exploration
4. Weave backstories: Include some PC backstory hooks
5. Avoid boundaries: Avoid graphic violence, handle betrayal lightly
6. Aim for the vision: Clear victory with character growth
```

---

## 🚀 Workflow

### For DM
1. Create room
2. Request questionnaire
3. Answer 10 questions
4. Submit responses
5. AI DM loads personalized prompt
6. Campaign begins!

### For AI DM
1. Load system prompt (standard rules)
2. Load campaign prompt (DM's configuration)
3. Merge prompts → personalized behavior
4. Run campaign respecting all DM choices

### For Players
- Play normal game
- AI DM respects DM's vision automatically
- Consistent tone/balance throughout

---

## 📈 Scalability

### Easy to Expand
- Add more questions → add enum + field
- Add campaign templates → pre-fill questionnaire
- Add conditions → update prompt generation
- No handler changes needed

### Future Options
- Quick-fill templates
- Difficulty scaling
- Campaign versioning
- DM tips/suggestions
- Encounter generation

---

## 🔗 Integration

### Works With
- ✅ AI DM System (receives campaign context)
- ✅ Token System (influences encounter design)
- ✅ Map Generation (respects tone/balance)
- ✅ Loot System (respects tone/difficulty)
- ✅ Combat System (respects combat tone)
- ✅ Session Management (persists across sessions)

### Data Flow
```
DM Setup → Campaign Config → AI Prompt
                          ↓
                    AI DM Behavior
                    ↓
            Influences all game systems
            ↓
        Campaign feels unified & intentional
```

---

## 📋 Quick Checklist

Before starting campaign, DM has decided:
- [ ] Story type/genre
- [ ] Campaign length & session count
- [ ] Central conflict/mystery
- [ ] Main antagonist & goals
- [ ] Player freedom level
- [ ] Combat tone & danger
- [ ] Activity balance
- [ ] Backstory importance
- [ ] Safety boundaries
- [ ] Vision for ending

All captured → AI DM respects it → Success! ✨

---

**Status**: ✅ Complete and Ready  
**Setup Time**: ~15-20 minutes  
**Impact**: Ensures AI DM behavior matches DM vision  
**Flexibility**: Fully expandable and customizable

🎲 Let's make campaigns legendary!
