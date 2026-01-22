"""
Interactive Items System for D&D 5e Combat in Arcane Engine.
Handles mechanics for flammable objects, collapsible structures, environmental hazards, etc.
"""

import json
import random
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

# ============================================================================
# ITEM TYPE DEFINITIONS
# ============================================================================

@dataclass
class InteractiveItem:
    """Base class for interactive battlefield items."""
    id: str
    item_type: str  # flammable, collapsible, control_hazard, height_hazard, environmental_effect
    name: str
    pos_ft: tuple  # (x, y)
    size_ft: tuple  # (width, height)
    damage: str = "0"  # e.g., "2d6"
    damage_type: str = "none"  # fire, bludgeoning, none
    effect: str = ""  # Description of effect
    narration: str = ""  # DM narration (1-2 sentences)
    trigger: List[str] = field(default_factory=list)  # fire, spark, shove, etc.
    save_dc: int = 12
    save_type: str = "dexterity"  # dexterity, strength, constitution, wisdom
    is_triggered: bool = False

# ============================================================================
# ITEM STATISTICS TEMPLATES
# ============================================================================

ITEM_TEMPLATES = {
    "flammable": {
        "damage": "2d6",
        "damage_type": "fire",
        "zone_radius_ft": 10,
        "save_dc": 12,
        "save_type": "dexterity",
        "trigger": ["fire", "spark", "impact"],
        "effect": "burst damage + lingering fire zone",
        "secondary_effect": "creates difficult terrain"
    },
    "collapsible": {
        "damage": "2d8",
        "damage_type": "bludgeoning",
        "save_dc": 12,
        "save_type": "dexterity",
        "trigger": ["shove", "force", "damage_threshold:20"],
        "effect": "damage + prone/restrained",
        "secondary_effect": "creates difficult terrain and cover"
    },
    "control_hazard": {
        "damage": "0",
        "damage_type": "none",
        "check_dc": 12,
        "check_type": "strength_or_dexterity",
        "trigger": ["action"],
        "effect": "forced movement or isolation",
        "secondary_effect": "repositions combatants"
    },
    "height_hazard": {
        "damage": "1d6_per_10ft_fallen",
        "damage_type": "bludgeoning",
        "height_ft": 20,
        "elevation_bonus": 1,
        "elevation_penalty_below": -1,
        "trigger": ["push", "fall"],
        "effect": "falling damage + prone",
        "save_type": "strength"
    },
    "environmental_effect": {
        "damage": "0",
        "damage_type": "none",
        "condition": "obscured",
        "save_dc": 12,
        "trigger": ["enter_area"],
        "effect": "applies condition (obscured, restrained, poisoned, etc.)",
        "repeat_save": "end_of_turn"
    }
}

# ============================================================================
# DICE ROLLING
# ============================================================================

def parse_and_roll_damage(damage_expr: str) -> Dict[str, Any]:
    """
    Parse and roll damage from expression like '2d6+3' or '3d8'.
    Returns dict with rolls, total, breakdown.
    """
    if damage_expr == "0":
        return {"total": 0, "rolls": [], "expression": "0"}
    
    # Simple parser for XdY+Z format
    parts = damage_expr.lower().split('+')
    die_part = parts[0].strip()
    bonus = int(parts[1]) if len(parts) > 1 else 0
    
    try:
        num_dice, die_size = map(int, die_part.split('d'))
    except (ValueError, IndexError):
        return {"error": f"Invalid damage expression: {damage_expr}"}
    
    rolls = [random.randint(1, die_size) for _ in range(num_dice)]
    total = sum(rolls) + bonus
    
    return {
        "expression": damage_expr,
        "rolls": rolls,
        "dice_total": sum(rolls),
        "bonus": bonus,
        "total": total
    }

# ============================================================================
# ITEM TRIGGERING & EFFECTS
# ============================================================================

def check_if_triggered(item: InteractiveItem, trigger_type: str) -> bool:
    """Check if an item should trigger based on trigger type."""
    if item.is_triggered:
        return False  # Already triggered
    
    if trigger_type in item.trigger:
        return True
    
    # Check for threshold triggers like "damage_threshold:20"
    for trig in item.trigger:
        if trig.startswith("damage_threshold"):
            # Implement logic if needed
            pass
    
    return False

