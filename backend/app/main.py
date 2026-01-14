from __future__ import annotations

import os
import time
import uuid
import sqlite3
import urllib.parse
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .rooms import manager, Room, ClientConn
from .dice import roll_dice
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


# ------------------------------------------------------------
# HTTP API
# ------------------------------------------------------------
@app.get("/api/rooms")
def api_rooms():
    return manager.list_rooms()


@app.post("/api/rooms")
def api_create_room(req: CreateRoomReq):
    room = manager.create_room(req.name)
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


@app.post("/api/rooms/{room_id}/map_generate", response_model=MapGenerateResp)
async def api_map_generate(room_id: str, req: MapGenerateReq):
    room = ensure_room_loaded(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if not hasattr(room, "grid") or not isinstance(room.grid, dict):
        room.grid = {"cols": 20, "rows": 20, "cell": 32}

    room.grid["cols"] = clamp_int(room.grid.get("cols"), 1, 50, 20)
    room.grid["rows"] = clamp_int(room.grid.get("rows"), 1, 50, 20)
    room.grid["cell"] = clamp_int(room.grid.get("cell"), 8, 128, 32)

    label = f"{(req.theme or 'Fantasy').strip()[:18]} Map"
    text = urllib.parse.quote_plus(label)
    room.map_image_url = f"https://dummyimage.com/1200x800/111827/ffffff.png&text={text}"

    db_upsert_room(room)
    await manager.broadcast(
        room.room_id,
        {
            "type": "map.snapshot",
            "grid": room.grid,
            "map_image_url": room.map_image_url,
        },
    )

    return MapGenerateResp(
        imageUrl=room.map_image_url,
        cols=room.grid["cols"],
        rows=room.grid["rows"],
        cell=room.grid["cell"],
    )


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

    user_id = f"{int(time.time() * 1000)}-{os.urandom(2).hex()}"
    name = (name or role).strip()[:24]

    conn = ClientConn(user_id=user_id, name=name, role=role, websocket=websocket)
    manager.add_client(room_id, conn)

    try:
        await websocket.send_json(
            {
                "type": "state.init",
                "room_id": room.room_id,
                "me": {"user_id": user_id, "name": name, "role": role},
                "members": manager.get_members(room_id),
                "scene": getattr(room, "scene", {"title": "", "text": ""}),
                "grid": getattr(room, "grid", {"cols": 20, "rows": 20, "cell": 32}),
                "map_image_url": getattr(room, "map_image_url", "") or "",
            }
        )

        await manager.broadcast(
            room_id,
            {
                "type": "member.joined",
                "member": {"user_id": user_id, "name": name, "role": role},
            },
            exclude_user_id=user_id,
        )

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

            if msg_type == "grid.set":
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                room.grid["cols"] = clamp_int(data.get("cols"), 1, 50, room.grid["cols"])
                room.grid["rows"] = clamp_int(data.get("rows"), 1, 50, room.grid["rows"])
                room.grid["cell"] = clamp_int(data.get("cell"), 8, 128, room.grid["cell"])
                db_upsert_room(room)
                await manager.broadcast(
                    room.room_id,
                    {"type": "map.snapshot", "grid": room.grid, "map_image_url": getattr(room, "map_image_url", "")},
                )
                continue

            if msg_type == "map.set_url":
                if role != "dm":
                    await websocket.send_json({"type": "error", "message": "DM only."})
                    continue
                url = (data.get("url") or "").strip()
                room.map_image_url = url
                db_upsert_room(room)
                await manager.broadcast(
                    room.room_id,
                    {"type": "map.snapshot", "grid": room.grid, "map_image_url": getattr(room, "map_image_url", "")},
                )
                continue

            await websocket.send_json({"type": "error", "message": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        pass
    finally:
        manager.remove_client(room_id, user_id)
        await manager.broadcast(room_id, {"type": "member.left", "user_id": user_id})
