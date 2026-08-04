## Bugs
- [ ] `GET /api/data/factions` 500s: a `relationships` column value in the live DB is plain text (e.g. `"The Breake..."`) instead of JSON, so `JSON.parse` in `src/app/api/data/factions/route.ts` throws. This cascades into every admin page that fetches factions as a side query without checking `res.ok` (quests, pcs, npcs) — their `rawFactions.map(...)` calls blow up with "not a function" once the malformed factions response comes back as an error object. Needs a DB data fix (correct or null out the bad `relationships` value) — confirmed pre-existing via `git stash`, unrelated to the admin CRUD consolidation.

## Features

## Enhancements