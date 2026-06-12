-- Junction table for bidirectional NPC links (stored as directed edges, queried bidirectionally)
CREATE TABLE IF NOT EXISTS npc_linked_npcs (
  npc_id         INTEGER NOT NULL,
  linked_npc_id  INTEGER NOT NULL,
  PRIMARY KEY(npc_id, linked_npc_id)
);
CREATE INDEX IF NOT EXISTS idx_npc_linked_npcs_linked ON npc_linked_npcs(linked_npc_id);
