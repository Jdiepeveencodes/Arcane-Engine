"""
Campaign Setup System for Arcane Engine.
Handles DM questionnaire, campaign configuration, and AI prompt generation.
"""

import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime

# ============================================================================
# ENUMS FOR CAMPAIGN CONFIGURATION
# ============================================================================

class StoryType(Enum):
    """Types of stories campaigns can tell."""
    HEROIC = "heroic"
    DARK = "dark"
    WHIMSICAL = "whimsical"
    EPIC = "epic"
    POLITICAL = "political"
    MYTHIC = "mythic"
    MYSTERY = "mystery"
    SURVIVAL = "survival"

class CampaignLength(Enum):
    """Campaign duration options."""
    ONESHOT = "one_shot"
    SHORT = "short"  # 3-5 sessions
    MEDIUM = "medium"  # 10-20 sessions
    LONG = "long"  # 20+ sessions
    ONGOING = "ongoing"  # Open-ended

class StoryStructure(Enum):
    """How much players can deviate from the story."""
    LINEAR = "linear"  # Fixed plot path
    BRANCHING = "branching"  # Multiple predetermined paths
    SANDBOX = "sandbox"  # Player-driven exploration
    HYBRID = "hybrid"  # Mix of structure and freedom

class CombatTone(Enum):
    """Combat and danger tone."""
    CINEMATIC = "cinematic"  # Dramatic, heroic, fate-favors-bold
    TACTICAL = "tactical"  # Strategic, positioning matters
    DEADLY = "deadly"  # Death is real, consequences severe
    FORGIVING = "forgiving"  # Difficulty adjusts for party
    LETHAL_BUT_FAIR = "lethal_but_fair"  # Hard but predictable

class FocusBalance(Enum):
    """Balance between different activity types."""
    ROLEPLAY_HEAVY = "roleplay_heavy"  # 70% RP, 30% combat/exploration
    BALANCED = "balanced"  # 33% each
    COMBAT_HEAVY = "combat_heavy"  # 70% combat, 30% RP/exploration
    EXPLORATION_HEAVY = "exploration_heavy"  # 70% exploration, 30% combat/RP

class BackstoryIntegration(Enum):
    """How much character backstories matter."""
    MINIMAL = "minimal"  # Generic adventurers, loose connection
    MODERATE = "moderate"  # Some plot hooks from backstories
    DEEP = "deep"  # Backstories are central to plot

class EndingType(Enum):
    """What constitutes a good ending."""
    CLEAR_VICTORY = "clear_victory"  # Villain defeated, problem solved
    BITTERSWEET = "bittersweet"  # Success with costs
    MORAL_CHOICE = "moral_choice"  # Player choices define outcome
    OPEN_ENDING = "open_ending"  # Story continues beyond campaign
    MULTIPLE = "multiple"  # Various possible endings

# ============================================================================
# CAMPAIGN SETUP DATACLASS
# ============================================================================

@dataclass
class CampaignSetup:
    """Complete campaign configuration from DM questionnaire."""
    
    # Core Identity
    campaign_name: str
    story_type: StoryType
    
    # Duration & Structure
    campaign_length: CampaignLength
    estimated_sessions: int
    session_duration_hours: float  # Average session length
    
    # Plot & Conflict
    core_conflict: str  # Description of the main conflict/mystery
    main_antagonist_name: str
    antagonist_description: str  # Who/what they are
    antagonist_goal: str  # What they want
    
    # Player Agency
    story_structure: StoryStructure
    freedom_description: str  # Player's explanation of desired freedom
    
    # Combat & Danger
    combat_tone: CombatTone
    
    # Activity Balance
    focus_balance: FocusBalance
    roleplay_percentage: int  # 0-100
    combat_percentage: int  # 0-100
    exploration_percentage: int  # 0-100
    
    # Character Integration
    backstory_integration: BackstoryIntegration
    
    # Safety & Boundaries
    themes_to_avoid: List[str]  # Topics to avoid or handle lightly
    horror_limits: str  # What horror elements are okay
    sensitive_topics: List[str]  # Topics requiring care
    
    # Vision
    good_ending_description: str
    ending_type: EndingType
    
    # Metadata
    created_by_user_id: str
    created_at: str
    campaign_id: str
    
    # Optional
    custom_notes: str = ""
    world_name: Optional[str] = None
    setting_description: Optional[str] = None

