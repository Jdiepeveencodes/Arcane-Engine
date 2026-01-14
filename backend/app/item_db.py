from __future__ import annotations

import os
import random
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass(frozen=True)
class ItemDef:
    id: str
    name: str
    slot: str
    tier: int = 0
    category: str = "misc"     # weapons | armor | jewelry | misc
    is_two_handed: bool = False
    tags: List[str] = None


_CACHE: List[ItemDef] | None = None
_CACHE_ERR: str | None = None


def _default_db_path() -> str:
    # backend/app -> backend -> project root -> Item-database/ItemsDB.xml
    here = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(here, ".."))
    project_root = os.path.abspath(os.path.join(backend_dir, ".."))
    return os.path.join(project_root, "Item-database", "ItemsDB.xml")


def _parse_bool(v: str) -> bool:
    v = (v or "").strip().lower()
    return v in ("1", "true", "yes", "y", "t")


def _parse_int(v: str, default: int) -> int:
    try:
        return int(str(v).strip())
    except Exception:
        return default


def _split_tags(v: Any) -> List[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    s = str(v).strip()
    if not s:
        return []
    return [t.strip() for t in s.split(",") if t.strip()]


def _infer_category(slot: str) -> str:
    s = (slot or "").strip().lower()
    if s in ("mainhand", "offhand", "twohand", "weapon", "bow", "staff", "dagger", "sword", "axe", "mace"):
        return "weapons"
    if s in ("head", "chest", "legs", "boots", "gloves", "belt", "bracers", "shoulders", "armor", "shield"):
        return "armor"
    if s in ("ring", "ring1", "ring2", "necklace", "gorget", "jewelry"):
        return "jewelry"
    return "misc"


def load_items(force: bool = False) -> Tuple[List[ItemDef], Optional[str]]:
    global _CACHE, _CACHE_ERR
    if _CACHE is not None and not force:
        return _CACHE, _CACHE_ERR

    path = os.getenv("ARCANE_ITEM_DB_PATH") or _default_db_path()
    if not os.path.exists(path):
        _CACHE = []
        _CACHE_ERR = f"ItemsDB.xml not found at: {path}"
        return _CACHE, _CACHE_ERR

    try:
        tree = ET.parse(path)
        root = tree.getroot()
    except Exception as e:
        _CACHE = []
        _CACHE_ERR = f"Failed to parse ItemsDB.xml: {e}"
        return _CACHE, _CACHE_ERR

    items: List[ItemDef] = []

    # We accept many schemas:
    # - <item id="" name="" slot="" tier="" category="" tags="" is_two_handed=""/>
    # - or <item><id>..</id><name>..</name><slot>..</slot>...</item>
    for node in root.iter():
        if node.tag.lower() != "item":
            continue

        iid = (node.get("id") or node.findtext("id") or "").strip()
        name = (node.get("name") or node.findtext("name") or "").strip()
        slot = (node.get("slot") or node.findtext("slot") or "").strip()

        if not iid or not name or not slot:
            continue

        tier = _parse_int(node.get("tier") or node.findtext("tier") or "0", 0)
        category = (node.get("category") or node.findtext("category") or "").strip().lower() or _infer_category(slot)
        is_two_handed = _parse_bool(node.get("is_two_handed") or node.get("two_handed") or node.findtext("is_two_handed") or "")
        tags = _split_tags(node.get("tags") or node.findtext("tags"))

        # Optional convenience: tag-based inference
        for t in tags:
            if t.lower().startswith("tier:"):
                tier = _parse_int(t.split(":", 1)[1], tier)
            if t.lower().startswith("cat:"):
                category = t.split(":", 1)[1].strip().lower() or category

        items.append(ItemDef(id=iid, name=name, slot=slot, tier=tier, category=category, is_two_handed=is_two_handed, tags=tags))

    _CACHE = items
    _CACHE_ERR = None
    return _CACHE, _CACHE_ERR


def _weighted_pick(pool: List[ItemDef], weights: List[float]) -> ItemDef:
    return random.choices(pool, weights=weights, k=1)[0]


def generate_loot(cfg: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """Generate a list of loot items based on lightweight filters.

    cfg fields:
      - source: chest | mob | boss | shop | custom
      - count: int
      - tierMin / tierMax: int bounds (inclusive)
      - allowMagic: bool (if your XML uses tag 'magic' or 'magical', this will filter them)
      - categories: ["weapons","armor","jewelry"]
      - slots: ["mainHand","chest","ring"] (empty => any)
      - tags: ["undead","fire"] (all must match if provided)
    """
    items, err = load_items()
    if err:
        return [], err
    if not items:
        return [], "No items loaded from ItemsDB.xml"

    source = (cfg.get("source") or "mob").strip().lower()
    count = int(cfg.get("count") or 3)
    count = max(1, min(count, 25))

    tier_min = _parse_int(cfg.get("tierMin"), 0)
    tier_max = _parse_int(cfg.get("tierMax"), 6)
    if tier_min > tier_max:
        tier_min, tier_max = tier_max, tier_min

    allow_magic = bool(cfg.get("allowMagic", True))
    categories = [str(x).strip().lower() for x in (cfg.get("categories") or []) if str(x).strip()]
    slots = [str(x).strip() for x in (cfg.get("slots") or []) if str(x).strip()]
    tags = [str(x).strip().lower() for x in (cfg.get("tags") or []) if str(x).strip()]

    def is_magic(it: ItemDef) -> bool:
        t = [x.lower() for x in (it.tags or [])]
        return ("magic" in t) or ("magical" in t)

    pool = []
    for it in items:
        if it.tier < tier_min or it.tier > tier_max:
            continue
        if categories and it.category.lower() not in categories:
            continue
        if slots and (it.slot not in slots and it.slot.lower() not in [s.lower() for s in slots]):
            continue
        if (not allow_magic) and is_magic(it):
            continue
        if tags:
            it_tags = [x.lower() for x in (it.tags or [])]
            if not all(t in it_tags for t in tags):
                continue
        pool.append(it)

    if not pool:
        return [], "No items match loot filters."

    # Source affects tier weighting:
    tier_bias = {
        "mob": 0.9,
        "chest": 1.0,
        "boss": 1.2,
        "shop": 1.0,
        "custom": 1.0,
    }.get(source, 1.0)

    weights = []
    for it in pool:
        base = (it.tier + 1)
        w = float(base) ** float(tier_bias)
        weights.append(max(w, 0.01))

    out: List[Dict[str, Any]] = []
    for _ in range(count):
        picked = _weighted_pick(pool, weights)
        out.append(
            {
                "id": picked.id,
                "name": picked.name,
                "slot": picked.slot,
                "is_two_handed": picked.is_two_handed,
                "tags": picked.tags or [],
            }
        )
    return out, None
