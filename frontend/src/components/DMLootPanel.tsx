import React, { useMemo, useState } from "react";
import type { LootConfig, LootSource, Member } from "../hooks/useRoomSocket";

type Props = {
  connected: boolean;
  isDM: boolean;
  members: Member[];
  lootStatus?: string;
  onGenerateLoot: (targetUserId: string, config: LootConfig) => boolean;
};

const SLOT_OPTIONS = [
  { value: "", label: "Any slot" },
  { value: "mainHand", label: "Main Hand" },
  { value: "offHand", label: "Off Hand" },
  { value: "head", label: "Head" },
  { value: "necklace", label: "Necklace" },
  { value: "shoulders", label: "Shoulders" },
  { value: "chest", label: "Chest" },
  { value: "bracers", label: "Bracers" },
  { value: "gloves", label: "Gloves" },
  { value: "belt", label: "Belt" },
  { value: "legs", label: "Legs" },
  { value: "boots", label: "Boots" },
  { value: "ring", label: "Ring" },
];

export default function DMLootPanel({ connected, isDM, members, lootStatus, onGenerateLoot }: Props) {
  if (!isDM) return null;

  const targets = useMemo(() => members.filter((m) => m.role === "player"), [members]);

  const [targetUserId, setTargetUserId] = useState<string>("");
  const [source, setSource] = useState<LootSource>("mob");
  const [count, setCount] = useState<number>(3);

  // Advanced
  const [tierMin, setTierMin] = useState<number>(0);
  const [tierMax, setTierMax] = useState<number>(6);
  const [tagsText, setTagsText] = useState<string>("");
  const [addElemental, setAddElemental] = useState<boolean>(false);

  // Top-row checks
  const [allowMagic, setAllowMagic] = useState<boolean>(true);
  const [catWeapons, setCatWeapons] = useState(true);
  const [catArmor, setCatArmor] = useState(true);
  const [catJewelry, setCatJewelry] = useState(true);

  const [slotFilter, setSlotFilter] = useState<string>("");

  const canGenerate = connected;

  function containerLabel(src: LootSource) {
    return {
      mob: "Corpse",
      boss: "Boss Corpse",
      shop: "Inventory",
      chest: "Chest",
      custom: "Items",
    }[src] || "Items";
  }

  function buildConfig(): LootConfig {
    const categories: Array<"weapons" | "armor" | "jewelry"> = [];
    if (catWeapons) categories.push("weapons");
    if (catArmor) categories.push("armor");
    if (catJewelry) categories.push("jewelry");

    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const min = Math.max(0, Math.min(tierMin, 6));
    const max = Math.max(0, Math.min(tierMax, 6));
    const tierMinFixed = Math.min(min, max);
    const tierMaxFixed = Math.max(min, max);

    return {
      source,
      count: Math.max(1, Math.min(count, 25)),
      tierMin: tierMinFixed,
      tierMax: tierMaxFixed,
      allowMagic,
      addElemental,
      bagName: containerLabel(source),
      categories: categories.length ? categories : ["weapons", "armor", "jewelry"],
      slots: slotFilter ? [slotFilter] : [],
      tags,
    };
  }

  function handleGenerate() {
    if (!canGenerate) return;
    onGenerateLoot(targetUserId.trim(), buildConfig());
  }

  return (
    <section className="panel lootPanel" style={{ marginBottom: 12 }}>
      {/* Header row */}
      <div className="lootHeader">
        <div className="lootTitle">Loot Generator</div>
        <button className="lootGenerateBtn" disabled={!canGenerate} onClick={handleGenerate}>
          Generate
        </button>
      </div>

      {/* Compact controls */}
      <div className="lootGrid">
        <label className="lootField">
          <span className="lootLabel">Target (optional)</span>
          <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
            <option value="">Community items</option>
            {targets.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="lootField">
          <span className="lootLabel">Source</span>
          <select value={source} onChange={(e) => setSource(e.target.value as LootSource)}>
            <option value="mob">Mob</option>
            <option value="chest">Chest</option>
            <option value="boss">Boss</option>
            <option value="shop">Shop</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label className="lootField">
          <span className="lootLabel">Count</span>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="lootField">
          <span className="lootLabel">Slot</span>
          <select value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
            {SLOT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ✅ Single-row checks */}
      <div className="lootChecksRow">
        <label className="lootCheck">
          <input type="checkbox" checked={allowMagic} onChange={(e) => setAllowMagic(e.target.checked)} />
          <span>Allow magic</span>
        </label>

        <div className="lootChecksDivider" />

        <label className="lootCheck">
          <input type="checkbox" checked={catWeapons} onChange={(e) => setCatWeapons(e.target.checked)} />
          <span>Weapons</span>
        </label>

        <label className="lootCheck">
          <input type="checkbox" checked={catArmor} onChange={(e) => setCatArmor(e.target.checked)} />
          <span>Armor</span>
        </label>

        <label className="lootCheck">
          <input type="checkbox" checked={catJewelry} onChange={(e) => setCatJewelry(e.target.checked)} />
          <span>Jewelry</span>
        </label>
      </div>

      {/* ✅ Advanced expander */}
      <details className="lootAdvanced">
        <summary>Advanced</summary>

        <div className="lootAdvancedGrid">
          <label className="lootCheck" style={{ gridColumn: "1 / -1" }}>
            <input type="checkbox" checked={addElemental} onChange={(e) => setAddElemental(e.target.checked)} />
            <span>Add elemental property</span>
          </label>

          <label className="lootField">
            <span className="lootLabel">Tier min</span>
            <select value={tierMin} onChange={(e) => setTierMin(Number(e.target.value))}>
              {Array.from({ length: 7 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="lootField">
            <span className="lootLabel">Tier max</span>
            <select value={tierMax} onChange={(e) => setTierMax(Number(e.target.value))}>
              {Array.from({ length: 7 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="lootField lootTags">
            <span className="lootLabel">Tags (comma)</span>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="undead, fire, holy…"
            />
          </label>
        </div>
      </details>

      {!connected ? <div className="lootHint">Connect to a room to generate loot.</div> : null}
      {connected && !targetUserId ? <div className="lootHint">No target selected. This will create a community items container.</div> : null}
      {lootStatus ? <div className="lootHint">{lootStatus}</div> : null}
    </section>
  );
}
