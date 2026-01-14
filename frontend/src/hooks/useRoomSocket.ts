import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type Role = "dm" | "player";
export type Channel = "table" | "narration";

export type Member = { user_id: string; name: string; role: Role };
export type Scene = { title: string; text: string };

export type GridState = { cols: number; rows: number; cell: number };

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
};

/**
 * INVENTORY (MVP)
 */
export type EquipSlot =
  | "boots"
  | "legs"
  | "belt"
  | "chest"
  | "gloves"
  | "bracers"
  | "shoulders"
  | "necklace"
  | "gorget"
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
};

export type PlayerInventory = {
  user_id: string;
  bag: ItemDef[];
  equipped: Partial<Record<EquipSlot, ItemDef | null>>;
};

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
        inventories?: Record<string, PlayerInventory>;
      };
      you?: { user_id: string; name: string; role: Role } | null;
      members?: Member[];
      chat_log?: ChatMsg[];
    }
  | { type: "members.update"; members?: Member[] }
  | { type: "scene.update"; scene?: Scene }
  | { type: "map.snapshot"; grid: GridState; map_image_url?: string; tokens?: Token[] }
  | { type: "token.moved"; token_id: string; x: number; y: number }
  | any;

function wsUrl(roomId: string, name: string, role: Role) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const qs = new URLSearchParams({ name, role }).toString();

  // IMPORTANT: use the same path your app was logging (/ws/rooms/...)
  return `${proto}://${window.location.host}/ws/rooms/${encodeURIComponent(roomId)}?${qs}`;
}

export function useRoomSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState("Not connected.");
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [roomId, setRoomId] = useState(() => localStorage.getItem("dnd.roomId") || "");
  const [name, setName] = useState(() => localStorage.getItem("dnd.name") || "");
  const [role, setRole] = useState<Role>(() => (localStorage.getItem("dnd.role") as Role) || "player");

  const [you, setYou] = useState<{ user_id: string; name: string; role: Role } | null>(null);

  const [scene, setScene] = useState<Scene>({ title: "—", text: "—" });
  const [members, setMembers] = useState<Member[]>([]);
  const [chatLog, setChatLog] = useState<ChatMsg[]>([]);

  const [grid, setGrid] = useState<GridState>({ cols: 20, rows: 20, cell: 32 });
  const [mapImageUrl, setMapImageUrl] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);

  const [inventories, setInventories] = useState<Record<string, PlayerInventory>>({});

  useEffect(() => localStorage.setItem("dnd.roomId", roomId), [roomId]);
  useEffect(() => localStorage.setItem("dnd.name", name), [name]);
  useEffect(() => localStorage.setItem("dnd.role", role), [role]);

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

    // prevent spam clicks from creating a storm
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setIsConnecting(true);
    setConnected(false);
    setStatus("Connecting...");

    const displayName = (name.trim() || "Player").slice(0, 24);
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
      let msg: WsMessage;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        setChatLog((p) => [...p, { type: "error", message: "Bad message from server." }]);
        return;
      }

      if (msg.type === "state.init") {
        setYou(msg.you ?? null);
        setScene(msg.room?.scene || { title: "—", text: "—" });
        setMembers(Array.isArray(msg.members) ? msg.members : []);
        setChatLog(Array.isArray(msg.chat_log) ? (msg.chat_log as any) : []);

        if (msg.room?.grid) setGrid(msg.room.grid);
        setMapImageUrl(msg.room?.map_image_url || "");
        setTokens(Array.isArray(msg.room?.tokens) ? (msg.room?.tokens as any) : []);
        setInventories((msg.room?.inventories || {}) as any);
        return;
      }

      if (msg.type === "members.update") return setMembers(Array.isArray(msg.members) ? msg.members : []);
      if (msg.type === "scene.update") return setScene(msg.scene || { title: "—", text: "—" });

      if (msg.type === "map.snapshot") {
        setGrid(msg.grid);
        setMapImageUrl(msg.map_image_url || "");
        setTokens(Array.isArray(msg.tokens) ? (msg.tokens as any) : []);
        return;
      }

      setChatLog((p) => [...p, msg as any]);
    };
  }, [roomId, name, role]);

  const send = useCallback((payload: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  const sendChat = useCallback(
    (channel: Channel, text: string) => {
      const t = text.trim();
      if (!t) return false;
      return send({ type: "chat.message", channel, text: t });
    },
    [send]
  );

  const rollDice = useCallback(
    (expr: string, mode?: string) => {
      const e = (expr || "").trim();
      if (!e) return false;
      return send({ type: "dice.roll", expr: e, mode: mode || "norm" });
    },
    [send]
  );

  const addLocalSystem = useCallback((text: string) => {
    setChatLog((p) => [...p, { type: "chat.message", channel: "table", role: "system", name: "System", text } as any]);
  }, []);

  // map/token actions preserved (if you had them previously they’ll still work)
  const moveToken = useCallback(
    (token_id: string, x: number, y: number) => send({ type: "token.move", token_id, x, y }),
    [send]
  );
  const updateGrid = useCallback((cols: number, rows: number, cell: number) => send({ type: "grid.update", cols, rows, cell }), [send]);
  const setMapImage = useCallback((url: string) => send({ type: "map.set", url }), [send]);
  const addToken = useCallback((token: Partial<Token>) => send({ type: "token.add", token }), [send]);
  const removeToken = useCallback((token_id: string) => send({ type: "token.remove", token_id }), [send]);
  const updateToken = useCallback((token_id: string, patch: Partial<Token>) => send({ type: "token.update", token_id, patch }), [send]);

  const requestInventorySnapshot = useCallback(() => send({ type: "inventory.snapshot" }), [send]);
  const addToBag = useCallback((itemId: string) => send({ type: "inventory.add", itemId }), [send]);
  const equipItem = useCallback((itemId: string, slot?: EquipSlot) => send({ type: "inventory.equip", itemId, slot }), [send]);
  const unequipSlot = useCallback((slot: EquipSlot) => send({ type: "inventory.unequip", slot }), [send]);

  // ensure we close socket when the hook unmounts
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return useMemo(
    () => ({
      status,
      connected,
      isConnecting,

      roomId,
      setRoomId,
      name,
      setName,
      role,
      setRole,

      you,
      scene,
      members,
      chatLog,

      connect,
      disconnect,

      sendChat,
      rollDice,
      addLocalSystem,

      grid,
      mapImageUrl,
      tokens,
      moveToken,
      updateGrid,
      setMapImage,
      addToken,
      removeToken,
      updateToken,

      inventories,
      requestInventorySnapshot,
      addToBag,
      equipItem,
      unequipSlot,
    }),
    [
      status,
      connected,
      isConnecting,
      roomId,
      name,
      role,
      you,
      scene,
      members,
      chatLog,
      connect,
      disconnect,
      sendChat,
      rollDice,
      addLocalSystem,
      grid,
      mapImageUrl,
      tokens,
      moveToken,
      updateGrid,
      setMapImage,
      addToken,
      removeToken,
      updateToken,
      inventories,
      requestInventorySnapshot,
      addToBag,
      equipItem,
      unequipSlot,
    ]
  );
}
