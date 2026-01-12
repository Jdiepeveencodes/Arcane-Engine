import React from "react";
import "./DiceDock.css";

export type DieKey = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";

type Props = {
  connected: boolean;

  diceCounts: Record<DieKey, number>;
  setDiceCounts: React.Dispatch<React.SetStateAction<Record<DieKey, number>>>;

  diceExprText: string;
  setDiceExprText: (v: string) => void;

  diceMode: string;
  setDiceMode: (v: string) => void;

  diceMod: string;
  setDiceMod: (v: string) => void;

  onClear: () => void;
  onRollOne: (expr: string, mode: string) => void;
  onRollBatch: (exprs: string[], mode: string) => void;
};

const TOP_ROW: DieKey[] = ["d4", "d6", "d8"];
const MID_ROW: DieKey[] = ["d20"];
const BOT_ROW: DieKey[] = ["d10", "d12", "d100"];

function buildExprsFromCounts(counts: Record<DieKey, number>, modText: string): string[] {
  const parts: string[] = [];

  (Object.keys(counts) as DieKey[]).forEach((k) => {
    const n = counts[k] || 0;
    if (n > 0) parts.push(`${n}${k}`);
  });

  const mod = parseInt(modText || "0", 10);
  const modStr = Number.isFinite(mod) && mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : "";

  if (parts.length === 0) return [];
  return parts.map((p) => `${p}${modStr}`);
}

export default function DiceDock({
  connected,
  diceCounts,
  setDiceCounts,
  diceExprText,
  setDiceExprText,
  diceMode,
  setDiceMode,
  diceMod,
  setDiceMod,
  onClear,
  onRollOne,
  onRollBatch,
}: Props) {
  const changeDie = (die: DieKey, delta: number) => {
    setDiceCounts((prev) => {
      const next = { ...prev };
      next[die] = Math.max(0, (next[die] || 0) + delta);
      return next;
    });
  };

  const renderDie = (die: DieKey) => (
    <div className="dieTile" key={die}>
      <button className="dieBtn" disabled={!connected} onClick={() => changeDie(die, +1)}>
        {die.toUpperCase()}
      </button>

      <div className="dieCount">{diceCounts[die] ?? 0}</div>

      <div className="dieSteps">
        <button disabled={!connected} onClick={() => changeDie(die, -1)}>
          −
        </button>
        <button disabled={!connected} onClick={() => changeDie(die, +1)}>
          +
        </button>
      </div>
    </div>
  );

  const onRoll = () => {
    if (!connected) return;

    const manual = diceExprText.trim();
    const mode = (diceMode || "").trim();

    if (manual) {
      onRollOne(manual, mode);
      return;
    }

    const exprs = buildExprsFromCounts(diceCounts, diceMod);
    if (exprs.length === 0) return;

    onRollBatch(exprs, mode);
  };

  return (
    <div className="diceDock">
      <div className="diceHeader">
        <span>Dice</span>
        <button onClick={onClear} disabled={!connected}>
          Clear
        </button>
      </div>

      <div className="diceGrid">
        <div className="diceRow">{TOP_ROW.map(renderDie)}</div>
        <div className="diceRow center">{MID_ROW.map(renderDie)}</div>
        <div className="diceRow">{BOT_ROW.map(renderDie)}</div>
      </div>

      <div className="diceFooter">
        <input
          className="diceExpr"
          placeholder="Optional: 2d6+1"
          value={diceExprText}
          onChange={(e) => setDiceExprText(e.target.value)}
          disabled={!connected}
        />
        <input
          className="diceMod"
          placeholder="Mod"
          value={diceMod}
          onChange={(e) => setDiceMod(e.target.value)}
          disabled={!connected}
        />
        <select
          className="diceModeSelect"
          value={diceMode}
          onChange={(e) => setDiceMode(e.target.value)}
          disabled={!connected}
        >
          <option value="">normal</option>
          <option value="adv">adv</option>
          <option value="dis">dis</option>
        </select>

        <button className="rollBtn" disabled={!connected} onClick={onRoll}>
          Roll
        </button>
      </div>
    </div>
  );
}
