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

const BONUS_OPTIONS = [
  { value: "", label: "None" },
  { value: "1", label: "+1" },
  { value: "2", label: "+2" },
  { value: "3", label: "+3" },
];

const ELEMENTAL_OPTIONS = [
  { value: "", label: "None" },
  { value: "random", label: "Random (either)" },
  { value: "acid", label: "Acid" },
  { value: "cold", label: "Cold" },
  { value: "fire", label: "Fire" },
  { value: "lightning", label: "Lightning" },
  { value: "poison", label: "Poison" },
  { value: "thunder", label: "Thunder" },
];

const MAGIC_OPTIONS = [
  { value: "", label: "None" },
  { value: "random", label: "Random (either)" },
  { value: "holy", label: "Holy" },
  { value: "radiant", label: "Radiant" },
  { value: "necrotic", label: "Necrotic" },
  { value: "force", label: "Force" },
  { value: "psychic", label: "Psychic" },
];

type CategoryKey = "weapons" | "armor" | "jewelry";
type CategoryPropsState = { bonus: string; elemental: string; magical: string };

const EMPTY_CATEGORY_PROPS: CategoryPropsState = { bonus: "", elemental: "", magical: "" };

export default function DMLootPanel({ connected, isDM, members, lootStatus, onGenerateLoot }: Props) {
  if (!isDM) return null;

  const targets = useMemo(() => members.filter((m) => m.role === "player"), [members]);

  const [targetUserId, setTargetUserId] = useState<string>("");
  const [source, setSource] = useState<LootSource>("mob");
  const [count, setCount] = useState<number>(3);

  // Advanced
  const [tierMin, setTierMin] = useState<number>(0);
  const [tierMax, setTierMax] = useState<number>(3);

  // Top-row checks
  const [allowMagic, setAllowMagic] = useState<boolean>(true);
  const [catWeapons, setCatWeapons] = useState(true);
  const [catArmor, setCatArmor] = useState(true);
  const [catJewelry, setCatJewelry] = useState(true);

  const [slotFilter, setSlotFilter] = useState<string>("");
  const [categoryProps, setCategoryProps] = useState<Record<CategoryKey, CategoryPropsState>>({
    weapons: { ...EMPTY_CATEGORY_PROPS },
    armor: { ...EMPTY_CATEGORY_PROPS },
    jewelry: { ...EMPTY_CATEGORY_PROPS },
  });

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

    const min = Math.max(0, Math.min(tierMin, 3));
    const max = Math.max(0, Math.min(tierMax, 3));
    const tierMinFixed = Math.min(min, max);
    const tierMaxFixed = Math.max(min, max);

    const cleanPick = (value: string) => value.trim().toLowerCase();
    const normalizeProps = (cat: CategoryKey, enabled: boolean) => {
      if (!enabled) return undefined;
      const raw = categoryProps[cat] || EMPTY_CATEGORY_PROPS;
      const bonus = Number(raw.bonus);
      const bonusValue = [1, 2, 3].includes(bonus) ? bonus : undefined;
      const elemental = cleanPick(raw.elemental);
      const magical = cleanPick(raw.magical);
      if (!bonusValue && !elemental && !magical) return undefined;
      return {
        bonus: bonusValue,
        elemental: elemental || undefined,
        magical: magical || undefined,
      };
    };

    const categoryPropsPayload: LootConfig["categoryProps"] = {
      weapons: normalizeProps("weapons", catWeapons),
      armor: normalizeProps("armor", catArmor),
      jewelry: normalizeProps("jewelry", catJewelry),
    };

    return {
      source,
      count: Math.max(1, Math.min(count, 25)),
      tierMin: tierMinFixed,
      tierMax: tierMaxFixed,
      allowMagic,
      bagName: containerLabel(source),
      categories: categories.length ? categories : ["weapons", "armor", "jewelry"],
      slots: slotFilter ? [slotFilter] : [],
      tags: [],
      categoryProps: categoryPropsPayload,
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
          <label className="lootField">
            <span className="lootLabel">Tier min</span>
            <select value={tierMin} onChange={(e) => setTierMin(Number(e.target.value))}>
              {Array.from({ length: 4 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="lootField">
            <span className="lootLabel">Tier max</span>
            <select value={tierMax} onChange={(e) => setTierMax(Number(e.target.value))}>
              {Array.from({ length: 4 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

        </div>

        <div className="lootCategoryGrid">
          {(
            [
              { key: "weapons", label: "Weapons", enabled: catWeapons },
              { key: "armor", label: "Armor", enabled: catArmor },
              { key: "jewelry", label: "Jewelry", enabled: catJewelry },
            ] as Array<{ key: CategoryKey; label: string; enabled: boolean }>
          ).map((cat) => {
            const props = categoryProps[cat.key];
            return (
              <div key={cat.key} className={`lootCategoryRow ${cat.enabled ? "" : "disabled"}`}>
                <div className="lootCategoryTitle">{cat.label}</div>
                <label className="lootField">
                  <span className="lootLabel">Bonus</span>
                  <select
                    value={props.bonus}
                    onChange={(e) =>
                      setCategoryProps((prev) => ({
                        ...prev,
                        [cat.key]: { ...prev[cat.key], bonus: e.target.value },
                      }))
                    }
                    disabled={!cat.enabled}
                  >
                    {BONUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lootField">
                  <span className="lootLabel">Elemental</span>
                  <select
                    value={props.elemental}
                    onChange={(e) =>
                      setCategoryProps((prev) => ({
                        ...prev,
                        [cat.key]: { ...prev[cat.key], elemental: e.target.value },
                      }))
                    }
                    disabled={!cat.enabled}
                  >
                    {ELEMENTAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lootField">
                  <span className="lootLabel">Magical</span>
                  <select
                    value={props.magical}
                    onChange={(e) =>
                      setCategoryProps((prev) => ({
                        ...prev,
                        [cat.key]: { ...prev[cat.key], magical: e.target.value },
                      }))
                    }
                    disabled={!cat.enabled}
                  >
                    {MAGIC_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      </details>

      {!connected ? <div className="lootHint">Connect to a room to generate loot.</div> : null}
      {connected && !targetUserId ? <div className="lootHint">No target selected. This will create a community items container.</div> : null}
      {lootStatus ? <div className="lootHint">{lootStatus}</div> : null}
    </section>
  );
}
