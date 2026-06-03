-- Add extended content fields to the deities table
ALTER TABLE deities ADD COLUMN symbol TEXT;
ALTER TABLE deities ADD COLUMN church TEXT;
ALTER TABLE deities ADD COLUMN garments TEXT;
ALTER TABLE deities ADD COLUMN tenets TEXT;
ALTER TABLE deities ADD COLUMN lore TEXT;
ALTER TABLE deities ADD COLUMN notable_followers TEXT;
