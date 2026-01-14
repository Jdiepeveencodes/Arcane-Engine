import { useEffect, useMemo, useRef } from "react";
import type { ChatMsg, Role } from "../hooks/useRoomSocket";

export type ChatChannel = "table" | "narration";

type Props = {
  title: string;
  channel: ChatChannel;
  connected: boolean;
  role: Role;
  chatLog?: ChatMsg[] | null;
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
  canWrite,
}: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const safeLog = Array.isArray(chatLog) ? chatLog : [];

  const filtered = useMemo(() => {
    return safeLog.filter((m: any) => {
      if (!m) return false;
      if (m.type === "chat.message") return (m.channel || "table") === channel;
      if (m.type === "dice.result") return (m.channel || "table") === channel;
      return false;
    });
  }, [safeLog, channel]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [filtered.length]);

  const writable = canWrite ?? (channel === "table" || role === "dm");

  function sendNow() {
    const t = input.trim();
    if (!t) return;
    onSend(channel, t);
    setInput("");
  }

  return (
    <section className="panel chatPanel">
      <h2>{title}</h2>

      <div className="chatLog" ref={listRef}>
        {filtered.map((m: any, idx: number) => {
          if (m.type === "dice.result") {
            return (
              <div key={idx} className="chatLine">
                <span className="muted">{m.name || "?"}</span>{" "}
                <span className="pill">{m.expr || "roll"}</span>{" "}
                <span className="pill">{m.total ?? "?"}</span>
                {m.detail ? <div className="muted">({String(m.detail)})</div> : null}
              </div>
            );
          }

          return (
            <div key={idx} className="chatLine">
              <span className="muted">{m.name || "?"}</span>: {m.text}
            </div>
          );
        })}
      </div>

      <div className="chatInputRow">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendNow();
          }}
          placeholder={channel === "narration" ? "Narrate the scene..." : "Say something..."}
          disabled={!connected || !writable}
        />
        <button onClick={sendNow} disabled={!connected || !writable}>
          Send
        </button>
      </div>
    </section>
  );
}
