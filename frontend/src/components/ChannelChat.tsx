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
            // Parse detail string like "rolls=[20, 1]" to extract just the values
            let rollsStr = "";
            let rolls: number[] = [];
            if (m.detail) {
              const detailStr = String(m.detail);
              // Extract numbers from "rolls=[20, 1]" format
              const match = detailStr.match(/\[(.+)\]/);
              rollsStr = match ? match[1] : detailStr;
              // Parse individual rolls for crit detection
              if (match && match[1]) {
                rolls = match[1].split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
              }
            }
            
            // Check for crits (only on d20)
            const isD20 = (m.expr || "").includes("d20");
            const hasCritSuccess = isD20 && rolls.includes(20);
            const hasCritFail = isD20 && rolls.includes(1);
            
            let critClass = "";
            if (hasCritSuccess) critClass = "critSuccess";
            else if (hasCritFail) critClass = "critFail";
            
            return (
              <div key={idx} className={`chatLine ${critClass}`}>
                <span className="muted">{m.name || "?"}</span>
                <div style={{ marginTop: "4px", marginLeft: "0px" }}>
                  <div className="pill">
                    {m.expr || "roll"}
                    {hasCritSuccess && " 💥"}
                    {hasCritFail && " 💀"}
                  </div>
                  <div className="muted" style={{ marginTop: "4px" }}>
                    (Rolls {rollsStr}) TOTAL <strong>{m.total ?? "?"}</strong>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="chatLine">
              {channel === "table" && (
                <>
                  <span className="muted">{m.name || "?"}</span>:{" "}
                </>
              )}
              {m.text}
            </div>
          );
        })}
      </div>

      {!(channel === "narration" && role !== "dm") && (
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
      )}
    </section>
  );
}
