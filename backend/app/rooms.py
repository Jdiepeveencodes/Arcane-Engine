from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

from fastapi import WebSocket

MAX_PLAYERS = 6
MAX_DMS = 1
MAX_SEATS_TOTAL = MAX_PLAYERS + MAX_DMS


@dataclass
class ClientConn:
    user_id: str
    name: str
    role: str  # "dm" or "player"
    ws: WebSocket


@dataclass
class Room:
    room_id: str
    name: str
    created_at: float = field(default_factory=lambda: time.time())

    locked: bool = False

    # AI controls
    ai_mode: str = "auto"  # "auto" or "preview"
    pending_ai: dict = field(default_factory=dict)  # {"id": "...", "payload": {...}}

    # Live state
    clients: Dict[str, ClientConn] = field(default_factory=dict)
    chat_log: List[dict] = field(default_factory=list)
    scene: dict = field(default_factory=lambda: {"title": "Campfire", "text": "The party rests..."})

    # ✅ Map + tokens (so code doesn’t rely on dynamic attributes)
    grid: dict = field(default_factory=lambda: {"cols": 20, "rows": 20, "cell": 32})
    map_image_url: str = ""
    tokens: List[dict] = field(default_factory=list)

    # ✅ Inventory state (per-player)
    inventories: dict = field(default_factory=dict)

    # Internal flag used by db loader in main.py (safe default)
    _db_loaded: bool = False

    def seats_used(self) -> int:
        return len(self.clients)

    def count_role(self, role: str) -> int:
        return sum(1 for c in self.clients.values() if c.role == role)


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def create_room(self, name: str) -> Room:
        room_id = uuid.uuid4().hex[:8]
        room = Room(room_id=room_id, name=name)
        self.rooms[room_id] = room
        return room

    def get_room(self, room_id: str) -> Optional[Room]:
        return self.rooms.get(room_id)

    def list_rooms(self) -> List[dict]:
        out = []
        for r in self.rooms.values():
            out.append(
                {
                    "room_id": r.room_id,
                    "name": r.name,
                    "locked": r.locked,
                    "seats_used": r.seats_used(),
                    "max_seats": MAX_SEATS_TOTAL,
                }
            )
        return out

    def can_join(self, room: Room, role: str) -> tuple[bool, str]:
        role = (role or "").lower().strip()
        if role not in ("dm", "player"):
            return False, "role must be dm or player"

        if room.locked and role != "dm":
            return False, "Room is locked."

        if room.seats_used() >= MAX_SEATS_TOTAL:
            return False, "Room is full."

        if role == "dm" and room.count_role("dm") >= MAX_DMS:
            return False, "DM seat already taken."

        if role == "player" and room.count_role("player") >= MAX_PLAYERS:
            return False, "All player seats are taken."

        return True, "ok"


manager = RoomManager()
