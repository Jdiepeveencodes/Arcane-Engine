from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from typing import Any, Iterable

OPEN5E_BASE_URL = (os.getenv("ARCANE_OPEN5E_URL") or "https://api.open5e.com").rstrip("/")
OPEN5E_TIMEOUT = int(os.getenv("ARCANE_OPEN5E_TIMEOUT") or "8")

ABILITY_DATA = [
    ("str", "Strength", "STR", "Physical power and athleticism."),
    ("dex", "Dexterity", "DEX", "Agility, reflexes, and balance."),
    ("con", "Constitution", "CON", "Endurance and resilience."),
    ("int", "Intelligence", "INT", "Reasoning and memory."),
    ("wis", "Wisdom", "WIS", "Awareness and intuition."),
    ("cha", "Charisma", "CHA", "Presence and force of personality."),
]

SKILL_DATA = [
    ("acrobatics", "Acrobatics", "dex", "Balance, flips, and tumbling."),
    ("animal-handling", "Animal Handling", "wis", "Handling and calming animals."),
    ("arcana", "Arcana", "int", "Knowledge of magic and arcane lore."),
    ("athletics", "Athletics", "str", "Climbing, jumping, and swimming."),
    ("deception", "Deception", "cha", "Lying, bluffing, and misdirection."),
    ("history", "History", "int", "Recall of historical lore."),
    ("insight", "Insight", "wis", "Reading motives and intentions."),
    ("intimidation", "Intimidation", "cha", "Coercion and threats."),
    ("investigation", "Investigation", "int", "Finding clues and analysis."),
    ("medicine", "Medicine", "wis", "Diagnosing and stabilizing."),
    ("nature", "Nature", "int", "Knowledge of natural world."),
    ("perception", "Perception", "wis", "Spotting details and threats."),
    ("performance", "Performance", "cha", "Entertaining an audience."),
    ("persuasion", "Persuasion", "cha", "Influencing with charm."),
    ("religion", "Religion", "int", "Knowledge of gods and rites."),
    ("sleight-of-hand", "Sleight of Hand", "dex", "Tricks and dexterous work."),
    ("stealth", "Stealth", "dex", "Moving quietly and staying hidden."),
    ("survival", "Survival", "wis", "Tracking and living off the land."),
]

RULES_TABLES = {
    "races": ("rules_races", ["slug", "name", "source", "data_json"]),
    "feats": ("rules_feats", ["slug", "name", "prerequisites", "source", "data_json"]),
    "skills": ("rules_skills", ["slug", "name", "ability", "source", "data_json"]),
    "attacks": (
        "rules_attacks",
        [
            "slug",
            "name",
            "attack_type",
            "damage_dice",
            "damage_type",
            "properties",
            "range_text",
            "source",
            "data_json",
        ],
    ),
}


