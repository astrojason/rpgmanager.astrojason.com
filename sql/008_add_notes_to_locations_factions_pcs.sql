-- Add user notes to locations, factions, and pcs
ALTER TABLE locations ADD COLUMN notes TEXT;
ALTER TABLE factions ADD COLUMN notes TEXT;
ALTER TABLE pcs ADD COLUMN notes TEXT;
