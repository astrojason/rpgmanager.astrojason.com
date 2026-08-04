## Bugs

## Features

## Enhancements
- [ ] Admin CRUD page consolidation (`src/app/admin/data/*/page.tsx`, 10 files, ~6000 lines): shared scaffolding for state/query/save/delete/loading/error-success-banner/list-detail-layout/modal-wiring is reimplemented per entity. Needs characterization tests written first (currently zero test coverage on any admin/data page). Consider a `useCrudResource` hook + `SuccessBlock` component as the extraction targets; keep `npcs`' merge/review-mode features and `pcs`' relationship pickers entity-specific, not folded into the generic shape