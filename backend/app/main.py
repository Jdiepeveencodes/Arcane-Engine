from __future__ import annotations

import os
import time
import uuid
import sqlite3
from typing import Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from .rooms import manager, Room, ClientConn
from .dice import parse_and_roll
from .ai import call_narrator, call_scene_draft
from pydantic import BaseModel
import urllib.parse

# ---------------------------
# SQLite persistence (MVP)
# ---------------------------

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "arcane.db")


def db_connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def db_init() -> None:
    con = db_connect()
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS rooms (
          room_id TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          name TEXT,
          dm_user_id TEXT,
          grid_cols INTEGER NOT NULL DEFAULT 20,
          grid_rows INTEGER NOT NULL DEFAULT 20,
          grid_cell INTEGER NOT NULL DEFAULT 32,
          map_image_url TEXT
        );
        """
    )
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS tokens (
          room_id TEXT NOT NULL,
          token_id TEXT NOT NULL,
          label TEXT,
          kind TEXT NOT NULL,                -- player | npc | object
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          owner_user_id TEXT,                -- nullable
          size INTEGER NOT NULL,             -- 1..6 squares
          color INTEGER,                     -- nullable (0xRRGGBB)
          is_hidden INTEGER NOT NULL DEFAULT 0,
          hp INTEGER,
          max_hp INTEGER,
          notes TEXT,
          PRIMARY KEY (room_id, token_id)
        );
        """
    )
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS inventory_items (
          room_id TEXT NOT NULL,
          owner_user_id TEXT NOT NULL,       -- player user id (or "dm")
          slot TEXT NOT NULL,                -- bag | head | chest | etc
          item_id TEXT NOT NULL,
          name TEXT NOT NULL,
          tier_id INTEGER NOT NULL,
          rarity TEXT NOT NULL,
          qty INTEGER NOT NULL DEFAULT 1,
          payload_json TEXT,                 -- serialized misc item data
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (room_id, owner_user_id, slot, item_id)
        );
        """
    )
    con.commit()
    con.close()


def now_ts() -> int:
    return int(time.time())


def db_upsert_room(room: Room) -> None:
    con = db_connect()
    con.execute(
        """
        INSERT INTO rooms (room_id, created_at, updated_at, name, dm_user_id,
                           grid_cols, grid_rows, grid_cell, map_image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(room_id) DO UPDATE SET
          updated_at = excluded.updated_at,
          name = excluded.name,
          dm_user_id = excluded.dm_user_id,
          grid_cols = excluded.grid_cols,
          grid_rows = excluded.grid_rows,
          grid_cell = excluded.grid_cell,
          map_image_url = excluded.map_image_url
        """,
        (
            room.room_id,
            getattr(room, "created_at", now_ts()),
            now_ts(),
            getattr(room, "name", None),
            getattr(room, "dm_user_id", None),
            room.grid["cols"],
            room.grid["rows"],
            room.grid["cell"],
            getattr(room, "map_image_url", None),
        ),
    )
    con.commit()
    con.close()


def db_load_room_state(room: Room) -> None:
    """Load persisted room fields + tokens + inventory into the in-memory room."""
    con = db_connect()

    # room fields
    row = con.execute(
        "SELECT * FROM rooms WHERE room_id = ?",
        (room.room_id,),
    ).fetchone()
    if row:
        room.grid["cols"] = int(row["grid_cols"])
        room.grid["rows"] = int(row["grid_rows"])
        room.grid["cell"] = int(row["grid_cell"])
        room.map_image_url = row["map_image_url"] or room.map_image_url

    # tokens
    rows = con.execute(
        "SELECT * FROM tokens WHERE room_id = ?",
        (room.room_id,),
    ).fetchall()
    room.tokens = {}
    for r in rows:
        room.tokens[str(r["token_id"])] = {
            "id": str(r["token_id"]),
            "label": r["label"],
            "kind": r["kind"],
            "x": int(r["x"]),
            "y": int(r["y"]),
            "ownerUserId": r["owner_user_id"],
            "size": int(r["size"]),
            "color": r["color"],
            "isHidden": bool(r["is_hidden"]),
            "hp": r["hp"],
            "maxHp": r["max_hp"],
            "notes": r["notes"],
        }

    # inventory
    inv_rows = con.execute(
        "SELECT * FROM inventory_items WHERE room_id = ?",
        (room.room_id,),
    ).fetchall()
    room.inventory = {}
    for r in inv_rows:
        owner = str(r["owner_user_id"])
        room.inventory.setdefault(owner, {})
        room.inventory[owner].setdefault(r["slot"], {})
        room.inventory[owner][r["slot"]][str(r["item_id"])] = {
            "itemId": str(r["item_id"]),
            "name": r["name"],
            "tierId": int(r["tier_id"]),
            "rarity": r["rarity"],
            "qty": int(r["qty"]),
            "payload": r["payload_json"],
        }

    con.close()


def db_upsert_token(room_id: str, token: dict[str, Any]) -> None:
    con = db_connect()
    con.execute(
        """
        INSERT INTO tokens (room_id, token_id, label, kind, x, y, owner_user_id, size, color, is_hidden, hp, max_hp, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(room_id, token_id) DO UPDATE SET
          label = excluded.label,
          kind = excluded.kind,
          x = excluded.x,
          y = excluded.y,
          owner_user_id = excluded.owner_user_id,
          size = excluded.size,
          color = excluded.color,
          is_hidden = excluded.is_hidden,
          hp = excluded.hp,
          max_hp = excluded.max_hp,
          notes = excluded.notes
        """,
        (
            room_id,
            token.get("id"),
            token.get("label"),
            token.get("kind"),
            int(token.get("x", 0)),
            int(token.get("y", 0)),
            token.get("ownerUserId"),
            int(token.get("size", 1)),
            token.get("color"),
            1 if token.get("isHidden") else 0,
            token.get("hp"),
            token.get("maxHp"),
            token.get("notes"),
        ),
    )
    con.commit()
    con.close()


def db_delete_token(room_id: str, token_id: str) -> None:
    con = db_connect()
    con.execute("DELETE FROM tokens WHERE room_id = ? AND token_id = ?", (room_id, token_id))
    con.commit()
    con.close()


def clamp_int(val: int, lo: int, hi: int, fallback: int) -> int:
    try:
        v = int(val)
    except Exception:
        return fallback
    return max(lo, min(hi, v))


def ensure_room_map_fields(room: Room) -> None:
    if not hasattr(room, "grid") or room.grid is None:
        room.grid = {"cols": 20, "rows": 20, "cell": 32}
    if "cols" not in room.grid:
        room.grid["cols"] = 20
    if "rows" not in room.grid:
        room.grid["rows"] = 20
    if "cell" not in room.grid:
        room.grid["cell"] = 32
    if not hasattr(room, "map_image_url"):
        room.map_image_url = None
    if not hasattr(room, "tokens") or room.tokens is None:
        room.tokens = {}
    if not hasattr(room, "inventory") or room.inventory is None:
        room.inventory = {}


async def ws_send(conn: ClientConn, msg: dict[str, Any]) -> None:
    try:
        await conn.ws.send_json(msg)
    except Exception:
        pass


async def ws_broadcast(room: Room, msg: dict[str, Any]) -> None:
    for conn in list(room.clients.values()):
        await ws_send(conn, msg)


async def broadcast_map_snapshot(room: Room) -> None:
    ensure_room_map_fields(room)
    await ws_broadcast(
        room,
        {
            "type": "map.snapshot",
            "grid": room.grid,
            "imageUrl": room.map_image_url,
            "tokens": list(room.tokens.values()),
        },
    )


# ---------------------------
# App setup
# ---------------------------

load_dotenv()

app = FastAPI(title="D&D Console MVP")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
async def on_startup() -> None:
    db_init()


# ---------------------------
# HTTP routes
# ---------------------------

@app.get("/")
async def root():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"ok": True, "service": "dnd-console"}


class CreateRoomReq(BaseModel):
    name: str | None = None
    dmUserId: str | None = None


class CreateRoomResp(BaseModel):
    roomId: str


@app.get("/api/rooms")
async def list_rooms():
    # list from in-memory manager (MVP)
    rooms = []
    for rid, room in manager.rooms.items():
        rooms.append({"roomId": rid, "name": getattr(room, "name", None)})
    return {"rooms": rooms}


@app.post("/api/rooms", response_model=CreateRoomResp)
async def create_room(req: CreateRoomReq):
    room_id = uuid.uuid4().hex[:10]
    room = manager.create_room(room_id)
    room.name = req.name or f"Room {room_id}"
    room.dm_user_id = req.dmUserId
    ensure_room_map_fields(room)
    db_upsert_room(room)
    return CreateRoomResp(roomId=room_id)


class SceneReq(BaseModel):
    prompt: str = ""


@app.post("/api/rooms/{room_id}/scene")
async def generate_scene(room_id: str, req: SceneReq):
    room = manager.get_room(room_id)
    if not room:
        raise HTTPException(404, "Room not found")

    # call your AI draft helper (kept as-is)
    txt = await call_scene_draft(req.prompt or "")
    return {"text": txt}


# ---------------------------
# AI Map generation (MVP placeholder)
# ---------------------------

from pydantic import Field


class MapGenerateReq(BaseModel):
    prompt: str = ""
    theme: str = "Fantasy"
    cols: int | None = None
    rows: int | None = None
    cell: int | None = None


class MapGenerateResp(BaseModel):
    # Frontend checks both image_url and imageUrl; return both for compatibility.
    image_url: str = Field(..., description="Snake_case image URL")
    imageUrl: str | None = Field(None, description="CamelCase image URL")
    cols: int
    rows: int
    cell: int


@app.post("/api/rooms/{room_id}/map/generate", response_model=MapGenerateResp)
async def generate_map_for_room(room_id: str, req: MapGenerateReq):
    room = manager.get_room(room_id)
    if not room:
        raise HTTPException(404, "Room not found")

    # Ensure grid/map fields exist and load persisted state
    ensure_room_map_fields(room)
    db_load_room_state(room)
    ensure_room_map_fields(room)

    # Optional overrides from request
    if req.cols is not None:
        room.grid["cols"] = clamp_int(req.cols, 1, 50, room.grid["cols"])
    if req.rows is not None:
        room.grid["rows"] = clamp_int(req.rows, 1, 50, room.grid["rows"])
    if req.cell is not None:
        room.grid["cell"] = clamp_int(req.cell, 12, 128, room.grid["cell"])

    # MVP: stable placeholder image (swap later for real AI generation)
    theme = (req.theme or "Fantasy").strip()[:18]
    label = urllib.parse.quote_plus(f"{theme} Map")
    room.map_image_url = f"https://dummyimage.com/1200x800/111827/ffffff.png&text={label}"

    # Persist + broadcast so Pixi updates for everyone
    db_upsert_room(room)
    await broadcast_map_snapshot(room)

    return MapGenerateResp(
        image_url=room.map_image_url,
        imageUrl=room.map_image_url,
        cols=room.grid["cols"],
        rows=room.grid["rows"],
        cell=room.grid["cell"],
    )


# ---------------------------
# WebSocket
# ---------------------------

@app.websocket("/ws/{room_id}")
async def ws_room(ws: WebSocket, room_id: str):
    await ws.accept()

    # Assign a connection id + user id (MVP)
    user_id = ws.query_params.get("userId") or uuid.uuid4().hex[:8]
    role = ws.query_params.get("role") or "player"  # dm|player

    room = manager.get_room(room_id)
    if not room:
        room = manager.create_room(room_id)

    ensure_room_map_fields(room)
    db_load_room_state(room)
    ensure_room_map_fields(room)

    conn = ClientConn(ws=ws, user_id=user_id, role=role)
    manager.add_client(room_id, conn)

    # Send initial snapshot
    await ws_send(
        conn,
        {
            "type": "room.joined",
            "roomId": room_id,
            "userId": user_id,
            "role": role,
        },
    )
    await broadcast_map_snapshot(room)

    # Notify others
    await ws_broadcast(room, {"type": "room.presence", "event": "join", "userId": user_id, "role": role})

    try:
        while True:
            msg = await ws.receive_json()
            mtype = msg.get("type")

            # chat (table + narration kept in your existing client)
            if mtype == "chat.message":
                await ws_broadcast(room, msg)

            # dice
            elif mtype == "dice.roll":
                # expects: {type:"dice.roll", expr:"1d20+3", ...}
                expr = str(msg.get("expr") or "")
                rolled = parse_and_roll(expr)
                out = {**msg, "result": rolled}
                await ws_broadcast(room, out)

            # tokens
            elif mtype == "token.add":
                token = msg.get("token") or {}
                token_id = token.get("id") or uuid.uuid4().hex[:10]
                token["id"] = token_id
                room.tokens[str(token_id)] = token
                db_upsert_token(room_id, token)
                await ws_broadcast(room, {"type": "token.added", "token": token})

            elif mtype == "token.update":
                token = msg.get("token") or {}
                tid = str(token.get("id") or "")
                if tid:
                    room.tokens[tid] = token
                    db_upsert_token(room_id, token)
                    await ws_broadcast(room, {"type": "token.updated", "token": token})

            elif mtype == "token.remove":
                tid = str(msg.get("tokenId") or "")
                if tid and tid in room.tokens:
                    room.tokens.pop(tid, None)
                    db_delete_token(room_id, tid)
                    await ws_broadcast(room, {"type": "token.removed", "tokenId": tid})

            # map image set (if client uses it)
            elif mtype == "map.setImage":
                url = (msg.get("imageUrl") or msg.get("image_url") or "").strip()
                if url:
                    room.map_image_url = url
                    db_upsert_room(room)
                    await broadcast_map_snapshot(room)

            else:
                # passthrough for any other MVP messages
                await ws_broadcast(room, msg)

    except WebSocketDisconnect:
        pass
    finally:
        manager.remove_client(room_id, conn)
        try:
            await ws_broadcast(room, {"type": "room.presence", "event": "leave", "userId": user_id})
        except Exception:
            pass
