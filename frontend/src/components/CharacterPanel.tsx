import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ItemDef, Member, PlayerInventory } from "../hooks/useRoomSocket";
import { buildWeaponTooltipLines } from "../utils/weaponStats";
import CharacterSheetForm, { CharacterSheetDraft, emptyCharacterSheetDraft } from "./CharacterSheetForm";
import CharacterSheetPage2 from "./CharacterSheetPage2";
import CharacterSheetSpells from "./CharacterSheetSpells";

type CharacterSheet = {
  name?: string | null;
  class?: string | null;
  race?: string | null;
  level?: number | null;
  subclass?: string | null;
  background?: string | null;
  alignment?: string | null;
  experience?: number | null;
  inspiration?: string | null;
  status?: string | null;
  prof_bonus?: number | string | null;
  stats?: Record<string, any> | null;
  mods?: Record<string, any> | null;
  hp?: Record<string, any> | null;
  ac?: number | string | null;
  speed?: number | string | null;
  initiative?: number | string | null;
  hit_dice?: Record<string, any> | null;
  death_saves?: Record<string, any> | null;
  exhaustion?: number | string | null;
  conditions?: string | null;
  skills_text?: string | null;
  attacks_text?: string | null;
  armor_text?: string | null;
  proficiencies_text?: string | null;
  equipment_text?: string | null;
  features_text?: string | null;
  spells?: string[] | null;
  notes?: string | null;
  player_name?: string | null;
};

type CharacterRecord = {
  character_id: string;
  room_id?: string | null;
  owner_user_id?: string | null;
  name?: string | null;
  sheet?: CharacterSheet | null;
  enriched?: Record<string, any> | null;
};

