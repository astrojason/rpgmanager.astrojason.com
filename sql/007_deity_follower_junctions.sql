-- Replace notable_followers text field with proper NPC/PC junction tables
CREATE TABLE IF NOT EXISTS deity_follower_npcs (
  deity_id INTEGER NOT NULL,
  npc_id   INTEGER NOT NULL,
  PRIMARY KEY(deity_id, npc_id)
);
CREATE TABLE IF NOT EXISTS deity_follower_pcs (
  deity_id INTEGER NOT NULL,
  pc_id    INTEGER NOT NULL,
  PRIMARY KEY(deity_id, pc_id)
);
