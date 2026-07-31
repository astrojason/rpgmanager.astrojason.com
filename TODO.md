## Bugs
- [ ] Dashboard (`src/app/campaign/page.tsx:109`) uses `"grim-chip is-dead"` instead of `"grim-chip is-deceased"` used everywhere else — likely unintentional drift, fix alongside the chip-helper extraction below
- [ ] `src/app/admin/data/factions/page.tsx` and `src/app/admin/data/locations/page.tsx` — save/delete handlers are non-functional stubs (`setError("...not yet implemented")`); create/edit/delete UI renders but silently does nothing
- [ ] `src/app/admin/data/deities/page.tsx` and `src/app/admin/data/items/page.tsx` hand-roll relationship checkbox pickers instead of using the existing generic `EntityTagPicker` component (already used correctly by `quests`/`recaps` admin pages)

## Features

## Enhancements
- [ ] Extract duplicated `statusChipClass` helper (byte-identical in `src/app/campaign/pcs/page.tsx`, `pcs/[id]/page.tsx`, `npcs/page.tsx`, `npcs/[id]/page.tsx`) into `src/utils/chipClass.ts`; do not merge with `alignmentChipClass` or factions' own `statusChipClass` (different vocabularies, would leak entity-specific strings into a shared function)
- [ ] Admin CRUD page consolidation (`src/app/admin/data/*/page.tsx`, 10 files, ~6000 lines): shared scaffolding for state/query/save/delete/loading/error-success-banner/list-detail-layout/modal-wiring is reimplemented per entity. Needs characterization tests written first (currently zero test coverage on any admin/data page). Consider a `useCrudResource` hook + `SuccessBlock` component as the extraction targets; keep `npcs`' merge/review-mode features and `pcs`' relationship pickers entity-specific, not folded into the generic shape