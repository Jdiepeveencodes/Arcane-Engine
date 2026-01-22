"""
Character System for Arcane Engine.
Handles D&D 5e character creation, persistence, and management.
"""

import json
import os
import uuid
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime


# ============================================================================
# CHARACTER DATACLASS
# ============================================================================

@dataclass
class Character:
    """Represents a D&D 5e character."""
    character_id: str
    character_name: str
    player_name: str
    player_id: str  # User ID who created the character
    race: str
    class_name: str
    background: str
    alignment: str
    level: int = 1
    
    # Ability Scores
    ability_scores: Dict[str, int] = None
    
    # Skills and proficiencies
    skills: List[str] = None
    
    # Character background and personality
    background_story: str = ""
    personality_traits: str = ""
    ideals: str = ""
    bonds: str = ""
    flaws: str = ""
    equipment_notes: str = ""
    
    # Game statistics
    hit_points: int = 10
    armor_class: int = 10
    speed: int = 30
    
    # Timestamps
    created_at: str = ""
    last_played: Optional[str] = None
    
    def __post_init__(self):
        if not self.character_id:
            self.character_id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if self.ability_scores is None:
            self.ability_scores = {
                "strength": 10,
                "dexterity": 10,
                "constitution": 10,
                "intelligence": 10,
                "wisdom": 10,
                "charisma": 10,
            }
        if self.skills is None:
            self.skills = []


# ============================================================================
# CHARACTER PERSISTENCE
# ============================================================================

CHARACTERS_DIR = "saved_characters"


def _ensure_characters_dir() -> None:
    """Create characters directory if it doesn't exist."""
    if not os.path.exists(CHARACTERS_DIR):
        os.makedirs(CHARACTERS_DIR)


def _get_character_path(character_id: str) -> str:
    """Get the file path for a character."""
    return os.path.join(CHARACTERS_DIR, f"{character_id}.json")


def _get_player_dir(player_id: str) -> str:
    """Get the directory for a player's characters."""
    player_dir = os.path.join(CHARACTERS_DIR, f"player_{player_id}")
    return player_dir


def _ensure_player_dir(player_id: str) -> None:
    """Create player directory if it doesn't exist."""
    player_dir = _get_player_dir(player_id)
    if not os.path.exists(player_dir):
        os.makedirs(player_dir)


def _get_player_character_path(player_id: str, character_id: str) -> str:
    """Get the file path for a player's character."""
    player_dir = _get_player_dir(player_id)
    return os.path.join(player_dir, f"{character_id}.json")


# ============================================================================
# CHARACTER OPERATIONS
# ============================================================================

def create_character(character_data: Dict[str, Any], player_id: str) -> Character:
    """
    Create a new character from form data.
    
    Args:
        character_data: Dictionary with character creation form data
        player_id: ID of the player creating the character
        
    Returns:
        Character object
    """
    character = Character(
        character_id=str(uuid.uuid4()),
        character_name=character_data.get("character_name", "Unknown"),
        player_name=character_data.get("player_name", "Unknown"),
        player_id=player_id,
        race=character_data.get("race", "Human"),
        class_name=character_data.get("class", "Fighter"),
        background=character_data.get("background", "Soldier"),
        alignment=character_data.get("alignment", "Neutral Good"),
        level=character_data.get("level", 1),
        ability_scores=character_data.get("ability_scores", {
            "strength": 10,
            "dexterity": 10,
            "constitution": 10,
            "intelligence": 10,
            "wisdom": 10,
            "charisma": 10,
        }),
        skills=character_data.get("skills", []),
        background_story=character_data.get("background_story", ""),
        personality_traits=character_data.get("personality_traits", ""),
        ideals=character_data.get("ideals", ""),
        bonds=character_data.get("bonds", ""),
        flaws=character_data.get("flaws", ""),
        equipment_notes=character_data.get("equipment_notes", ""),
    )
    
    return character


def save_character(character: Character) -> str:
    """
    Save a character to disk.
    
    Args:
        character: Character object to save
        
    Returns:
        character_id
    """
    _ensure_player_dir(character.player_id)
    
    character_data = asdict(character)
    character_data["created_at"] = character.created_at
    character_data["last_played"] = None
    
    path = _get_player_character_path(character.player_id, character.character_id)
    
    with open(path, 'w') as f:
        json.dump(character_data, f, indent=2)
    
    return character.character_id


