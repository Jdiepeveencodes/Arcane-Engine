from __future__ import annotations

import os
import json
from typing import List, Dict, Any


def _get_client():
    """
    Lazy-load OpenAI client so the app can start
    even if OPENAI_API_KEY is missing.
    """
    from openai import OpenAI
    return OpenAI()


def narrator_prompt(scene: dict, recent_messages: List[dict]) -> str:
    chat_lines = []
    for m in recent_messages[-12:]:
        name = m.get("name", m.get("role", "player"))
        text = m.get("text", "")
        chat_lines.append(f"{name}: {text}")
    chat_block = "\n".join(chat_lines)

    return f"""
You are the NARRATOR for a D&D session. The human DM is authoritative.

CURRENT SCENE:
Title: {scene.get("title","")}
Description: {scene.get("text","")}

RECENT TABLE CHAT:
{chat_block}

Return JSON ONLY with keys:
- narration
- choices
- dm_notes
""".strip()


def scene_draft_prompt(style_hint: str, current_scene: dict) -> str:
    return f"""
You are assisting a Dungeon Master.

STYLE / THEME:
{style_hint}

CURRENT SCENE:
Title: {current_scene.get("title","")}
Description: {current_scene.get("text","")}

Return JSON ONLY with keys:
- title
- text
- dm_notes
""".strip()


def call_narrator(scene: dict, recent_messages: List[dict]) -> Dict[str, Any]:
    client = _get_client()
    model = os.getenv("OPENAI_MODEL", "gpt-5")

    resp = client.responses.create(
        model=model,
        input=narrator_prompt(scene, recent_messages),
        response_format={"type": "json_object"},
    )
    return json.loads(resp.output_text)


def call_scene_draft(style_hint: str, current_scene: dict) -> Dict[str, Any]:
    client = _get_client()
    model = os.getenv("OPENAI_MODEL", "gpt-5")

    resp = client.responses.create(
        model=model,
        input=scene_draft_prompt(style_hint, current_scene),
        response_format={"type": "json_object"},
    )
    return json.loads(resp.output_text)
