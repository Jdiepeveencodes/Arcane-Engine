from __future__ import annotations

import os
import sys
import logging
import random
import json
import time
import uuid
import sqlite3
import re
import urllib.error
import urllib.request
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .rooms import manager, Room, ClientConn
from .dice import roll_dice
from .item_db import generate_loot
from . import item_db
from . import rules5e
from . import rules5e_data
from .ai import maybe_ai_response
from .message_handlers import HANDLERS

load_dotenv()

app = FastAPI(title="Arcane Engine Backend")
loot_logger = logging.getLogger("arcane.loot")
LOOT_DEBUG_LOG_PATH = os.path.join(os.path.dirname(__file__), "loot-debug.log")

def _truthy_env(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


def _parse_rules_kinds() -> list[str]:
    raw = os.getenv("ARCANE_RULES_SYNC_KINDS", "races,feats,skills,weapons")
    return [k.strip().lower() for k in raw.split(",") if k.strip()]


def _append_loot_debug(line: str) -> None:
    try:
        with open(LOOT_DEBUG_LOG_PATH, "a", encoding="utf-8") as log_file:
            log_file.write(line + "\n")
    except Exception:
        pass


@app.on_event("startup")
def _loot_debug_startup() -> None:
    from . import message_handlers
    
    # Register utility functions with message_handlers module
    message_handlers.register_functions(
        db_append_chat_log=db_append_chat_log,
        db_upsert_room=db_upsert_room,
        clamp_int=clamp_int,
        normalize_inventories=_normalize_inventories,
        db_save_inventories=db_save_inventories,
        db_save_loot_bags=db_save_loot_bags,
        merge_category_props=_merge_category_props,
        apply_category_props_to_items=_apply_category_props_to_items,
        coerce_category_props=_coerce_category_props,
        broadcast_loot_snapshot=broadcast_loot_snapshot,
        filter_loot_bags=filter_loot_bags,
        append_loot_debug=_append_loot_debug,
        loot_logger=loot_logger,
    )
    
    try:
        line = f"[loot.debug] startup {time.time()}"
        _append_loot_debug(line)
        print(line, flush=True)
        sys.stderr.write(line + "\n")
        sys.stderr.flush()
        try:
            routes = []
            for route in app.routes:
                path = getattr(route, "path", "")
                if path:
                    routes.append(path)
            _append_loot_debug(f"[loot.debug] routes {sorted(set(routes))}")
        except Exception:
            pass
    except Exception:
        pass

# ------------------------------------------------------------
# Models
# ------------------------------------------------------------
class CreateRoomReq(BaseModel):
    name: str


class SceneUpdateReq(BaseModel):
    title: str
    text: str


class MapGenerateReq(BaseModel):
    prompt: str = ""
    theme: str = "Fantasy"
    cols: int | None = None
    rows: int | None = None
    cell: int | None = None


class MapGenerateResp(BaseModel):
    imageUrl: str
    cols: int
    rows: int
    cell: int


class CharacterSheet(BaseModel):
    name: Optional[str] = None
    level: Optional[int] = None
    class_name: Optional[str] = Field(default=None, alias="class")
    race: Optional[str] = None
    background: Optional[str] = None
    alignment: Optional[str] = None
    experience: Optional[int] = None
    stats: dict = Field(default_factory=dict)
    skills: dict = Field(default_factory=dict)
    proficiencies: list = Field(default_factory=list)
    hp: dict = Field(default_factory=dict)
    ac: Optional[int] = None
    speed: Optional[int] = None
    initiative: Optional[int] = None
    inventory: list = Field(default_factory=list)
    spells: list = Field(default_factory=list)
    currency: dict = Field(default_factory=dict)
    notes: Optional[str] = None

    class Config:
        extra = "allow"
        allow_population_by_field_name = True


class CharacterUploadReq(BaseModel):
    character_id: Optional[str] = None
    room_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    name: Optional[str] = None
    sheet: dict


class CharacterUpdateReq(BaseModel):
    room_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    name: Optional[str] = None
    sheet: Optional[dict] = None
    merge: bool = True


class RulesSyncReq(BaseModel):
    kinds: Optional[list[str]] = None


# ------------------------------------------------------------
# SQLite persistence
# ------------------------------------------------------------
DB_PATH = os.getenv("ARCANE_DB_PATH") or os.path.join(os.path.dirname(__file__), "arcane.db")
_db: sqlite3.Connection | None = None


def db() -> sqlite3.Connection:
    global _db
    if _db is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        _db = sqlite3.connect(DB_PATH, check_same_thread=False)
        _db.row_factory = sqlite3.Row
    return _db


def db_init():
    c = db().cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS rooms (
          room_id TEXT PRIMARY KEY,
          name TEXT,
          created_at REAL,
          updated_at REAL,
          scene_title TEXT,
          scene_text TEXT,
          grid_cols INTEGER,
          grid_rows INTEGER,
          grid_cell INTEGER,
          map_image_url TEXT
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS inventory (
          room_id TEXT,
          user_id TEXT,
          json TEXT,
          updated_at REAL,
          PRIMARY KEY (room_id, user_id)
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS characters (
          character_id TEXT PRIMARY KEY,
          room_id TEXT,
          owner_user_id TEXT,
          name TEXT,
          sheet_json TEXT,
          enriched_json TEXT,
          created_at REAL,
          updated_at REAL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id TEXT,
          ts REAL,
          type TEXT,
          user_id TEXT,
          name TEXT,
          role TEXT,
          channel TEXT,
          text TEXT,
          expr TEXT
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS loot_bags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id TEXT,
          bag_id TEXT,
          name TEXT,
          items TEXT,
          created_by TEXT,
          visible_to_players INTEGER,
          created_at REAL,
          updated_at REAL,
          UNIQUE(room_id, bag_id)
        )
        """
    )
    db().commit()


db_init()
rules5e_data.seed_core_rules(db())


def db_upsert_room(room: Any):
    now = time.time()
    c = db().cursor()
    c.execute(
        """
        INSERT INTO rooms (
          room_id, name, created_at, updated_at, scene_title, scene_text,
          grid_cols, grid_rows, grid_cell, map_image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(room_id) DO UPDATE SET
          name=excluded.name,
          updated_at=excluded.updated_at,
          scene_title=excluded.scene_title,
          scene_text=excluded.scene_text,
          grid_cols=excluded.grid_cols,
          grid_rows=excluded.grid_rows,
          grid_cell=excluded.grid_cell,
          map_image_url=excluded.map_image_url
        """,
        (
            getattr(room, "room_id", ""),
            getattr(room, "name", ""),
            getattr(room, "created_at", now),
            now,
            (getattr(room, "scene", {}) or {}).get("title", ""),
            (getattr(room, "scene", {}) or {}).get("text", ""),
            (getattr(room, "grid", {}) or {}).get("cols", 50),
            (getattr(room, "grid", {}) or {}).get("rows", 50),
            (getattr(room, "grid", {}) or {}).get("cell", 20),
            getattr(room, "map_image_url", "") or "",
        ),
    )
    db().commit()


def db_load_room(room_id: str) -> Any | None:
    c = db().cursor()
    row = c.execute("SELECT * FROM rooms WHERE room_id=?", (room_id,)).fetchone()
    if not row:
        return None
    room = Room(room_id=row["room_id"], name=row["name"])
    room.created_at = row["created_at"] or time.time()
    room.scene = {"title": row["scene_title"] or "", "text": row["scene_text"] or ""}
    room.grid = {"cols": row["grid_cols"] or 50, "rows": row["grid_rows"] or 50, "cell": row["grid_cell"] or 20}
    room.map_image_url = row["map_image_url"] or ""
    return room


def db_load_inventories(room_id: str) -> dict:
    """Load all player inventories for a room from database."""
    c = db().cursor()
    rows = c.execute("SELECT user_id, json FROM inventory WHERE room_id=?", (room_id,)).fetchall()
    inventories = {}
    for row in rows:
        try:
            inventories[row["user_id"]] = json.loads(row["json"])
        except (json.JSONDecodeError, TypeError):
            inventories[row["user_id"]] = {"bag": [], "equipment": {}}
    return inventories


def db_save_inventories(room_id: str, inventories: dict):
    """Save all inventories for a room to database."""
    c = db().cursor()
    now = time.time()
    for user_id, inventory in inventories.items():
        c.execute(
            """
            INSERT INTO inventory (room_id, user_id, json, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(room_id, user_id) DO UPDATE SET
              json=excluded.json,
              updated_at=excluded.updated_at
            """,
            (room_id, user_id, json.dumps(inventory), now)
        )
    db().commit()


def db_load_loot_bags(room_id: str) -> dict:
    """Load all loot bags for a room from database."""
    c = db().cursor()
    rows = c.execute("SELECT bag_id, name, items, created_by, visible_to_players FROM loot_bags WHERE room_id=?", (room_id,)).fetchall()
    loot_bags = {}
    for row in rows:
        try:
            items = json.loads(row["items"]) if row["items"] else []
        except (json.JSONDecodeError, TypeError):
            items = []
        loot_bags[row["bag_id"]] = {
            "name": row["name"],
            "items": items,
            "createdBy": row["created_by"],
            "visibleToPlayers": bool(row["visible_to_players"])
        }
    return loot_bags


def db_save_loot_bags(room_id: str, loot_bags: dict):
    """Save all loot bags for a room to database."""
    c = db().cursor()
    now = time.time()
    for bag_id, bag_data in loot_bags.items():
        c.execute(
            """
            INSERT INTO loot_bags (room_id, bag_id, name, items, created_by, visible_to_players, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(room_id, bag_id) DO UPDATE SET
              name=excluded.name,
              items=excluded.items,
              visible_to_players=excluded.visible_to_players,
              updated_at=excluded.updated_at
            """,
            (
                room_id,
                bag_id,
                bag_data.get("name", ""),
                json.dumps(bag_data.get("items", [])),
                bag_data.get("createdBy", ""),
                1 if bag_data.get("visibleToPlayers", False) else 0,
                now,
                now
            )
        )
    db().commit()


def db_load_chat_log(room_id: str, limit: int = 100) -> list:
    """Load recent chat messages for a room from database."""
    c = db().cursor()
    rows = c.execute(
        "SELECT ts, type, user_id, name, role, channel, text, expr FROM chat_log WHERE room_id=? ORDER BY ts DESC LIMIT ?",
        (room_id, limit)
    ).fetchall()
    messages = []
    for row in rows:
        messages.append({
            "ts": row["ts"],
            "type": row["type"],
            "userId": row["user_id"],
            "name": row["name"],
            "role": row["role"],
            "channel": row["channel"],
            "text": row["text"],
            "expr": row["expr"]
        })
    return list(reversed(messages))  # Return oldest first


def db_append_chat_log(room_id: str, message: dict):
    """Append a single message to the chat log."""
    c = db().cursor()
    c.execute(
        """
        INSERT INTO chat_log (room_id, ts, type, user_id, name, role, channel, text, expr)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            room_id,
            message.get("ts", time.time()),
            message.get("type", ""),
            message.get("userId", ""),
            message.get("name", ""),
            message.get("role", ""),
            message.get("channel", ""),
            message.get("text", ""),
            message.get("expr", "")
        )
    )
    db().commit()


def db_upsert_character(
    character_id: str,
    name: str,
    sheet: dict,
    enriched: dict | None,
    room_id: str | None = None,
    owner_user_id: str | None = None,
) -> None:
    now = time.time()
    c = db().cursor()
    c.execute(
        """
        INSERT INTO characters (
          character_id, room_id, owner_user_id, name, sheet_json, enriched_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(character_id) DO UPDATE SET
          room_id=excluded.room_id,
          owner_user_id=excluded.owner_user_id,
          name=excluded.name,
          sheet_json=excluded.sheet_json,
          enriched_json=excluded.enriched_json,
          updated_at=excluded.updated_at
        """,
        (
            character_id,
            room_id,
            owner_user_id,
            name,
            json.dumps(sheet, default=str),
            json.dumps(enriched or {}, default=str),
            now,
            now,
        ),
    )
    db().commit()


def db_get_character(character_id: str) -> dict | None:
    c = db().cursor()
    row = c.execute("SELECT * FROM characters WHERE character_id=?", (character_id,)).fetchone()
    if not row:
        return None
    sheet = json.loads(row["sheet_json"] or "{}")
    enriched = json.loads(row["enriched_json"] or "{}")
    return {
        "character_id": row["character_id"],
        "room_id": row["room_id"],
        "owner_user_id": row["owner_user_id"],
        "name": row["name"],
        "sheet": sheet,
        "enriched": enriched,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def db_list_characters(room_id: str | None = None) -> list[dict]:
    c = db().cursor()
    if room_id:
        rows = c.execute("SELECT * FROM characters WHERE room_id=? ORDER BY updated_at DESC", (room_id,)).fetchall()
    else:
        rows = c.execute("SELECT * FROM characters ORDER BY updated_at DESC").fetchall()
    out: list[dict] = []
    for row in rows:
        sheet = json.loads(row["sheet_json"] or "{}")
        out.append(
            {
                "character_id": row["character_id"],
                "room_id": row["room_id"],
                "owner_user_id": row["owner_user_id"],
                "name": row["name"],
                "sheet": sheet,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
        )
    return out


def _merge_dict(base: dict, patch: dict) -> dict:
    out = dict(base or {})
    for key, value in (patch or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _merge_dict(out.get(key, {}), value)
        else:
            out[key] = value
    return out


def _summarize_sheet_changes(before: dict, after: dict, patch: dict) -> list[str]:
    if not patch:
        return []
    changes: list[str] = []
    for key, new_value in patch.items():
        old_value = before.get(key)
        if old_value == new_value:
            continue
        if isinstance(new_value, (dict, list)):
            changes.append(f"{key} updated")
            continue
        old_text = "—" if old_value in (None, "") else str(old_value)
        new_text = "—" if new_value in (None, "") else str(new_value)
        changes.append(f"{key}: {old_text} -> {new_text}")
    return changes


def ensure_room_loaded(room_id: str) -> Any | None:
    room = manager.get_room(room_id)
    if room:
        return room
    loaded = db_load_room(room_id)
    if loaded:
        manager.rooms[room_id] = loaded
        return loaded
    return None


# ------------------------------------------------------------
# Static
# ------------------------------------------------------------
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

def default_map_url() -> str:
    env_url = (os.getenv("ARCANE_DEFAULT_MAP_URL") or "").strip()
    if env_url:
        return env_url
    if os.path.isdir(STATIC_DIR):
        for name in ("placeholder-map.webp", "placeholder-map.png", "placeholder-map.jpg", "placeholder-map.svg"):
            if os.path.isfile(os.path.join(STATIC_DIR, name)):
                return f"/static/{name}"
    return ""


@app.get("/")
def root():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return {"ok": True, "service": "arcane-engine-backend"}


# ------------------------------------------------------------
# DnD 5e API helpers
# ------------------------------------------------------------
DND5EAPI_BASE_URL = (os.getenv("ARCANE_DND5EAPI_URL") or "https://www.dnd5eapi.co").rstrip("/")
_dnd_cache: dict[str, dict] = {}


def _slugify(value: str) -> str:
    v = (value or "").strip().lower().replace("_", "-").replace(" ", "-")
    v = re.sub(r"[^a-z0-9-]", "", v)
    v = re.sub(r"-{2,}", "-", v)
    return v.strip("-")


def _dnd_fetch(path: str) -> dict | None:
    key = path
    if key in _dnd_cache:
        return _dnd_cache[key]
    url = f"{DND5EAPI_BASE_URL}{path}"
    try:
        with urllib.request.urlopen(url, timeout=6) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        if isinstance(payload, dict):
            _dnd_cache[key] = payload
            return payload
    except Exception:
        return None
    return None


def _lookup_dnd(kind: str, raw_value: Any) -> dict | None:
    if raw_value is None:
        return None
    if isinstance(raw_value, dict):
        raw_value = raw_value.get("index") or raw_value.get("name")
    if isinstance(raw_value, list) and raw_value:
        raw_value = raw_value[0]
    text = str(raw_value or "").strip()
    if not text:
        return None
    index = _slugify(text)
    if not index:
        return None
    payload = _dnd_fetch(f"/api/{kind}/{index}")
    if not payload:
        return None
    return {
        "index": payload.get("index") or index,
        "name": payload.get("name") or text,
        "url": payload.get("url") or f"/api/{kind}/{index}",
    }


def _enrich_character_sheet(sheet: dict) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    enriched: dict = {}

    class_value = sheet.get("class") or sheet.get("class_name") or sheet.get("className")
    class_ref = _lookup_dnd("classes", class_value)
    if class_value and not class_ref:
        warnings.append(f"Unknown class: {class_value}")
    if class_ref:
        enriched["class"] = class_ref

    race_value = sheet.get("race")
    race_ref = _lookup_dnd("races", race_value)
    if race_value and not race_ref:
        warnings.append(f"Unknown race: {race_value}")
    if race_ref:
        enriched["race"] = race_ref

    background_value = sheet.get("background")
    background_ref = _lookup_dnd("backgrounds", background_value)
    if background_value and not background_ref:
        warnings.append(f"Unknown background: {background_value}")
    if background_ref:
        enriched["background"] = background_ref

    spells_value = sheet.get("spells")
    spell_refs: list[dict] = []
    if isinstance(spells_value, list):
        for spell in spells_value[:30]:
            ref = _lookup_dnd("spells", spell)
            if ref:
                spell_refs.append(ref)
            else:
                if spell:
                    warnings.append(f"Unknown spell: {spell}")
    if spell_refs:
        enriched["spells"] = spell_refs

    return enriched, warnings


@app.get("/api/debug/where")
def debug_where():
    line = f"[loot.debug] where {time.time()}"
    _append_loot_debug(line)
    return {
        "cwd": os.getcwd(),
        "file": __file__,
        "log": LOOT_DEBUG_LOG_PATH,
    }


@app.post("/api/rules/sync")
def api_rules_sync(req: RulesSyncReq):
    counts = rules5e_data.sync_open5e(db(), req.kinds)
    return {"synced": counts}


@app.get("/api/rules/status")
def api_rules_status():
    return rules5e_data.rules_status(db())


@app.get("/api/rules/{kind}")
def api_rules_list(kind: str, full: int | None = None, limit: int | None = None):
    return rules5e_data.list_rules(db(), kind, full=bool(full), limit=limit)


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def clamp_int(x: Any, lo: int, hi: int, default: int) -> int:
    try:
        v = int(x)
    except Exception:
        return default
    return max(lo, min(hi, v))


def norm_role(v: str | None) -> str:
    r = (v or "player").strip().lower()
    if r not in ("dm", "player"):
        return "player"
    return r


def filter_loot_bags(room: Room, role: str, user_id: str) -> dict:
    def _strip_private(bag: dict) -> dict:
        return {k: v for k, v in bag.items() if not str(k).startswith("_") and k != "config"}

    if role == "dm":
        out_dm: dict = {}
        for bid, bag in getattr(room, "loot_bags", {}).items():
            clean = _strip_private(bag)
            cfg = bag.get("_config") or bag.get("config") or {}
            if isinstance(cfg, dict):
                category_props = _coerce_category_props(cfg.get("categoryProps"))
                debug_config = clean.get("debug_config") or bag.get("debug_config") or {}
                if not isinstance(debug_config, dict):
                    debug_config = {}
                debug_config = dict(debug_config)
                if "configKeys" not in debug_config:
                    debug_config["configKeys"] = list(cfg.keys())
                if "categoryProps" not in debug_config:
                    debug_config["categoryProps"] = category_props
                clean["debug_config"] = debug_config
            out_dm[bid] = clean
        return out_dm
    out: dict = {}
    for bid, bag in getattr(room, "loot_bags", {}).items():
        if not bag.get("visible_to_players", False):
            continue
        if bag.get("type") == "player":
            target = bag.get("target_user_id")
            if target and target != user_id:
                continue
        out[bid] = _strip_private(bag)
    return out


def _hydrate_item_fields(item: dict) -> dict:
    if not item or not isinstance(item, dict):
        return item
    item_id = (item.get("id") or "").strip()
    if not item_id:
        return item
    info = item_db.get_item_by_id(item_id)
    if not info:
        return item
    if not item.get("name"):
        item["name"] = info.name
    if not item.get("slot") or item.get("slot") == "bag":
        item["slot"] = info.slot
    if "tier" not in item:
        item["tier"] = info.tier
    if not item.get("category"):
        item["category"] = info.category
    if "is_two_handed" not in item:
        item["is_two_handed"] = info.is_two_handed
    if not item.get("tags"):
        item["tags"] = list(info.tags or [])
    return item


def _coerce_category_props(value: Any) -> dict | None:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except Exception:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


def _merge_category_props(cfg: dict, data: dict | None = None) -> dict:
    if not isinstance(cfg, dict):
        return {}
    props = _coerce_category_props(cfg.get("categoryProps"))
    if props is not None:
        cfg["categoryProps"] = props
        return cfg
    if isinstance(data, dict):
        for key in ("categoryProps", "category_props"):
            props = _coerce_category_props(data.get(key))
            if props is not None:
                cfg["categoryProps"] = props
                break
    return cfg


def _apply_category_props_to_items(items: list, cfg: dict) -> None:
    if not items or not isinstance(cfg, dict):
        return
    category_props = _coerce_category_props(cfg.get("categoryProps")) or {}

    normalized: dict[str, dict] = {}
    for key, value in category_props.items():
        if isinstance(value, dict):
            normalized[str(key).strip().lower()] = value

    if not normalized:
        return

    elemental_pool = list(item_db.ELEMENTAL_TYPES)
    magical_pool = sorted(set(item_db.MAGIC_TYPES) - set(item_db.ELEMENTAL_TYPES)) or sorted(item_db.MAGIC_TYPES)

    def resolve_type(value: Any, pool: list[str]) -> str:
        v = str(value or "").strip().lower()
        if not v:
            return ""
        if v == "random":
            return random.choice(pool) if pool else ""
        return v if v in item_db.MAGIC_TYPES else ""

    def resolve_bonus(value: Any) -> Optional[int]:
        try:
            b = int(value)
        except Exception:
            return None
        return b if b in (1, 2, 3) else None

    for item in items:
        if not isinstance(item, dict):
            continue
        cat = str(item.get("category") or "").strip().lower()
        props = normalized.get(cat)
        if not props:
            continue

        bonus = resolve_bonus(props.get("bonus"))
        elemental_raw = props.get("elemental")
        magical_raw = props.get("magical")
        elemental_is_random = str(elemental_raw or "").strip().lower() == "random"
        magical_is_random = str(magical_raw or "").strip().lower() == "random"
        if elemental_is_random and magical_is_random:
            if random.choice([True, False]):
                elemental = resolve_type("random", elemental_pool)
                magical = ""
            else:
                elemental = ""
                magical = resolve_type("random", magical_pool)
        else:
            elemental = resolve_type(elemental_raw, elemental_pool)
            magical = resolve_type(magical_raw, magical_pool)
        types = []
        if elemental:
            types.append(elemental)
        if magical and magical not in types:
            types.append(magical)

        if bonus is not None and not isinstance(item.get("magicBonus"), (int, float)):
            item["magicBonus"] = bonus

        if types and not item.get("magicType"):
            item["magicType"] = types[0]

        if types:
            tags = list(item.get("tags") or [])
            for t in types:
                if t not in tags:
                    tags.append(t)
            if "magic" not in tags and "magical" not in tags:
                tags.append("magic")
            item["tags"] = tags


def _normalize_inventories(room: Room) -> None:
    inventories = getattr(room, "inventories", {})
    for inv in inventories.values():
        bag = inv.get("bag") or []
        for item in bag:
            _hydrate_item_fields(item)
        equip = inv.get("equipment") or {}
        for slot, item in list(equip.items()):
            if item:
                _hydrate_item_fields(item)
    try:
        rules5e.apply_inventory_rules(room.room_id, inventories, db_list_characters(room.room_id), room.clients)
    except Exception:
        pass


@app.on_event("startup")
def _rules_sync_startup() -> None:
    kinds = _parse_rules_kinds()
    if not kinds:
        return

    try:
        counts = rules5e_data.rules_counts(db())
    except Exception:
        counts = {}

    missing = [k for k in kinds if counts.get(k, 0) == 0]
    present = [k for k in kinds if counts.get(k, 0) > 0]
    if missing:
        try:
            result = rules5e_data.sync_open5e(db(), kinds)
            _append_loot_debug(f"[rules.sync] bootstrap_all {result}")
        except Exception as exc:
            _append_loot_debug(f"[rules.sync] bootstrap failed: {exc}")
        else:
            try:
                counts = rules5e_data.rules_counts(db())
                _append_loot_debug(f"[rules.sync] counts {counts}")
            except Exception:
                pass

    if _truthy_env("ARCANE_RULES_SYNC_ON_STARTUP", "1") and present:
        try:
            result = rules5e_data.sync_open5e(db(), present)
            _append_loot_debug(f"[rules.sync] update {result}")
        except Exception as exc:
            _append_loot_debug(f"[rules.sync] update failed: {exc}")


async def broadcast_loot_snapshot(room: Room) -> None:
    for bag_id, bag in list(getattr(room, "loot_bags", {}).items()):
        if not bag.get("items"):
            del room.loot_bags[bag_id]
            continue
        cfg = bag.get("_config") or bag.get("config") or {}
        cfg = _merge_category_props(cfg)
        _apply_category_props_to_items(bag.get("items") or [], cfg)
    for conn in list(room.clients.values()):
        try:
            await conn.ws.send_json(
                {"type": "loot.snapshot", "loot_bags": filter_loot_bags(room, conn.role, conn.user_id)}
            )
        except Exception:
            pass


# ------------------------------------------------------------
# HTTP API
# ------------------------------------------------------------
@app.get("/api/rooms")
def api_rooms(debug: int | None = None):
    rooms = manager.list_rooms()
    if debug:
        return {
            "rooms": rooms,
            "debug": {
                "file": __file__,
                "cwd": os.getcwd(),
                "log": LOOT_DEBUG_LOG_PATH,
            },
        }
    return rooms


@app.post("/api/rooms")
def api_create_room(req: CreateRoomReq):
    room = manager.create_room(req.name)
    if not getattr(room, "map_image_url", ""):
        room.map_image_url = default_map_url()
    db_upsert_room(room)
    return {"room_id": room.room_id, "name": room.name}


@app.post("/api/characters/upload")
def api_character_upload(req: CharacterUploadReq):
    sheet_raw = req.sheet or {}
    sheet_model = CharacterSheet(**sheet_raw)
    sheet_data = sheet_model.dict(by_alias=True)
    name = (req.name or sheet_data.get("name") or "Unnamed").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Character name is required.")

    character_id = req.character_id or uuid.uuid4().hex[:8]
    enriched, warnings = _enrich_character_sheet(sheet_data)

    db_upsert_character(
        character_id=character_id,
        name=name,
        sheet=sheet_data,
        enriched=enriched,
        room_id=(req.room_id or "").strip() or None,
        owner_user_id=(req.owner_user_id or "").strip() or None,
    )

    return {
        "character_id": character_id,
        "name": name,
        "room_id": (req.room_id or "").strip() or None,
        "owner_user_id": (req.owner_user_id or "").strip() or None,
        "sheet": sheet_data,
        "enriched": enriched,
        "warnings": warnings,
    }


@app.get("/api/characters/{character_id}")
def api_character_get(character_id: str):
    record = db_get_character(character_id)
    if not record:
        raise HTTPException(status_code=404, detail="Character not found")
    return record


@app.patch("/api/characters/{character_id}")
async def api_character_update(character_id: str, req: CharacterUpdateReq):
    record = db_get_character(character_id)
    if not record:
        raise HTTPException(status_code=404, detail="Character not found")

    before_sheet = record.get("sheet") or {}
    sheet = before_sheet
    if req.sheet is not None:
        if req.merge:
            sheet = _merge_dict(sheet, req.sheet)
        else:
            sheet = req.sheet

    sheet_model = CharacterSheet(**sheet)
    sheet_data = sheet_model.dict(by_alias=True)
    name = (req.name or sheet_data.get("name") or record.get("name") or "Unnamed").strip()

    enriched, warnings = _enrich_character_sheet(sheet_data)
    room_id = (req.room_id or record.get("room_id") or "").strip() or None
    owner_user_id = (req.owner_user_id or record.get("owner_user_id") or "").strip() or None

    db_upsert_character(
        character_id=character_id,
        name=name,
        sheet=sheet_data,
        enriched=enriched,
        room_id=room_id,
        owner_user_id=owner_user_id,
    )

    if room_id and req.sheet:
        changes = _summarize_sheet_changes(before_sheet or {}, sheet_data or {}, req.sheet)
        if changes:
            room = ensure_room_loaded(room_id)
            if room:
                summary = "; ".join(changes[:6])
                if len(changes) > 6:
                    summary += "; …"
                msg = {
                    "type": "chat.message",
                    "ts": time.time(),
                    "user_id": "system",
                    "name": "System",
                    "role": "system",
                    "channel": "table",
                    "text": f"{name} updated: {summary}",
                }
                room.chat_log.append(msg)
                await manager.broadcast(room_id, msg)

    return {
        "character_id": character_id,
        "name": name,
        "room_id": room_id,
        "owner_user_id": owner_user_id,
        "sheet": sheet_data,
        "enriched": enriched,
        "warnings": warnings,
    }


@app.get("/api/rooms/{room_id}/characters")
def api_characters_for_room(room_id: str):
    return {"room_id": room_id, "characters": db_list_characters(room_id)}


@app.post("/api/rooms/{room_id}/scene")
def api_scene_update(room_id: str, req: SceneUpdateReq):
    room = ensure_room_loaded(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    room.scene = {"title": req.title[:60], "text": req.text[:2400]}
    db_upsert_room(room)
    return {"ok": True}


async def _handle_map_generate(room_id: str, req: MapGenerateReq) -> MapGenerateResp:
    room = ensure_room_loaded(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if not hasattr(room, "grid") or not isinstance(room.grid, dict):
        room.grid = {"cols": 50, "rows": 50, "cell": 20}

    if req.cols is not None:
        room.grid["cols"] = clamp_int(req.cols, 1, 50, 50)
    else:
        room.grid["cols"] = clamp_int(room.grid.get("cols"), 1, 50, 50)
    if req.rows is not None:
        room.grid["rows"] = clamp_int(req.rows, 1, 50, 50)
    else:
        room.grid["rows"] = clamp_int(room.grid.get("rows"), 1, 50, 50)
    if req.cell is not None:
        room.grid["cell"] = clamp_int(req.cell, 8, 128, 20)
    else:
        room.grid["cell"] = clamp_int(room.grid.get("cell"), 8, 128, 20)

    room.map_image_url = default_map_url()

    db_upsert_room(room)
    await manager.broadcast(
        room.room_id,
        {
            "type": "map.snapshot",
            "grid": room.grid,
            "map_image_url": room.map_image_url,
            "tokens": getattr(room, "tokens", []),
            "lighting": getattr(room, "lighting", {"fog_enabled": False, "ambient_radius": 0, "darkness": False}),
        },
    )

    return MapGenerateResp(
        imageUrl=room.map_image_url,
        cols=room.grid["cols"],
        rows=room.grid["rows"],
        cell=room.grid["cell"],
    )


@app.post("/api/rooms/{room_id}/map_generate", response_model=MapGenerateResp)
async def api_map_generate(room_id: str, req: MapGenerateReq):
    return await _handle_map_generate(room_id, req)


@app.post("/api/rooms/{room_id}/map/generate", response_model=MapGenerateResp)
async def api_map_generate_alias(room_id: str, req: MapGenerateReq):
    return await _handle_map_generate(room_id, req)


# ------------------------------------------------------------
# WebSocket room
# ------------------------------------------------------------

# ✅ Compatibility alias (frontend expects /ws/rooms/{room_id})
@app.websocket("/ws/rooms/{room_id}")
async def ws_room_rooms(websocket: WebSocket, room_id: str, name: str, role: str):
    # Frontend connects to /ws/rooms/{room_id}?name=...&role=...
    await ws_room(websocket, room_id, name, role)


@app.websocket("/ws/{room_id}")
async def ws_room(websocket: WebSocket, room_id: str, name: str, role: str):
    await websocket.accept()
    try:
        line = f"[ws.connect] {json.dumps({'room': room_id, 'name': name, 'role': role}, default=str)}"
        _append_loot_debug(line)
        print(line, flush=True)
    except Exception:
        pass

    # ✅ DB fallback: join works even after uvicorn reload
    room = ensure_room_loaded(room_id)
    if not room:
        await websocket.send_json({"type": "error", "message": "Room not found"})
        await websocket.close()
        return

    role = (role or "").lower().strip()
    if role not in ("dm", "player"):
        role = "player"

    ok, reason = manager.can_join(room, role)
    if not ok:
        await websocket.send_json({"type": "error", "message": reason})
        await websocket.close()
        return

    # map fields
    if not hasattr(room, "grid") or not isinstance(room.grid, dict):
        room.grid = {"cols": 50, "rows": 50, "cell": 20}
    room.grid["cols"] = clamp_int(room.grid.get("cols"), 1, 50, 50)
    room.grid["rows"] = clamp_int(room.grid.get("rows"), 1, 50, 50)
    room.grid["cell"] = clamp_int(room.grid.get("cell"), 8, 128, 20)
    if not hasattr(room, "map_image_url"):
        room.map_image_url = ""
    if not hasattr(room, "lighting") or not isinstance(room.lighting, dict):
        room.lighting = {"fog_enabled": False, "ambient_radius": 0, "darkness": False}

    user_id = f"{int(time.time() * 1000)}-{os.urandom(2).hex()}"
    name = (name or role).strip()[:128]

    conn = ClientConn(user_id=user_id, name=name, role=role, ws=websocket)
    if not manager.add_client(room_id, conn):
        await websocket.send_json({"type": "error", "message": "Failed to join room"})
        await websocket.close()
        return

    new_token = None
    if role == "player":
        if not hasattr(room, "tokens") or not isinstance(room.tokens, list):
            room.tokens = []
        cols = max(1, int(room.grid.get("cols", 50)))
        rows = max(1, int(room.grid.get("rows", 50)))
        idx = len([t for t in room.tokens if t.get("kind") == "player"])
        x = idx % cols
        y = min(rows - 1, idx // cols)
        new_token = {
            "id": str(uuid.uuid4())[:8],
            "label": name[:16] or "Player",
            "kind": "player",
            "x": x,
            "y": y,
            "size": 1,
            "owner_user_id": user_id,
            "vision_radius": 10,
            "darkvision": False,
        }
        room.tokens.append(new_token)

    try:
        members = manager.get_members(room_id)
        scene = getattr(room, "scene", {"title": "", "text": ""})
        grid = getattr(room, "grid", {"cols": 50, "rows": 50, "cell": 20})
        map_url = getattr(room, "map_image_url", "") or ""
        tokens = getattr(room, "tokens", [])
        
        # Load persisted data from database on first player join
        if not getattr(room, "_db_loaded", False):
            room.inventories = db_load_inventories(room_id)
            room.loot_bags = db_load_loot_bags(room_id)
            room.chat_log = db_load_chat_log(room_id, limit=100)
            room._db_loaded = True
        
        _normalize_inventories(room)
        inventories = getattr(room, "inventories", {})
        for bag_id, bag in list(getattr(room, "loot_bags", {}).items()):
            if not bag.get("items"):
                del room.loot_bags[bag_id]
        loot_bags = filter_loot_bags(room, role, user_id)
        chat_log = getattr(room, "chat_log", [])
        
        await websocket.send_json(
            {
                "type": "state.init",
                "you": {"user_id": user_id, "name": name, "role": role},
                "members": members,
                "room": {
                    "scene": scene,
                    "grid": grid,
                    "map_image_url": map_url,
                    "tokens": tokens,
                    "lighting": getattr(room, "lighting", {"fog_enabled": False, "ambient_radius": 0, "darkness": False}),
                    "inventories": inventories,
                    "loot_bags": loot_bags,
                },
                "chat_log": chat_log,
            }
        )

        if new_token:
            await manager.broadcast(room_id, {"type": "token.added", "token": new_token}, exclude_user_id=user_id)

        # Add join message to chat log and broadcast
        join_msg = {
            "type": "chat.message",
            "ts": time.time(),
            "user_id": "system",
            "name": "System",
            "role": "system",
            "channel": "table",
            "text": f"{name} ({role}) has joined the room.",
        }
        room.chat_log.append(join_msg)
        
        await manager.broadcast(
            room_id,
            {
                "type": "members.update",
                "members": manager.get_members(room_id),
            },
            exclude_user_id=user_id,
        )
        
        await manager.broadcast(room_id, join_msg)

        while True:
            data = await websocket.receive_json()
            msg_type = (data.get("type") or "").strip()
            
            # Debug logging for loot messages
            if msg_type.startswith("loot."):
                payload = {"room": room_id, "user_id": user_id, "role": role, "type": msg_type, "keys": list(data.keys())}
                line = f"[loot.ws] {json.dumps(payload, default=str)}"
                _append_loot_debug(line)
                try:
                    print(line, flush=True)
                except Exception:
                    pass
            
            # Dispatch to handler if one exists
            if msg_type in HANDLERS:
                try:
                    handler = HANDLERS[msg_type]
                    await handler(room, websocket, data, manager, room_id, user_id, role, name)
                except Exception as e:
                    try:
                        await websocket.send_json({"type": "error", "message": str(e)})
                    except Exception:
                        pass
            else:
                # Unknown message type
                await websocket.send_json({"type": "error", "message": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        pass
    finally:
        manager.remove_client(room_id, user_id)
        
        # Add leave message to chat log and broadcast
        leave_msg = {
            "type": "chat.message",
            "ts": time.time(),
            "user_id": "system",
            "name": "System",
            "role": "system",
            "channel": "table",
            "text": f"{name} ({role}) has left the room.",
        }
        room.chat_log.append(leave_msg)
        
        await manager.broadcast(room_id, {"type": "members.update", "members": manager.get_members(room_id)})
        await manager.broadcast(room_id, leave_msg)
