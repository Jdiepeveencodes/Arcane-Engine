"""
AI integration module for D&D Console.
Handles narration generation, map generation, and other AI features.
"""

from __future__ import annotations

import os
import asyncio
from typing import Optional
from .ai_service import (
    generate_narration,
    generate_map_image,
    NarrationRequest,
    MapGenerationRequest,
    validate_configuration,
)


# Configuration
ARCANE_AI_MODE = (os.getenv("ARCANE_AI_MODE") or "off").strip().lower()


def maybe_ai_response(room_id: str, text: str) -> Optional[str]:
    """
    Chat-based AI response hook.
    
    Returns:
      - None: no AI response (default)
      - str: a narration string to broadcast
    """
    if ARCANE_AI_MODE not in ("auto", "assist"):
        return None

    t = (text or "").strip()
    if not t:
        return None

    # Only respond if user explicitly asks
    if "arcane" in t.lower() or t.lower().startswith("ai:"):
        return "I'm ready to assist with narration and map generation."

    return None


def generate_scene_narration(
    scene_description: str,
    context: str = "",
    player_actions: list[str] = None,
    tone: str = "epic",
) -> Optional[str]:
    """
    Generate narration for a scene synchronously.
    
    Args:
        scene_description: What's happening in the scene
        context: Additional context (campaign notes, lore, etc)
        player_actions: What the players did
        tone: Narration tone (epic, mysterious, comedic, etc)
        
    Returns:
        Generated narration or None
    """
    if ARCANE_AI_MODE not in ("auto", "assist"):
        return None
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            generate_narration(
                NarrationRequest(
                    scene_description=scene_description,
                    context=context,
                    player_actions=player_actions or [],
                    tone=tone,
                )
            )
        )
        loop.close()
        return result
    except Exception as e:
        print(f"[ai] Error generating narration: {e}")
        return None


def generate_map_from_description(
    scene_description: str,
    style: str = "fantasy dungeon",
    dimensions: tuple[int, int] = (512, 512),
) -> Optional[str]:
    """
    Generate map image from scene description synchronously.
    
    Args:
        scene_description: Description of the location
        style: Art style (fantasy dungeon, tavern, wilderness, etc)
        dimensions: Image dimensions (width, height)
        
    Returns:
        Image URL or None
    """
    if ARCANE_AI_MODE not in ("auto", "assist"):
        return None
    
    try:
        # Run async function in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            generate_map_image(
                MapGenerationRequest(
                    scene_description=scene_description,
                    style=style,
                    dimensions=dimensions,
                )
            )
        )
        loop.close()
        return result
    except Exception as e:
        print(f"[ai] Error generating map: {e}")
        return None


def get_ai_status() -> dict:
    """Get AI service status and configuration."""
    return {
        "mode": ARCANE_AI_MODE,
        "enabled": ARCANE_AI_MODE in ("auto", "assist"),
        "configuration": validate_configuration(),
    }
