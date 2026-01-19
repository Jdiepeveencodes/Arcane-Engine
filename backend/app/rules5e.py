from __future__ import annotations

import os
import re
import xml.etree.ElementTree as ET
from typing import Any, Dict, Optional

RULES_VERSION = "5e-2024"

_CACHE: dict[str, Any] = {"mtime": None, "weapons": {}, "armor": {}}


def _db_path() -> str:
    here = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(here, ".."))
    project_root = os.path.abspath(os.path.join(backend_dir, ".."))
    return os.path.join(project_root, "Item-database", "ItemsDB.xml")


def _split_list(value: str) -> list[str]:
    if not value:
        return []
    return [part.strip().lower() for part in value.split(",") if part.strip()]


def _parse_bool(value: Any) -> bool:
    return str(value or "").strip().lower() in ("1", "true", "yes", "y")


def _parse_int(value: Any, default: int = 0) -> int:
    try:
        return int(str(value).strip())
    except Exception:
        return default


def _load_rules() -> None:
    path = os.getenv("ARCANE_ITEM_DB_PATH") or _db_path()
    if not os.path.exists(path):
        _CACHE["weapons"] = {}
        _CACHE["armor"] = {}
        _CACHE["mtime"] = None
        return

    mtime = os.path.getmtime(path)
    if _CACHE.get("mtime") == mtime:
        return

    tree = ET.parse(path)
    root = tree.getroot()

    weapons: dict[str, dict[str, Any]] = {}
    armor: dict[str, dict[str, Any]] = {}

    categories = root.find("categories")
    if categories is not None:
        for cat in categories.findall("category"):
            cat_id = (cat.get("id") or "").strip().lower()
            if cat_id == "weapons":
                for base in cat.findall(".//baseItem"):
                    iid = (base.get("id") or "").strip().lower()
                    if not iid:
                        continue
                    weapons[iid] = {
                        "id": iid,
                        "name": base.get("name") or "",
                        "weaponClass": (base.get("weaponClass") or "").strip().lower(),
                        "rangeType": (base.get("rangeType") or "").strip().lower(),
                        "damageDice": base.get("damageDice") or "",
                        "damageType": (base.get("damageType") or "").strip().lower(),
                        "properties": _split_list(base.get("properties") or ""),
                        "range": base.get("range") or "",
                        "versatile": base.get("versatile") or "",
                        "mastery": (base.get("mastery") or "").strip().lower(),
                    }
            elif cat_id == "armor":
                for base in cat.findall(".//baseItem"):
                    iid = (base.get("id") or "").strip().lower()
                    if not iid:
                        continue
                    armor[iid] = {
                        "id": iid,
                        "name": base.get("name") or "",
                        "armorType": (base.get("armorType") or "").strip().lower(),
                        "armorCategory": (base.get("armorCategory") or "").strip().lower(),
                        "acBase": base.get("acBase"),
                        "dexCap": base.get("dexCap"),
                        "strengthRequirement": base.get("strengthRequirement"),
                        "stealthDisadvantage": base.get("stealthDisadvantage"),
                        "donTime": base.get("donTime") or "",
                        "doffTime": base.get("doffTime") or "",
                    }

    _CACHE["weapons"] = weapons
    _CACHE["armor"] = armor
    _CACHE["mtime"] = mtime


def _base_id(item_id: str) -> str:
    return re.sub(r"_t\\d+$", "", (item_id or "").strip().lower())


def _ability_mod(score: Optional[int]) -> int:
    if score is None:
        return 0
    return (score - 10) // 2


def _coerce_int(value: Any) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except Exception:
        return None


def _parse_dex_cap(raw: Any) -> Optional[int]:
    if raw is None:
        return None
    text = str(raw).strip().lower()
    if text in ("", "none"):
        return None
    if text.startswith("+"):
        return _coerce_int(text[1:])
    return _coerce_int(text)


def _proficiency_bonus(level: Optional[int]) -> int:
    if not level:
        return 2
    if level >= 17:
        return 6
    if level >= 13:
        return 5
    if level >= 9:
        return 4
    if level >= 5:
        return 3
    return 2


