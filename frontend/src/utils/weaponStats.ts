export type WeaponStats = {
  name: string;
  category: "Simple" | "Martial";
  kind: "Melee" | "Ranged";
  damage: string;
  damageType: string;
  properties: string[];
};

export type ItemLike = {
  id?: string;
  name?: string;
  magicType?: string | null;
  magicBonus?: number | string | null;
  tags?: string[] | null;
  is_two_handed?: boolean | null;
};

const MAGIC_SUFFIX: Record<string, string> = {
  acid: "Acid",
  cold: "Frost",
  fire: "Flames",
  lightning: "Storms",
  poison: "Venom",
  thunder: "Thunder",
  holy: "Holy",
  radiant: "Radiance",
  necrotic: "Necrosis",
  force: "Force",
  psychic: "Psychic",
};

const MAGIC_DAMAGE_LABEL: Record<string, string> = {
  acid: "Acid",
  cold: "Cold",
  fire: "Fire",
  lightning: "Lightning",
  poison: "Poison",
  thunder: "Thunder",
  holy: "Radiant",
  radiant: "Radiant",
  necrotic: "Necrotic",
  force: "Force",
  psychic: "Psychic",
};

const WEAPON_STATS: Record<string, WeaponStats> = {
  club: { name: "Club", category: "Simple", kind: "Melee", damage: "1d4", damageType: "Bludgeoning", properties: ["Light"] },
  dagger: { name: "Dagger", category: "Simple", kind: "Melee", damage: "1d4", damageType: "Piercing", properties: ["Finesse", "Light", "Thrown (20/60)"] },
  greatclub: { name: "Greatclub", category: "Simple", kind: "Melee", damage: "1d8", damageType: "Bludgeoning", properties: ["Two-Handed"] },
  handaxe: { name: "Handaxe", category: "Simple", kind: "Melee", damage: "1d6", damageType: "Slashing", properties: ["Light", "Thrown (20/60)"] },
  javelin: { name: "Javelin", category: "Simple", kind: "Melee", damage: "1d6", damageType: "Piercing", properties: ["Thrown (30/120)"] },
  lightHammer: { name: "Light Hammer", category: "Simple", kind: "Melee", damage: "1d4", damageType: "Bludgeoning", properties: ["Light", "Thrown (20/60)"] },
  mace: { name: "Mace", category: "Simple", kind: "Melee", damage: "1d6", damageType: "Bludgeoning", properties: [] },
  quarterstaff: { name: "Quarterstaff", category: "Simple", kind: "Melee", damage: "1d6", damageType: "Bludgeoning", properties: ["Versatile (1d8)"] },
  sickle: { name: "Sickle", category: "Simple", kind: "Melee", damage: "1d4", damageType: "Slashing", properties: ["Light"] },
  spear: { name: "Spear", category: "Simple", kind: "Melee", damage: "1d6", damageType: "Piercing", properties: ["Thrown (20/60)", "Versatile (1d8)"] },

  lightCrossbow: { name: "Light Crossbow", category: "Simple", kind: "Ranged", damage: "1d8", damageType: "Piercing", properties: ["Ammunition (80/320)", "Loading", "Two-Handed"] },
  dart: { name: "Dart", category: "Simple", kind: "Ranged", damage: "1d4", damageType: "Piercing", properties: ["Finesse", "Thrown (20/60)"] },
  shortbow: { name: "Shortbow", category: "Simple", kind: "Ranged", damage: "1d6", damageType: "Piercing", properties: ["Ammunition (80/320)", "Two-Handed"] },
  sling: { name: "Sling", category: "Simple", kind: "Ranged", damage: "1d4", damageType: "Bludgeoning", properties: ["Ammunition (30/120)"] },

  battleaxe: { name: "Battleaxe", category: "Martial", kind: "Melee", damage: "1d8", damageType: "Slashing", properties: ["Versatile (1d10)"] },
  flail: { name: "Flail", category: "Martial", kind: "Melee", damage: "1d8", damageType: "Bludgeoning", properties: [] },
  glaive: { name: "Glaive", category: "Martial", kind: "Melee", damage: "1d10", damageType: "Slashing", properties: ["Heavy", "Reach", "Two-Handed"] },
  greataxe: { name: "Greataxe", category: "Martial", kind: "Melee", damage: "1d12", damageType: "Slashing", properties: ["Heavy", "Two-Handed"] },
  greatsword: { name: "Greatsword", category: "Martial", kind: "Melee", damage: "2d6", damageType: "Slashing", properties: ["Heavy", "Two-Handed"] },
  halberd: { name: "Halberd", category: "Martial", kind: "Melee", damage: "1d10", damageType: "Slashing", properties: ["Heavy", "Reach", "Two-Handed"] },
  lance: { name: "Lance", category: "Martial", kind: "Melee", damage: "1d12", damageType: "Piercing", properties: ["Reach", "Special"] },
  longsword: { name: "Longsword", category: "Martial", kind: "Melee", damage: "1d8", damageType: "Slashing", properties: ["Versatile (1d10)"] },
  maul: { name: "Maul", category: "Martial", kind: "Melee", damage: "2d6", damageType: "Bludgeoning", properties: ["Heavy", "Two-Handed"] },
  morningstar: { name: "Morningstar", category: "Martial", kind: "Melee", damage: "1d8", damageType: "Piercing", properties: [] },
  pike: { name: "Pike", category: "Martial", kind: "Melee", damage: "1d10", damageType: "Piercing", properties: ["Heavy", "Reach", "Two-Handed"] },
  rapier: { name: "Rapier", category: "Martial", kind: "Melee", damage: "1d8", damageType: "Piercing", properties: ["Finesse"] },
  scimitar: { name: "Scimitar", category: "Martial", kind: "Melee", damage: "1d6", damageType: "Slashing", properties: ["Finesse", "Light"] },
  shortsword: { name: "Shortsword", category: "Martial", kind: "Melee", damage: "1d6", damageType: "Piercing", properties: ["Finesse", "Light"] },
  trident: { name: "Trident", category: "Martial", kind: "Melee", damage: "1d6", damageType: "Piercing", properties: ["Thrown (20/60)", "Versatile (1d8)"] },
  warPick: { name: "War Pick", category: "Martial", kind: "Melee", damage: "1d8", damageType: "Piercing", properties: [] },
  warhammer: { name: "Warhammer", category: "Martial", kind: "Melee", damage: "1d8", damageType: "Bludgeoning", properties: ["Versatile (1d10)"] },
  whip: { name: "Whip", category: "Martial", kind: "Melee", damage: "1d4", damageType: "Slashing", properties: ["Finesse", "Reach"] },

  blowgun: { name: "Blowgun", category: "Martial", kind: "Ranged", damage: "1", damageType: "Piercing", properties: ["Ammunition (25/100)", "Loading"] },
  handCrossbow: { name: "Hand Crossbow", category: "Martial", kind: "Ranged", damage: "1d6", damageType: "Piercing", properties: ["Ammunition (30/120)", "Light", "Loading"] },
  heavyCrossbow: { name: "Heavy Crossbow", category: "Martial", kind: "Ranged", damage: "1d10", damageType: "Piercing", properties: ["Ammunition (100/400)", "Heavy", "Loading", "Two-Handed"] },
  longbow: { name: "Longbow", category: "Martial", kind: "Ranged", damage: "1d8", damageType: "Piercing", properties: ["Ammunition (150/600)", "Heavy", "Two-Handed"] },
  net: { name: "Net", category: "Martial", kind: "Ranged", damage: "—", damageType: "Special", properties: ["Thrown (5/15)", "Special"] },
};

