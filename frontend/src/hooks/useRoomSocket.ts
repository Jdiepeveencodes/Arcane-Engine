import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomChat } from "./useRoomChat";
import { useRoomInventory } from "./useRoomInventory";
import { useRoomLoot } from "./useRoomLoot";
import { useRoomTokens } from "./useRoomTokens";
import { useRoomScene } from "./useRoomScene";

// Re-export types for backward compatibility
export type Role = "dm" | "player";
export type Channel = "table" | "narration";

export type Member = { user_id: string; name: string; role: Role };
export type Scene = { title: string; text: string };

export type GridState = { cols: number; rows: number; cell: number };
export type LightingState = { fog_enabled: boolean; ambient_radius: number; darkness: boolean };

export type TokenKind = "player" | "npc" | "object";

export type Token = {
  id: string;
  label?: string;
  kind: TokenKind;
  x: number;
  y: number;
  owner_user_id?: string | null;
  size: number;
  color?: number | null;
  hp?: number | null;
  ac?: number | null;
  initiative?: number | null;
  vision_radius?: number | null;
  darkvision?: boolean | null;
};

export type EquipSlot =
  | "boots"
  | "legs"
  | "belt"
  | "chest"
  | "gloves"
  | "bracers"
  | "shoulders"
  | "necklace"
  | "head"
  | "ring1"
  | "ring2"
  | "mainhand"
  | "offhand";

export type ItemDef = {
  id: string;
  name: string;
  tier?: number;
  tags?: string[];
  slot?: EquipSlot | "bag";
  category?: string;
  is_two_handed?: boolean;
  magicType?: string;
  magicBonus?: number;
};

export type Item = ItemDef; // Alias for backward compatibility

export type PlayerInventory = {
  user_id: string;
  bag: ItemDef[];
  equipped: Partial<Record<EquipSlot, ItemDef | null>>;
};

export type LootBag = {
  bag_id: string;
  name: string;
  type: "community" | "player";
  items: ItemDef[];
  created_at: number;
  created_by: string;
  target_user_id?: string | null;
  visible_to_players?: boolean;
};

export type LootConfig = {
  source: LootSource;
  count: number;
  tierMin: number;
  tierMax: number;
  allowMagic: boolean;
  addElemental?: boolean;
  bagName?: string;
  categories: Array<"weapons" | "armor" | "jewelry">;
  slots: string[];
  tags: string[];
  categoryProps?: Partial<
    Record<
      "weapons" | "armor" | "jewelry",
      { bonus?: number; elemental?: string; magical?: string }
    >
  >;
};

export type LootSource = "mob" | "chest" | "boss" | "shop" | "custom";

export type ChatMsg =
  | { type: "chat.message"; ts?: number; user_id?: string; name?: string; role?: Role | "system"; channel?: Channel; text: string }
  | { type: "dice.result"; ts?: number; user_id?: string; name?: string; role?: Role; channel?: Channel; expr?: string; total?: number; detail?: any }
  | { type: "error"; message: string }
  | any;

export type WsMessage =
  | {
      type: "state.init";
      room?: {
        scene?: Scene;
        grid?: GridState;
        map_image_url?: string;
        tokens?: Token[];
        lighting?: LightingState;
        inventories?: Record<string, PlayerInventory>;
        loot_bags?: Record<string, LootBag>;
      };
      you?: { user_id: string; name: string; role: Role } | null;
      members?: Member[];
      chat_log?: ChatMsg[];
    }
  | { type: "members.update"; members?: Member[] }
  | { type: "scene.update"; scene?: Scene }
  | { type: "scene.snapshot"; scene?: Scene }
  | { type: "map.snapshot"; grid: GridState; map_image_url?: string; tokens?: Token[]; lighting?: LightingState }
  | { type: "token.snapshot"; tokens?: Token[] }
  | { type: "token.added"; token: Token }
  | { type: "token.updated"; token: Token }
  | { type: "token.removed"; token_id: string }
  | { type: "token.moved"; token_id: string; x: number; y: number }
  | any;

function wsUrl(roomId: string, name: string, role: Role) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const qs = new URLSearchParams({ name, role }).toString();
  return `${proto}://${window.location.host}/ws/rooms/${encodeURIComponent(roomId)}?${qs}`;
}