def apply_item_effect(
    item: InteractiveItem,
    targets: List[str],  # List of token IDs
    combat_state: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Apply an item's effect to targets.
    Returns effect summary with damage, conditions, etc.
    """
    item.is_triggered = True
    
    damage_result = parse_and_roll_damage(item.damage) if item.damage != "0" else {"total": 0}
    
    effect_summary = {
        "item_id": item.id,
        "item_name": item.name,
        "item_type": item.item_type,
        "targets": targets,
        "damage": damage_result,
        "damage_type": item.damage_type,
        "effect": item.effect,
        "narration": item.narration,
        "save_dc": item.save_dc,
        "save_type": item.save_type
    }
    
    return effect_summary

# ============================================================================
# IMPROVISED TRAPS (PLAYER-CREATED)
# ============================================================================

def create_improvised_trap(
    player_id: str,
    base_object: str,  # Object being used as trap
    trap_type: str,  # collapse, fire_trap, pit, etc.
    setup_dc: int = 12,
    position: tuple = (0, 0)
) -> Dict[str, Any]:
    """
    Create an improvised trap from player action.
    Returns trap configuration for DM to adjudicate.
    """
    trap = {
        "type": "improvised_trap",
        "created_by": player_id,
        "base_object": base_object,
        "trap_type": trap_type,
        "setup_dc": setup_dc,
        "position": position,
        "is_active": False,
        "setup_phase": "waiting_trigger"  # waiting_trigger, armed, triggered, resolved
    }
    
    # Default mechanics based on trap type
    if trap_type == "collapse":
        trap.update({
            "damage": "2d8",
            "damage_type": "bludgeoning",
            "effect": "prone",
            "effect_dc": 12
        })
    elif trap_type == "fire_trap":
        trap.update({
            "damage": "2d6",
            "damage_type": "fire",
            "zone_radius_ft": 10,
            "effect": "lingering fire"
        })
    elif trap_type == "pit_trap":
        trap.update({
            "damage": "2d6",
            "damage_type": "bludgeoning",
            "effect": "restrained",
            "effect_dc": 12,
            "escape_dc": 12
        })
    
    return trap

# ============================================================================
# ENVIRONMENTAL STATUS EFFECTS
# ============================================================================

ENVIRONMENTAL_CONDITIONS = {
    "smoke": {
        "condition": "heavily_obscured",
        "save_dc": 12,
        "save_type": "wisdom",
        "effect_on_fail": "disadvantage on attacks and perception",
        "repeat_save": "end_of_turn",
        "duration_rounds": "1d4"
    },
    "mud": {
        "condition": "restrained",
        "save_dc": 12,
        "save_type": "strength",
        "effect_on_fail": "movement halved, disadvantage on attack rolls",
        "escape_dc": 12,
        "repeat_save": "end_of_turn"
    },
    "ice": {
        "condition": "prone",
        "save_dc": 12,
        "save_type": "dexterity",
        "effect_on_fail": "prone, movement halved",
        "repeat_save": "end_of_turn",
        "duration_rounds": "1d3"
    },
    "webbing": {
        "condition": "difficult_terrain",
        "save_dc": 12,
        "save_type": "strength",
        "effect_on_fail": "restrained",
        "escape_dc": 12,
        "repeat_save": "action"
    },
    "toxic_gas": {
        "condition": "poisoned",
        "save_dc": 12,
        "save_type": "constitution",
        "damage_per_turn": "1d4",
        "damage_type": "poison",
        "repeat_save": "end_of_turn"
    },
    "quicksand": {
        "condition": "sinking",
        "save_dc": 15,
        "save_type": "strength",
        "escape_dc": 15,
        "danger_rounds": 5,
        "effect_on_fail": "restrained, sinking deeper each round"
    }
}

# ============================================================================
# HEIGHT & GRAVITY MECHANICS
# ============================================================================

def calculate_fall_damage(distance_ft: int) -> str:
    """Calculate fall damage based on distance."""
    distance_per_die = 10  # 1d6 per 10 feet
    num_dice = max(1, distance_ft // distance_per_die)
    
    # Cap at 20d6 (200+ feet = instant death)
    if num_dice > 20:
        return "instant_death"
    
    return f"{num_dice}d6"

def check_elevation_advantage(attacker_height: int, defender_height: int) -> Dict[str, Any]:
    """
    Check if attacker has elevation advantage.
    Returns advantage/disadvantage modifiers.
    """
    height_diff = attacker_height - defender_height
    
    if height_diff > 5:  # At least 5 feet higher
        return {
            "advantage": True,
            "attacker_modifier": 1,
            "defender_modifier": -1,
            "ranged_benefit": True,
            "melee_penalty_defender": True
        }
    elif height_diff < -5:  # At least 5 feet lower
        return {
            "advantage": False,
            "attacker_modifier": -1,
            "defender_modifier": 1,
            "ranged_benefit": False,
            "melee_penalty_attacker": True
        }
    else:
        return {
            "advantage": None,
            "attacker_modifier": 0,
            "defender_modifier": 0
        }

# ============================================================================
# ITEM GENERATION FOR MAP_SEEDS
# ============================================================================

def generate_items_for_environment(environment: str, num_items: int = 3) -> List[Dict[str, Any]]:
    """
    Generate appropriate interactive items for an environment.
    Used by map generation AI.
    """
    environment_items = {
        "tavern": [
            {"type": "flammable", "name": "Alcohol Kegs", "damage": "2d6", "trigger": ["fire"]},
            {"type": "collapsible", "name": "Wooden Tables", "damage": "2d8", "trigger": ["shove"]},
            {"type": "height_hazard", "name": "Balcony", "height_ft": 15, "trigger": ["push"]}
        ],
        "dungeon": [
            {"type": "flammable", "name": "Oil Barrels", "damage": "2d6", "trigger": ["fire"]},
            {"type": "control_hazard", "name": "Iron Portcullis Lever", "trigger": ["action"]},
            {"type": "environmental_effect", "name": "Toxic Gas Vent", "condition": "poisoned"}
        ],
        "castle": [
            {"type": "height_hazard", "name": "Stone Balcony", "height_ft": 25, "trigger": ["push"]},
            {"type": "collapsible", "name": "Stone Pillars", "damage": "3d8", "trigger": ["shove"]},
            {"type": "control_hazard", "name": "Portcullis", "trigger": ["action"]}
        ],
        "forest": [
            {"type": "flammable", "name": "Dead Trees", "damage": "2d6", "trigger": ["fire"]},
            {"type": "environmental_effect", "name": "Undergrowth", "condition": "difficult_terrain"},
            {"type": "height_hazard", "name": "Cliff Edge", "height_ft": 30, "trigger": ["push"]}
        ],
        "market": [
            {"type": "collapsible", "name": "Market Stalls", "damage": "2d8", "trigger": ["shove"]},
            {"type": "height_hazard", "name": "Merchant Balcony", "height_ft": 12, "trigger": ["push"]},
            {"type": "environmental_effect", "name": "Crowd Cover", "condition": "obscured"}
        ]
    }
    
    items_for_env = environment_items.get(environment, environment_items["dungeon"])
    selected = random.sample(items_for_env, min(num_items, len(items_for_env)))
    
    return [
        {
            "id": f"item_{i:03d}",
            "type": item["type"],
            "name": item["name"],
            "pos_ft": (random.randint(10, 70), random.randint(10, 70)),
            **{k: v for k, v in item.items() if k not in ["type", "name"]}
        }
        for i, item in enumerate(selected, 1)
    ]

# ============================================================================
# NARRATION & ADJUDICATION HELPERS
# ============================================================================

NARRATION_TEMPLATES = {
    "flammable_trigger": [
        "The {object} EXPLODES in a burst of flame!",
        "Fire spreads rapidly across the {object}, engulfing everything nearby.",
        "The {object} ignites with a tremendous WHOOSH!",
        "Flames consume the {object} in seconds, spreading outward."
    ],
    "collapsible_trigger": [
        "The {object} crashes down with a deafening CRUNCH!",
        "The {object} topples, burying everything beneath it.",
        "The {object} gives way, collapsing in a shower of debris.",
        "The {object} falls, creating a barrier of rubble."
    ],
    "control_trigger": [
        "You trigger the {object}—the {mechanism} SLAMS into place!",
        "With a pull of the {object}, the battlefield shifts dramatically.",
        "The {object} activates, forcing a tactical repositioning.",
        "Pulling the {object} changes the battlefield in seconds."
    ],
    "fall_trigger": [
        "The shove sends them over the edge—they plummet into darkness!",
        "They tumble through the air with a sickening thud.",
        "The fall is mercifully brief.",
        "They vanish over the edge, crashing down below."
    ],
    "environmental_trigger": [
        "{Condition} fills the area, changing the battlefield dynamics.",
        "The environment shifts—{condition} makes movement treacherous.",
        "{Condition} engulfs the area, obscuring vision and slowing movement.",
        "The {mechanism} releases {condition}, transforming the battlefield."
    ]
}

def generate_narration(
    item_type: str,
    object_name: str,
    custom_narration: Optional[str] = None
) -> str:
    """Generate DM narration for item trigger."""
    if custom_narration:
        return custom_narration
    
    templates = NARRATION_TEMPLATES.get(f"{item_type}_trigger", ["Something happens!"])
    template = random.choice(templates)
    
    return template.format(object=object_name, mechanism=object_name.lower(), condition=object_name)

# ============================================================================
# SUMMARY
# ============================================================================

"""
Interactive Items System provides:

1. Item Types: 6 categories with mechanics (flammable, collapsible, control, height, environmental)
2. Triggering: Detect when items are activated
3. Effects: Apply damage, conditions, terrain changes, forced movement
4. Improvised Traps: Allow players to create traps dynamically
5. Fall Mechanics: Height-based advantage/disadvantage and damage
6. Environmental Effects: Smoke, mud, ice, webbing, toxic gas, quicksand
7. Narration: Auto-generate vivid descriptions of item triggers

Usage:
- Generate items for MAP_SEED environments
- Check if item should trigger based on player action
- Apply effects to targets
- Generate narration for DM
- Adjudicate creative uses (improvised traps, combinations)
"""