const NORMALIZED_STATS = new Map<string, WeaponStats>();

function normalizeKey(value: string) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

Object.entries(WEAPON_STATS).forEach(([key, stats]) => {
  NORMALIZED_STATS.set(normalizeKey(key), stats);
  NORMALIZED_STATS.set(normalizeKey(stats.name), stats);
});

function baseItemId(itemId: string) {
  return (itemId || "").replace(/_t\\d+$/i, "");
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("-");
}

function parseBonus(value: ItemLike["magicBonus"]) {
  const bonus = Number(value);
  return Number.isFinite(bonus) && bonus > 0 ? bonus : 0;
}

function pickMagicType(item: ItemLike) {
  const direct = (item.magicType || "").toString().trim().toLowerCase();
  if (direct) return direct;
  const tags = (item.tags || []).map((t) => String(t).toLowerCase());
  return tags.find((t) => t in MAGIC_DAMAGE_LABEL) || "";
}

export function getWeaponStats(itemId?: string) {
  const base = baseItemId(itemId || "");
  if (WEAPON_STATS[base]) return WEAPON_STATS[base];
  const normalized = normalizeKey(base);
  return NORMALIZED_STATS.get(normalized) || null;
}

export function formatWeaponTitle(name: string, bonus: number, magicType: string) {
  const parts = [name];
  if (bonus > 0) parts.push(`+${bonus}`);
  if (magicType) {
    const suffix = MAGIC_SUFFIX[magicType] || titleCase(magicType);
    parts.push(`of ${suffix}`);
  }
  return parts.join(" ");
}

export function buildWeaponTooltipLines(item: ItemLike): string[] | null {
  const stats = getWeaponStats(item.id) || getWeaponStats(item.name);
  if (!stats) return null;
  const name = item.name || stats.name;
  const bonus = parseBonus(item.magicBonus);
  const magicType = pickMagicType(item);
  const title = formatWeaponTitle(name, bonus, magicType);
  const properties = [...stats.properties];
  if (item.is_two_handed && !properties.includes("Two-Handed")) properties.push("Two-Handed");
  const propLine = properties.length ? properties.join(", ") : "—";
  const damageLine = `${stats.damage} ${titleCase(stats.damageType)}${bonus ? ` (+${bonus})` : ""}`;
  const enchantLabel = magicType ? MAGIC_DAMAGE_LABEL[magicType] || titleCase(magicType) : "";
  const enchantLine = enchantLabel ? `+1d6 ${enchantLabel} Damage` : "";

  const lines = [
    "----------------",
    title,
    `${stats.category} Weapon (${stats.name})`,
    propLine,
    "----------------",
    "Damage",
    damageLine,
  ];
  if (enchantLine) {
    lines.push("Enchantment", enchantLine);
  }
  lines.push("----------------");
  return lines;
}
