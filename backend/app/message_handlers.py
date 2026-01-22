"""
Message handlers for WebSocket events in D&D Console.
Organized by domain: chat, scene, dice, map, tokens, inventory, loot, grid.
"""

import json
import time
import uuid
import sys
from typing import Any, Dict, Optional, Callable

from .dice import roll_dice
from .ai import maybe_ai_response
from .item_db import generate_loot


# Deferred imports to avoid circular dependencies - these will be set at runtime
_db_append_chat_log: Optional[Callable] = None
_db_upsert_room: Optional[Callable] = None
_clamp_int: Optional[Callable] = None
_normalize_inventories: Optional[Callable] = None
_db_save_inventories: Optional[Callable] = None
_db_save_loot_bags: Optional[Callable] = None
_merge_category_props: Optional[Callable] = None
_apply_category_props_to_items: Optional[Callable] = None
_coerce_category_props: Optional[Callable] = None
_broadcast_loot_snapshot: Optional[Callable] = None
_filter_loot_bags: Optional[Callable] = None
_append_loot_debug: Optional[Callable] = None
_loot_logger: Optional[Any] = None


def register_functions(
    db_append_chat_log: Callable,
    db_upsert_room: Callable,
    clamp_int: Callable,
    normalize_inventories: Callable,
    db_save_inventories: Callable,
    db_save_loot_bags: Callable,
    merge_category_props: Callable,
    apply_category_props_to_items: Callable,
    coerce_category_props: Callable,
    broadcast_loot_snapshot: Callable,
    filter_loot_bags: Callable,
    append_loot_debug: Callable,
    loot_logger: Any,
) -> None:
    """Register functions from main.py to avoid circular imports."""
    global _db_append_chat_log, _db_upsert_room, _clamp_int, _normalize_inventories
    global _db_save_inventories, _db_save_loot_bags, _merge_category_props
    global _apply_category_props_to_items, _coerce_category_props, _broadcast_loot_snapshot
    global _filter_loot_bags, _append_loot_debug, _loot_logger
    
    _db_append_chat_log = db_append_chat_log
    _db_upsert_room = db_upsert_room
    _clamp_int = clamp_int
    _normalize_inventories = normalize_inventories
    _db_save_inventories = db_save_inventories
    _db_save_loot_bags = db_save_loot_bags
    _merge_category_props = merge_category_props
    _apply_category_props_to_items = apply_category_props_to_items
    _coerce_category_props = coerce_category_props
    _broadcast_loot_snapshot = broadcast_loot_snapshot
    _filter_loot_bags = filter_loot_bags
    _append_loot_debug = append_loot_debug
    _loot_logger = loot_logger


# ============================================================================
# CHAT HANDLERS
# ============================================================================

