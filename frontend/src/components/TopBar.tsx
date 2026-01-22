import React from "react";

const BUILD_STAMP = "build: 2026-01-16e";

type Props = {
  status: string;
  rulesHasUpdate?: boolean;
  onRulesSync?: () => void;
  rulesSyncing?: boolean;

  roomName: string;
  setRoomName: (v: string) => void;
  onCreateRoom: () => void;

  roomId: string;
  setRoomId: (v: string) => void;

  name: string;
  setName: (v: string) => void;

  role: "dm" | "player";
  setRole: (v: "dm" | "player") => void;

  connected: boolean;
  onJoin: () => void;
  onDisconnect: () => void;
};

export default function TopBar({
  status,
  rulesHasUpdate,
  onRulesSync,
  rulesSyncing,
  roomName,
  setRoomName,
  onCreateRoom,
  roomId,
  setRoomId,
  name,
  setName,
  role,
  setRole,
  connected,
  onJoin,
  onDisconnect,
}: Props) {
  return (
    <header className="topbar panel" style={{ marginBottom: 12 }}>
      {/* Brand removed (space freed) */}
      <div className="brand" />

      <input
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        placeholder="Room name"
        style={{ width: 180 }}
        disabled={connected}
      />
      <button onClick={onCreateRoom} disabled={connected}>
        Create Room
      </button>

      <input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Room ID"
        style={{ width: 120 }}
        disabled={connected}
      />

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        style={{ width: 140 }}
        disabled={connected}
      />

      <select value={role} onChange={(e) => setRole(e.target.value as any)} disabled={connected}>
        <option value="player">Player</option>
        <option value="dm">DM</option>
      </select>

      {!connected ? (
        <button onClick={onJoin}>Connect</button>
      ) : (
        <button onClick={onDisconnect}>Disconnect</button>
      )}

      <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8, whiteSpace: "nowrap" }}>
        <span>{status}</span>
        <span style={{ marginLeft: 8, opacity: 0.6 }}>{BUILD_STAMP}</span>
      </div>
    </header>
  );
}
