import { useCallback, useState } from "react";

export type ItemDef = {
  id: string;
  name: string;
  tier?: number;
  tags?: string[];
  slot?: string | "bag";
  category?: string;
  is_two_handed?: boolean;
  magicType?: string;
  magicBonus?: number;
};

export type LootBag = {
  bag_id: string;
  name: string;
  type: "community" | "player";
  items: ItemDef[];
  created_at: number;
  created_by: string;
  target_user_id?: string | null;
  visible_to_players?: boolean;
};

export type LootConfig = {
  source: "mob" | "chest" | "boss" | "shop" | "custom";
  count: number;
  tierMin: number;
  tierMax: number;
  allowMagic: boolean;
  addElemental?: boolean;
  bagName?: string;
  categories: Array<"weapons" | "armor" | "jewelry">;
  slots: string[];
  tags: string[];
  categoryProps?: Partial<
    Record<
      "weapons" | "armor" | "jewelry",
      { bonus?: number; elemental?: string; magical?: string }
    >
  >;
};

export type UseRoomLootReturn = {
  lootBags: Record<string, LootBag>;
  setLootBags: (bags: Record<string, LootBag>) => void;
  setLootBagsState: (bags: Record<string, LootBag>) => void;
  lootStatus: string;
  setLootStatus: (status: string) => void;
  
  generateLoot: (items: any[], bagName: string, bagType?: "community" | "player") => boolean;
  dmGenerateLoot: (targetUserId: string, config: LootConfig) => boolean;
  setLootVisibility: (bagId: string, visible: boolean) => boolean;
  distributeLoot: (bagId: string, itemId: string, targetUserId: string) => boolean;
  discardLoot: (bagId: string, itemId: string) => boolean;
  requestLootSnapshot: () => boolean;
};

export function useRoomLoot(send: (payload: any) => boolean): UseRoomLootReturn {
  const [lootBags, setLootBags] = useState<Record<string, LootBag>>({});
  const [lootStatus, setLootStatus] = useState<string>("");

  const setLootBagsState = useCallback((bags: Record<string, LootBag>) => {
    setLootBags(bags);
  }, []);

  const generateLoot = useCallback(
    (items: any[], bagName: string, bagType: "community" | "player" = "community") =>
      send({ type: "loot.generate", items, bag_name: bagName, bag_type: bagType }),
    [send]
  );

  const dmGenerateLoot = useCallback(
    (targetUserId: string, config: LootConfig) => {
      const categoryProps = config?.categoryProps;
      const propsSummary = (() => {
        if (!categoryProps) return "";
        const parts: string[] = [];
        for (const [key, value] of Object.entries(categoryProps)) {
          if (!value) continue;
          const segs: string[] = [];
          if (value.bonus) segs.push(`+${value.bonus}`);
          if (value.elemental) segs.push(value.elemental);
          if (value.magical) segs.push(value.magical);
          if (segs.length) parts.push(`${key}: ${segs.join(", ")}`);
        }
        return parts.length ? ` (${parts.join(" | ")})` : "";
      })();
      const ok = send({
        type: "loot.generate",
        target_user_id: targetUserId,
        config,
        categoryProps,
        category_props: categoryProps,
        bag_name: config?.bagName || "",
      });
      setLootStatus(ok ? `Requesting loot...${propsSummary}` : "Not connected.");
      return ok;
    },
    [send]
  );

  const setLootVisibility = useCallback((bagId: string, visible: boolean) => send({ type: "loot.set_visibility", bag_id: bagId, visible }), [send]);

  const distributeLoot = useCallback((bagId: string, itemId: string, targetUserId: string) => send({ type: "loot.distribute", bag_id: bagId, item_id: itemId, target_user_id: targetUserId }), [send]);

  const discardLoot = useCallback((bagId: string, itemId: string) => send({ type: "loot.discard", bag_id: bagId, item_id: itemId }), [send]);

  const requestLootSnapshot = useCallback(() => send({ type: "loot.snapshot" }), [send]);

  return {
    lootBags,
    setLootBags,
    setLootBagsState,
    lootStatus,
    setLootStatus,
    generateLoot,
    dmGenerateLoot,
    setLootVisibility,
    distributeLoot,
    discardLoot,
    requestLootSnapshot,
  };
}
