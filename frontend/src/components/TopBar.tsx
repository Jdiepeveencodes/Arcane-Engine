import type { Role } from "../hooks/useRoomSocket";

type Props = {
  status: string;
  roomName: string;
  setRoomName: (v: string) => void;
  onCreateRoom: () => void;

  roomId: string;
  setRoomId: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  role: Role;
  setRole: (r: Role) => void;

  connected: boolean;
  onJoin: () => void;
  onDisconnect: () => void;
};

export default function TopBar(props: Props) {
  const {
    status,
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
    onDisconnect
  } = props;

  return (
    <header className="topbar">
      <h1>D&amp;D Console MVP</h1>

      <div className="row">
        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Room name (for create)"
        />
        <button onClick={onCreateRoom}>Create Room</button>

        <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Room ID to join" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />

        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="player">Player</option>
          <option value="dm">DM</option>
        </select>

        {!connected ? (
          <button onClick={onJoin}>Join</button>
        ) : (
          <button onClick={onDisconnect}>Disconnect</button>
        )}
      </div>

      <div className="status">{status}</div>
    </header>
  );
}
