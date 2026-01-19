from __future__ import annotations

import json
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
_CACHE_BY_ID: Dict[str, ItemDef] | None = None

MAX_TIER = 3
MAGIC_TYPES = {
    "acid",
    "cold",
    "fire",
    "lightning",
    "poison",
    "thunder",
    "holy",
    "radiant",
    "necrotic",
    "force",
    "psychic",
}
ELEMENTAL_TYPES = ["acid", "cold", "fire", "lightning", "poison", "thunder"]


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
    if s in ("ring", "ring1", "ring2", "necklace", "jewelry"):
        return "jewelry"
    return "misc"

def _parse_tier_refs(v: str) -> List[int]:
    if not v:
        return []
    out: List[int] = []
    for part in str(v).split(","):
        part = part.strip()
        if not part:
            continue
        try:
            out.append(int(part))
        except Exception:
            continue
    return out


def _category_tiers(cat: ET.Element) -> List[int]:
    applies = cat.find("appliesQuality")
    if applies is None:
        return [1]
    tiers = _parse_tier_refs(applies.get("tierRefs") or "")
    return tiers or [1]


def _equip_slot_from_armor(slot_id: str) -> str:
    s = (slot_id or "").strip().lower()
    return {
        "footwear": "boots",
        "leggings": "legs",
        "belt": "belt",
        "gloves": "gloves",
        "bracers": "bracers",
        "headwear": "head",
    }.get(s, s or "bag")


def _equip_slot_from_jewelry(slot_id: str) -> str:
    s = (slot_id or "").strip().lower()
    return {
        "ring": "ring",
        "necklace": "necklace",
    }.get(s, s or "bag")


def _base_item_tags(node: ET.Element, category: str, slot_id: str | None = None) -> List[str]:
    tags: List[str] = []
    raw_tags = _split_tags(node.get("tags") or "")
    tags.extend(raw_tags)
    for key in ("material", "weaponClass", "rangeType", "damageType", "magicType"):
        v = (node.get(key) or "").strip()
        if v:
            tags.append(v)
    if category:
        tags.append(category)
    if slot_id:
        tags.append(slot_id)
    return tags


def _load_base_items(root: ET.Element) -> List[ItemDef]:
    items: List[ItemDef] = []
    cats = root.find("categories")
    if cats is None:
        return items

    for cat in cats.findall("category"):
        cat_id = (cat.get("id") or "").strip().lower()
        if not cat_id:
            continue
        tiers = _category_tiers(cat)

        if cat_id == "weapons":
            for base in cat.findall(".//baseItem"):
                iid = (base.get("id") or "").strip()
                name = (base.get("name") or "").strip()
                if not iid or not name:
                    continue
                hands = _parse_int(base.get("hands") or "1", 1)
                is_two_handed = hands >= 2
                tags = _base_item_tags(base, cat_id)
                if is_two_handed:
                    tags.append("two-handed")
                for tier in tiers:
                    items.append(
                        ItemDef(
                            id=f"{iid}_t{tier}",
                            name=name,
                            slot="mainhand",
                            tier=tier,
                            category="weapons",
                            is_two_handed=is_two_handed,
                            tags=tags[:],
                        )
                    )
            continue

        if cat_id == "armor":
            for slot in cat.findall("slot"):
                slot_id = (slot.get("id") or "").strip().lower()
                equip_slot = _equip_slot_from_armor(slot_id)
                for base in slot.findall("baseItem"):
                    iid = (base.get("id") or "").strip()
                    name = (base.get("name") or "").strip()
                    if not iid or not name:
                        continue
                    tags = _base_item_tags(base, cat_id, slot_id)
                    for tier in tiers:
                        items.append(
                            ItemDef(
                                id=f"{iid}_t{tier}",
                                name=name,
                                slot=equip_slot,
                                tier=tier,
                                category="armor",
                                is_two_handed=False,
                                tags=tags[:],
                            )
                        )
            continue

        if cat_id == "jewelry":
            for slot in cat.findall("slot"):
                slot_id = (slot.get("id") or "").strip().lower()
                equip_slot = _equip_slot_from_jewelry(slot_id)
                for base in slot.findall("baseItem"):
                    iid = (base.get("id") or "").strip()
                    name = (base.get("name") or "").strip()
                    if not iid or not name:
                        continue
                    tags = _base_item_tags(base, cat_id, slot_id)
                    for tier in tiers:
                        items.append(
                            ItemDef(
                                id=f"{iid}_t{tier}",
                                name=name,
                                slot=equip_slot,
                                tier=tier,
                                category="jewelry",
                                is_two_handed=False,
                                tags=tags[:],
                            )
                        )
            continue

        for base in cat.findall(".//baseItem"):
            iid = (base.get("id") or "").strip()
            name = (base.get("name") or "").strip()
            if not iid or not name:
                continue
            tags = _base_item_tags(base, cat_id)
            for tier in tiers:
                items.append(
                    ItemDef(
                        id=f"{iid}_t{tier}",
                        name=name,
                        slot="bag",
                        tier=tier,
                        category=cat_id or "misc",
                        is_two_handed=False,
                        tags=tags[:],
                    )
                )
    return items


