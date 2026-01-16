import React, { useMemo, useRef, useState } from "react";
import "./InventoryPanel.css";
import type { EquipSlot, Item, PlayerInventory } from "../hooks/useRoomSocket";
import slotLayoutData from "../assets/inventory-layout.json";

type Props = {
  role: "dm" | "player";
  youUserId: string;
  inventories: Record<string, PlayerInventory>;
  equipItem: (toSlot: EquipSlot, item: Partial<Item>, targetUserId?: string) => boolean;
  unequipSlot: (slot: EquipSlot, targetUserId?: string) => boolean;
  dropItem?: (itemId: string, targetUserId?: string) => void; // optional dev tool
  addToBag?: (item: Partial<Item>, targetUserId?: string) => boolean; // optional dev tool
  bodyImageUrl?: string;
};

type DragPayload =
  | { from: "bag"; item: Item }
  | { from: "equip"; slot: EquipSlot; item: Item };

const SLOT_ORDER: Array<{ slot: EquipSlot; label: string }> = [
  { slot: "head", label: "Head" },
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
  { slot: "mainhand", label: "Main Hand" },
  { slot: "offhand", label: "Off Hand" },
];

const SLOT_ACCEPTS: Record<EquipSlot, (item: Item) => boolean> = {
  head: (i) => (i.slot as string).toLowerCase() === "head",
  necklace: (i) => (i.slot as string).toLowerCase() === "necklace",
  shoulders: (i) => (i.slot as string).toLowerCase() === "shoulders",
  chest: (i) => (i.slot as string).toLowerCase() === "chest",
  bracers: (i) => (i.slot as string).toLowerCase() === "bracers",
  gloves: (i) => (i.slot as string).toLowerCase() === "gloves",
  belt: (i) => (i.slot as string).toLowerCase() === "belt",
  legs: (i) => (i.slot as string).toLowerCase() === "legs",
  boots: (i) => (i.slot as string).toLowerCase() === "boots",
  ring1: (i) => (i.slot as string).toLowerCase() === "ring" || (i.slot as string).toLowerCase() === "ring1",
  ring2: (i) => (i.slot as string).toLowerCase() === "ring" || (i.slot as string).toLowerCase() === "ring2",
  mainhand: (i) => (i.slot as string).toLowerCase() === "mainhand",
  offhand: (i) => (i.slot as string).toLowerCase() === "offhand",
};

type SlotLayout = { top: number; left: number; width: number; height: number };
const DEFAULT_LAYOUT = slotLayoutData as Record<EquipSlot, SlotLayout>;

function inferDefaultEquipSlot(item: Item, equipment: Partial<Record<EquipSlot, Item>>): EquipSlot | null {
  const itemSlot = (item.slot as string).toLowerCase();
  if (itemSlot === "ring" || itemSlot === "ring1" || itemSlot === "ring2") {
    if (!equipment.ring1) return "ring1";
    if (!equipment.ring2) return "ring2";
    return "ring1";
  }
  const match = SLOT_ORDER.find((s) => s.slot === itemSlot);
  return match ? (itemSlot as EquipSlot) : null;
}

