import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import "./CharacterSheetForm.css";
import type { CharacterSheetDraft } from "./CharacterSheetForm";

type Props = {
  draft: CharacterSheetDraft;
  setDraft: Dispatch<SetStateAction<CharacterSheetDraft>>;
  disabled?: boolean;
};

  const levels = [
    { key: "0", label: "Cantrips" },
    { key: "1", label: "Level 1" },
    { key: "2", label: "Level 2" },
    { key: "3", label: "Level 3" },
    { key: "4", label: "Level 4" },
    { key: "5", label: "Level 5" },
    { key: "6", label: "Level 6" },
    { key: "7", label: "Level 7" },
    { key: "8", label: "Level 8" },
    { key: "9", label: "Level 9" },
  ];

export default function CharacterSheetSpells({ draft, setDraft, disabled }: Props) {
  const updateField =
    (key: "spellcastingClass" | "spellAbility" | "spellSaveDc" | "spellAttackBonus" | "spellNotesText") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setDraft((prev) => ({ ...prev, [key]: value }));
    };

  const updateSlot =
    (bucket: "spellSlotsTotal" | "spellSlotsUsed", level: string) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDraft((prev) => ({
        ...prev,
        [bucket]: { ...prev[bucket], [level]: value },
      }));
    };

  const updateSpellList =
    (level: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setDraft((prev) => ({
        ...prev,
        spellbook: { ...prev.spellbook, [level]: value },
      }));
    };

  return (
    <div className="spellSheet">
      <div className="spellSheetCanvas">
        <div className="spellSheetHeader">
          <label className="spellSheetLabel">
            Spellcasting Class
            <input
              value={draft.spellcastingClass}
              onChange={updateField("spellcastingClass")}
              disabled={disabled}
            />
          </label>
          <label className="spellSheetLabel">
            Ability
            <input value={draft.spellAbility} onChange={updateField("spellAbility")} disabled={disabled} />
          </label>
          <label className="spellSheetLabel">
            Save DC
            <input value={draft.spellSaveDc} onChange={updateField("spellSaveDc")} disabled={disabled} />
          </label>
          <label className="spellSheetLabel">
            Bonus
            <input value={draft.spellAttackBonus} onChange={updateField("spellAttackBonus")} disabled={disabled} />
          </label>
        </div>

        <div className="spellSheetName">
          <label className="spellSheetLabel">
            Character Name
            <input value={draft.name} disabled readOnly />
          </label>
        </div>

        <div className="spellSheetGrid">
          {levels.map((level) => (
            <div key={level.key} className="spellLevelCard">
              <div className="spellLevelHeader">
                <div className="spellLevelBadge">{level.key}</div>
                <div className="spellLevelTitle">{level.label}</div>
              </div>
              <div className={`spellSlots ${level.key === "0" ? "spellSlotsDisabled" : ""}`}>
                <label>
                  Total Slots
                  <input
                    value={draft.spellSlotsTotal[level.key] || ""}
                    onChange={updateSlot("spellSlotsTotal", level.key)}
                    disabled={disabled || level.key === "0"}
                  />
                </label>
                <label>
                  Expended Slots
                  <input
                    value={draft.spellSlotsUsed[level.key] || ""}
                    onChange={updateSlot("spellSlotsUsed", level.key)}
                    disabled={disabled || level.key === "0"}
                  />
                </label>
              </div>
              <textarea
                className="spellLevelList"
                value={draft.spellbook[level.key] || ""}
                onChange={updateSpellList(level.key)}
                disabled={disabled}
                placeholder={level.key === "0" ? "List cantrips" : `List level ${level.key} spells`}
              />
            </div>
          ))}
        </div>

        <div className="spellSheetFooter">
          <label className="spellSheetLabel">
            Spell Notes
            <textarea
              value={draft.spellNotesText}
              onChange={updateField("spellNotesText")}
              disabled={disabled}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
