# Improvement pass — branch `claude/app-improvements`

Version bumped 1.14.4 → 1.14.5. Nothing is committed; all changes are in the working tree
so you can review and split into commits yourself.

## Baseline found
- `npm run test`: 3 failing tests (stale `questStatus` assertions left behind by the "Rumored" status commit).
- `npm run lint`: 115 problems, ~110 from the gitignored `updated-design/` export; 5 real ones in `src/`.

## Changes

### Test / lint hygiene
- `tests/utils/questStatus.test.ts` updated for the Rumored status (now covers `isQuestEnded('rumored')`).
- `eslint.config.mjs` ignores `updated-design/`, `db-backups/`, `.q.mjs`.
- Removed 3 unused `eslint-disable` directives (locations admin, next-session, recaps).
- `src/app/layout.tsx`: scoped disable for `no-page-custom-font` (false positive in an App Router root layout).
- Result: `eslint .` is clean.

### Silent failures fixed (CLAUDE.md: "nothing is allowed to fail silently")
New helper `src/utils/httpError.ts` → `assertOk(res, context)` throws an Error containing
context, HTTP status and response body. Used to surface failures in a copyable `ErrorBlock`:

| Location | Before | After |
|---|---|---|
| Campaign NPCs → "Inscribe New Soul" | `catch { /* noop */ }`, non-ok ignored | ErrorBlock in modal |
| Campaign Items → "Catalogue New Relic" | same | ErrorBlock in modal |
| Quests → create errand | vague text, real error only in `console.error` | full error in ErrorBlock |
| Next-session page (edit/skip/unskip/advance) | non-ok responses ignored | thrown + shown |
| Campaign home → edit chapter | status code only | status + body |
| `NextSessionCard` (skip/resume + load) | no error handling at all | ErrorBlock on load and save failure |
| `questUtils.loadPcsCache` / `AuthorDisplay` | failure → author silently shown as "Unknown" | rejects; AuthorDisplay shows ErrorBlock |
| `admin/layout` | token-read failure shown as "Forbidden Ward, role: none" | error shown alongside |

### Tests added
- `tests/utils/httpError.test.ts` (4)
- `tests/pages/add-form-errors.test.tsx` (NPC + Item add)
- `NextSessionCard` error cases, `AuthorDisplay` error case, `questUtils` PC-load rejection

## Verification
- `npm run test`: 64 files, 298 tests pass
- `npm run lint`: clean
- `npx tsc --noEmit`: clean
- `npm run build`: passes

## Audited, no change needed
- All `src/app/api/data/*` routes call `verifyRequestAuth`.
- No `any`-typing sprawl in `src` (1 occurrence); no DDL in application code.

## Not done / suggestions
- Tried to run the `fallow` dead-code scanner via `npx --yes`; the sandbox blocked downloading it, so unused-export/duplication analysis was not performed.
- `.json().catch(() => ({}))` in `campaign/npcs/[id]` and `items/[id]` falls back to a status-code message — acceptable, could use `assertOk` for consistency.
- Large files worth splitting later: `admin/data/npcs/page.tsx` (927 lines), `campaign/npcs/[id]/page.tsx` (674).