async def handle_chat_send(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle chat.send message type."""
    text = (data.get("text") or "").strip()
    if not text:
        return

    channel = (data.get("channel") or "table").strip().lower()
    if channel not in ("table", "narration"):
        channel = "table"
    if role != "dm" and channel != "table":
        await websocket.send_json({"type": "error", "message": "Players can only post to Table Chat."})
        return

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
    
    # Add to room chat log and database
    room.chat_log.append(entry)
    _db_append_chat_log(room_id, entry)

    if role == "player" and getattr(room, "ai_mode", "auto") in ("auto", "assist"):
        maybe = maybe_ai_response(room_id=room_id, text=text)
        if maybe:
            ai_entry = {
                "type": "chat.message",
                "ts": time.time(),
                "user_id": "ai",
                "name": "Arcane",
                "role": "dm",
                "channel": "narration",
                "text": maybe,
            }
            await manager.broadcast(room_id, ai_entry)
            room.chat_log.append(ai_entry)
            _db_append_chat_log(room_id, ai_entry)


# ============================================================================
# SCENE HANDLERS
# ============================================================================

async def handle_scene_update(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle scene.update message type."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    title = (data.get("title") or "")[:60]
    text = (data.get("text") or "")[:2400]
    room.scene = {"title": title, "text": text}
    
    _db_upsert_room(room)
    
    await manager.broadcast(room.room_id, {"type": "scene.snapshot", "scene": room.scene})


# ============================================================================
# DICE HANDLERS
# ============================================================================

async def handle_dice_roll(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle dice.roll message type."""
    expr = (data.get("expr") or "").strip()
    if not expr:
        return
    
    result = roll_dice(expr)
    await manager.broadcast(
        room_id,
        {"type": "dice.result", "user_id": user_id, "name": name, "role": role, "expr": expr, **result},
    )


# ============================================================================
# GRID HANDLERS
# ============================================================================

async def handle_grid_update(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle grid.set and grid.update message types."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    room.grid["cols"] = _clamp_int(data.get("cols"), 1, 100, room.grid["cols"])
    room.grid["rows"] = _clamp_int(data.get("rows"), 1, 100, room.grid["rows"])
    room.grid["cell"] = _clamp_int(data.get("cell"), 8, 128, room.grid["cell"])
    _db_upsert_room(room)
    
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


# ============================================================================
# MAP HANDLERS
# ============================================================================

async def handle_map_set_url(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle map.set_url and map.set message types."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    url = (data.get("url") or "").strip()
    room.map_image_url = url
    _db_upsert_room(room)
    
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


async def handle_map_lighting_set(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle map.lighting.set message type."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    lighting = data.get("lighting") or {}
    if not isinstance(lighting, dict):
        return
    
    room.lighting["fog_enabled"] = bool(lighting.get("fog_enabled", room.lighting.get("fog_enabled", False)))
    room.lighting["darkness"] = bool(lighting.get("darkness", room.lighting.get("darkness", False)))
    room.lighting["ambient_radius"] = _clamp_int(
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


# ============================================================================
# TOKEN HANDLERS
# ============================================================================

async def handle_token_add(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle token.add message type."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
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
        "x": _clamp_int(token.get("x"), 0, max_x, 0),
        "y": _clamp_int(token.get("y"), 0, max_y, 0),
        "size": _clamp_int(token.get("size"), 1, 6, 1),
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


async def handle_token_move(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle token.move message type."""
    token_id = (data.get("token_id") or "").strip()
    if not token_id:
        return
    
    tok = next((t for t in room.tokens if t.get("id") == token_id), None)
    if not tok:
        return
    
    if role != "dm" and (tok.get("owner_user_id") or "") != user_id:
        await websocket.send_json({"type": "error", "message": "Not allowed to move this token."})
        return
    
    max_x = max(0, room.grid.get("cols", 1) - 1)
    max_y = max(0, room.grid.get("rows", 1) - 1)
    
    tok["x"] = _clamp_int(data.get("x"), 0, max_x, tok.get("x", 0))
    tok["y"] = _clamp_int(data.get("y"), 0, max_y, tok.get("y", 0))
    
    await manager.broadcast(room_id, {"type": "token.moved", "token_id": token_id, "x": tok["x"], "y": tok["y"]})


async def handle_token_update(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle token.update message type."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    token_id = (data.get("token_id") or "").strip()
    patch = data.get("patch") or {}
    
    if not token_id:
        return
    
    tok = next((t for t in room.tokens if t.get("id") == token_id), None)
    if not tok:
        return
    
    if "label" in patch:
        tok["label"] = str(patch.get("label") or "")[:16]
    if "kind" in patch:
        kind = (patch.get("kind") or "").strip().lower()
        if kind in ("player", "npc", "object"):
            tok["kind"] = kind
    if "owner_user_id" in patch:
        tok["owner_user_id"] = patch.get("owner_user_id") or None
    if "size" in patch:
        tok["size"] = _clamp_int(patch.get("size"), 1, 6, tok.get("size", 1))
    if "darkvision" in patch:
        tok["darkvision"] = bool(patch.get("darkvision"))
    
    for key in ("color", "hp", "ac", "initiative", "vision_radius"):
        if key in patch:
            try:
                tok[key] = int(patch.get(key))
            except Exception:
                tok[key] = None
    
    await manager.broadcast(room_id, {"type": "token.updated", "token": tok})


async def handle_token_remove(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle token.remove message type."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    token_id = (data.get("token_id") or "").strip()
    if not token_id:
        return
    
    before = len(room.tokens)
    room.tokens = [t for t in room.tokens if t.get("id") != token_id]
    
    if len(room.tokens) != before:
        await manager.broadcast(room_id, {"type": "token.removed", "token_id": token_id})


# ============================================================================
# INVENTORY HANDLERS
# ============================================================================

async def handle_inventory_add(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle inventory.add message type."""
    item_data = data.get("item") or {}
    itemId = item_data.get("id") or (data.get("itemId") or "").strip()
    if not itemId:
        return
    
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
    _normalize_inventories(room)
    
    await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
    _db_save_inventories(room_id, room.inventories)


async def handle_inventory_equip(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle inventory.equip message type."""
    itemId = (data.get("itemId") or "").strip()
    slot = (data.get("slot") or "").strip()
    if not itemId or not slot:
        return
    
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
    
    _normalize_inventories(room)
    await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
    _db_save_inventories(room_id, room.inventories)


async def handle_inventory_unequip(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle inventory.unequip message type."""
    slot = (data.get("slot") or "").strip()
    if not slot:
        return
    
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
    
    _normalize_inventories(room)
    await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
    _db_save_inventories(room_id, room.inventories)


async def handle_inventory_drop(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle inventory.drop message type."""
    itemId = (data.get("itemId") or "").strip()
    if not itemId:
        return
    
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
    _normalize_inventories(room)
    
    await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
    _db_save_inventories(room_id, room.inventories)


# ============================================================================
# LOOT HANDLERS
# ============================================================================

async def handle_loot_generate(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle loot.generate message type."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    # Generate loot into a new loot bag
    cfg = data.get("config") or {}
    if not isinstance(cfg, dict):
        cfg = {}
    cfg = _merge_category_props(cfg, data)
    items = data.get("items") or []
    
    if not items:
        items, err = generate_loot(cfg)
        if err:
            await websocket.send_json({"type": "error", "message": err})
            return
    
    _apply_category_props_to_items(items, cfg)

    bag_type = (data.get("bag_type") or "").strip().lower()
    target_user_id = (data.get("target_user_id") or "").strip()
    
    if target_user_id:
        bag_type = "player"
    if bag_type not in ("community", "player"):
        bag_type = "community"

    bag_name = (data.get("bag_name") or "").strip()
    if not bag_name:
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
        return

    bag_id = str(uuid.uuid4())[:8]
    debug_props = None
    for key in ("categoryProps", "category_props"):
        debug_props = _coerce_category_props(data.get(key))
        if debug_props is not None:
            break
    if debug_props is None:
        debug_props = _coerce_category_props(cfg.get("categoryProps"))
    
    room.loot_bags[bag_id] = {
        "bag_id": bag_id,
        "name": bag_name,
        "type": bag_type,
        "items": items,
        "created_at": time.time(),
        "created_by": user_id,
        "target_user_id": target_user_id or None,
        "visible_to_players": True,
        "_config": cfg,
        "debug_config": {"categoryProps": debug_props, "configKeys": list(cfg.keys())},
    }

    sample_item = items[0] if items else {}
    magic_count = sum(1 for it in items if (it.get("magicType") or it.get("magicBonus")))
    bonus_count = sum(1 for it in items if isinstance(it.get("magicBonus"), (int, float)))
    debug_payload = {
        "room": room_id,
        "bag_id": bag_id,
        "user_id": user_id,
        "cfg_keys": list(cfg.keys()),
        "categoryProps": debug_props,
        "magic_count": magic_count,
        "bonus_count": bonus_count,
        "sample_item": {
            "id": sample_item.get("id"),
            "magicType": sample_item.get("magicType"),
            "magicBonus": sample_item.get("magicBonus"),
            "tags": sample_item.get("tags"),
            "category": sample_item.get("category"),
        },
    }
    debug_line = f"[loot.generate] {json.dumps(debug_payload, default=str)}"
    
    try:
        _loot_logger.info(debug_line)
    except Exception:
        pass
    try:
        print(debug_line, flush=True)
    except Exception:
        pass
    try:
        sys.stderr.write(debug_line + "\n")
        sys.stderr.flush()
    except Exception:
        pass
    _append_loot_debug(debug_line)
    
    await _broadcast_loot_snapshot(room)
    _db_save_loot_bags(room_id, room.loot_bags)


async def handle_loot_distribute(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle loot.distribute message type."""
    # Distribute item from loot bag to player inventory
    bag_id = (data.get("bag_id") or "").strip()
    item_id = (data.get("item_id") or "").strip()
    target_user_id = (data.get("target_user_id") or "").strip()
    
    if not bag_id or not item_id or not target_user_id:
        return
    
    if bag_id not in room.loot_bags:
        return
    
    # Initialize target inventory if needed
    if target_user_id not in room.inventories:
        room.inventories[target_user_id] = {
            "user_id": target_user_id,
            "bag": [],
            "equipment": {},
        }
    
    # Find and remove item from loot bag
    loot_bag = room.loot_bags[bag_id]
    cfg = loot_bag.get("_config") or loot_bag.get("config") or {}
    cfg = _merge_category_props(cfg)
    _apply_category_props_to_items(loot_bag.get("items") or [], cfg)
    
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
    
    await _broadcast_loot_snapshot(room)
    _normalize_inventories(room)
    await manager.broadcast(room_id, {"type": "inventory.snapshot", "inventories": room.inventories})
    _db_save_loot_bags(room_id, room.loot_bags)
    _db_save_inventories(room_id, room.inventories)


async def handle_loot_discard(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle loot.discard message type."""
    # Remove item from loot bag without giving to player
    bag_id = (data.get("bag_id") or "").strip()
    item_id = (data.get("item_id") or "").strip()
    
    if not bag_id or not item_id:
        return
    
    if bag_id not in room.loot_bags:
        return
    
    # Remove item from loot bag
    loot_bag = room.loot_bags[bag_id]
    cfg = loot_bag.get("_config") or loot_bag.get("config") or {}
    cfg = _merge_category_props(cfg)
    _apply_category_props_to_items(loot_bag.get("items") or [], cfg)
    loot_bag["items"] = [item for item in loot_bag["items"] if item.get("id") != item_id]
    
    if not loot_bag["items"]:
        del room.loot_bags[bag_id]
    
    await _broadcast_loot_snapshot(room)
    _db_save_loot_bags(room_id, room.loot_bags)


async def handle_loot_snapshot(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle loot.snapshot message type."""
    # Send current loot bags to requester (typically DM)
    await websocket.send_json({
        "type": "loot.snapshot",
        "loot_bags": _filter_loot_bags(room, role, user_id),
    })


async def handle_loot_set_visibility(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle loot.set_visibility message type."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    bag_id = (data.get("bag_id") or "").strip()
    if not bag_id or bag_id not in room.loot_bags:
        return
    
    visible = bool(data.get("visible", True))
    room.loot_bags[bag_id]["visible_to_players"] = visible
    await _broadcast_loot_snapshot(room)


# ============================================================================
# CAMPAIGN SETUP HANDLERS
# ============================================================================

async def handle_campaign_setup_get_questionnaire(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle campaign.setup.get_questionnaire - return the campaign questionnaire."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .campaign_setup import CAMPAIGN_QUESTIONNAIRE
    
    await websocket.send_json({
        "type": "campaign.setup.questionnaire",
        "questionnaire": CAMPAIGN_QUESTIONNAIRE
    })


async def handle_campaign_setup_submit_responses(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle campaign.setup.submit - DM submits campaign setup responses."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .campaign_setup import (
        create_campaign_from_responses,
        generate_ai_dm_prompt_from_setup,
        serialize_campaign,
        validate_campaign_responses
    )
    
    responses = data.get("responses", {})
    
    # Validate responses
    is_valid, errors = validate_campaign_responses(responses)
    if not is_valid:
        await websocket.send_json({
            "type": "error",
            "message": "Campaign setup incomplete",
            "errors": errors
        })
        return
    
    # Create campaign
    import uuid
    campaign_id = f"campaign_{uuid.uuid4().hex[:12]}"
    campaign = create_campaign_from_responses(responses, user_id, campaign_id)
    
    # Store in room
    room.campaign_setup = campaign
    room.campaign_id = campaign_id
    
    # Generate AI DM prompt
    ai_dm_prompt = generate_ai_dm_prompt_from_setup(campaign)
    
    # Broadcast campaign setup confirmation
    await manager.broadcast(room_id, {
        "type": "campaign.setup.confirmed",
        "campaign_id": campaign_id,
        "campaign_name": campaign.campaign_name,
        "story_type": campaign.story_type.value,
        "campaign_length": campaign.campaign_length.value
    })
    
    # Send AI prompt to DM (for display or verification)
    await websocket.send_json({
        "type": "campaign.setup.ai_prompt_ready",
        "campaign_id": campaign_id,
        "ai_prompt": ai_dm_prompt,
        "message": "Campaign configured! AI DM is ready to start."
    })


async def handle_campaign_setup_get_current(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle campaign.setup.get_current - retrieve current campaign setup."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .campaign_setup import serialize_campaign
    
    if not hasattr(room, "campaign_setup") or not room.campaign_setup:
        await websocket.send_json({
            "type": "error",
            "message": "No campaign setup found. Create one first."
        })
        return
    
    campaign_data = serialize_campaign(room.campaign_setup)
    
    await websocket.send_json({
        "type": "campaign.setup.current",
        "campaign": campaign_data
    })


async def handle_campaign_setup_update(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle campaign.setup.update - modify existing campaign setup."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .campaign_setup import deserialize_campaign, generate_ai_dm_prompt_from_setup
    
    if not hasattr(room, "campaign_setup") or not room.campaign_setup:
        await websocket.send_json({
            "type": "error",
            "message": "No campaign setup to update. Create one first."
        })
        return
    
    campaign_data = data.get("campaign_updates", {})
    
    # Update specific fields
    campaign = room.campaign_setup
    for key, value in campaign_data.items():
        if hasattr(campaign, key):
            setattr(campaign, key, value)
    
    # Regenerate AI prompt with updated info
    ai_dm_prompt = generate_ai_dm_prompt_from_setup(campaign)
    
    await websocket.send_json({
        "type": "campaign.setup.updated",
        "ai_prompt": ai_dm_prompt,
        "message": "Campaign updated successfully."
    })


async def handle_campaign_setup_list(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle campaign.setup.list - get all saved campaigns."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only.", "_msgId": data.get("_msgId")})
        return
    
    from .campaign_setup import list_campaigns
    
    campaigns = list_campaigns()
    msg_id = data.get("_msgId")
    
    await websocket.send_json({
        "type": "campaign.setup.list_response",
        "campaigns": campaigns,
        "_msgId": msg_id
    })


async def handle_campaign_setup_load(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle campaign.setup.load - load a saved campaign."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only.", "_msgId": data.get("_msgId")})
        return
    
    from .campaign_setup import load_campaign, generate_ai_dm_prompt_from_setup
    
    campaign_id = data.get("campaign_id")
    msg_id = data.get("_msgId")
    
    if not campaign_id:
        await websocket.send_json({
            "type": "error",
            "message": "No campaign ID provided.",
            "_msgId": msg_id
        })
        return
    
    try:
        campaign = load_campaign(campaign_id)
        if not campaign:
            await websocket.send_json({
                "type": "error",
                "message": "Campaign not found.",
                "_msgId": msg_id
            })
            return
        
        # Store loaded campaign in room
        room.campaign_setup = campaign
        
        # Generate AI prompt
        ai_dm_prompt = generate_ai_dm_prompt_from_setup(campaign)
        
        await websocket.send_json({
            "type": "campaign.setup.loaded",
            "campaign_id": campaign_id,
            "campaign_name": campaign.campaign_name,
            "ai_prompt": ai_dm_prompt,
            "message": f"Campaign '{campaign.campaign_name}' loaded successfully.",
            "_msgId": msg_id
        })
        
        # Broadcast to all players in room
        await manager.broadcast(room_id, {
            "type": "campaign.loaded",
            "campaign_name": campaign.campaign_name,
            "message": f"DM loaded campaign: {campaign.campaign_name}"
        })
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to load campaign: {str(e)}",
            "_msgId": msg_id
        })


async def handle_campaign_setup_delete(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle campaign.setup.delete - delete a saved campaign."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only.", "_msgId": data.get("_msgId")})
        return
    
    from .campaign_setup import delete_campaign
    
    campaign_id = data.get("campaign_id")
    msg_id = data.get("_msgId")
    
    if not campaign_id:
        await websocket.send_json({
            "type": "error",
            "message": "No campaign ID provided.",
            "_msgId": msg_id
        })
        return
    
    try:
        delete_campaign(campaign_id)
        
        await websocket.send_json({
            "type": "campaign.setup.deleted",
            "campaign_id": campaign_id,
            "message": "Campaign deleted successfully.",
            "_msgId": msg_id
        })
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to delete campaign: {str(e)}",
            "_msgId": msg_id
        })


# ============================================================================
# CHARACTER HANDLERS
# ============================================================================

async def handle_character_create(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle character.create - create a new character."""
    from .character_system import create_character, save_character
    
    character_data = data.get("character_data", {})
    msg_id = data.get("_msgId")
    
    if not character_data.get("character_name"):
        await websocket.send_json({
            "type": "error",
            "message": "Character name is required",
            "_msgId": msg_id
        })
        return
    
    try:
        character = create_character(character_data, user_id)
        character_id = save_character(character)
        
        await websocket.send_json({
            "type": "character.created",
            "character_id": character_id,
            "character": character,
            "message": f"Character '{character_data.get('character_name')}' created successfully.",
            "_msgId": msg_id
        })
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to create character: {str(e)}",
            "_msgId": msg_id
        })


async def handle_character_list(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle character.list - get all characters for player."""
    from .character_system import list_characters
    
    msg_id = data.get("_msgId")
    
    try:
        characters = list_characters(user_id)
        
        await websocket.send_json({
            "type": "character.list_response",
            "characters": characters,
            "_msgId": msg_id
        })
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to list characters: {str(e)}",
            "_msgId": msg_id
        })


async def handle_character_load(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle character.load - load a character."""
    from .character_system import load_character
    
    character_id = data.get("character_id")
    msg_id = data.get("_msgId")
    
    if not character_id:
        await websocket.send_json({
            "type": "error",
            "message": "No character ID provided",
            "_msgId": msg_id
        })
        return
    
    try:
        character = load_character(character_id)
        
        if not character:
            await websocket.send_json({
                "type": "error",
                "message": "Character not found",
                "_msgId": msg_id
            })
            return
        
        # Store character in room
        room.player_character = character
        
        # Broadcast to room
        await manager.broadcast(room_id, {
            "type": "character.loaded",
            "character_id": character_id,
            "character_name": character.get("character_name"),
            "player_name": character.get("player_name"),
            "message": f"{character.get('player_name')} loaded {character.get('character_name')}"
        })
        
        await websocket.send_json({
            "type": "character.loaded",
            "character_id": character_id,
            "character": character,
            "message": "Character loaded successfully",
            "_msgId": msg_id
        })
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to load character: {str(e)}",
            "_msgId": msg_id
        })


async def handle_character_delete(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle character.delete - delete a character."""
    from .character_system import delete_character
    
    character_id = data.get("character_id")
    msg_id = data.get("_msgId")
    
    if not character_id:
        await websocket.send_json({
            "type": "error",
            "message": "No character ID provided",
            "_msgId": msg_id
        })
        return
    
    try:
        delete_character(character_id)
        
        await websocket.send_json({
            "type": "character.deleted",
            "character_id": character_id,
            "message": "Character deleted successfully",
            "_msgId": msg_id
        })
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to delete character: {str(e)}",
            "_msgId": msg_id
        })


# ============================================================================
# AI DM HANDLERS
# ============================================================================

async def handle_ai_dm_setup(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.dm.setup - configure campaign for AI DM."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .ai_dm import create_campaign, add_log_entry
    
    config = {
        "name": data.get("campaign_name", "Untitled Campaign"),
        "setting": data.get("setting", ""),
        "bbeg": data.get("bbeg", ""),
        "bbeg_motivation": data.get("bbeg_motivation", ""),
        "themes": data.get("themes", []),
        "main_chapters": data.get("main_chapters", []),
        "starting_location": data.get("starting_location", ""),
    }
    
    # Create campaign and store in room
    campaign = create_campaign(config)
    room.ai_campaign = campaign
    
    # Broadcast campaign setup confirmation
    await manager.broadcast(room_id, {
        "type": "ai.dm.campaign_ready",
        "campaign_id": campaign.campaign_id,
        "campaign_name": campaign.config.name,
        "setting": campaign.config.setting,
        "bbeg": campaign.config.bbeg,
    })


async def handle_ai_dm_new_campaign(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.dm.new_campaign - generate opening scenarios."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .ai_dm import generate_opening_scenarios
    
    scenarios = generate_opening_scenarios()
    
    # Send scenarios to DM
    await websocket.send_json({
        "type": "ai.dm.scenarios",
        "scenarios": scenarios,
    })


async def handle_ai_dm_select_scenario(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.dm.select_scenario - DM chooses a starting scenario."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .ai_dm import add_log_entry, generate_opening_scenarios
    
    scenario_index = data.get("scenario_index", 0)
    scenarios = generate_opening_scenarios()
    
    if scenario_index < 0 or scenario_index >= len(scenarios):
        await websocket.send_json({"type": "error", "message": "Invalid scenario index."})
        return
    
    scenario = scenarios[scenario_index]
    
    # Store chosen scenario in room
    if not hasattr(room, "ai_campaign"):
        room.ai_campaign = None
    
    room.chosen_scenario = scenario
    room.current_map_seed = scenario.get("map_seed")
    
    # Log the selection
    if room.ai_campaign:
        add_log_entry(room.ai_campaign, "scenario_selected", f"Campaign started with scenario: {scenario['name']}")
    
    # Broadcast scenario selection
    await manager.broadcast(room_id, {
        "type": "ai.dm.scenario_selected",
        "scenario_name": scenario["name"],
        "hook": scenario["hook"],
        "objective": scenario["objective"],
        "map_seed": scenario["map_seed"],
    })


async def handle_ai_dm_combat_start(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.dm.combat_start - initialize combat with AI DM."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .ai_dm import create_combat_state, add_log_entry
    
    encounter_id = str(uuid.uuid4())
    actors = data.get("actors", [])  # [{actor_id, actor_name, dex_modifier}, ...]
    
    if not actors:
        await websocket.send_json({"type": "error", "message": "actors required"})
        return
    
    # Create combat state
    combat = create_combat_state(encounter_id, actors)
    room.ai_combat = combat
    
    # Log combat start
    if hasattr(room, "ai_campaign") and room.ai_campaign:
        add_log_entry(room.ai_campaign, "combat_start", f"Combat started with {len(actors)} actors.")
    
    # Get current actor
    current_actor = combat.initiative_order[0] if combat.initiative_order else None
    
    # Broadcast combat initialization
    await manager.broadcast(room_id, {
        "type": "ai.dm.combat_started",
        "encounter_id": encounter_id,
        "initiative_order": [
            {"actor_id": a["actor_id"], "actor_name": a["actor_name"], "initiative": a["initiative"]}
            for a in combat.initiative_order
        ],
        "current_turn": current_actor,
        "round": combat.round_number,
    })


async def handle_ai_dm_resolve_action(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.dm.action_resolve - resolve a player action during combat."""
    if not hasattr(room, "ai_combat") or not room.ai_combat:
        await websocket.send_json({"type": "error", "message": "No active combat."})
        return
    
    from .ai_dm import generate_narration, advance_turn, get_current_actor
    
    action_description = data.get("action", "").strip()
    actor_id = data.get("actor_id", "").strip()
    
    if not action_description:
        await websocket.send_json({"type": "error", "message": "action required"})
        return
    
    combat = room.ai_combat
    
    # Generate narration for the action
    narration = generate_narration(
        action_description=action_description,
        context=f"Actor: {actor_id}, Round {combat.round_number}"
    )
    
    # Broadcast action resolution
    await manager.broadcast(room_id, {
        "type": "ai.dm.action_resolved",
        "actor_id": actor_id,
        "action": action_description,
        "narration": narration,
        "round": combat.round_number,
    })
    
    # Advance turn
    advance_turn(combat)
    next_actor = get_current_actor(combat)
    
    # Notify of turn advancement
    await manager.broadcast(room_id, {
        "type": "ai.dm.turn_advanced",
        "current_turn": next_actor,
        "round": combat.round_number,
    })


async def handle_ai_dm_combat_end(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.dm.combat_end - conclude combat."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .ai_dm import add_log_entry
    
    outcome = data.get("outcome", "combat concluded").strip()
    loot_awarded = data.get("loot", [])
    
    # Log combat end
    if hasattr(room, "ai_campaign") and room.ai_campaign:
        add_log_entry(room.ai_campaign, "combat_end", f"Combat concluded: {outcome}")
        if loot_awarded:
            room.ai_campaign.loot_distributed.extend(loot_awarded)
    
    # Clear combat state
    room.ai_combat = None
    
    # Broadcast combat end
    await manager.broadcast(room_id, {
        "type": "ai.dm.combat_ended",
        "outcome": outcome,
        "loot": loot_awarded,
    })


async def handle_ai_dm_show_log(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.dm.show_log - retrieve campaign log."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .ai_dm import format_log_summary
    
    if not hasattr(room, "ai_campaign") or not room.ai_campaign:
        await websocket.send_json({"type": "error", "message": "No active campaign."})
        return
    
    log_summary = format_log_summary(room.ai_campaign)
    
    await websocket.send_json({
        "type": "ai.dm.log",
        "summary": log_summary,
    })


# ============================================================================
# LEGACY AI HANDLERS (to be phased out)
# ============================================================================

async def handle_ai_narration(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.narration request - generate narration for a scene."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .ai import generate_scene_narration
    
    scene_description = (data.get("scene_description") or "").strip()
    context = (data.get("context") or "").strip()
    player_actions = data.get("player_actions") or []
    tone = (data.get("tone") or "epic").strip().lower()
    
    if not scene_description:
        await websocket.send_json({"type": "error", "message": "scene_description required"})
        return
    
    # Send status message
    await websocket.send_json({"type": "ai.narration.generating", "status": "in_progress"})
    
    # Generate narration
    narration = generate_scene_narration(
        scene_description=scene_description,
        context=context,
        player_actions=player_actions,
        tone=tone,
    )
    
    if not narration:
        await websocket.send_json({"type": "error", "message": "Failed to generate narration. Check AI configuration."})
        return
    
    # Broadcast narration to all players
    await manager.broadcast(room_id, {
        "type": "ai.narration",
        "narration": narration,
        "scene": scene_description,
        "generated_by": user_id,
        "ts": time.time(),
    })


async def handle_ai_map_generation(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.map_generation request - generate map image from description."""
    if role != "dm":
        await websocket.send_json({"type": "error", "message": "DM only."})
        return
    
    from .ai import generate_map_from_description
    
    scene_description = (data.get("scene_description") or "").strip()
    style = (data.get("style") or "fantasy dungeon").strip().lower()
    
    if not scene_description:
        await websocket.send_json({"type": "error", "message": "scene_description required"})
        return
    
    # Send status message
    await websocket.send_json({"type": "ai.map_generation.generating", "status": "in_progress"})
    
    # Generate map image
    image_url = generate_map_from_description(
        scene_description=scene_description,
        style=style,
    )
    
    if not image_url:
        await websocket.send_json({"type": "error", "message": "Failed to generate map. Check AI configuration."})
        return
    
    # Update room map image and broadcast
    room.map_image_url = image_url
    await manager.broadcast(room_id, {
        "type": "map.snapshot",
        "grid": room.grid,
        "map_image_url": image_url,
        "tokens": room.tokens,
        "lighting": getattr(room, "lighting", {"fog_enabled": False, "ambient_radius": 0, "darkness": False}),
    })


async def handle_ai_status(
    room: Any,
    websocket: Any,
    data: Dict[str, Any],
    manager: Any,
    room_id: str,
    user_id: str,
    role: str,
    name: str,
) -> None:
    """Handle ai.status request - get AI service status."""
    from .ai import get_ai_status
    
    status = get_ai_status()
    await websocket.send_json({
        "type": "ai.status",
        **status,
    })


# ============================================================================
# MESSAGE HANDLER DISPATCHER
# ============================================================================

# Map message types to handler functions
HANDLERS: Dict[str, Any] = {
    # Chat domain
    "chat.send": handle_chat_send,
    
    # Scene domain
    "scene.update": handle_scene_update,
    
    # Dice domain
    "dice.roll": handle_dice_roll,
    
    # Grid domain
    "grid.set": handle_grid_update,
    "grid.update": handle_grid_update,
    
    # Map domain
    "map.set_url": handle_map_set_url,
    "map.set": handle_map_set_url,
    "map.lighting.set": handle_map_lighting_set,
    
    # Token domain
    "token.add": handle_token_add,
    "token.move": handle_token_move,
    "token.update": handle_token_update,
    "token.remove": handle_token_remove,
    
    # Inventory domain
    "inventory.add": handle_inventory_add,
    "inventory.equip": handle_inventory_equip,
    "inventory.unequip": handle_inventory_unequip,
    "inventory.drop": handle_inventory_drop,
    
    # Loot domain
    "loot.generate": handle_loot_generate,
    "loot.distribute": handle_loot_distribute,
    "loot.discard": handle_loot_discard,
    "loot.snapshot": handle_loot_snapshot,
    "loot.set_visibility": handle_loot_set_visibility,
    
    # AI domain (temporarily disabled - backend startup)
    # "ai.narration": handle_ai_narration,
    # "ai.map_generation": handle_ai_map_generation,
    # "ai.status": handle_ai_status,
    
    # Campaign Setup domain
    "campaign.setup.get_questionnaire": handle_campaign_setup_get_questionnaire,
    "campaign.setup.submit": handle_campaign_setup_submit_responses,
    "campaign.setup.get_current": handle_campaign_setup_get_current,
    "campaign.setup.update": handle_campaign_setup_update,
    "campaign.setup.list": handle_campaign_setup_list,
    "campaign.setup.load": handle_campaign_setup_load,
    "campaign.setup.delete": handle_campaign_setup_delete,
    
    # Character domain
    "character.create": handle_character_create,
    "character.list": handle_character_list,
    "character.load": handle_character_load,
    "character.delete": handle_character_delete,
    
    # AI DM domain
    "ai.dm.setup": handle_ai_dm_setup,
    "ai.dm.new_campaign": handle_ai_dm_new_campaign,
    "ai.dm.select_scenario": handle_ai_dm_select_scenario,
    "ai.dm.combat_start": handle_ai_dm_combat_start,
    "ai.dm.action_resolve": handle_ai_dm_resolve_action,
    "ai.dm.combat_end": handle_ai_dm_combat_end,
    "ai.dm.show_log": handle_ai_dm_show_log,
}
