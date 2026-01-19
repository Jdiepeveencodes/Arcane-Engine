import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import "./CharacterSheetForm.css";
import type { CharacterSheetDraft } from "./CharacterSheetForm";

type Props = {
  draft: CharacterSheetDraft;
  setDraft: Dispatch<SetStateAction<CharacterSheetDraft>>;
  disabled?: boolean;
};

export default function CharacterSheetPage2({ draft, setDraft, disabled }: Props) {
  const updateField =
    (key: "backstoryText" | "alliesText" | "organizationsText" | "treasureText") =>
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setDraft((prev) => ({ ...prev, [key]: value }));
    };

  return (
    <div className="characterSheet characterSheetAlt">
      <div className="characterSheetAltCanvas">
        <div className="sheetAltGrid">
          <label className="sheetAltSection">
            Backstory
            <textarea
              value={draft.backstoryText}
              onChange={updateField("backstoryText")}
              disabled={disabled}
            />
          </label>
          <label className="sheetAltSection">
            Allies & Organizations
            <textarea
              value={draft.alliesText}
              onChange={updateField("alliesText")}
              disabled={disabled}
            />
          </label>
          <label className="sheetAltSection">
            Treasure & Notes
            <textarea
              value={draft.treasureText}
              onChange={updateField("treasureText")}
              disabled={disabled}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
