-- Allow quests to be hidden from players (e.g. quests the party hasn't discovered yet).
-- Hidden quests are returned only to admin/dm roles (filterForRole).
ALTER TABLE quests ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