def load_items(force: bool = False) -> Tuple[List[ItemDef], Optional[str]]:
    global _CACHE, _CACHE_ERR, _CACHE_BY_ID
    if _CACHE is not None and not force:
        return _CACHE, _CACHE_ERR

    path = os.getenv("ARCANE_ITEM_DB_PATH") or _default_db_path()
    if not os.path.exists(path):
        _CACHE = []
        _CACHE_ERR = f"ItemsDB.xml not found at: {path}"
        _CACHE_BY_ID = {}
        return _CACHE, _CACHE_ERR

    try:
        tree = ET.parse(path)
        root = tree.getroot()
    except Exception as e:
        _CACHE = []
        _CACHE_ERR = f"Failed to parse ItemsDB.xml: {e}"
        _CACHE_BY_ID = {}
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
        
        # Check for is_two_handed, two_handed, or hands attribute
        is_two_handed = _parse_bool(node.get("is_two_handed") or node.get("two_handed") or node.findtext("is_two_handed") or "")
        if not is_two_handed:
            # If hands="2" attribute exists, treat as two-handed
            hands = _parse_int(node.get("hands") or node.findtext("hands") or "0", 0)
            is_two_handed = hands >= 2
        
        tags = _split_tags(node.get("tags") or node.findtext("tags"))

        # Optional convenience: tag-based inference
        for t in tags:
            if t.lower().startswith("tier:"):
                tier = _parse_int(t.split(":", 1)[1], tier)
            if t.lower().startswith("cat:"):
                category = t.split(":", 1)[1].strip().lower() or category

        items.append(ItemDef(id=iid, name=name, slot=slot, tier=tier, category=category, is_two_handed=is_two_handed, tags=tags))

    if not items:
        items = _load_base_items(root)

    _CACHE = items
    _CACHE_ERR = None
    _CACHE_BY_ID = {it.id: it for it in items}
    return _CACHE, _CACHE_ERR


