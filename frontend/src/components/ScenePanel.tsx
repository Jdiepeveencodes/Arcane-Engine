import type { Member, Scene } from "../hooks/useRoomSocket";

type Props = {
  scene: Scene;
  members: Member[];
};

export default function ScenePanel({ scene, members }: Props) {
  return (
    <section className="panel">
      <h2>Scene</h2>
      <div className="sceneTitle">{scene.title || "—"}</div>
      <div className="sceneText">{scene.text || "—"}</div>

      <h2 style={{ marginTop: 14 }}>Members</h2>
      <ul className="members">
        {members.map((m) => (
          <li key={m.user_id}>
            {m.name} <span className="muted">({m.role})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
