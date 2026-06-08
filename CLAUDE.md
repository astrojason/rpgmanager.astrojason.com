# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development workflow

TDD: write failing tests first (to confirm the bug or cover the new feature), then implement until all tests pass. Repeat until done.

A task is not done until:
1. All tests pass (`npm run test`)
2. The build passes (`npm run build`)
3. Progress is recorded:
   - **TODO.md** — check off the corresponding item (e.g. `- [x] Stage 1 — Project Scaffold`); create the file if it doesn't exist
4. Database changes are documented and applied correctly:
   - **sql/** — create a numbered `.sql` file (e.g. `002_add_tags.sql`) for every new table, column, or index. These are run manually against the DB — never in application code.
   - **Never add DDL to application code.** No `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, or any other schema-modification statement belongs in route handlers, lib files, or anywhere else in `src/`. The DB schema is already applied; trust it.

## Error handling

Nothing is allowed to fail silently. Every error must be surfaced in the UI as a copyable block containing the full error message. Never swallow errors with empty catch blocks or display vague fallback text.

---
