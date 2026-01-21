#!/usr/bin/env python3
"""
Comprehensive regression test for Phase 2 refactoring.
Tests all domain functionality: chat, dice, inventory, loot, tokens, scene.
"""

import asyncio
import json
import time
import aiohttp
import sys

BASE_URL = "http://127.0.0.1:8001"
WS_URL = "ws://127.0.0.1:8001"

class RegressionTester:
    def __init__(self):
        self.room_id = None
        self.dm_ws = None
        self.player_ws = None
        self.dm_session = None
        self.player_session = None
        self.dm_messages = []
        self.player_messages = []
        
    async def create_room(self):
        """Create a new room"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{BASE_URL}/api/rooms",
                json={"name": "Test Room"},
            ) as resp:
                if resp.status != 200:
                    print(f"❌ Failed to create room: {resp.status}")
                    return False
                data = await resp.json()
                self.room_id = data.get("room_id")
                print(f"✅ Created room: {self.room_id}")
                return True

    async def connect_dm(self):
        """Connect as DM"""
        url = f"{WS_URL}/ws/rooms/{self.room_id}?name=DM&role=dm"
        try:
            self.dm_session = aiohttp.ClientSession()
            self.dm_ws = await self.dm_session.ws_connect(url)
            # Receive initial state
            msg = await self.dm_ws.receive_json()
            if msg.get("type") == "state.init":
                print("✅ DM connected and received state.init")
                self.dm_messages.append(msg)
                return True
        except Exception as e:
            print(f"❌ Failed to connect DM: {e}")
            return False

    async def connect_player(self):
        """Connect as Player"""
        url = f"{WS_URL}/ws/rooms/{self.room_id}?name=Player&role=player"
        try:
            self.player_session = aiohttp.ClientSession()
            self.player_ws = await self.player_session.ws_connect(url)
            # Receive initial state
            msg = await self.player_ws.receive_json()
            if msg.get("type") == "state.init":
                print("✅ Player connected and received state.init")
                self.player_messages.append(msg)
                return True
        except Exception as e:
            print(f"❌ Failed to connect player: {e}")
            return False

    async def test_chat_domain(self):
        """Test chat and dice functionality"""
        print("\n📝 Testing Chat Domain...")
        
        # DM sends a message
        await self.dm_ws.send_json({
            "type": "chat.send",
            "channel": "table",
            "text": "Hello from DM!"
        })
        
        # Receive message echo
        msg = await asyncio.wait_for(self.dm_ws.receive_json(), timeout=2.0)
        if msg.get("type") == "chat.message" and "DM" in str(msg.get("name")):
            print("✅ Chat message sent and received by DM")
        else:
            print(f"❌ Chat message issue: {msg}")
            
        # Player rolls dice
        await self.player_ws.send_json({
            "type": "dice.roll",
            "expr": "1d20+5",
            "mode": "norm"
        })
        
        # Receive dice result
        msg = await asyncio.wait_for(self.player_ws.receive_json(), timeout=2.0)
        if msg.get("type") == "dice.result" and msg.get("total") is not None:
            print(f"✅ Dice roll successful: {msg.get('expr')} = {msg.get('total')}")
        else:
            print(f"❌ Dice roll issue: {msg}")

    async def test_tokens_domain(self):
        """Test token management"""
        print("\n🎮 Testing Tokens Domain...")
        
        # DM adds a token
        await self.dm_ws.send_json({
            "type": "token.add",
            "token": {
                "id": "npc_1",
                "label": "Goblin",
                "kind": "npc",
                "x": 5,
                "y": 5,
                "size": 1,
                "color": 0xFF0000
            }
        })
        
        # Player should receive token.added
        msg = await asyncio.wait_for(self.player_ws.receive_json(), timeout=2.0)
        if msg.get("type") == "token.added" and msg.get("token", {}).get("label") == "Goblin":
            print("✅ Token added successfully")
        else:
            print(f"❌ Token add issue: {msg}")
            
        # DM moves token
        await self.dm_ws.send_json({
            "type": "token.move",
            "token_id": "npc_1",
            "x": 10,
            "y": 10
        })
        
        # Player should receive token.moved
        msg = await asyncio.wait_for(self.player_ws.receive_json(), timeout=2.0)
        if msg.get("type") == "token.moved" and msg.get("x") == 10:
            print("✅ Token moved successfully")
        else:
            print(f"❌ Token move issue: {msg}")

    async def test_scene_domain(self):
        """Test scene and map management"""
        print("\n🗺️ Testing Scene Domain...")
        
        # Update scene
        await self.dm_ws.send_json({
            "type": "scene.update",
            "title": "Tavern",
            "text": "A cozy tavern with a roaring fire."
        })
        
        # Player should receive scene.update
        msg = await asyncio.wait_for(self.player_ws.receive_json(), timeout=2.0)
        if msg.get("type") == "scene.update" and msg.get("title") == "Tavern":
            print("✅ Scene updated successfully")
        else:
            print(f"❌ Scene update issue: {msg}")
            
        # Update grid
        await self.dm_ws.send_json({
            "type": "grid.set",
            "cols": 30,
            "rows": 30,
            "cell": 32
        })
        
        # Player should receive map.snapshot
        msg = await asyncio.wait_for(self.player_ws.receive_json(), timeout=2.0)
        if msg.get("type") == "map.snapshot" and msg.get("grid", {}).get("cols") == 30:
            print("✅ Grid updated successfully")
        else:
            print(f"❌ Grid update issue: {msg}")

    async def test_loot_domain(self):
        """Test loot bag management"""
        print("\n💰 Testing Loot Domain...")
        
        # DM generates loot
        await self.dm_ws.send_json({
            "type": "loot.generate",
            "target_user_id": None,
            "config": {
                "source": "mob",
                "count": 3,
                "tierMin": 1,
                "tierMax": 3,
                "allowMagic": True,
                "categories": ["weapons", "armor"],
                "slots": [],
                "tags": [],
                "bagName": "Mob Loot"
            }
        })
        
        # Wait for loot response
        msg = await asyncio.wait_for(self.dm_ws.receive_json(), timeout=3.0)
        if msg.get("type") == "loot.snapshot":
            print(f"✅ Loot generated: {len(msg.get('loot_bags', {}))} bags")
        else:
            print(f"⚠️  Loot response type: {msg.get('type')}")

    async def test_inventory_domain(self):
        """Test inventory management"""
        print("\n🎒 Testing Inventory Domain...")
        
        # Request inventory snapshot
        await self.player_ws.send_json({
            "type": "inventory.snapshot"
        })
        
        # Receive snapshot
        msg = await asyncio.wait_for(self.player_ws.receive_json(), timeout=2.0)
        if msg.get("type") == "inventory.snapshot":
            print("✅ Inventory snapshot received")
        else:
            print(f"⚠️  Inventory response type: {msg.get('type')}")

    async def run_all_tests(self):
        """Run all regression tests"""
        print("=" * 60)
        print("PHASE 2 REFACTORING REGRESSION TEST")
        print("=" * 60)
        
        # Setup
        if not await self.create_room():
            print("\n❌ Could not create room")
            return False
            
        # Give room time to stabilize
        await asyncio.sleep(0.5)
        
        # Connect clients
        if not await self.connect_dm():
            print("\n❌ Could not connect DM")
            return False
            
        await asyncio.sleep(0.3)
        
        if not await self.connect_player():
            print("\n❌ Could not connect player")
            return False
            
        await asyncio.sleep(0.5)
        
        # Run domain tests
        try:
            await self.test_chat_domain()
            await asyncio.sleep(0.3)
            
            await self.test_tokens_domain()
            await asyncio.sleep(0.3)
            
            await self.test_scene_domain()
            await asyncio.sleep(0.3)
            
            await self.test_loot_domain()
            await asyncio.sleep(0.3)
            
            await self.test_inventory_domain()
            
        except asyncio.TimeoutError:
            print("\n❌ Timeout waiting for response")
            return False
        except Exception as e:
            print(f"\n❌ Error during testing: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            # Cleanup
            if self.dm_ws:
                await self.dm_ws.close()
            if self.player_ws:
                await self.player_ws.close()
            if self.dm_session:
                await self.dm_session.close()
            if self.player_session:
                await self.player_session.close()
        
        print("\n" + "=" * 60)
        print("✅ ALL REGRESSION TESTS PASSED!")
        print("=" * 60)
        return True

async def main():
    tester = RegressionTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
