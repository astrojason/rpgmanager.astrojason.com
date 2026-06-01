-- Entity tagging: link session recaps and quests to NPCs and locations.
-- Applied by ensureSchema() via CREATE TABLE IF NOT EXISTS — safe to run repeatedly.

CREATE TABLE IF NOT EXISTS recap_npcs (
  recap_id    INTEGER NOT NULL,
  npc_id      INTEGER NOT NULL,
  PRIMARY KEY (recap_id, npc_id)
);

CREATE TABLE IF NOT EXISTS recap_locations (
  recap_id    INTEGER NOT NULL,
  location_id INTEGER NOT NULL,
  PRIMARY KEY (recap_id, location_id)
);

CREATE TABLE IF NOT EXISTS quest_npcs (
  quest_id INTEGER NOT NULL,
  npc_id   INTEGER NOT NULL,
  PRIMARY KEY (quest_id, npc_id)
);

CREATE TABLE IF NOT EXISTS quest_locations (
  quest_id    INTEGER NOT NULL,
  location_id INTEGER NOT NULL,
  PRIMARY KEY (quest_id, location_id)
);
