## Bugs
- [x] party notes missing from factions list page (two-pane view at /campaign/factions)
- [x] DMs should see hidden NPC names and hidden NPCs
- [x] link color on .grim-parchment components is too light, hard to read.
- [x] cannot update current calendar (fantasy) date

## Features
- [x] change "personality" to "roleplaying notes" on the NPC page and hide it from players, only show to DM and Admins
- [x] add linked NPCs to the NPC page, show them in a sidebar on the right, and link to their pages. This will allow DMs to easily see which NPCs are linked together and navigate between them.
- [x] Timeline page — vertical timeline of major in-world events with category filtering, search, and full CRUD for admin/DM
- [x] Calendar dual-calendar year system — event creation uses month dropdown + Azorian's Bounty / Tyr'amryn year fields (AB + 1308 = T); all date displays updated throughout

- [x] Replace all JS confirm() dialogs with HTML modal component (ConfirmModal)
- [x] Enable Timeline link in side navigation

## Enhancements
- [x] Fix slow SQL queries: batch junction queries to reduce network round trips, add indexes on junction FKs
- [x] NPC list for linking NPCs should be filterable and alphabetized
- [x] Migrate all data-fetching to TanStack Query (`@tanstack/react-query`) — 1-day stale/gc cache, `useQuery` replaces all `useEffect + setState` patterns, mutations use `invalidateQueries`