"""
AI Service for DM narration and map generation.
Supports multiple providers: OpenAI, local models, etc.
"""

import os
import json
from typing import Optional, Dict, Any
from enum import Enum


class AIProvider(Enum):
    """Supported AI providers."""
    OPENAI = "openai"
    LOCAL = "local"  # Future: support Ollama or other local models


# Configuration from environment
AI_PROVIDER = os.getenv("ARCANE_AI_PROVIDER", "openai").lower()
AI_API_KEY = os.getenv("ARCANE_OPENAI_API_KEY", "")
AI_NARRATION_MODEL = os.getenv("ARCANE_AI_NARRATION_MODEL", "gpt-4-turbo")
AI_IMAGE_MODEL = os.getenv("ARCANE_AI_IMAGE_MODEL", "dall-e-3")
AI_NARRATION_ENABLED = os.getenv("ARCANE_AI_NARRATION_ENABLED", "1").lower() in ("1", "true", "yes", "on")
AI_MAP_GENERATION_ENABLED = os.getenv("ARCANE_AI_MAP_GENERATION_ENABLED", "1").lower() in ("1", "true", "yes", "on")


class NarrationRequest:
    """Request for AI narration."""
    
    def __init__(
        self,
        scene_description: str,
        context: str = "",
        player_actions: list[str] = None,
        tone: str = "epic",
    ):
        self.scene_description = scene_description
        self.context = context
        self.player_actions = player_actions or []
        self.tone = tone


class MapGenerationRequest:
    """Request for AI map image generation."""
    
    def __init__(
        self,
        scene_description: str,
        style: str = "fantasy dungeon",
        dimensions: tuple[int, int] = (512, 512),
    ):
        self.scene_description = scene_description
        self.style = style
        self.width, self.height = dimensions


async def generate_narration(request: NarrationRequest) -> Optional[str]:
    """
    Generate narration text for the current scene.
    
    Args:
        request: NarrationRequest with scene details
        
    Returns:
        Generated narration text or None on error
    """
    if not AI_NARRATION_ENABLED:
        return None
    
    if AI_PROVIDER == "openai":
        return await _openai_narration(request)
    elif AI_PROVIDER == "local":
        return await _local_narration(request)
    
    return None


async def generate_map_image(request: MapGenerationRequest) -> Optional[str]:
    """
    Generate map image from description.
    
    Args:
        request: MapGenerationRequest with scene details
        
    Returns:
        Image URL or None on error
    """
    if not AI_MAP_GENERATION_ENABLED:
        return None
    
    if AI_PROVIDER == "openai":
        return await _openai_map_generation(request)
    elif AI_PROVIDER == "local":
        return await _local_map_generation(request)
    
    return None


async def _openai_narration(request: NarrationRequest) -> Optional[str]:
    """Generate narration using OpenAI API."""
    if not AI_API_KEY:
        print("[ai_service] OpenAI API key not configured (ARCANE_OPENAI_API_KEY)")
        return None
    
    try:
        import openai
        
        client = openai.AsyncOpenAI(api_key=AI_API_KEY)
        
        # Build the prompt
        prompt = f"""You are an epic D&D Dungeon Master. Generate vivid, atmospheric narration for the following scene.

Scene: {request.scene_description}
Tone: {request.tone}
"""
        
        if request.context:
            prompt += f"\nContext: {request.context}\n"
        
        if request.player_actions:
            prompt += f"\nPlayer Actions: {', '.join(request.player_actions)}\n"
        
        prompt += "\nProvide a brief but vivid narration (2-3 sentences). Include sensory details and atmosphere."
        
        response = await client.chat.completions.create(
            model=AI_NARRATION_MODEL,
            messages=[
                {"role": "system", "content": "You are an epic D&D Dungeon Master."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=200,
            temperature=0.8,
        )
        
        narration = response.choices[0].message.content.strip()
        print(f"[ai_service] Generated narration: {narration[:100]}...")
        return narration
        
    except ImportError:
        print("[ai_service] openai package not installed. Install with: pip install openai")
        return None
    except Exception as e:
        print(f"[ai_service] OpenAI narration error: {e}")
        return None


async def _openai_map_generation(request: MapGenerationRequest) -> Optional[str]:
    """Generate map image using OpenAI DALL-E."""
    if not AI_API_KEY:
        print("[ai_service] OpenAI API key not configured (ARCANE_OPENAI_API_KEY)")
        return None
    
    try:
        import openai
        
        client = openai.AsyncOpenAI(api_key=AI_API_KEY)
        
        # Build the prompt for image generation
        prompt = f"""Create a top-down D&D battle map for this scene.
Scene: {request.scene_description}
Style: {request.style}

Requirements:
- Top-down perspective suitable for a grid-based battle map
- Clear terrain features (walls, doors, water, etc.)
- Grid-like appearance with visible squares
- D&D {request.style} aesthetic
- Suitable for a 100x100 grid system"""
        
        response = await client.images.generate(
            model=AI_IMAGE_MODEL,
            prompt=prompt,
            size="1024x1024",  # DALL-E 3 supports 1024x1024
            quality="standard",
            n=1,
        )
        
        image_url = response.data[0].url
        print(f"[ai_service] Generated map image: {image_url}")
        return image_url
        
    except ImportError:
        print("[ai_service] openai package not installed. Install with: pip install openai")
        return None
    except Exception as e:
        print(f"[ai_service] OpenAI map generation error: {e}")
        return None


async def _local_narration(request: NarrationRequest) -> Optional[str]:
    """Generate narration using local model (Ollama, etc)."""
    # Future implementation for local models
    print("[ai_service] Local narration not yet implemented")
    return None


async def _local_map_generation(request: MapGenerationRequest) -> Optional[str]:
    """Generate map image using local model."""
    # Future implementation for local models
    print("[ai_service] Local map generation not yet implemented")
    return None


def validate_configuration() -> Dict[str, Any]:
    """Validate AI service configuration and return status."""
    return {
        "provider": AI_PROVIDER,
        "narration_enabled": AI_NARRATION_ENABLED,
        "map_generation_enabled": AI_MAP_GENERATION_ENABLED,
        "narration_model": AI_NARRATION_MODEL,
        "image_model": AI_IMAGE_MODEL,
        "api_key_configured": bool(AI_API_KEY),
        "status": "ready" if (AI_API_KEY and AI_PROVIDER == "openai") else "not_configured"
    }
