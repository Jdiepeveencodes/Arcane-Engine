import React, { useMemo, useState } from "react";
import "./InventoryPanel.css";
import type { EquipSlot, Item, PlayerInventory } from "../hooks/useRoomSocket";

type Props = {
  role: "dm" | "player";
  youUserId: string;
  inventories: Record<string, PlayerInventory>;
  equipItem: (toSlot: EquipSlot, item: Partial<Item>, targetUserId?: string) => boolean;
  unequipSlot: (slot: EquipSlot, targetUserId?: string) => boolean;
  addToBag?: (item: Partial<Item>, targetUserId?: string) => boolean; // temporary for testing
};

type DragPayload =
  | { from: "bag"; item: Item }
  | { from: "equip"; slot: EquipSlot; item: Item };

const SLOT_ORDER: Array<{ slot: EquipSlot; label: string }> = [
  { slot: "head", label: "Head" },
  { slot: "gorget", label: "Gorget" },
  { slot: "necklace", label: "Necklace" },
  { slot: "shoulders", label: "Shoulders" },
  { slot: "chest", label: "Chest" },
  { slot: "bracers", label: "Bracers" },
  { slot: "gloves", label: "Gloves" },
  { slot: "belt", label: "Belt" },
  { slot: "legs", label: "Legs" },
  { slot: "boots", label: "Boots" },
  { slot: "ring1", label: "Ring 1" },
  { slot: "ring2", label: "Ring 2" },
  { slot: "mainHand", label: "Main Hand" },
  { slot: "offHand", label: "Off Hand" },
];

const SLOT_ACCEPTS: Record<EquipSlot, (item: Item) => boolean> = {
  head: (i) => i.slot === "head",
  gorget: (i) => i.slot === "gorget",
  necklace: (i) => i.slot === "necklace",
  shoulders: (i) => i.slot === "shoulders",
  chest: (i) => i.slot === "chest",
  bracers: (i) => i.slot === "bracers",
  gloves: (i) => i.slot === "gloves",
  belt: (i) => i.slot === "belt",
  legs: (i) => i.slot === "legs",
  boots: (i) => i.slot === "boots",
  ring1: (i) => i.slot === "ring",
  ring2: (i) => i.slot === "ring",
  mainHand: (i) => i.slot === "mainHand",
  offHand: (i) => i.slot === "offHand",
};

function inferDefaultEquipSlot(item: Item, equipment: Partial<Record<EquipSlot, Item>>): EquipSlot | null {
  if (item.slot === "ring") {
    if (!equipment.ring1) return "ring1";
    if (!equipment.ring2) return "ring2";
    return "ring1";
  }
  const match = SLOT_ORDER.find((s) => s.slot === (item.slot as any));
  return match ? (item.slot as EquipSlot) : null;
}