# ============================================================================
# QUESTIONNAIRE QUESTIONS
# ============================================================================

CAMPAIGN_QUESTIONNAIRE = [
    {
        "id": "story_type",
        "question": "What kind of story do you want to tell?",
        "description": "Choose the primary tone/style of your campaign",
        "options": ["heroic", "dark", "whimsical", "epic", "political", "mythic", "mystery", "survival"],
        "example": "Epic - a story about rising against an ancient evil",
        "required": True
    },
    {
        "id": "campaign_length",
        "question": "Is this a one-shot or an ongoing campaign, and how long should it last?",
        "description": "Specify duration and session count",
        "options": ["one_shot", "short_3_5", "medium_10_20", "long_20_plus", "ongoing"],
        "example": "Medium campaign, 12 sessions, 4 hours each",
        "required": True
    },
    {
        "id": "core_conflict",
        "question": "What is the core conflict or mystery driving the campaign?",
        "description": "The central problem or hook that propels the story",
        "type": "text",
        "example": "A plague is spreading; the party must find its source before it consumes the kingdom",
        "required": True
    },
    {
        "id": "antagonist",
        "question": "Who or what is the main antagonist, and what do they want?",
        "description": "Describe the BBEG (Big Bad Evil Guy), faction, force, or goal",
        "type": "text_multiline",
        "example": "The Crimson Plague: A sentient disease spreading through a corrupt nobleman's scheme. They want to depopulate the kingdom to reshape society.",
        "required": True
    },
    {
        "id": "player_freedom",
        "question": "How much freedom should players have to change or derail the story?",
        "description": "Level of player agency and story flexibility",
        "options": ["linear", "branching", "sandbox", "hybrid"],
        "example": "Hybrid - main plot is fixed, but NPCs and side quests respond to player choices",
        "required": True
    },
    {
        "id": "combat_tone",
        "question": "What tone should combat and danger have?",
        "description": "How serious are consequences? How cinematic vs tactical?",
        "options": ["cinematic", "tactical", "deadly", "forgiving", "lethal_but_fair"],
        "example": "Deadly - death is always possible, but it's always the result of player choices, never random",
        "required": True
    },
    {
        "id": "activity_balance",
        "question": "How important is roleplay versus combat and exploration?",
        "description": "What mix of activities should dominate gameplay?",
        "options": ["roleplay_heavy", "balanced", "combat_heavy", "exploration_heavy"],
        "example": "Balanced - roughly 1/3 roleplay, 1/3 combat, 1/3 exploration",
        "required": True
    },
    {
        "id": "backstory_integration",
        "question": "How tightly should character backstories connect to the main plot?",
        "description": "How much should player histories tie to the campaign?",
        "options": ["minimal", "moderate", "deep"],
        "example": "Moderate - each PC has one plot hook connected to their backstory",
        "required": True
    },
    {
        "id": "safety_boundaries",
        "question": "What themes or topics should be avoided or handled lightly?",
        "description": "Safety, boundaries, and sensitive content",
        "type": "text_multiline",
        "example": "Avoid: graphic violence, sexual content. Handle lightly: mental illness, betrayal.",
        "required": True
    },
    {
        "id": "good_ending",
        "question": "What does a 'good ending' look like to you?",
        "description": "Your vision of a satisfying campaign conclusion",
        "type": "text_multiline",
        "example": "Clear victory with character growth - party defeats the plague source and must choose whether to expose or cover up the nobleman's involvement",
        "required": True
    }
]

# ============================================================================
# CAMPAIGN SETUP FUNCTIONS
# ============================================================================

