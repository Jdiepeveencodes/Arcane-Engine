import type { Member, Scene } from "../hooks/useRoomSocket";

type Props = {
  scene?: Scene | null;
  members?: Member[] | null;
};

export default function ScenePanel({ scene, members }: Props) {
  const title = scene?.title ?? "—";
  const text = scene?.text ?? "—";
  const safeMembers = Array.isArray(members) ? members : [];

  return (
    <section className="panel">
      <h2>Scene</h2>
      <div className="sceneTitle">{title}</div>
      <div className="sceneText">{text}</div>

      <h2 style={{ marginTop: 14 }}>Members</h2>
      <ul className="members">
        {safeMembers.map((m) => (
          <li key={m.user_id}>
            {m.name} <span className="muted">({m.role})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
