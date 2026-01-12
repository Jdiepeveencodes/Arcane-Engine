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
  | "mainHand"
  | "offHand";

export type Item = {
  id: string;
  name: string;
  slot: string; // "bag" | "ring" | etc
  is_two_handed?: boolean;
  tags?: string[];
};

export type PlayerInventory = {
  playerId: string;
  equipment: Partial<Record<EquipSlot, Item>>;
  bag: Item[];
};

export type InventorySnapshotMsg = {
  type: "inv.snapshot";
  inventories: Record<string, PlayerInventory>;
};

export type ChatMsg =
  | { type: "chat.message"; ts?: number; user_id?: string; name: string; role?: Role; channel?: Channel; text: string }
  | { type: "system.notice"; ts?: number; message: string; channel?: Channel }
  | {
      type: "dice.result";
      ts?: number;
      user_id?: string;
      name: string;
      role?: Role;
      channel?: Channel;
      expr: string;
      total: number;
      detail: string;
    }
  | { type: "error"; message: string }
  | any;

type WsMessage =
  | {
      type: "state.init";
      room: {
        scene: Scene;
        grid?: GridState;
        map_image_url?: string;
        tokens?: Token[];
        inventories?: Record<string, PlayerInventory>;
      };
      you: { user_id: string; name: string; role: Role };
      members: Member[];
      chat_log: any[];
    }
  | { type: "members.update"; members: Member[] }
  | { type: "scene.update"; scene: Scene }
  | { type: "map.snapshot"; grid: GridState; map_image_url: string; tokens: Token[] }
  | { type: "map.token_moved"; token_id: string; x: number; y: number }
  | InventorySnapshotMsg
  | ChatMsg;

function wsUrl(roomId: string, name: string, role: Role) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const qs = new URLSearchParams({ name, role }).toString();
  return `${proto}://${window.location.host}/ws/${roomId}?${qs}`;
}

export function useRoomSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState("Not connected.");
  const [connected, setConnected] = useState(false);

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
    const ws = wsRef.current;
    if (ws) {
      try {
        ws.close();
      } catch {}
    }
    wsRef.current = null;
    setConnected(false);
    setStatus("Disconnected.");
  }, []);

  const connect = useCallback(() => {
    const rid = roomId.trim();
    if (!rid) return setStatus("Enter a room ID.");

    const displayName = (name.trim() || "Player").slice(0, 24);
    const url = wsUrl(rid, displayName, role);

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setStatus(`Connected to ${rid} as ${displayName} (${role})`);
    };

    ws.onclose = () => {
      setConnected(false);
      setStatus("Disconnected.");
    };

    ws.onerror = () => {
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
        setYou(msg.you);
        setScene(msg.room?.scene || { title: "—", text: "—" });
        setMembers(msg.members || []);
        setChatLog((msg.chat_log || []) as any);
        if (msg.room?.grid) setGrid(msg.room.grid);
        setMapImageUrl(msg.room?.map_image_url || "");
        setTokens((msg.room?.tokens || []) as any);
        setInventories((msg.room?.inventories || {}) as any);
        return;
      }

      if (msg.type === "members.update") return setMembers(msg.members || []);
      if (msg.type === "scene.update") return setScene(msg.scene || { title: "—", text: "—" });

      if (msg.type === "map.snapshot") {
        setGrid(msg.grid);
        setMapImageUrl(msg.map_image_url || "");
        setTokens(msg.tokens || []);
        return;
      }

      if (msg.type === "map.token_moved") {
        setTokens((prev) => prev.map((t) => (t.id === msg.token_id ? { ...t, x: msg.x, y: msg.y } : t)));
        return;
      }

      if (msg.type === "inv.snapshot") {
        setInventories((msg.inventories || {}) as any);
        return;
      }

      setChatLog((p) => [...p, msg]);
    };
  }, [roomId, name, role]);

  const send = useCallback((payload: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  const sendChat = useCallback(
    (text: string, channel: Channel = "table") => send({ type: "chat.message", text, channel }),
    [send]
  );

  const rollDice = useCallback((expr: string, mode?: string) => send({ type: "dice.roll", expr, mode: mode || "" }), [send]);

  const moveToken = useCallback((tokenId: string, x: number, y: number) => send({ type: "map.token_move", token_id: tokenId, x, y }), [send]);

  const updateGrid = useCallback((g: Partial<GridState>) => send({ type: "map.grid_update", grid: g }), [send]);
  const setMapImage = useCallback((url: string) => send({ type: "map.image_set", map_image_url: url }), [send]);
  const addToken = useCallback((token: Partial<Token>) => send({ type: "map.token_add", token }), [send]);
  const removeToken = useCallback((tokenId: string) => send({ type: "map.token_remove", token_id: tokenId }), [send]);
  const updateToken = useCallback((tokenId: string, patch: Partial<Token>) => send({ type: "map.token_update", token_id: tokenId, patch }), [send]);

  // INVENTORY
  const requestInventorySnapshot = useCallback(() => send({ type: "inv.request_snapshot" }), [send]);

  const addToBag = useCallback(
    (item: Partial<Item>, targetUserId?: string) =>
      send({
        type: "inv.add_to_bag",
        item,
        target_user_id: targetUserId || "",
      }),
    [send]
  );

  const equipItem = useCallback(
    (toSlot: EquipSlot, item: Partial<Item>, targetUserId?: string) =>
      send({
        type: "inv.equip",
        to_slot: toSlot,
        item,
        target_user_id: targetUserId || "",
      }),
    [send]
  );

  const unequipSlot = useCallback(
    (slot: EquipSlot, targetUserId?: string) =>
      send({
        type: "inv.unequip",
        slot,
        target_user_id: targetUserId || "",
      }),
    [send]
  );

  const addLocalSystem = useCallback(
    (message: string) => setChatLog((p) => [...p, { type: "system.notice", message, channel: "table" }]),
    []
  );

  return useMemo(
    () => ({
      status,
      connected,
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