type Props = {
  roomId: string;
  members: Member[];
  role: "dm" | "player";
  userId: string;
  page: "sheet" | "sheet2" | "spells";
  inventories?: Record<string, PlayerInventory>;
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

function toText(value: any) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toNullableText(value: string) {
  const trimmed = (value || "").trim();
  return trimmed ? trimmed : null;
}

function toValue(value: string) {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : trimmed;
}

const AUTO_MARKER = "\n-- Auto (Inventory) --\n";

const EQUIP_SLOT_LABELS: Record<string, string> = {
  head: "Head",
  necklace: "Necklace",
  shoulders: "Shoulders",
  chest: "Chest",
  bracers: "Bracers",
  gloves: "Gloves",
  belt: "Belt",
  legs: "Legs",
  boots: "Boots",
  ring1: "Ring 1",
  ring2: "Ring 2",
  mainhand: "Main Hand",
  offhand: "Off Hand",
};

function mergeAutoText(current: string, auto: string, lastAuto: string) {
  const hasMarker = (current || "").includes(AUTO_MARKER);
  if (!hasMarker && lastAuto && current.trim() === lastAuto.trim()) {
    current = "";
  }
  const manual = (current || "").split(AUTO_MARKER)[0]?.trimEnd() || "";
  const autoText = (auto || "").trim();
  if (!autoText) return manual.trim();
  if (!manual) return `${AUTO_MARKER}${autoText}`.trim();
  return `${manual}\n${AUTO_MARKER}${autoText}`.trim();
}

function itemTitle(item?: ItemDef | null) {
  if (!item) return "";
  const lines = buildWeaponTooltipLines(item);
  if (lines && lines.length > 1) return lines[1] || item.name || item.id;
  return item.name || item.id || "";
}

function summarizeInventory(inv?: PlayerInventory | null) {
  if (!inv) return { equipment: "", attacks: "", armor: "" };
  const bag = Array.isArray((inv as any).bag) ? (inv as any).bag : [];
  const equipment = (inv as any).equipment || (inv as any).equipped || {};

  const equippedLines: string[] = [];
  const armorLines: string[] = [];
  const attackLines: string[] = [];

  Object.keys(EQUIP_SLOT_LABELS).forEach((slotKey) => {
    const item = equipment?.[slotKey];
    if (!item) return;
    const label = EQUIP_SLOT_LABELS[slotKey] || slotKey;
    const title = itemTitle(item);
    if (title) equippedLines.push(`${label}: ${title}`);

    if (slotKey === "mainhand" || slotKey === "offhand") {
      const lines = buildWeaponTooltipLines(item);
      if (lines && lines.length) {
        const titleLine = lines[1] || title;
        const dmgIndex = lines.indexOf("Damage");
        const dmgLine = dmgIndex >= 0 ? lines[dmgIndex + 1] : "";
        const propLine = lines[3] || "";
        const enchantIndex = lines.indexOf("Enchantment");
        const enchantLine = enchantIndex >= 0 ? lines[enchantIndex + 1] : "";
        const parts = [titleLine, dmgLine].filter(Boolean);
        const extras = [propLine, enchantLine].filter(Boolean);
        const merged = extras.length ? `${parts.join(" — ")} (${extras.join("; ")})` : parts.join(" — ");
        if (merged) attackLines.push(merged);
      }
    } else if (!["ring1", "ring2", "necklace"].includes(slotKey)) {
      if (title) armorLines.push(`${label}: ${title}`);
    }
  });

  let bagLine = "";
  if (bag.length) {
    const names = bag.map((it: any) => it?.name || it?.id).filter(Boolean);
    const capped = names.slice(0, 20);
    const suffix = names.length > capped.length ? ` (+${names.length - capped.length} more)` : "";
    bagLine = `Bag (${names.length}): ${capped.join(", ")}${suffix}`;
  }

  const equipmentLines = [...equippedLines];
  if (bagLine) equipmentLines.push(bagLine);

  return {
    equipment: equipmentLines.join("\n"),
    attacks: attackLines.join("\n"),
    armor: armorLines.join("\n"),
  };
}

export default function CharacterPanel({ roomId, members, role, userId, page, inventories }: Props) {
  const isDM = role === "dm";
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeCharacterId, setActiveCharacterId] = useState<string>("");
  const [draft, setDraft] = useState<CharacterSheetDraft>(emptyCharacterSheetDraft);
  const lastAutoRef = useRef({ equipment: "", attacks: "", armor: "" });

  const userName = useMemo(() => {
    const member = members.find((m) => m.user_id === userId);
    return (member?.name || "").trim();
  }, [members, userId]);

  const isOwnedByUser = useCallback(
    (char: CharacterRecord | null) => {
      if (!char) return false;
      if (char.owner_user_id && userId) return char.owner_user_id === userId;
      const nameKey = userName.toLowerCase();
      if (!nameKey) return false;
      const rawName = char.name || char.sheet?.name || "";
      const charName = String(rawName).trim().toLowerCase();
      return charName && charName === nameKey;
    },
    [userId, userName]
  );

  const refresh = useCallback(async () => {
    if (!roomId) {
      setCharacters([]);
      setActiveCharacterId("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/characters`);
      if (!res.ok) throw new Error(`Failed to load characters (${res.status}).`);
      const data = await res.json();
      const list = Array.isArray(data?.characters) ? data.characters : [];
      const visible = isDM ? list : list.filter((char) => isOwnedByUser(char));
      setCharacters(visible);
      if (!activeCharacterId && visible.length) setActiveCharacterId(visible[0].character_id);
    } catch (err: any) {
      setError(err?.message || "Failed to load characters.");
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  }, [roomId, activeCharacterId, isDM, isOwnedByUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const membersWithCharacters = useMemo(() => {
    return members
      .filter((m) => m.role === "player")
      .map((member) => ({
        member,
        characters: getCharactersForMember(member, characters),
      }));
  }, [members, characters]);

  const activeCharacter = useMemo(
    () => characters.find((char) => char.character_id === activeCharacterId) || null,
    [characters, activeCharacterId]
  );

  const inventoryOwnerId = useMemo(() => {
    if (activeCharacter?.owner_user_id) return activeCharacter.owner_user_id;
    if (role === "player" && userId) return userId;
    const nameKey = (activeCharacter?.name || activeCharacter?.sheet?.name || "").toLowerCase().trim();
    if (!nameKey) return "";
    const member = members.find((m) => (m.name || "").toLowerCase().trim() === nameKey);
    return member?.user_id || "";
  }, [activeCharacter, role, userId, members]);

  const activeInventory = useMemo(() => {
    if (!inventories || !inventoryOwnerId) return null;
    return inventories[inventoryOwnerId] || null;
  }, [inventories, inventoryOwnerId]);

  const hasCharacters = characters.length > 0;
  const canEdit = isDM || isOwnedByUser(activeCharacter) || !activeCharacterId;

  useEffect(() => {
    if (!activeCharacter) {
      setDraft(emptyCharacterSheetDraft);
      lastAutoRef.current = { equipment: "", attacks: "", armor: "" };
      return;
    }
    const sheet = activeCharacter.sheet || {};
    const stats = sheet.stats || {};
    const mods = sheet.mods || {};
    const hp = sheet.hp || {};
    const hitDice = sheet.hit_dice || {};
    const deathSaves = sheet.death_saves || {};
    const slotTotals = sheet.spell_slots_total || {};
    const slotUsed = sheet.spell_slots_used || {};
    const spellbook = sheet.spellbook || {};
    setDraft({
        name: toText(sheet.name || activeCharacter.name || ""),
        playerName: toText(sheet.player_name || ""),
      class: toText(sheet.class || activeCharacter.enriched?.class?.name || ""),
      subclass: toText(sheet.subclass || ""),
      race: toText(sheet.race || activeCharacter.enriched?.race?.name || ""),
      background: toText(sheet.background),
      alignment: toText(sheet.alignment),
      level: toText(sheet.level),
      experience: toText(sheet.experience),
      inspiration: toText(sheet.inspiration),
      status: toText(sheet.status),
      profBonus: toText(sheet.prof_bonus),
      initiative: toText(sheet.initiative),
      speed: toText(sheet.speed),
      ac: toText(sheet.ac),
      hpMax: toText(hp.max),
      hpCurrent: toText(hp.current),
      hpTemp: toText(hp.temp),
      hitDiceType: toText(hitDice.type),
      hitDiceUsed: toText(hitDice.used),
      deathSaveSuccess: toText(deathSaves.success),
      deathSaveFail: toText(deathSaves.failure),
      exhaustion: toText(sheet.exhaustion),
      conditions: toText(sheet.conditions),
      skillsText: toText(sheet.skills_text),
      attacksText: toText(sheet.attacks_text),
      armorText: toText(sheet.armor_text),
      proficienciesText: toText(sheet.proficiencies_text),
      equipmentText: toText(sheet.equipment_text),
      featuresText: toText(sheet.features_text),
      spellsText: Array.isArray(sheet.spells) ? sheet.spells.join("\n") : "",
      notesText: toText(sheet.notes),
      backstoryText: toText(sheet.backstory_text),
      alliesText: toText(sheet.allies_text),
      organizationsText: toText(sheet.organizations_text),
      treasureText: toText(sheet.treasure_text),
      spellNotesText: toText(sheet.spell_notes),
      spellcastingClass: toText(sheet.spellcasting_class),
      spellAbility: toText(sheet.spell_ability),
      spellSaveDc: toText(sheet.spell_save_dc),
      spellAttackBonus: toText(sheet.spell_attack_bonus),
      spellSlotsTotal: {
        "0": toText(slotTotals["0"] ?? slotTotals[0]),
        "1": toText(slotTotals["1"] ?? slotTotals[1]),
        "2": toText(slotTotals["2"] ?? slotTotals[2]),
        "3": toText(slotTotals["3"] ?? slotTotals[3]),
        "4": toText(slotTotals["4"] ?? slotTotals[4]),
        "5": toText(slotTotals["5"] ?? slotTotals[5]),
        "6": toText(slotTotals["6"] ?? slotTotals[6]),
        "7": toText(slotTotals["7"] ?? slotTotals[7]),
        "8": toText(slotTotals["8"] ?? slotTotals[8]),
        "9": toText(slotTotals["9"] ?? slotTotals[9]),
      },
      spellSlotsUsed: {
        "0": toText(slotUsed["0"] ?? slotUsed[0]),
        "1": toText(slotUsed["1"] ?? slotUsed[1]),
        "2": toText(slotUsed["2"] ?? slotUsed[2]),
        "3": toText(slotUsed["3"] ?? slotUsed[3]),
        "4": toText(slotUsed["4"] ?? slotUsed[4]),
        "5": toText(slotUsed["5"] ?? slotUsed[5]),
        "6": toText(slotUsed["6"] ?? slotUsed[6]),
        "7": toText(slotUsed["7"] ?? slotUsed[7]),
        "8": toText(slotUsed["8"] ?? slotUsed[8]),
        "9": toText(slotUsed["9"] ?? slotUsed[9]),
      },
      spellbook: {
        "0": toText(spellbook["0"] ?? spellbook[0]),
        "1": toText(spellbook["1"] ?? spellbook[1]),
        "2": toText(spellbook["2"] ?? spellbook[2]),
        "3": toText(spellbook["3"] ?? spellbook[3]),
        "4": toText(spellbook["4"] ?? spellbook[4]),
        "5": toText(spellbook["5"] ?? spellbook[5]),
        "6": toText(spellbook["6"] ?? spellbook[6]),
        "7": toText(spellbook["7"] ?? spellbook[7]),
        "8": toText(spellbook["8"] ?? spellbook[8]),
        "9": toText(spellbook["9"] ?? spellbook[9]),
      },
      stats: {
        str: toText(stats.str ?? stats.strength),
        dex: toText(stats.dex ?? stats.dexterity),
        con: toText(stats.con ?? stats.constitution),
        int: toText(stats.int ?? stats.intelligence),
        wis: toText(stats.wis ?? stats.wisdom),
        cha: toText(stats.cha ?? stats.charisma),
      },
      mods: {
        str: toText(mods.str ?? mods.strength),
        dex: toText(mods.dex ?? mods.dexterity),
        con: toText(mods.con ?? mods.constitution),
        int: toText(mods.int ?? mods.intelligence),
        wis: toText(mods.wis ?? mods.wisdom),
        cha: toText(mods.cha ?? mods.charisma),
      },
    });
    lastAutoRef.current = { equipment: "", attacks: "", armor: "" };
  }, [activeCharacter]);

  useEffect(() => {
    if (!activeInventory) return;
    const summary = summarizeInventory(activeInventory);
    const lastAuto = lastAutoRef.current;
    lastAutoRef.current = {
      equipment: summary.equipment,
      attacks: summary.attacks,
      armor: summary.armor,
    };
    setDraft((prev) => ({
      ...prev,
      equipmentText: mergeAutoText(prev.equipmentText, summary.equipment, lastAuto.equipment),
      attacksText: mergeAutoText(prev.attacksText, summary.attacks, lastAuto.attacks),
      armorText: mergeAutoText(prev.armorText, summary.armor, lastAuto.armor),
    }));
  }, [activeInventory]);

  const selectCharacter = (id: string) => {
    setActiveCharacterId(id);
    setSaveStatus("");
  };

  const save = async () => {
    if (!activeCharacterId || !canEdit) return;
    setSaveStatus("");
    setError("");

    const spellbookLines = Object.values(draft.spellbook || {})
      .flatMap((value) => (value || "").split(/\n/))
      .map((s) => s.trim())
      .filter(Boolean);
    const fallbackSpells = (draft.spellsText || "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const spells = spellbookLines.length ? spellbookLines : fallbackSpells;

    const stats = {
      str: toValue(draft.stats.str),
      dex: toValue(draft.stats.dex),
      con: toValue(draft.stats.con),
      int: toValue(draft.stats.int),
      wis: toValue(draft.stats.wis),
      cha: toValue(draft.stats.cha),
    };

    const mods = {
      str: toValue(draft.mods.str),
      dex: toValue(draft.mods.dex),
      con: toValue(draft.mods.con),
      int: toValue(draft.mods.int),
      wis: toValue(draft.mods.wis),
      cha: toValue(draft.mods.cha),
    };

    const sheetPatch: Record<string, any> = {
      name: toNullableText(draft.name),
      player_name: toNullableText(draft.playerName),
      class: toNullableText(draft.class),
      subclass: toNullableText(draft.subclass),
      race: toNullableText(draft.race),
      background: toNullableText(draft.background),
      alignment: toNullableText(draft.alignment),
      level: toValue(draft.level),
      experience: toValue(draft.experience),
      inspiration: toNullableText(draft.inspiration),
      status: toNullableText(draft.status),
      prof_bonus: toValue(draft.profBonus),
      initiative: toValue(draft.initiative),
      speed: toValue(draft.speed),
      ac: toValue(draft.ac),
      spellcasting_class: toNullableText(draft.spellcastingClass),
      spell_ability: toNullableText(draft.spellAbility),
      spell_save_dc: toValue(draft.spellSaveDc),
      spell_attack_bonus: toValue(draft.spellAttackBonus),
      spell_slots_total: draft.spellSlotsTotal,
      spell_slots_used: draft.spellSlotsUsed,
      spellbook: draft.spellbook,
      hp: {
        max: toValue(draft.hpMax),
        current: toValue(draft.hpCurrent),
        temp: toValue(draft.hpTemp),
      },
      hit_dice: {
        type: toNullableText(draft.hitDiceType),
        used: toValue(draft.hitDiceUsed),
      },
      death_saves: {
        success: toValue(draft.deathSaveSuccess),
        failure: toValue(draft.deathSaveFail),
      },
      exhaustion: toValue(draft.exhaustion),
      conditions: toNullableText(draft.conditions),
      stats,
      mods,
      skills_text: toNullableText(draft.skillsText),
      attacks_text: toNullableText(draft.attacksText),
      armor_text: toNullableText(draft.armorText),
      proficiencies_text: toNullableText(draft.proficienciesText),
      equipment_text: toNullableText(draft.equipmentText),
      features_text: toNullableText(draft.featuresText),
      notes: toNullableText(draft.notesText),
      backstory_text: toNullableText(draft.backstoryText),
      allies_text: toNullableText(draft.alliesText),
      organizations_text: toNullableText(draft.organizationsText),
      treasure_text: toNullableText(draft.treasureText),
      spell_notes: toNullableText(draft.spellNotesText),
      spells,
    };

    const payload: Record<string, any> = {
      sheet: sheetPatch,
      merge: true,
    };
    if (draft.name.trim()) payload.name = draft.name.trim();

    try {
      const res = await fetch(`/api/characters/${encodeURIComponent(activeCharacterId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Save failed (${res.status}). ${text}`.trim());
      }
      const data = await res.json();
      setCharacters((prev) => prev.map((char) => (char.character_id === activeCharacterId ? data : char)));
      setSaveStatus("Saved.");
    } catch (err: any) {
      setError(err?.message || "Save failed.");
    }
  };

  const createCharacter = async () => {
    if (!roomId) return;
    setSaveStatus("");
    setError("");
    setCreating(true);
    try {
      const baseName = draft.name.trim() || "New Character";
      const payload: Record<string, any> = {
        name: baseName,
        room_id: roomId,
        sheet: {
          name: baseName,
        },
      };
      if (!isDM && userId) {
        payload.owner_user_id = userId;
      }

      const res = await fetch(`/api/characters/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Create failed (${res.status}). ${text}`.trim());
      }
      const data = await res.json();
      setCharacters((prev) => {
        const existing = prev.find((c) => c.character_id === data.character_id);
        if (existing) return prev.map((c) => (c.character_id === data.character_id ? data : c));
        return [...prev, data];
      });
      setActiveCharacterId(data.character_id);
      setSaveStatus("Created.");
    } catch (err: any) {
      setError(err?.message || "Create failed.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="charPanel">
      <div className="charPanelHeader">
        <div>
          <b>Character Sheets</b>
          {roomId ? <div className="charPanelSub">Room: {roomId}</div> : null}
        </div>
        <div className="charPanelActions">
          <button type="button" onClick={refresh} disabled={loading || !roomId}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button type="button" onClick={createCharacter} disabled={!roomId || creating}>
            {creating ? "Creating..." : "Create"}
          </button>
          <button type="button" onClick={save} disabled={!activeCharacterId || !canEdit}>
            Save
          </button>
        </div>
      </div>

      {error ? <div className="charPanelError">{error}</div> : null}
      {saveStatus ? <div className="charPanelStatus">{saveStatus}</div> : null}

      {!hasCharacters ? (
        <div className="charPanelEmpty">
          {isDM ? "No characters attached to this room yet." : "No character assigned to you yet."}
        </div>
      ) : null}

      {hasCharacters ? (
        <>
          <label className="charPanelLabel">
            Character
            <select value={activeCharacterId} onChange={(e) => selectCharacter(e.target.value)}>
              {characters.map((char) => {
                const name = char.name || char.sheet?.name || char.character_id;
                return (
                  <option key={char.character_id} value={char.character_id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </label>

          {isDM ? (
            <div className="charPanelRoster">
              {membersWithCharacters.map(({ member, characters: owned }) => (
                <button
                  key={member.user_id}
                  type="button"
                  className="charPanelRosterItem"
                  onClick={() => {
                    if (owned[0]) selectCharacter(owned[0].character_id);
                  }}
                >
                  <span className="charPanelRosterName">{member.name}</span>
                  <span className="charPanelRosterMeta">
                    {owned.length ? `${owned.length} character${owned.length === 1 ? "" : "s"}` : "No character"}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {page === "sheet" ? (
        <>
          <CharacterSheetForm draft={draft} setDraft={setDraft} disabled={!canEdit} />
          <div className="charQuickForm">
            <div className="charQuickTitle">Form Fields</div>
            <div className="charQuickGrid">
              <label className="charQuickLabel">
                Character name
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Player name
                <input
                  value={draft.playerName}
                  onChange={(e) => setDraft((d) => ({ ...d, playerName: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Class
                <input
                  value={draft.class}
                  onChange={(e) => setDraft((d) => ({ ...d, class: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Race
                <input
                  value={draft.race}
                  onChange={(e) => setDraft((d) => ({ ...d, race: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Level
                <input
                  value={draft.level}
                  onChange={(e) => setDraft((d) => ({ ...d, level: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Background
                <input
                  value={draft.background}
                  onChange={(e) => setDraft((d) => ({ ...d, background: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Alignment
                <input
                  value={draft.alignment}
                  onChange={(e) => setDraft((d) => ({ ...d, alignment: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Experience
                <input
                  value={draft.experience}
                  onChange={(e) => setDraft((d) => ({ ...d, experience: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                HP max
                <input
                  value={draft.hpMax}
                  onChange={(e) => setDraft((d) => ({ ...d, hpMax: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                HP current
                <input
                  value={draft.hpCurrent}
                  onChange={(e) => setDraft((d) => ({ ...d, hpCurrent: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                HP temp
                <input
                  value={draft.hpTemp}
                  onChange={(e) => setDraft((d) => ({ ...d, hpTemp: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Armor class
                <input
                  value={draft.ac}
                  onChange={(e) => setDraft((d) => ({ ...d, ac: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Speed
                <input
                  value={draft.speed}
                  onChange={(e) => setDraft((d) => ({ ...d, speed: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
              <label className="charQuickLabel">
                Initiative
                <input
                  value={draft.initiative}
                  onChange={(e) => setDraft((d) => ({ ...d, initiative: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>
            </div>
            <label className="charQuickLabel">
              Spells (comma or new line)
              <textarea
                value={draft.spellsText}
                onChange={(e) => setDraft((d) => ({ ...d, spellsText: e.target.value }))}
                disabled={!canEdit}
                rows={2}
              />
            </label>
            <label className="charQuickLabel">
              Notes
              <textarea
                value={draft.notesText}
                onChange={(e) => setDraft((d) => ({ ...d, notesText: e.target.value }))}
                disabled={!canEdit}
                rows={3}
              />
            </label>
          </div>
        </>
      ) : null}
      {page === "sheet2" ? (
        <CharacterSheetPage2 draft={draft} setDraft={setDraft} disabled={!canEdit} />
      ) : null}
      {page === "spells" ? (
        <CharacterSheetSpells draft={draft} setDraft={setDraft} disabled={!canEdit} />
      ) : null}
    </div>
  );
}
