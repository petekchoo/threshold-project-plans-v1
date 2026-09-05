# Project Work State

This file is the durable handoff for work that spans Codex tasks. Keep entries concise; product decisions and implementation traceability belong in `DESIGN.md` and `implementation-map.yaml`.

See `DEVELOPMENT.md` for the new-task startup, GitHub, Supabase, verification, and synchronization workflow.

## Active

- Complete the PRJ-06 Slice 3 validation gate on `feature/prj06-reschedule-preview`: changed project dates now use the authoritative preview and atomic commit flow; the dialog lists activity changes, fixed work, timing rules, exceptions, containing-start recovery, and all returned conflicts. Stale previews refresh, busy schedules remain retryable, and lock-set expansion retries at most twice. `pnpm verify` passes with 48 tests and the production build passes. Live responsive, confirm/cancel, conflict-recovery, and keyboard verification requires explicit current-task browser authorization before release.

## Recently completed

- PRJ-06 Slice 2.1 merged through GitHub PR #22 at merge commit `ae5b130`. Vercel passed on the final PR head, and local `main` was fast-forwarded to `origin/main`; the merged feature branch was removed locally and remotely.
- Slice 2.1 verification handoff: migration `202609050002` is applied to the linked Supabase project; linked lint, generated types, `pnpm verify`, and production build pass. The complete migration history replays from empty local state; all 19 pgTAP assertions and the explicit-barrier `PRJ06-CON-01`–`PRJ06-CON-13` matrix pass. The matrix found the authenticated archive commit defect corrected by `202609050002`; rerun the matrix after any concurrency-path change. Docker Desktop folder sharing must remain enabled for this repository.

## Next

- Selectively incorporate Instinct's external feedback before beginning project templates. Inventory each recommendation, compare it with Threshold's confirmed product rules and current implementation, record an explicit adopt/adapt/defer/reject decision with rationale, and implement only the approved changes with appropriate requirement mapping and verification.
- Design and deliver reusable project templates for common or repeating work such as private dinners and menu launches. Define which project fields, activity details, relative date offsets, dependencies, project-relative timing rules, and assignments belong in a template; support template maintenance and atomic creation of an editable dated project with its complete activity graph. Reuse the project schedule-shifting model for date materialization and add unit, database, and core-journey coverage.
- Extend scheduling unit coverage as later project-rescheduling slices and dependency behaviors are implemented (`QA-03`).
- Add database integration tests for dependency, timing, archive, and RLS behavior (`QA-04`).
- Add end-to-end coverage for the core journeys (`QA-05`).

## Working conventions

- Start from a requirement ID in `implementation-map.yaml`.
- Keep each commit focused on one concern and include its map/design/test updates.
- Run `pnpm verify` before committing.
- Never record credentials, access tokens, database passwords, or user data here.
