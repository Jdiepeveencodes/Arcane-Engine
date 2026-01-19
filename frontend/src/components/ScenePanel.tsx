import { useCallback, useEffect, useMemo, useState } from "react";
import type { Member, Scene } from "../hooks/useRoomSocket";

type CharacterSheet = {
  name?: string | null;
  class?: string | null;
  race?: string | null;
  level?: number | null;
  background?: string | null;
  alignment?: string | null;
  experience?: number | null;
  stats?: Record<string, number | string | null> | null;
  skills?: Record<string, number | string | null> | null;
  proficiencies?: string[] | null;
  hp?: Record<string, number | string | null> | null;
  ac?: number | string | null;
  speed?: number | string | null;
  initiative?: number | string | null;
  inventory?: any[] | null;
  spells?: string[] | null;
  currency?: Record<string, number | string | null> | null;
  notes?: string | null;
};

type CharacterRecord = {
  character_id: string;
  room_id?: string | null;
  owner_user_id?: string | null;
  name?: string | null;
  sheet?: CharacterSheet | null;
  enriched?: Record<string, any> | null;
  warnings?: any[] | null;
  created_at?: number | null;
  updated_at?: number | null;
};

type Props = {
  scene?: Scene | null;
  members?: Member[] | null;
  roomId?: string | null;
};

function getCharactersForMember(member: Member, characters: CharacterRecord[]) {
  const byOwner = characters.filter((char) => char.owner_user_id && char.owner_user_id === member.user_id);
  if (byOwner.length) return byOwner;

  const nameKey = (member.name || "").trim().toLowerCase();
  if (!nameKey) return [];

  return characters.filter((char) => {
    const rawName = char.name || char.sheet?.name || "";
    const charName = String(rawName).trim().toLowerCase();
    return charName && charName === nameKey;
  });
}

