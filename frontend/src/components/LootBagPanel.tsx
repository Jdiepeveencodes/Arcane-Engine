import React, { useEffect, useMemo, useState } from "react";
import type { LootBag, Member, ItemDef } from "../hooks/useRoomSocket";
import "./InventoryPanel.css";
import { buildWeaponTooltipLines } from "../utils/weaponStats";

type Props = {
  lootBags: Record<string, LootBag>;
  members: Member[];
  isDM?: boolean;
  onDistribute?: (bagId: string, itemId: string, targetUserId: string) => void;
  onDiscard?: (bagId: string, itemId: string) => void;
  onToggleVisibility?: (bagId: string, visible: boolean) => void;
};

const ELEMENTAL_KEYS = new Set([
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "thunder",
  "holy",
  "radiant",
  "necrotic",
  "force",
  "psychic",
]);

const ASSET_VERSION = "2026-01-16d";

function elementalKeys(item: ItemDef) {
  const magic = (item.magicType || "").toString().toLowerCase();
  if (magic && ELEMENTAL_KEYS.has(magic)) return [magic];
  const tags = (item.tags || []).map((t) => String(t).toLowerCase());
  const first = tags.find((t) => ELEMENTAL_KEYS.has(t));
  return first ? [first] : [];
}

function itemIconUrl(item: ItemDef) {
  const id = (item.id || "").trim();
  if (!id) return "";
  const iconId = id.toLowerCase();
  const slot = (item.slot || "bag").toString().trim().toLowerCase();
  const iconSlot = slot === "ring1" || slot === "ring2" ? "ring" : slot;
  const category = (item.category || "").toString().trim().toLowerCase();
  if (category) {
    return `/static/items/${category}/${iconSlot}/${iconId}.png?v=${ASSET_VERSION}`;
  }
  if (iconSlot === "mainhand" || iconSlot === "offhand") {
    return `/static/items/weapons/${iconSlot}/${iconId}.png?v=${ASSET_VERSION}`;
  }
  if (["head", "chest", "legs", "boots", "gloves", "belt", "bracers", "shoulders"].includes(iconSlot)) {
    return `/static/items/armor/${iconSlot}/${iconId}.png?v=${ASSET_VERSION}`;
  }
  if (["ring", "necklace"].includes(iconSlot)) {
    return `/static/items/jewelry/${iconSlot}/${iconId}.png?v=${ASSET_VERSION}`;
  }
  return `/static/items/misc/${iconSlot}/${iconId}.png?v=${ASSET_VERSION}`;
}

function markIconMissing(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.currentTarget;
  target.style.display = "none";
  const root = target.closest(".slotItem, .bagItem");
  if (root) root.classList.add("noIcon");
}

function renderItemIcon(item: ItemDef) {
  const iconUrl = itemIconUrl(item);
  const overlayKeys = elementalKeys(item);
  const overlayUrls = overlayKeys.map((key) => `/static/items/Elemental/${key}.png?v=${ASSET_VERSION}`);
  if (!iconUrl && overlayUrls.length === 0) return null;
  const iconId = (item.id || "").toString().toLowerCase();
  const isSpear = iconId.includes("spear");
  const iconClassName = ["itemIcon", isSpear ? "itemIconSpear" : ""].filter(Boolean).join(" ");

  return (
    <div className="itemIconWrap">
      {overlayUrls.map((url, idx) => (
        <img
          key={url}
          className="itemElemental"
          src={url}
          alt=""
          draggable={false}
          style={overlayUrls.length > 1 ? { opacity: Math.max(0.35, 0.7 - idx * 0.15) } : undefined}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ))}
      {iconUrl ? (
        <img
          className={iconClassName}
          src={iconUrl}
          alt=""
          draggable={false}
          onError={markIconMissing}
        />
      ) : null}
    </div>
  );
}

