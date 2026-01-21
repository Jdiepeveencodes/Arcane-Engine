"""
Test script to verify database persistence for Phase 1
"""
import json
import sqlite3
import time
import sys
sys.path.insert(0, '.')

from app.main import db, db_save_inventories, db_load_inventories, db_save_loot_bags, db_load_loot_bags, db_append_chat_log, db_load_chat_log

# Test room ID
test_room_id = "test-room-persistence"
test_user_id = f"test-user-{int(time.time())}"

print("=" * 60)
print("PHASE 1: DATABASE PERSISTENCE TEST")
print("=" * 60)

# Clean up previous test data
c = db().cursor()
c.execute("DELETE FROM inventory WHERE room_id = ?", (test_room_id,))
c.execute("DELETE FROM loot_bags WHERE room_id = ?", (test_room_id,))
c.execute("DELETE FROM chat_log WHERE room_id = ?", (test_room_id,))
db().commit()
print("\n[✓] Cleaned up previous test data")

# TEST 1: Inventory Persistence
print("\n" + "-" * 60)
print("TEST 1: INVENTORY PERSISTENCE")
print("-" * 60)

test_inventories = {
    test_user_id: {
        "user_id": test_user_id,
        "bag": [
            {"id": "sword-001", "name": "Longsword", "is_two_handed": False},
            {"id": "shield-001", "name": "Shield"},
        ],
        "equipment": {
            "mainhand": {"id": "sword-001", "name": "Longsword", "is_two_handed": False},
            "chest": {"id": "armor-001", "name": "Plate Armor"},
        }
    }
}

db_save_inventories(test_room_id, test_inventories)
print(f"[✓] Saved inventory for user {test_user_id}")

# Now load and verify
loaded_inventories = db_load_inventories(test_room_id)
print(f"[✓] Loaded inventory from database")

assert test_user_id in loaded_inventories, f"User {test_user_id} not found in loaded inventories"
assert len(loaded_inventories[test_user_id]["bag"]) == 2, "Bag items not persisted correctly"
assert loaded_inventories[test_user_id]["equipment"]["mainhand"]["name"] == "Longsword", "Equipment not persisted"
print(f"[✓] Inventory verified:")
print(f"    - Bag items: {len(loaded_inventories[test_user_id]['bag'])}")
print(f"    - Equipment slots: {len(loaded_inventories[test_user_id]['equipment'])}")

# TEST 2: Loot Bags Persistence
print("\n" + "-" * 60)
print("TEST 2: LOOT BAGS PERSISTENCE")
print("-" * 60)

test_loot_bags = {
    "bag-001": {
        "name": "Community Loot",
        "items": [
            {"id": "potion-001", "name": "Healing Potion", "rarity": "common"},
            {"id": "gem-001", "name": "Ruby", "rarity": "rare"},
        ],
        "createdBy": test_user_id,
        "visibleToPlayers": True
    },
    "bag-002": {
        "name": "Secret Loot",
        "items": [
            {"id": "artifact-001", "name": "Ancient Artifact", "rarity": "legendary"},
        ],
        "createdBy": test_user_id,
        "visibleToPlayers": False
    }
}

db_save_loot_bags(test_room_id, test_loot_bags)
print(f"[✓] Saved {len(test_loot_bags)} loot bags")

# Now load and verify
loaded_loot_bags = db_load_loot_bags(test_room_id)
print(f"[✓] Loaded loot bags from database")

assert len(loaded_loot_bags) == 2, f"Expected 2 loot bags, got {len(loaded_loot_bags)}"
assert "bag-001" in loaded_loot_bags, "Bag 001 not found"
assert len(loaded_loot_bags["bag-001"]["items"]) == 2, "Bag 001 items not persisted"
assert loaded_loot_bags["bag-002"]["visibleToPlayers"] == False, "Visibility not persisted"
print(f"[✓] Loot bags verified:")
print(f"    - Total bags: {len(loaded_loot_bags)}")
print(f"    - Bag-001 items: {len(loaded_loot_bags['bag-001']['items'])}")
print(f"    - Bag-002 visibility: {loaded_loot_bags['bag-002']['visibleToPlayers']}")

# TEST 3: Chat Log Persistence
print("\n" + "-" * 60)
print("TEST 3: CHAT LOG PERSISTENCE")
print("-" * 60)

test_messages = [
    {
        "ts": time.time(),
        "type": "chat.message",
        "userId": test_user_id,
        "name": "TestPlayer",
        "role": "player",
        "channel": "table",
        "text": "Hello everyone!",
        "expr": ""
    },
    {
        "ts": time.time() + 1,
        "type": "chat.message",
        "userId": "dm-user",
        "name": "DM",
        "role": "dm",
        "channel": "narration",
        "text": "The tavern is warm and welcoming.",
        "expr": ""
    },
]

for msg in test_messages:
    db_append_chat_log(test_room_id, msg)

print(f"[✓] Saved {len(test_messages)} chat messages")

# Now load and verify
loaded_chat = db_load_chat_log(test_room_id, limit=100)
print(f"[✓] Loaded chat log from database")

assert len(loaded_chat) == 2, f"Expected 2 chat messages, got {len(loaded_chat)}"
assert loaded_chat[0]["text"] == "Hello everyone!", "First message not persisted"
assert loaded_chat[1]["name"] == "DM", "Second message not persisted"
assert loaded_chat[1]["channel"] == "narration", "Chat channel not persisted"
print(f"[✓] Chat log verified:")
print(f"    - Total messages: {len(loaded_chat)}")
print(f"    - Message 1: {loaded_chat[0]['name']}")
print(f"    - Message 2: {loaded_chat[1]['name']}")

# SUMMARY
print("\n" + "=" * 60)
print("PHASE 1 PERSISTENCE TEST: ALL TESTS PASSED ✓")
print("=" * 60)
print("\nVerified persistence:")
print("  ✓ Inventory items")
print("  ✓ Equipment slots")
print("  ✓ Loot bags with items")
print("  ✓ Chat messages with metadata")
print("\nDatabase persistence is working correctly!")
print("=" * 60)