function fmtValue(value: any) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ScenePanel({ scene, members, roomId }: Props) {
  const title = scene?.title ?? "—";
  const text = scene?.text ?? "—";
  const safeMembers = Array.isArray(members) ? members : [];

  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [charError, setCharError] = useState("");
  const [charLoading, setCharLoading] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);

  const refreshCharacters = useCallback(async () => {
    if (!roomId) {
      setCharacters([]);
      return;
    }
    setCharError("");
    setCharLoading(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/characters`);
      if (!res.ok) throw new Error(`Failed to load characters (${res.status}).`);
      const data = await res.json();
      const list = Array.isArray(data?.characters) ? data.characters : [];
      setCharacters(list);
    } catch (err: any) {
      setCharError(err?.message || "Failed to load characters.");
      setCharacters([]);
    } finally {
      setCharLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    refreshCharacters();
  }, [refreshCharacters]);

  const activeMember = useMemo(
    () => safeMembers.find((m) => m.user_id === activeMemberId) || null,
    [safeMembers, activeMemberId]
  );

  const memberCharacters = useMemo(() => {
    if (!activeMember) return [];
    return getCharactersForMember(activeMember, characters);
  }, [activeMember, characters]);

  useEffect(() => {
    if (!activeMember) {
      setActiveCharacterId(null);
      return;
    }
    if (!memberCharacters.length) {
      setActiveCharacterId(null);
      return;
    }
    if (!memberCharacters.some((char) => char.character_id === activeCharacterId)) {
      setActiveCharacterId(memberCharacters[0].character_id);
    }
  }, [activeMember, memberCharacters, activeCharacterId]);

  const activeCharacter =
    memberCharacters.find((char) => char.character_id === activeCharacterId) || null;

  const activeSheet = activeCharacter?.sheet || {};
  const activeName =
    activeCharacter?.name || activeSheet?.name || activeMember?.name || "Unknown";
  const activeClass = activeSheet?.class || activeCharacter?.enriched?.class?.name || "";
  const activeRace = activeSheet?.race || activeCharacter?.enriched?.race?.name || "";
  const activeLevel = activeSheet?.level ?? "";
  const activeSpells = Array.isArray(activeSheet?.spells) ? activeSheet?.spells : [];
  const activeStats = activeSheet?.stats && typeof activeSheet.stats === "object" ? activeSheet.stats : {};
  const activeSkills = activeSheet?.skills && typeof activeSheet.skills === "object" ? activeSheet.skills : {};

  const selectMember = (member: Member) => {
    if (member.role !== "player") return;
    const matches = getCharactersForMember(member, characters);
    setActiveMemberId(member.user_id);
    setActiveCharacterId(matches[0]?.character_id || null);
  };

  return (
    <section className="panel">
      <h2>Scene</h2>
      <div className="sceneTitle">{title}</div>
      <div className="sceneText">{text}</div>

      <div className="membersHeader">
        <h2>Members</h2>
        <button
          type="button"
          className="membersRefresh"
          onClick={refreshCharacters}
          disabled={charLoading || !roomId}
        >
          {charLoading ? "Loading..." : "Refresh"}
        </button>
      </div>
      <ul className="members">
        {safeMembers.map((m) => {
          const matches = getCharactersForMember(m, characters);
          const names = matches.map((char) => char.name || char.sheet?.name).filter(Boolean);
          if (m.role === "player") {
            return (
              <li key={m.user_id} className="memberRow">
                <button type="button" className="memberRoleButton" onClick={() => selectMember(m)}>
                  <span className="memberName">{m.name}</span>
                  {names.length ? (
                    <span className="memberChars">{names.join(", ")}</span>
                  ) : (
                    <span className="memberChars muted">No character</span>
                  )}
                </button>
              </li>
            );
          }

          return (
            <li key={m.user_id} className="memberRow">
              <div className="memberPrimary">
                <span className="memberName">{m.name}</span>
                <span className="memberRole muted">(dm)</span>
              </div>
            </li>
          );
        })}
      </ul>

      {activeMember && (
        <div className="charSheet">
          <div className="charSheetHeader">
            <div>
              <div className="charName">{activeName}</div>
              <div className="charMeta">
                {[activeClass, activeRace, activeLevel ? `Level ${activeLevel}` : ""].filter(Boolean).join(" • ") ||
                  "No class data yet"}
              </div>
            </div>
            <div className="charSheetControls">
              {memberCharacters.length > 1 && (
                <select
                  value={activeCharacterId || ""}
                  onChange={(e) => setActiveCharacterId(e.target.value)}
                >
                  {memberCharacters.map((char) => (
                    <option key={char.character_id} value={char.character_id}>
                      {char.name || char.sheet?.name || char.character_id}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" onClick={() => setActiveMemberId(null)}>
                Close
              </button>
            </div>
          </div>

          {!activeCharacter && <div className="charEmpty">No character attached to this player.</div>}

          {activeCharacter && (
            <>
              <div className="charGrid">
                <div>
                  <div className="charLabel">HP</div>
                  <div className="charValue">{fmtValue(activeSheet.hp)}</div>
                </div>
                <div>
                  <div className="charLabel">AC</div>
                  <div className="charValue">{fmtValue(activeSheet.ac)}</div>
                </div>
                <div>
                  <div className="charLabel">Speed</div>
                  <div className="charValue">{fmtValue(activeSheet.speed)}</div>
                </div>
                <div>
                  <div className="charLabel">Initiative</div>
                  <div className="charValue">{fmtValue(activeSheet.initiative)}</div>
                </div>
              </div>

              <div className="charSection">
                <div className="charSectionTitle">Stats</div>
                <div className="charList">
                  {Object.keys(activeStats).length ? (
                    Object.entries(activeStats).map(([key, value]) => (
                      <span key={key} className="charPill">
                        {key.toUpperCase()}: {fmtValue(value)}
                      </span>
                    ))
                  ) : (
                    <span className="muted">No stats yet.</span>
                  )}
                </div>
              </div>

              <div className="charSection">
                <div className="charSectionTitle">Skills</div>
                <div className="charList">
                  {Object.keys(activeSkills).length ? (
                    Object.entries(activeSkills).map(([key, value]) => (
                      <span key={key} className="charPill">
                        {key}: {fmtValue(value)}
                      </span>
                    ))
                  ) : (
                    <span className="muted">No skills yet.</span>
                  )}
                </div>
              </div>

              <div className="charSection">
                <div className="charSectionTitle">Spells</div>
                <div className="charList">
                  {activeSpells.length ? (
                    activeSpells.map((spell) => (
                      <span key={spell} className="charPill">
                        {spell}
                      </span>
                    ))
                  ) : (
                    <span className="muted">No spells yet.</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!!charError && <div className="charError">{charError}</div>}
    </section>
  );
}
