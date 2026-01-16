from __future__ import annotations

import os
from typing import Optional

# -----------------------------------------------------------------------------
# Back-compat entry point expected by main.py
# -----------------------------------------------------------------------------
def maybe_ai_response(room_id: str, text: str) -> Optional[str]:
    """
    MVP-safe AI hook.

    Returns:
      - None: no AI response (default)
      - str: a narration string to broadcast

    This is intentionally conservative so it never blocks room/chat stability.
    Wire real AI later by replacing the body with an API call.
    """

    # If you want a minimal "on/off" switch later:
    # ARCANE_AI_MODE=off|auto
    mode = (os.getenv("ARCANE_AI_MODE") or "off").strip().lower()
    if mode not in ("auto", "assist"):
        return None

    # Keep it harmless for now (no network calls).
    # You can replace this with OpenAI later.
    t = (text or "").strip()
    if not t:
        return None

    # Example placeholder: only respond if user explicitly asks
    if "arcane" in t.lower() or t.lower().startswith("ai:"):
        return "Understood. (AI placeholder response — wire API later.)"

    return None