function shortId(id?: string) {
  if (!id) return "";
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-3)}` : id;
}

export default function InventoryPanel({
  role,
  youUserId,
  inventories,
  equipItem,
  unequipSlot,
  addToBag,
}: Props) {
  if (role !== "player") return null;

  const inv = inventories?.[youUserId];
  const equipment = inv?.equipment || {};
  const bag = inv?.bag || [];

  const [dragOverSlot, setDragOverSlot] = useState<EquipSlot | "bag" | null>(null);

  const testItems = useMemo(
    () => [
      { id: "t_sword_1", name: "Rusty Sword", slot: "mainHand", is_two_handed: false },
      { id: "t_gs_1", name: "Old Greatsword (2H)", slot: "mainHand", is_two_handed: true },
      { id: "t_shield_1", name: "Wooden Shield", slot: "offHand", is_two_handed: false },
      { id: "t_ring_1", name: "Plain Ring", slot: "ring", is_two_handed: false },
      { id: "t_boots_1", name: "Worn Boots", slot: "boots", is_two_handed: false },
    ],
    []
  );

  function onDragStartFromBag(e: React.DragEvent, item: Item) {
    const payload: DragPayload = { from: "bag", item };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragStartFromEquip(e: React.DragEvent, slot: EquipSlot, item: Item) {
    const payload: DragPayload = { from: "equip", slot, item };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function parseDragPayload(e: React.DragEvent): DragPayload | null {
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return null;
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  }

  function handleDropOnSlot(e: React.DragEvent, toSlot: EquipSlot) {
    e.preventDefault();
    setDragOverSlot(null);

    const payload = parseDragPayload(e);
    if (!payload) return;

    const item = payload.item;

    // Check accept rules (ring special)
    const accepts = SLOT_ACCEPTS[toSlot];
    if (!accepts(item)) return;

    // If dragging from equip to another slot: unequip then equip (swap behavior is server-safe)
    if (payload.from === "equip") {
      unequipSlot(payload.slot);
      equipItem(toSlot, item);
      return;
    }

    // from bag
    equipItem(toSlot, item);
  }

  function handleDropOnBag(e: React.DragEvent) {
    e.preventDefault();
    setDragOverSlot(null);

    const payload = parseDragPayload(e);
    if (!payload) return;

    // If from equipment, unequip it -> server moves to bag
    if (payload.from === "equip") {
      unequipSlot(payload.slot);
      return;
    }

    // If from bag to bag, ignore for now (we’ll add bag reordering later)
  }

  // Bag grid sizing (Diablo-like)
  const BAG_COLS = 10;
  const BAG_ROWS = 4;
  const BAG_SLOTS = BAG_COLS * BAG_ROWS;

  // Render bag items into slots (no stacking yet, no sizes yet)
  const bagSlots: Array<Item | null> = Array.from({ length: BAG_SLOTS }, (_, i) => bag[i] || null);

  return (
    <section className="invRoot">
      <div className="invTitleBar">
        <div>
          <div className="invTitle">Inventory</div>
          <div className="invSub muted">Player-only • Drag & drop</div>
        </div>

        {/* Temporary test injection until DM loot awarding exists */}
        <div className="invTestRow">
          {addToBag ? (
            testItems.map((t) => (
              <button key={t.id} onClick={() => addToBag(t)} title="Add to bag (temporary test)">
                + {t.name}
              </button>
            ))
          ) : (
            <span className="muted">addToBag() not wired yet</span>
          )}
        </div>
      </div>

      <div className="invBody">
        {/* Equipment */}
        <div className="equipPanel">
          <div className="panelTitle">Equipment</div>

          <div className="equipGrid">
            {SLOT_ORDER.map(({ slot, label }) => {
              const it = (equipment as any)?.[slot] as Item | undefined;

              const isOver = dragOverSlot === slot;

              return (
                <div
                  key={slot}
                  className={`equipSlot ${isOver ? "over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSlot(slot);
                  }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => handleDropOnSlot(e, slot)}
                >
                  <div className="slotLabel">{label}</div>

                  {it ? (
                    <div
                      className="slotItem"
                      draggable
                      onDragStart={(e) => onDragStartFromEquip(e, slot, it)}
                      title={`${it.name} (${it.slot})`}
                    >
                      <div className="itemName">{it.name}</div>
                      <div className="itemMeta muted">
                        {it.is_two_handed ? "2H • " : ""}
                        {shortId(it.id)}
                      </div>
                      <div className="slotActions">
                        <button onClick={() => unequipSlot(slot)}>Unequip</button>
                      </div>
                    </div>
                  ) : (
                    <div className="slotEmpty muted">Drop here</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bag */}
        <div
          className={`bagPanel ${dragOverSlot === "bag" ? "over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverSlot("bag");
          }}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={handleDropOnBag}
        >
          <div className="panelTitle">Bag</div>

          <div className="bagGrid">
            {bagSlots.map((it, idx) => {
              return (
                <div key={idx} className="bagCell">
                  {it ? (
                    <div
                      className="bagItem"
                      draggable
                      onDragStart={(e) => onDragStartFromBag(e, it)}
                      title={`${it.name} (${it.slot})`}
                      onDoubleClick={() => {
                        const target = inferDefaultEquipSlot(it, equipment);
                        if (target) equipItem(target, it);
                      }}
                    >
                      <div className="bagItemName">{it.name}</div>
                      <div className="bagItemMeta muted">{it.slot}</div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="muted bagHint">
            Tip: Double-click a bag item to equip to its default slot (rings prefer Ring 1 then Ring 2).
          </div>
        </div>
      </div>

      {!inv ? <div className="invFooter muted">Waiting for server inventory snapshot…</div> : null}
    </section>
  );
}
