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
    
    room.grid["cols"] = _clamp_int(data.get("cols"), 1, 50, room.grid["cols"])
    room.grid["rows"] = _clamp_int(data.get("rows"), 1, 50, room.grid["rows"])
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
}
