import { useCallback, useState } from "react";

export type EquipSlot =
  | "boots"
  | "legs"
  | "belt"
  | "chest"
  | "gloves"
  | "bracers"
  | "shoulders"
  | "necklace"
  | "head"
  | "ring1"
  | "ring2"
  | "mainhand"
  | "offhand";

export type ItemDef = {
  id: string;
  name: string;
  tier?: number;
  tags?: string[];
  slot?: EquipSlot | "bag";
  category?: string;
  is_two_handed?: boolean;
  magicType?: string;
  magicBonus?: number;
};

export type PlayerInventory = {
  user_id: string;
  bag: ItemDef[];
  equipped: Partial<Record<EquipSlot, ItemDef | null>>;
};

export type UseRoomInventoryReturn = {
  inventories: Record<string, PlayerInventory>;
  setInventories: (inv: Record<string, PlayerInventory>) => void;
  setInventoriesState: (inv: Record<string, PlayerInventory>) => void;
  
  requestInventorySnapshot: () => boolean;
  addToBag: (item: Partial<any>) => boolean;
  equipItem: (slot: EquipSlot, item: Partial<any>) => boolean;
  unequipSlot: (slot: EquipSlot) => boolean;
  dropItem: (itemId: string) => boolean;
};

export function useRoomInventory(send: (payload: any) => boolean): UseRoomInventoryReturn {
  const [inventories, setInventories] = useState<Record<string, PlayerInventory>>({});

  const setInventoriesState = useCallback((inv: Record<string, PlayerInventory>) => {
    setInventories(inv);
  }, []);

  const requestInventorySnapshot = useCallback(() => send({ type: "inventory.snapshot" }), [send]);
  
  const addToBag = useCallback((item: Partial<any>) => send({ type: "inventory.add", item }), [send]);
  
  const equipItem = useCallback((slot: EquipSlot, item: Partial<any>) => send({ type: "inventory.equip", itemId: item.id, slot }), [send]);
  
  const unequipSlot = useCallback((slot: EquipSlot) => send({ type: "inventory.unequip", slot }), [send]);
  
  const dropItem = useCallback((itemId: string) => send({ type: "inventory.drop", itemId }), [send]);

  return {
    inventories,
    setInventories,
    setInventoriesState,
    requestInventorySnapshot,
    addToBag,
    equipItem,
    unequipSlot,
    dropItem,
  };
}
