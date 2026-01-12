import { useEffect, useMemo, useRef } from "react";
import type { ChatMsg, Role } from "../hooks/useRoomSocket";

export type ChatChannel = "table" | "narration";

type Props = {
  title: string;
  channel: ChatChannel;
  connected: boolean;
  role: Role;
  chatLog: ChatMsg[];
  input: string;
  setInput: (v: string) => void;
  onSend: (channel: ChatChannel, text: string) => void;
  canWrite?: boolean; // optional override
};

export default function ChannelChat({
  title,
  channel,
  connected,
  role,
  chatLog,
  input,
  setInput,
  onSend,
  canWrite
}: Props) {
  const logRef = useRef<HTMLDivElement | null>(null);

  const writable = canWrite ?? (channel === "table" ? true : role === "dm");

  const filtered = useMemo(() => {
    return chatLog.filter((m: any) => {
      if (m.type === "dice.result") return channel === "table"; // dice -> table
      if (m.type === "system.notice") return channel === "table"; // system -> table only
      if (m.type === "error") return true; // errors can show everywhere
      if (m.type !== "chat.message") return false;

      const ch = (m.channel || "table") as ChatChannel;
      return ch === channel;
    });
  }, [chatLog, channel]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [filtered.length]);

  function sendNow() {
    const text = input.trim();
    if (!text) return;
    onSend(channel, text);
    setInput("");
  }

  return (
    <section className="panel">
      <h2 style={{ margin: 0 }}>{title}</h2>

      <div className="log" ref={logRef}>
        {filtered.map((m: any, idx: number) => {
          if (m.type === "chat.message") {
            return (
              <div className="msg" key={idx}>
                <b>{m.name}</b>: {m.text}
              </div>
            );
          }

          if (m.type === "dice.result") {
            return (
              <div className="msg diceMsg" key={idx}>
                <span className="diceIcon">🎲</span>
                <span className="diceWho">
                  <b>{m.name}</b>
                </span>
                <span className="diceText">
                  rolled <code className="diceExpr">{m.expr}</code>
                </span>
                <span className="diceArrow">→</span>
                <span className="diceTotal">{m.total}</span>
                <span className="diceDetail muted">({m.detail})</span>
              </div>
            );
          }

          if (m.type === "system.notice") {
            const isTotal = typeof m.message === "string" && m.message.trim().toUpperCase().startsWith("TOTAL");
            return (
              <div className={"msg sys " + (isTotal ? "totalLine" : "")} key={idx}>
                {isTotal ? (
                  <>
                    <span className="totalDivider" />
                    <span className="totalInner">
                      <span className="totalIcon">🧮</span>
                      <span className="totalText">{m.message}</span>
                    </span>
                  </>
                ) : (
                  <>• {m.message}</>
                )}
              </div>
            );
          }

          if (m.type === "error") {
            return (
              <div className="msg err" key={idx}>
                ⚠ {m.message}
              </div>
            );
          }

          return (
            <div className="msg" key={idx}>
              {JSON.stringify(m)}
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={channel === "table" ? "Say something..." : "Narrate the scene... (DM only)"}
          onKeyDown={(e) => e.key === "Enter" && sendNow()}
          style={{ flex: 1 }}
          disabled={!connected || !writable}
        />
        <button onClick={sendNow} disabled={!connected || !writable}>
          Send
        </button>
      </div>

      {!writable && channel === "narration" && (
        <div className="muted" style={{ marginTop: 8 }}>
          Narration is DM-only.
        </div>
      )}
    </section>
  );
}
