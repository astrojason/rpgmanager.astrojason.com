-- Quests can have a parent quest. The link can be hidden from players via parent_hidden.
-- Run BEFORE deploying the code that reads and writes these columns.
ALTER TABLE quests ADD COLUMN parent_id INTEGER REFERENCES quests(id);
ALTER TABLE quests ADD COLUMN parent_hidden INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_quests_parent_id ON quests(parent_id);

-- Backfill: "Find Merrin Vask" is a sub-quest of "Cure for the Void Poison" (matches the vault folder layout).
UPDATE quests SET parent_id = 5 WHERE id = 18 AND name = 'Find Merrin Vask';
