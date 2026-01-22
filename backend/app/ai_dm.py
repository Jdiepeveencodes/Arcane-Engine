"""
AI Dungeon Master for D&D 5e campaigns in Arcane Engine.
Handles narration, combat mechanics, MAP_SEED generation, and campaign state.
"""

import json
import random
import re
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field, asdict
from datetime import datetime

# ============================================================================
# SYSTEM PROMPT
# ============================================================================

SYSTEM_PROMPT = """You are "The Dungeon Master," an AI game master running a D&D 5e campaign integrated with the **Arcane Engine** real-time multiplayer tabletop system. Your voice is playful, vivid, and theatrical, balancing classic fantasy narration with clear mechanical adjudication.

## OUTPUT RULES (CRITICAL)
- Response length: 1–3 sentences maximum (except for combat where you narrate action → result)
- NO "what do you do?" prompts unless player uses SUGGEST command
- NO out-of-character meta-commentary (use META command instead)
- Confident, decisive adjudication; never stall on rules uncertainty

## MECHANICS (D&D 5e)
- Initiative: 1d20 + DEX modifier
- Ability Checks: 1d20 + modifier vs. DC
- Attack Rolls: 1d20 + modifier vs. AC
- Damage: Roll dice based on weapon/spell + modifiers
- Conditions: Apply mechanical effects per 5e rules
- Spellcasting: Track spell slots, concentration, duration

## MAP_SEED FORMAT
When generating new locations, include a MAP_SEED block in this exact JSON format:
```json
MAP_SEED:{
  "name": "<map name>",
  "environment": "<tavern|castle|market|road|forest|dungeon|cave|temple>",
  "size_ft": {"width": <number>, "height": <number>},
  "grid": {"cell_ft": 5},
  "zones": [{"id": "A", "label": "<zone>", "shape": "rect", "bounds_ft": [x,y,w,h]}],
  "terrain": [{"type": "difficult|water|fire", "area_ft": [x,y,w,h]}],
  "objects": [{"type": "table|pillar|door", "pos_ft": [x,y], "size_ft": [w,h], "cover": "half"}],
  "entry_points": [{"label": "<entry>", "pos_ft": [x,y]}],
  "enemy_spawn": [{"label": "<enemies>", "count": 3, "pos_ft": [x,y]}],
  "player_spawn": [{"label": "<party>", "pos_ft": [x,y]}],
  "lighting": "bright|dim|dark",
  "notes": "<tactical hint>"
}
```

## COMMANDS
- NEW_CAMPAIGN: Generate 3 opening scenarios
- SETUP: Configure campaign (BBEG, setting, chapters)
- MAP: Generate MAP_SEED for current scene
- COMBAT_START: Initialize combat, roll initiative
- COMBAT_END: Exit combat, narrate outcome
- SUGGEST: Provide 2–3 next-step suggestions
- SHOW_LOG: Display campaign log
- META: Explain a ruling briefly

## TONE
- Vivid, sensory, theatrical fantasy narration
- Confident, decisive adjudication
- High-energy descriptions inspired by classic fantasy
- NO copyrighted material; emulate tone, not text
"""

# ============================================================================
# CAMPAIGN MODELS
# ============================================================================

@dataclass
class CampaignConfig:
    """Campaign configuration provided by DM."""
    name: str
    setting: str
    bbeg: str
    bbeg_motivation: str
    themes: List[str]
    main_chapters: List[str]
    starting_location: str
    roll_mode: str = "server"  # server or player
    dark_campaign: bool = False

@dataclass
class CampaignState:
    """Persistent campaign state."""
    campaign_id: str
    config: CampaignConfig
    current_chapter: int = 0
    current_subchapter: int = 0
    log_entries: List[Dict[str, Any]] = field(default_factory=list)
    npcs_met: Dict[str, Dict[str, str]] = field(default_factory=dict)
    locations_discovered: List[str] = field(default_factory=list)
    current_combat: Optional[Dict[str, Any]] = None
    loot_distributed: List[Dict[str, Any]] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

