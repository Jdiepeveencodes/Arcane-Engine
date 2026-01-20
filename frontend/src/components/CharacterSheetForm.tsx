import type { ChangeEvent, Dispatch, PointerEvent as ReactPointerEvent, ReactNode, SetStateAction } from "react";
import { useMemo, useRef, useState } from "react";
import "./CharacterSheetForm.css";

export type CharacterSheetDraft = {
  name: string;
  playerName: string;
  class: string;
  subclass: string;
  race: string;
  background: string;
  alignment: string;
  level: string;
  experience: string;
  inspiration: string;
  status: string;
  profBonus: string;
  initiative: string;
  speed: string;
  ac: string;
  hpMax: string;
  hpCurrent: string;
  hpTemp: string;
  hitDiceType: string;
  hitDiceUsed: string;
  deathSaveSuccess: string;
  deathSaveFail: string;
  exhaustion: string;
  conditions: string;
  skillsText: string;
  attacksText: string;
  armorText: string;
  proficienciesText: string;
  equipmentText: string;
  featuresText: string;
  spellsText: string;
  notesText: string;
  backstoryText: string;
  alliesText: string;
  organizationsText: string;
  treasureText: string;
  spellNotesText: string;
  spellcastingClass: string;
  spellAbility: string;
  spellSaveDc: string;
  spellAttackBonus: string;
  spellSlotsTotal: Record<string, string>;
  spellSlotsUsed: Record<string, string>;
  spellbook: Record<string, string>;
  stats: {
    str: string;
    dex: string;
    con: string;
    int: string;
    wis: string;
    cha: string;
  };
  mods: {
    str: string;
    dex: string;
    con: string;
    int: string;
    wis: string;
    cha: string;
  };
};

export const emptyCharacterSheetDraft: CharacterSheetDraft = {
  name: "",
  playerName: "",
  class: "",
  subclass: "",
  race: "",
  background: "",
  alignment: "",
  level: "",
  experience: "",
  inspiration: "",
  status: "",
  profBonus: "",
  initiative: "",
  speed: "",
  ac: "",
  hpMax: "",
  hpCurrent: "",
  hpTemp: "",
  hitDiceType: "",
  hitDiceUsed: "",
  deathSaveSuccess: "",
  deathSaveFail: "",
  exhaustion: "",
  conditions: "",
  skillsText: "",
  attacksText: "",
  armorText: "",
  proficienciesText: "",
  equipmentText: "",
  featuresText: "",
  spellsText: "",
  notesText: "",
  backstoryText: "",
  alliesText: "",
  organizationsText: "",
  treasureText: "",
  spellNotesText: "",
  spellcastingClass: "",
  spellAbility: "",
  spellSaveDc: "",
  spellAttackBonus: "",
  spellSlotsTotal: {
    "0": "",
    "1": "",
    "2": "",
    "3": "",
    "4": "",
    "5": "",
    "6": "",
    "7": "",
    "8": "",
    "9": "",
  },
  spellSlotsUsed: {
    "0": "",
    "1": "",
    "2": "",
    "3": "",
    "4": "",
    "5": "",
    "6": "",
    "7": "",
    "8": "",
    "9": "",
  },
  spellbook: {
    "0": "",
    "1": "",
    "2": "",
    "3": "",
    "4": "",
    "5": "",
    "6": "",
    "7": "",
    "8": "",
    "9": "",
  },
  stats: { str: "", dex: "", con: "", int: "", wis: "", cha: "" },
  mods: { str: "", dex: "", con: "", int: "", wis: "", cha: "" },
};

type Props = {
  draft: CharacterSheetDraft;
  setDraft: Dispatch<SetStateAction<CharacterSheetDraft>>;
  disabled?: boolean;
};

type SheetFieldKey =
  | "class"
  | "subclass"
  | "xp"
  | "race"
  | "background"
  | "alignment"
  | "characterName"
  | "playerName"
  | "statStr"
  | "statDex"
  | "statCon"
  | "statInt"
  | "statWis"
  | "statCha"
  | "profBonus"
  | "status"
  | "initiative"
  | "speed"
  | "inspiration"
  | "skills"
  | "attacks"
  | "armor"
  | "ac"
  | "hpMax"
  | "hpCurrent"
  | "hpTemp"
  | "hitDiceType"
  | "hitDiceUsed"
  | "deathSuccess"
  | "deathFail"
  | "exhaustion"
  | "conditions"
  | "proficiencies"
  | "equipment"
  | "features"
  | "notes";