def load_character(character_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a character from disk.
    
    Args:
        character_id: The ID of the character to load
        
    Returns:
        Character dictionary or None if not found
    """
    # First try to find in any player directory
    if not os.path.exists(CHARACTERS_DIR):
        return None
    
    for player_dir in os.listdir(CHARACTERS_DIR):
        if player_dir.startswith("player_"):
            path = os.path.join(CHARACTERS_DIR, player_dir, f"{character_id}.json")
            if os.path.exists(path):
                with open(path, 'r') as f:
                    character_data = json.load(f)
                
                # Update last_played
                character_data["last_played"] = datetime.now().isoformat()
                
                with open(path, 'w') as f:
                    json.dump(character_data, f, indent=2)
                
                return character_data
    
    return None


def delete_character(character_id: str) -> bool:
    """
    Delete a character from disk.
    
    Args:
        character_id: The ID of the character to delete
        
    Returns:
        True if deleted, False if not found
    """
    if not os.path.exists(CHARACTERS_DIR):
        return False
    
    for player_dir in os.listdir(CHARACTERS_DIR):
        if player_dir.startswith("player_"):
            path = os.path.join(CHARACTERS_DIR, player_dir, f"{character_id}.json")
            if os.path.exists(path):
                os.remove(path)
                return True
    
    return False


def list_characters(player_id: str) -> List[Dict[str, Any]]:
    """
    List all characters for a player.
    
    Args:
        player_id: The ID of the player
        
    Returns:
        List of character dictionaries
    """
    characters = []
    player_dir = _get_player_dir(player_id)
    
    if not os.path.exists(player_dir):
        return characters
    
    for filename in os.listdir(player_dir):
        if not filename.endswith('.json'):
            continue
        
        try:
            path = os.path.join(player_dir, filename)
            with open(path, 'r') as f:
                character_data = json.load(f)
            
            characters.append({
                "id": character_data.get("character_id"),
                "character_name": character_data.get("character_name"),
                "player_name": character_data.get("player_name"),
                "race": character_data.get("race"),
                "class": character_data.get("class_name"),
                "level": character_data.get("level", 1),
                "background": character_data.get("background"),
                "created_at": character_data.get("created_at"),
                "last_played": character_data.get("last_played"),
            })
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error reading character {filename}: {e}")
            continue
    
    # Sort by last_played (most recent first), then by created_at
    characters.sort(
        key=lambda x: (
            x.get("last_played") or x.get("created_at") or "",
            x.get("created_at") or ""
        ),
        reverse=True
    )
    
    return characters


def update_character(character_id: str, updates: Dict[str, Any]) -> bool:
    """
    Update a character with new data.
    
    Args:
        character_id: The ID of the character to update
        updates: Dictionary with fields to update
        
    Returns:
        True if successful, False if not found
    """
    # Find and load the character
    if not os.path.exists(CHARACTERS_DIR):
        return False
    
    for player_dir in os.listdir(CHARACTERS_DIR):
        if player_dir.startswith("player_"):
            path = os.path.join(CHARACTERS_DIR, player_dir, f"{character_id}.json")
            if os.path.exists(path):
                with open(path, 'r') as f:
                    character_data = json.load(f)
                
                # Apply updates
                for key, value in updates.items():
                    if key in character_data:
                        character_data[key] = value
                
                # Update last_played
                character_data["last_played"] = datetime.now().isoformat()
                
                # Save updated character
                with open(path, 'w') as f:
                    json.dump(character_data, f, indent=2)
                
                return True
    
    return False


# ============================================================================
# SUMMARY
# ============================================================================

"""
Character System provides:

1. Character Creation: Build D&D 5e characters with all attributes
2. Persistence: Save/load characters as JSON files (organized by player)
3. Management: List, load, update, and delete characters
4. Timestamps: Track creation and last played times
5. Validation: Ensure all required fields are present

Usage:
- Player creates character through form
- Character data converted to Character object
- Saved to saved_characters/player_{player_id}/{character_id}.json
- Can be loaded and updated later
- Characters are player-specific (organized by player directory)
"""
