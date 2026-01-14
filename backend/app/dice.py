from __future__ import annotations

import re
import secrets
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

# Supports: "d20", "2d6+1", " 3 d 8 - 2 "
DICE_RE = re.compile(r"^\s*(?:(\d+)\s*)?d\s*(\d+)\s*([+-]\s*\d+)?\s*$", re.IGNORECASE)

MAX_COUNT = 200  # sanity limit for MVP
ALLOWED_SIDES = {4, 6, 8, 10, 12, 20, 100}


@dataclass
class DiceResult:
    expr: str
    rolls: List[int]
    modifier: int
    total: int
    detail: str


def _roll_die(sides: int) -> int:
    # 1..sides inclusive, cryptographically strong
    return secrets.randbelow(sides) + 1


def parse_and_roll(expr: str, mode: Optional[str] = None) -> DiceResult:
    """
    mode:
      - None / "" => normal
      - "adv"     => advantage (only 1d20)
      - "dis"     => disadvantage (only 1d20)
    """
    raw = (expr or "").strip()
    if not raw:
        raise ValueError("Empty dice expression.")

    m = DICE_RE.match(raw)
    if not m:
        raise ValueError("Invalid dice expression. Examples: d20, 2d6+1, 3d8-2")

    count_s, sides_s, mod_s = m.groups()

    count = int(count_s) if count_s else 1
    sides = int(sides_s)
    modifier = int(mod_s.replace(" ", "")) if mod_s else 0

    if count < 1 or count > MAX_COUNT:
        raise ValueError(f"Dice count must be between 1 and {MAX_COUNT}.")

    if sides not in ALLOWED_SIDES:
        raise ValueError(f"Unsupported die: d{sides}. Allowed: {sorted(ALLOWED_SIDES)}")

    mode = (mode or "").strip().lower() or None

    detail_parts: List[str] = []
    rolls: List[int] = []

    # Advantage/disadvantage: MVP supports only 1d20
    if mode in ("adv", "dis"):
        if not (count == 1 and sides == 20):
            raise ValueError("adv/dis only supported for 1d20 in this MVP.")
        r1, r2 = _roll_die(20), _roll_die(20)
        picked = max(r1, r2) if mode == "adv" else min(r1, r2)
        rolls = [picked]
        detail_parts.append(f"{mode} rolls=[{r1}, {r2}] picked={picked}")
    else:
        rolls = [_roll_die(sides) for _ in range(count)]
        detail_parts.append(f"rolls={rolls}")

    total = sum(rolls) + modifier
    if modifier:
        detail_parts.append(f"mod={modifier}")

    detail = "; ".join(detail_parts)
    return DiceResult(expr=raw, rolls=rolls, modifier=modifier, total=total, detail=detail)


# -------------------------------------------------------------------
# Back-compat wrapper: some main.py versions import roll_dice()
# -------------------------------------------------------------------
def roll_dice(expr: str, mode: Optional[str] = None) -> Dict[str, Any]:
    r = parse_and_roll(expr, mode=mode)
    return {
        "expr": r.expr,
        "rolls": r.rolls,
        "modifier": r.modifier,
        "total": r.total,
        "detail": r.detail,
    }
