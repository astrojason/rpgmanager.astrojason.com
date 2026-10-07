-- Store the real campaign session number on each recap (recaps for some sessions are missing,
-- so counting rows gives the wrong number). Values are backfilled from the Obsidian vault.
ALTER TABLE session_recaps ADD COLUMN session_number INTEGER;
