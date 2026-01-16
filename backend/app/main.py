from __future__ import annotations

import os
import time
import uuid
import sqlite3
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .rooms import manager, Room, ClientConn
from .dice import roll_dice
from .item_db import generate_loot
from .ai import maybe_ai_response

load_dotenv()

app = FastAPI(title="Arcane Engine Backend")

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
    db().commit()


db_init()


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
            (getattr(room, "grid", {}) or {}).get("cols", 20),
            (getattr(room, "grid", {}) or {}).get("rows", 20),
            (getattr(room, "grid", {}) or {}).get("cell", 32),
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
    room.grid = {"cols": row["grid_cols"] or 20, "rows": row["grid_rows"] or 20, "cell": row["grid_cell"] or 32}
    room.map_image_url = row["map_image_url"] or ""
    return room


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
    if role == "dm":
        return getattr(room, "loot_bags", {})
    out: dict = {}
    for bid, bag in getattr(room, "loot_bags", {}).items():
        if not bag.get("visible_to_players", False):
            continue
        if bag.get("type") == "player":
            target = bag.get("target_user_id")
            if target and target != user_id:
                continue
        out[bid] = bag
    return out


async def broadcast_loot_snapshot(room: Room) -> None:
    for bag_id, bag in list(getattr(room, "loot_bags", {}).items()):
        if not bag.get("items"):
            del room.loot_bags[bag_id]
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
def api_rooms():
    return manager.list_rooms()


