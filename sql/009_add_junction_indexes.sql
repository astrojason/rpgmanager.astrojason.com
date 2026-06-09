-- Indexes on junction table foreign key columns to speed up filtering and DELETE operations.
-- Every junction table had only a composite PRIMARY KEY, so filtering by either FK required a full table scan.

CREATE INDEX IF NOT EXISTS idx_recap_npcs_recap ON recap_npcs(recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_npcs_npc ON recap_npcs(npc_id);

CREATE INDEX IF NOT EXISTS idx_recap_locations_recap ON recap_locations(recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_locations_location ON recap_locations(location_id);

CREATE INDEX IF NOT EXISTS idx_recap_quests_recap ON recap_quests(recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_quests_quest ON recap_quests(quest_id);

CREATE INDEX IF NOT EXISTS idx_recap_items_recap ON recap_items(recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_items_item ON recap_items(item_id);

CREATE INDEX IF NOT EXISTS idx_recap_factions_recap ON recap_factions(recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_factions_faction ON recap_factions(faction_id);

CREATE INDEX IF NOT EXISTS idx_recap_deities_recap ON recap_deities(recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_deities_deity ON recap_deities(deity_id);

CREATE INDEX IF NOT EXISTS idx_quest_npcs_quest ON quest_npcs(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_npcs_npc ON quest_npcs(npc_id);

CREATE INDEX IF NOT EXISTS idx_quest_locations_quest ON quest_locations(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_locations_location ON quest_locations(location_id);

CREATE INDEX IF NOT EXISTS idx_quest_factions_quest ON quest_factions(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_factions_faction ON quest_factions(faction_id);

CREATE INDEX IF NOT EXISTS idx_quest_deities_quest ON quest_deities(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_deities_deity ON quest_deities(deity_id);

CREATE INDEX IF NOT EXISTS idx_item_npcs_item ON item_npcs(item_id);
CREATE INDEX IF NOT EXISTS idx_item_npcs_npc ON item_npcs(npc_id);

CREATE INDEX IF NOT EXISTS idx_item_pcs_item ON item_pcs(item_id);
CREATE INDEX IF NOT EXISTS idx_item_pcs_pc ON item_pcs(pc_id);

CREATE INDEX IF NOT EXISTS idx_item_locations_item ON item_locations(item_id);
CREATE INDEX IF NOT EXISTS idx_item_locations_location ON item_locations(location_id);

CREATE INDEX IF NOT EXISTS idx_npc_factions_npc ON npc_factions(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_factions_faction ON npc_factions(faction_id);

CREATE INDEX IF NOT EXISTS idx_pc_factions_pc ON pc_factions(pc_id);
CREATE INDEX IF NOT EXISTS idx_pc_factions_faction ON pc_factions(faction_id);

CREATE INDEX IF NOT EXISTS idx_deity_follower_npcs_deity ON deity_follower_npcs(deity_id);
CREATE INDEX IF NOT EXISTS idx_deity_follower_npcs_npc ON deity_follower_npcs(npc_id);

CREATE INDEX IF NOT EXISTS idx_deity_follower_pcs_deity ON deity_follower_pcs(deity_id);
CREATE INDEX IF NOT EXISTS idx_deity_follower_pcs_pc ON deity_follower_pcs(pc_id);
