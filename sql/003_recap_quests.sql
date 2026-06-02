CREATE TABLE IF NOT EXISTS recap_quests (
  recap_id INTEGER NOT NULL,
  quest_id INTEGER NOT NULL,
  PRIMARY KEY(recap_id, quest_id)
);