function shortId(id?: string) {
  if (!id) return "";
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-3)}` : id;
}

function tierLabel(tier?: number) {
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
  return map[tier] || "Tier " + tier;
}

function propertyTags(item: Item) {
  const tags = (item.tags || []).map((t) => String(t).toLowerCase());
  if (item.magicType) tags.push(String(item.magicType).toLowerCase());
  const allowed = new Set([
    "bludgeoning",
    "piercing",
    "slashing",
    "acid",
    "cold",
    "fire",
    "lightning",
    "poison",
    "thunder",
    "radiant",
    "necrotic",
    "force",
    "psychic",
    "two-handed",
  ]);
  return tags.filter((t) => allowed.has(t));
}

function formatItemTooltip(item: Item) {
  const parts = [item.name || "Item"];
  const slot = item.slot ? String(item.slot) : "bag";
  parts.push("Slot: " + slot);
  if (typeof item.tier === "number") {
    parts.push("Tier: " + tierLabel(item.tier));
  }
  const props = propertyTags(item);
  if (props.length) {
    parts.push("Props: " + props.join(", "));
  }
  return parts;
}

export default function InventoryPanel({
  role,
  youUserId,
  inventories,
  equipItem,
  unequipSlot,
  dropItem,
  bodyImageUrl,
}: Props) {
  if (role !== "player") return null;

  const inv = inventories?.[youUserId];
  const equipment = inv?.equipment || {};
  const bag = inv?.bag || [];
  const bodyUrl = bodyImageUrl || "/static/inventory-body.png";

  const figureRef = useRef<HTMLDivElement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<Record<EquipSlot, SlotLayout>>(() => ({ ...DEFAULT_LAYOUT }));
  const dragState = useRef<{
    slot: EquipSlot;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    startLayout: SlotLayout;
  } | null>(null);

  const [dragOverSlot, setDragOverSlot] = useState<EquipSlot | "bag" | null>(null);

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
    if (editMode) return;

    const payload = parseDragPayload(e);
    if (!payload) return;

    const item = payload.item;

    const accepts = SLOT_ACCEPTS[toSlot];
    if (!accepts(item)) return;

    if (payload.from === "equip") {
      unequipSlot(payload.slot);
      equipItem(toSlot, item);
      return;
    }

    equipItem(toSlot, item);
  }

  function handleDropOnBag(e: React.DragEvent) {
    e.preventDefault();
    setDragOverSlot(null);
    if (editMode) return;

    const payload = parseDragPayload(e);
    if (!payload) return;

    if (payload.from === "equip") {
      unequipSlot(payload.slot);
      return;
    }
  }

  function handleDropOnDropSlot(e: React.DragEvent) {
    e.preventDefault();
    setDragOverSlot(null);
    if (editMode) return;

    const payload = parseDragPayload(e);
    if (!payload) return;

    if (dropItem) {
      dropItem(payload.item.id);
    }
  }

  function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
  }

  function beginLayoutDrag(e: React.PointerEvent, slot: EquipSlot, mode: "move" | "resize") {
    if (!editMode) return;
    const rect = figureRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();

    const startLayout = layout[slot] || DEFAULT_LAYOUT[slot];
    dragState.current = {
      slot,
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
      const minSize = 6;

      let next = { ...state.startLayout };
      if (state.mode === "move") {
        next.left = clamp(next.left + dxPct, 0, 100 - next.width);
        next.top = clamp(next.top + dyPct, 0, 100 - next.height);
      } else {
        next.width = clamp(next.width + dxPct, minSize, 100 - next.left);
        next.height = clamp(next.height + dyPct, minSize, 100 - next.top);
      }

      setLayout((prev) => ({ ...prev, [state.slot]: next }));
    };

    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  async function copyLayoutJson(json: string) {
    try {
      await navigator.clipboard.writeText(json);
    } catch {}
  }

  function resetLayout() {
    setLayout({ ...DEFAULT_LAYOUT });
  }

  const BAG_COLS = 6;
  const BAG_ROWS = 3;
  const BAG_SLOTS = BAG_COLS * BAG_ROWS;

  const bagSlots: Array<Item | null> = Array.from({ length: BAG_SLOTS }, (_, i) => bag[i] || null);
  const layoutJson = useMemo(() => JSON.stringify(layout, null, 2), [layout]);

  return (
    <section className="invRoot">
      <div className="invTitleBar">
        <div>
          <div className="invTitle">Inventory</div>
          <div className="invSub muted">Drag & drop • Double-click to equip</div>
        </div>

      </div>

      <div className="invBody">
        <div className="equipPanel">
          <div className="equipControls">
            <button onClick={() => setEditMode((v) => !v)}>{editMode ? "Exit Layout" : "Edit Layout"}</button>
            {editMode ? (
              <>
                <button onClick={() => copyLayoutJson(layoutJson)}>Copy Layout JSON</button>
                <button onClick={resetLayout}>Reset Layout</button>
              </>
            ) : null}
          </div>

          <div ref={figureRef} className="equipFigure" style={{ backgroundImage: `url(${bodyUrl})` }}>
            {SLOT_ORDER.map(({ slot, label }) => {
              const it = (equipment as any)?.[slot] as Item | undefined;
              const isOver = dragOverSlot === slot;
              const layoutSlot = layout[slot] || DEFAULT_LAYOUT[slot];

              return (
                <div
                  key={slot}
                  className={`equipSlot equipSlotPos ${isOver ? "over" : ""} ${editMode ? "editing" : ""}`}
                  data-slot={slot}
                  style={{
                    top: `${layoutSlot?.top ?? 0}%`,
                    left: `${layoutSlot?.left ?? 0}%`,
                    width: `${layoutSlot?.width ?? 10}%`,
                    height: `${layoutSlot?.height ?? 10}%`,
                  }}
                  onPointerDown={(e) => beginLayoutDrag(e, slot, e.shiftKey ? "resize" : "move")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSlot(slot);
                  }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => handleDropOnSlot(e, slot)}
                >
                  {it ? (
                    <div
                      className="slotItem"
                      draggable={!editMode}
                      onDragStart={(e) => onDragStartFromEquip(e, slot, it)}
                    >
                      <div className="itemTooltip">
                        {formatItemTooltip(it).map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
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
                    <div className="slotEmpty muted" />
                  )}

                  {editMode ? (
                    <div
                      className="slotResizeHandle"
                      title="Resize"
                      onPointerDown={(e) => beginLayoutDrag(e, slot, "resize")}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {editMode ? (
            <textarea className="layoutJson" value={layoutJson} readOnly />
          ) : null}
        </div>

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
                      onDoubleClick={() => {
                        const target = inferDefaultEquipSlot(it, equipment);
                        if (target) equipItem(target, it);
                      }}
                    >
                      <div className="itemTooltip">
                        {formatItemTooltip(it).map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
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

        <div
          className={`dropSlot ${dragOverSlot === "drop" ? "over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverSlot("drop");
          }}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={handleDropOnDropSlot}
        >
          <div className="dropSlotLabel">🗑️ Drop Item</div>
        </div>
      </div>

      {!inv ? <div className="invFooter muted">Waiting for server inventory snapshot…</div> : null}
    </section>
  );
}