export default function LootBagPanel({ lootBags, members, isDM, onDistribute, onDiscard, onToggleVisibility }: Props) {
  const [selectedBagId, setSelectedBagId] = useState<string>("");
  const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);
  const canManage = !!isDM;

  const bagIds = useMemo(() => Object.keys(lootBags), [lootBags]);
  const selectedBag = selectedBagId ? lootBags[selectedBagId] : null;
  const players = useMemo(() => members.filter((m) => m.role === "player"), [members]);
  const tierLabel = (tier?: number) => {
    const map: Record<number, string> = {
      0: "Poorly Made",
      1: "Common",
      2: "Well-Crafted",
      3: "Masterwork",
      4: "Enchanted (+1)",
      5: "Enchanted (+2)",
      6: "Enchanted (+3)",
    };
    if (typeof tier !== "number") return "Unknown";
    return map[tier] || `Tier ${tier}`;
  };
  const formatPropLabel = (value: string) =>
    value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("-");

  const magicProps = (item: ItemDef) => {
    const tags = (item.tags || []).map((t) => String(t).toLowerCase());
    const magicType = (item.magicType || "").toString().trim().toLowerCase();
    if (magicType) tags.push(magicType);
    const out = new Set<string>();
    for (const t of tags) {
      if (ELEMENTAL_KEYS.has(t)) out.add(t);
    }
    if (magicType && !out.has(magicType)) out.add(magicType);
    return Array.from(out);
  };

  const traitTags = (item: ItemDef) => {
    const tags = (item.tags || []).map((t) => String(t).toLowerCase());
    const allowed = new Set(["two-handed"]);
    return tags.filter((t) => allowed.has(t));
  };

  useEffect(() => {
    if (!bagIds.length) {
      if (selectedBagId) setSelectedBagId("");
      return;
    }
    if (!selectedBagId || !lootBags[selectedBagId]) {
      setSelectedBagId(bagIds[0]);
    }
  }, [bagIds, lootBags, selectedBagId]);
  const bagSlots = useMemo(() => {
    if (!selectedBag) return [];
    const cols = 3;
    const rows = Math.max(3, Math.ceil(selectedBag.items.length / cols));
    const slots = cols * rows;
    return Array.from({ length: slots }, (_, i) => selectedBag.items[i] || null);
  }, [selectedBag]);

  if (!bagIds.length) {
    return (
      <section className="panel lootPanel">
        <div className="lootTitle">Items</div>
        <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "10px" }}>
          Generate loot to see bags here.
        </div>
      </section>
    );
  }

  function handleDropOnPlayer(e: React.DragEvent, playerId: string) {
    e.preventDefault();
    setDragOverPlayer(null);

    if (!selectedBag || !onDistribute) return;

    try {
      const itemId = e.dataTransfer.getData("text/plain");
      if (itemId) {
        onDistribute(selectedBag.bag_id, itemId, playerId);
      }
    } catch (err) {
      // ignore
    }
  }

  function handleDragStart(e: React.DragEvent, itemId: string) {
    if (!canManage) return;
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <section className="panel lootPanel">
      <div className="lootTitle">Items</div>

      {/* Bag selector */}
      <div className="lootGrid" style={{ marginTop: "10px" }}>
        <label className="lootField">
          <span className="lootLabel">Select</span>
          <select value={selectedBagId} onChange={(e) => setSelectedBagId(e.target.value)}>
            <option value="">Choose…</option>
            {bagIds.map((bid) => (
              <option key={bid} value={bid}>
                {lootBags[bid].name} ({lootBags[bid].items.length} items)
              </option>
            ))}
          </select>
        </label>
        {selectedBag && canManage ? (
          <div className="lootField" style={{ alignSelf: "end" }}>
            <span className="lootLabel">Players</span>
            <button
              onClick={() => onToggleVisibility?.(selectedBag.bag_id, !selectedBag.visible_to_players)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: selectedBag.visible_to_players ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {selectedBag.visible_to_players ? "Visible" : "Hidden"}
            </button>
          </div>
        ) : null}
      </div>

      {selectedBag && (
        <>
          {/* Items in bag */}
          <div className="bagPanel" style={{ marginTop: "12px" }}>
            <div className="panelTitle">Items ({selectedBag.items.length})</div>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              <div className="bagGrid">
                {bagSlots.map((item, idx) => (
                  <div key={idx} className="bagCell">
                    {item ? (
                      <div
                        className="bagItem"
                        draggable={canManage}
                        onDragStart={(e) => handleDragStart(e, item.id)}
                      >
                        <div className="itemTooltip">
                          {(() => {
                            const props = magicProps(item).map(formatPropLabel);
                            const traits = traitTags(item).map(formatPropLabel);
                            const bonusValue = Number(item.magicBonus);
                            const weaponLines = buildWeaponTooltipLines(item);
                            if (weaponLines) return weaponLines;
                            return [
                              item.name,
                              `Slot: ${item.slot || "bag"}`,
                              typeof item.tier === "number" ? `Tier: ${tierLabel(item.tier)}` : null,
                              Number.isFinite(bonusValue) && bonusValue > 0 ? `Bonus: +${bonusValue}` : null,
                              props.length ? `${props.length > 1 ? "Properties" : "Property"}: ${props.join(", ")}` : null,
                              traits.length ? `Traits: ${traits.join(", ")}` : null,
                            ];
                          })()
                            .filter(Boolean)
                            .map((line, idx) => (
                              <div key={idx}>{line}</div>
                            ))}
                        </div>
                        {renderItemIcon(item)}
                        {(() => {
                          const props = magicProps(item).map(formatPropLabel);
                          const traits = traitTags(item).map(formatPropLabel);
                          const bonusValue = Number(item.magicBonus);
                          const bonusLabel = Number.isFinite(bonusValue) && bonusValue > 0 ? `Bonus: +${bonusValue}` : "";
                          return (
                            <>
                              <div className="bagItemName">{item.name}</div>
                              <div className="bagItemMeta muted">{item.slot || "bag"}</div>
                              <div className="bagItemMeta muted">Tier: {tierLabel(item.tier)}</div>
                              {bonusLabel ? <div className="bagItemMeta muted">{bonusLabel}</div> : null}
                              {props.length ? (
                                <div className="bagItemMeta muted">
                                  {props.length > 1 ? "Properties" : "Property"}: {props.join(", ")}
                                </div>
                              ) : null}
                              {traits.length ? <div className="bagItemMeta muted">Traits: {traits.join(", ")}</div> : null}
                            </>
                          );
                        })()}
                        {canManage ? (
                          <button
                            onClick={() => onDiscard?.(selectedBag.bag_id, item.id)}
                            style={{
                              marginTop: "4px",
                              fontSize: "9px",
                              padding: "2px 6px",
                              background: "rgba(255,80,80,0.25)",
                              border: "1px solid rgba(255,100,100,0.4)",
                              borderRadius: "999px",
                              cursor: "pointer",
                              color: "#fff",
                            }}
                          >
                            Discard
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {canManage ? (
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, opacity: 0.9, marginBottom: "8px" }}>
                Drag items to player:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px" }}>
                {players.map((player) => (
                  <div
                    key={player.user_id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverPlayer(player.user_id);
                    }}
                    onDragLeave={() => setDragOverPlayer(null)}
                    onDrop={(e) => handleDropOnPlayer(e, player.user_id)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: "2px dashed rgba(100,200,255,0.3)",
                      background: dragOverPlayer === player.user_id ? "rgba(100,200,255,0.15)" : "rgba(100,200,255,0.05)",
                      fontSize: "12px",
                      fontWeight: 700,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
