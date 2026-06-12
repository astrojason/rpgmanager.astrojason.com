## Bugs
- [x] party notes missing from factions list page (two-pane view at /campaign/factions)
- [x] DMs should see hidden NPC names and hidden NPCs
- [x] link color on .grim-parchment components is too light, hard to read.

## Features
- [x] change "personality" to "roleplaying notes" on the NPC page and hide it from players, only show to DM and Admins
- [x] add linked NPCs to the NPC page, show them in a sidebar on the right, and link to their pages. This will allow DMs to easily see which NPCs are linked together and navigate between them.

## Enhancements
- [x] Fix slow SQL queries: batch junction queries to reduce network round trips, add indexes on junction FKs