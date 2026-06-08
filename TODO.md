## Features to add
- [x] add the ability for users to create quests
- [x] session recap creation should accept markdown and render it as HTML in the recap, add a preview of the rendered HTML when creating the recap
- [x] add ability to tag NPCs, locations, and items in session recaps and quests, and link to their respective pages - use this tagging system to populate the "Lately Beheld" section of the home page
- [x] Implement Items section — list page, detail page, admin management, GM notes, user notes, hidden flag, recap linking with backlinks, NPC/PC/location tagging
- [x] an admin should be able to set the current calendar date
- [x] recaps should be scanned for NPC names, locations, items and change the text to a link to the appropriate entity
- [x] add the ability to add factions to recaps and quests, and link to their respective pages, and add backlinks
- [x] add the ability to add deities to recaps and quests, and link to their respective pages, and add backlinks
- [x] entity cross-links should use path-based routing `/campaign/entity/:id`, not query string params; added `[id]` detail pages for quests, recaps, and factions
- [x] add auto linking to NPC descriptions
- [x] add animations for actions to make it clear something is happening
- [x] all actions should surface errors to the UI in copyable blocks

## Bugs to fix
- [x] next session calculation should show the next upcoming session, defaulting to the next Sunday at 7pm Pacific if there are no skipped sessions
- [x] session recap creation fails with a 401 even when an admin is logged in
- [x] last session is pulling the last saved session, not the last session that actually happened, it should use session date to determine the last session, not created date
- [x] Recap parsing is only auto-linking to NPCs, not locations, deities, PCs, items, factions, etc.
- [-] auto linking should also use AKA/Alias and partial matches (i.e. Barrow Ironhoof should also match on Barrow)
- [x] non-admins cannot save notes
- [x] save button on admin is not inline
