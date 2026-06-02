-- Items: weapons, armour, artefacts, journals, and other relics.
-- Applied by ensureSchema() via CREATE TABLE IF NOT EXISTS — safe to run repeatedly.

CREATE TABLE IF NOT EXISTS items (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  category    TEXT,
  pronunciation TEXT,
  type_tag    TEXT,
  description TEXT,
  properties  TEXT,
  image       TEXT,
  hidden      INTEGER NOT NULL DEFAULT 0,
  gm_notes    TEXT,
  notes       TEXT
);

-- Item → NPC junction (which NPCs are associated with this item)
CREATE TABLE IF NOT EXISTS item_npcs (
  item_id INTEGER NOT NULL,
  npc_id  INTEGER NOT NULL,
  PRIMARY KEY (item_id, npc_id)
);

-- Item → PC junction (which PCs carry or are associated with this item)
CREATE TABLE IF NOT EXISTS item_pcs (
  item_id INTEGER NOT NULL,
  pc_id   INTEGER NOT NULL,
  PRIMARY KEY (item_id, pc_id)
);

-- Item → Location junction (where this item is associated)
CREATE TABLE IF NOT EXISTS item_locations (
  item_id     INTEGER NOT NULL,
  location_id TEXT    NOT NULL,
  PRIMARY KEY (item_id, location_id)
);

-- Recap → Item junction (which items appear in a session recap)
-- Managed by the session-recaps API; read by the items API for backlinks.
CREATE TABLE IF NOT EXISTS recap_items (
  recap_id INTEGER NOT NULL,
  item_id  INTEGER NOT NULL,
  PRIMARY KEY (recap_id, item_id)
);