def seed_core_rules(conn) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rules_abilities (
          ability_id TEXT PRIMARY KEY,
          name TEXT,
          abbr TEXT,
          description TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rules_ability_mods (
          score INTEGER PRIMARY KEY,
          modifier INTEGER
        )
        """
    )
    for ability_id, name, abbr, desc in ABILITY_DATA:
        cur.execute(
            """
            INSERT OR REPLACE INTO rules_abilities (
              ability_id, name, abbr, description
            ) VALUES (?, ?, ?, ?)
            """,
            (ability_id, name, abbr, desc),
        )
    for score in range(1, 31):
        modifier = (score - 10) // 2
        cur.execute(
            "INSERT OR REPLACE INTO rules_ability_mods (score, modifier) VALUES (?, ?)",
            (score, modifier),
        )
    conn.commit()


def _slugify(value: str) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def _fetch_json(url: str) -> dict | None:
    try:
        with urllib.request.urlopen(url, timeout=OPEN5E_TIMEOUT) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def _fetch_open5e(endpoint: str) -> list[dict]:
    url = f"{OPEN5E_BASE_URL}/{endpoint.strip('/')}/"
    out: list[dict] = []
    while url:
        payload = _fetch_json(url)
        if not payload:
            break
        results = payload.get("results")
        if isinstance(results, list):
            out.extend([item for item in results if isinstance(item, dict)])
        url = payload.get("next")
    return out


def _insert_many(conn, rows: Iterable[tuple], sql: str) -> None:
    cur = conn.cursor()
    cur.executemany(sql, list(rows))
    conn.commit()


def sync_open5e(conn, kinds: list[str] | None = None) -> dict:
    kinds = [k.strip().lower() for k in (kinds or ["races", "feats", "skills", "weapons"]) if k]
    counts: dict[str, int] = {}

    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rules_races (
          slug TEXT PRIMARY KEY,
          name TEXT,
          source TEXT,
          data_json TEXT,
          synced_at REAL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rules_feats (
          slug TEXT PRIMARY KEY,
          name TEXT,
          prerequisites TEXT,
          source TEXT,
          data_json TEXT,
          synced_at REAL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rules_skills (
          slug TEXT PRIMARY KEY,
          name TEXT,
          ability TEXT,
          source TEXT,
          data_json TEXT,
          synced_at REAL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rules_attacks (
          slug TEXT PRIMARY KEY,
          name TEXT,
          attack_type TEXT,
          damage_dice TEXT,
          damage_type TEXT,
          properties TEXT,
          range_text TEXT,
          source TEXT,
          data_json TEXT,
          synced_at REAL
        )
        """
    )
    conn.commit()

    now = time.time()

    if "races" in kinds:
        races = _fetch_open5e("races")
        rows = []
        for race in races:
            name = race.get("name") or ""
            slug = race.get("slug") or _slugify(name)
            if not slug:
                continue
            source = race.get("document__slug") or race.get("document__title") or ""
            rows.append((slug, name, source, json.dumps(race, default=str), now))
        _insert_many(
            conn,
            rows,
            """
            INSERT OR REPLACE INTO rules_races (
              slug, name, source, data_json, synced_at
            ) VALUES (?, ?, ?, ?, ?)
            """,
        )
        counts["races"] = len(rows)

    if "feats" in kinds:
        feats = _fetch_open5e("feats")
        rows = []
        for feat in feats:
            name = feat.get("name") or ""
            slug = feat.get("slug") or _slugify(name)
            if not slug:
                continue
            prereq = feat.get("prerequisite") or ""
            source = feat.get("document__slug") or feat.get("document__title") or ""
            rows.append((slug, name, prereq, source, json.dumps(feat, default=str), now))
        _insert_many(
            conn,
            rows,
            """
            INSERT OR REPLACE INTO rules_feats (
              slug, name, prerequisites, source, data_json, synced_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
        )
        counts["feats"] = len(rows)

    if "skills" in kinds:
        skills = _fetch_open5e("skills")
        rows = []
        if skills:
            for skill in skills:
                name = skill.get("name") or ""
                slug = skill.get("slug") or _slugify(name)
                if not slug:
                    continue
                ability = skill.get("ability") or ""
                source = skill.get("document__slug") or skill.get("document__title") or ""
                rows.append((slug, name, ability, source, json.dumps(skill, default=str), now))
        else:
            for slug, name, ability, description in SKILL_DATA:
                payload = {"name": name, "slug": slug, "ability": ability, "description": description}
                rows.append((slug, name, ability, "core", json.dumps(payload, default=str), now))
        _insert_many(
            conn,
            rows,
            """
            INSERT OR REPLACE INTO rules_skills (
              slug, name, ability, source, data_json, synced_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
        )
        counts["skills"] = len(rows)

    if "weapons" in kinds or "attacks" in kinds:
        weapons = _fetch_open5e("weapons")
        rows = []
        for weapon in weapons:
            name = weapon.get("name") or ""
            slug = weapon.get("slug") or _slugify(name)
            if not slug:
                continue
            attack_type = weapon.get("weapon_category") or weapon.get("category_range") or ""
            damage_dice = weapon.get("damage_dice") or ""
            damage_type = weapon.get("damage_type") or ""
            properties = weapon.get("properties")
            if isinstance(properties, list):
                properties_text = ", ".join([str(p) for p in properties if str(p).strip()])
            else:
                properties_text = str(properties or "")
            range_text = weapon.get("range") or weapon.get("range_normal") or ""
            source = weapon.get("document__slug") or weapon.get("document__title") or ""
            rows.append(
                (
                    slug,
                    name,
                    attack_type,
                    damage_dice,
                    damage_type,
                    properties_text,
                    range_text,
                    source,
                    json.dumps(weapon, default=str),
                    now,
                )
            )
        _insert_many(
            conn,
            rows,
            """
            INSERT OR REPLACE INTO rules_attacks (
              slug, name, attack_type, damage_dice, damage_type, properties,
              range_text, source, data_json, synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        )
        counts["attacks"] = len(rows)

    return counts


def rules_counts(conn) -> dict[str, int]:
    cur = conn.cursor()
    counts: dict[str, int] = {}
    for kind, (table, _cols) in RULES_TABLES.items():
        try:
            row = cur.execute(f"SELECT COUNT(1) AS c FROM {table}").fetchone()
            counts[kind] = int(row[0]) if row else 0
        except Exception:
            counts[kind] = 0
    return counts


def rules_status(conn) -> dict[str, dict]:
    cur = conn.cursor()
    counts = rules_counts(conn)
    last_sync: dict[str, float | None] = {}
    for kind, (table, _cols) in RULES_TABLES.items():
        try:
            row = cur.execute(f"SELECT MAX(synced_at) AS m FROM {table}").fetchone()
            last_sync[kind] = float(row[0]) if row and row[0] is not None else None
        except Exception:
            last_sync[kind] = None
    return {"counts": counts, "last_sync": last_sync}


def list_rules(conn, kind: str, full: bool = False, limit: int | None = None) -> list[dict]:
    kind = (kind or "").strip().lower()
    cur = conn.cursor()

    if kind == "abilities":
        rows = cur.execute(
            "SELECT ability_id, name, abbr, description FROM rules_abilities ORDER BY ability_id"
        ).fetchall()
        return [
            {
                "id": row["ability_id"],
                "name": row["name"],
                "abbr": row["abbr"],
                "description": row["description"],
            }
            for row in rows
        ]

    if kind in ("ability-mods", "ability_mods"):
        rows = cur.execute("SELECT score, modifier FROM rules_ability_mods ORDER BY score").fetchall()
        return [{"score": row["score"], "modifier": row["modifier"]} for row in rows]

    if kind not in RULES_TABLES:
        return []

    table, cols = RULES_TABLES[kind]
    select_cols = ", ".join(cols)
    sql = f"SELECT {select_cols} FROM {table} ORDER BY name"
    if isinstance(limit, int) and limit > 0:
        sql += f" LIMIT {limit}"
    rows = cur.execute(sql).fetchall()
    out = []
    for row in rows:
        entry = {col: row[col] for col in cols if col != "data_json"}
        if full:
            entry["data"] = json.loads(row["data_json"] or "{}")
        out.append(entry)
    return out