type SlotLayout = { top: number; left: number; width: number; height: number };
type SheetLayout = Record<SheetFieldKey, SlotLayout>;

const DEFAULT_SHEET_LAYOUT: SheetLayout = {
  class: { left: 6.0101064046223955, top: 4.658639230319865, width: 27.116160074869793, height: 2 },
  subclass: { left: 5.883831448025173, top: 7.573232910462729, width: 27.11616007486979, height: 2 },
  xp: { left: 5.883839925130208, top: 10.097576453994629, width: 27.116168551974827, height: 2 },
  race: { left: 67.88385687934027, top: 4.853775762024549, width: 25.22222222222222, height: 2 },
  background: { left: 67.63132392035591, top: 7.57323291046273, width: 25.727271185980904, height: 2 },
  alignment: { left: 67.37879096137152, top: 10.195133256447768, width: 25.979787190755207, height: 2 },
  characterName: { left: 35, top: 3, width: 30, height: 4 },
  playerName: { left: 35, top: 8, width: 30, height: 3 },
  statStr: { left: 8.282835218641493, top: 16.95133911499152, width: 8.949493408203125, height: 11.170557955736605 },
  statDex: { left: 23.282835218641495, top: 19.097811486430807, width: 8.823235405815971, height: 11.170557955736607 },
  statCon: { left: 38.030310736762154, top: 20.951587248455354, width: 8.570710923936632, height: 11.268127859217405 },
  statInt: { left: 53.03030225965712, top: 21.244283857870094, width: 8.318186442057293, height: 11.268127859217406 },
  statWis: { left: 67.52526177300348, top: 19.292944742878575, width: 8.19191148546007, height: 11.365691212184375 },
  statCha: { left: 82.14647081163194, top: 17.146472371439287, width: 7.939395480685764, height: 11.268134409731232 },
  profBonus: { left: 28.611119588216145, top: 31.414600230656696, width: 6.212124294704861, height: 3.390266512895538 },
  status: { left: 37.21211581759983, top: 31.51217013413749, width: 6.464640299479167, height: 3.195133256447769 },
  initiative: { left: 46.57069396972656, top: 31.512163583623664, width: 6.338382297092014, height: 3.292709710442397 },
  speed: { left: 56.05554707845052, top: 31.51217013413749, width: 6.464640299479167, height: 3.487836416376337 },
  inspiration: { left: 65.28788418240018, top: 31.414600230656696, width: 6.464640299479167, height: 3.390266512895538 },
  skills: { left: 6.767679850260417, top: 29.658394372112944, width: 18.707066853841148, height: 31.43892739790402 },
  attacks: { left: 37.08585781521268, top: 37.585399769343304, width: 34.525244818793404, height: 12.707296840071432 },
  armor: { left: 37.212124294704864, top: 52.48783641637634, width: 35.15656873914931, height: 8 },
  ac: { left: 29.74747551812066, top: 56.26836944216741, width: 6.464648776584202, height: 4.268369442167413 },
  hpMax: { left: 75.35859510633681, top: 38.46349614810135, width: 5.979804144965278, height: 3.292703159928568 },
  hpCurrent: { left: 80.82323540581596, top: 38.26836944216741, width: 5.727288140190972, height: 3.487836416376337 },
  hpTemp: { left: 87.01009792751736, top: 38.26812130870358, width: 5.853529188368055, height: 3.390266512895538 },
  hitDiceType: { left: 73.84341430664062, top: 44.804866743552225, width: 11.91415066189236, height: 2.804866743552231 },
  hitDiceUsed: { left: 74.0050489637587, top: 47.14647237143928, width: 11.78787570529514, height: 3.390266512895538 },
  deathSuccess: { left: 77, top: 50, width: 8, height: 3 },
  deathFail: { left: 86, top: 50, width: 8, height: 3 },
  exhaustion: { left: 66.01512993706598, top: 65.65911912096297, width: 6.267679850260416, height: 21.342591611228574 },
  conditions: { left: 75.48483615451389, top: 57.46326111566517, width: 16.873741997612846, height: 3.7559577250799134 },
  proficiencies: { left: 6.767671373155382, top: 66.2194604236951, width: 18.55049811469184, height: 28.048902467958488 },
  equipment: { left: 28.570702446831596, top: 64.85352762856071, width: 36.484853108723954, height: 16.536007584970974 },
  features: { left: 74.24241807725694, top: 66.12189707072812, width: 18.989885118272568, height: 28.146472371439287 },
  notes: { left: 28.444452921549484, top: 81.5623001683875, width: 36.611111111111114, height: 6 },
};