@dataclass
class CombatState:
    """Active combat state."""
    encounter_id: str
    initiative_order: List[Dict[str, Any]] = field(default_factory=list)  # [{actor_id, actor_name, initiative}]
    current_turn_index: int = 0
    round_number: int = 1
    active_effects: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)  # {token_id: [{effect_name, duration}]}
    action_used: Dict[str, bool] = field(default_factory=dict)  # {token_id: bool}
    bonus_action_used: Dict[str, bool] = field(default_factory=dict)
    reaction_used: Dict[str, bool] = field(default_factory=dict)

# ============================================================================
# SCENARIO GENERATION (NEW CAMPAIGN)
# ============================================================================

def generate_opening_scenarios() -> List[Dict[str, Any]]:
    """Generate 3 distinct starting scenarios with MAP_SEEDs."""
    scenarios = [
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
                    {"type": "table", "pos_ft": [35, 15], "size_ft": [10, 10], "cover": "half"},
                    {"type": "bar", "pos_ft": [65, 10], "size_ft": [15, 10], "cover": "three-quarters"}
                ],
                "entry_points": [{"label": "Main Door", "pos_ft": [30, 60]}],
                "enemy_spawn": [],
                "player_spawn": [{"label": "Party", "pos_ft": [30, 30]}],
                "lighting": "dim",
                "notes": "Crowded tavern; many NPCs provide cover."
            }
        },
        {
            "name": "Road Ambush",
            "hook": "Your caravan rounds a bend in the forest road when crossbow bolts whistle through the canopy—bandits! The lead guard shouts to dismount and take cover.",
            "objective": "Survive the ambush and interrogate the bandits for information.",
            "map_seed": {
                "name": "Ambush on the King's Road",
                "environment": "road",
                "size_ft": {"width": 100, "height": 80},
                "grid": {"cell_ft": 5},
                "zones": [
                    {"id": "A", "label": "Road", "shape": "rect", "bounds_ft": [30, 0, 40, 80]},
                    {"id": "B", "label": "North Woods", "shape": "rect", "bounds_ft": [0, 0, 30, 80]},
                    {"id": "C", "label": "South Woods", "shape": "rect", "bounds_ft": [70, 0, 30, 80]}
                ],
                "terrain": [
                    {"type": "difficult", "area_ft": [0, 0, 30, 80]},
                    {"type": "difficult", "area_ft": [70, 0, 30, 80]}
                ],
                "objects": [
                    {"type": "cart", "pos_ft": [50, 40], "size_ft": [20, 10], "cover": "half"},
                    {"type": "barrel", "pos_ft": [15, 30], "size_ft": [5, 5], "cover": "half"}
                ],
                "entry_points": [{"label": "North Road", "pos_ft": [50, 0]}, {"label": "South Road", "pos_ft": [50, 80]}],
                "enemy_spawn": [
                    {"label": "Bandits (North)", "count": 3, "pos_ft": [10, 20]},
                    {"label": "Bandits (South)", "count": 2, "pos_ft": [85, 60]}
                ],
                "player_spawn": [{"label": "Party & Guard", "pos_ft": [50, 40]}],
                "lighting": "bright",
                "notes": "Difficult terrain in woods; road provides easier movement."
            }
        },
        {
            "name": "Festival Heist",
            "hook": "You slip through the crowded market festival, eyeing the festival master's tent where rumors say a powerful artifact is stored. The guards are distracted, and opportunity is now.",
            "objective": "Steal the artifact without being caught or choose to investigate legitimately.",
            "map_seed": {
                "name": "Midsummer Festival Market",
                "environment": "market",
                "size_ft": {"width": 100, "height": 100},
                "grid": {"cell_ft": 5},
                "zones": [
                    {"id": "A", "label": "Market Stalls", "shape": "rect", "bounds_ft": [0, 0, 60, 60]},
                    {"id": "B", "label": "Festival Master's Tent", "shape": "rect", "bounds_ft": [70, 70, 30, 30]},
                    {"id": "C", "label": "Town Guard Station", "shape": "rect", "bounds_ft": [0, 70, 30, 30]}
                ],
                "terrain": [],
                "objects": [
                    {"type": "stall", "pos_ft": [10, 10], "size_ft": [15, 10], "cover": "half"},
                    {"type": "stall", "pos_ft": [35, 10], "size_ft": [15, 10], "cover": "half"},
                    {"type": "fountain", "pos_ft": [50, 50], "size_ft": [10, 10], "cover": "half"},
                    {"type": "tent", "pos_ft": [75, 75], "size_ft": [20, 20], "cover": "three-quarters"}
                ],
                "entry_points": [
                    {"label": "North Gate", "pos_ft": [50, 0]},
                    {"label": "South Gate", "pos_ft": [50, 100]}
                ],
                "enemy_spawn": [{"label": "Town Guard", "count": 4, "pos_ft": [15, 85]}],
                "player_spawn": [{"label": "Party", "pos_ft": [30, 30]}],
                "lighting": "bright",
                "notes": "Dense with crowds; easy to blend in or get spotted."
            }
        }
    ]
    return scenarios