def create_campaign_from_responses(
    responses: Dict[str, Any],
    user_id: str,
    campaign_id: str
) -> CampaignSetup:
    """
    Create a CampaignSetup object from questionnaire responses.
    
    Args:
        responses: Dict with keys matching CAMPAIGN_QUESTIONNAIRE ids
        user_id: ID of DM creating campaign
        campaign_id: Unique campaign identifier
    
    Returns:
        CampaignSetup dataclass with all fields populated
    """
    
    # Parse activity balance if provided as string
    activity_balance = responses.get("activity_balance", "balanced")
    roleplay_pct = 33
    combat_pct = 33
    exploration_pct = 34
    
    if activity_balance == "roleplay_heavy":
        roleplay_pct, combat_pct, exploration_pct = 70, 15, 15
    elif activity_balance == "combat_heavy":
        roleplay_pct, combat_pct, exploration_pct = 15, 70, 15
    elif activity_balance == "exploration_heavy":
        roleplay_pct, combat_pct, exploration_pct = 15, 15, 70
    
    # Parse themes to avoid
    themes_to_avoid = []
    safety_response = responses.get("safety_boundaries", "")
    if "avoid:" in safety_response.lower():
        avoid_section = safety_response.lower().split("avoid:")[1]
        if "handle" in avoid_section:
            avoid_section = avoid_section.split("handle")[0]
        themes_to_avoid = [t.strip() for t in avoid_section.split(",") if t.strip()]
    
    # Parse sensitive topics
    sensitive_topics = []
    if "handle lightly:" in safety_response.lower():
        handle_section = safety_response.lower().split("handle lightly:")[1]
        sensitive_topics = [t.strip() for t in handle_section.split(",") if t.strip()]
    
    campaign = CampaignSetup(
        campaign_name=responses.get("campaign_name", "Untitled Campaign"),
        story_type=StoryType(responses.get("story_type", "heroic")),
        
        campaign_length=CampaignLength(responses.get("campaign_length", "medium")),
        estimated_sessions=responses.get("estimated_sessions", 10),
        session_duration_hours=responses.get("session_duration_hours", 4.0),
        
        core_conflict=responses.get("core_conflict", ""),
        main_antagonist_name=responses.get("antagonist_name", ""),
        antagonist_description=responses.get("antagonist_description", ""),
        antagonist_goal=responses.get("antagonist_goal", ""),
        
        story_structure=StoryStructure(responses.get("player_freedom", "hybrid")),
        freedom_description=responses.get("freedom_description", ""),
        
        combat_tone=CombatTone(responses.get("combat_tone", "lethal_but_fair")),
        
        focus_balance=FocusBalance(responses.get("activity_balance", "balanced")),
        roleplay_percentage=roleplay_pct,
        combat_percentage=combat_pct,
        exploration_percentage=exploration_pct,
        
        backstory_integration=BackstoryIntegration(responses.get("backstory_integration", "moderate")),
        
        themes_to_avoid=themes_to_avoid,
        horror_limits=responses.get("horror_limits", ""),
        sensitive_topics=sensitive_topics,
        
        good_ending_description=responses.get("good_ending", ""),
        ending_type=EndingType(responses.get("ending_type", "clear_victory")),
        
        created_by_user_id=user_id,
        created_at=datetime.now().isoformat(),
        campaign_id=campaign_id,
        
        custom_notes=responses.get("custom_notes", ""),
        world_name=responses.get("world_name"),
        setting_description=responses.get("setting_description")
    )
    
    return campaign

# ============================================================================
# AI PROMPT GENERATION FROM CAMPAIGN SETUP
# ============================================================================

