-- Deity entities table
CREATE TABLE IF NOT EXISTS deities (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  pronunciation TEXT,
  domain TEXT,
  alignment TEXT,
  status TEXT,
  description TEXT,
  image TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  gm_notes TEXT,
  notes TEXT
);

-- Faction tagging junctions for recaps and quests
CREATE TABLE IF NOT EXISTS recap_factions (
  recap_id INTEGER NOT NULL,
  faction_id TEXT NOT NULL,
  PRIMARY KEY(recap_id, faction_id)
);
CREATE TABLE IF NOT EXISTS quest_factions (
  quest_id INTEGER NOT NULL,
  faction_id TEXT NOT NULL,
  PRIMARY KEY(quest_id, faction_id)
);

-- Deity tagging junctions for recaps and quests
CREATE TABLE IF NOT EXISTS recap_deities (
  recap_id INTEGER NOT NULL,
  deity_id INTEGER NOT NULL,
  PRIMARY KEY(recap_id, deity_id)
);
CREATE TABLE IF NOT EXISTS quest_deities (
  quest_id INTEGER NOT NULL,
  deity_id INTEGER NOT NULL,
  PRIMARY KEY(quest_id, deity_id)
);