# ============================================================================
# NARRATION GENERATION
# ============================================================================

def generate_narration(
    action_description: str,
    context: Optional[str] = None,
    campaign_state: Optional[CampaignState] = None
) -> str:
    """
    Generate AI DM narration for a player action.
    In production, this would call OpenAI GPT-4.
    For now, return a placeholder.
    """
    # TODO: Integrate with OpenAI API via ai_service.py
    # For now, return a template response
    return f"The DM narrates: {action_description} unfolds before you..."

def generate_map_seed(
    location_name: str,
    environment_type: str,
    context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a MAP_SEED for a new location.
    In production, this would call OpenAI to create a structured map.
    For now, return a template.
    """
    # TODO: Integrate with OpenAI API to generate structured MAP_SEEDs
    return {
        "name": location_name,
        "environment": environment_type,
        "size_ft": {"width": 80, "height": 80},
        "grid": {"cell_ft": 5},
        "zones": [{"id": "A", "label": "Main Area", "shape": "rect", "bounds_ft": [0, 0, 80, 80]}],
        "terrain": [],
        "objects": [],
        "entry_points": [{"label": "Entrance", "pos_ft": [40, 0]}],
        "enemy_spawn": [],
        "player_spawn": [{"label": "Party", "pos_ft": [40, 40]}],
        "lighting": "bright",
        "notes": "Generated map seed"
    }

# ============================================================================
# COMBAT MECHANICS
# ============================================================================

def roll_initiative(dex_modifier: int) -> int:
    """Roll initiative: 1d20 + DEX modifier."""
    d20 = random.randint(1, 20)
    return d20 + dex_modifier

def roll_attack(attack_bonus: int, advantage: bool = False, disadvantage: bool = False) -> Dict[str, Any]:
    """Roll attack: 1d20 + bonus, with optional advantage/disadvantage."""
    if advantage:
        roll = max(random.randint(1, 20), random.randint(1, 20))
    elif disadvantage:
        roll = min(random.randint(1, 20), random.randint(1, 20))
    else:
        roll = random.randint(1, 20)
    
    total = roll + attack_bonus
    hit = roll == 1 or (roll != 20 and total >= 10)  # Assume AC 10 for now
    
    return {
        "d20_roll": roll,
        "attack_bonus": attack_bonus,
        "total": total,
        "hit": hit,
        "critical": roll == 20,
        "fumble": roll == 1
    }

def roll_damage(damage_dice: str, damage_bonus: int) -> Dict[str, Any]:
    """Roll damage from a dice expression (e.g., '1d8', '2d6')."""
    # Simple parser: "1d8" or "2d6+3"
    parts = damage_dice.lower().split('d')
    if len(parts) != 2:
        return {"error": f"Invalid damage dice format: {damage_dice}"}
    
    try:
        num_dice = int(parts[0])
        die_spec = parts[1].split('+')
        die_size = int(die_spec[0])
        extra_bonus = int(die_spec[1]) if len(die_spec) > 1 else 0
    except (ValueError, IndexError):
        return {"error": f"Invalid damage dice format: {damage_dice}"}
    
    rolls = [random.randint(1, die_size) for _ in range(num_dice)]
    total = sum(rolls) + extra_bonus + damage_bonus
    
    return {
        "rolls": rolls,
        "dice_total": sum(rolls),
        "extra_bonus": extra_bonus,
        "damage_bonus": damage_bonus,
        "total": total
    }

def create_combat_state(
    encounter_id: str,
    actors: List[Dict[str, Any]]
) -> CombatState:
    """
    Create a new combat state from initiative rolls.
    actors: [{"actor_id", "actor_name", "dex_modifier"}, ...]
    """
    initiative_rolls = [
        {
            "actor_id": actor["actor_id"],
            "actor_name": actor["actor_name"],
            "initiative": roll_initiative(actor.get("dex_modifier", 0))
        }
        for actor in actors
    ]
    
    # Sort by initiative (descending), then by DEX (descending)
    initiative_order = sorted(
        initiative_rolls,
        key=lambda x: (-x["initiative"], -actors[[a["actor_id"] for a in actors].index(x["actor_id"])].get("dex_modifier", 0))
    )
    
    combat = CombatState(
        encounter_id=encounter_id,
        initiative_order=initiative_order
    )
    
    # Initialize action tracking
    for roll in initiative_order:
        combat.action_used[roll["actor_id"]] = False
        combat.bonus_action_used[roll["actor_id"]] = False
        combat.reaction_used[roll["actor_id"]] = False
    
    return combat

def get_current_actor(combat: CombatState) -> Optional[Dict[str, Any]]:
    """Get the actor whose turn it is."""
    if combat.current_turn_index < len(combat.initiative_order):
        return combat.initiative_order[combat.current_turn_index]
    return None

def advance_turn(combat: CombatState) -> None:
    """Advance to next actor's turn."""
    combat.current_turn_index += 1
    
    # If we've cycled through all actors, move to next round
    if combat.current_turn_index >= len(combat.initiative_order):
        combat.current_turn_index = 0
        combat.round_number += 1
        
        # Reset action tracking for new round
        for actor_id in combat.action_used.keys():
            combat.action_used[actor_id] = False
            combat.bonus_action_used[actor_id] = False
            combat.reaction_used[actor_id] = False

def apply_damage(
    combat: CombatState,
    target_id: str,
    damage: int,
    active_hp: Dict[str, int]
) -> Dict[str, Any]:
    """Apply damage to a target and return the result."""
    if target_id not in active_hp:
        return {"error": f"Target {target_id} not in combat"}
    
    current_hp = active_hp[target_id]
    new_hp = max(0, current_hp - damage)
    active_hp[target_id] = new_hp
    
    return {
        "target_id": target_id,
        "damage_dealt": damage,
        "hp_before": current_hp,
        "hp_after": new_hp,
        "is_dead": new_hp == 0
    }

# ============================================================================
# CAMPAIGN LOG
# ============================================================================

def add_log_entry(
    campaign: CampaignState,
    entry_type: str,
    content: str,
    chapter: Optional[int] = None
) -> None:
    """Add an entry to the campaign log."""
    campaign.log_entries.append({
        "timestamp": datetime.now().isoformat(),
        "type": entry_type,
        "content": content,
        "chapter": chapter or campaign.current_chapter
    })

def format_log_summary(campaign: CampaignState) -> str:
    """Format campaign log as a bullet-point summary."""
    summary = f"## Campaign: {campaign.config.name}\n"
    summary += f"**Setting**: {campaign.config.setting}\n"
    summary += f"**BBEG**: {campaign.config.bbeg}\n\n"
    
    summary += "### Main Story Progress\n"
    for i, chapter in enumerate(campaign.config.main_chapters):
        status = "✓" if i < campaign.current_chapter else "→" if i == campaign.current_chapter else "○"
        summary += f"{status} **{chapter}**\n"
    
    summary += "\n### Recent Events\n"
    for entry in campaign.log_entries[-5:]:  # Last 5 entries
        summary += f"- {entry['content']}\n"
    
    return summary

# ============================================================================
# INITIALIZATION
# ============================================================================

def create_campaign(config: Dict[str, Any]) -> CampaignState:
    """Create a new campaign from config."""
    campaign_config = CampaignConfig(
        name=config.get("name", "Untitled Campaign"),
        setting=config.get("setting", "Generic Fantasy World"),
        bbeg=config.get("bbeg", "Unknown Threat"),
        bbeg_motivation=config.get("bbeg_motivation", "Unknown"),
        themes=config.get("themes", []),
        main_chapters=config.get("main_chapters", []),
        starting_location=config.get("starting_location", "Unknown")
    )
    
    campaign = CampaignState(
        campaign_id=f"campaign_{random.randint(10000, 99999)}",
        config=campaign_config
    )
    
    add_log_entry(campaign, "campaign_start", f"Campaign '{campaign_config.name}' has begun!")
    
    return campaign