def generate_ai_dm_prompt_from_setup(campaign: CampaignSetup) -> str:
    """
    Generate a personalized AI DM prompt from campaign setup.
    This prompt is prepended to the system prompt to give the AI DM context.
    
    Args:
        campaign: CampaignSetup dataclass with DM's configuration
    
    Returns:
        String containing personalized prompt for AI DM
    """
    
    themes_text = ", ".join(campaign.themes_to_avoid) if campaign.themes_to_avoid else "None specified"
    sensitive_text = ", ".join(campaign.sensitive_topics) if campaign.sensitive_topics else "None specified"
    
    prompt = f"""# PERSONALIZED CAMPAIGN BRIEF FOR AI DUNGEON MASTER

**Campaign**: {campaign.campaign_name}  
**DM**: {campaign.created_by_user_id}  
**Created**: {campaign.created_at}

---

## CAMPAIGN IDENTITY

**Story Type**: {campaign.story_type.value.title()}  
**Setting**: {campaign.world_name or campaign.setting_description or 'Generic Fantasy World'}  
**Duration**: {campaign.campaign_length.value.replace('_', ' ').title()}  
**Estimated Sessions**: {campaign.estimated_sessions} (approximately {campaign.session_duration_hours} hours each)

---

## CORE CONFLICT & PLOT

**Central Mystery/Conflict**:
{campaign.core_conflict}

**Main Antagonist**: {campaign.main_antagonist_name}
{campaign.antagonist_description}

**Their Goal/Motivation**:
{campaign.antagonist_goal}

---

## CAMPAIGN STRUCTURE & PLAYER AGENCY

**Story Structure**: {campaign.story_structure.value.title()}

**Player Freedom Level**: {campaign.freedom_description or campaign.story_structure.value.title()}

**How This Works**: 
- Players should have {"significant" if campaign.story_structure == StoryStructure.SANDBOX else "moderate" if campaign.story_structure == StoryStructure.HYBRID else "limited"} ability to deviate from the main plot.
- NPCs and consequences should respond to {"player agency and choices" if campaign.story_structure in [StoryStructure.SANDBOX, StoryStructure.HYBRID] else "the predetermined story path"}.
- Reward {"creative problem-solving" if campaign.story_structure == StoryStructure.SANDBOX else "both clever tactics and exploration"} from the party.

---

## GAMEPLAY TONE & BALANCE

**Combat Tone**: {campaign.combat_tone.value.replace('_', ' ').title()}
- Death/Consequences: {"Always possible and impactful" if campaign.combat_tone in [CombatTone.DEADLY, CombatTone.LETHAL_BUT_FAIR] else "Adjusts to party power"}
- Style: {"Dramatic, fate favors the bold" if campaign.combat_tone == CombatTone.CINEMATIC else "Strategic positioning matters" if campaign.combat_tone == CombatTone.TACTICAL else "Risk and consequence are real"}

**Activity Balance**:
- Roleplay: {campaign.roleplay_percentage}%
- Combat: {campaign.combat_percentage}%
- Exploration: {campaign.exploration_percentage}%

**Priority**: Emphasize {
    "roleplay and character moments" if campaign.roleplay_percentage >= 60 else
    "combat encounters and tactical challenges" if campaign.combat_percentage >= 60 else
    "exploration and discovery" if campaign.exploration_percentage >= 60 else
    "balanced mix of all activities"
} throughout the campaign.

---

## CHARACTER & NARRATIVE INTEGRATION

**Backstory Integration Level**: {campaign.backstory_integration.value.title()}

**How to Integrate**:
{
    "Weave individual PC backstories deeply into the main plot. Each character should feel central to the campaign." if campaign.backstory_integration == BackstoryIntegration.DEEP else
    "Include some plot hooks from PC backstories. Not every character needs deep integration, but major ones should tie in." if campaign.backstory_integration == BackstoryIntegration.MODERATE else
    "Keep backstories loosely connected. The campaign plot is primary; individual histories are secondary flavor."
}

---

## SAFETY, BOUNDARIES & CONTENT

**Themes to Avoid**: {themes_text}

**Horror/Intensity Limits**: {campaign.horror_limits or "Moderate - some dark content okay, nothing graphic"}

**Sensitive Topics**: {sensitive_text}

**Content Guidelines**:
- Avoid graphic descriptions of avoided themes
- Handle sensitive topics with care; ask for consent if unsure
- Focus on storytelling over shock value
- Prioritize player comfort over difficulty

---

## VISION FOR SUCCESS

**Good Ending Description**:
{campaign.good_ending_description}

**Ending Type**: {campaign.ending_type.value.replace('_', ' ').title()}

**Success Looks Like**:
{
    "The party defeats the main antagonist and their core goal is thwarted. Clear victory." if campaign.ending_type == EndingType.CLEAR_VICTORY else
    "The party succeeds but at a cost - victory is bittersweet with lasting consequences." if campaign.ending_type == EndingType.BITTERSWEET else
    "Multiple valid endings exist based on player choices. The story doesn't have one 'correct' ending." if campaign.ending_type == EndingType.MULTIPLE else
    "The campaign concludes but the story continues beyond - open to sequels or continued adventure." if campaign.ending_type == EndingType.OPEN_ENDING else
    "Player choices and moral decisions determine the outcome."
}

---

## ADDITIONAL NOTES

{campaign.custom_notes or "None provided."}

---

## INSTRUCTIONS FOR THIS CAMPAIGN

1. **Respect the established tone**: Keep combat at {campaign.combat_tone.value.title()} level
2. **Honor player agency**: Give players {"freedom to reshape the story" if campaign.story_structure == StoryStructure.SANDBOX else "meaningful choices within the plot structure"}
3. **Balance activities**: Spend approximately {campaign.roleplay_percentage}% on roleplay, {campaign.combat_percentage}% on combat, {campaign.exploration_percentage}% on exploration
4. **Weave backstories**: {"Deeply integrate individual PC backstories into the plot" if campaign.backstory_integration == BackstoryIntegration.DEEP else "Include some PC backstory hooks where appropriate"}
5. **Avoid boundaries**: Do NOT include or emphasize: {themes_text}
6. **Aim for the vision**: Work toward this ending: {campaign.good_ending_description}

Use this brief to shape your narration, adjudication, and encounter design throughout the campaign.

---

"""
    
    return prompt

