import { useCallback, useState } from "react";

export type Role = "dm" | "player";
export type Channel = "table" | "narration";

export type ChatMsg =
  | { type: "chat.message"; ts?: number; user_id?: string; name?: string; role?: Role | "system"; channel?: Channel; text: string }
  | { type: "dice.result"; ts?: number; user_id?: string; name?: string; role?: Role; channel?: Channel; expr?: string; total?: number; detail?: any }
  | { type: "error"; message: string }
  | any;

export type UseRoomChatReturn = {
  chatLog: ChatMsg[];
  setChatLog: (log: ChatMsg[]) => void;
  setChatLogState: (log: ChatMsg[]) => void;
  addChatMessage: (msg: ChatMsg) => void;
  
  sendChat: (channel: Channel, text: string) => boolean;
  rollDice: (expr: string, mode?: string) => boolean;
  addLocalSystem: (text: string) => void;
};

export function useRoomChat(send: (payload: any) => boolean): UseRoomChatReturn {
  const [chatLog, setChatLog] = useState<ChatMsg[]>([]);

  const addChatMessage = useCallback((msg: ChatMsg) => {
    setChatLog((p) => [...p, msg]);
  }, []);

  const setChatLogState = useCallback((log: ChatMsg[]) => {
    setChatLog(log);
  }, []);

  const sendChat = useCallback(
    (channel: Channel, text: string) => {
      const t = text.trim();
      if (!t) return false;
      return send({ type: "chat.send", channel, text: t });
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

  return {
    chatLog,
    setChatLog,
    setChatLogState,
    addChatMessage,
    sendChat,
    rollDice,
    addLocalSystem,
  };
}