export function useRoomSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const pendingResponsesRef = useRef(new Map<string, (data: any) => void>());
  const messageIdRef = useRef(0);

  const [status, setStatus] = useState("Not connected.");
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [roomId, setRoomId] = useState(() => localStorage.getItem("dnd.roomId") || "");
  const [name, setName] = useState(() => localStorage.getItem("dnd.name") || "");
  const [role, setRole] = useState<Role>(() => (localStorage.getItem("dnd.role") as Role) || "player");

  const [you, setYou] = useState<{ user_id: string; name: string; role: Role } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => localStorage.setItem("dnd.roomId", roomId), [roomId]);
  useEffect(() => localStorage.setItem("dnd.name", name), [name]);
  useEffect(() => localStorage.setItem("dnd.role", role), [role]);

  const send = useCallback((payload: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject("Not connected");
    
    // Message types that expect responses
    const responseTypes = [
      "character.create",
      "character.list",
      "character.load",
      "character.delete",
      "campaign.setup.list",
      "campaign.setup.load",
      "campaign.setup.delete",
    ];
    
    // If this message type expects a response, wrap it in a promise
    if (responseTypes.includes(payload.type)) {
      const msgId = `msg_${++messageIdRef.current}`;
      const promise = new Promise((resolve, reject) => {
        pendingResponsesRef.current.set(msgId, resolve);
        // Timeout after 30 seconds
        setTimeout(() => {
          pendingResponsesRef.current.delete(msgId);
          reject("Response timeout");
        }, 30000);
      });
      
      // Send with message ID
      ws.send(JSON.stringify({ ...payload, _msgId: msgId }));
      return promise;
    } else {
      // Fire-and-forget for other messages
      ws.send(JSON.stringify(payload));
      return Promise.resolve(true);
    }
  }, []);

  // Initialize domain hooks with dependency injection
  const chat = useRoomChat(send);
  const inventory = useRoomInventory(send);
  const loot = useRoomLoot(send);
  const tokens = useRoomTokens(send);
  const scene = useRoomScene(send);

  const disconnect = useCallback(() => {
    setIsConnecting(false);
    setConnected(false);
    setStatus("Disconnected.");
    const ws = wsRef.current;
    wsRef.current = null;
    try {
      ws?.close();
    } catch {}
  }, []);

  const connect = useCallback(() => {
    const rid = roomId.trim();
    if (!rid) return setStatus("Enter a room ID.");

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setIsConnecting(true);
    setConnected(false);
    setStatus("Connecting...");

    const displayName = name.trim() || "Player";
    const url = wsUrl(rid, displayName, role);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnecting(false);
      setConnected(true);
      setStatus(`Connected to ${rid} as ${displayName} (${role})`);
    };

    ws.onclose = () => {
      setIsConnecting(false);
      setConnected(false);
      setStatus("Disconnected.");
      wsRef.current = null;
    };

    ws.onerror = () => {
      setIsConnecting(false);
      setConnected(false);
      setStatus("WebSocket error.");
    };

    ws.onmessage = (ev) => {
      let msg: WsMessage & { _msgId?: string };
      try {
        msg = JSON.parse(ev.data);
      } catch {
        chat.addChatMessage({ type: "error", message: "Bad message from server." } as any);
        return;
      }

      // Check if this is a response to a pending request
      if (msg._msgId && pendingResponsesRef.current.has(msg._msgId)) {
        const resolver = pendingResponsesRef.current.get(msg._msgId);
        pendingResponsesRef.current.delete(msg._msgId);
        if (resolver) {
          resolver(msg);
        }
        return;
      }

      // Handle initialization
      if (msg.type === "state.init") {
        setYou(msg.you ?? null);
        setMembers(Array.isArray(msg.members) ? msg.members : []);
        
        // Delegate to domain hooks for their state initialization
        if (msg.room?.scene) scene.setScene(msg.room.scene);
        if (msg.room?.grid) scene.setGridState(msg.room.grid);
        if (msg.room?.map_image_url) scene.setMapImageState(msg.room.map_image_url);
        if (msg.room?.tokens) tokens.setTokensState(msg.room.tokens);
        if (msg.room?.lighting) scene.setLighting(msg.room.lighting);
        if (msg.room?.inventories) inventory.setInventoriesState(msg.room.inventories);
        if (msg.room?.loot_bags) loot.setLootBagsState(msg.room.loot_bags);
        if (msg.chat_log) chat.setChatLogState(msg.chat_log);
        return;
      }

      // Route to domain handlers
      if (msg.type === "members.update") return setMembers(Array.isArray(msg.members) ? msg.members : []);
      if (msg.type === "scene.update" || msg.type === "scene.snapshot") return scene.setScene(msg.scene);
      if (msg.type === "inventory.snapshot") return inventory.setInventoriesState(msg.inventories);
      if (msg.type === "loot.snapshot") {
        loot.setLootBagsState(msg.loot_bags);
        const bagCount = Object.keys(msg.loot_bags || {}).length;
        loot.setLootStatus(`Items updated (${bagCount} container${bagCount === 1 ? "" : "s"}).`);
        return;
      }
      if (msg.type === "error") {
        loot.setLootStatus(msg.message || "Server error.");
        return;
      }
      if (msg.type === "map.snapshot") {
        scene.setGridState(msg.grid);
        scene.setMapImageState(msg.map_image_url || "");
        tokens.setTokensState(Array.isArray(msg.tokens) ? msg.tokens : []);
        if (msg.lighting) scene.setLightingState(msg.lighting);
        return;
      }
      if (msg.type === "token.snapshot") return tokens.setTokensState(Array.isArray(msg.tokens) ? msg.tokens : []);
      if (msg.type === "token.added") return tokens.addTokenState(msg.token);
      if (msg.type === "token.updated") return tokens.updateTokenState(msg.token);
      if (msg.type === "token.removed") return tokens.removeTokenState(msg.token_id);
      if (msg.type === "token.moved") return tokens.moveTokenState(msg.token_id, msg.x, msg.y);

      // Fallback to chat
      chat.addChatMessage(msg);
    };
  }, [roomId, name, role, chat, inventory, loot, tokens, scene, send]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  // Return unified interface with domain state and functions
  return {
    // Connection state
    status,
    connected,
    isConnecting,

    // Room parameters
    roomId,
    setRoomId,
    name,
    setName,
    role,
    setRole,

    // Session data
    you,
    members,

    // Connection methods
    connect,
    disconnect,
    send,

    // Chat domain
    chatLog: chat.chatLog,
    sendChat: chat.sendChat,
    rollDice: chat.rollDice,
    addLocalSystem: chat.addLocalSystem,

    // Scene domain
    scene: scene.scene,
    grid: scene.grid,
    mapImageUrl: scene.mapImageUrl,
    lighting: scene.lighting,
    updateGrid: scene.updateGrid,
    setMapImage: scene.setMapImage,
    setLighting: scene.setLightingState,  // Use the WebSocket sender, not local state

    // Tokens domain
    tokens: tokens.tokens,
    moveToken: tokens.moveToken,
    addToken: tokens.addToken,
    removeToken: tokens.removeToken,
    updateToken: tokens.updateToken,

    // Inventory domain
    inventories: inventory.inventories,
    requestInventorySnapshot: inventory.requestInventorySnapshot,
    addToBag: inventory.addToBag,
    equipItem: inventory.equipItem,
    unequipSlot: inventory.unequipSlot,
    dropItem: inventory.dropItem,

    // Loot domain
    lootBags: loot.lootBags,
    lootStatus: loot.lootStatus,
    generateLoot: loot.generateLoot,
    dmGenerateLoot: loot.dmGenerateLoot,
    setLootVisibility: loot.setLootVisibility,
    distributeLoot: loot.distributeLoot,
    discardLoot: loot.discardLoot,
    requestLootSnapshot: loot.requestLootSnapshot,

    // AI domain
    generateNarration: (scene: string, context: string, tone: string) =>
      send({ type: "ai.narration", scene_description: scene, context, tone }),
    generateMap: (scene: string, style: string) =>
      send({ type: "ai.map_generation", scene_description: scene, style }),
    requestAIStatus: () => send({ type: "ai.status" }),
  };
}