def _normalize_words(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _parse_proficiencies(sheet: dict) -> set[str]:
    entries: list[str] = []
    raw = sheet.get("proficiencies")
    if isinstance(raw, list):
        entries.extend([str(x) for x in raw if str(x).strip()])
    if isinstance(raw, str):
        entries.extend(re.split(r"[\\n,]", raw))
    text = sheet.get("proficiencies_text") or ""
    if isinstance(text, str):
        entries.extend(re.split(r"[\\n,]", text))
    cleaned = {_normalize_words(x) for x in entries if str(x).strip()}
    out: set[str] = set()
    for item in cleaned:
        for part in item.split():
            out.add(part)
        out.add(item)
    return out


def _is_weapon_proficient(info: dict, profs: set[str]) -> bool:
    if not profs:
        return True
    weapon_class = info.get("weaponClass") or ""
    if weapon_class in profs:
        return True
    if "weapon" in profs or "weapons" in profs:
        return True
    name = info.get("name") or info.get("id") or ""
    return _normalize_words(name) in profs


def _score_from_sheet(sheet: dict, key: str) -> Optional[int]:
    stats = sheet.get("stats") or {}
    if isinstance(stats, dict):
        for k in (key, key[:3], key.lower()):
            if k in stats:
                return _coerce_int(stats.get(k))
        if key == "str":
            return _coerce_int(stats.get("strength"))
        if key == "dex":
            return _coerce_int(stats.get("dexterity"))
        if key == "con":
            return _coerce_int(stats.get("constitution"))
        if key == "int":
            return _coerce_int(stats.get("intelligence"))
        if key == "wis":
            return _coerce_int(stats.get("wisdom"))
        if key == "cha":
            return _coerce_int(stats.get("charisma"))
    mods = sheet.get("mods") or {}
    if isinstance(mods, dict):
        mod_val = mods.get(key) or mods.get(key[:3]) or mods.get(key.lower())
        if mod_val is not None:
            return (int(mod_val) * 2) + 10 if isinstance(mod_val, (int, float)) else None
    return None


def _derive_weapon(item: dict, sheet: dict, info: dict) -> dict:
    properties = list(info.get("properties") or [])
    range_type = info.get("rangeType") or ""
    damage_dice = info.get("damageDice") or ""
    damage_type = info.get("damageType") or ""
    versatile = info.get("versatile") or ""
    mastery = info.get("mastery") or ""

    str_score = _score_from_sheet(sheet, "str")
    dex_score = _score_from_sheet(sheet, "dex")
    str_mod = _ability_mod(str_score)
    dex_mod = _ability_mod(dex_score)

    if "finesse" in properties:
        ability = "dex" if dex_mod >= str_mod else "str"
    elif range_type == "ranged" and "thrown" not in properties:
        ability = "dex"
    else:
        ability = "str"

    ability_mod = dex_mod if ability == "dex" else str_mod

    level = _coerce_int(sheet.get("level"))
    prof_bonus = _coerce_int(sheet.get("prof_bonus"))
    if prof_bonus is None:
        prof_bonus = _proficiency_bonus(level)

    proficient = _is_weapon_proficient(info, _parse_proficiencies(sheet))
    magic_bonus = _coerce_int(item.get("magicBonus")) or 0

    if item.get("is_two_handed") and versatile:
        damage_dice = versatile

    attack_bonus = ability_mod + (prof_bonus if proficient else 0) + magic_bonus
    damage_bonus = ability_mod + magic_bonus

    return {
        "rule_source": RULES_VERSION,
        "rule_attack_bonus": attack_bonus,
        "rule_damage_bonus": damage_bonus,
        "rule_damage_dice": damage_dice,
        "rule_damage_type": damage_type,
        "rule_attack_ability": ability,
        "rule_proficient": proficient,
        "rule_weapon_properties": properties,
        "rule_weapon_mastery": mastery,
        "rule_range": info.get("range") or "",
        "rule_weapon_class": info.get("weaponClass") or "",
    }


def _derive_armor(item: dict, sheet: dict, info: dict) -> dict:
    dex_score = _score_from_sheet(sheet, "dex")
    dex_mod = _ability_mod(dex_score)
    ac_base = _coerce_int(info.get("acBase"))
    dex_cap = _parse_dex_cap(info.get("dexCap"))
    strength_req = _coerce_int(info.get("strengthRequirement"))
    stealth_dis = _parse_bool(info.get("stealthDisadvantage"))
    category = info.get("armorCategory") or ""
    armor_type = info.get("armorType") or ""

    if category == "shield":
        ac_value = ac_base or 0
        return {
            "rule_source": RULES_VERSION,
            "rule_armor_category": category,
            "rule_armor_type": armor_type,
            "rule_ac_bonus": ac_value,
            "rule_dex_cap": dex_cap,
            "rule_strength_req": strength_req,
            "rule_stealth_disadvantage": stealth_dis,
        }

    dex_used = dex_mod
    if dex_cap is not None:
        dex_used = min(dex_mod, dex_cap)
    ac_value = (ac_base or 0) + dex_used

    return {
        "rule_source": RULES_VERSION,
        "rule_armor_category": category,
        "rule_armor_type": armor_type,
        "rule_ac": ac_value,
        "rule_ac_base": ac_base,
        "rule_dex_cap": dex_cap,
        "rule_strength_req": strength_req,
        "rule_stealth_disadvantage": stealth_dis,
    }


def apply_inventory_rules(room_id: str, inventories: dict, characters: list[dict], clients: dict) -> None:
    _load_rules()
    if not inventories:
        return
    weapons = _CACHE.get("weapons") or {}
    armor = _CACHE.get("armor") or {}

    char_by_owner: dict[str, dict] = {}
    for char in characters:
        owner = char.get("owner_user_id") or ""
        if owner:
            char_by_owner[owner] = char

    name_index: dict[str, dict] = {}
    for char in characters:
        raw_name = char.get("name") or (char.get("sheet") or {}).get("name") or ""
        key = _normalize_words(str(raw_name))
        if key:
            name_index[key] = char

    for user_id, inv in inventories.items():
        sheet = {}
        char = char_by_owner.get(user_id)
        if not char:
            conn = clients.get(user_id)
            if conn:
                key = _normalize_words(conn.name)
                char = name_index.get(key)
        if char:
            sheet = char.get("sheet") or {}

        for group_key in ("bag", "equipment"):
            items = inv.get(group_key) or {}
            if isinstance(items, dict):
                iterable = list(items.values())
            else:
                iterable = list(items)
            for item in iterable:
                if not isinstance(item, dict):
                    continue
                base_id = _base_id(item.get("id") or "")
                if not base_id:
                    continue
                if base_id in weapons:
                    item.update(_derive_weapon(item, sheet, weapons[base_id]))
                if base_id in armor:
                    item.update(_derive_armor(item, sheet, armor[base_id]))
