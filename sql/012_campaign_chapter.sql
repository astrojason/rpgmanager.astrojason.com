-- Single-row settings table for the home page "Chapter" masthead (title + session/arc subtitle)
CREATE TABLE IF NOT EXISTS campaign_chapter (
  id           INTEGER PRIMARY KEY,
  title        TEXT,
  subtitle     TEXT,
  lastUpdated  TEXT
);
