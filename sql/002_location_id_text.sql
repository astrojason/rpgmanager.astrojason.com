-- Migrate recap_locations and quest_locations to store location_id as TEXT.
-- Required to support sub-location UUIDs (sub-locations are stored as JSON within
-- the parent location row and have UUID identifiers, not integer row IDs).
--
-- SQLite does not support ALTER COLUMN; recreate the tables to change the type.

PRAGMA foreign_keys = OFF;

CREATE TABLE recap_locations_new (
  recap_id    INTEGER NOT NULL,
  location_id TEXT    NOT NULL,
  PRIMARY KEY (recap_id, location_id)
);
INSERT OR IGNORE INTO recap_locations_new SELECT recap_id, CAST(location_id AS TEXT) FROM recap_locations;
DROP TABLE recap_locations;
ALTER TABLE recap_locations_new RENAME TO recap_locations;

CREATE TABLE quest_locations_new (
  quest_id    INTEGER NOT NULL,
  location_id TEXT    NOT NULL,
  PRIMARY KEY (quest_id, location_id)
);
INSERT OR IGNORE INTO quest_locations_new SELECT quest_id, CAST(location_id AS TEXT) FROM quest_locations;
DROP TABLE quest_locations;
ALTER TABLE quest_locations_new RENAME TO quest_locations;

PRAGMA foreign_keys = ON;