const FIELD_CLASSES: Record<SheetFieldKey, string> = {
  class: "field-class",
  subclass: "field-subclass",
  xp: "field-xp",
  race: "field-race",
  background: "field-background",
  alignment: "field-alignment",
  characterName: "field-character-name",
  playerName: "field-player-name",
  statStr: "field-stat",
  statDex: "field-stat",
  statCon: "field-stat",
  statInt: "field-stat",
  statWis: "field-stat",
  statCha: "field-stat",
  profBonus: "field-prof-bonus",
  status: "field-status",
  initiative: "field-initiative",
  speed: "field-speed",
  inspiration: "field-inspiration",
  skills: "field-skills",
  attacks: "field-attacks",
  armor: "field-armor",
  ac: "field-ac",
  hpMax: "field-hp-max",
  hpCurrent: "field-hp-current",
  hpTemp: "field-hp-temp",
  hitDiceType: "field-hit-dice-type",
  hitDiceUsed: "field-hit-dice-used",
  deathSuccess: "field-death-success",
  deathFail: "field-death-fail",
  exhaustion: "field-exhaustion",
  conditions: "field-conditions",
  proficiencies: "field-proficiencies",
  equipment: "field-equipment",
  features: "field-features",
  notes: "field-notes",
};

const statLayoutKeys: Array<{
  layout: SheetFieldKey;
  stat: keyof CharacterSheetDraft["stats"];
  label: string;
}> = [
  { layout: "statStr", stat: "str", label: "STR" },
  { layout: "statDex", stat: "dex", label: "DEX" },
  { layout: "statCon", stat: "con", label: "CON" },
  { layout: "statInt", stat: "int", label: "INT" },
  { layout: "statWis", stat: "wis", label: "WIS" },
  { layout: "statCha", stat: "cha", label: "CHA" },
];

