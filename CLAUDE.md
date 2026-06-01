# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development workflow

TDD: write a failing test for the bug or feature first, then implement until the test passes.

A task is not done until:
1. All tests pass (`npm run test`)
2. The build passes (`npm run build`)
3. Progress is recorded:
   - **TODO.md** — check off the corresponding item (e.g. `- [x] Stage 1 — Project Scaffold`); create the file if it doesn't exist
4. Database changes are documented:
   - **sql/** — create a numbered `.sql` file (e.g. `002_add_tags.sql`) for any new tables, columns, or indexes added to the schema

---