# ============================================================================
# CAMPAIGN SERIALIZATION
# ============================================================================

def serialize_campaign(campaign: CampaignSetup) -> Dict[str, Any]:
    """Convert CampaignSetup to JSON-serializable dict."""
    data = asdict(campaign)
    # Convert enums to strings
    data["story_type"] = campaign.story_type.value
    data["campaign_length"] = campaign.campaign_length.value
    data["story_structure"] = campaign.story_structure.value
    data["combat_tone"] = campaign.combat_tone.value
    data["focus_balance"] = campaign.focus_balance.value
    data["backstory_integration"] = campaign.backstory_integration.value
    data["ending_type"] = campaign.ending_type.value
    return data

def deserialize_campaign(data: Dict[str, Any]) -> CampaignSetup:
    """Reconstruct CampaignSetup from JSON dict."""
    # Convert string enums back to enum objects
    data_copy = data.copy()
    data_copy["story_type"] = StoryType(data["story_type"])
    data_copy["campaign_length"] = CampaignLength(data["campaign_length"])
    data_copy["story_structure"] = StoryStructure(data["story_structure"])
    data_copy["combat_tone"] = CombatTone(data["combat_tone"])
    data_copy["focus_balance"] = FocusBalance(data["focus_balance"])
    data_copy["backstory_integration"] = BackstoryIntegration(data["backstory_integration"])
    data_copy["ending_type"] = EndingType(data["ending_type"])
    return CampaignSetup(**data_copy)

# ============================================================================
# VALIDATION
# ============================================================================

def validate_campaign_responses(responses: Dict[str, Any]) -> tuple[bool, List[str]]:
    """
    Validate questionnaire responses.
    
    Returns:
        (is_valid: bool, errors: List[str])
    """
    errors = []
    
    required_fields = [
        "story_type", "campaign_length", "core_conflict",
        "antagonist_name", "antagonist_goal", "player_freedom",
        "combat_tone", "activity_balance", "backstory_integration",
        "safety_boundaries", "good_ending"
    ]
    
    for field in required_fields:
        if field not in responses or not responses[field]:
            errors.append(f"Missing required field: {field}")
    
    # Validate percentages if provided
    if "roleplay_percentage" in responses and "combat_percentage" in responses and "exploration_percentage" in responses:
        total = responses["roleplay_percentage"] + responses["combat_percentage"] + responses["exploration_percentage"]
        if total != 100:
            errors.append(f"Percentages must sum to 100, got {total}")
    
    return (len(errors) == 0, errors)


# ============================================================================
# PERSISTENCE FUNCTIONS - List, Load, Delete
# ============================================================================

import os
import json
from datetime import datetime
from typing import List

CAMPAIGNS_DIR = "saved_campaigns"