export default function CharacterSheetForm({ draft, setDraft, disabled }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<SheetLayout>(() => ({ ...DEFAULT_SHEET_LAYOUT }));
  const [layoutDraft, setLayoutDraft] = useState("");
  const [layoutError, setLayoutError] = useState("");
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    key: SheetFieldKey;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    startLayout: SlotLayout;
  } | null>(null);
  const isDisabled = Boolean(disabled || editMode);
  const layoutJson = useMemo(() => JSON.stringify(layout, null, 2), [layout]);

  const updateField = (key: keyof CharacterSheetDraft) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateStat = (key: keyof CharacterSheetDraft["stats"]) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDraft((prev) => ({ ...prev, stats: { ...prev.stats, [key]: value } }));
  };

  const updateMod = (key: keyof CharacterSheetDraft["mods"]) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDraft((prev) => ({ ...prev, mods: { ...prev.mods, [key]: value } }));
  };

  function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
  }

  function beginLayoutDrag(e: ReactPointerEvent, key: SheetFieldKey, mode: "move" | "resize") {
    if (!editMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();

    const startLayout = layout[key] || DEFAULT_SHEET_LAYOUT[key];
    dragState.current = {
      key,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startLayout,
    };

    const onMove = (ev: PointerEvent) => {
      const state = dragState.current;
      if (!state) return;
      const dxPct = ((ev.clientX - state.startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - state.startY) / rect.height) * 100;
      const minSize = 2;

      let next = { ...state.startLayout };
      if (state.mode === "move") {
        next.left = clamp(next.left + dxPct, 0, 100 - next.width);
        next.top = clamp(next.top + dyPct, 0, 100 - next.height);
      } else {
        next.width = clamp(next.width + dxPct, minSize, 100 - next.left);
        next.height = clamp(next.height + dyPct, minSize, 100 - next.top);
      }

      setLayout((prev) => ({ ...prev, [state.key]: next }));
    };

    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function fieldStyle(key: SheetFieldKey) {
    const value = layout[key] || DEFAULT_SHEET_LAYOUT[key];
    return {
      left: `${value.left}%`,
      top: `${value.top}%`,
      width: `${value.width}%`,
      height: `${value.height}%`,
    };
  }

  function normalizeLayout(raw: any, fallback: SheetLayout) {
    if (!raw || typeof raw !== "object") return null;
    const next: SheetLayout = { ...fallback };
    let valid = false;
    (Object.keys(fallback) as SheetFieldKey[]).forEach((key) => {
      const entry = raw[key];
      if (!entry || typeof entry !== "object") return;
      const top = Number(entry.top);
      const left = Number(entry.left);
      const width = Number(entry.width);
      const height = Number(entry.height);
      if (![top, left, width, height].every((n) => Number.isFinite(n))) return;
      next[key] = { top, left, width, height };
      valid = true;
    });
    return valid ? next : null;
  }

  async function copyLayoutJson(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  function applyLayoutDraft() {
    const trimmed = layoutDraft.trim();
    if (!trimmed) {
      setLayoutError("Paste layout JSON first.");
      return;
    }
    try {
      const raw = JSON.parse(trimmed);
      const next = normalizeLayout(raw, layout);
      if (!next) {
        setLayoutError("Layout JSON doesn't match expected fields.");
        return;
      }
      setLayout(next);
      setLayoutDraft("");
      setLayoutError("");
    } catch {
      setLayoutError("Layout JSON is invalid.");
    }
  }

  function resetLayout() {
    setLayout({ ...DEFAULT_SHEET_LAYOUT });
    setLayoutError("");
    setLayoutDraft("");
  }

  const renderField = (key: SheetFieldKey, children: ReactNode) => (
    <div
      className={`sheetField ${FIELD_CLASSES[key]} ${editMode ? "sheetFieldEditing" : ""}`}
      style={fieldStyle(key)}
      onPointerDown={(e) => beginLayoutDrag(e, key, "move")}
    >
      {children}
      {editMode ? (
        <div
          className="sheetResizeHandle"
          title="Resize"
          onPointerDown={(e) => beginLayoutDrag(e, key, "resize")}
        />
      ) : null}
    </div>
  );

  return (
    <div className="characterSheet">
      <div className="sheetLayoutBar">
        <button type="button" onClick={() => setEditMode((prev) => !prev)}>
          {editMode ? "Exit Layout" : "Edit Layout"}
        </button>
        {editMode ? (
          <>
            <button type="button" onClick={() => copyLayoutJson(layoutJson)}>
              Copy Layout JSON
            </button>
            <button type="button" onClick={resetLayout}>
              Reset Layout
            </button>
          </>
        ) : null}
      </div>

      {editMode ? (
        <div className="sheetLayoutPanel">
          <div className="sheetLayoutGroup">
            <div className="sheetLayoutLabel">Current layout</div>
            <textarea className="sheetLayoutJson" value={layoutJson} readOnly />
          </div>
          <div className="sheetLayoutGroup">
            <div className="sheetLayoutLabel">Paste layout JSON</div>
            <textarea
              className="sheetLayoutJson"
              value={layoutDraft}
              onChange={(e) => setLayoutDraft(e.target.value)}
              placeholder='{"class":{"top":3,"left":5,"width":28,"height":3}}'
            />
            <button type="button" onClick={applyLayoutDraft}>
              Apply Layout JSON
            </button>
            {layoutError ? <div className="sheetLayoutError">{layoutError}</div> : null}
          </div>
        </div>
      ) : null}

      <div ref={canvasRef} className="characterSheetCanvas">
        {renderField(
          "class",
          <div className="sheetSplit">
            <input value={draft.class} onChange={updateField("class")} disabled={isDisabled} />
            <input value={draft.level} onChange={updateField("level")} disabled={isDisabled} placeholder="Lv" />
          </div>
        )}
        {renderField("subclass", <input value={draft.subclass} onChange={updateField("subclass")} disabled={isDisabled} />)}
        {renderField("xp", <input value={draft.experience} onChange={updateField("experience")} disabled={isDisabled} />)}

        {renderField("race", <input value={draft.race} onChange={updateField("race")} disabled={isDisabled} />)}
        {renderField(
          "background",
          <input value={draft.background} onChange={updateField("background")} disabled={isDisabled} />
        )}
        {renderField(
          "alignment",
          <input value={draft.alignment} onChange={updateField("alignment")} disabled={isDisabled} />
        )}

        {renderField("characterName", <input value={draft.name} onChange={updateField("name")} disabled={isDisabled} />)}
        {renderField(
          "playerName",
          <input value={draft.playerName} onChange={updateField("playerName")} disabled={isDisabled} />
        )}

        {statLayoutKeys.map((stat) =>
          renderField(
            stat.layout,
            <div className="statCell">
              <input
                value={draft.stats[stat.stat]}
                onChange={updateStat(stat.stat)}
                placeholder={stat.label}
                disabled={isDisabled}
              />
              <input
                value={draft.mods[stat.stat]}
                onChange={updateMod(stat.stat)}
                placeholder="mod"
                disabled={isDisabled}
              />
            </div>
          )
        )}

        {renderField(
          "profBonus",
          <input value={draft.profBonus} onChange={updateField("profBonus")} disabled={isDisabled} />
        )}
        {renderField("status", <input value={draft.status} onChange={updateField("status")} disabled={isDisabled} />)}
        {renderField(
          "initiative",
          <input value={draft.initiative} onChange={updateField("initiative")} disabled={isDisabled} />
        )}
        {renderField("speed", <input value={draft.speed} onChange={updateField("speed")} disabled={isDisabled} />)}
        {renderField(
          "inspiration",
          <input value={draft.inspiration} onChange={updateField("inspiration")} disabled={isDisabled} />
        )}

        {renderField(
          "skills",
          <textarea
            value={draft.skillsText}
            onChange={updateField("skillsText")}
            placeholder="Skills..."
            disabled={isDisabled}
          />
        )}

        {renderField(
          "attacks",
          <textarea
            value={draft.attacksText}
            onChange={updateField("attacksText")}
            placeholder="Attacks & spellcasting"
            disabled={isDisabled}
          />
        )}

        {renderField(
          "armor",
          <textarea
            value={draft.armorText}
            onChange={updateField("armorText")}
            placeholder="Armor"
            disabled={isDisabled}
          />
        )}

        {renderField("ac", <input value={draft.ac} onChange={updateField("ac")} disabled={isDisabled} />)}

        {renderField("hpMax", <input value={draft.hpMax} onChange={updateField("hpMax")} disabled={isDisabled} />)}
        {renderField(
          "hpCurrent",
          <input value={draft.hpCurrent} onChange={updateField("hpCurrent")} disabled={isDisabled} />
        )}
        {renderField("hpTemp", <input value={draft.hpTemp} onChange={updateField("hpTemp")} disabled={isDisabled} />)}

        {renderField(
          "hitDiceType",
          <input value={draft.hitDiceType} onChange={updateField("hitDiceType")} disabled={isDisabled} />
        )}
        {renderField(
          "hitDiceUsed",
          <input value={draft.hitDiceUsed} onChange={updateField("hitDiceUsed")} disabled={isDisabled} />
        )}

        {renderField(
          "deathSuccess",
          <input value={draft.deathSaveSuccess} onChange={updateField("deathSaveSuccess")} disabled={isDisabled} />
        )}
        {renderField(
          "deathFail",
          <input value={draft.deathSaveFail} onChange={updateField("deathSaveFail")} disabled={isDisabled} />
        )}

        {renderField(
          "exhaustion",
          <input value={draft.exhaustion} onChange={updateField("exhaustion")} disabled={isDisabled} />
        )}

        {renderField(
          "conditions",
          <textarea
            value={draft.conditions}
            onChange={updateField("conditions")}
            placeholder="Conditions"
            disabled={isDisabled}
          />
        )}

        {renderField(
          "proficiencies",
          <textarea
            value={draft.proficienciesText}
            onChange={updateField("proficienciesText")}
            placeholder="Proficiencies, languages, feats"
            disabled={isDisabled}
          />
        )}

        {renderField(
          "equipment",
          <textarea
            value={draft.equipmentText}
            onChange={updateField("equipmentText")}
            placeholder="Treasure & equipment"
            disabled={isDisabled}
          />
        )}

        {renderField(
          "features",
          <>
            <textarea
              value={draft.featuresText}
              onChange={updateField("featuresText")}
              placeholder="Features & traits"
              disabled={isDisabled}
            />
            <textarea
              value={draft.spellsText}
              onChange={updateField("spellsText")}
              placeholder="Spells"
              disabled={isDisabled}
              className="sheetTextareaSmall"
            />
          </>
        )}

        {renderField(
          "notes",
          <textarea value={draft.notesText} onChange={updateField("notesText")} placeholder="Notes" disabled={isDisabled} />
        )}
      </div>
    </div>
  );
}