@app.post("/api/rooms")
def api_create_room(req: CreateRoomReq):
    room = manager.create_room(req.name)
    if not getattr(room, "map_image_url", ""):
        room.map_image_url = default_map_url()
    db_upsert_room(room)
    return {"room_id": room.room_id, "name": room.name}


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
        room.grid = {"cols": 20, "rows": 20, "cell": 32}

    if req.cols is not None:
        room.grid["cols"] = clamp_int(req.cols, 1, 50, 20)
    else:
        room.grid["cols"] = clamp_int(room.grid.get("cols"), 1, 50, 20)
    if req.rows is not None:
        room.grid["rows"] = clamp_int(req.rows, 1, 50, 20)
    else:
        room.grid["rows"] = clamp_int(room.grid.get("rows"), 1, 50, 20)
    if req.cell is not None:
        room.grid["cell"] = clamp_int(req.cell, 8, 128, 32)
    else:
        room.grid["cell"] = clamp_int(room.grid.get("cell"), 8, 128, 32)

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
        room.grid = {"cols": 20, "rows": 20, "cell": 32}
    room.grid["cols"] = clamp_int(room.grid.get("cols"), 1, 50, 20)
    room.grid["rows"] = clamp_int(room.grid.get("rows"), 1, 50, 20)
    room.grid["cell"] = clamp_int(room.grid.get("cell"), 8, 128, 32)
    if not hasattr(room, "map_image_url"):
        room.map_image_url = ""
    if not hasattr(room, "lighting") or not isinstance(room.lighting, dict):
        room.lighting = {"fog_enabled": False, "ambient_radius": 0, "darkness": False}

    user_id = f"{int(time.time() * 1000)}-{os.urandom(2).hex()}"
    name = (name or role).strip()[:24]

    conn = ClientConn(user_id=user_id, name=name, role=role, ws=websocket)
    if not manager.add_client(room_id, conn):
        await websocket.send_json({"type": "error", "message": "Failed to join room"})
        await websocket.close()
        return

    new_token = None
    if role == "player":
        if not hasattr(room, "tokens") or not isinstance(room.tokens, list):
            room.tokens = []
        cols = max(1, int(room.grid.get("cols", 20)))
        rows = max(1, int(room.grid.get("rows", 20)))
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
        grid = getattr(room, "grid", {"cols": 20, "rows": 20, "cell": 32})
        map_url = getattr(room, "map_image_url", "") or ""
        tokens = getattr(room, "tokens", [])
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

            if msg_type == "chat.send":
                text = (data.get("text") or "").strip()
                if not text:
                    continue

                channel = (data.get("channel") or "table").strip().lower()
                if channel not in ("table", "narration"):
                    channel = "table"
                if role != "dm" and channel != "table":
                    await websocket.send_json({"type": "error", "message": "Players can only post to Table Chat."})
                    continue

                entry = {
                    "type": "chat.message",
                    "ts": time.time(),
                    "user_id": user_id,
                    "name": name,
                    "role": role,
                    "channel": channel,
                    "text": text,
                }
                await manager.broadcast(room_id, entry)

                if role == "player" and getattr(room, "ai_mode", "auto") in ("auto", "assist"):
                    maybe = maybe_ai_response(room_id=room_id, text=text)
                    if maybe:
                        await manager.broadcast(
                            room_id,
                            {
                                "type": "chat.message",
                                "ts": time.time(),
                                "user_id": "ai",
                                "name": "Arcane",
                                "role": "dm",
                                "channel": "narration",
                                "text": maybe,
                            },
                        )
                continue

            if msg_type == "scene.update":
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                title = (data.get("title") or "")[:60]
                text = (data.get("text") or "")[:2400]
                room.scene = {"title": title, "text": text}
                db_upsert_room(room)
                await manager.broadcast(room.room_id, {"type": "scene.snapshot", "scene": room.scene})
                continue

            if msg_type == "dice.roll":
                expr = (data.get("expr") or "").strip()
                if not expr:
                    continue
                result = roll_dice(expr)
                await manager.broadcast(
                    room_id,
                    {"type": "dice.result", "user_id": user_id, "name": name, "role": role, "expr": expr, **result},
                )
                continue

            if msg_type in ("grid.set", "grid.update"):
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                room.grid["cols"] = clamp_int(data.get("cols"), 1, 50, room.grid["cols"])
                room.grid["rows"] = clamp_int(data.get("rows"), 1, 50, room.grid["rows"])
                room.grid["cell"] = clamp_int(data.get("cell"), 8, 128, room.grid["cell"])
                db_upsert_room(room)
                await manager.broadcast(
                    room.room_id,
                    {
                        "type": "map.snapshot",
                        "grid": room.grid,
                        "map_image_url": getattr(room, "map_image_url", ""),
                        "tokens": getattr(room, "tokens", []),
                        "lighting": getattr(room, "lighting", {"fog_enabled": False, "ambient_radius": 0, "darkness": False}),
                    },
                )
                continue

            if msg_type in ("map.set_url", "map.set"):
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                url = (data.get("url") or "").strip()
                room.map_image_url = url
                db_upsert_room(room)
                await manager.broadcast(
                    room.room_id,
                    {
                        "type": "map.snapshot",
                        "grid": room.grid,
                        "map_image_url": getattr(room, "map_image_url", ""),
                        "tokens": getattr(room, "tokens", []),
                        "lighting": getattr(room, "lighting", {"fog_enabled": False, "ambient_radius": 0, "darkness": False}),
                    },
                )
                continue

            if msg_type == "map.lighting.set":
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                lighting = data.get("lighting") or {}
                if not isinstance(lighting, dict):
                    continue
                room.lighting["fog_enabled"] = bool(lighting.get("fog_enabled", room.lighting.get("fog_enabled", False)))
                room.lighting["darkness"] = bool(lighting.get("darkness", room.lighting.get("darkness", False)))
                room.lighting["ambient_radius"] = clamp_int(
                    lighting.get("ambient_radius"),
                    0,
                    50,
                    room.lighting.get("ambient_radius", 0),
                )
                await manager.broadcast(
                    room.room_id,
                    {
                        "type": "map.snapshot",
                        "grid": room.grid,
                        "map_image_url": getattr(room, "map_image_url", ""),
                        "tokens": getattr(room, "tokens", []),
                        "lighting": getattr(room, "lighting", {"fog_enabled": False, "ambient_radius": 0, "darkness": False}),
                    },
                )
                continue
            
            if msg_type == "token.add":
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                token = data.get("token") or {}
                kind = (token.get("kind") or "npc").strip().lower()
                if kind not in ("player", "npc", "object"):
                    kind = "npc"
                max_x = max(0, room.grid.get("cols", 1) - 1)
                max_y = max(0, room.grid.get("rows", 1) - 1)
                new_token = {
                    "id": str(uuid.uuid4())[:8],
                    "label": str(token.get("label") or "Token")[:16],
                    "kind": kind,
                    "x": clamp_int(token.get("x"), 0, max_x, 0),
                    "y": clamp_int(token.get("y"), 0, max_y, 0),
                    "size": clamp_int(token.get("size"), 1, 6, 1),
                    "owner_user_id": token.get("owner_user_id") or None,
                }
                if "darkvision" in token:
                    new_token["darkvision"] = bool(token.get("darkvision"))
                for key in ("color", "hp", "ac", "initiative", "vision_radius"):
                    if key in token:
                        try:
                            new_token[key] = int(token.get(key))
                        except Exception:
                            new_token[key] = None
                room.tokens.append(new_token)
                await manager.broadcast(room_id, {"type": "token.added", "token": new_token})
                continue

            if msg_type == "token.move":
                token_id = (data.get("token_id") or "").strip()
                if not token_id:
                    continue
                tok = next((t for t in room.tokens if t.get("id") == token_id), None)
                if not tok:
                    continue
                if role != "dm" and (tok.get("owner_user_id") or "") != user_id:
                    await websocket.send_json({"type": "error", "message": "Not allowed to move this token."})
                    continue
                max_x = max(0, room.grid.get("cols", 1) - 1)
                max_y = max(0, room.grid.get("rows", 1) - 1)
                tok["x"] = clamp_int(data.get("x"), 0, max_x, tok.get("x", 0))
                tok["y"] = clamp_int(data.get("y"), 0, max_y, tok.get("y", 0))
                await manager.broadcast(room_id, {"type": "token.moved", "token_id": token_id, "x": tok["x"], "y": tok["y"]})
                continue

            if msg_type == "token.update":
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                token_id = (data.get("token_id") or "").strip()
                patch = data.get("patch") or {}
                if not token_id:
                    continue
                tok = next((t for t in room.tokens if t.get("id") == token_id), None)
                if not tok:
                    continue
                if "label" in patch:
                    tok["label"] = str(patch.get("label") or "")[:16]
                if "kind" in patch:
                    kind = (patch.get("kind") or "").strip().lower()
                    if kind in ("player", "npc", "object"):
                        tok["kind"] = kind
                if "owner_user_id" in patch:
                    tok["owner_user_id"] = patch.get("owner_user_id") or None
                if "size" in patch:
                    tok["size"] = clamp_int(patch.get("size"), 1, 6, tok.get("size", 1))
                if "darkvision" in patch:
                    tok["darkvision"] = bool(patch.get("darkvision"))
                for key in ("color", "hp", "ac", "initiative", "vision_radius"):
                    if key in patch:
                        try:
                            tok[key] = int(patch.get(key))
                        except Exception:
                            tok[key] = None
                await manager.broadcast(room_id, {"type": "token.updated", "token": tok})
                continue

            if msg_type == "token.remove":
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                token_id = (data.get("token_id") or "").strip()
                if not token_id:
                    continue
                before = len(room.tokens)
                room.tokens = [t for t in room.tokens if t.get("id") != token_id]
                if len(room.tokens) != before:
                    await manager.broadcast(room_id, {"type": "token.removed", "token_id": token_id})
                continue

            if msg_type == "inventory.add":
                item_data = data.get("item") or {}
                itemId = item_data.get("id") or (data.get("itemId") or "").strip()
                if not itemId:
                    continue
                
                # Initialize inventory if needed
                if user_id not in room.inventories:
                    room.inventories[user_id] = {
                        "user_id": user_id,
                        "bag": [],
                        "equipment": {},
                    }
                
                inv = room.inventories[user_id]
                # Add item to bag - preserve item data or create default
                item = {
                    "id": itemId,
                    "name": item_data.get("name", f"Item {itemId[:4]}"),
                    "slot": item_data.get("slot", "bag"),
                }
                if "is_two_handed" in item_data:
                    item["is_two_handed"] = item_data["is_two_handed"]
                inv["bag"].append(item)
                
                await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
                continue

            if msg_type == "inventory.equip":
                itemId = (data.get("itemId") or "").strip()
                slot = (data.get("slot") or "").strip()
                if not itemId or not slot:
                    continue
                
                # Initialize inventory if needed
                if user_id not in room.inventories:
                    room.inventories[user_id] = {
                        "user_id": user_id,
                        "bag": [],
                        "equipment": {},
                    }
                
                inv = room.inventories[user_id]
                
                # Find item in bag
                item_idx = None
                for idx, item in enumerate(inv["bag"]):
                    if item.get("id") == itemId:
                        item_idx = idx
                        break
                
                if item_idx is not None:
                    item = inv["bag"].pop(item_idx)
                    is_two_handed = item.get("is_two_handed", False)
                    
                    # Handle slot conflicts
                    if is_two_handed:
                        # If equipping 2-handed, unequip any 1-handed items from mainhand/offhand
                        for hand_slot in ["mainhand", "offhand"]:
                            if hand_slot in inv["equipment"]:
                                unequipped = inv["equipment"].pop(hand_slot)
                                inv["bag"].append(unequipped)
                    else:
                        # If equipping 1-handed to mainhand or offhand
                        if slot in ["mainhand", "offhand"]:
                            # Check if a 2-handed item is currently equipped
                            for hand_slot in ["mainhand", "offhand"]:
                                if hand_slot in inv["equipment"]:
                                    equipped_item = inv["equipment"][hand_slot]
                                    if equipped_item.get("is_two_handed", False):
                                        # Unequip the 2-handed item to bag
                                        unequipped = inv["equipment"].pop(hand_slot)
                                        inv["bag"].append(unequipped)
                    
                    # Unequip any existing item in the target slot and move to bag
                    if slot in inv["equipment"]:
                        unequipped = inv["equipment"].pop(slot)
                        inv["bag"].append(unequipped)
                    
                    # Equip the new item
                    inv["equipment"][slot] = item
                
                await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
                continue

            if msg_type == "inventory.unequip":
                slot = (data.get("slot") or "").strip()
                if not slot:
                    continue
                
                # Initialize inventory if needed
                if user_id not in room.inventories:
                    room.inventories[user_id] = {
                        "user_id": user_id,
                        "bag": [],
                        "equipment": {},
                    }
                
                inv = room.inventories[user_id]
                
                # Move item from equipment to bag
                if slot in inv["equipment"]:
                    item = inv["equipment"].pop(slot)
                    inv["bag"].append(item)
                
                await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
                continue

            if msg_type == "inventory.drop":
                itemId = (data.get("itemId") or "").strip()
                if not itemId:
                    continue
                
                # Initialize inventory if needed
                if user_id not in room.inventories:
                    room.inventories[user_id] = {
                        "user_id": user_id,
                        "bag": [],
                        "equipment": {},
                    }
                
                inv = room.inventories[user_id]
                
                # Remove item from bag
                inv["bag"] = [item for item in inv["bag"] if item.get("id") != itemId]
                
                await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
                continue

            if msg_type == "loot.generate":
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                # Generate loot into a new loot bag
                # data: { "items": [...], "config": {...}, "bag_type": "community" | "player", "bag_name": "...", "target_user_id": "..." }
                items = data.get("items") or []
                if not items:
                    cfg = data.get("config") or {}
                    items, err = generate_loot(cfg)
                    if err:
                        await websocket.send_json({"type": "error", "message": err})
                        continue

                bag_type = (data.get("bag_type") or "").strip().lower()
                target_user_id = (data.get("target_user_id") or "").strip()
                if target_user_id:
                    bag_type = "player"
                if bag_type not in ("community", "player"):
                    bag_type = "community"

                bag_name = (data.get("bag_name") or "").strip()
                if not bag_name:
                    cfg = data.get("config") or {}
                    bag_name = (cfg.get("bagName") or "").strip()
                if not bag_name:
                    if target_user_id:
                        target_name = ""
                        target_conn = room.clients.get(target_user_id)
                        if target_conn:
                            target_name = target_conn.name
                        bag_name = f"Loot for {target_name or target_user_id}"
                    else:
                        bag_name = f"Loot Bag {len(room.loot_bags)+1}"
                
                if not items:
                    continue
                
                bag_id = str(uuid.uuid4())[:8]
                room.loot_bags[bag_id] = {
                    "bag_id": bag_id,
                    "name": bag_name,
                    "type": bag_type,
                    "items": items,
                    "created_at": time.time(),
                    "created_by": user_id,
                    "target_user_id": target_user_id or None,
                    "visible_to_players": True,
                }
                
                await broadcast_loot_snapshot(room)
                continue

            if msg_type == "loot.distribute":
                # Distribute item from loot bag to player inventory
                # data: { "bag_id": "...", "item_id": "...", "target_user_id": "..." }
                bag_id = (data.get("bag_id") or "").strip()
                item_id = (data.get("item_id") or "").strip()
                target_user_id = (data.get("target_user_id") or "").strip()
                
                if not bag_id or not item_id or not target_user_id:
                    continue
                
                if bag_id not in room.loot_bags:
                    continue
                
                # Initialize target inventory if needed
                if target_user_id not in room.inventories:
                    room.inventories[target_user_id] = {
                        "user_id": target_user_id,
                        "bag": [],
                        "equipment": {},
                    }
                
                # Find and remove item from loot bag
                loot_bag = room.loot_bags[bag_id]
                item_idx = None
                for idx, item in enumerate(loot_bag["items"]):
                    if item.get("id") == item_id:
                        item_idx = idx
                        break
                
                if item_idx is not None:
                    item = loot_bag["items"].pop(item_idx)
                    # Add to target player's bag
                    room.inventories[target_user_id]["bag"].append(item)
                
                if not loot_bag["items"]:
                    del room.loot_bags[bag_id]
                await broadcast_loot_snapshot(room)
                await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
                continue

            if msg_type == "loot.discard":
                # Remove item from loot bag without giving to player
                # data: { "bag_id": "...", "item_id": "..." }
                bag_id = (data.get("bag_id") or "").strip()
                item_id = (data.get("item_id") or "").strip()
                
                if not bag_id or not item_id:
                    continue
                
                if bag_id not in room.loot_bags:
                    continue
                
                # Remove item from loot bag
                loot_bag = room.loot_bags[bag_id]
                loot_bag["items"] = [item for item in loot_bag["items"] if item.get("id") != item_id]
                if not loot_bag["items"]:
                    del room.loot_bags[bag_id]
                await broadcast_loot_snapshot(room)
                continue

            if msg_type == "loot.snapshot":
                # Send current loot bags to requester (typically DM)
                await websocket.send_json({"type": "loot.snapshot", "loot_bags": filter_loot_bags(room, role, user_id)})
                continue

            if msg_type == "loot.set_visibility":
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                bag_id = (data.get("bag_id") or "").strip()
                if not bag_id or bag_id not in room.loot_bags:
                    continue
                visible = bool(data.get("visible", True))
                room.loot_bags[bag_id]["visible_to_players"] = visible
                await broadcast_loot_snapshot(room)
                continue

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