def get_item_by_id(item_id: str) -> Optional[ItemDef]:
    if not item_id:
        return None
    items, err = load_items()
    if err or not items:
        return None
    return (_CACHE_BY_ID or {}).get(item_id)


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
      - categoryProps: {
          weapons|armor|jewelry: { bonus?: 1|2|3, elemental?: str, magical?: str }
        }
    """
    items, err = load_items()
    if not items or err:
        # In case the cache was built before new parsers existed, force a reload.
        items, err = load_items(force=True)
    if err:
        return [], err
    if not items:
        return [], "No items loaded from ItemsDB.xml"

    source = (cfg.get("source") or "mob").strip().lower()
    count = int(cfg.get("count") or 3)
    count = max(1, min(count, 25))

    tier_min = _parse_int(cfg.get("tierMin"), 0)
    tier_max = _parse_int(cfg.get("tierMax"), MAX_TIER)
    if tier_min > tier_max:
        tier_min, tier_max = tier_max, tier_min
    tier_min = max(0, min(tier_min, MAX_TIER))
    tier_max = max(0, min(tier_max, MAX_TIER))

    allow_magic = bool(cfg.get("allowMagic", True))
    add_elemental = bool(cfg.get("addElemental", False))
    categories = [str(x).strip().lower() for x in (cfg.get("categories") or []) if str(x).strip()]
    slots = [str(x).strip() for x in (cfg.get("slots") or []) if str(x).strip()]
    tags = [str(x).strip().lower() for x in (cfg.get("tags") or []) if str(x).strip()]
    category_props = cfg.get("categoryProps") or {}
    if isinstance(category_props, str):
        try:
            category_props = json.loads(category_props)
        except Exception:
            category_props = {}
    if not isinstance(category_props, dict):
        category_props = {}

    elemental_pool = list(ELEMENTAL_TYPES)
    magical_pool = sorted(set(MAGIC_TYPES) - set(ELEMENTAL_TYPES)) or sorted(MAGIC_TYPES)

    def _resolve_magic_type(value: Any, pool: list[str]) -> str:
        v = str(value or "").strip().lower()
        if not v:
            return ""
        if v == "random":
            return random.choice(pool) if pool else ""
        return v if v in MAGIC_TYPES else ""

    def _parse_bonus(value: Any) -> Optional[int]:
        b = _parse_int(value, 0)
        return b if b in (1, 2, 3) else None

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

    if not isinstance(category_props, dict):
        category_props = {}

    out: List[Dict[str, Any]] = []
    for _ in range(count):
        picked = _weighted_pick(pool, weights)
        out_tags = list(picked.tags or [])
        magic_type = None
        magic_bonus = None

        cat_key = (picked.category or "").strip().lower()
        props = category_props.get(cat_key)
        if not isinstance(props, dict):
            props = {}
        bonus = _parse_bonus(props.get("bonus"))
        elemental_raw = props.get("elemental")
        magical_raw = props.get("magical")
        elemental_is_random = str(elemental_raw or "").strip().lower() == "random"
        magical_is_random = str(magical_raw or "").strip().lower() == "random"

        if elemental_is_random and magical_is_random:
            if random.choice([True, False]):
                elemental = _resolve_magic_type("random", elemental_pool)
                magical = ""
            else:
                elemental = ""
                magical = _resolve_magic_type("random", magical_pool)
        else:
            elemental = _resolve_magic_type(elemental_raw, elemental_pool)
            magical = _resolve_magic_type(magical_raw, magical_pool)

        if elemental:
            magic_type = elemental
            if elemental not in out_tags:
                out_tags.append(elemental)
        if magical:
            if not magic_type:
                magic_type = magical
            if magical not in out_tags:
                out_tags.append(magical)
        if bonus:
            magic_bonus = bonus

        if (elemental or magical or bonus) and "magic" not in out_tags and "magical" not in out_tags:
            out_tags.append("magic")

        if not elemental and not magical and add_elemental and ELEMENTAL_TYPES:
            magic_type = random.choice(ELEMENTAL_TYPES)
            if magic_type not in out_tags:
                out_tags.append(magic_type)
            if "magic" not in out_tags and "magical" not in out_tags:
                out_tags.append("magic")

        out.append(
            {
                "id": picked.id,
                "name": picked.name,
                "slot": picked.slot,
                "tier": picked.tier,
                "category": picked.category,
                "is_two_handed": picked.is_two_handed,
                "magicType": magic_type,
                "magicBonus": magic_bonus,
                "tags": out_tags,
            }
        )
    return out, None