def _ensure_campaigns_dir() -> None:
    """Create campaigns directory if it doesn't exist."""
    if not os.path.exists(CAMPAIGNS_DIR):
        os.makedirs(CAMPAIGNS_DIR)


def _get_campaign_path(campaign_id: str) -> str:
    """Get the file path for a campaign."""
    return os.path.join(CAMPAIGNS_DIR, f"{campaign_id}.json")


def save_campaign(campaign: CampaignSetup) -> str:
    """
    Save a campaign to disk and return its ID.
    
    Args:
        campaign: CampaignSetup object to save
        
    Returns:
        campaign_id: The saved campaign's ID
    """
    _ensure_campaigns_dir()
    
    if not campaign.campaign_id:
        import uuid
        campaign.campaign_id = str(uuid.uuid4())
    
    campaign_data = serialize_campaign(campaign)
    campaign_data["created_at"] = datetime.now().isoformat()
    campaign_data["last_played"] = None
    
    path = _get_campaign_path(campaign.campaign_id)
    
    with open(path, 'w') as f:
        json.dump(campaign_data, f, indent=2)
    
    return campaign.campaign_id


def load_campaign(campaign_id: str) -> Optional[CampaignSetup]:
    """
    Load a campaign from disk.
    
    Args:
        campaign_id: The ID of the campaign to load
        
    Returns:
        CampaignSetup object or None if not found
    """
    path = _get_campaign_path(campaign_id)
    
    if not os.path.exists(path):
        return None
    
    with open(path, 'r') as f:
        campaign_data = json.load(f)
    
    # Update last_played timestamp
    campaign_data["last_played"] = datetime.now().isoformat()
    
    with open(path, 'w') as f:
        json.dump(campaign_data, f, indent=2)
    
    return deserialize_campaign(campaign_data)


def delete_campaign(campaign_id: str) -> bool:
    """
    Delete a campaign from disk.
    
    Args:
        campaign_id: The ID of the campaign to delete
        
    Returns:
        True if deleted, False if not found
    """
    path = _get_campaign_path(campaign_id)
    
    if not os.path.exists(path):
        return False
    
    os.remove(path)
    return True


def list_campaigns() -> List[Dict[str, Any]]:
    """
    List all saved campaigns.
    
    Returns:
        List of campaign metadata dictionaries
    """
    _ensure_campaigns_dir()
    
    campaigns = []
    
    if not os.path.exists(CAMPAIGNS_DIR):
        return campaigns
    
    for filename in os.listdir(CAMPAIGNS_DIR):
        if not filename.endswith('.json'):
            continue
        
        try:
            path = os.path.join(CAMPAIGNS_DIR, filename)
            with open(path, 'r') as f:
                campaign_data = json.load(f)
            
            campaigns.append({
                "id": campaign_data.get("campaign_id"),
                "name": campaign_data.get("campaign_name"),
                "story_type": campaign_data.get("story_type"),
                "campaign_length": campaign_data.get("campaign_length"),
                "core_conflict": campaign_data.get("core_conflict"),
                "estimated_sessions": campaign_data.get("estimated_sessions"),
                "created_at": campaign_data.get("created_at"),
                "last_played": campaign_data.get("last_played"),
            })
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error reading campaign {filename}: {e}")
            continue
    
    # Sort by last_played (most recent first), then by created_at
    campaigns.sort(
        key=lambda x: (
            x.get("last_played") or x.get("created_at") or "",
            x.get("created_at") or ""
        ),
        reverse=True
    )
    
    return campaigns


# ============================================================================
# SUMMARY
# ============================================================================

"""
Campaign Setup System provides:

1. 10-Question Questionnaire: Covers all aspects of campaign vision
2. CampaignSetup dataclass: Structured configuration storage
3. Serialization: Save/load campaigns as JSON
4. AI Prompt Generation: Create personalized AI DM prompts from setup
5. Validation: Ensure all responses are present and valid

Usage:
- DM answers questionnaire
- Responses stored locally
- CampaignSetup created from responses
- AI DM prompt generated for personalized session startup
- Campaign persists in room/database for future sessions

Expandable: Easy to add more questions, enums, or customization options.
"""
